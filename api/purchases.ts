import { supabase } from '@/lib/supabase';
import type { PurchaseFormValues, PurchaseFilters } from '@/types/app';
import { TRANSACTION_SORT, PAYMENT_MODE, PAYMENT_STATUS_FILTER } from '@/constants/enums';

function initialPaymentFor(values: PurchaseFormValues): number {
  const total = Number(values.quantity) * Number(values.cost_price);
  if (values.payment_mode === PAYMENT_MODE.FULL)    return total;
  if (values.payment_mode === PAYMENT_MODE.UNPAID)  return 0;
  return Number(values.amount_paid ?? 0);
}

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
    p_supplier_id: values.supplier_id ?? null,
    p_initial_payment: initialPaymentFor(values),
    p_due_date: values.due_date ?? null,
  });
  if (error) throw error;
  return data;
}

export async function listPurchases(productId?: string, filters?: Partial<PurchaseFilters>) {
  const { data: { user } } = await supabase.auth.getUser();
  let query = supabase
    .from('purchase_batches')
    .select(`*, products(id, name), suppliers(id, name, phone)`)
    .eq('user_id', user?.id)
    .order('purchased_at', { ascending: false });

  if (productId) query = query.eq('product_id', productId);
  if (filters?.productId) query = query.eq('product_id', filters.productId);
  if (filters?.supplier) query = query.ilike('supplier', `%${filters.supplier}%`);
  if (filters?.dateFrom) query = query.gte('purchased_at', filters.dateFrom);
  if (filters?.dateTo) query = query.lte('purchased_at', filters.dateTo + 'T23:59:59');
  switch (filters?.paymentStatus) {
    case PAYMENT_STATUS_FILTER.PAID:    query = query.eq('payment_status', 'paid'); break;
    case PAYMENT_STATUS_FILTER.PARTIAL: query = query.eq('payment_status', 'partial'); break;
    case PAYMENT_STATUS_FILTER.UNPAID:  query = query.eq('payment_status', 'unpaid'); break;
    case PAYMENT_STATUS_FILTER.OVERDUE:
      query = query.gt('balance_due', 0).not('due_date', 'is', null).lt('due_date', new Date().toISOString().slice(0, 10));
      break;
  }
  switch (filters?.sortBy) {
    case TRANSACTION_SORT.AMOUNT_DESC: query = query.order('cost_price', { ascending: false }); break;
    case TRANSACTION_SORT.AMOUNT_ASC:  query = query.order('cost_price', { ascending: true });  break;
    case TRANSACTION_SORT.QTY_DESC:    query = query.order('quantity',   { ascending: false }); break;
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getPurchase(id: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('purchase_batches')
    .select(`*, products(id, name), suppliers(id, name, phone, cnic, address)`)
    .eq('id', id)
    .eq('user_id', user?.id)
    .single();
  if (error) throw error;
  return data;
}

export async function updatePurchase(
  id: string,
  values: {
    cost_price?: number;
    selling_price?: number;
    supplier?: string | null;
    supplier_id?: string | null;
    notes?: string | null;
    purchased_at?: string;
    due_date?: string | null;
  },
) {
  const { data, error } = await supabase
    .from('purchase_batches')
    .update(values)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePurchase(id: string) {
  const { error } = await supabase.rpc('delete_purchase', { p_purchase_id: id });
  if (error) throw error;
}

export async function listPurchasesByDateRange(from: string, to: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('purchase_batches')
    .select(`*, products(id, name), suppliers(id, name)`)
    .eq('user_id', user?.id)
    .gte('purchased_at', from)
    .lte('purchased_at', to + 'T23:59:59')
    .order('purchased_at', { ascending: false });
  if (error) throw error;
  return data;
}
