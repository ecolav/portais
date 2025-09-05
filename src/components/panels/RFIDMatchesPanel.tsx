import React from 'react';
import { CheckCircle, Clock, Antenna, Signal, X } from 'lucide-react';
import { useRFIDMatches } from '../../contexts/RFIDMatchesContext';

const RFIDMatchesPanel: React.FC = () => {
  const { state, clearMatches, removeMatch } = useRFIDMatches();
  const { matches, totalMatches } = state;

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-7 h-7 text-green-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Correspondências RFID
            </h2>
            <p className="text-sm text-gray-600">
              Histórico de correspondências entre TIDs lidos e dados da planilha
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{totalMatches}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          
          {matches.length > 0 && (
            <button
              onClick={clearMatches}
              className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
            >
              Limpar Lista
            </button>
          )}
        </div>
      </div>

      {matches.length > 0 && (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {matches.map((match, index) => (
            <div
              key={match.timestamp}
              className="border border-green-200 rounded-lg p-4 bg-green-50 hover:bg-green-100 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Cabeçalho da correspondência */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-800">
                      Correspondência #{matches.length - index}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(match.timestamp)}
                    </span>
                  </div>

                  {/* Informações da peça */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-3">
                    <div className="bg-white rounded p-4 border border-green-100">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">📦 Item Encontrado</h4>
                      <div className="space-y-2">
                        {Object.entries(match.item).map(([key, value]) => {
                          if (['id', 'row'].includes(key)) return null;
                          
                          return (
                            <div key={key} className="flex justify-between text-sm">
                              <span className="text-gray-600 capitalize font-medium">
                                {key.replace(/([A-Z])/g, ' $1').trim()}:
                              </span>
                              <span className="font-semibold text-gray-800 text-right max-w-xs break-words">
                                {String(value) || '-'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Informações da leitura */}
                    <div className="bg-blue-50 rounded p-4 border border-blue-100">
                      <h4 className="text-sm font-semibold text-blue-700 mb-3">📡 Dados da Leitura</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Signal className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span className="text-blue-600 font-medium">TID:</span>
                          <span className="font-mono text-xs text-blue-800 bg-blue-100 px-2 py-1 rounded break-all">
                            {match.reading.tid}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Antenna className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span className="text-blue-600 font-medium">Antena:</span>
                          <span className="font-semibold text-blue-800">
                            {match.reading.antenna}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Signal className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span className="text-blue-600 font-medium">RSSI:</span>
                          <span className="font-semibold text-blue-800">
                            {match.reading.rssi} dBm
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Informações adicionais */}
                    <div className="bg-gray-50 rounded p-4 border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">⏰ Detalhes</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          <span className="text-gray-600">Horário:</span>
                        </div>
                        <div className="text-gray-800 font-medium ml-6">
                          {formatTimestamp(match.timestamp)}
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-green-700 font-medium">Correspondência Confirmada</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botão de remover */}
                <button
                  onClick={() => removeMatch(match.timestamp)}
                  className="ml-4 p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Remover correspondência"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RFIDMatchesPanel;
