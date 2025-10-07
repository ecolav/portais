import { useRFIDReader } from '../hooks/useRFIDReader';
import StatsPanel from '../components/panels/StatsPanel';
import AlertsPanel from '../components/panels/AlertsPanel';
import PageHeader from '../components/PageHeader';
import { Radio, List, CheckCircle, FileSpreadsheet } from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { readings, status, error } = useRFIDReader();

  const quickLinks = [
    { id: 'reader', label: 'Leitor RFID', icon: Radio, color: 'blue' },
    { id: 'readings', label: 'Ver Leituras', icon: List, color: 'green' },
    { id: 'matches', label: 'Correspondências', icon: CheckCircle, color: 'purple' },
    { id: 'excel', label: 'Planilha Excel', icon: FileSpreadsheet, color: 'orange' }
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Dashboard"
        subtitle="Visão geral do sistema RFID"
      />

      {/* Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatsPanel 
          totalReadings={status.totalReadings}
          uniqueTags={(status as any).uniqueTags ?? (status as any).uniqueTIDs ?? 0}
          isConnected={status.isConnected}
          isReading={status.isReading}
          readings={readings}
        />
        
        <AlertsPanel 
          lowStockCount={0}
          pendingCount={error ? 1 : 0}
        />
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Acesso Rápido</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            const colorClasses = {
              blue: 'border-blue-200 bg-blue-50 hover:border-blue-300 hover:bg-blue-100',
              green: 'border-green-200 bg-green-50 hover:border-green-300 hover:bg-green-100',
              purple: 'border-purple-200 bg-purple-50 hover:border-purple-300 hover:bg-purple-100',
              orange: 'border-orange-200 bg-orange-50 hover:border-orange-300 hover:bg-orange-100'
            };
            const iconColorClasses = {
              blue: 'text-blue-600',
              green: 'text-green-600',
              purple: 'text-purple-600',
              orange: 'text-orange-600'
            };
            
            return (
              <button
                key={link.id}
                onClick={() => onNavigate(link.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition ${colorClasses[link.color as keyof typeof colorClasses]}`}
              >
                <Icon className={`w-8 h-8 ${iconColorClasses[link.color as keyof typeof iconColorClasses]}`} />
                <span className="text-sm font-medium text-gray-700">{link.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status do Sistema</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${status.isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-gray-600">Conexão</span>
            </div>
            <p className="font-semibold text-gray-900">{status.isConnected ? 'Conectado' : 'Desconectado'}</p>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${status.isReading ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-gray-600">Leitura</span>
            </div>
            <p className="font-semibold text-gray-900">{status.isReading ? 'Ativa' : 'Parada'}</p>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Total de Leituras</span>
            <p className="text-2xl font-bold text-gray-900">{status.totalReadings}</p>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Tags Únicas</span>
            <p className="text-2xl font-bold text-gray-900">{new Set(readings.map(r => r.tid || r.epc)).size}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
