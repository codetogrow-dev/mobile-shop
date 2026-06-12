import { supabase } from '@/lib/supabase';
import type {
  CustomerFormValues, Party,
  CustomerListRow, CustomerStats, CustomersDashboardSummary,
  PartyListPage, PartyListSort,
} from '@/types/app';

export async function listCustomers(search?: string): Promise<Party[]> {
  const { data: { user } } = await supabase.auth.getUser();
  let query = supabase
    .from('customers')
    .select('*')
    .eq('user_id', user?.id)
    .order('name', { ascending: true });
  if (search && search.trim()) query = query.ilike('name', `%${search.trim()}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Party[];
}

export async function getCustomer(id: string): Promise<Party> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('user_id', user?.id)
    .single();
  if (error) throw error;
  return data as Party;
}

export async function createCustomer(values: CustomerFormValues & { tenant_id: string }): Promise<Party> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('customers')
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

export async function updateCustomer(id: string, values: Partial<CustomerFormValues>): Promise<Party> {
  const { data, error } = await supabase
    .from('customers')
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

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
}

// ─── Stats + paginated list ─────────────────────────────────────────────────

export async function getCustomerStats(customerId: string): Promise<CustomerStats> {
  const { data, error } = await supabase.rpc('customer_stats', { p_customer_id: customerId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    customer_id:     row?.customer_id ?? customerId,
    lifetime_spent:  Number(row?.lifetime_spent ?? 0),
    visit_count:     Number(row?.visit_count ?? 0),
    avg_ticket:      Number(row?.avg_ticket ?? 0),
    last_visit_at:   row?.last_visit_at ?? null,
    current_balance: Number(row?.current_balance ?? 0),
  };
}

export async function listCustomersPage(args: {
  search: string;
  sort: PartyListSort;
  offset: number;
  limit: number;
}): Promise<PartyListPage<CustomerListRow>> {
  const { data, error } = await supabase.rpc('customers_list_page', {
    p_search: args.search || null,
    p_sort:   args.sort,
    p_offset: args.offset,
    p_limit:  args.limit,
  });
  if (error) throw error;
  const rows: CustomerListRow[] = (data ?? []).map((r: any) => ({
    id:              r.id,
    name:            r.name,
    phone:           r.phone,
    cnic:            r.cnic,
    address:         r.address,
    notes:           r.notes,
    created_at:      r.created_at,
    updated_at:      r.created_at, // not selected; harmless duplicate
    lifetime_spent:  Number(r.lifetime_spent ?? 0),
    visit_count:     Number(r.visit_count ?? 0),
    avg_ticket:      Number(r.avg_ticket ?? 0),
    last_visit_at:   r.last_visit_at,
    current_balance: Number(r.current_balance ?? 0),
  }));
  const total_count = data && data.length > 0 ? Number(data[0].total_count) : 0;
  const fetched = args.offset + rows.length;
  const next_offset = fetched < total_count ? fetched : null;
  return { rows, total_count, next_offset };
}

export async function getCustomersDashboardSummary(): Promise<CustomersDashboardSummary> {
  const { data, error } = await supabase.rpc('customers_dashboard_summary');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    customers_today:    Number(row?.customers_today ?? 0),
    new_this_month:     Number(row?.new_this_month ?? 0),
    top_customer_id:    row?.top_customer_id ?? null,
    top_customer_name:  row?.top_customer_name ?? null,
    top_customer_total: Number(row?.top_customer_total ?? 0),
  };
}
