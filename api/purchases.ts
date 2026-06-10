import { supabase } from '@/lib/supabase';
import type { PurchaseFormValues, PurchaseFilters } from '@/types/app';

export async function createPurchase(values: PurchaseFormValues & { tenant_id: string }) {
  const { data, error } = await supabase.rpc('record_purchase', {
    p_product_id: values.product_id,
    p_quantity: values.quantity,
    p_cost_price: values.cost_price,
    p_selling_price: values.selling_price,
    p_supplier: values.supplier ?? null,
    p_notes: values.notes ?? null,
    p_purchased_at: values.purchased_at,
    p_tenant_id: values.tenant_id,
  });
  if (error) throw error;
  return data;
}

export async function listPurchases(productId?: string, filters?: Partial<PurchaseFilters>) {
  const { data: { user } } = await supabase.auth.getUser();
  let query = supabase
    .from('purchase_batches')
    .select(`*, products(id, name)`)
    .eq('user_id', user?.id)
    .order('purchased_at', { ascending: false });

  if (productId) query = query.eq('product_id', productId);
  if (filters?.productId) query = query.eq('product_id', filters.productId);
  if (filters?.supplier) query = query.ilike('supplier', `%${filters.supplier}%`);
  if (filters?.dateFrom) query = query.gte('purchased_at', filters.dateFrom);
  if (filters?.dateTo) query = query.lte('purchased_at', filters.dateTo + 'T23:59:59');
  if (filters?.sortBy === 'amount_desc') query = query.order('cost_price', { ascending: false });
  else if (filters?.sortBy === 'amount_asc') query = query.order('cost_price', { ascending: true });
  else if (filters?.sortBy === 'qty_desc') query = query.order('quantity', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function listPurchasesByDateRange(from: string, to: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('purchase_batches')
    .select(`*, products(id, name)`)
    .eq('user_id', user?.id)
    .gte('purchased_at', from)
    .lte('purchased_at', to + 'T23:59:59')
    .order('purchased_at', { ascending: false });
  if (error) throw error;
  return data;
}
