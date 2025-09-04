import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileSpreadsheet, Search, Trash2, Download, Eye, Filter } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';

interface ExcelItem {
  id: number;
  row: number;
  [key: string]: any;
}

interface ExcelMetadata {
  fileName: string;
  uploadDate: string;
  totalItems: number;
  columns: string[];
  processingStatus?: string;
  processedBatches?: number;
  totalBatches?: number;
}

interface ExcelData {
  data: ExcelItem[];
  metadata: ExcelMetadata;
}

const ExcelUploadPanel: React.FC = () => {
  const socket = useSocket();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [excelData, setExcelData] = useState<ExcelData>({
    data: [],
    metadata: {
      fileName: '',
      uploadDate: '',
      totalItems: 0,
      columns: []
    }
  });
  
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filteredData, setFilteredData] = useState<ExcelItem[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  // Estados para processamento por lotes
  const [isProcessingInBatches, setIsProcessingInBatches] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [processingError, setProcessingError] = useState('');

  useEffect(() => {
    if (socket) {
      // Solicitar dados atuais
      socket.emit('get-excel-data');
      
      // Escutar atualizações
      socket.on('excel-data-updated', (data: ExcelData) => {
        setExcelData(data);
        setFilteredData(data.data);
        setCurrentPage(1);
      });
      
      socket.on('excel-search-result', (result: { items: ExcelItem[]; total: number; message: string }) => {
        setFilteredData(result.items);
        setCurrentPage(1);
      });
      
      socket.on('excel-clear-result', (result: { success: boolean; message: string }) => {
        if (result.success) {
          setExcelData({
            data: [],
            metadata: {
              fileName: '',
              uploadDate: '',
              totalItems: 0,
              columns: []
            }
          });
          setFilteredData([]);
          setSearchQuery('');
          setSelectedColumns([]);
        }
      });
      
      // Eventos para processamento por lotes
      socket.on('excel-processing-started', (data: { fileName: string; totalRows: number; batchSize: number; totalBatches: number }) => {
        setIsProcessingInBatches(true);
        setProcessingProgress(0);
        setProcessingStatus(`Iniciando processamento de ${data.totalRows} linhas em ${data.totalBatches} lotes...`);
        setProcessingError('');
      });
      
      socket.on('excel-processing-progress', (data: { batchIndex: number; totalBatches: number; processedRows: number; totalRows: number; progress: number }) => {
        setProcessingProgress(data.progress);
        setProcessingStatus(`Processando lote ${data.batchIndex}/${data.totalBatches} - ${data.processedRows}/${data.totalRows} linhas (${data.progress}%)`);
      });
      
      socket.on('excel-processing-completed', (data: ExcelData) => {
        setIsProcessingInBatches(false);
        setProcessingProgress(100);
        setProcessingStatus('Processamento concluído com sucesso!');
        setExcelData(data);
        setFilteredData(data.data);
        setCurrentPage(1);
        
        // Limpar status após 3 segundos
        setTimeout(() => {
          setProcessingStatus('');
          setProcessingProgress(0);
        }, 3000);
      });
      
      socket.on('excel-processing-error', (data: { fileName: string; error: string }) => {
        setIsProcessingInBatches(false);
        setProcessingError(`Erro ao processar ${data.fileName}: ${data.error}`);
        setProcessingStatus('');
        setProcessingProgress(0);
        
        // Limpar erro após 5 segundos
        setTimeout(() => {
          setProcessingError('');
        }, 5000);
      });
      
      socket.on('excel-memory-cleaned', (data: { totalItems: number; message: string }) => {
        setProcessingStatus(data.message);
        setTimeout(() => {
          setProcessingStatus('');
        }, 3000);
      });
    }

    return () => {
      if (socket) {
        socket.off('excel-data-updated');
        socket.off('excel-search-result');
        socket.off('excel-clear-result');
        socket.off('excel-processing-started');
        socket.off('excel-processing-progress');
        socket.off('excel-processing-completed');
        socket.off('excel-processing-error');
        socket.off('excel-memory-cleaned');
      }
    };
  }, [socket]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setProcessingError('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/excel/upload', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        if (result.processingInBatches) {
          console.log('🔄 Upload iniciado, processando em lotes...');
          setProcessingStatus('Upload concluído. Processando planilha em lotes...');
        } else {
          console.log('✅ Planilha processada com sucesso');
          setProcessingStatus('Planilha processada com sucesso!');
        }
      } else {
        console.error('❌ Erro ao processar planilha:', result.message);
        setProcessingError(result.message);
      }
    } catch (error) {
      console.error('❌ Erro no upload:', error);
      setProcessingError('Erro na conexão com o servidor');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSearch = () => {
    if (socket) {
      socket.emit('search-excel-items', {
        query: searchQuery,
        columns: selectedColumns.length > 0 ? selectedColumns : undefined
      });
    }
  };

  const handleClearData = () => {
    if (socket && confirm('Tem certeza que deseja limpar todos os dados da planilha?')) {
      socket.emit('clear-excel-data');
    }
  };

  const handleColumnToggle = (column: string) => {
    setSelectedColumns(prev => 
      prev.includes(column) 
        ? prev.filter(col => col !== column)
        : [...prev, column]
    );
  };

  const handleDownloadCSV = () => {
    if (filteredData.length === 0) return;
    
    const headers = excelData.metadata.columns;
    const csvContent = [
      headers.join(','),
      ...filteredData.map(item => 
        headers.map(header => {
          const value = item[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value || '';
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${excelData.metadata.fileName.replace(/\.[^/.]+$/, '')}_filtered.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Paginação
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileSpreadsheet className="text-blue-600" />
          Sistema de Planilhas Excel
        </h2>
        
        {excelData.data.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download size={16} />
              Exportar CSV
            </button>
            <button
              onClick={handleClearData}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 size={16} />
              Limpar Dados
            </button>
          </div>
        )}
      </div>

      {/* Upload de Arquivo */}
      <div className="mb-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <div className="flex flex-col items-center gap-4">
            <Upload className="text-gray-400" size={48} />
            <div>
              <p className="text-lg font-medium text-gray-700">
                {isUploading ? 'Processando...' : 'Clique para fazer upload da planilha Excel'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Suporta arquivos .xlsx e .xls (máximo 10MB)
              </p>
            </div>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isProcessingInBatches}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isUploading ? 'Processando...' : 'Selecionar Arquivo'}
            </button>
          </div>
        </div>
        
        {/* Barra de Progresso para Processamento por Lotes */}
        {isProcessingInBatches && (
          <div className="mt-4 bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800">
                Processando planilha em lotes...
              </span>
              <span className="text-sm text-blue-600">{processingProgress}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-blue-600 mt-2">{processingStatus}</p>
          </div>
        )}
        
        {/* Status de Processamento */}
        {processingStatus && !isProcessingInBatches && (
          <div className="mt-4 bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-800">{processingStatus}</p>
          </div>
        )}
        
        {/* Erro de Processamento */}
        {processingError && (
          <div className="mt-4 bg-red-50 rounded-lg p-4">
            <p className="text-sm text-red-800">{processingError}</p>
          </div>
        )}
      </div>

      {/* Informações da Planilha */}
      {excelData.data.length > 0 && (
        <div className="mb-6 bg-blue-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Arquivo</p>
              <p className="text-lg font-semibold text-gray-800">{excelData.metadata.fileName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Itens</p>
              <p className="text-lg font-semibold text-gray-800">{excelData.metadata.totalItems}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Colunas</p>
              <p className="text-lg font-semibold text-gray-800">{excelData.metadata.columns.length}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Upload</p>
              <p className="text-lg font-semibold text-gray-800">
                {new Date(excelData.metadata.uploadDate).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          {/* Informações de Processamento por Lotes */}
          {excelData.metadata.processingStatus && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-blue-800">
                  Processamento por Lotes
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                {excelData.metadata.processedBatches && excelData.metadata.totalBatches
                  ? `Lotes processados: ${excelData.metadata.processedBatches}/${excelData.metadata.totalBatches}`
                  : 'Processado em lotes para otimizar memória'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Busca e Filtros */}
      {excelData.data.length > 0 && (
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar itens..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Filter size={16} />
              Filtros
            </button>
            
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Buscar
            </button>
          </div>

          {/* Filtros de Colunas */}
          {showFilters && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Selecionar colunas para exibir:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {excelData.metadata.columns.map((column) => (
                  <label key={column} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedColumns.length === 0 || selectedColumns.includes(column)}
                      onChange={() => handleColumnToggle(column)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{column}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabela de Dados */}
      {excelData.data.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Linha
                  </th>
                  {excelData.metadata.columns.map((column) => (
                    <th key={column} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.row}
                    </td>
                    {excelData.metadata.columns.map((column) => (
                      <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item[column] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Mostrando <span className="font-medium">{startIndex + 1}</span> a{' '}
                    <span className="font-medium">{Math.min(endIndex, filteredData.length)}</span> de{' '}
                    <span className="font-medium">{filteredData.length}</span> resultados
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === currentPage
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Próxima
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Estado Vazio */}
      {excelData.data.length === 0 && (
        <div className="text-center py-12">
          <FileSpreadsheet className="mx-auto text-gray-400" size={64} />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma planilha carregada</h3>
          <p className="mt-1 text-sm text-gray-500">
            Faça upload de uma planilha Excel para começar
          </p>
        </div>
      )}
    </div>
  );
};

export default ExcelUploadPanel;
