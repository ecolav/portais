import React from 'react';
import { Wifi, WifiOff, Play, Pause, Tag } from 'lucide-react';

interface HeaderProps {
  isConnected?: boolean;
  isReading?: boolean;
}

export default function Header({ isConnected = false, isReading = false }: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-purple-700 text-white shadow-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo e Título */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold drop-shadow-lg">Portal RFID</h1>
              <p className="text-white/80">Sistema de Leitura de Tags</p>
            </div>
          </div>
          
          {/* Status Indicators */}
          <div className="flex items-center gap-4">
            {/* Status de Conexão */}
            <div className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full">
              <div className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
              }`} />
              <span className="text-sm font-semibold">
                {isConnected ? 'Conectado' : 'Desconectado'}
              </span>
              {isConnected ? (
                <Wifi className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
            </div>
            
            {/* Status de Leitura */}
            <div className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full">
              {isReading ? (
                <Play className="w-4 h-4 text-green-400" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
              <span className="text-sm font-semibold">
                {isReading ? 'Lendo' : 'Parado'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
