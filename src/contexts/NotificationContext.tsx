import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { ToastNotification } from '../types';

// Estado inicial
interface NotificationState {
  notifications: ToastNotification[];
}

const initialState: NotificationState = {
  notifications: [],
};

// Tipos de ações
type NotificationAction =
  | { type: 'ADD_NOTIFICATION'; payload: Omit<ToastNotification, 'id'> }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_ALL' };

// Reducer
function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      const newNotification: ToastNotification = {
        ...action.payload,
        id: Date.now().toString(),
        duration: action.payload.duration || 5000,
      };
      return {
        ...state,
        notifications: [...state.notifications, newNotification],
      };

    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(notification => notification.id !== action.payload),
      };

    case 'CLEAR_ALL':
      return {
        ...state,
        notifications: [],
      };

    default:
      return state;
  }
}

// Contexto
interface NotificationContextType {
  state: NotificationState;
  addNotification: (notification: Omit<ToastNotification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  // Métodos de conveniência
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Provider
interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  const addNotification = (notification: Omit<ToastNotification, 'id'>) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
  };

  const removeNotification = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  const clearAll = () => {
    dispatch({ type: 'CLEAR_ALL' });
  };

  // Métodos de conveniência
  const showSuccess = (message: string, duration?: number) => {
    addNotification({ message, type: 'success', duration });
  };

  const showError = (message: string, duration?: number) => {
    addNotification({ message, type: 'error', duration });
  };

  const showWarning = (message: string, duration?: number) => {
    addNotification({ message, type: 'warning', duration });
  };

  const showInfo = (message: string, duration?: number) => {
    addNotification({ message, type: 'info', duration });
  };

  const value: NotificationContextType = {
    state,
    addNotification,
    removeNotification,
    clearAll,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

// Hook personalizado
export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification deve ser usado dentro de um NotificationProvider');
  }
  return context;
}
