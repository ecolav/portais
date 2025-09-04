import React, { useState, useEffect } from 'react';
import { CheckCircle, X, Volume2 } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';

interface RFIDMatch {
  reading: {
    tid: string;
    antenna: number;
    rssi: number;
    timestamp: string;
  };
  item: {
    [key: string]: any;
  };
  timestamp: string;
}

const RFIDMatchNotification: React.FC = () => {
  const socket = useSocket();
  const [matches, setMatches] = useState<RFIDMatch[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (socket) {
      socket.on('rfid-match-found', (match: RFIDMatch) => {
        console.log('🎯 Correspondência RFID encontrada:', match);
        
        // Adicionar à lista de correspondências
        setMatches(prev => [match, ...prev.slice(0, 4)]); // Manter apenas as últimas 5
        
        // Tocar som grave
        playMatchSound();
        
        // Auto-remover após 10 segundos
        setTimeout(() => {
          setMatches(prev => prev.filter(m => m.timestamp !== match.timestamp));
        }, 10000);
      });
    }

    return () => {
      if (socket) {
        socket.off('rfid-match-found');
      }
    };
  }, [socket]);

  const playMatchSound = () => {
    if (isPlaying) return;
    
    setIsPlaying(true);
    
    try {
      // Criar contexto de áudio
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Criar oscilador para som grave
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Configurar som grave (frequência baixa)
      oscillator.frequency.setValueAtTime(150, audioContext.currentTime); // 150Hz - som grave
      oscillator.frequency.setValueAtTime(100, audioContext.currentTime + 0.1); // 100Hz - mais grave
      oscillator.frequency.setValueAtTime(150, audioContext.currentTime + 0.2); // Volta para 150Hz
      
      // Configurar volume e envelope
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      // Conectar e tocar
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      // Reset após tocar
      setTimeout(() => setIsPlaying(false), 600);
      
    } catch (error) {
      console.warn('⚠️ Não foi possível tocar som:', error);
      setIsPlaying(false);
    }
  };

  const removeMatch = (timestamp: string) => {
    setMatches(prev => prev.filter(m => m.timestamp !== timestamp));
  };

  if (matches.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      {matches.map((match) => (
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
                  onClick={() => removeMatch(match.timestamp)}
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
      ))}
    </div>
  );
};

export default RFIDMatchNotification;
