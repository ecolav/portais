import { Zap, AlertTriangle, Info, CheckCircle, Radio } from 'lucide-react';

interface PowerDiagnosticsPanelProps {
  currentPower: number;
  onPowerChange: (power: number) => void;
}

export default function PowerDiagnosticsPanel({ currentPower, onPowerChange }: PowerDiagnosticsPanelProps) {
  const powerPresets = [
    {
      name: 'Muito Baixa',
      power: 10,
      range: '~1-2m',
      icon: '🟢',
      color: 'green',
      use: 'Teste em bancada, tags muito próximas',
      warning: 'Alcance muito limitado'
    },
    {
      name: 'Baixa',
      power: 15,
      range: '~2-4m',
      icon: '🟡',
      color: 'yellow',
      use: 'Leitura de tags próximas, evitar interferências',
      warning: 'Pode não detectar tags distantes'
    },
    {
      name: 'Média (Recomendada)',
      power: 20,
      range: '~4-6m',
      icon: '🟠',
      color: 'blue',
      use: 'Uso geral, boa relação alcance/estabilidade',
      warning: null
    },
    {
      name: 'Alta',
      power: 25,
      range: '~6-8m',
      icon: '🔴',
      color: 'orange',
      use: 'Tags distantes, ambientes grandes',
      warning: 'Pode causar leituras duplicadas'
    },
    {
      name: 'Máxima',
      power: 30,
      range: '~8-10m',
      icon: '⚠️',
      color: 'red',
      use: 'Apenas quando absolutamente necessário',
      warning: 'ATENÇÃO: Pode causar interferências, leituras duplicadas e instabilidade'
    }
  ];

  const getDiagnosis = () => {
    if (currentPower < 10) {
      return {
        type: 'warning',
        icon: AlertTriangle,
        color: 'yellow',
        title: 'Potência muito baixa',
        message: 'Alcance extremamente limitado. Aumente para pelo menos 10 dBm.',
        suggestions: ['Difícil detectar tags', 'Apenas para testes de bancada']
      };
    }
    if (currentPower > 25) {
      return {
        type: 'danger',
        icon: AlertTriangle,
        color: 'red',
        title: 'Potência muito alta - ATENÇÃO!',
        message: 'Risco de interferências e leituras duplicadas.',
        suggestions: [
          'Pode causar leituras múltiplas da mesma tag',
          'Pode interferir com outros equipamentos',
          'Aumente a distância das antenas',
          'Reduza para 20-22 dBm para melhor estabilidade'
        ]
      };
    }
    if (currentPower >= 20 && currentPower <= 25) {
      return {
        type: 'success',
        icon: CheckCircle,
        color: 'green',
        title: 'Potência adequada',
        message: 'Configuração ideal para a maioria dos casos.',
        suggestions: ['Bom alcance', 'Estabilidade adequada', 'Poucas interferências']
      };
    }
    return {
      type: 'info',
      icon: Info,
      color: 'blue',
      title: 'Potência moderada',
      message: 'Adequada para tags próximas.',
      suggestions: ['Alcance limitado', 'Boa para evitar interferências']
    };
  };

  const diagnosis = getDiagnosis();
  const Icon = diagnosis.icon;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-orange-500" />
        <h3 className="text-lg font-semibold text-gray-900">Diagnóstico de Potência RFID</h3>
      </div>

      {/* Status Atual */}
      <div className={`mb-6 p-4 rounded-lg border-2 ${
        diagnosis.type === 'danger' ? 'bg-red-50 border-red-200' :
        diagnosis.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
        diagnosis.type === 'success' ? 'bg-green-50 border-green-200' :
        'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-start gap-3">
          <Icon className={`w-6 h-6 flex-shrink-0 ${
            diagnosis.type === 'danger' ? 'text-red-600' :
            diagnosis.type === 'warning' ? 'text-yellow-600' :
            diagnosis.type === 'success' ? 'text-green-600' :
            'text-blue-600'
          }`} />
          <div className="flex-1">
            <h4 className={`font-semibold mb-1 ${
              diagnosis.type === 'danger' ? 'text-red-800' :
              diagnosis.type === 'warning' ? 'text-yellow-800' :
              diagnosis.type === 'success' ? 'text-green-800' :
              'text-blue-800'
            }`}>
              {diagnosis.title}
            </h4>
            <p className={`text-sm mb-2 ${
              diagnosis.type === 'danger' ? 'text-red-700' :
              diagnosis.type === 'warning' ? 'text-yellow-700' :
              diagnosis.type === 'success' ? 'text-green-700' :
              'text-blue-700'
            }`}>
              {diagnosis.message}
            </p>
            <ul className={`text-xs space-y-1 ${
              diagnosis.type === 'danger' ? 'text-red-600' :
              diagnosis.type === 'warning' ? 'text-yellow-600' :
              diagnosis.type === 'success' ? 'text-green-600' :
              'text-blue-600'
            }`}>
              {diagnosis.suggestions.map((suggestion, idx) => (
                <li key={idx}>• {suggestion}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Presets de Potência */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Radio className="w-4 h-4" />
          Configurações Recomendadas
        </h4>
        
        {powerPresets.map((preset) => (
          <button
            key={preset.power}
            onClick={() => onPowerChange(preset.power)}
            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
              currentPower === preset.power
                ? `border-${preset.color}-500 bg-${preset.color}-50`
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{preset.icon}</span>
                  <span className="font-semibold text-gray-900">{preset.name}</span>
                  <span className="text-sm font-mono text-gray-600">{preset.power} dBm</span>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>📏 <strong>Alcance:</strong> {preset.range}</p>
                  <p>✅ <strong>Uso:</strong> {preset.use}</p>
                  {preset.warning && (
                    <p className="text-orange-600">
                      ⚠️ <strong>Aviso:</strong> {preset.warning}
                    </p>
                  )}
                </div>
              </div>
              {currentPower === preset.power && (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Dicas Importantes */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h5 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <Info className="w-4 h-4" />
          Dicas Importantes
        </h5>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• <strong>Comece com 20 dBm</strong> e ajuste conforme necessário</li>
          <li>• <strong>Potência alta ≠ melhor desempenho</strong> - pode causar problemas</li>
          <li>• <strong>Se tiver muitas leituras duplicadas:</strong> reduza a potência</li>
          <li>• <strong>Se não detectar tags:</strong> aumente gradualmente</li>
          <li>• <strong>Ambiente com metal:</strong> pode precisar de potência maior</li>
          <li>• <strong>Múltiplas antenas próximas:</strong> use potência menor</li>
        </ul>
      </div>
    </div>
  );
}

