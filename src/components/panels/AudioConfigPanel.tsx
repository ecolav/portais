import React from 'react';
import { Volume2, VolumeX, Play, Settings } from 'lucide-react';

interface AudioConfigPanelProps {
  soundEnabled: boolean;
  onSoundToggle: (enabled: boolean) => void;
}

export default function AudioConfigPanel({ soundEnabled, onSoundToggle }: AudioConfigPanelProps) {
  const [localVolume, setLocalVolume] = React.useState(80);
  const [audioContext, setAudioContext] = React.useState<AudioContext | null>(null);

  // Inicializar contexto de áudio
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.AudioContext) {
      const context = new AudioContext();
      setAudioContext(context);
    }
  }, []);

  const handleAudioToggle = (enabled: boolean) => {
    onSoundToggle(enabled);
  };

  const handleVolumeChange = (volume: number) => {
    setLocalVolume(volume);
  };

  // Função para reproduzir som de tag lida
  const playTagReadSound = () => {
    if (!soundEnabled || !audioContext) return;

    try {
      // Criar oscilador para gerar som
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Conectar nós
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configurar som (beep de alta frequência)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = 'sine';
      
      // Configurar volume baseado no controle local
      const volume = localVolume / 100;
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      
      // Configurar envelope de som
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
      
      // Reproduzir som
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      console.log('🔊 Som de tag lida reproduzido');
    } catch (error) {
      console.error('❌ Erro ao reproduzir som:', error);
    }
  };

  // Função para reproduzir som de erro
  const playErrorSound = () => {
    if (!soundEnabled || !audioContext) return;

    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Som de erro (frequência mais baixa)
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.type = 'sawtooth';
      
      const volume = localVolume / 100;
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      
      // Som mais longo para erro
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      console.log('🔊 Som de erro reproduzido');
    } catch (error) {
      console.error('❌ Erro ao reproduzir som de erro:', error);
    }
  };

  // Função para reproduzir som de sucesso
  const playSuccessSound = () => {
    if (!soundEnabled || !audioContext) return;

    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Som de sucesso (frequência média)
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.type = 'sine';
      
      const volume = localVolume / 100;
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      
      // Som curto e agudo
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
      
      console.log('🔊 Som de sucesso reproduzido');
    } catch (error) {
      console.error('❌ Erro ao reproduzir som de sucesso:', error);
    }
  };

  const handleTestAudio = () => {
    if (!soundEnabled) {
      alert('Ative o áudio primeiro para testar');
      return;
    }

    // Testar diferentes tipos de som
    playTagReadSound();
    
    // Testar som de sucesso após um delay
    setTimeout(() => {
      playSuccessSound();
    }, 400);
    
    // Testar som de erro após outro delay
    setTimeout(() => {
      playErrorSound();
    }, 800);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">Configurações de Áudio</h2>
      </div>
      
      <div className="space-y-6">
        {/* Toggle de áudio */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Áudio Ativado</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => handleAudioToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        
        {/* Controle de volume */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Volume
          </label>
          <div className="flex items-center gap-3">
            <VolumeX className="w-4 h-4 text-gray-400" />
            <input
              type="range"
              min="0"
              max="100"
              value={localVolume}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              disabled={!soundEnabled}
            />
            <Volume2 className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span className="font-medium">{Math.round(localVolume)}%</span>
            <span>100%</span>
          </div>
        </div>
        
        {/* Botões de ação */}
        <div className="flex gap-3">
          <button
            onClick={handleTestAudio}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            disabled={!soundEnabled}
          >
            <Play className="w-4 h-4" />
            Testar Áudio
          </button>
        </div>

        {/* Informações do sistema */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-800">Sistema de Áudio Funcional</span>
          </div>
          <p className="text-sm text-blue-700">
            🔊 <strong>Áudio RESTAURADO!</strong> O sistema agora reproduz sons reais:
            <br />• <strong>Tag lida:</strong> Beep agudo (800Hz)
            <br />• <strong>Sucesso:</strong> Som médio (600Hz) 
            <br />• <strong>Erro:</strong> Som grave (400Hz)
          </p>
          <div className="mt-3 text-xs text-blue-600">
            <strong>Status:</strong> {audioContext ? '✅ Áudio funcionando' : '❌ Áudio não suportado'}
          </div>
        </div>
      </div>
    </div>
  );
}
