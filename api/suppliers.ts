import { supabase } from '@/lib/supabase';
import type {
  SupplierFormValues, Party,
  SupplierListRow, SupplierStats, SuppliersDashboardSummary,
  PartyListPage, PartyListSort,
} from '@/types/app';

export async function listSuppliers(search?: string): Promise<Party[]> {
  const { data: { user } } = await supabase.auth.getUser();
  let query = supabase
    .from('suppliers')
    .select('*')
    .eq('user_id', user?.id)
    .order('name', { ascending: true });
  if (search && search.trim()) query = query.ilike('name', `%${search.trim()}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Party[];
}

export async function getSupplier(id: string): Promise<Party> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .eq('user_id', user?.id)
    .single();
  if (error) throw error;
  return data as Party;
}

export async function createSupplier(values: SupplierFormValues & { tenant_id: string }): Promise<Party> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      user_id: user?.id,
      tenant_id: values.tenant_id,
      name: values.name.trim(),
      phone: values.phone?.trim() || null,
      cnic: values.cnic?.trim() || null,
      address: values.address?.trim() || null,
      notes: values.notes?.trim() || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Party;
}

export async function updateSupplier(id: string, values: Partial<SupplierFormValues>): Promise<Party> {
  const { data, error } = await supabase
    .from('suppliers')
    .update({
      ...(values.name !== undefined    ? { name: values.name.trim() } : {}),
      ...(values.phone !== undefined   ? { phone: values.phone?.trim() || null } : {}),
      ...(values.cnic !== undefined    ? { cnic: values.cnic?.trim() || null } : {}),
      ...(values.address !== undefined ? { address: values.address?.trim() || null } : {}),
      ...(values.notes !== undefined   ? { notes: values.notes?.trim() || null } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Party;
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) throw error;
}

// ─── Stats + paginated list ─────────────────────────────────────────────────

export async function getSupplierStats(supplierId: string): Promise<SupplierStats> {
  const { data, error } = await supabase.rpc('supplier_stats', { p_supplier_id: supplierId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    supplier_id:        row?.supplier_id ?? supplierId,
    lifetime_purchased: Number(row?.lifetime_purchased ?? 0),
    batch_count:        Number(row?.batch_count ?? 0),
    avg_batch:          Number(row?.avg_batch ?? 0),
    last_purchase_at:   row?.last_purchase_at ?? null,
    current_balance:    Number(row?.current_balance ?? 0),
  };
}

export async function listSuppliersPage(args: {
  search: string;
  sort: PartyListSort;
  offset: number;
  limit: number;
}): Promise<PartyListPage<SupplierListRow>> {
  const { data, error } = await supabase.rpc('suppliers_list_page', {
    p_search: args.search || null,
    p_sort:   args.sort,
    p_offset: args.offset,
    p_limit:  args.limit,
  });
  if (error) throw error;
  const rows: SupplierListRow[] = (data ?? []).map((r: any) => ({
    id:                 r.id,
    name:               r.name,
    phone:              r.phone,
    cnic:               r.cnic,
    address:            r.address,
    notes:              r.notes,
    created_at:         r.created_at,
    updated_at:         r.created_at,
    lifetime_purchased: Number(r.lifetime_purchased ?? 0),
    batch_count:        Number(r.batch_count ?? 0),
    avg_batch:          Number(r.avg_batch ?? 0),
    last_purchase_at:   r.last_purchase_at,
    current_balance:    Number(r.current_balance ?? 0),
  }));
  const total_count = data && data.length > 0 ? Number(data[0].total_count) : 0;
  const fetched = args.offset + rows.length;
  const next_offset = fetched < total_count ? fetched : null;
  return { rows, total_count, next_offset };
}

export async function getSuppliersDashboardSummary(): Promise<SuppliersDashboardSummary> {
  const { data, error } = await supabase.rpc('suppliers_dashboard_summary');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    active_today:       Number(row?.active_today ?? 0),
    new_this_month:     Number(row?.new_this_month ?? 0),
    top_supplier_id:    row?.top_supplier_id ?? null,
    top_supplier_name:  row?.top_supplier_name ?? null,
    top_supplier_total: Number(row?.top_supplier_total ?? 0),
  };
}
