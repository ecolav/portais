import { Wifi, WifiOff, Play, Pause, Tag } from 'lucide-react';

interface HeaderProps {
  isConnected?: boolean;
  isReading?: boolean;
}

export default function Header({ isConnected = false, isReading = false }: HeaderProps) {
  return (
    <header className="gradient-ecolav text-white shadow-xl">
      <div className="container mx-auto px-6 py-5">
        <div className="flex items-center justify-between">
          {/* Logo e Título */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/25 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
              <Tag className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-shadow-lg">Portal RFID Ecolav</h1>
              <p className="text-white/90 text-sm">Sistema Inteligente de Leitura de Tags</p>
            </div>
          </div>
          
          {/* Status Indicators */}
          <div className="flex items-center gap-4">
            {/* Status de Conexão */}
            <div className="flex items-center gap-2 px-5 py-2.5 glass-effect rounded-full shadow-md">
              <div className={`w-3 h-3 rounded-full shadow-lg ${
                isConnected ? 'bg-success-400 animate-pulse shadow-success-400/50' : 'bg-error-400 shadow-error-400/50'
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
            <div className="flex items-center gap-2 px-5 py-2.5 glass-effect rounded-full shadow-md">
              {isReading ? (
                <Play className="w-4 h-4 text-success-300" />
              ) : (
                <Pause className="w-4 h-4 text-white/80" />
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
