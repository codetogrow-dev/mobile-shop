import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { fmtKarachi, nowKarachiISO } from '@/lib/datetime';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { fmtCurrency, fmtRupeeCompact } from '@/lib/format-num';
import { paymentSchema, type PaymentFormValues } from '@/types/app';
import { recordPayment } from '@/api/payments';
import { QK } from '@/constants/query-keys';
import { useAuthStore } from '@/store/auth-store';

export default function RecordPaymentView() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const params = useLocalSearchParams<{
    transactionType: 'sale' | 'purchase';
    transactionId: string;
    maxAmount: string;
  }>();

  const maxAmount = Number(params.maxAmount ?? 0);

  const { control, handleSubmit, formState: { errors }, watch, setValue } =
    useForm<PaymentFormValues, any, PaymentFormValues>({
      resolver: zodResolver(paymentSchema) as any,
      defaultValues: {
        amount: maxAmount,
        // Karachi-stamped ISO so Postgres timestamptz round-trips as the
        // actual local moment, not UTC-misinterpreted.
        paid_at: nowKarachiISO(),
        method: 'cash',
        note: '',
      } as any,
    });

  const amountStr = String(watch('amount') ?? '');
  const amountNum = Number(amountStr) || 0;
  const overMax   = amountNum > maxAmount;

  const mutation = useMutation({
    mutationFn: (values: PaymentFormValues) =>
      recordPayment({
        transactionType: params.transactionType,
        transactionId: params.transactionId,
        tenant_id: (user as any)?.user_metadata?.tenant_id ?? user?.id ?? '',
        values,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.dues.all });
      qc.invalidateQueries({ queryKey: QK.payments.byTransaction(params.transactionType, params.transactionId) });
      if (params.transactionType === 'sale') {
        qc.invalidateQueries({ queryKey: QK.sales.all });
        qc.invalidateQueries({ queryKey: QK.sales.detail(params.transactionId) });
      } else {
        qc.invalidateQueries({ queryKey: QK.purchases.all });
        qc.invalidateQueries({ queryKey: QK.purchases.detail(params.transactionId) });
      }
      router.back();
    },
  });

  const onSubmit = (values: PaymentFormValues) => {
    if (overMax) return;
    mutation.mutate(values);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <ThemedText type="h3">Record Payment</ThemedText>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {mutation.error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <ThemedText type="caption" color={colors.danger}>
                {(mutation.error as any)?.message ?? 'Failed to record payment'}
              </ThemedText>
            </View>
          )}

          {/* Balance summary */}
          <Card>
            <View style={styles.balanceRow}>
              <ThemedText type="caption" color={colors.textTertiary}>Balance owed</ThemedText>
              <ThemedText type="numericLg" color={colors.danger}>
                {fmtCurrency(maxAmount)}
              </ThemedText>
            </View>
          </Card>

          <Card>
            <ThemedText type="h4" style={styles.sectionTitle}>Payment Details</ThemedText>

            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <Input
                  label="Amount Paid *"
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={String(field.value ?? '')}
                  onChangeText={field.onChange}
                  error={errors.amount?.message ?? (overMax ? `Cannot exceed ${fmtRupeeCompact(maxAmount)}` : undefined)}
                  leftIcon={<ThemedText type="caption" color={colors.textTertiary}>₨</ThemedText>}
                />
              )}
            />

            {/* Quick-fill chips */}
            <View style={styles.chips}>
              {[0.25, 0.5, 1].map((frac) => {
                const amt = Math.round(maxAmount * frac);
                return (
                  <TouchableOpacity
                    key={frac}
                    style={styles.chip}
                    onPress={() => setValue('amount', amt as any, { shouldValidate: true })}
                    activeOpacity={0.7}
                  >
                    <ThemedText type="caption" color={colors.primary600}>
                      {frac === 1 ? 'Full' : `${frac * 100}%`} · {fmtRupeeCompact(amt)}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Controller
              control={control}
              name="paid_at"
              render={({ field }) => {
                // Preserve the time + Karachi offset already stored on the
                // field so picking "yesterday" doesn't have its clock silently
                // overwritten with the current time. Fall back to current
                // Karachi time only when no time has been chosen yet.
                const currentTime = field.value?.includes('T')
                  ? field.value.split('T')[1]
                  : nowKarachiISO().split('T')[1];
                return (
                  <DatePickerField
                    label="Paid on"
                    value={field.value ? field.value.split('T')[0] : null}
                    onChange={(v) => field.onChange(v ? `${v}T${currentTime}` : '')}
                    placeholder="Pick a date"
                    maximumDate={new Date()}
                  />
                );
              }}
            />

            <Controller
              control={control}
              name="method"
              render={({ field }) => (
                <Input
                  label="Method (optional)"
                  placeholder="cash, bank, jazzcash…"
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                />
              )}
            />

            <Controller
              control={control}
              name="note"
              render={({ field }) => (
                <Input
                  label="Note (optional)"
                  placeholder="Anything to remember"
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                />
              )}
            />
          </Card>

          <Button
            label={`Record ${fmtRupeeCompact(amountNum)}`}
            onPress={handleSubmit(onSubmit)}
            loading={mutation.isPending}
            disabled={overMax || amountNum <= 0}
            fullWidth
            size="lg"
          />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  backBtn: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    borderRadius: 18, backgroundColor: colors.bgElevated,
  },
  content: { padding: spacing[5], gap: spacing[4], paddingBottom: spacing[10] },
  sectionTitle: { marginBottom: spacing[3] },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.dangerBg,
    borderRadius: radius.md,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.danger,
  },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[2] },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary200,
    backgroundColor: colors.primary50,
  },
});
