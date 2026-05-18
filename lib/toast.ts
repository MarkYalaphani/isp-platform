export type ToastType = 'success' | 'error' | 'info' | 'warning';

export function showToast(text: string, type: ToastType = 'success', duration = 3500) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { text, type, duration } }));
}
