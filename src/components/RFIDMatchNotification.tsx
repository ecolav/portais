import React, { useState, useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { useRFIDMatches } from '../contexts/RFIDMatchesContext';

const RFIDMatchNotification: React.FC = () => {
  const { state, removeMatch } = useRFIDMatches();
  const { matches } = state;
  const [displayMatches, setDisplayMatches] = useState<any[]>([]);

  useEffect(() => {
    console.log('🔔 RFIDMatchNotification: matches atualizados:', matches.length);
    
    // Quando uma nova correspondência chega, adicionar à lista de exibição
    if (matches.length > 0) {
      const latestMatch = matches[0];
      console.log('🔔 RFIDMatchNotification: Nova correspondência detectada:', latestMatch);
      
      setDisplayMatches(prev => {
        // Verificar se já existe (evitar duplicatas)
        const exists = prev.some(m => m.timestamp === latestMatch.timestamp);
        if (!exists) {
          console.log('🔔 RFIDMatchNotification: Adicionando nova correspondência à exibição');
          const newDisplay = [latestMatch, ...prev.slice(0, 4)]; // Manter apenas as últimas 5
          
          // Tocar som de correspondência
          console.log('🔔 RFIDMatchNotification: Tocando som de correspondência...');
          playMatchSound();
          
          // Auto-remover após 10 segundos
          setTimeout(() => {
            setDisplayMatches(current => current.filter(m => m.timestamp !== latestMatch.timestamp));
          }, 10000);
          
          return newDisplay;
        } else {
          console.log('🔔 RFIDMatchNotification: Correspondência já existe na exibição');
        }
        return prev;
      });
    }
  }, [matches]);

  const playMatchSound = () => {
    try {
      // Usar som de erro do sistema - sempre toca, mesmo com som desativado
      const playErrorSound = () => {
        try {
          // Criar contexto de áudio temporário
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          // Som de erro (frequência mais baixa) - sempre toca
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
          oscillator.type = 'sawtooth';
          
          // Volume fixo para correspondência
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          
          // Som mais longo para correspondência
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.8);
          
          console.log('🔊 Som de correspondência (erro) reproduzido');
        } catch (audioError) {
          // Fallback: beep do sistema
          console.log('\u0007');
          console.log('🔊 Beep de correspondência (fallback)');
        }
      };
      
      // Tocar som de erro para correspondência
      playErrorSound();
      
    } catch (error) {
      console.warn('⚠️ Não foi possível tocar som de correspondência:', error);
    }
  };

  const removeDisplayMatch = (timestamp: string) => {
    setDisplayMatches(prev => prev.filter(m => m.timestamp !== timestamp));
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      {displayMatches.length > 0 && (
        displayMatches.map((match) => (
        <div
          key={match.timestamp}
          className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg animate-in slide-in-from-right-2 duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-sm font-semibold text-green-800">
                  🎯 Correspondência Encontrada!
                </h4>
                <button
                  onClick={() => removeDisplayMatch(match.timestamp)}
                  className="ml-auto text-green-400 hover:text-green-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-2 text-sm">
                {/* Informações da peça */}
                <div className="bg-white rounded p-2 border border-green-100">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(match.item).map(([key, value]) => {
                      // Pular campos internos
                      if (['id', 'row'].includes(key)) return null;
                      
                      return (
                        <div key={key} className="flex flex-col">
                          <span className="font-medium text-gray-600 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="text-gray-800 font-semibold">
                            {String(value) || '-'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Informações da leitura */}
                <div className="bg-blue-50 rounded p-2 border border-blue-100">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="font-medium text-blue-600">TID:</span>
                      <div className="text-blue-800 font-mono text-xs truncate">
                        {match.reading.tid}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-blue-600">Antena:</span>
                      <div className="text-blue-800 font-semibold">
                        {match.reading.antenna}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-blue-600">RSSI:</span>
                      <div className="text-blue-800 font-semibold">
                        {match.reading.rssi}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Timestamp */}
                <div className="text-xs text-gray-500 text-center">
                  {new Date(match.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        </div>
        ))
      )}
    </div>
  );
};

export default RFIDMatchNotification;
