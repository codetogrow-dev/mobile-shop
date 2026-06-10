import { create } from 'zustand';
import type { ProductFilters, DateRange, DateRangeMode } from '@/types/app';
import { DATE_RANGE_MODE } from '@/constants/enums';

interface UIState {
  productFilters: ProductFilters;
  setProductFilters: (filters: Partial<ProductFilters>) => void;
  resetProductFilters: () => void;

  reportDateRange: DateRange;
  reportDateMode: DateRangeMode;
  setReportDateRange: (range: DateRange, mode: DateRangeMode) => void;
}

const defaultFilters: ProductFilters = {
  search: '',
  categoryIds: [],
  stockFilter: 'all',
  sortBy: 'name',
  dateFrom: null,
  dateTo: null,
};

const today = new Date().toISOString().split('T')[0];

export const useUIStore = create<UIState>((set) => ({
  productFilters: defaultFilters,
  setProductFilters: (filters) =>
    set((s) => ({ productFilters: { ...s.productFilters, ...filters } })),
  resetProductFilters: () => set({ productFilters: defaultFilters }),

  reportDateRange: { from: today, to: today },
  reportDateMode: DATE_RANGE_MODE.TODAY,
  setReportDateRange: (reportDateRange, reportDateMode) =>
    set({ reportDateRange, reportDateMode }),
}));
