import { 
  PredictionResult, 
  AnalysisMetrics, 
  ClassificationReport,
  PreprocessingOptions,
  ModelMetadata,
  TestSession 
} from '@/types';

/**
 * Clase para manejar las operaciones de IA y análisis de métricas
 */
export class AIAnalyzer {
  
  /**
   * Realiza una predicción usando el endpoint de IA personalizado
   */
  static async makePrediction(
    imageData: string,
    modelEndpoint: string = 'analyze-image',
    modelName?: string
  ): Promise<PredictionResult> {
    try {
      const response = await fetch(`/api/${modelEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: imageData.split(',')[1], // Remover el prefijo data:image
          modelName: modelName || 'default',
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Error en predicción: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        prediction: result.prediction,
        confidence: result.confidence,
        probabilities: result.probabilities || {},
        processingTime: result.processingTime || 0,
        timestamp: new Date(),
        imageData: imageData
      };
    } catch (error) {
      console.error('Error en predicción:', error);
      throw error;
    }
  }

  /**
   * Procesa una imagen con OpenRouter API (modelos en la nube)
   */
  static async predictWithOpenRouter(
    imageData: string,
    model: string = 'openrouter/claude-sonnet-4',
    prompt: string = 'Analiza esta imagen y describe lo que ves. Proporciona una clasificación específica.'
  ): Promise<PredictionResult> {
    try {
      const startTime = Date.now();

      // Convertir imagen a base64 si es necesario
      const base64Image = imageData.includes('base64,') 
        ? imageData 
        : `data:image/jpeg;base64,${imageData}`;

      const response = await fetch('https://oi-server.onrender.com/chat/completions', {
        method: 'POST',
        headers: {
          'customerId': 'cus_Sosr1MCXwA2Bif',
          'Content-Type': 'application/json',
          'Authorization': 'Bearer xxx'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: [
                { 
                  type: 'text', 
                  text: `${prompt}\n\nResponde en formato JSON con: {"prediction": "clasificación", "confidence": 0.95, "description": "descripción detallada"}` 
                },
                { 
                  type: 'image_url', 
                  image_url: { 
                    url: base64Image 
                  } 
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Error en OpenRouter API: ${response.statusText}`);
      }

      const result = await response.json();
      const processingTime = Date.now() - startTime;
      
      // Intentar parsear la respuesta JSON
      let parsedContent;
      try {
        parsedContent = JSON.parse(result.choices[0].message.content);
      } catch {
        // Si no es JSON válido, crear estructura manual
        const content = result.choices[0].message.content;
        parsedContent = {
          prediction: content.substring(0, 50), // Primeras 50 caracteres como predicción
          confidence: 0.8, // Confianza por defecto
          description: content
        };
      }

      return {
        id: `pred_openrouter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        prediction: parsedContent.prediction || 'Sin clasificación',
        confidence: parsedContent.confidence || 0.8,
        probabilities: { [parsedContent.prediction || 'unknown']: parsedContent.confidence || 0.8 },
        processingTime,
        timestamp: new Date(),
        imageData: imageData
      };
    } catch (error) {
      console.error('Error con OpenRouter:', error);
      throw error;
    }
  }

  /**
   * Calcula métricas de rendimiento para una sesión de pruebas
   */
  static calculateMetrics(
    predictions: PredictionResult[], 
    groundTruth: { [imageId: string]: string }
  ): AnalysisMetrics {
    if (predictions.length === 0) {
      return this.getEmptyMetrics();
    }

    const totalImages = predictions.length;
    let correctPredictions = 0;
    const classStats: { [className: string]: { tp: number; fp: number; fn: number; total: number } } = {};
    const allClasses = new Set<string>();

    // Inicializar estadísticas por clase
    predictions.forEach(pred => {
      allClasses.add(pred.prediction);
      if (groundTruth[pred.id]) {
        allClasses.add(groundTruth[pred.id]);
      }
    });

    allClasses.forEach(className => {
      classStats[className] = { tp: 0, fp: 0, fn: 0, total: 0 };
    });

    // Calcular estadísticas
    predictions.forEach(pred => {
      const actualClass = groundTruth[pred.id];
      const predictedClass = pred.prediction;

      if (actualClass) {
        classStats[actualClass].total++;
        
        if (actualClass === predictedClass) {
          correctPredictions++;
          classStats[actualClass].tp++;
        } else {
          classStats[actualClass].fn++;
          classStats[predictedClass].fp++;
        }
      }
    });

    // Calcular accuracy global
    const accuracy = groundTruth ? correctPredictions / totalImages : 0;

    // Calcular métricas por clase
    const classificationReport: ClassificationReport = {};
    let weightedPrecision = 0;
    let weightedRecall = 0;
    let weightedF1 = 0;

    allClasses.forEach(className => {
      const stats = classStats[className];
      const precision = stats.tp / (stats.tp + stats.fp) || 0;
      const recall = stats.tp / (stats.tp + stats.fn) || 0;
      const f1Score = (2 * precision * recall) / (precision + recall) || 0;

      classificationReport[className] = {
        precision,
        recall,
        f1Score,
        support: stats.total
      };

      // Promedios ponderados
      const weight = stats.total / totalImages;
      weightedPrecision += precision * weight;
      weightedRecall += recall * weight;
      weightedF1 += f1Score * weight;
    });

    // Matriz de confusión
    const classNames = Array.from(allClasses).sort();
    const confusionMatrix = this.buildConfusionMatrix(predictions, groundTruth, classNames);

    // Tiempo promedio de procesamiento
    const averageProcessingTime = predictions.reduce((sum, pred) => sum + pred.processingTime, 0) / predictions.length;

    return {
      accuracy,
      precision: weightedPrecision,
      recall: weightedRecall,
      f1Score: weightedF1,
      confusionMatrix,
      averageProcessingTime,
      totalImages,
      classificationReport
    };
  }

  /**
   * Construye una matriz de confusión
   */
  private static buildConfusionMatrix(
    predictions: PredictionResult[],
    groundTruth: { [imageId: string]: string },
    classNames: string[]
  ): number[][] {
    const matrix: number[][] = Array(classNames.length)
      .fill(0)
      .map(() => Array(classNames.length).fill(0));

    predictions.forEach(pred => {
      const actualClass = groundTruth[pred.id];
      const predictedClass = pred.prediction;

      if (actualClass && classNames.includes(actualClass) && classNames.includes(predictedClass)) {
        const actualIndex = classNames.indexOf(actualClass);
        const predictedIndex = classNames.indexOf(predictedClass);
        matrix[actualIndex][predictedIndex]++;
      }
    });

    return matrix;
  }

  /**
   * Retorna métricas vacías para inicialización
   */
  private static getEmptyMetrics(): AnalysisMetrics {
    return {
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      confusionMatrix: [],
      averageProcessingTime: 0,
      totalImages: 0,
      classificationReport: {}
    };
  }

  /**
   * Procesa imagen según las opciones de preprocesamiento
   */
  static processImageData(
    imageData: string,
    options: PreprocessingOptions
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('No se puede crear contexto de canvas'));
          return;
        }

        let { width, height } = options.resize;
        
        // Si es centerCrop, mantener relación de aspecto y recortar
        if (options.centerCrop) {
          const aspectRatio = width / height;
          const imgAspectRatio = img.width / img.height;
          
          if (imgAspectRatio > aspectRatio) {
            // Imagen más ancha, ajustar altura
            const newWidth = img.height * aspectRatio;
            const x = (img.width - newWidth) / 2;
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, x, 0, newWidth, img.height, 0, 0, width, height);
          } else {
            // Imagen más alta, ajustar anchura
            const newHeight = img.width / aspectRatio;
            const y = (img.height - newHeight) / 2;
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, y, img.width, newHeight, 0, 0, width, height);
          }
        } else {
          // Redimensionar manteniendo proporción o deformando
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
        }

        // Aplicar escala de grises si está habilitado
        if (options.grayscale) {
          const imageData = ctx.getImageData(0, 0, width, height);
          const data = imageData.data;
          
          for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            data[i] = gray;     // R
            data[i + 1] = gray; // G
            data[i + 2] = gray; // B
          }
          
          ctx.putImageData(imageData, 0, 0);
        }

        const processedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve(processedDataUrl);
      };

      img.onerror = () => {
        reject(new Error('Error al cargar imagen para procesamiento'));
      };

      img.src = imageData;
    });
  }

  /**
   * Valida un modelo antes de su uso
   */
  static validateModel(modelData: ModelMetadata): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!modelData.name || modelData.name.trim().length === 0) {
      errors.push('El modelo debe tener un nombre válido');
    }

    if (!modelData.type || !['tensorflow', 'onnx', 'custom', 'openrouter'].includes(modelData.type)) {
      errors.push('Tipo de modelo no válido');
    }

    if (!modelData.inputShape || modelData.inputShape.length === 0) {
      errors.push('El modelo debe especificar la forma de entrada');
    }

    if (!modelData.outputClasses || modelData.outputClasses.length === 0) {
      errors.push('El modelo debe especificar las clases de salida');
    }

    if (modelData.type === 'custom' && !modelData.endpoint) {
      errors.push('Los modelos personalizados requieren un endpoint');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Genera un reporte de rendimiento detallado
   */
  static generatePerformanceReport(session: TestSession): {
    summary: string;
    details: { [key: string]: any };
    recommendations: string[];
  } {
    const metrics = session.metrics;
    const recommendations: string[] = [];

    // Generar recomendaciones basadas en métricas
    if (metrics.accuracy < 0.7) {
      recommendations.push('La precisión es baja. Considera mejorar el dataset de entrenamiento.');
    }
    
    if (metrics.averageProcessingTime > 5000) {
      recommendations.push('El tiempo de procesamiento es alto. Considera optimizar el modelo.');
    }
    
    if (metrics.precision < 0.8) {
      recommendations.push('La precisión por clase es baja. Revisa el balanceo de clases.');
    }

    // Encontrar la peor clase
    const worstClass = Object.entries(metrics.classificationReport)
      .sort(([,a], [,b]) => (a as ClassificationReport[string]).f1Score - (b as ClassificationReport[string]).f1Score)[0];
    
    if (worstClass && (worstClass[1] as ClassificationReport[string]).f1Score < 0.6) {
      recommendations.push(`La clase "${worstClass[0]}" tiene bajo rendimiento (F1: ${(worstClass[1] as ClassificationReport[string]).f1Score.toFixed(2)})`);
    }

    return {
      summary: `Sesión completada con ${metrics.accuracy * 100}% de precisión en ${metrics.totalImages} imágenes.`,
      details: {
        accuracy: (metrics.accuracy * 100).toFixed(2) + '%',
        precision: (metrics.precision * 100).toFixed(2) + '%',
        recall: (metrics.recall * 100).toFixed(2) + '%',
        f1Score: (metrics.f1Score * 100).toFixed(2) + '%',
        averageTime: metrics.averageProcessingTime.toFixed(0) + 'ms',
        totalImages: metrics.totalImages,
        sessionDuration: session.endTime && session.startTime 
          ? ((session.endTime.getTime() - session.startTime.getTime()) / 1000).toFixed(0) + 's'
          : 'En progreso'
      },
      recommendations
    };
  }
}