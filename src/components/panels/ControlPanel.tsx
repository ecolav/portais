import React from 'react';
import { Play, Square, Power, RefreshCw, Trash2, Zap } from 'lucide-react';

interface ConnectionStatus {
  isConnected: boolean;
  isReading: boolean;
  totalReadings: number;
}

interface ControlPanelProps {
  status: ConnectionStatus;
  onConnect: () => void;
  onDisconnect: () => void;
  onStartReading: () => void;
  onStopReading: () => void;
  onReadSingle: () => void;
  onClearReadings: () => void;
}

export default function ControlPanel({
  status,
  onConnect,
  onDisconnect,
  onStartReading,
  onStopReading,
  onReadSingle,
  onClearReadings
}: ControlPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-6">
        <Zap className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Controles do Sistema</h2>
      </div>

      {/* Status da Conexão */}
      <div className="mb-6 p-4 rounded-lg border-2 border-dashed border-gray-200">
        <div className="text-center">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
            status.isConnected 
              ? (status.isReading ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800')
              : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              status.isConnected 
                ? (status.isReading ? 'bg-green-500' : 'bg-blue-500')
                : 'bg-red-500'
            }`}></div>
            {status.isConnected 
              ? (status.isReading ? '🟢 Lendo Tags' : '🔵 Conectado')
              : '🔴 Desconectado'
            }
          </div>
        </div>
      </div>

      {/* Controles de Conexão */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={onConnect}
          disabled={status.isConnected}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
            status.isConnected
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg'
          }`}
        >
          <Power className="w-5 h-5" />
          Conectar
        </button>

        <button
          onClick={onDisconnect}
          disabled={!status.isConnected}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
            !status.isConnected
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg'
          }`}
        >
          <Power className="w-5 h-5" />
          Desconectar
        </button>
      </div>

      {/* Controles de Leitura */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={onStartReading}
          disabled={!status.isConnected || status.isReading}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
            !status.isConnected || status.isReading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
          }`}
        >
          <Play className="w-5 h-5" />
          Iniciar Leitura
        </button>

        <button
          onClick={onStopReading}
          disabled={!status.isReading}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
            !status.isReading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-yellow-600 text-white hover:bg-yellow-700 hover:shadow-lg'
          }`}
        >
          <Square className="w-5 h-5" />
          Parar Leitura
        </button>

        <button
          onClick={onReadSingle}
          disabled={!status.isConnected}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
            !status.isConnected
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg'
          }`}
        >
          <RefreshCw className="w-5 h-5" />
          Leitura Única
        </button>
      </div>

      {/* Controles de Dados */}
      <div className="flex justify-center">
        <button
          onClick={onClearReadings}
          disabled={status.totalReadings === 0}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
            status.totalReadings === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-orange-600 text-white hover:bg-orange-700 hover:shadow-lg'
          }`}
        >
          <Trash2 className="w-5 h-5" />
          Limpar Histórico
        </button>
      </div>

      {/* Informações Rápidas */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg text-center">
        <p className="text-sm text-gray-600">
          Sistema RFID configurado para leitura contínua com protocolo Chainway
        </p>
      </div>
    </div>
  );
}
