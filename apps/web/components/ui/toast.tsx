'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: Toast['type'] = 'info', duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-down animation
    setIsVisible(true);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    // Remove after animation completes
    setTimeout(() => onRemove(toast.id), 200);
  };

  const getToastStyles = () => {
    const baseStyles = 'transform transition-all duration-200 ease-out';
    const visibleStyles = 'translate-y-0 opacity-100';
    const hiddenStyles = 'translate-y-[-20px] opacity-0';
    
    switch (toast.type) {
      case 'success':
        return `${baseStyles} bg-green-500 text-white ${isVisible ? visibleStyles : hiddenStyles}`;
      case 'error':
        return `${baseStyles} bg-red-500 text-white ${isVisible ? visibleStyles : hiddenStyles}`;
      case 'warning':
        return `${baseStyles} bg-yellow-500 text-black ${isVisible ? visibleStyles : hiddenStyles}`;
      case 'info':
      default:
        return `${baseStyles} bg-blue-500 text-white ${isVisible ? visibleStyles : hiddenStyles}`;
    }
  };

  return (
    <div
      className={getToastStyles()}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center justify-between px-4 py-3 rounded-lg shadow-lg min-w-[300px] max-w-md">
        <div className="flex items-center space-x-2">
          {toast.type === 'success' && <span className="text-lg">✓</span>}
          {toast.type === 'error' && <span className="text-lg">✕</span>}
          {toast.type === 'warning' && <span className="text-lg">⚠</span>}
          {toast.type === 'info' && <span className="text-lg">ℹ</span>}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
        <button
          onClick={handleClose}
          className="ml-4 text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded"
          aria-label="Close toast"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Convenience functions for common toast types
export const toast = {
  success: (message: string, duration?: number) => {
    // This will be used within components that have access to the context
    console.log('Success:', message);
  },
  error: (message: string, duration?: number) => {
    console.log('Error:', message);
  },
  info: (message: string, duration?: number) => {
    console.log('Info:', message);
  },
  warning: (message: string, duration?: number) => {
    console.log('Warning:', message);
  },
};
