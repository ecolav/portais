import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../config/api';

// Singleton para gerenciar a conexão WebSocket globalmente
class SocketManager {
  private static instance: SocketManager;
  private socket: Socket | null = null;

  private constructor() {}

  public static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  public getSocket(): Socket {
    if (!this.socket) {
      console.log('🔌 Criando conexão WebSocket (singleton)...');
      this.socket = io(API_CONFIG.BASE_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: Infinity
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket conectado ao servidor backend');
      });

      this.socket.on('disconnect', () => {
        console.log('🔌 Socket desconectado do servidor backend');
      });
    }
    return this.socket;
  }

  public disconnect() {
    if (this.socket) {
      console.log('🔌 Desconectando socket permanentemente...');
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketManager = SocketManager.getInstance();

