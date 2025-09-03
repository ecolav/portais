// Configuração da API
export const API_CONFIG = {
  // URL base do servidor backend
  BASE_URL: 'http://localhost:3001',
  
  // Endpoints da API
  ENDPOINTS: {
    CONFIG: '/api/config',
    STATUS: '/api/status',
    READINGS: '/api/readings',
    CONNECT: '/api/connect',
    DISCONNECT: '/api/disconnect',
    START_READING: '/api/start-reading',
    STOP_READING: '/api/stop-reading'
  },
  
  // Configurações de timeout
  TIMEOUT: 10000,
  
  // Headers padrão
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  }
};

// Função helper para construir URLs completas
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Função helper para fazer requisições à API
export const apiRequest = async (
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const url = buildApiUrl(endpoint);
  
  const defaultOptions: RequestInit = {
    headers: {
      ...API_CONFIG.DEFAULT_HEADERS,
      ...options.headers,
    },
    ...options,
  };

  return fetch(url, defaultOptions);
};
