import { supabase } from '@/lib/supabase';
import type { SupplierFormValues, Party } from '@/types/app';

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
