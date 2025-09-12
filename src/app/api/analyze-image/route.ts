import { NextRequest, NextResponse } from 'next/server'

interface AnalyzeImageRequest {
  imageData: string; // base64 encoded image data
  modelName?: string;
  timestamp?: string;
}

interface AnalyzeImageResponse {
  prediction: string;
  confidence: number;
  probabilities: { [key: string]: number };
  processingTime: number;
  modelUsed: string;
}

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();
    const body: AnalyzeImageRequest = await request.json();

    if (!body.imageData) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      );
    }

    const modelName = body.modelName || 'default';
    
    // Simular análisis con diferentes modelos
    let result: AnalyzeImageResponse;

    switch (modelName) {
      case 'tensorflow':
        result = await analyzeTensorFlowModel(body.imageData);
        break;
      case 'custom-model':
        result = await analyzeCustomModel(body.imageData);
        break;
      default:
        result = await analyzeOpenRouterModel(body.imageData);
        break;
    }

    const processingTime = Date.now() - startTime;
    result.processingTime = processingTime;

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error analyzing image:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Analiza imagen usando OpenRouter (modelo en la nube)
 */
async function analyzeOpenRouterModel(imageData: string): Promise<AnalyzeImageResponse> {
  try {
    const base64Image = `data:image/jpeg;base64,${imageData}`;

    const response = await fetch('https://oi-server.onrender.com/chat/completions', {
      method: 'POST',
      headers: {
        'customerId': 'cus_Sosr1MCXwA2Bif',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer xxx'
      },
      body: JSON.stringify({
        model: 'openrouter/claude-sonnet-4',
        messages: [
          {
            role: 'user',
            content: [
              { 
                type: 'text', 
                text: `Analiza esta imagen y clasifícala. Responde en formato JSON con:
                {
                  "prediction": "categoría específica de lo que ves",
                  "confidence": número entre 0 y 1,
                  "description": "descripción detallada",
                  "probabilities": {
                    "categoria1": 0.8,
                    "categoria2": 0.15,
                    "categoria3": 0.05
                  }
                }` 
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
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Intentar parsear la respuesta JSON
    let parsedContent;
    try {
      parsedContent = JSON.parse(result.choices[0].message.content);
    } catch {
      // Si no es JSON válido, crear estructura manual
      const content = result.choices[0].message.content;
      
      // Extraer información básica del texto
      const lines = content.split('\n');
      const prediction = lines.find((line: string) => line.toLowerCase().includes('categoría') || line.toLowerCase().includes('objeto'))
        ?.replace(/[^\w\s]/g, '').trim() || 'Objeto detectado';
      
      parsedContent = {
        prediction: prediction.substring(0, 50),
        confidence: 0.75,
        description: content,
        probabilities: { [prediction]: 0.75, 'other': 0.25 }
      };
    }

    return {
      prediction: parsedContent.prediction || 'Sin clasificación',
      confidence: parsedContent.confidence || 0.5,
      probabilities: parsedContent.probabilities || { [parsedContent.prediction || 'unknown']: parsedContent.confidence || 0.5 },
      processingTime: 0, // Se calculará en la función principal
      modelUsed: 'openrouter/claude-sonnet-4'
    };
  } catch (error) {
    console.error('Error with OpenRouter:', error);
    
    // Fallback a análisis simulado
    return getSimulatedAnalysis('openrouter-fallback');
  }
}

/**
 * Simula análisis con TensorFlow.js (modelo local)
 */
async function analyzeTensorFlowModel(_imageData: string): Promise<AnalyzeImageResponse> {
  // Simular el procesamiento que haría TensorFlow.js
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

  const categories = [
    'persona', 'automóvil', 'animal', 'planta', 'edificio', 
    'comida', 'objeto', 'paisaje', 'texto', 'herramienta'
  ];
  
  const prediction = categories[Math.floor(Math.random() * categories.length)];
  const confidence = 0.6 + Math.random() * 0.35; // Entre 0.6 y 0.95

  // Generar probabilidades distribuidas
  const probabilities: { [key: string]: number } = {};
  let remaining = 1.0;
  
  probabilities[prediction] = confidence;
  remaining -= confidence;

  // Distribuir el resto entre otras categorías
  const otherCategories = categories.filter(c => c !== prediction).slice(0, 3);
  otherCategories.forEach((cat, index) => {
    const prob = index === otherCategories.length - 1 
      ? remaining 
      : remaining * Math.random() * 0.7;
    probabilities[cat] = Math.max(0.01, prob);
    remaining -= prob;
  });

  return {
    prediction,
    confidence,
    probabilities,
    processingTime: 0,
    modelUsed: 'tensorflow-js-local'
  };
}

/**
 * Simula análisis con modelo personalizado
 */
async function analyzeCustomModel(imageData: string): Promise<AnalyzeImageResponse> {
  // Simular procesamiento de modelo personalizado
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

  // Análisis básico simulado basado en características de la imagen
  const imageSize = imageData.length;
  const categories = [
    'documento', 'rostro', 'código_qr', 'gráfico', 'foto', 
    'captura_pantalla', 'dibujo', 'logotipo', 'mapa'
  ];
  
  // Simular decisión basada en "características" de la imagen
  let prediction = categories[imageSize % categories.length];
  let confidence = 0.7 + (Math.random() * 0.25);

  // Ajustar según el "tamaño" de la imagen
  if (imageSize > 100000) {
    prediction = 'foto';
    confidence = Math.min(0.95, confidence + 0.1);
  } else if (imageSize < 20000) {
    prediction = 'documento';
    confidence = Math.min(0.9, confidence + 0.05);
  }

  const probabilities: { [key: string]: number } = {
    [prediction]: confidence
  };

  // Agregar probabilidades secundarias
  const otherCats = categories.filter(c => c !== prediction).slice(0, 2);
  let remaining = 1 - confidence;
  otherCats.forEach((cat, index) => {
    const prob = index === 0 ? remaining * 0.7 : remaining * 0.3;
    probabilities[cat] = Math.max(0.05, prob);
  });

  return {
    prediction,
    confidence,
    probabilities,
    processingTime: 0,
    modelUsed: 'custom-endpoint'
  };
}

/**
 * Genera análisis simulado como fallback
 */
function getSimulatedAnalysis(modelName: string): AnalyzeImageResponse {
  const categories = [
    'imagen_general', 'objeto_desconocido', 'contenido_mixto', 
    'elemento_visual', 'captura_digital'
  ];
  
  const prediction = categories[Math.floor(Math.random() * categories.length)];
  const confidence = 0.4 + Math.random() * 0.4; // Entre 0.4 y 0.8 para fallback

  return {
    prediction,
    confidence,
    probabilities: { [prediction]: confidence, 'other': 1 - confidence },
    processingTime: 0,
    modelUsed: modelName
  };
}