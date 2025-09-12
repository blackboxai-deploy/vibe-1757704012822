'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { CameraManager } from '@/lib/camera-utils'
import { CameraConfig, CameraDevice, CapturedImage, CameraStatus } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface CameraCaptureProps {
  onImageCaptured: (image: CapturedImage) => void
  onStatusChange: (status: CameraStatus) => void
  autoCapture?: boolean
  captureInterval?: number
}

export default function CameraCapture({
  onImageCaptured,
  onStatusChange,
  autoCapture = false,
  captureInterval = 3
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cameraManagerRef = useRef<CameraManager | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [status, setStatus] = useState<CameraStatus>(CameraStatus.INACTIVE)
  const [devices, setDevices] = useState<CameraDevice[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [cameraConfig, setCameraConfig] = useState<CameraConfig>({
    width: 640,
    height: 480,
    frameRate: 30,
    facingMode: 'user',
    autoCapture: autoCapture,
    captureInterval: captureInterval
  })
  const [isAutoCapturing, setIsAutoCapturing] = useState(false)
  const [capturedCount, setCapturedCount] = useState(0)
  const [cameraInfo, setCameraInfo] = useState<any>(null)

  // Inicializar cámara manager
  useEffect(() => {
    if (CameraManager.isCameraSupported()) {
      cameraManagerRef.current = new CameraManager()
      initializeDevices()
    }
    
    return () => {
      stopCamera()
    }
  }, [])

  // Actualizar estado cuando cambie
  useEffect(() => {
    onStatusChange(status)
  }, [status, onStatusChange])

  // Manejar auto-captura
  useEffect(() => {
    if (isAutoCapturing && status === CameraStatus.ACTIVE) {
      intervalRef.current = setInterval(() => {
        handleCapture()
      }, cameraConfig.captureInterval * 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isAutoCapturing, status, cameraConfig.captureInterval])

  const initializeDevices = async () => {
    try {
      if (cameraManagerRef.current) {
        const availableDevices = await cameraManagerRef.current.initializeDevices()
        setDevices(availableDevices)
        if (availableDevices.length > 0) {
          setSelectedDevice(availableDevices[0].deviceId)
        }
      }
    } catch (error) {
      console.error('Error inicializando dispositivos:', error)
      setStatus(CameraStatus.ERROR)
    }
  }

  const startCamera = async () => {
    try {
      if (!cameraManagerRef.current || !videoRef.current || !canvasRef.current) {
        throw new Error('Referencias de cámara no disponibles')
      }

      const config = { ...cameraConfig, deviceId: selectedDevice }
      await cameraManagerRef.current.startCamera(videoRef.current, canvasRef.current, config)
      
      const newStatus = cameraManagerRef.current.getStatus()
      setStatus(newStatus)
      
      // Obtener información de la cámara
      const info = cameraManagerRef.current.getCameraInfo()
      setCameraInfo(info)
      
    } catch (error) {
      console.error('Error al iniciar cámara:', error)
      setStatus(CameraStatus.ERROR)
    }
  }

  const stopCamera = useCallback(() => {
    if (cameraManagerRef.current) {
      cameraManagerRef.current.stopCamera()
      setStatus(CameraStatus.INACTIVE)
      setCameraInfo(null)
      setIsAutoCapturing(false)
    }
  }, [])

  const handleCapture = async () => {
    if (!cameraManagerRef.current || status !== CameraStatus.ACTIVE) {
      return
    }

    try {
      const image = cameraManagerRef.current.captureImage()
      if (image) {
        setCapturedCount(prev => prev + 1)
        onImageCaptured(image)
      }
    } catch (error) {
      console.error('Error al capturar imagen:', error)
    }
  }

  const getStatusColor = (status: CameraStatus) => {
    switch (status) {
      case CameraStatus.ACTIVE:
        return 'bg-green-500'
      case CameraStatus.INITIALIZING:
        return 'bg-yellow-500'
      case CameraStatus.CAPTURING:
        return 'bg-blue-500'
      case CameraStatus.ERROR:
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = (status: CameraStatus) => {
    switch (status) {
      case CameraStatus.ACTIVE:
        return 'Activa'
      case CameraStatus.INITIALIZING:
        return 'Inicializando'
      case CameraStatus.CAPTURING:
        return 'Capturando'
      case CameraStatus.ERROR:
        return 'Error'
      default:
        return 'Inactiva'
    }
  }

  if (!CameraManager.isCameraSupported()) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Cámara no disponible
            </h3>
            <p className="text-gray-600">
              Tu navegador no soporta acceso a la cámara o no tienes cámara disponible.
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
          <CardTitle className="text-lg font-semibold">Captura de Cámara</CardTitle>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`}></div>
            <Badge variant="secondary" className="text-xs">
              {getStatusText(status)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Configuración de cámara */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="device-select">Dispositivo de cámara</Label>
            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger id="device-select">
                <SelectValue placeholder="Seleccionar cámara" />
              </SelectTrigger>
              <SelectContent>
                {devices.map(device => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resolution-select">Resolución</Label>
            <Select 
              value={`${cameraConfig.width}x${cameraConfig.height}`}
              onValueChange={(value) => {
                const [width, height] = value.split('x').map(Number)
                setCameraConfig(prev => ({ ...prev, width, height }))
              }}
            >
              <SelectTrigger id="resolution-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="640x480">640x480 (VGA)</SelectItem>
                <SelectItem value="1280x720">1280x720 (HD)</SelectItem>
                <SelectItem value="1920x1080">1920x1080 (Full HD)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Controles de auto-captura */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="auto-capture">Captura automática</Label>
            <p className="text-sm text-gray-600">
              Capturar imágenes automáticamente cada {cameraConfig.captureInterval} segundos
            </p>
          </div>
          <Switch
            id="auto-capture"
            checked={isAutoCapturing}
            onCheckedChange={setIsAutoCapturing}
            disabled={status !== CameraStatus.ACTIVE}
          />
        </div>

        {/* Vista de la cámara */}
        <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/12' }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            style={{ display: status === CameraStatus.ACTIVE ? 'block' : 'none' }}
          />
          
          {status === CameraStatus.INACTIVE && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📷</span>
                </div>
                <p>Cámara desactivada</p>
                <p className="text-sm text-gray-400">Presiona iniciar para activar</p>
              </div>
            </div>
          )}

          {status === CameraStatus.INITIALIZING && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
              <div className="text-center">
                <div className="w-8 h-8 border-t-2 border-white rounded-full animate-spin mx-auto mb-4"></div>
                <p>Inicializando cámara...</p>
              </div>
            </div>
          )}

          {status === CameraStatus.ERROR && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900 text-white">
              <div className="text-center">
                <span className="text-4xl mb-4 block">⚠️</span>
                <p>Error de cámara</p>
                <p className="text-sm text-red-200">Verifica permisos y conexión</p>
              </div>
            </div>
          )}

          {/* Overlay de captura */}
          {status === CameraStatus.CAPTURING && (
            <div className="absolute inset-0 border-4 border-blue-500 animate-pulse"></div>
          )}
        </div>

        {/* Canvas oculto para captura */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Controles */}
        <div className="flex flex-wrap gap-3 justify-center">
          {status === CameraStatus.INACTIVE && (
            <Button 
              onClick={startCamera} 
              className="px-6 py-2 bg-green-600 hover:bg-green-700"
              disabled={devices.length === 0}
            >
              Iniciar Cámara
            </Button>
          )}

          {status === CameraStatus.ACTIVE && (
            <>
              <Button 
                onClick={handleCapture}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700"
              >
                Capturar Imagen
              </Button>
              
              <Button 
                onClick={stopCamera}
                variant="outline"
                className="px-6 py-2"
              >
                Detener Cámara
              </Button>
            </>
          )}
        </div>

        {/* Información de la cámara y estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{capturedCount}</div>
            <div className="text-sm text-gray-600">Imágenes capturadas</div>
          </div>
          
          {cameraInfo && (
            <>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-900">
                  {cameraInfo.resolution.width} × {cameraInfo.resolution.height}
                </div>
                <div className="text-sm text-gray-600">Resolución actual</div>
              </div>
              
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-900">
                  {cameraInfo.frameRate} FPS
                </div>
                <div className="text-sm text-gray-600">Velocidad de fotogramas</div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}