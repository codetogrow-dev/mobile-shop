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

// ─── Parties (Customers / Suppliers) ─────────────────────────────────────────

const phoneRegex = /^[+\d][\d\s\-()]*$/;
// CNIC: 13 digits total, formatted as XXXXX-XXXXXXX-X.
const cnicRegex = /^\d{5}-\d{7}-\d$/;

const partyShape = {
  name: z.string().min(1, 'Name is required'),
  phone: z.string().regex(phoneRegex, 'Enter a valid phone').or(z.literal('')).optional(),
  cnic: z.string().regex(cnicRegex, 'CNIC must be XXXXX-XXXXXXX-X').or(z.literal('')).optional(),
  address: z.string().or(z.literal('')).optional(),
  notes: z.string().or(z.literal('')).optional(),
};

export const customerSchema = z.object(partyShape);
export type CustomerFormValues = z.infer<typeof customerSchema>;

export const supplierSchema = z.object(partyShape);
export type SupplierFormValues = z.infer<typeof supplierSchema>;

export interface Party {
  id: string;
  name: string;
  phone: string | null;
  cnic: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Payments ────────────────────────────────────────────────────────────────

import { PAYMENT_MODE, PAYMENT_STATUS, PAYMENT_STATUS_FILTER } from '@/constants/enums';

export type PaymentMode   = typeof PAYMENT_MODE[keyof typeof PAYMENT_MODE];
export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];
export type PaymentStatusFilter = typeof PAYMENT_STATUS_FILTER[keyof typeof PAYMENT_STATUS_FILTER];

export const paymentSchema = z.object({
  amount: numStr('Enter amount').pipe(z.number().min(0.01, 'Amount must be > 0')),
  paid_at: z.string(),
  method: z.string().or(z.literal('')).optional(),
  note: z.string().or(z.literal('')).optional(),
});
export type PaymentFormValues = z.infer<typeof paymentSchema>;

export interface Payment {
  id: string;
  transaction_type: 'sale' | 'purchase';
  transaction_id: string;
  amount: number;
  paid_at: string;
  method: string | null;
  note: string | null;
  created_at: string;
}

// ─── Purchase ─────────────────────────────────────────────────────────────────

export const purchaseSchema = z.object({
  product_id: z.string().check(z.uuid({ error: 'Select a product' })),
  quantity: numStr('Enter quantity').pipe(z.number().int().min(1, 'Quantity must be at least 1')),
  cost_price: numStr('Enter cost price').pipe(z.number().min(0.01, 'Enter a valid cost price')),
  selling_price: numStr('Enter selling price').pipe(z.number().min(0.01, 'Enter a valid selling price')),
  supplier: z.string().optional(),
  supplier_id: z.string().check(z.uuid()).nullable().optional(),
  notes: z.string().optional(),
  purchased_at: z.string(),
  payment_mode: z.enum([PAYMENT_MODE.FULL, PAYMENT_MODE.PARTIAL, PAYMENT_MODE.UNPAID]).default(PAYMENT_MODE.FULL),
  amount_paid: numStr('Enter amount paid').pipe(z.number().min(0)).optional(),
  due_date: z.string().nullable().optional(),
}).superRefine((data, ctx) => {
  const total = (Number(data.quantity) || 0) * (Number(data.cost_price) || 0);
  if (data.payment_mode === PAYMENT_MODE.PARTIAL) {
    const paid = Number(data.amount_paid ?? 0);
    if (!(paid > 0 && paid < total)) {
      ctx.addIssue({
        code: 'custom',
        path: ['amount_paid'],
        message: `Partial payment must be between 0 and ${total.toFixed(2)}`,
      });
    }
  }
  if (data.payment_mode !== PAYMENT_MODE.FULL) {
    if (!data.due_date) {
      ctx.addIssue({ code: 'custom', path: ['due_date'], message: 'Pick a due date' });
    }
    if (!data.supplier_id) {
      ctx.addIssue({ code: 'custom', path: ['supplier_id'], message: 'Pick or add a supplier' });
    }
  }
});
export type PurchaseFormValues = z.infer<typeof purchaseSchema>;

// ─── Sale ─────────────────────────────────────────────────────────────────────

