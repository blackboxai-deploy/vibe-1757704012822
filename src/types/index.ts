// Tipos para el sistema de verificación de IA con cámara web

export interface ModelMetadata {
  id: string;
  name: string;
  type: 'tensorflow' | 'onnx' | 'custom' | 'openrouter';
  version: string;
  description: string;
  inputShape: number[];
  outputClasses: string[];
  accuracy?: number;
  createdAt: Date;
  filePath?: string;
  endpoint?: string;
}

export interface PredictionResult {
  id: string;
  prediction: string;
  confidence: number;
  probabilities: { [key: string]: number };
  processingTime: number;
  timestamp: Date;
  imageData?: string; // base64
}

export interface TestSession {
  id: string;
  modelId: string;
  name: string;
  mode: 'individual' | 'batch' | 'continuous' | 'comparative';
  startTime: Date;
  endTime?: Date;
  totalPredictions: number;
  correctPredictions: number;
  results: PredictionResult[];
  metrics: AnalysisMetrics;
  groundTruth?: { [key: string]: string };
}

export interface AnalysisMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: number[][];
  averageProcessingTime: number;
  totalImages: number;
  classificationReport: ClassificationReport;
}

export interface ClassificationReport {
  [className: string]: {
    precision: number;
    recall: number;
    f1Score: number;
    support: number;
  };
}

export interface CameraConfig {
  deviceId?: string;
  width: number;
  height: number;
  frameRate: number;
  facingMode: 'user' | 'environment';
  autoCapture: boolean;
  captureInterval: number; // en segundos
}

export interface TestConfiguration {
  categories: string[];
  confidenceThreshold: number;
  batchSize: number;
  maxImages: number;
  autoValidation: boolean;
  preprocessingOptions: PreprocessingOptions;
}

export interface PreprocessingOptions {
  resize: { width: number; height: number };
  normalize: boolean;
  centerCrop: boolean;
  grayscale: boolean;
}

export interface ValidationResult {
  sessionId: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  overallScore: number;
  detailedMetrics: DetailedMetrics;
}

export interface DetailedMetrics {
  performanceMetrics: {
    averageInferenceTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  qualityMetrics: {
    imageQuality: number;
    consistencyScore: number;
    robustnessScore: number;
  };
  reliabilityMetrics: {
    stabilityScore: number;
    errorRate: number;
    falsePositiveRate: number;
    falseNegativeRate: number;
  };
}

export interface CameraDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export interface CapturedImage {
  id: string;
  dataUrl: string;
  timestamp: Date;
  width: number;
  height: number;
  size: number; // en bytes
}

export interface ModelFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  data: ArrayBuffer;
}

export interface AIProvider {
  name: string;
  type: 'local' | 'cloud';
  models: string[];
  apiEndpoint?: string;
  requiresAuth: boolean;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf';
  includeImages: boolean;
  includeRawData: boolean;
  includeCharts: boolean;
  dateRange?: { start: Date; end: Date };
}

export interface RealtimeStats {
  currentFPS: number;
  predictionsPerSecond: number;
  averageConfidence: number;
  memoryUsage: number;
  isProcessing: boolean;
  queueSize: number;
}

// Enums
export enum TestMode {
  INDIVIDUAL = 'individual',
  BATCH = 'batch', 
  CONTINUOUS = 'continuous',
  COMPARATIVE = 'comparative'
}

export enum ModelStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  READY = 'ready',
  PROCESSING = 'processing',
  ERROR = 'error'
}

export enum CameraStatus {
  INACTIVE = 'inactive',
  INITIALIZING = 'initializing',
  ACTIVE = 'active',
  CAPTURING = 'capturing',
  ERROR = 'error'
}