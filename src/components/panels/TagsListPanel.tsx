import { useState } from 'react';
import { List, Download, Trash2, Search } from 'lucide-react';
import { useRFID } from '../../contexts/RFIDContext';
import { useNotification } from '../../contexts/NotificationContext';

export default function TagsListPanel() {
  const { state, clearTags } = useRFID();
  const { showSuccess, showWarning } = useNotification();
  const { tags } = state;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'read' | 'duplicate' | 'error'>('all');

  // Filtrar tags baseado na busca e status
  const filteredTags = tags.filter(tag => {
    const matchesSearch = 
      tag.epc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tag.pieceName && tag.pieceName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tag.pieceNumber && tag.pieceNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || tag.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleClearTags = () => {
    if (tags.length === 0) {
      showWarning('Nenhuma tag para limpar');
      return;
    }
    
    clearTags();
    showSuccess('Todas as tags foram removidas');
  };

  const handleExportTags = () => {
    if (filteredTags.length === 0) {
      showWarning('Nenhuma tag para exportar');
      return;
    }

    // Criar CSV
    const csvContent = [
      'EPC,Peça,Nome,Status,Timestamp',
      ...filteredTags.map(tag => 
        `${tag.epc},${tag.pieceNumber || ''},${tag.pieceName || ''},${tag.status},${tag.timestamp.toLocaleString('pt-BR')}`
      )
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tags_rfid_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccess('Tags exportadas com sucesso!');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      read: { label: 'Lida', className: 'status-badge read' },
      duplicate: { label: 'Duplicata', className: 'status-badge duplicate' },
      error: { label: 'Erro', className: 'status-badge error' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.read;
    return <span className={config.className}>{config.label}</span>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'read':
        return <div className="w-3 h-3 bg-success-500 rounded-full" />;
      case 'duplicate':
        return <div className="w-3 h-3 bg-warning-500 rounded-full" />;
      case 'error':
        return <div className="w-3 h-3 bg-error-500 rounded-full" />;
      default:
        return <div className="w-3 h-3 bg-gray-500 rounded-full" />;
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <List className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-bold text-gray-800">Tags Lidas</h2>
          {tags.length > 0 && (
            <span className="bg-primary-100 text-primary-800 text-xs font-medium px-2 py-1 rounded-full">
              {tags.length}
            </span>
          )}
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleClearTags}
            className="btn-secondary"
            disabled={tags.length === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar
          </button>
          
          <button
            onClick={handleExportTags}
            className="btn-success"
            disabled={filteredTags.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
        </div>
      </div>
      
      {/* Filtros e busca */}
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por EPC, peça ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="input-field w-full sm:w-auto"
        >
          <option value="all">Todos os Status</option>
          <option value="read">Lidas</option>
          <option value="duplicate">Duplicatas</option>
          <option value="error">Erros</option>
        </select>
      </div>
      
      {/* Lista de tags */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredTags.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {tags.length === 0 ? (
              <>
                <List className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Nenhuma tag lida ainda</p>
                <p className="text-sm">Conecte o leitor e inicie a leitura</p>
              </>
            ) : (
              <>
                <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Nenhuma tag encontrada</p>
                <p className="text-sm">Tente ajustar os filtros de busca</p>
              </>
            )}
          </div>
        ) : (
          filteredTags.map((tag, index) => (
            <div
              key={tag.id}
              className={`bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200 ${
                index === 0 ? 'animate-tag-read' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {getStatusIcon(tag.status)}
                  <div>
                    <div className="font-mono text-sm font-semibold text-gray-800">
                      {tag.epc}
                    </div>
                    <div className="text-sm text-gray-600">
                      {tag.pieceName || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {tag.pieceNumber || 'N/A'}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  {getStatusBadge(tag.status)}
                  <div className="text-xs text-gray-500 mt-1">
                    {tag.timestamp.toLocaleTimeString('pt-BR')}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Resumo dos filtros */}
      {tags.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            Mostrando {filteredTags.length} de {tags.length} tags
            {searchTerm && ` • Busca: "${searchTerm}"`}
            {statusFilter !== 'all' && ` • Status: ${statusFilter}`}
          </div>
        </div>
      )}
    </div>
  );
}
