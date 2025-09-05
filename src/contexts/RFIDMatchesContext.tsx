import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';

interface RFIDMatch {
  reading: {
    tid: string;
    antenna: number;
    rssi: number;
    timestamp: string;
  };
  item: {
    [key: string]: any;
  };
  timestamp: string;
}

interface RFIDMatchesState {
  matches: RFIDMatch[];
  totalMatches: number;
}

const initialState: RFIDMatchesState = {
  matches: [],
  totalMatches: 0
};

type RFIDMatchesAction =
  | { type: 'ADD_MATCH'; payload: RFIDMatch }
  | { type: 'REMOVE_MATCH'; payload: string }
  | { type: 'CLEAR_MATCHES' }
  | { type: 'SET_TOTAL_MATCHES'; payload: number };

function rfidMatchesReducer(state: RFIDMatchesState, action: RFIDMatchesAction): RFIDMatchesState {
  switch (action.type) {
    case 'ADD_MATCH':
      return {
        ...state,
        matches: [action.payload, ...state.matches],
        totalMatches: state.totalMatches + 1
      };
    
    case 'REMOVE_MATCH':
      return {
        ...state,
        matches: state.matches.filter(m => m.timestamp !== action.payload)
      };
    
    case 'CLEAR_MATCHES':
      return {
        ...state,
        matches: [],
        totalMatches: 0
      };
    
    case 'SET_TOTAL_MATCHES':
      return {
        ...state,
        totalMatches: action.payload
      };
    
    default:
      return state;
  }
}

interface RFIDMatchesContextType {
  state: RFIDMatchesState;
  dispatch: React.Dispatch<RFIDMatchesAction>;
  // Métodos de conveniência
  addMatch: (match: RFIDMatch) => void;
  removeMatch: (timestamp: string) => void;
  clearMatches: () => void;
  setTotalMatches: (total: number) => void;
}

const RFIDMatchesContext = createContext<RFIDMatchesContextType | undefined>(undefined);

interface RFIDMatchesProviderProps {
  children: ReactNode;
}

export function RFIDMatchesProvider({ children }: RFIDMatchesProviderProps) {
  const [state, dispatch] = useReducer(rfidMatchesReducer, initialState);
  const socket = useSocket();

  // Conectar ao socket e escutar eventos
  useEffect(() => {
    if (socket) {
      console.log('🔌 RFIDMatchesContext: Socket disponível, configurando listener...');
      
      socket.on('rfid-match-found', (match: RFIDMatch) => {
        console.log('🎯 RFIDMatchesContext: Correspondência recebida no contexto:', match);
        addMatch(match);
      });
      
      socket.on('connect', () => {
        console.log('✅ RFIDMatchesContext: Socket conectado');
      });
      
      socket.on('disconnect', () => {
        console.log('🔌 RFIDMatchesContext: Socket desconectado');
      });
    } else {
      console.log('⚠️ RFIDMatchesContext: Socket não disponível');
    }

    return () => {
      if (socket) {
        console.log('🧹 RFIDMatchesContext: Limpando listeners...');
        socket.off('rfid-match-found');
        socket.off('connect');
        socket.off('disconnect');
      }
    };
  }, [socket]);

  // Métodos de conveniência
  const addMatch = (match: RFIDMatch) => {
    dispatch({ type: 'ADD_MATCH', payload: match });
  };

  const removeMatch = (timestamp: string) => {
    dispatch({ type: 'REMOVE_MATCH', payload: timestamp });
  };

  const clearMatches = () => {
    dispatch({ type: 'CLEAR_MATCHES' });
  };

  const setTotalMatches = (total: number) => {
    dispatch({ type: 'SET_TOTAL_MATCHES', payload: total });
  };

  const value: RFIDMatchesContextType = {
    state,
    dispatch,
    addMatch,
    removeMatch,
    clearMatches,
    setTotalMatches
  };

  return <RFIDMatchesContext.Provider value={value}>{children}</RFIDMatchesContext.Provider>;
}

// Hook personalizado
export function useRFIDMatches() {
  const context = useContext(RFIDMatchesContext);
  if (context === undefined) {
    throw new Error('useRFIDMatches deve ser usado dentro de um RFIDMatchesProvider');
  }
  return context;
}
