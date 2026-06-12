import { supabase } from '@/lib/supabase';
import type { SaleFormValues, SaleFilters } from '@/types/app';
import { TRANSACTION_SORT, PAYMENT_MODE, PAYMENT_STATUS_FILTER } from '@/constants/enums';
import { fmtKarachi } from '@/lib/datetime';

function initialPaymentFor(values: SaleFormValues): number | null {
  const total = Number(values.quantity) * Number(values.sale_price_per_unit);
  if (values.payment_mode === PAYMENT_MODE.FULL)    return total;
  if (values.payment_mode === PAYMENT_MODE.UNPAID)  return 0;
  return Number(values.amount_paid ?? 0);
}

export async function createSale(values: SaleFormValues & { tenant_id: string }) {
  const { data, error } = await supabase.rpc('record_sale', {
    p_product_id: values.product_id,
    p_quantity: values.quantity,
    p_sale_price: values.sale_price_per_unit,
    p_notes: values.notes ?? null,
    p_sold_at: values.sold_at,
    p_tenant_id: values.tenant_id,
    p_customer_id: values.customer_id ?? null,
    p_initial_payment: initialPaymentFor(values),
    p_due_date: values.due_date ?? null,
  });
  if (error) throw error;
  return data;
}

export async function listSales(productId?: string, filters?: Partial<SaleFilters>) {
  const { data: { user } } = await supabase.auth.getUser();
  let query = supabase
    .from('sales')
    .select(`*, products(id, name), customers(id, name, phone)`)
    .eq('user_id', user?.id)
    .order('sold_at', { ascending: false });

  if (productId) query = query.eq('product_id', productId);
  if (filters?.productId) query = query.eq('product_id', filters.productId);
  if (filters?.dateFrom) query = query.gte('sold_at', filters.dateFrom);
  if (filters?.dateTo) query = query.lte('sold_at', filters.dateTo + 'T23:59:59');
  switch (filters?.paymentStatus) {
    case PAYMENT_STATUS_FILTER.PAID:    query = query.eq('payment_status', 'paid'); break;
    case PAYMENT_STATUS_FILTER.PARTIAL: query = query.eq('payment_status', 'partial'); break;
    case PAYMENT_STATUS_FILTER.UNPAID:  query = query.eq('payment_status', 'unpaid'); break;
    case PAYMENT_STATUS_FILTER.OVERDUE: {
      // Compare against today's Karachi-local date so overdue thresholds
      // match the user's wall clock.
      const todayKr = fmtKarachi(new Date(), 'yyyy-MM-dd');
      query = query.gt('balance_due', 0).not('due_date', 'is', null).lt('due_date', todayKr);
      break;
    }
  }
  switch (filters?.sortBy) {
    case TRANSACTION_SORT.AMOUNT_DESC: query = query.order('total_revenue', { ascending: false }); break;
    case TRANSACTION_SORT.AMOUNT_ASC:  query = query.order('total_revenue', { ascending: true });  break;
    case TRANSACTION_SORT.QTY_DESC:    query = query.order('quantity',      { ascending: false }); break;
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function listSalesByDateRange(from: string, to: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('sales')
    .select(`*, products(id, name), customers(id, name)`)
    .eq('user_id', user?.id)
    .gte('sold_at', from)
    .lte('sold_at', to + 'T23:59:59')
    .order('sold_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getSale(id: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('sales')
    .select(`*, products(id, name), customers(id, name, phone, cnic, address)`)
    .eq('id', id)
    .eq('user_id', user?.id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateSale(
  id: string,
  values: {
    quantity?: number;
    sale_price_per_unit?: number;
    notes?: string | null;
    sold_at?: string;
    customer_id?: string | null;
    due_date?: string | null;
  },
) {
  const { data, error } = await supabase
    .from('sales')
    .update(values)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSale(id: string) {
  const { error } = await supabase.rpc('delete_sale', { p_sale_id: id });
  if (error) throw error;
}
