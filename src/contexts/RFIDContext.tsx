import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { RFIDReaderConfig, RFIDTag, Piece, AudioConfig, CameraConfig, NotificationMethod, RFIDStats } from '../types';

// Estado inicial
interface RFIDState {
  readerConfig: RFIDReaderConfig;
  tags: RFIDTag[];
  pieces: Piece[];
  audioConfig: AudioConfig;
  cameraConfig: CameraConfig;
  notificationMethod: NotificationMethod;
  stats: RFIDStats;
  isConnected: boolean;
  isReading: boolean;
}

const initialState: RFIDState = {
  readerConfig: {
    ip: '192.168.1.100',
    port: 8080,
    timeout: 5,
    retryCount: 3,
    isConnected: false,
    isReading: false,
  },
  tags: [],
  pieces: [],
  audioConfig: {
    enabled: true,
    volume: 0.7,
    sounds: {
      tagRead: 'success.mp3',
      error: 'error.mp3',
      duplicate: 'duplicate.mp3',
      connection: 'connection.mp3',
    },
  },
  cameraConfig: {
    enabled: false,
    deviceId: '',
    resolution: '1280x720',
    quality: 0.8,
    autoCapture: true,
    captureDelay: 1000,
    savePath: './captures/',
  },
  notificationMethod: {
    type: 'none',
    priority: 'sound',
  },
  stats: {
    totalTags: 0,
    uniqueTags: 0,
    duplicateTags: 0,
    piecesLoaded: 0,
  },
  isConnected: false,
  isReading: false,
};

// Tipos de ações
type RFIDAction =
  | { type: 'SET_READER_CONFIG'; payload: Partial<RFIDReaderConfig> }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'SET_READING_STATUS'; payload: boolean }
  | { type: 'ADD_TAG'; payload: RFIDTag }
  | { type: 'CLEAR_TAGS' }
  | { type: 'SET_PIECES'; payload: Piece[] }
  | { type: 'SET_AUDIO_CONFIG'; payload: Partial<AudioConfig> }
  | { type: 'SET_CAMERA_CONFIG'; payload: Partial<CameraConfig> }
  | { type: 'SET_NOTIFICATION_METHOD'; payload: NotificationMethod }
  | { type: 'UPDATE_STATS' }
  | { type: 'RESET_STATE' };

// Reducer
function rfidReducer(state: RFIDState, action: RFIDAction): RFIDState {
  switch (action.type) {
    case 'SET_READER_CONFIG':
      return {
        ...state,
        readerConfig: { ...state.readerConfig, ...action.payload },
      };

    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        isConnected: action.payload,
        readerConfig: { ...state.readerConfig, isConnected: action.payload },
      };

    case 'SET_READING_STATUS':
      return {
        ...state,
        isReading: action.payload,
        readerConfig: { ...state.readerConfig, isReading: action.payload },
      };

    case 'ADD_TAG':
      const newTags = [action.payload, ...state.tags.slice(0, 99)]; // Manter apenas 100 tags
      return {
        ...state,
        tags: newTags,
      };

    case 'CLEAR_TAGS':
      return {
        ...state,
        tags: [],
      };

    case 'SET_PIECES':
      return {
        ...state,
        pieces: action.payload,
      };

    case 'SET_AUDIO_CONFIG':
      return {
        ...state,
        audioConfig: { ...state.audioConfig, ...action.payload },
      };

    case 'SET_CAMERA_CONFIG':
      return {
        ...state,
        cameraConfig: { ...state.cameraConfig, ...action.payload },
      };

    case 'SET_NOTIFICATION_METHOD':
      return {
        ...state,
        notificationMethod: action.payload,
      };

    case 'UPDATE_STATS':
      const totalTags = state.tags.length;
      const uniqueTags = new Set(state.tags.map(tag => tag.epc)).size;
      const duplicateTags = totalTags - uniqueTags;
      
      return {
        ...state,
        stats: {
          totalTags,
          uniqueTags,
          duplicateTags,
          piecesLoaded: state.pieces.length,
        },
      };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

// Contexto
interface RFIDContextType {
  state: RFIDState;
  dispatch: React.Dispatch<RFIDAction>;
  // Métodos de conveniência
  updateReaderConfig: (config: Partial<RFIDReaderConfig>) => void;
  connectReader: () => void;
  disconnectReader: () => void;
  startReading: () => void;
  stopReading: () => void;
  addTag: (tag: RFIDTag) => void;
  clearTags: () => void;
  setPieces: (pieces: Piece[]) => void;
  updateAudioConfig: (config: Partial<AudioConfig>) => void;
  updateCameraConfig: (config: Partial<CameraConfig>) => void;
  setNotificationMethod: (method: NotificationMethod) => void;
}

const RFIDContext = createContext<RFIDContextType | undefined>(undefined);

// Provider
interface RFIDProviderProps {
  children: ReactNode;
}

export function RFIDProvider({ children }: RFIDProviderProps) {
  const [state, dispatch] = useReducer(rfidReducer, initialState);

  // Métodos de conveniência
  const updateReaderConfig = (config: Partial<RFIDReaderConfig>) => {
    dispatch({ type: 'SET_READER_CONFIG', payload: config });
  };

  const connectReader = () => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
  };

  const disconnectReader = () => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
    dispatch({ type: 'SET_READING_STATUS', payload: false });
  };

  const startReading = () => {
    dispatch({ type: 'SET_READING_STATUS', payload: true });
  };

  const stopReading = () => {
    dispatch({ type: 'SET_READING_STATUS', payload: false });
  };

  const addTag = (tag: RFIDTag) => {
    dispatch({ type: 'ADD_TAG', payload: tag });
    dispatch({ type: 'UPDATE_STATS' });
  };

  const clearTags = () => {
    dispatch({ type: 'CLEAR_TAGS' });
    dispatch({ type: 'UPDATE_STATS' });
  };

  const setPieces = (pieces: Piece[]) => {
    dispatch({ type: 'SET_PIECES', payload: pieces });
    dispatch({ type: 'UPDATE_STATS' });
  };

  const updateAudioConfig = (config: Partial<AudioConfig>) => {
    dispatch({ type: 'SET_AUDIO_CONFIG', payload: config });
  };

  const updateCameraConfig = (config: Partial<CameraConfig>) => {
    dispatch({ type: 'SET_CAMERA_CONFIG', payload: config });
  };

  const setNotificationMethod = (method: NotificationMethod) => {
    dispatch({ type: 'SET_NOTIFICATION_METHOD', payload: method });
  };

  const value: RFIDContextType = {
    state,
    dispatch,
    updateReaderConfig,
    connectReader,
    disconnectReader,
    startReading,
    stopReading,
    addTag,
    clearTags,
    setPieces,
    updateAudioConfig,
    updateCameraConfig,
    setNotificationMethod,
  };

  return <RFIDContext.Provider value={value}>{children}</RFIDContext.Provider>;
}

// Hook personalizado
export function useRFID() {
  const context = useContext(RFIDContext);
  if (context === undefined) {
    throw new Error('useRFID deve ser usado dentro de um RFIDProvider');
  }
  return context;
}
