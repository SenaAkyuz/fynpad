import { create } from 'zustand';

import {
  getNextPeriod,
  getPreviousPeriod,
  getTodayPeriod,
  makeCustomPeriod,
} from '@/lib/period';
import type { PeriodFilter, PeriodType } from '@/types/period';

/**
 * Dashboard + Analytics ortak dönem filtresi (takvim-bazlı, 'week' YOK). Dönem her iki
 * ekranda tutarlı kalsın diye paylaşılan store'da tutulur.
 */
interface PeriodStore {
  filter: PeriodFilter;
  setType: (type: Exclude<PeriodType, 'custom'>) => void;
  setCustomRange: (start: string, end: string) => void;
  goPrevious: () => void;
  goNext: () => void;
  goToday: () => void;
}

export const usePeriodStore = create<PeriodStore>((set, get) => ({
  filter: getTodayPeriod('month'), // Varsayılan: içinde bulunulan ay
  setType: (type) => set({ filter: getTodayPeriod(type) }),
  setCustomRange: (start, end) => set({ filter: makeCustomPeriod(start, end) }),
  goPrevious: () => set({ filter: getPreviousPeriod(get().filter) }),
  goNext: () => set({ filter: getNextPeriod(get().filter) }),
  goToday: () => {
    const current = get().filter;
    set({ filter: getTodayPeriod(current.type === 'custom' ? 'month' : current.type) });
  },
}));
