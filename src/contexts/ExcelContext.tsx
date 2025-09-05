import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';

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

interface ExcelState {
  excelData: ExcelData;
  isUploading: boolean;
  searchQuery: string;
  selectedColumns: string[];
  filteredData: ExcelItem[];
  showFilters: boolean;
  currentPage: number;
  itemsPerPage: number;
  isProcessingInBatches: boolean;
  processingProgress: number;
  processingStatus: string;
  processingError: string;
}

const initialState: ExcelState = {
  excelData: {
    data: [],
    metadata: {
      fileName: '',
      uploadDate: '',
      totalItems: 0,
      columns: []
    }
  },
  isUploading: false,
  searchQuery: '',
  selectedColumns: [],
  filteredData: [],
  showFilters: false,
  currentPage: 1,
  itemsPerPage: 20,
  isProcessingInBatches: false,
  processingProgress: 0,
  processingStatus: '',
  processingError: ''
};

type ExcelAction =
  | { type: 'SET_EXCEL_DATA'; payload: ExcelData }
  | { type: 'SET_UPLOADING'; payload: boolean }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SELECTED_COLUMNS'; payload: string[] }
  | { type: 'SET_FILTERED_DATA'; payload: ExcelItem[] }
  | { type: 'SET_SHOW_FILTERS'; payload: boolean }
  | { type: 'SET_CURRENT_PAGE'; payload: number }
  | { type: 'SET_PROCESSING_IN_BATCHES'; payload: boolean }
  | { type: 'SET_PROCESSING_PROGRESS'; payload: number }
  | { type: 'SET_PROCESSING_STATUS'; payload: string }
  | { type: 'SET_PROCESSING_ERROR'; payload: string }
  | { type: 'CLEAR_EXCEL_DATA' }
  | { type: 'RESET_FILTERS' };

function excelReducer(state: ExcelState, action: ExcelAction): ExcelState {
  switch (action.type) {
    case 'SET_EXCEL_DATA':
      return {
        ...state,
        excelData: action.payload,
        filteredData: action.payload.data,
        currentPage: 1
      };
    
    case 'SET_UPLOADING':
      return { ...state, isUploading: action.payload };
    
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    
    case 'SET_SELECTED_COLUMNS':
      return { ...state, selectedColumns: action.payload };
    
    case 'SET_FILTERED_DATA':
      return { ...state, filteredData: action.payload, currentPage: 1 };
    
    case 'SET_SHOW_FILTERS':
      return { ...state, showFilters: action.payload };
    
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };
    
    case 'SET_PROCESSING_IN_BATCHES':
      return { ...state, isProcessingInBatches: action.payload };
    
    case 'SET_PROCESSING_PROGRESS':
      return { ...state, processingProgress: action.payload };
    
    case 'SET_PROCESSING_STATUS':
      return { ...state, processingStatus: action.payload };
    
    case 'SET_PROCESSING_ERROR':
      return { ...state, processingError: action.payload };
    
    case 'CLEAR_EXCEL_DATA':
      return {
        ...state,
        excelData: {
          data: [],
          metadata: {
            fileName: '',
            uploadDate: '',
            totalItems: 0,
            columns: []
          }
        },
        filteredData: [],
        searchQuery: '',
        selectedColumns: [],
        currentPage: 1
      };
    
    case 'RESET_FILTERS':
      return {
        ...state,
        searchQuery: '',
        selectedColumns: [],
        filteredData: state.excelData.data,
        currentPage: 1
      };
    
    default:
      return state;
  }
}

