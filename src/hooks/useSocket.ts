import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../config/api';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Conectar ao servidor apenas uma vez
    if (!socketRef.current) {
      console.log('🔌 Conectando socket para Excel...');
      socketRef.current = io(API_CONFIG.BASE_URL);
      
      socketRef.current.on('connect', () => {
        console.log('✅ Socket conectado para Excel');
      });
      
      socketRef.current.on('disconnect', () => {
        console.log('🔌 Socket desconectado para Excel');
      });
    }

    // Limpeza na desconexão
    return () => {
      if (socketRef.current) {
        console.log('🧹 Limpando socket Excel...');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return socketRef.current;
}
