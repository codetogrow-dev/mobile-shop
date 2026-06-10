import { supabase } from '@/lib/supabase';
import type { SaleFormValues, SaleFilters } from '@/types/app';

export async function createSale(values: SaleFormValues & { tenant_id: string }) {
  const { data, error } = await supabase.rpc('record_sale', {
    p_product_id: values.product_id,
    p_quantity: values.quantity,
    p_sale_price: values.sale_price_per_unit,
    p_notes: values.notes ?? null,
    p_sold_at: values.sold_at,
    p_tenant_id: values.tenant_id,
  });
  if (error) throw error;
  return data;
}

export async function listSales(productId?: string, filters?: Partial<SaleFilters>) {
  const { data: { user } } = await supabase.auth.getUser();
  let query = supabase
    .from('sales')
    .select(`*, products(id, name)`)
    .eq('user_id', user?.id)
    .order('sold_at', { ascending: false });

  if (productId) query = query.eq('product_id', productId);
  if (filters?.productId) query = query.eq('product_id', filters.productId);
  if (filters?.dateFrom) query = query.gte('sold_at', filters.dateFrom);
  if (filters?.dateTo) query = query.lte('sold_at', filters.dateTo + 'T23:59:59');
  if (filters?.sortBy === 'amount_desc') query = query.order('total_revenue', { ascending: false });
  else if (filters?.sortBy === 'amount_asc') query = query.order('total_revenue', { ascending: true });
  else if (filters?.sortBy === 'qty_desc') query = query.order('quantity', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function listSalesByDateRange(from: string, to: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('sales')
    .select(`*, products(id, name)`)
    .eq('user_id', user?.id)
    .gte('sold_at', from)
    .lte('sold_at', to + 'T23:59:59')
    .order('sold_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function deleteSale(id: string) {
  const { error } = await supabase.rpc('delete_sale', { p_sale_id: id });
  if (error) throw error;
}
