import { Zap, AlertTriangle, Info, CheckCircle } from 'lucide-react';

interface PowerDiagnosticsPanelProps {
  currentPower: number;
  onPowerChange: (power: number) => void;
  onApplyPower: (power: number) => void;
  isApplying?: boolean;
}

export default function PowerDiagnosticsPanel({ currentPower, onPowerChange, onApplyPower, isApplying }: PowerDiagnosticsPanelProps) {
  const powerPresets = [
    { name: 'Baixa', power: 10, range: '1-2m', color: 'green' },
    { name: 'Média', power: 20, range: '4-6m', color: 'blue' },
    { name: 'Alta', power: 25, range: '6-8m', color: 'orange' },
    { name: 'Máxima', power: 30, range: '8-10m', color: 'red' }
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
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5 text-orange-500" />
        Potência de Transmissão
      </h3>

      {/* Controle de Potência */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-600">Atual</span>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{currentPower}</div>
            <div className="text-xs text-gray-500">dBm</div>
          </div>
          <span className="text-sm text-gray-600">0-30</span>
        </div>

        <input
          type="range"
          min="0"
          max="30"
          value={currentPower}
          onChange={(e) => onPowerChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />

        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Baixa</span>
          <span>Alta</span>
        </div>
      </div>

      {/* Presets Rápidos */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {powerPresets.map((preset) => (
          <button
            key={preset.power}
            onClick={() => {
              onPowerChange(preset.power);
              onApplyPower(preset.power);
            }}
            className={`p-2 rounded border text-center transition ${
              currentPower === preset.power
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-lg font-bold text-gray-900">{preset.power}</div>
            <div className="text-xs text-gray-600">{preset.name}</div>
            <div className="text-xs text-gray-500">{preset.range}</div>
          </button>
        ))}
      </div>

      {/* Alerta de Diagnóstico */}
      {diagnosis.type !== 'info' && (
        <div className={`p-3 rounded-lg border flex items-start gap-2 ${
          diagnosis.type === 'danger' ? 'bg-red-50 border-red-200' :
          diagnosis.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
          'bg-green-50 border-green-200'
        }`}>
          <Icon className={`w-5 h-5 flex-shrink-0 ${
            diagnosis.type === 'danger' ? 'text-red-600' :
            diagnosis.type === 'warning' ? 'text-yellow-600' :
            'text-green-600'
          }`} />
          <div>
            <p className={`text-sm font-medium ${
              diagnosis.type === 'danger' ? 'text-red-800' :
              diagnosis.type === 'warning' ? 'text-yellow-800' :
              'text-green-800'
            }`}>
              {diagnosis.title}
            </p>
            <p className={`text-xs ${
              diagnosis.type === 'danger' ? 'text-red-600' :
              diagnosis.type === 'warning' ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {diagnosis.message}
            </p>
          </div>
        </div>
      )}

      {/* Botão Aplicar */}
      <button
        onClick={() => onApplyPower(currentPower)}
        disabled={isApplying}
        className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition disabled:bg-gray-400"
      >
        <Zap className="w-4 h-4" />
        {isApplying ? 'Aplicando...' : 'Aplicar Potência'}
      </button>
    </div>
  );
}

