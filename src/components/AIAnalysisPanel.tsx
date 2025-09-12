'use client'

import React, { useState } from 'react'
import { AIAnalyzer } from '@/lib/ai-utils'
import { 
  PredictionResult, 
  CapturedImage, 
  ModelStatus,
  TestSession 
} from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface AIAnalysisPanelProps {
  capturedImages: CapturedImage[]
  onAnalysisComplete: (results: PredictionResult[]) => void
  onSessionUpdate: (session: TestSession) => void
}

export default function AIAnalysisPanel({
  capturedImages,
  onAnalysisComplete,
  onSessionUpdate
}: AIAnalysisPanelProps) {
  const [modelStatus, setModelStatus] = useState<ModelStatus>(ModelStatus.IDLE)
  const [selectedModel, setSelectedModel] = useState<string>('openrouter')
  const [customPrompt, setCustomPrompt] = useState<string>(
    'Analiza esta imagen y clasifícala. Proporciona una categoría específica y un nivel de confianza.'
  )
  const [analysisResults, setAnalysisResults] = useState<PredictionResult[]>([])
  const [, setCurrentSession] = useState<TestSession | null>(null)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [processingStats, setProcessingStats] = useState({
    processed: 0,
    total: 0,
    averageTime: 0,
    currentImage: ''
  })

  const availableModels = [
    {
      id: 'openrouter',
      name: 'OpenRouter Claude Sonnet-4',
      type: 'cloud' as const,
      description: 'Modelo avanzado de visión por computadora'
    },
    {
      id: 'tensorflow',
      name: 'TensorFlow.js Local',
      type: 'local' as const,
      description: 'Modelo local en el navegador'
    },
    {
      id: 'custom',
      name: 'Endpoint Personalizado',
      type: 'custom' as const,
      description: 'Tu modelo personalizado'
    }
  ]

  // Crear nueva sesión cuando se inicia análisis
  const createNewSession = (): TestSession => {
    const session: TestSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      modelId: selectedModel,
      name: `Sesión ${new Date().toLocaleString()}`,
      mode: 'batch',
      startTime: new Date(),
      totalPredictions: 0,
      correctPredictions: 0,
      results: [],
      metrics: {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        confusionMatrix: [],
        averageProcessingTime: 0,
        totalImages: 0,
        classificationReport: {}
      }
    }
    return session
  }

  // Analizar una imagen individual
  const analyzeImage = async (image: CapturedImage): Promise<PredictionResult | null> => {
    try {
      let result: PredictionResult

      if (selectedModel === 'openrouter') {
        result = await AIAnalyzer.predictWithOpenRouter(
          image.dataUrl,
          'openrouter/claude-sonnet-4',
          customPrompt
        )
      } else if (selectedModel === 'custom') {
        result = await AIAnalyzer.makePrediction(
          image.dataUrl,
          'analyze-image',
          'custom-model'
        )
      } else {
        // TensorFlow.js o otros modelos locales
        result = await AIAnalyzer.makePrediction(
          image.dataUrl,
          'tensorflow',
          selectedModel
        )
      }

      return result
    } catch (error) {
      console.error('Error analizando imagen:', error)
      return null
    }
  }

  // Procesar todas las imágenes
  const processAllImages = async () => {
    if (capturedImages.length === 0) {
      alert('No hay imágenes para analizar')
      return
    }

    setIsAnalyzing(true)
    setModelStatus(ModelStatus.PROCESSING)
    setProcessingProgress(0)
    
    const session = createNewSession()
    setCurrentSession(session)
    
    const results: PredictionResult[] = []
    const totalImages = capturedImages.length
    let processedCount = 0
    let totalProcessingTime = 0

    setProcessingStats({
      processed: 0,
      total: totalImages,
      averageTime: 0,
      currentImage: capturedImages[0]?.id || ''
    })

    for (const image of capturedImages) {
      try {
        setProcessingStats(prev => ({
          ...prev,
          currentImage: image.id,
          processed: processedCount
        }))

        const result = await analyzeImage(image)
        
        if (result) {
          results.push(result)
          totalProcessingTime += result.processingTime
          
          // Actualizar estadísticas en tiempo real
          processedCount++
          const averageTime = totalProcessingTime / processedCount
          const progress = (processedCount / totalImages) * 100

          setProcessingProgress(progress)
          setProcessingStats(prev => ({
            ...prev,
            processed: processedCount,
            averageTime
          }))
        }
      } catch (error) {
        console.error(`Error procesando imagen ${image.id}:`, error)
      }
    }

    // Actualizar sesión con resultados
    session.results = results
    session.endTime = new Date()
    session.totalPredictions = results.length
    
    // Calcular métricas básicas (sin ground truth por ahora)
    session.metrics = {
      accuracy: 0, // Se calculará cuando se proporcione ground truth
      precision: 0,
      recall: 0,
      f1Score: 0,
      confusionMatrix: [],
      averageProcessingTime: totalProcessingTime / results.length || 0,
      totalImages: results.length,
      classificationReport: {}
    }

    setAnalysisResults(results)
    setCurrentSession(session)
    setIsAnalyzing(false)
    setModelStatus(ModelStatus.READY)
    
    // Notificar componentes padre
    onAnalysisComplete(results)
    onSessionUpdate(session)
  }

  // Analizar imagen individual (modo individual)
  const analyzeSingleImage = async (image: CapturedImage) => {
    setModelStatus(ModelStatus.PROCESSING)
    
    try {
      const result = await analyzeImage(image)
      if (result) {
        const updatedResults = [...analysisResults, result]
        setAnalysisResults(updatedResults)
        onAnalysisComplete(updatedResults)
      }
    } catch (error) {
      console.error('Error en análisis individual:', error)
    } finally {
      setModelStatus(ModelStatus.READY)
    }
  }

  const getModelStatusColor = (status: ModelStatus) => {
    switch (status) {
      case ModelStatus.READY:
        return 'bg-green-500'
      case ModelStatus.PROCESSING:
        return 'bg-blue-500'
      case ModelStatus.LOADING:
        return 'bg-yellow-500'
      case ModelStatus.ERROR:
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getModelStatusText = (status: ModelStatus) => {
    switch (status) {
      case ModelStatus.READY:
        return 'Listo'
      case ModelStatus.PROCESSING:
        return 'Procesando'
      case ModelStatus.LOADING:
        return 'Cargando'
      case ModelStatus.ERROR:
        return 'Error'
      default:
        return 'Inactivo'
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Panel de Análisis de IA</CardTitle>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getModelStatusColor(modelStatus)}`}></div>
            <Badge variant="secondary" className="text-xs">
              {getModelStatusText(modelStatus)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="configuration" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="configuration">Configuración</TabsTrigger>
            <TabsTrigger value="processing">Procesamiento</TabsTrigger>
            <TabsTrigger value="results">Resultados</TabsTrigger>
          </TabsList>

          <TabsContent value="configuration" className="space-y-4">
            {/* Selección de modelo */}
            <div className="space-y-2">
              <Label htmlFor="model-select">Modelo de IA</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger id="model-select">
                  <SelectValue placeholder="Seleccionar modelo" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map(model => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex flex-col">
                        <span>{model.name}</span>
                        <span className="text-xs text-gray-500">{model.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prompt personalizado para OpenRouter */}
            {selectedModel === 'openrouter' && (
              <div className="space-y-2">
                <Label htmlFor="custom-prompt">Prompt de análisis</Label>
                <Textarea
                  id="custom-prompt"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Describe qué análisis quieres que haga el modelo..."
                  className="min-h-20"
                />
                <p className="text-xs text-gray-600">
                  Este prompt se enviará junto con cada imagen para el análisis
                </p>
              </div>
            )}

            {/* Información del modelo seleccionado */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  AI
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900">
                    {availableModels.find(m => m.id === selectedModel)?.name}
                  </h4>
                  <p className="text-sm text-blue-700">
                    {availableModels.find(m => m.id === selectedModel)?.description}
                  </p>
                  <div className="mt-2 flex items-center space-x-4 text-xs text-blue-600">
                    <span>Tipo: {availableModels.find(m => m.id === selectedModel)?.type}</span>
                    <span>Estado: {getModelStatusText(modelStatus)}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="processing" className="space-y-4">
            {/* Estadísticas de procesamiento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {capturedImages.length}
                    </div>
                    <div className="text-sm text-gray-600">Imágenes disponibles</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {analysisResults.length}
                    </div>
                    <div className="text-sm text-gray-600">Análisis completados</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Progreso de procesamiento */}
            {isAnalyzing && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Procesando imágenes...</span>
                  <span className="text-sm text-gray-600">
                    {processingStats.processed} / {processingStats.total}
                  </span>
                </div>
                <Progress value={processingProgress} className="w-full" />
                
                <div className="text-xs text-gray-600 space-y-1">
                  <div>Imagen actual: {processingStats.currentImage}</div>
                  <div>Tiempo promedio: {processingStats.averageTime.toFixed(0)}ms</div>
                </div>
              </div>
            )}

            {/* Controles de procesamiento */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={processAllImages}
                disabled={capturedImages.length === 0 || isAnalyzing}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700"
              >
                {isAnalyzing ? 'Procesando...' : 'Analizar Todas las Imágenes'}
              </Button>

              {capturedImages.length > 0 && (
                <Button
                  onClick={() => analyzeSingleImage(capturedImages[capturedImages.length - 1])}
                  disabled={isAnalyzing || modelStatus === ModelStatus.PROCESSING}
                  variant="outline"
                >
                  Analizar Última Imagen
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            {analysisResults.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Sin resultados aún
                </h3>
                <p className="text-gray-600">
                  Los resultados del análisis aparecerán aquí una vez completado el procesamiento.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Resumen de resultados */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-xl font-bold text-green-600">
                        {analysisResults.length}
                      </div>
                      <div className="text-sm text-gray-600">Total Procesadas</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-xl font-bold text-blue-600">
                        {(analysisResults.reduce((acc, r) => acc + r.confidence, 0) / analysisResults.length * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Confianza Promedio</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-xl font-bold text-purple-600">
                        {(analysisResults.reduce((acc, r) => acc + r.processingTime, 0) / analysisResults.length).toFixed(0)}ms
                      </div>
                      <div className="text-sm text-gray-600">Tiempo Promedio</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Lista de resultados recientes */}
                <div className="space-y-2">
                  <h4 className="font-medium">Últimos Resultados</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {analysisResults.slice(-5).reverse().map((result) => (
                      <div key={result.id} className="p-3 border rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{result.prediction}</div>
                            <div className="text-xs text-gray-600">
                              {result.timestamp.toLocaleTimeString()} • {result.processingTime}ms
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-green-600">
                              {(result.confidence * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}