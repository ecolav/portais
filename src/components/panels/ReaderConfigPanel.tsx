import React, { useState, useEffect } from 'react';
import { Settings, Wifi, Zap, Antenna, Save, RefreshCw } from 'lucide-react';
import { API_CONFIG, apiRequest } from '../../config/api';

interface ReaderConfigPanelProps {
  config: {
    ip: string;
    port: number;
    power: number;
    antennas: number[];
    soundEnabled: boolean;
  };
  onConfigChange: (config: any) => void;
}

export default function ReaderConfigPanel({ config, onConfigChange }: ReaderConfigPanelProps) {
  const [isApplying, setIsApplying] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Carregar configuração atual do servidor
  useEffect(() => {
    loadServerConfig();
  }, []);

  const loadServerConfig = async () => {
    try {
      const response = await apiRequest(API_CONFIG.ENDPOINTS.CONFIG);
      if (response.ok) {
        const serverConfig = await response.json();
        onConfigChange(serverConfig);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração do servidor:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    onConfigChange({ [field]: value });
  };

  // Função para aplicar apenas a potência em tempo real
  const applyPowerOnly = async (power: number) => {
    setIsApplying(true);
    setMessage(null);

    try {
      const response = await apiRequest(API_CONFIG.ENDPOINTS.POWER, {
        method: 'POST',
        body: JSON.stringify({ power }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: `Potência ajustada para ${power} dBm!` });
        // Atualizar configuração local
        onConfigChange({ power });
      } else {
        setMessage({ type: 'error', text: result.message || 'Erro ao ajustar potência' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão com o servidor' });
    } finally {
      setIsApplying(false);
    }
  };

  const handleAntennaToggle = (antenna: number) => {
    const newAntennas = config.antennas.includes(antenna)
      ? config.antennas.filter(a => a !== antenna)
      : [...config.antennas, antenna].sort();
    
    onConfigChange({ antennas: newAntennas });
  };

  const applyConfiguration = async () => {
    setIsApplying(true);
    setMessage(null);

    try {
      const response = await apiRequest(API_CONFIG.ENDPOINTS.CONFIG, {
        method: 'POST',
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Configuração aplicada com sucesso!' });
        // Recarregar configuração do servidor
        await loadServerConfig();
      } else {
        setMessage({ type: 'error', text: result.message || 'Erro ao aplicar configuração' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão com o servidor' });
    } finally {
      setIsApplying(false);
    }
  };

  const resetToDefaults = () => {
    const defaultConfig = {
      ip: '192.168.99.201',
      port: 8888,
      power: 20,
      antennas: [1, 2, 3, 4],
      soundEnabled: true
    };
    onConfigChange(defaultConfig);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">Configuração do Leitor RFID</h2>
      </div>

      {/* Mensagens de status */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Configuração de IP e Porta */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-gray-500" />
            <h3 className="font-medium text-gray-700">Conexão</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                IP do Leitor
              </label>
              <input
                type="text"
                value={config.ip}
                onChange={(e) => handleInputChange('ip', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="192.168.99.201"
              />
              <p className="text-xs text-gray-500 mt-1">
                IP da antena RFID (ex: 192.168.99.201)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Porta
              </label>
              <input
                type="number"
                value={config.port}
                onChange={(e) => handleInputChange('port', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="8888"
                min="1"
                max="65535"
              />
              <p className="text-xs text-gray-500 mt-1">
                Porta TCP (padrão: 8888)
              </p>
            </div>
          </div>
        </div>

        {/* Configuração de Potência */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-gray-500" />
            <h3 className="font-medium text-gray-700">Potência de Transmissão</h3>
          </div>
          
          <div className="space-y-4">
            {/* Controles de Potência */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  const newPower = Math.max(0, config.power - 1);
                  handleInputChange('power', newPower);
                  applyPowerOnly(newPower);
                }}
                disabled={config.power <= 0 || isApplying}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <span className="text-lg font-bold">-</span>
                Diminuir
              </button>
              
              <div className="flex-1 text-center">
                <div className="text-2xl font-bold text-blue-600">{config.power}</div>
                <div className="text-sm text-gray-600">dBm</div>
              </div>
              
              <button
                onClick={() => {
                  const newPower = Math.min(30, config.power + 1);
                  handleInputChange('power', newPower);
                  applyPowerOnly(newPower);
                }}
                disabled={config.power >= 30 || isApplying}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <span className="text-lg font-bold">+</span>
                Aumentar
              </button>
            </div>
            
            {/* Slider de Potência */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>0 dBm (Baixa)</span>
                <span>30 dBm (Alta)</span>
              </div>
                          <input
              type="range"
              min="0"
              max="30"
              value={config.power}
              onChange={(e) => {
                const newPower = parseInt(e.target.value);
                handleInputChange('power', newPower);
                // Aplicar potência automaticamente após um pequeno delay
                setTimeout(() => applyPowerOnly(newPower), 500);
              }}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
              <p className="text-xs text-gray-500 text-center">
                Potência de transmissão da antena RFID
              </p>
            </div>
            
            {/* Indicador de Potência */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    config.power <= 10 ? 'bg-green-500' :
                    config.power <= 20 ? 'bg-yellow-500' :
                    config.power <= 25 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${(config.power / 30) * 100}%` }}
                ></div>
              </div>
              <span className={`text-sm font-medium ${
                config.power <= 10 ? 'text-green-600' :
                config.power <= 20 ? 'text-yellow-600' :
                config.power <= 25 ? 'text-orange-600' : 'text-red-600'
              }`}>
                {config.power <= 10 ? 'Baixa' :
                 config.power <= 20 ? 'Média' :
                 config.power <= 25 ? 'Alta' : 'Muito Alta'}
              </span>
            </div>
            
            {/* Botão para Aplicar Apenas Potência */}
            <div className="flex justify-center">
              <button
                onClick={() => applyPowerOnly(config.power)}
                disabled={isApplying}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Zap className="w-4 h-4" />
                {isApplying ? 'Aplicando...' : 'Aplicar Potência'}
              </button>
            </div>
          </div>
        </div>

        {/* Configuração de Antenas */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Antenna className="w-5 h-5 text-gray-500" />
            <h3 className="font-medium text-gray-700">Antenas Ativas</h3>
          </div>
          
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((antenna) => (
              <button
                key={antenna}
                onClick={() => handleAntennaToggle(antenna)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  config.antennas.includes(antenna)
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-lg font-semibold">{antenna}</div>
                  <div className="text-xs">Antena</div>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 text-center">
            Selecione quais antenas devem estar ativas
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={applyConfiguration}
            disabled={isApplying}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isApplying ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isApplying ? 'Aplicando...' : 'Aplicar Configuração'}
          </button>
          
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Restaurar Padrões
          </button>
        </div>

        {/* Informações do Sistema */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-800">Sistema Atualizado</span>
          </div>
          <p className="text-sm text-blue-700">
            Configure o IP da antena RFID no campo acima e clique em "Aplicar Configuração". 
            O sistema se conectará automaticamente à antena especificada.
          </p>
          <div className="mt-3 text-xs text-blue-600">
            <strong>IP Atual:</strong> {config.ip}:{config.port}
          </div>
        </div>
      </div>
    </div>
  );
}
