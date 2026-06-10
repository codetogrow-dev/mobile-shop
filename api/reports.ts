import { supabase } from '@/lib/supabase';
import type { DailySummary, MonthlySummary, ProductSummary, WeeklyRevenuePoint, TopProduct } from '@/types/app';

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
  const { data, error } = await supabase
    .from('monthly_sales_summary')
    .select('*')
    .eq('user_id', uid)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();
  if (error) throw error;

  const paddedMonth = String(month).padStart(2, '0');
  const { data: daily, error: dailyError } = await supabase
    .from('daily_sales_summary')
    .select('*')
    .eq('user_id', uid)
    .gte('date', `${year}-${paddedMonth}-01`)
    .lte('date', `${year}-${paddedMonth}-31`)
    .order('date');
  if (dailyError) throw dailyError;

  return {
    ...(data ?? { year, month, total_revenue: 0, total_cost: 0, gross_profit: 0, transaction_count: 0 }),
    daily_breakdown: daily ?? [],
  };
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