interface ExcelContextType {
  state: ExcelState;
  dispatch: React.Dispatch<ExcelAction>;
  // Métodos de conveniência
  setExcelData: (data: ExcelData) => void;
  setUploading: (uploading: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSelectedColumns: (columns: string[]) => void;
  setFilteredData: (data: ExcelItem[]) => void;
  setShowFilters: (show: boolean) => void;
  setCurrentPage: (page: number) => void;
  setProcessingInBatches: (processing: boolean) => void;
  setProcessingProgress: (progress: number) => void;
  setProcessingStatus: (status: string) => void;
  setProcessingError: (error: string) => void;
  clearExcelData: () => void;
  resetFilters: () => void;
}

const ExcelContext = createContext<ExcelContextType | undefined>(undefined);

interface ExcelProviderProps {
  children: ReactNode;
}

export function ExcelProvider({ children }: ExcelProviderProps) {
  const [state, dispatch] = useReducer(excelReducer, initialState);
  const socket = useSocket();

  // Conectar ao socket e escutar eventos
  useEffect(() => {
    if (socket) {
      // Solicitar dados atuais
      socket.emit('get-excel-data');
      
      // Escutar atualizações
      socket.on('excel-data-updated', (data: ExcelData) => {
        setExcelData(data);
      });
      
      socket.on('excel-search-result', (result: { items: ExcelItem[]; total: number; message: string }) => {
        setFilteredData(result.items);
      });
      
      socket.on('excel-clear-result', (result: { success: boolean; message: string }) => {
        if (result.success) {
          clearExcelData();
        }
      });
      
      // Eventos para processamento por lotes
      socket.on('excel-processing-started', (data: { fileName: string; totalRows: number; batchSize: number; totalBatches: number }) => {
        setProcessingInBatches(true);
        setProcessingProgress(0);
        setProcessingStatus(`Iniciando processamento de ${data.totalRows} linhas em ${data.totalBatches} lotes...`);
        setProcessingError('');
      });
      
      socket.on('excel-processing-progress', (data: { batchIndex: number; totalBatches: number; processedRows: number; totalRows: number; progress: number }) => {
        setProcessingProgress(data.progress);
        setProcessingStatus(`Processando lote ${data.batchIndex}/${data.totalBatches} - ${data.processedRows}/${data.totalRows} linhas (${data.progress}%)`);
      });
      
      socket.on('excel-processing-completed', (data: ExcelData) => {
        setProcessingInBatches(false);
        setProcessingProgress(100);
        setProcessingStatus('Processamento concluído com sucesso!');
        setExcelData(data);
        
        // Limpar status após 3 segundos
        setTimeout(() => {
          setProcessingStatus('');
          setProcessingProgress(0);
        }, 3000);
      });
      
      socket.on('excel-processing-error', (data: { fileName: string; error: string }) => {
        setProcessingInBatches(false);
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

  // Métodos de conveniência
  const setExcelData = (data: ExcelData) => {
    dispatch({ type: 'SET_EXCEL_DATA', payload: data });
  };

  const setUploading = (uploading: boolean) => {
    dispatch({ type: 'SET_UPLOADING', payload: uploading });
  };

  const setSearchQuery = (query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  };

  const setSelectedColumns = (columns: string[]) => {
    dispatch({ type: 'SET_SELECTED_COLUMNS', payload: columns });
  };

  const setFilteredData = (data: ExcelItem[]) => {
    dispatch({ type: 'SET_FILTERED_DATA', payload: data });
  };

  const setShowFilters = (show: boolean) => {
    dispatch({ type: 'SET_SHOW_FILTERS', payload: show });
  };

  const setCurrentPage = (page: number) => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: page });
  };

  const setProcessingInBatches = (processing: boolean) => {
    dispatch({ type: 'SET_PROCESSING_IN_BATCHES', payload: processing });
  };

  const setProcessingProgress = (progress: number) => {
    dispatch({ type: 'SET_PROCESSING_PROGRESS', payload: progress });
  };

  const setProcessingStatus = (status: string) => {
    dispatch({ type: 'SET_PROCESSING_STATUS', payload: status });
  };

  const setProcessingError = (error: string) => {
    dispatch({ type: 'SET_PROCESSING_ERROR', payload: error });
  };

  const clearExcelData = () => {
    dispatch({ type: 'CLEAR_EXCEL_DATA' });
  };

  const resetFilters = () => {
    dispatch({ type: 'RESET_FILTERS' });
  };

  const value: ExcelContextType = {
    state,
    dispatch,
    setExcelData,
    setUploading,
    setSearchQuery,
    setSelectedColumns,
    setFilteredData,
    setShowFilters,
    setCurrentPage,
    setProcessingInBatches,
    setProcessingProgress,
    setProcessingStatus,
    setProcessingError,
    clearExcelData,
    resetFilters
  };

  return <ExcelContext.Provider value={value}>{children}</ExcelContext.Provider>;
}

// Hook personalizado
export function useExcel() {
  const context = useContext(ExcelContext);
  if (context === undefined) {
    throw new Error('useExcel deve ser usado dentro de um ExcelProvider');
  }
  return context;
}
