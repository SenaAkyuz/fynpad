import { create } from 'zustand';

export type ToastType = 'info' | 'error' | 'success';

/**
 * Hafif geçici bildirim (toast) state'i. Paket eklemeden, store + root'taki <Toast/>
 * komponenti ile çalışır. `show` i18n anahtarı alır; <Toast/> çeviriyi yapar.
 */
interface ToastState {
  visible: boolean;
  messageKey: string | null;
  type: ToastType;
  show: (messageKey: string, type?: ToastType) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  messageKey: null,
  type: 'info',
  show: (messageKey, type = 'info') => set({ visible: true, messageKey, type }),
  hide: () => set({ visible: false }),
}));
