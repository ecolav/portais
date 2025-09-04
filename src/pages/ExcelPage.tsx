import ExcelUploadPanel from '../components/panels/ExcelUploadPanel';

export default function ExcelPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Gerenciamento de Planilhas Excel
          </h1>
          <p className="text-gray-600">
            Upload, visualização e gerenciamento de dados da planilha
          </p>
        </div>

        {/* Seção Principal: Upload e Gerenciamento */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">📊 Upload e Gerenciamento de Dados</h2>
          <ExcelUploadPanel />
        </div>

        {/* Seção de Informações */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 Formato da Planilha</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-semibold">•</span>
                <div>
                  <strong>Código</strong>: Identificador único do item
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-semibold">•</span>
                <div>
                  <strong>UHF</strong>: Código UHF que será comparado com TID do leitor
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-600 font-semibold">•</span>
                <div>
                  <strong>Tipo 1</strong>: Descrição do item
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-orange-600 font-semibold">•</span>
                <div>
                  <strong>Outras colunas</strong>: Serão exibidas nas correspondências
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">🔍 Como Funciona o Sistema</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-semibold">1.</span>
                <div>Faça upload da planilha Excel (.xlsx)</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-semibold">2.</span>
                <div>Sistema armazena dados na memória do servidor</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-600 font-semibold">3.</span>
                <div>Quando TID lido = UHF da planilha, gera correspondência</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-orange-600 font-semibold">4.</span>
                <div>Notificação sonora e visual automática</div>
              </div>
            </div>
          </div>
        </div>

        {/* Seção de Recursos */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">⚡ Recursos Disponíveis</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl mb-2">📈</div>
              <h4 className="font-semibold text-blue-800">Processamento em Lotes</h4>
              <p className="text-sm text-blue-600">Planilhas grandes processadas automaticamente</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl mb-2">🔍</div>
              <h4 className="font-semibold text-green-800">Busca Avançada</h4>
              <p className="text-sm text-green-600">Filtre e pesquise dados carregados</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl mb-2">💾</div>
              <h4 className="font-semibold text-purple-800">Gerenciamento de Memória</h4>
              <p className="text-sm text-purple-600">Controle automático de uso de memória</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
