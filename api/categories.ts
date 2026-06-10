import { supabase } from '@/lib/supabase';

export async function listCategories() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user?.id)
    .order('name');
  if (error) throw error;
  return data;
}

export async function createCategory(
  name: string,
  colorHex: string,
  tenantId: string,
  parentId?: string | null,
) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('categories')
    .insert({
      name: name.trim(),
      color_hex: colorHex,
      tenant_id: tenantId,
      parent_id: parentId ?? null,
      user_id: user?.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(id: string, name: string, colorHex: string) {
  const { data, error } = await supabase
    .from('categories')
    .update({ name: name.trim(), color_hex: colorHex })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
