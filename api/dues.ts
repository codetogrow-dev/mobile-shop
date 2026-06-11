import { supabase } from '@/lib/supabase';
import type { DuesPartySummary, DuesOverdueCount, OverduePerson } from '@/types/app';

export async function getReceivablesSummary(): Promise<DuesPartySummary[]> {
  const { data, error } = await supabase.rpc('dues_receivables_summary');
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    party_id: r.customer_id,
    name: r.name,
    phone: r.phone,
    total_due: Number(r.total_due ?? 0),
    overdue_amount: Number(r.overdue_amount ?? 0),
    oldest_due_date: r.oldest_due_date,
    transaction_count: Number(r.transaction_count ?? 0),
  }));
}

export async function getPayablesSummary(): Promise<DuesPartySummary[]> {
  const { data, error } = await supabase.rpc('dues_payables_summary');
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    party_id: r.supplier_id,
    name: r.name,
    phone: r.phone,
    total_due: Number(r.total_due ?? 0),
    overdue_amount: Number(r.overdue_amount ?? 0),
    oldest_due_date: r.oldest_due_date,
    transaction_count: Number(r.transaction_count ?? 0),
  }));
}

export async function getOverdueCount(): Promise<DuesOverdueCount> {
  const { data, error } = await supabase.rpc('dues_overdue_count');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    receivables_overdue: Number(row?.receivables_overdue ?? 0),
    payables_overdue:    Number(row?.payables_overdue ?? 0),
  };
}

export async function getOverduePeople(limit = 10): Promise<OverduePerson[]> {
  const { data, error } = await supabase.rpc('dues_overdue_people', { p_limit: limit });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    kind: r.kind,
    party_id: r.party_id,
    name: r.name,
    phone: r.phone,
    overdue_amount: Number(r.overdue_amount ?? 0),
    oldest_due_date: r.oldest_due_date,
    transaction_count: Number(r.transaction_count ?? 0),
  }));
}

export async function getReceivablesForCustomer(customerId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('sales')
    .select(`*, products(id, name)`)
    .eq('user_id', user?.id)
    .eq('customer_id', customerId)
    .gt('balance_due', 0)
    .order('due_date', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPayablesForSupplier(supplierId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('purchase_batches')
    .select(`*, products(id, name)`)
    .eq('user_id', user?.id)
    .eq('supplier_id', supplierId)
    .gt('balance_due', 0)
    .order('due_date', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}
