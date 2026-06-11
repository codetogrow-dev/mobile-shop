import { supabase } from '@/lib/supabase';
import type { Payment, PaymentFormValues } from '@/types/app';

export async function listPayments(
  transactionType: 'sale' | 'purchase',
  transactionId: string,
): Promise<Payment[]> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', user?.id)
    .eq('transaction_type', transactionType)
    .eq('transaction_id', transactionId)
    .order('paid_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Payment[];
}

export async function recordPayment(args: {
  transactionType: 'sale' | 'purchase';
  transactionId: string;
  tenant_id: string;
  values: PaymentFormValues;
}): Promise<string> {
  const { data, error } = await supabase.rpc('record_payment', {
    p_transaction_type: args.transactionType,
    p_transaction_id: args.transactionId,
    p_amount: args.values.amount,
    p_paid_at: args.values.paid_at,
    p_method: args.values.method || null,
    p_note: args.values.note || null,
    p_tenant_id: args.tenant_id,
  });
  if (error) throw error;
  return data as string;
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase.from('payments').delete().eq('id', id);
  if (error) throw error;
}
