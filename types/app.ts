import { z } from 'zod';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().check(z.email({ error: 'Enter a valid email' })),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const signUpSchema = z.object({
  full_name: z.string().min(2, 'Enter your full name'),
  email: z.string().check(z.email({ error: 'Enter a valid email' })),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});
export type SignUpFormValues = z.infer<typeof signUpSchema>;

// Accepts string or number input from text fields, validates as number.
// z.preprocess keeps the inferred input type opaque so RHF resolver types align.
const numStr = (error?: string) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? NaN : Number(v)),
    z.number({ error: error ?? 'Enter a valid number' }),
  );

// ─── Product ──────────────────────────────────────────────────────────────────

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  category_id: z.string().check(z.uuid({ error: 'Select a category' })).nullable().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  description: z.string().optional(),
  initial_stock: numStr('Enter a valid number').pipe(z.number().int().min(0, 'Cannot be negative')).optional(),
  purchase_price: numStr('Enter a valid price').pipe(z.number().min(0, 'Cannot be negative')).optional(),
  sale_price: numStr('Enter a valid price').pipe(z.number().min(0, 'Cannot be negative')).optional(),
  reorder_point: numStr('Enter a valid number').pipe(z.number().int().min(0, 'Cannot be negative')),
});
export type ProductFormValues = z.infer<typeof productSchema>;

// ─── Purchase ─────────────────────────────────────────────────────────────────

export const purchaseSchema = z.object({
  product_id: z.string().check(z.uuid({ error: 'Select a product' })),
  quantity: numStr('Enter quantity').pipe(z.number().int().min(1, 'Quantity must be at least 1')),
  cost_price: numStr('Enter cost price').pipe(z.number().min(0.01, 'Enter a valid cost price')),
  selling_price: numStr('Enter selling price').pipe(z.number().min(0.01, 'Enter a valid selling price')),
  supplier: z.string().optional(),
  notes: z.string().optional(),
  purchased_at: z.string(),
});
export type PurchaseFormValues = z.infer<typeof purchaseSchema>;

// ─── Sale ─────────────────────────────────────────────────────────────────────

export const saleSchema = z.object({
  product_id: z.string().check(z.uuid({ error: 'Select a product' })),
  quantity: numStr('Enter quantity').pipe(z.number().int().min(1, 'Quantity must be at least 1')),
  sale_price_per_unit: numStr('Enter sale price').pipe(z.number().min(0.01, 'Enter a valid sale price')),
  notes: z.string().optional(),
  sold_at: z.string(),
});
export type SaleFormValues = z.infer<typeof saleSchema>;

// ─── Filters ─────────────────────────────────────────────────────────────────

import { STOCK_FILTER, PRODUCT_SORT, TRANSACTION_SORT, DATE_RANGE_MODE } from '@/constants/enums';

export type StockFilter = typeof STOCK_FILTER[keyof typeof STOCK_FILTER];
export type SortBy = typeof PRODUCT_SORT[keyof typeof PRODUCT_SORT];

export interface ProductFilters {
  search: string;
  categoryIds: string[];
  stockFilter: StockFilter;
  sortBy: SortBy;
  dateFrom: string | null;
  dateTo: string | null;
}

export const DEFAULT_FILTERS: ProductFilters = {
  search: '',
  categoryIds: [],
  stockFilter: STOCK_FILTER.ALL,
  sortBy: PRODUCT_SORT.NAME,
  dateFrom: null,
  dateTo: null,
};

export type SaleSortBy = typeof TRANSACTION_SORT[keyof typeof TRANSACTION_SORT];
export type PurchaseSortBy = typeof TRANSACTION_SORT[keyof typeof TRANSACTION_SORT];

export interface SaleFilters {
  productId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  sortBy: SaleSortBy;
}

export interface PurchaseFilters {
  productId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  sortBy: PurchaseSortBy;
  supplier: string;
}

export const DEFAULT_SALE_FILTERS: SaleFilters = {
  productId: null,
  dateFrom: null,
  dateTo: null,
  sortBy: TRANSACTION_SORT.DATE_DESC,
};

export const DEFAULT_PURCHASE_FILTERS: PurchaseFilters = {
  productId: null,
  dateFrom: null,
  dateTo: null,
  sortBy: TRANSACTION_SORT.DATE_DESC,
  supplier: '',
};

export type DateRangeMode = typeof DATE_RANGE_MODE[keyof typeof DATE_RANGE_MODE];

export interface DateRange {
  from: string;
  to: string;
}

// ─── Report Data ──────────────────────────────────────────────────────────────

export interface DailySummary {
  date: string;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  transaction_count: number;
}

export interface MonthlySummary {
  year: number;
  month: number;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  transaction_count: number;
  units_sold: number;
  avg_sale_value: number;
  daily_breakdown: DailySummary[];
}

export interface YearlySummary {
  year: number;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  transaction_count: number;
  units_sold: number;
  monthly_breakdown: MonthlyBreakdownRow[];
}

export interface MonthlyBreakdownRow {
  year: number;
  month: number;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  transaction_count: number;
  units_sold: number;
}

export interface ProductSummary {
  product_id: string;
  product_name: string;
  total_purchased_qty: number;
  total_sold_qty: number;
  total_purchase_cost: number;
  total_sales_revenue: number;
  total_gross_profit: number;
  profit_margin_pct: number;
}

export interface WeeklyRevenuePoint {
  date: string;
  revenue: number;
}

export interface TopProduct {
  product_id: string;
  name: string;
  units_sold: number;
  revenue: number;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export type TabName = 'dashboard' | 'inventory' | 'sales' | 'reports' | 'settings';