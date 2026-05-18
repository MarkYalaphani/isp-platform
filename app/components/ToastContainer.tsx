'use client';

import { useState, useEffect, useRef } from 'react';
import { ToastType } from '@/lib/toast';

interface ToastItem {
  id: number;
  text: string;
  type: ToastType;
  exiting: boolean;
}

const TOAST_CONFIG: Record<ToastType, { bg: string; border: string; color: string; icon: string }> = {
  success: { bg: '#f0fdf4', border: '#86efac', color: '#166534', icon: 'bi-check-circle-fill' },
  error:   { bg: '#fef2f2', border: '#fca5a5', color: '#991b1b', icon: 'bi-x-circle-fill'     },
  warning: { bg: '#fffbeb', border: '#fcd34d', color: '#92400e', icon: 'bi-exclamation-triangle-fill' },
  info:    { bg: '#eff6ff', border: '#93c5fd', color: '#1e40af', icon: 'bi-info-circle-fill'   },
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const { text, type = 'success', duration = 3500 } = (e as CustomEvent).detail;
      const id = nextId.current++;
      setToasts(prev => [...prev, { id, text, type, exiting: false }]);
      setTimeout(() => dismiss(id), duration);
    };
    window.addEventListener('app-toast', handler);
    return () => window.removeEventListener('app-toast', handler);
  }, []);

  const dismiss = (id: number) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 320);
  };

  if (toasts.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes toastIn  { from { opacity:0; transform:translateY(20px) scale(0.94); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes toastOut { from { opacity:1; transform:translateY(0) scale(1); } to { opacity:0; transform:translateY(12px) scale(0.92); } }
        .toast-item { animation: toastIn 0.28s cubic-bezier(.22,.68,0,1.2) forwards; }
        .toast-item.out { animation: toastOut 0.28s ease forwards; }
        .toast-container {
          position: fixed; bottom: 24px; right: 24px; z-index: 9999;
          display: flex; flex-direction: column; gap: 10px;
          pointer-events: none; max-width: 360px;
        }
        @media (max-width: 640px) {
          .toast-container {
            right: 10px; left: 10px; bottom: 16px; max-width: 100%;
          }
        }
      `}</style>
      <div className="toast-container">
        {toasts.map(t => {
          const cfg = TOAST_CONFIG[t.type];
          return (
            <div
              key={t.id}
              className={`toast-item${t.exiting ? ' out' : ''}`}
              onClick={() => dismiss(t.id)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '12px 16px', borderRadius: 12, width: '100%',
                background: cfg.bg, border: `1.5px solid ${cfg.border}`,
                boxShadow: '0 8px 32px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.08)',
                cursor: 'pointer', pointerEvents: 'all',
              }}
            >
              <i className={`bi ${cfg.icon}`} style={{ color: cfg.color, fontSize: '1.1rem', flexShrink: 0, marginTop: 1 }}/>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: cfg.color, lineHeight: 1.45, flex: 1 }}>
                {t.text}
              </span>
              <button
                onClick={e => { e.stopPropagation(); dismiss(t.id); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: cfg.color, opacity: 0.5, fontSize: '0.8rem', padding: '0 0 0 4px', flexShrink: 0, lineHeight: 1 }}
              >✕</button>
            </div>
          );
        })}
      </div>
    </>
  );
}
