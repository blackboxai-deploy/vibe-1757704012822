'use client'

import React, { useState, useCallback } from 'react'
import CameraCapture from '@/components/CameraCapture'
import AIAnalysisPanel from '@/components/AIAnalysisPanel'
import ResultsVisualization from '@/components/ResultsVisualization'
import { 
  CapturedImage, 
  PredictionResult, 
  TestSession, 
  CameraStatus 
} from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function HomePage() {
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([])
  const [analysisResults, setAnalysisResults] = useState<PredictionResult[]>([])
  const [currentSession, setCurrentSession] = useState<TestSession | null>(null)
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('inactive' as CameraStatus)
  const [systemStats, setSystemStats] = useState({
    totalImages: 0,
    totalAnalyses: 0,
    averageConfidence: 0,
    lastActivity: null as Date | null
  })

  // Manejar nueva imagen capturada
  const handleImageCaptured = useCallback((image: CapturedImage) => {
    setCapturedImages(prev => {
      const updated = [...prev, image]
      
      // Actualizar estadísticas
      setSystemStats(prevStats => ({
        ...prevStats,
        totalImages: updated.length,
        lastActivity: new Date()
      }))
      
      return updated
    })
  }, [])

  // Manejar cambio de estado de cámara
  const handleCameraStatusChange = useCallback((status: CameraStatus) => {
    setCameraStatus(status)
  }, [])

  // Manejar análisis completado
  const handleAnalysisComplete = useCallback((results: PredictionResult[]) => {
    setAnalysisResults(results)
    
    // Actualizar estadísticas
    if (results.length > 0) {
      const averageConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length
      setSystemStats(prevStats => ({
        ...prevStats,
        totalAnalyses: results.length,
        averageConfidence,
        lastActivity: new Date()
      }))
    }
  }, [])

  // Manejar actualización de sesión
  const handleSessionUpdate = useCallback((session: TestSession) => {
    setCurrentSession(session)
  }, [])

  // Limpiar datos
  const handleClearData = useCallback(() => {
    setCapturedImages([])
    setAnalysisResults([])
    setCurrentSession(null)
    setSystemStats({
      totalImages: 0,
      totalAnalyses: 0,
      averageConfidence: 0,
      lastActivity: null
    })
  }, [])

  // Exportar datos
  const handleExportData = useCallback((format: 'json' | 'csv') => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    
    if (format === 'json') {
      const exportData = {
        timestamp,
        session: currentSession,
        images: capturedImages.map(img => ({
          id: img.id,
          timestamp: img.timestamp,
          width: img.width,
          height: img.height,
          size: img.size
        })),
        results: analysisResults,
        statistics: systemStats
      }
      
      const dataStr = JSON.stringify(exportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `ai_verification_${timestamp}.json`
      link.click()
      
      URL.revokeObjectURL(url)
    } else {
      // Exportación CSV
      const headers = [
        'Timestamp',
        'Image_ID',
        'Prediction',
        'Confidence',
        'Processing_Time',
        'Model_Used'
      ]
      
      const csvRows = analysisResults.map(result => [
        result.timestamp.toISOString(),
        result.id,
        `"${result.prediction}"`,
        result.confidence.toFixed(4),
        result.processingTime.toString(),
        'AI_Model'
      ])
      
      const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n')
      const dataBlob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `ai_verification_${timestamp}.csv`
      link.click()
      
      URL.revokeObjectURL(url)
    }
  }, [currentSession, capturedImages, analysisResults, systemStats])

  const getCameraStatusColor = (status: CameraStatus) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'initializing': return 'bg-yellow-500'
      case 'capturing': return 'bg-blue-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getCameraStatusText = (status: CameraStatus) => {
    switch (status) {
      case 'active': return 'Activa'
      case 'initializing': return 'Inicializando'
      case 'capturing': return 'Capturando'
      case 'error': return 'Error'
      default: return 'Inactiva'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-6 space-y-6">
        
        {/* Header con estadísticas del sistema */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Sistema de Verificación de IA
                </CardTitle>
                <p className="text-gray-600 mt-1">
                  Evalúa y analiza modelos de IA usando tu cámara web en tiempo real
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${getCameraStatusColor(cameraStatus)}`}></div>
                  <Badge variant="secondary" className="text-xs">
                    Cámara: {getCameraStatusText(cameraStatus)}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleClearData}
                    variant="outline"
                    size="sm"
                    disabled={capturedImages.length === 0 && analysisResults.length === 0}
                  >
                    Limpiar Datos
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Estadísticas del sistema */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{systemStats.totalImages}</div>
                <div className="text-sm text-blue-800">Imágenes Capturadas</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{systemStats.totalAnalyses}</div>
                <div className="text-sm text-green-800">Análisis Completados</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {systemStats.averageConfidence > 0 
                    ? `${(systemStats.averageConfidence * 100).toFixed(1)}%` 
                    : '--'
                  }
                </div>
                <div className="text-sm text-purple-800">Confianza Promedio</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-xl font-bold text-orange-600">
                  {systemStats.lastActivity 
                    ? systemStats.lastActivity.toLocaleTimeString()
                    : '--:--'
                  }
                </div>
                <div className="text-sm text-orange-800">Última Actividad</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contenido principal con tabs */}
        <Tabs defaultValue="capture" className="w-full">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 h-auto">
            <TabsTrigger value="capture" className="flex items-center space-x-2 p-3">
              <span className="text-lg">📷</span>
              <div className="text-left">
                <div className="font-medium">Captura</div>
                <div className="text-xs text-gray-500">Cámara y configuración</div>
              </div>
            </TabsTrigger>
            
            <TabsTrigger value="analysis" className="flex items-center space-x-2 p-3">
              <span className="text-lg">🤖</span>
              <div className="text-left">
                <div className="font-medium">Análisis</div>
                <div className="text-xs text-gray-500">Procesamiento de IA</div>
              </div>
            </TabsTrigger>
            
            <TabsTrigger value="results" className="flex items-center space-x-2 p-3">
              <span className="text-lg">📊</span>
              <div className="text-left">
                <div className="font-medium">Resultados</div>
                <div className="text-xs text-gray-500">Métricas y visualización</div>
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="capture" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <CameraCapture
                  onImageCaptured={handleImageCaptured}
                  onStatusChange={handleCameraStatusChange}
                  autoCapture={false}
                  captureInterval={3}
                />
              </div>
              
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Imágenes Recientes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {capturedImages.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        <span className="text-2xl block mb-2">📸</span>
                        <p className="text-sm">No hay imágenes capturadas</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {capturedImages.slice(-5).reverse().map((image, index) => (
                          <div key={image.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                            <img
                              src={image.dataUrl}
                              alt={`Captura ${index + 1}`}
                              className="w-10 h-10 object-cover rounded border"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate">
                                {image.id.slice(-8)}
                              </div>
                              <div className="text-xs text-gray-600">
                                {image.timestamp.toLocaleTimeString()}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {image.width}×{image.height}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <AIAnalysisPanel
              capturedImages={capturedImages}
              onAnalysisComplete={handleAnalysisComplete}
              onSessionUpdate={handleSessionUpdate}
            />
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <ResultsVisualization
              predictions={analysisResults}
              session={currentSession}
              onExport={handleExportData}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}