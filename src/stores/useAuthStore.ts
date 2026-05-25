import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

/**
 * In-memory auth state cache. Persist GEREKMEZ — Supabase session'ı kendi
 * AsyncStorage'ında tutuyor. Bu store sadece component'lara reaktif erişim verir.
 */
export type AuthState = {
  session: Session | null;
  user: User | null;
  /** ilk session yüklemesi sürüyor mu */
  loading: boolean;
  /** ilk auth kontrolü tamamlandı mı (splash + guard için) */
  initialized: boolean;
  setSession: (session: Session | null) => void;
  setInitialized: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,
  initialized: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setInitialized: () => set({ loading: false, initialized: true }),
}));
