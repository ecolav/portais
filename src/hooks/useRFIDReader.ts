import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

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
  rssi: number;
  antenna: number;
  timestamp: string;
  rawData: string;
}

interface ConnectionStatus {
  isConnected: boolean;
  isReading: boolean;
  totalReadings: number;
  uniqueEPCs: number;
}

export function useRFIDReader() {
  // Estado do sistema
  const [config, setConfig] = useState<RFIDReaderConfig>({
    ip: '192.168.99.201', // IP correto da antena
    port: 8888,
    power: 30,
    antennas: [1, 2, 3, 4],
    soundEnabled: true
  });

  const [readings, setReadings] = useState<RFIDReading[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isReading: false,
    totalReadings: 0,
    uniqueEPCs: 0
  });

  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Conectar ao servidor backend
  useEffect(() => {
    console.log('🔌 Conectando ao servidor backend...');
    const socket = io('http://localhost:3001');
    socketRef.current = socket;

    // Eventos de conexão
    socket.on('connect', () => {
      console.log('✅ Conectado ao servidor backend');
      setError(null);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Desconectado do servidor backend');
      setStatus(current => ({ ...current, isConnected: false, isReading: false }));
    });

    // Eventos de status
    socket.on('connection-status', (data: ConnectionStatus) => {
      console.log('📊 Status da conexão:', data);
      setStatus(data);
    });

    socket.on('reading-status', (data: { isReading: boolean }) => {
      console.log('📊 Status da leitura:', data);
      setStatus(current => ({ ...current, isReading: data.isReading }));
    });

    // Eventos de leituras RFID
    socket.on('rfid-reading', (reading: RFIDReading) => {
      console.log('🎯 Nova leitura RFID:', reading);
      setReadings(current => [reading, ...current.slice(0, 99)]); // Manter últimas 100
      
      // Tocar som se habilitado
      if (config.soundEnabled) {
        playRFIDSound();
      }
    });

    socket.on('readings-update', (data: { readings: RFIDReading[], totalReadings: number }) => {
      console.log('📊 Atualização de leituras:', data);
      setReadings(data.readings);
      setStatus(current => ({ ...current, totalReadings: data.totalReadings }));
    });

    // Eventos de erro
    socket.on('error', (data: { message: string }) => {
      console.error('❌ Erro do servidor:', data.message);
      setError(data.message);
    });

    // Limpeza na desconexão
    return () => {
      console.log('🧹 Limpando conexão com servidor...');
      socket.disconnect();
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
