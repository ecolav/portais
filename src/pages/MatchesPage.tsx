import RFIDMatchesPanel from '../components/panels/RFIDMatchesPanel';
import PageHeader from '../components/PageHeader';

export default function MatchesPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho com Logo */}
        <PageHeader 
          title="Correspondências RFID"
          subtitle="Histórico completo de correspondências entre TIDs lidos e dados da planilha"
        />

        {/* Seção Principal: Painel de Correspondências */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">🎯 Histórico de Correspondências</h2>
          <RFIDMatchesPanel />
        </div>

        {/* Seção de Informações */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 Como Funcionam as Correspondências</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-semibold">✓</span>
                <div>
                  <strong>Correspondência Encontrada</strong>: Quando TID lido = UHF da planilha
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-semibold">🔊</span>
                <div>
                  <strong>Som Automático</strong>: Som grave toca automaticamente
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-600 font-semibold">📱</span>
                <div>
                  <strong>Notificação Visual</strong>: Aparece no canto superior direito
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-orange-600 font-semibold">📝</span>
                <div>
                  <strong>Histórico Completo</strong>: Todas as correspondências ficam registradas
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Dados Exibidos</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-semibold">📦</span>
                <div>
                  <strong>Item Encontrado</strong>: Código, UHF, Tipo e outras informações
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-semibold">📡</span>
                <div>
                  <strong>Dados da Leitura</strong>: TID lido, antena e RSSI
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-600 font-semibold">⏰</span>
                <div>
                  <strong>Timestamp</strong>: Data e hora da correspondência
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-orange-600 font-semibold">🔢</span>
                <div>
                  <strong>Contador</strong>: Total de correspondências encontradas
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Seção de Ações */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">⚙️ Ações Disponíveis</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl mb-2">🗑️</div>
              <h4 className="font-semibold text-red-800">Limpar Lista</h4>
              <p className="text-sm text-red-600">Remove todas as correspondências do histórico</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl mb-2">❌</div>
              <h4 className="font-semibold text-blue-800">Remover Item</h4>
              <p className="text-sm text-blue-600">Remove correspondência específica</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl mb-2">👁️</div>
              <h4 className="font-semibold text-green-800">Visualizar Detalhes</h4>
              <p className="text-sm text-green-600">Veja informações completas de cada item</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
