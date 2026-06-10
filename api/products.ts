import { supabase } from '@/lib/supabase';
import type { ProductFormValues, ProductFilters } from '@/types/app';

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
  if (filters?.stockFilter === 'out') {
    query = query.eq('current_stock', 0);
  } else if (filters?.stockFilter === 'low') {
    query = query.gt('current_stock', 0).lte('current_stock', 5);
  } else if (filters?.stockFilter === 'ok') {
    query = query.gt('current_stock', 5);
  }

  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte('created_at', filters.dateTo + 'T23:59:59');
  }

  const sortMap: Record<string, string> = {
    name: 'name',
    stock: 'current_stock',
    updated: 'updated_at',
  };
  const sortCol = sortMap[filters?.sortBy ?? 'name'] ?? 'name';
  query = query.order(sortCol, { ascending: sortCol === 'name' });

  const { data, error } = await query;
  if (error) throw error;
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
    .insert({ ...rest, user_id: user?.id, current_stock: 0 })
    .select()
    .single();
  if (error) throw error;

  // If opening stock + prices provided, record as a purchase batch (sets stock via RPC)
  if (initial_stock && initial_stock > 0 && purchase_price && sale_price) {
    const { error: rpcError } = await supabase.rpc('record_purchase', {
      p_product_id: product.id,
      p_quantity: initial_stock,
      p_cost_price: purchase_price,
      p_selling_price: sale_price,
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
  const { data, error } = await supabase
    .from('products')
    .update({ ...values, updated_at: new Date().toISOString() })
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
