import { Tag, Trash2, Eye, Clock, Signal } from 'lucide-react';

interface RFIDReading {
  id: number;
  epc: string;
  tid?: string;
  rssi: number;
  antenna: number;
  timestamp: string;
  rawData: string;
}

interface RFIDReadingsPanelProps {
  readings: RFIDReading[];
  onClearReadings: () => void;
}

export default function RFIDReadingsPanel({ readings, onClearReadings }: RFIDReadingsPanelProps) {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR');
  };

  const getRSSIColor = (rssi: number) => {
    if (rssi >= -50) return 'text-green-600';
    if (rssi >= -70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRSSIIcon = (rssi: number) => {
    if (rssi >= -50) return '🟢';
    if (rssi >= -70) return '🟡';
    return '🔴';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Tag className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">Leituras Recentes</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            {readings.length} leitura{readings.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={onClearReadings}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Limpar
          </button>
        </div>
      </div>

      {/* Lista de leituras */}
      {readings.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {readings.slice(0, 20).map((reading) => (
            <div
              key={reading.id}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-sm font-medium text-gray-800">
                      {reading.tid || reading.epc}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getRSSIColor(reading.rssi)} bg-gray-100`}>
                      {getRSSIIcon(reading.rssi)} {reading.rssi} dBm
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Signal className="w-3 h-3" />
                      Antena {reading.antenna}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(reading.timestamp)}
                    </div>
                  </div>
                </div>
                
                <button className="text-gray-400 hover:text-blue-600 transition-colors">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          
          {readings.length > 20 && (
            <div className="text-center py-3 text-sm text-gray-500">
              Mostrando as 20 leituras mais recentes de {readings.length} total
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium">Nenhuma leitura ainda</p>
          <p className="text-sm">Inicie a leitura para ver as tags detectadas</p>
        </div>
      )}
    </div>
  );
}
