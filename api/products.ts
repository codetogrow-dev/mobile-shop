import { supabase } from '@/lib/supabase';
import type { ProductFormValues, ProductFilters } from '@/types/app';
import { STOCK_FILTER, PRODUCT_SORT } from '@/constants/enums';

export async function listProducts(filters?: Partial<ProductFilters>) {
  const { data: { user } } = await supabase.auth.getUser();
  let query = supabase
    .from('products')
    .select(`*, categories(id, name, color_hex, icon)`)
    .eq('user_id', user?.id)
    .is('deleted_at', null)
    .eq('is_active', true);

  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }
  if (filters?.categoryIds && filters.categoryIds.length > 0) {
    query = query.in('category_id', filters.categoryIds);
  }
  switch (filters?.stockFilter) {
    case STOCK_FILTER.OUT:
      query = query.eq('current_stock', 0);
      break;
    case STOCK_FILTER.LOW:
    case STOCK_FILTER.OK:
      query = query.gt('current_stock', 0);
      break;
  }

  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte('created_at', filters.dateTo + 'T23:59:59');
  }

  let sortCol = 'name';
  switch (filters?.sortBy) {
    case PRODUCT_SORT.STOCK:   sortCol = 'current_stock'; break;
    case PRODUCT_SORT.UPDATED: sortCol = 'created_at'; break;
    default:                   sortCol = 'name'; break;
  }
  query = query.order(sortCol, { ascending: sortCol === 'name' });

  const { data, error } = await query;
  if (error) throw error;

  // Column-to-column comparison for low/ok — reorder_point varies per product row
  switch (filters?.stockFilter) {
    case STOCK_FILTER.LOW: return data.filter((p) => p.current_stock <= p.reorder_point);
    case STOCK_FILTER.OK:  return data.filter((p) => p.current_stock > p.reorder_point);
  }

  return data;
}


export async function listProductNames() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('products')
    .select('id, name')
    .eq('user_id', user?.id)
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data as { id: string; name: string }[];
}

export async function getProduct(id: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('products')
    .select(`*, categories(id, name, color_hex, icon)`)
    .eq('id', id)
    .eq('user_id', user?.id)
    .single();
  if (error) throw error;
  return data;
}

export async function createProduct(values: ProductFormValues & { tenant_id: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { initial_stock, purchase_price, sale_price, ...rest } = values;

  const { data: product, error } = await supabase
    .from('products')
    .insert({ ...rest, user_id: user?.id, current_stock: 0, is_active: true })
    .select()
    .single();
  if (error) throw error;

  // Record opening stock as a purchase batch if qty > 0 (prices default to 0 if not given)
  if (initial_stock && initial_stock > 0) {
    const { error: rpcError } = await supabase.rpc('record_purchase', {
      p_product_id: product.id,
      p_quantity: initial_stock,
      p_cost_price: purchase_price ?? 0,
      p_selling_price: sale_price ?? 0,
      p_supplier: null,
      p_notes: 'Opening stock',
      p_purchased_at: new Date().toISOString(),
      p_tenant_id: values.tenant_id,
    });
    if (rpcError) throw rpcError;
  }

  return product;
}

export async function updateProduct(id: string, values: Partial<ProductFormValues>) {
  // Strip fields that don't exist on the products table
  const { initial_stock, purchase_price, sale_price, ...productFields } = values as any;
  const { data, error } = await supabase
    .from('products')
    .update(productFields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function softDeleteProduct(id: string) {
  const { error } = await supabase
    .from('products')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', id);
  if (error) throw error;
}
