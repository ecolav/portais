import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { socketManager } from '../services/socketManager';

// Interfaces para o protocolo correto descoberto
interface RFIDReaderConfig {
  ip: string;
  port: number;
  power: number;
  antennas: number[];
  soundEnabled: boolean;
}

interface RFIDReading {
  id: number;
  epc: string;
  tid?: string;
  rssi: number;
  antenna: number;
  timestamp: string;
  rawData: string;
}

interface ConnectionStatus {
  isConnected: boolean;
  isReading: boolean;
  totalReadings: number;
  uniqueTags: number;
}

// Helper para persistir estado
const getPersistedState = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setPersistedState = <T,>(key: string, value: T) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Erro ao persistir estado:', error);
  }
};

export function useRFIDReader() {
  // Estado do sistema - PERSISTIDO entre páginas
  const [config, setConfig] = useState<RFIDReaderConfig>(() => 
    getPersistedState('rfid-config', {
      ip: '192.168.99.201',
      port: 8888,
      power: 30,
      antennas: [1, 2, 3, 4],
      soundEnabled: true
    })
  );

  const [readings, setReadings] = useState<RFIDReading[]>(() => 
    getPersistedState('rfid-readings', [])
  );
  
  const [status, setStatus] = useState<ConnectionStatus>(() => 
    getPersistedState('rfid-status', {
      isConnected: false,
      isReading: false,
      totalReadings: 0,
      uniqueTags: 0
    })
  );

  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Persistir mudanças de estado
  useEffect(() => {
    setPersistedState('rfid-config', config);
  }, [config]);

  useEffect(() => {
    setPersistedState('rfid-readings', readings);
  }, [readings]);

  useEffect(() => {
    setPersistedState('rfid-status', status);
  }, [status]);

  // Conectar ao servidor backend usando Singleton - MANTÉM CONEXÃO PERSISTENTE
  useEffect(() => {
    console.log('🔌 Obtendo socket do gerenciador...');
    const socket = socketManager.getSocket();
    socketRef.current = socket;

    // Configurar handlers de eventos (idempotente - pode ser chamado múltiplas vezes)
    const handleConnect = () => {
      console.log('✅ Conectado ao servidor backend');
      setError(null);
    };

    const handleDisconnect = () => {
      console.log('🔌 Desconectado do servidor backend');
      setStatus(current => ({ ...current, isConnected: false, isReading: false }));
    };

    const handleConnectionStatus = (data: ConnectionStatus) => {
      console.log('📊 Status da conexão:', data);
      setStatus(data);
    };

    const handleReadingStatus = (data: { isReading: boolean }) => {
      console.log('📊 Status da leitura:', data);
      setStatus(current => ({ ...current, isReading: data.isReading }));
    };

    const handleRFIDReading = (reading: RFIDReading) => {
      console.log('🎯 Nova leitura RFID:', reading);
      setReadings(current => [reading, ...current.slice(0, 99)]);
      
      if (config.soundEnabled) {
        playRFIDSound();
      }
    };

    const handleReadingsUpdate = (data: { readings: RFIDReading[], totalReadings: number, uniqueTIDs?: number, uniqueTags?: number }) => {
      console.log('📊 Atualização de leituras:', data);
      setReadings(data.readings);
      setStatus(current => ({ 
        ...current, 
        totalReadings: data.totalReadings,
        uniqueTags: (data.uniqueTags ?? data.uniqueTIDs) || 0
      }));
    };

    const handleError = (data: { message: string }) => {
      console.error('❌ Erro do servidor:', data.message);
      setError(data.message);
    };

    // Registrar eventos
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connection-status', handleConnectionStatus);
    socket.on('reading-status', handleReadingStatus);
    socket.on('rfid-reading', handleRFIDReading);
    socket.on('readings-update', handleReadingsUpdate);
    socket.on('error', handleError);

    // Solicitar status atual do servidor ao montar
    if (socket.connected) {
      console.log('🔄 Solicitando status atual do servidor...');
      socket.emit('get-status');
    }

    // Cleanup: remover apenas os listeners deste componente, mas mantém socket ativo
    return () => {
      console.log('🧹 Removendo listeners do componente, mas mantendo socket ativo...');
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connection-status', handleConnectionStatus);
      socket.off('reading-status', handleReadingStatus);
      socket.off('rfid-reading', handleRFIDReading);
      socket.off('readings-update', handleReadingsUpdate);
      socket.off('error', handleError);
    };
  }, [config.soundEnabled]);

  // Função para conectar ao leitor RFID
  const connectToReader = useCallback(async () => {
    if (!socketRef.current) {
      setError('Servidor não conectado');
      return;
    }

    try {
      console.log('🔌 Conectando ao leitor RFID...');
      socketRef.current.emit('connect-reader');
      setError(null);
    } catch (error) {
      console.error('❌ Erro ao conectar:', error);
      setError('Erro ao conectar ao leitor');
    }
  }, []);

  // Função para desconectar do leitor
  const disconnectFromReader = useCallback(() => {
    if (!socketRef.current) return;

    console.log('🔌 Desconectando do leitor RFID...');
    socketRef.current.emit('disconnect-reader');
  }, []);

  // Função para iniciar leitura contínua
  const startContinuousReading = useCallback(() => {
    if (!socketRef.current) {
      setError('Servidor não conectado');
      return;
    }

    try {
      console.log('🟢 Iniciando leitura contínua...');
      socketRef.current.emit('start-reading');
      setError(null);
    } catch (error) {
      console.error('❌ Erro ao iniciar leitura:', error);
      setError('Erro ao iniciar leitura');
    }
  }, []);

  // Função para parar leitura
  const stopContinuousReading = useCallback(() => {
    if (!socketRef.current) return;

    console.log('🛑 Parando leitura contínua...');
    socketRef.current.emit('stop-reading');
  }, []);

  // Função para ler tag única
  const readSingleTag = useCallback(() => {
    if (!socketRef.current) {
      setError('Servidor não conectado');
      return;
    }

    try {
      console.log('📡 Lendo tag única...');
      // Para leitura única, iniciamos e paramos rapidamente
      socketRef.current.emit('start-reading');
      setTimeout(() => {
        socketRef.current?.emit('stop-reading');
      }, 2000);
      setError(null);
    } catch (error) {
      console.error('❌ Erro ao ler tag:', error);
      setError('Erro ao ler tag');
    }
  }, []);

  // Função para limpar leituras
  const clearReadings = useCallback(() => {
    if (!socketRef.current) return;

    console.log('🧹 Limpando leituras...');
    socketRef.current.emit('clear-readings');
    setReadings([]);
  }, []);

  // Função para tocar som RFID
  const playRFIDSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);

      // Som de "beep" RFID
      oscillator.frequency.setValueAtTime(800, audioContextRef.current.currentTime);
      oscillator.frequency.setValueAtTime(1200, audioContextRef.current.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContextRef.current.currentTime + 0.2);

      gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.3);

      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + 0.3);
    } catch (error) {
      console.warn('⚠️ Não foi possível tocar som:', error);
    }
  }, []);

  // Função para atualizar configuração
  const updateConfig = useCallback((newConfig: Partial<RFIDReaderConfig>) => {
    setConfig(current => ({ ...current, ...newConfig }));
  }, []);

  // Função para limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Estado
    config,
    readings,
    status,
    error,
    
    // Ações
    connectToReader,
    disconnectFromReader,
    startContinuousReading,
    stopContinuousReading,
    readSingleTag,
    clearReadings,
    updateConfig,
    clearError,
    
    // Utilitários
    playRFIDSound
  };
}
