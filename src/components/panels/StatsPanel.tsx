//
import { Hash, Tag } from 'lucide-react';

interface StatsPanelProps {
  totalReadings: number;
  uniqueTags: number;
  isConnected: boolean;
  isReading: boolean;
  readings: any[];
}

export default function StatsPanel({ totalReadings, uniqueTags, isConnected, isReading }: StatsPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      {/* Título Principal */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Sistema RFID</h2>
        <p className="text-gray-600">Monitoramento de Tags em Tempo Real</p>
      </div>

      {/* Status da Conexão */}
      <div className="text-center mb-8">
        <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full text-lg font-medium ${
          isConnected 
            ? (isReading ? 'bg-green-100 text-green-800 border-2 border-green-300' : 'bg-blue-100 text-blue-800 border-2 border-blue-300')
            : 'bg-red-100 text-red-800 border-2 border-red-300'
        }`}>
          <div className={`w-4 h-4 rounded-full ${
            isConnected 
              ? (isReading ? 'bg-green-500' : 'bg-blue-500')
              : 'bg-red-500'
          }`}></div>
          {isConnected 
            ? (isReading ? '🟢 LENDO TAGS' : '🔵 CONECTADO')
            : '🔴 DESCONECTADO'
          }
        </div>
      </div>

      {/* Informação Principal - TIDs Únicos */}
      <div className="text-center mb-8">
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-2xl p-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Hash className="w-16 h-16 text-green-600" />
            <div>
              <div className="text-6xl font-bold text-green-600 mb-2">
                {uniqueTags}
              </div>
              <div className="text-2xl font-medium text-gray-700">
                TIDs Únicos Detectados
              </div>
            </div>
          </div>
          <p className="text-gray-600 text-lg">
            Cada TID representa uma peça física diferente
          </p>
        </div>
      </div>

      {/* Estatísticas Secundárias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <Tag className="w-12 h-12 text-blue-600 mx-auto mb-3" />
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {totalReadings.toLocaleString('pt-BR')}
          </div>
          <div className="text-lg font-medium text-blue-800 mb-1">
            Total de Leituras
          </div>
          <div className="text-sm text-blue-600">
            Todas as detecções RFID
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-center">
          <Hash className="w-12 h-12 text-purple-600 mx-auto mb-3" />
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {uniqueTags > 0 ? (totalReadings / uniqueTags).toFixed(1) : '0'}
          </div>
          <div className="text-lg font-medium text-purple-800 mb-1">
            Média por TID
          </div>
          <div className="text-sm text-purple-600">
            Leituras por peça
          </div>
        </div>
      </div>

      {/* Mensagem quando não há dados */}
      {totalReadings === 0 && (
        <div className="text-center py-8 mt-6">
          <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-xl font-medium text-gray-500 mb-2">
            Nenhum TID detectado ainda
          </p>
          <p className="text-gray-400">
            Conecte o leitor e inicie a leitura
          </p>
        </div>
      )}
    </div>
  );
}