export const saleSchema = z.object({
  product_id: z.string().check(z.uuid({ error: 'Select a product' })),
  quantity: numStr('Enter quantity').pipe(z.number().int().min(1, 'Quantity must be at least 1')),
  sale_price_per_unit: numStr('Enter sale price').pipe(z.number().min(0.01, 'Enter a valid sale price')),
  notes: z.string().optional(),
  sold_at: z.string(),
  customer_id: z.string().check(z.uuid()).nullable().optional(),
  payment_mode: z.enum([PAYMENT_MODE.FULL, PAYMENT_MODE.PARTIAL, PAYMENT_MODE.UNPAID]).default(PAYMENT_MODE.FULL),
  amount_paid: numStr('Enter amount paid').pipe(z.number().min(0)).optional(),
  due_date: z.string().nullable().optional(),
}).superRefine((data, ctx) => {
  const total = (Number(data.quantity) || 0) * (Number(data.sale_price_per_unit) || 0);
  if (data.payment_mode === PAYMENT_MODE.PARTIAL) {
    const paid = Number(data.amount_paid ?? 0);
    if (!(paid > 0 && paid < total)) {
      ctx.addIssue({
        code: 'custom',
        path: ['amount_paid'],
        message: `Partial payment must be between 0 and ${total.toFixed(2)}`,
      });
    }
  }
  if (data.payment_mode !== PAYMENT_MODE.FULL) {
    if (!data.due_date) {
      ctx.addIssue({ code: 'custom', path: ['due_date'], message: 'Pick a due date' });
    }
    if (!data.customer_id) {
      ctx.addIssue({ code: 'custom', path: ['customer_id'], message: 'Pick or add a customer' });
    }
  }
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
  paymentStatus: PaymentStatusFilter;
}

export interface PurchaseFilters {
  productId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  sortBy: PurchaseSortBy;
  supplier: string;
  paymentStatus: PaymentStatusFilter;
}

export const DEFAULT_SALE_FILTERS: SaleFilters = {
  productId: null,
  dateFrom: null,
  dateTo: null,
  sortBy: TRANSACTION_SORT.DATE_DESC,
  paymentStatus: PAYMENT_STATUS_FILTER.ALL,
};

export const DEFAULT_PURCHASE_FILTERS: PurchaseFilters = {
  productId: null,
  dateFrom: null,
  dateTo: null,
  sortBy: TRANSACTION_SORT.DATE_DESC,
  supplier: '',
  paymentStatus: PAYMENT_STATUS_FILTER.ALL,
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

// ─── Customer / Supplier stats & pagination ──────────────────────────────────

export type PartyListSort = 'name' | 'spent' | 'visits' | 'recent' | 'balance';

export interface CustomerListRow extends Party {
  lifetime_spent:   number;
  visit_count:      number;
  avg_ticket:       number;
  last_visit_at:    string | null;
  current_balance:  number;
}

export interface SupplierListRow extends Party {
  lifetime_purchased: number;
  batch_count:        number;
  avg_batch:          number;
  last_purchase_at:   string | null;
  current_balance:    number;
}

export interface CustomerStats {
  customer_id:     string;
  lifetime_spent:  number;
  visit_count:     number;
  avg_ticket:      number;
  last_visit_at:   string | null;
  current_balance: number;
}

export interface SupplierStats {
  supplier_id:        string;
  lifetime_purchased: number;
  batch_count:        number;
  avg_batch:          number;
  last_purchase_at:   string | null;
  current_balance:    number;
}

export interface CustomersDashboardSummary {
  customers_today:    number;
  new_this_month:     number;
  top_customer_id:    string | null;
  top_customer_name:  string | null;
  top_customer_total: number;
}

export interface SuppliersDashboardSummary {
  active_today:       number;
  new_this_month:     number;
  top_supplier_id:    string | null;
  top_supplier_name:  string | null;
  top_supplier_total: number;
}

export interface PartyListPage<T> {
  rows: T[];
  total_count: number;
  next_offset: number | null;
}

// ─── Dues ────────────────────────────────────────────────────────────────────

export interface DuesPartySummary {
  party_id: string;
  name: string;
  phone: string | null;
  total_due: number;
  overdue_amount: number;
  oldest_due_date: string | null;
  transaction_count: number;
}

export interface DuesOverdueCount {
  receivables_overdue: number;
  payables_overdue: number;
}

export interface OverduePerson {
  kind: 'customer' | 'supplier';
  party_id: string;
  name: string;
  phone: string | null;
  overdue_amount: number;
  oldest_due_date: string | null;
  transaction_count: number;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export type TabName = 'dashboard' | 'inventory' | 'sales' | 'reports' | 'settings' | 'dues';