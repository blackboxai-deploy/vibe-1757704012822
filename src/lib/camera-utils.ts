import { CameraConfig, CameraDevice, CapturedImage, CameraStatus } from '@/types';

export class CameraManager {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private status: CameraStatus = CameraStatus.INACTIVE;
  private devices: CameraDevice[] = [];

  constructor() {
    this.initializeDevices();
  }

  /**
   * Inicializa y obtiene la lista de dispositivos de cámara disponibles
   */
  async initializeDevices(): Promise<CameraDevice[]> {
    try {
      // Solicitar permisos primero
      await navigator.mediaDevices.getUserMedia({ video: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.devices = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Cámara ${device.deviceId.slice(0, 8)}`,
          kind: device.kind
        }));

      return this.devices;
    } catch (error) {
      console.error('Error al acceder a dispositivos de cámara:', error);
      throw new Error('No se pueden acceder a los dispositivos de cámara');
    }
  }

  /**
   * Inicia la cámara con la configuración especificada
   */
  async startCamera(
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement,
    config: Partial<CameraConfig> = {}
  ): Promise<void> {
    try {
      this.status = CameraStatus.INITIALIZING;
      this.videoElement = videoElement;
      this.canvasElement = canvasElement;

      const defaultConfig: CameraConfig = {
        width: 640,
        height: 480,
        frameRate: 30,
        facingMode: 'user',
        autoCapture: false,
        captureInterval: 1,
        ...config
      };

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: config.deviceId ? { exact: config.deviceId } : undefined,
          width: { ideal: defaultConfig.width },
          height: { ideal: defaultConfig.height },
          frameRate: { ideal: defaultConfig.frameRate },
          facingMode: defaultConfig.facingMode
        },
        audio: false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.srcObject = this.stream;
      
      return new Promise((resolve, reject) => {
        this.videoElement!.onloadedmetadata = () => {
          this.videoElement!.play();
          this.status = CameraStatus.ACTIVE;
          resolve();
        };
        
        this.videoElement!.onerror = () => {
          this.status = CameraStatus.ERROR;
          reject(new Error('Error al cargar el video de la cámara'));
        };
      });
    } catch (error) {
      this.status = CameraStatus.ERROR;
      console.error('Error al iniciar cámara:', error);
      throw error;
    }
  }

  /**
   * Captura una imagen de la cámara
   */
  captureImage(): CapturedImage | null {
    if (!this.videoElement || !this.canvasElement || this.status !== CameraStatus.ACTIVE) {
      console.error('Cámara no inicializada correctamente');
      return null;
    }

    try {
      this.status = CameraStatus.CAPTURING;
      
      const context = this.canvasElement.getContext('2d');
      if (!context) {
        throw new Error('No se puede obtener el contexto 2D del canvas');
      }

      // Configurar el canvas con las dimensiones del video
      this.canvasElement.width = this.videoElement.videoWidth;
      this.canvasElement.height = this.videoElement.videoHeight;

      // Dibujar el frame actual del video en el canvas
      context.drawImage(
        this.videoElement,
        0,
        0,
        this.canvasElement.width,
        this.canvasElement.height
      );

      // Convertir a base64
      const dataUrl = this.canvasElement.toDataURL('image/jpeg', 0.8);
      
      const capturedImage: CapturedImage = {
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        dataUrl,
        timestamp: new Date(),
        width: this.canvasElement.width,
        height: this.canvasElement.height,
        size: Math.round(dataUrl.length * 0.75) // Aproximación del tamaño en bytes
      };

      this.status = CameraStatus.ACTIVE;
      return capturedImage;
    } catch (error) {
      this.status = CameraStatus.ERROR;
      console.error('Error al capturar imagen:', error);
      return null;
    }
  }

  /**
   * Detiene la cámara y libera recursos
   */
  stopCamera(): void {
    try {
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }

      if (this.videoElement) {
        this.videoElement.srcObject = null;
        this.videoElement = null;
      }

      this.canvasElement = null;
      this.status = CameraStatus.INACTIVE;
    } catch (error) {
      console.error('Error al detener cámara:', error);
      this.status = CameraStatus.ERROR;
    }
  }

  /**
   * Obtiene el estado actual de la cámara
   */
  getStatus(): CameraStatus {
    return this.status;
  }

  /**
   * Obtiene la lista de dispositivos disponibles
   */
  getDevices(): CameraDevice[] {
    return this.devices;
  }

  /**
   * Verifica si la cámara está disponible en el navegador
   */
  static isCameraSupported(): boolean {
    return !!(
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof navigator.mediaDevices.enumerateDevices === 'function'
    );
  }

  /**
   * Procesa una imagen capturada para optimizarla
   */
  static processImage(
    imageData: string,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: string;
    } = {}
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

        const maxWidth = options.maxWidth || img.width;
        const maxHeight = options.maxHeight || img.height;
        const quality = options.quality || 0.8;
        const format = options.format || 'image/jpeg';

        // Calcular nuevas dimensiones manteniendo la relación de aspecto
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a formato especificado
        const processedDataUrl = canvas.toDataURL(format, quality);
        resolve(processedDataUrl);
      };

      img.onerror = () => {
        reject(new Error('Error al cargar la imagen para procesamiento'));
      };

      img.src = imageData;
    });
  }

  /**
   * Convierte dataURL a Blob para upload
   */
  static dataURLToBlob(dataURL: string): Blob {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
  }

  /**
   * Obtiene información detallada de la cámara activa
   */
  getCameraInfo(): {
    resolution: { width: number; height: number };
    frameRate: number;
    deviceLabel: string;
    isActive: boolean;
  } | null {
    if (!this.videoElement || !this.stream) {
      return null;
    }

    const videoTrack = this.stream.getVideoTracks()[0];
    const settings = videoTrack.getSettings();

    return {
      resolution: {
        width: this.videoElement.videoWidth,
        height: this.videoElement.videoHeight
      },
      frameRate: settings.frameRate || 30,
      deviceLabel: videoTrack.label || 'Cámara desconocida',
      isActive: this.status === CameraStatus.ACTIVE
    };
  }
}