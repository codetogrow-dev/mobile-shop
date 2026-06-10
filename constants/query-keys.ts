export const QK = {
  products: {
    all: ['products'] as const,
    list: (filters?: Record<string, unknown>) => ['products', 'list', filters] as const,
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
  profile: ['profile'] as const,
} as const;
