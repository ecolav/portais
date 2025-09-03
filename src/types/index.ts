// Tipos para configuração do leitor RFID
export interface RFIDReaderConfig {
  ip: string;
  port: number;
  timeout: number;
  retryCount: number;
  isConnected: boolean;
  isReading: boolean;
}

// Tipos para dados das peças
export interface Piece {
  id: string;
  pieceNumber: string;
  pieceName: string;
  epc: string;
  category?: string;
  description?: string;
  createdAt: Date;
}

// Tipos para tags lidas
export interface RFIDTag {
  id: string;
  epc: string;
  pieceNumber?: string;
  pieceName?: string;
  timestamp: Date;
  status: 'read' | 'duplicate' | 'error';
  readerId?: string;
}

// Tipos para configuração de áudio
export interface AudioConfig {
  enabled: boolean;
  volume: number;
  sounds: {
    tagRead: string;
    error: string;
    duplicate: string;
    connection: string;
  };
}

// Tipos para configuração de câmera
export interface CameraConfig {
  enabled: boolean;
  deviceId: string;
  resolution: '640x480' | '1280x720' | '1920x1080';
  quality: number;
  autoCapture: boolean;
  captureDelay: number;
  savePath: string;
}

// Tipos para método de notificação
export interface NotificationMethod {
  type: 'none' | 'sound' | 'camera' | 'both';
  priority: 'sound' | 'camera';
}

// Tipos para estatísticas
export interface RFIDStats {
  totalTags: number;
  uniqueTags: number;
  duplicateTags: number;
  piecesLoaded: number;
}

// Tipos para notificações
export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

// Tipos para eventos WebSocket
export interface WebSocketEvents {
  connection_status: { connected: boolean };
  reading_status: { reading: boolean };
  tag_read: RFIDTag;
  config_updated: RFIDReaderConfig;
  audio_updated: AudioConfig;
}

// Tipos para respostas da API
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Tipos para upload de arquivo
export interface FileUpload {
  file: File;
  progress: number;
  status: 'idle' | 'uploading' | 'success' | 'error';
}
