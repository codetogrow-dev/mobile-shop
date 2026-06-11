import { supabase } from '@/lib/supabase';
import type { CustomerFormValues, Party } from '@/types/app';

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
