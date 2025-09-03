import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Download, Trash2 } from 'lucide-react';


interface Piece {
  id: string;
  pieceNumber: string;
  pieceName: string;
  epc: string;
  category: string;
  description: string;
  createdAt: Date;
}

export default function ExcelUploadPanel() {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processExcelFile(file);
    }
  };

  const processExcelFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simular processamento do arquivo
      await simulateFileProcessing();
      
      // Dados de exemplo (substituir por processamento real)
      const mockPieces: Piece[] = [
        {
          id: '1',
          pieceNumber: '001',
          pieceName: 'Uniforme Industrial',
          epc: 'E200341201B80201100000001',
          category: 'Vestuário',
          description: 'Uniforme padrão azul',
          createdAt: new Date(),
        },
        {
          id: '2',
          pieceNumber: '002',
          pieceName: 'Calça Jeans',
          epc: 'E200341201B80201100000002',
          category: 'Vestuário',
          description: 'Calça jeans azul escuro',
          createdAt: new Date(),
        },
        {
          id: '3',
          pieceNumber: '003',
          pieceName: 'Camisa Social',
          epc: 'E200341201B80201100000003',
          category: 'Vestuário',
          description: 'Camisa branca social',
          createdAt: new Date(),
        },
      ];

      setPieces(mockPieces);
      alert(`${mockPieces.length} peças carregadas com sucesso!`);
      
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      alert('Erro ao processar arquivo Excel');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const simulateFileProcessing = () => {
    return new Promise<void>((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        
        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(resolve, 500);
        }
      }, 100);
    });
  };

  const handleDownloadTemplate = () => {
    // Criar template CSV
    const csvContent = [
      'ID,Numero_Peca,Nome_Peca,EPC,Categoria,Descricao',
      '1,001,Uniforme Industrial,E200341201B80201100000001,Vestuário,Uniforme padrão azul',
      '2,002,Calça Jeans,E200341201B80201100000002,Vestuário,Calça jeans azul escuro',
      '3,003,Camisa Social,E200341201B80201100000003,Vestuário,Camisa branca social'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_pecas.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleClearPieces = () => {
    if (pieces.length === 0) {
      alert('Não há peças para limpar');
      return;
    }

    if (confirm('Tem certeza que deseja limpar todas as peças?')) {
      setPieces([]);
      alert('Todas as peças foram removidas');
    }
  };

  const handleExportPieces = () => {
    if (pieces.length === 0) {
      alert('Não há peças para exportar');
      return;
    }

    const csvContent = [
      'ID,Numero_Peca,Nome_Peca,EPC,Categoria,Descricao,Data_Criacao',
      ...pieces.map(piece => [
        piece.id,
        piece.pieceNumber,
        piece.pieceName,
        piece.epc,
        piece.category,
        piece.description,
        piece.createdAt.toISOString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pecas_exportadas_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <FileSpreadsheet className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">Upload de Arquivo Excel</h2>
      </div>
      
      <div className="space-y-6">
        {/* Área de upload */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <div className="mb-4">
            <p className="text-lg font-medium text-gray-700 mb-2">
              Arraste e solte seu arquivo Excel aqui
            </p>
            <p className="text-sm text-gray-500">
              Ou clique para selecionar um arquivo
            </p>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
            id="excel-upload"
          />
          
          <label
            htmlFor="excel-upload"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Selecionar Arquivo
          </label>
        </div>

        {/* Barra de progresso */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Processando arquivo...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex gap-3">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Baixar Template
          </button>
          
          {pieces.length > 0 && (
            <>
              <button
                onClick={handleExportPieces}
                className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar Peças
              </button>
              
              <button
                onClick={handleClearPieces}
                className="flex items-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Limpar Todas
              </button>
            </>
          )}
        </div>

        {/* Lista de peças carregadas */}
        {pieces.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800">
              Peças Carregadas ({pieces.length})
            </h3>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pieces.map((piece) => (
                  <div key={piece.id} className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">#{piece.pieceNumber}</span>
                      <span className="text-xs text-gray-500">{piece.category}</span>
                    </div>
                    <h4 className="font-medium text-gray-800 mb-1">{piece.pieceName}</h4>
                    <p className="text-sm text-gray-600 mb-2">{piece.description}</p>
                    <div className="text-xs text-gray-500">
                      <div>EPC: {piece.epc.slice(0, 12)}...</div>
                      <div>Data: {piece.createdAt.toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Informações do sistema */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-800">Sistema de Upload</span>
          </div>
          <p className="text-sm text-blue-700">
            Faça upload de arquivos Excel (.xlsx, .xls) para carregar peças no sistema. 
            Baixe o template para ver o formato correto dos dados.
          </p>
        </div>
      </div>
    </div>
  );
}
