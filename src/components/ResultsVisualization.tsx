'use client'

import React, { useState, useMemo } from 'react'
import { PredictionResult, TestSession } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface ResultsVisualizationProps {
  predictions: PredictionResult[]
  session: TestSession | null
  onExport?: (format: 'json' | 'csv') => void
}

export default function ResultsVisualization({
  predictions,
  session,
  onExport
}: ResultsVisualizationProps) {
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionResult | null>(null)

  // Calcular estadísticas resumidas
  const stats = useMemo(() => {
    if (predictions.length === 0) {
      return {
        total: 0,
        averageConfidence: 0,
        averageTime: 0,
        highConfidence: 0,
        lowConfidence: 0,
        topCategories: [],
        confidenceDistribution: []
      }
    }

    const total = predictions.length
    const averageConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / total
    const averageTime = predictions.reduce((sum, p) => sum + p.processingTime, 0) / total
    const highConfidence = predictions.filter(p => p.confidence > 0.8).length
    const lowConfidence = predictions.filter(p => p.confidence < 0.5).length

    // Contar categorías más frecuentes
    const categoryCount: { [key: string]: number } = {}
    predictions.forEach(p => {
      categoryCount[p.prediction] = (categoryCount[p.prediction] || 0) + 1
    })

    const topCategories = Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count, percentage: (count / total) * 100 }))

    // Distribución de confianza en rangos
    const confidenceRanges = [
      { range: '90-100%', min: 0.9, max: 1.0 },
      { range: '80-89%', min: 0.8, max: 0.89 },
      { range: '70-79%', min: 0.7, max: 0.79 },
      { range: '60-69%', min: 0.6, max: 0.69 },
      { range: '0-59%', min: 0.0, max: 0.59 }
    ]

    const confidenceDistribution = confidenceRanges.map(({ range, min, max }) => {
      const count = predictions.filter(p => p.confidence >= min && p.confidence <= max).length
      return {
        range,
        count,
        percentage: (count / total) * 100
      }
    })

    return {
      total,
      averageConfidence,
      averageTime,
      highConfidence,
      lowConfidence,
      topCategories,
      confidenceDistribution
    }
  }, [predictions])

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const exportData = (format: 'json' | 'csv') => {
    if (onExport) {
      onExport(format)
    } else {
      // Exportación básica
      if (format === 'json') {
        const dataStr = JSON.stringify({ session, predictions }, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `ai_analysis_${Date.now()}.json`
        link.click()
      } else {
        // CSV básico
        const headers = ['Timestamp', 'Prediction', 'Confidence', 'Processing Time']
        const csvContent = [
          headers.join(','),
          ...predictions.map(p => [
            p.timestamp.toISOString(),
            `"${p.prediction}"`,
            p.confidence.toFixed(4),
            p.processingTime.toString()
          ].join(','))
        ].join('\n')
        
        const dataBlob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `ai_analysis_${Date.now()}.csv`
        link.click()
      }
    }
  }

  if (predictions.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Sin datos para visualizar
            </h3>
            <p className="text-gray-600">
              Los resultados del análisis aparecerán aquí una vez que se procesen las imágenes.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Visualización de Resultados</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              {stats.total} resultados
            </Badge>
            <Button
              onClick={() => exportData('json')}
              variant="outline"
              size="sm"
            >
              Exportar JSON
            </Button>
            <Button
              onClick={() => exportData('csv')}
              variant="outline"
              size="sm"
            >
              Exportar CSV
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="predictions">Predicciones</TabsTrigger>
            <TabsTrigger value="analytics">Análisis</TabsTrigger>
            <TabsTrigger value="details">Detalles</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Métricas principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                  <div className="text-sm text-gray-600">Total Procesadas</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {(stats.averageConfidence * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Confianza Promedio</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatTime(stats.averageTime)}
                  </div>
                  <div className="text-sm text-gray-600">Tiempo Promedio</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {stats.highConfidence}
                  </div>
                  <div className="text-sm text-gray-600">Alta Confianza (&gt;80%)</div>
                </CardContent>
              </Card>
            </div>

            {/* Categorías más frecuentes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Categorías Más Frecuentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.topCategories.map((category, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-bold">
                        {index + 1}
                      </div>
                      <span className="font-medium">{category.category}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Progress value={category.percentage} className="w-20" />
                      <span className="text-sm text-gray-600 w-12 text-right">
                        {category.count}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Distribución de confianza */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribución de Confianza</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.confidenceDistribution.map((range, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="font-medium text-sm">{range.range}</span>
                    <div className="flex items-center space-x-3">
                      <Progress value={range.percentage} className="w-32" />
                      <span className="text-sm text-gray-600 w-12 text-right">
                        {range.count}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-4">
            <div className="max-h-96 overflow-y-auto space-y-2">
              {predictions.map((prediction, index) => (
                <Card
                  key={prediction.id}
                  className={`cursor-pointer transition-colors ${
                    selectedPrediction?.id === prediction.id 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedPrediction(prediction)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 text-sm font-bold">
                          {predictions.length - index}
                        </div>
                        <div>
                          <div className="font-medium">{prediction.prediction}</div>
                          <div className="text-sm text-gray-600">
                            {prediction.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          {(prediction.confidence * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600">
                          {formatTime(prediction.processingTime)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {/* Rendimiento temporal */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Análisis de Rendimiento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Confianza</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Alta (&gt;80%):</span>
                        <span className="font-medium">{stats.highConfidence} ({((stats.highConfidence / stats.total) * 100).toFixed(1)}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Baja (&lt;50%):</span>
                        <span className="font-medium">{stats.lowConfidence} ({((stats.lowConfidence / stats.total) * 100).toFixed(1)}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Promedio:</span>
                        <span className="font-medium">{(stats.averageConfidence * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Tiempo de Procesamiento</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Promedio:</span>
                        <span className="font-medium">{formatTime(stats.averageTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Más rápido:</span>
                        <span className="font-medium">
                          {formatTime(Math.min(...predictions.map(p => p.processingTime)))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Más lento:</span>
                        <span className="font-medium">
                          {formatTime(Math.max(...predictions.map(p => p.processingTime)))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recomendaciones automáticas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recomendaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.averageConfidence < 0.7 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-yellow-600">⚠️</span>
                        <span className="text-sm text-yellow-800">
                          La confianza promedio es baja ({(stats.averageConfidence * 100).toFixed(1)}%). 
                          Considera ajustar el prompt o usar un modelo diferente.
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {stats.averageTime > 5000 && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-orange-600">🐌</span>
                        <span className="text-sm text-orange-800">
                          El tiempo de procesamiento es alto ({formatTime(stats.averageTime)}). 
                          Considera optimizar las imágenes o usar un modelo más rápido.
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {stats.highConfidence / stats.total > 0.8 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-green-600">✅</span>
                        <span className="text-sm text-green-800">
                          Excelente rendimiento! {((stats.highConfidence / stats.total) * 100).toFixed(1)}% 
                          de las predicciones tienen alta confianza.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            {selectedPrediction ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Detalles de Predicción - {selectedPrediction.prediction}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedPrediction.imageData && (
                    <div className="flex justify-center">
                      <img
                        src={selectedPrediction.imageData}
                        alt="Imagen analizada"
                        className="max-w-64 max-h-64 object-contain border rounded-lg"
                      />
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Información General</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>ID:</span>
                          <span className="font-mono text-xs">{selectedPrediction.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Predicción:</span>
                          <span className="font-medium">{selectedPrediction.prediction}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Confianza:</span>
                          <span className="font-medium">{(selectedPrediction.confidence * 100).toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tiempo:</span>
                          <span className="font-medium">{formatTime(selectedPrediction.processingTime)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Timestamp:</span>
                          <span className="text-xs">{selectedPrediction.timestamp.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    {Object.keys(selectedPrediction.probabilities).length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Probabilidades</h4>
                        <div className="space-y-1">
                          {Object.entries(selectedPrediction.probabilities)
                            .sort(([,a], [,b]) => (b as number) - (a as number))
                            .slice(0, 5)
                            .map(([label, prob], index) => (
                              <div key={index} className="flex items-center justify-between">
                                <span className="text-sm truncate">{label}</span>
                                <div className="flex items-center space-x-2 ml-2">
                                  <Progress value={(prob as number) * 100} className="w-16" />
                                  <span className="text-xs w-12 text-right">
                                    {((prob as number) * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-8 text-gray-600">
                <span className="text-2xl mb-2 block">👆</span>
                <p>Selecciona una predicción en la pestaña "Predicciones" para ver sus detalles.</p>
              </div>
            )}

            {/* Información de sesión */}
            {session && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Información de Sesión</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Nombre:</span>
                        <span className="font-medium">{session.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Modelo:</span>
                        <span className="font-medium">{session.modelId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Modo:</span>
                        <span className="font-medium">{session.mode}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Inicio:</span>
                        <span className="text-xs">{session.startTime.toLocaleString()}</span>
                      </div>
                      {session.endTime && (
                        <div className="flex justify-between">
                          <span>Fin:</span>
                          <span className="text-xs">{session.endTime.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Duración:</span>
                        <span className="text-xs">
                          {session.endTime 
                            ? `${((session.endTime.getTime() - session.startTime.getTime()) / 1000).toFixed(0)}s`
                            : 'En progreso'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}