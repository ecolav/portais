import { AlertTriangle, Package, Clock, TrendingUp } from 'lucide-react';

interface AlertsPanelProps {
  lowStockCount?: number;
  pendingCount?: number;
}

export default function AlertsPanel({ lowStockCount = 0, pendingCount = 0 }: AlertsPanelProps) {
  const hasAlerts = lowStockCount > 0 || pendingCount > 0;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center space-x-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        <h3 className="text-lg font-semibold text-gray-900">Alertas do Sistema</h3>
      </div>
      
      <div className="space-y-3">
        {lowStockCount > 0 ? (
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
            <div>
              <p className="font-medium text-red-900">Estoque Baixo</p>
              <p className="text-sm text-red-700">{lowStockCount} itens abaixo do estoque mínimo</p>
            </div>
            <div className="text-red-500">
              <Package className="w-5 h-5" />
            </div>
          </div>
        ) : null}

        {pendingCount > 0 ? (
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
            <div>
              <p className="font-medium text-yellow-900">Ações Pendentes</p>
              <p className="text-sm text-yellow-700">{pendingCount} itens aguardando processamento</p>
            </div>
            <div className="text-yellow-500">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        ) : null}

        {!hasAlerts ? (
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-2 text-green-500" />
            <p>Tudo funcionando perfeitamente!</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

