import React from 'react';
import { Bell, Volume2, Camera, Zap } from 'lucide-react';

export default function NotificationMethodPanel() {
  const [notificationType, setNotificationType] = React.useState<'none' | 'sound' | 'camera' | 'both'>('sound');
  const [priority, setPriority] = React.useState<'sound' | 'camera'>('sound');

  const handleMethodChange = (type: 'sound' | 'camera' | 'both') => {
    setNotificationType(type);
    if (type === 'both') {
      setPriority('sound');
    }
  };

  const handlePriorityChange = (newPriority: 'sound' | 'camera') => {
    setPriority(newPriority);
  };

  const getMethodDescription = () => {
    switch (notificationType) {
      case 'none':
        return 'Nenhuma notificação será executada quando uma tag for lida';
      case 'sound':
        return 'Apenas som será reproduzido quando uma tag for lida';
      case 'camera':
        return 'Apenas uma foto será capturada quando uma tag for lida';
      case 'both':
        return 'Som e foto serão executados simultaneamente';
      default:
        return '';
    }
  };

  const getPriorityDescription = () => {
    if (notificationType !== 'both') return '';
    
    return priority === 'sound' 
      ? 'Som será executado primeiro, seguido pela captura da foto'
      : 'Foto será capturada primeiro, seguida pelo som';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">Método de Notificação</h2>
      </div>

      <div className="space-y-6">
        {/* Toggle de notificação */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Sistema de Notificação Ativado</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={notificationType !== 'none'}
              onChange={(e) => {
                if (e.target.checked) {
                  setNotificationType('sound');
                  setPriority('sound');
                } else {
                  setNotificationType('none');
                }
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Seleção do Método Principal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Como deseja ser notificado quando uma tag for lida?
          </label>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Opção Som */}
            <button
              onClick={() => handleMethodChange('sound')}
              disabled={notificationType === 'none'}
              className={`p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                notificationType === 'sound'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : notificationType === 'none'
                  ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Volume2 className={`w-8 h-8 ${
                notificationType === 'sound' ? 'text-blue-600' : 'text-gray-500'
              }`} />
              <span className="font-medium">Som</span>
              <span className="text-xs text-center text-gray-600">
                Reproduz som ao ler tag
              </span>
            </button>

            {/* Opção Câmera */}
            <button
              onClick={() => handleMethodChange('camera')}
              disabled={notificationType === 'none'}
              className={`p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                notificationType === 'camera'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : notificationType === 'none'
                  ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Camera className={`w-8 h-8 ${
                notificationType === 'camera' ? 'text-blue-600' : 'text-gray-500'
              }`} />
              <span className="font-medium">Câmera</span>
              <span className="text-xs text-center text-gray-600">
                Captura foto ao ler tag
              </span>
            </button>

            {/* Opção Ambos */}
            <button
              onClick={() => handleMethodChange('both')}
              disabled={notificationType === 'none'}
              className={`p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                notificationType === 'both'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : notificationType === 'none'
                  ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Zap className={`w-8 h-8 ${
                notificationType === 'both' ? 'text-blue-600' : 'text-gray-500'
              }`} />
              <span className="font-medium">Ambos</span>
              <span className="text-xs text-center text-gray-600">
                Som + foto simultaneamente
              </span>
            </button>
          </div>
        </div>

        {/* Configuração de Prioridade (apenas quando ambos estão ativos) */}
        {notificationType === 'both' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Qual ação deve ser executada primeiro?
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => handlePriorityChange('sound')}
                className={`p-3 rounded-lg border-2 transition-all duration-200 flex items-center gap-3 ${
                  priority === 'sound'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Volume2 className="w-5 h-5" />
                <span className="font-medium">Som Primeiro</span>
              </button>

              <button
                onClick={() => handlePriorityChange('camera')}
                className={`p-3 rounded-lg border-2 transition-all duration-200 flex items-center gap-3 ${
                  priority === 'camera'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Camera className="w-5 h-5" />
                <span className="font-medium">Foto Primeiro</span>
              </button>
            </div>
          </div>
        )}

        {/* Descrição do método selecionado */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-800">Como Funciona</span>
          </div>
          <p className="text-sm text-blue-700 mb-2">{getMethodDescription()}</p>
          {getPriorityDescription() && (
            <p className="text-sm text-blue-700">{getPriorityDescription()}</p>
          )}
        </div>

        {/* Configurações avançadas */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800">Configurações Avançadas</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Delay de notificação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delay de Notificação (ms)
              </label>
              <input
                type="number"
                min="0"
                max="5000"
                step="100"
                defaultValue="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Tempo de espera antes de executar a notificação
              </p>
            </div>

            {/* Repetição de notificação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repetir Notificação
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="never">Nunca</option>
                <option value="once">Uma vez</option>
                <option value="twice">Duas vezes</option>
                <option value="continuous">Continuamente</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Quantas vezes repetir a notificação
              </p>
            </div>
          </div>
        </div>

        {/* Status atual */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Status Atual:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              notificationType === 'none' 
                ? 'bg-red-100 text-red-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {notificationType === 'none' ? 'Desativado' : 'Ativado'}
            </span>
          </div>
          
          <div className="text-sm text-gray-600 space-y-1">
            <div>Método: <span className="font-medium">{notificationType === 'none' ? 'Nenhum' : notificationType === 'both' ? 'Som + Câmera' : notificationType === 'sound' ? 'Som' : 'Câmera'}</span></div>
            {notificationType === 'both' && (
              <div>Prioridade: <span className="font-medium">{priority === 'sound' ? 'Som primeiro' : 'Foto primeiro'}</span></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
