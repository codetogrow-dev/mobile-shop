// ─── Stock Filter ─────────────────────────────────────────────────────────────

export const STOCK_FILTER = {
  ALL: 'all',
  LOW: 'low',
  OK: 'ok',
  OUT: 'out',
} as const;

// ─── Product Sort ─────────────────────────────────────────────────────────────

export const PRODUCT_SORT = {
  NAME: 'name',
  STOCK: 'stock',
  UPDATED: 'updated',
} as const;

// ─── Transaction Sort ─────────────────────────────────────────────────────────

export const TRANSACTION_SORT = {
  DATE_DESC: 'date_desc',
  AMOUNT_DESC: 'amount_desc',
  AMOUNT_ASC: 'amount_asc',
  QTY_DESC: 'qty_desc',
} as const;

// ─── Report Mode ──────────────────────────────────────────────────────────────

export const REPORT_MODE = {
  DAILY: 'daily',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
} as const;

// ─── Date Range Mode ──────────────────────────────────────────────────────────

export const DATE_RANGE_MODE = {
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
  CUSTOM: 'custom',
} as const;

// ─── Transaction Sheet Mode ───────────────────────────────────────────────────

export const TRANSACTION_MODE = {
  SALES: 'sales',
  PURCHASES: 'purchases',
} as const;

// ─── Product Detail Tab ───────────────────────────────────────────────────────

export const PRODUCT_TAB = {
  INFO: 'info',
  PURCHASES: 'purchases',
  SALES: 'sales',
} as const;
