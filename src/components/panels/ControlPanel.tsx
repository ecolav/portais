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
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Controles</h2>

      <div className="mb-4 p-3 bg-gray-50 rounded text-center">
        <span className={`inline-flex items-center gap-2 text-sm font-medium ${
          status.isConnected 
            ? (status.isReading ? 'text-green-700' : 'text-blue-700')
            : 'text-red-700'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            status.isConnected 
              ? (status.isReading ? 'bg-green-500' : 'bg-blue-500')
              : 'bg-red-500'
          }`}></div>
          {status.isConnected 
            ? (status.isReading ? 'Lendo Tags' : 'Conectado')
            : 'Desconectado'
          }
        </span>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onConnect}
            disabled={status.isConnected}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded font-medium ${
              status.isConnected
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <Power className="w-4 h-4" />
            Conectar
          </button>

          <button
            onClick={onDisconnect}
            disabled={!status.isConnected}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded font-medium ${
              !status.isConnected
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            <Power className="w-4 h-4" />
            Desconectar
          </button>
        </div>

        <button
          onClick={onStartReading}
          disabled={!status.isConnected || status.isReading}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded font-medium ${
            !status.isConnected || status.isReading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <Play className="w-4 h-4" />
          Iniciar Leitura
        </button>

        <button
          onClick={onStopReading}
          disabled={!status.isReading}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded font-medium ${
            !status.isReading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-yellow-600 text-white hover:bg-yellow-700'
          }`}
        >
          <Square className="w-4 h-4" />
          Parar Leitura
        </button>

        <button
          onClick={onClearReadings}
          disabled={status.totalReadings === 0}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded font-medium ${
            status.totalReadings === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-orange-600 text-white hover:bg-orange-700'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          Limpar
        </button>
      </div>
    </div>
  );
}
