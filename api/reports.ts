import { supabase } from '@/lib/supabase';
import type {
  DailySummary, MonthlySummary, YearlySummary,
  ProductSummary, WeeklyRevenuePoint, TopProduct, MonthlyBreakdownRow,
} from '@/types/app';

async function getUid(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export async function getDailySummary(date: string): Promise<DailySummary> {
  const uid = await getUid();
  const { data, error } = await supabase
    .from('daily_sales_summary')
    .select('*')
    .eq('user_id', uid)
    .eq('date', date)
    .maybeSingle();
  if (error) throw error;
  return data ?? { date, total_revenue: 0, total_cost: 0, gross_profit: 0, transaction_count: 0 };
}

export async function getMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
  const uid = await getUid();
  const paddedMonth = String(month).padStart(2, '0');
  const from = `${year}-${paddedMonth}-01`;
  // Last day: go to first of next month, subtract 1
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${paddedMonth}-${String(lastDay).padStart(2, '0')}`;

  // Aggregate from daily_sales_summary directly — avoids dependency on monthly_sales_summary view
  const { data: daily, error: dailyError } = await supabase
    .from('daily_sales_summary')
    .select('date, total_revenue, total_cost, gross_profit, transaction_count')
    .eq('user_id', uid)
    .gte('date', from)
    .lte('date', to)
    .order('date');
  if (dailyError) throw dailyError;

  const rows = daily ?? [];
  const total_revenue = rows.reduce((s, r) => s + Number(r.total_revenue), 0);
  const total_cost = rows.reduce((s, r) => s + Number(r.total_cost), 0);
  const gross_profit = rows.reduce((s, r) => s + Number(r.gross_profit), 0);
  const transaction_count = rows.reduce((s, r) => s + (r.transaction_count ?? 0), 0);

  // Units sold and avg sale for the month — query sales table directly
  const { data: salesData, error: salesError } = await supabase
    .from('sales')
    .select('quantity, sale_price_per_unit')
    .eq('user_id', uid)
    .gte('sold_at', `${from}T00:00:00`)
    .lte('sold_at', `${to}T23:59:59`);
  if (salesError) throw salesError;

  const units_sold = (salesData ?? []).reduce((s, r) => s + r.quantity, 0);
  const avg_sale_value = transaction_count > 0 ? total_revenue / transaction_count : 0;

  return {
    year, month, total_revenue, total_cost, gross_profit, transaction_count,
    units_sold, avg_sale_value,
    daily_breakdown: rows.map((r) => ({
      date: r.date,
      total_revenue: Number(r.total_revenue),
      total_cost: Number(r.total_cost),
      gross_profit: Number(r.gross_profit),
      transaction_count: r.transaction_count ?? 0,
    })),
  };
}

export async function getYearlySummary(year: number): Promise<YearlySummary> {
  const uid = await getUid();
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  const { data: daily, error } = await supabase
    .from('daily_sales_summary')
    .select('date, total_revenue, total_cost, gross_profit, transaction_count')
    .eq('user_id', uid)
    .gte('date', from)
    .lte('date', to)
    .order('date');
  if (error) throw error;

  // Units sold for the year
  const { data: salesData, error: salesError } = await supabase
    .from('sales')
    .select('quantity')
    .eq('user_id', uid)
    .gte('sold_at', `${from}T00:00:00`)
    .lte('sold_at', `${to}T23:59:59`);
  if (salesError) throw salesError;

  const rows = daily ?? [];
  const total_revenue = rows.reduce((s, r) => s + Number(r.total_revenue), 0);
  const total_cost = rows.reduce((s, r) => s + Number(r.total_cost), 0);
  const gross_profit = rows.reduce((s, r) => s + Number(r.gross_profit), 0);
  const transaction_count = rows.reduce((s, r) => s + (r.transaction_count ?? 0), 0);
  const units_sold = (salesData ?? []).reduce((s, r) => s + r.quantity, 0);

  // Group daily rows into months
  const monthMap: Record<number, MonthlyBreakdownRow> = {};
  for (const r of rows) {
    const m = new Date(r.date).getMonth() + 1;
    if (!monthMap[m]) {
      monthMap[m] = { year, month: m, total_revenue: 0, total_cost: 0, gross_profit: 0, transaction_count: 0, units_sold: 0 };
    }
    monthMap[m].total_revenue += Number(r.total_revenue);
    monthMap[m].total_cost += Number(r.total_cost);
    monthMap[m].gross_profit += Number(r.gross_profit);
    monthMap[m].transaction_count += r.transaction_count ?? 0;
  }

  // Fill in units_sold per month from sales table
  const { data: monthlySales, error: msErr } = await supabase
    .from('sales')
    .select('sold_at, quantity')
    .eq('user_id', uid)
    .gte('sold_at', `${from}T00:00:00`)
    .lte('sold_at', `${to}T23:59:59`);
  if (msErr) throw msErr;
  for (const s of monthlySales ?? []) {
    const m = new Date(s.sold_at).getMonth() + 1;
    if (monthMap[m]) monthMap[m].units_sold += s.quantity;
  }

  const monthly_breakdown = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    return monthMap[m] ?? { year, month: m, total_revenue: 0, total_cost: 0, gross_profit: 0, transaction_count: 0, units_sold: 0 };
  });

  return { year, total_revenue, total_cost, gross_profit, transaction_count, units_sold, monthly_breakdown };
}

export async function getProductSummary(productId: string): Promise<ProductSummary> {
  const uid = await getUid();
  const { data, error } = await supabase
    .from('product_summary')
    .select('*')
    .eq('user_id', uid)
    .eq('product_id', productId)
    .single();
  if (error) throw error;
  return data;
}

export async function getWeeklyRevenue(): Promise<WeeklyRevenuePoint[]> {
  const uid = await getUid();
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  const { data, error } = await supabase
    .from('daily_sales_summary')
    .select('date, total_revenue')
    .eq('user_id', uid)
    .gte('date', dates[0])
    .lte('date', dates[6])
    .order('date');
  if (error) throw error;

  return dates.map((date) => ({
    date,
    revenue: data?.find((d) => d.date === date)?.total_revenue ?? 0,
  }));
}

export async function getTopProducts(date: string): Promise<TopProduct[]> {
  const uid = await getUid();
  const { data, error } = await supabase
    .from('sales')
    .select(`product_id, quantity, total_revenue, products(name)`)
    .eq('user_id', uid)
    .gte('sold_at', date)
    .lte('sold_at', date + 'T23:59:59');
  if (error) throw error;

  const grouped: Record<string, TopProduct> = {};
  for (const s of data ?? []) {
    const pid = s.product_id;
    if (!grouped[pid]) {
      grouped[pid] = {
        product_id: pid,
        name: (s.products as unknown as { name: string })?.name ?? '',
        units_sold: 0,
        revenue: 0,
      };
    }
    grouped[pid].units_sold += s.quantity;
    grouped[pid].revenue += Number(s.total_revenue);
  }

  return Object.values(grouped)
    .sort((a, b) => b.units_sold - a.units_sold)
    .slice(0, 5);
}

export async function getTopProductsForPeriod(from: string, to: string): Promise<TopProduct[]> {
  const uid = await getUid();
  const { data, error } = await supabase
    .from('sales')
    .select(`product_id, quantity, total_revenue, products(name)`)
    .eq('user_id', uid)
    .gte('sold_at', `${from}T00:00:00`)
    .lte('sold_at', `${to}T23:59:59`);
  if (error) throw error;

  const grouped: Record<string, TopProduct> = {};
  for (const s of data ?? []) {
    const pid = s.product_id;
    if (!grouped[pid]) {
      grouped[pid] = {
        product_id: pid,
        name: (s.products as unknown as { name: string })?.name ?? '',
        units_sold: 0,
        revenue: 0,
      };
    }
    grouped[pid].units_sold += s.quantity;
    grouped[pid].revenue += Number(s.total_revenue);
  }

  return Object.values(grouped)
    .sort((a, b) => b.units_sold - a.units_sold)
    .slice(0, 5);
}

export async function getLowStockCount(): Promise<number> {
  const uid = await getUid();
  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', uid)
    .is('deleted_at', null)
    .eq('is_active', true)
    .lte('current_stock', 5);
  if (error) throw error;
  return count ?? 0;
}

export async function getOutOfStockCount(): Promise<number> {
  const uid = await getUid();
  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', uid)
    .is('deleted_at', null)
    .eq('is_active', true)
    .eq('current_stock', 0);
  if (error) throw error;
  return count ?? 0;
}

export async function getMonthToDateSummary(): Promise<{ revenue: number; profit: number; units_sold: number; active_days: number }> {
  const uid = await getUid();
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const to = now.toISOString().split('T')[0];

  const { data: daily, error: dailyError } = await supabase
    .from('daily_sales_summary')
    .select('total_revenue, gross_profit, transaction_count')
    .eq('user_id', uid)
    .gte('date', from)
    .lte('date', to);
  if (dailyError) throw dailyError;

  const rows = daily ?? [];
  const revenue = rows.reduce((s, r) => s + Number(r.total_revenue), 0);
  const profit = rows.reduce((s, r) => s + Number(r.gross_profit), 0);
  const active_days = rows.filter((r) => (r.transaction_count ?? 0) > 0).length;

  const { data: salesData, error: salesError } = await supabase
    .from('sales')
    .select('quantity')
    .eq('user_id', uid)
    .gte('sold_at', `${from}T00:00:00`)
    .lte('sold_at', `${to}T23:59:59`);
  if (salesError) throw salesError;

  const units_sold = (salesData ?? []).reduce((s, r) => s + r.quantity, 0);
  return { revenue, profit, units_sold, active_days };
}

export async function getYesterdaySummary(): Promise<{ revenue: number; profit: number }> {
  const uid = await getUid();
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterday = d.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('daily_sales_summary')
    .select('total_revenue, gross_profit')
    .eq('user_id', uid)
    .eq('date', yesterday)
    .maybeSingle();
  if (error) throw error;
  return { revenue: Number(data?.total_revenue ?? 0), profit: Number(data?.gross_profit ?? 0) };
}
