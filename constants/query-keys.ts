export const QK = {
  products: {
    all: ['products'] as const,
    list: (filters?: Record<string, unknown> | object) => ['products', 'list', filters] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
    lowStock: ['products', 'low-stock'] as const,
    names: ['products', 'names'] as const,
  },
  categories: {
    all: ['categories'] as const,
    list: ['categories', 'list'] as const,
  },
  sales: {
    all: ['sales'] as const,
    detail: (id: string) => ['sales', 'detail', id] as const,
    byDate: (from: string, to: string) => ['sales', 'range', from, to] as const,
    byProduct: (productId: string) => ['sales', 'product', productId] as const,
    today: ['sales', 'today'] as const,
  },
  purchases: {
    all: ['purchases'] as const,
    detail: (id: string) => ['purchases', 'detail', id] as const,
    byProduct: (productId: string) => ['purchases', 'product', productId] as const,
  },
  reports: {
    daily: (date: string) => ['reports', 'daily', date] as const,
    monthly: (year: number, month: number) => ['reports', 'monthly', year, month] as const,
    product: (productId: string) => ['reports', 'product', productId] as const,
    weeklyRevenue: ['reports', 'weekly-revenue'] as const,
    topProducts: (date: string) => ['reports', 'top-products', date] as const,
    yearly: (year: number) => ['reports', 'yearly', year] as const,
    outOfStockCount: ['reports', 'out-of-stock-count'] as const,
    monthToDate: ['reports', 'month-to-date'] as const,
    yesterday: ['reports', 'yesterday'] as const,
  },
  customers: {
    all: ['customers'] as const,
    list: (search?: string) => ['customers', 'list', search ?? ''] as const,
    detail: (id: string) => ['customers', 'detail', id] as const,
    page: (search: string, sort: string) =>
      ['customers', 'page', search, sort] as const,
    stats: (id: string) => ['customers', 'stats', id] as const,
    dashboardSummary: ['customers', 'dashboard-summary'] as const,
  },
  suppliers: {
    all: ['suppliers'] as const,
    list: (search?: string) => ['suppliers', 'list', search ?? ''] as const,
    detail: (id: string) => ['suppliers', 'detail', id] as const,
    page: (search: string, sort: string) =>
      ['suppliers', 'page', search, sort] as const,
    stats: (id: string) => ['suppliers', 'stats', id] as const,
    dashboardSummary: ['suppliers', 'dashboard-summary'] as const,
  },
  payments: {
    byTransaction: (type: 'sale' | 'purchase', id: string) =>
      ['payments', type, id] as const,
    byCustomer: (customerId: string) => ['payments', 'customer', customerId] as const,
    bySupplier: (supplierId: string) => ['payments', 'supplier', supplierId] as const,
  },
  dues: {
    all: ['dues'] as const,
    receivables: ['dues', 'receivables'] as const,
    payables: ['dues', 'payables'] as const,
    overdueCount: ['dues', 'overdue-count'] as const,
    overduePeople: ['dues', 'overdue-people'] as const,
    customer: (id: string) => ['dues', 'customer', id] as const,
    supplier: (id: string) => ['dues', 'supplier', id] as const,
  },
  profile: ['profile'] as const,
} as const;
