import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

const palette = {
  success: '#10B981',
  error: '#EF4444',
  info: '#6366F1'
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((items) => [...items, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id));
    }, 3000);
  }, []);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: 18,
          right: 18,
          zIndex: 1000,
          display: 'grid',
          gap: 10,
          width: 'min(360px, calc(100vw - 36px))'
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              background: 'rgba(15, 22, 41, 0.9)',
              border: `1px solid ${palette[toast.type] || palette.info}`,
              borderLeft: `5px solid ${palette[toast.type] || palette.info}`,
              backdropFilter: 'blur(10px)',
              borderRadius: 8,
              boxShadow: '0 18px 40px rgba(0, 0, 0, 0.35)',
              color: '#F8FAFC',
              padding: '13px 14px',
              fontSize: 14,
              lineHeight: 1.45,
              transform: 'translateY(0)',
              transition: 'opacity 180ms ease, transform 180ms ease'
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return context;
}
