import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Input } from '@/components/ui/input';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { colors, spacing, radius } from '@/constants/theme';
import { fmtCurrency } from '@/lib/format-num';
import { PAYMENT_MODE } from '@/constants/enums';
import type { PaymentMode } from '@/types/app';

interface Props {
  total: number;
  mode: PaymentMode;
  onModeChange: (m: PaymentMode) => void;

  amountPaidStr: string;
  onAmountPaidChange: (v: string) => void;
  amountPaidError?: string;

  dueDate: string | null;
  onDueDateChange: (v: string | null) => void;
  dueDateError?: string;

  /** Optional words to swap "supplier"/"customer" terminology. */
  partyLabel: 'supplier' | 'customer';
}

const OPTIONS: { value: PaymentMode; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { value: PAYMENT_MODE.FULL,    label: 'Paid in full', icon: 'checkmark-circle', color: colors.success },
  { value: PAYMENT_MODE.PARTIAL, label: 'Partial',       icon: 'time-outline',     color: colors.warning },
  { value: PAYMENT_MODE.UNPAID,  label: 'On credit',     icon: 'wallet-outline',   color: colors.danger },
];

export function PaymentSection({
  total,
  mode,
  onModeChange,
  amountPaidStr,
  onAmountPaidChange,
  amountPaidError,
  dueDate,
  onDueDateChange,
  dueDateError,
  partyLabel,
}: Props) {
  const showAmount = mode === PAYMENT_MODE.PARTIAL;
  const showDueDate = mode !== PAYMENT_MODE.FULL;

  const paidNum = Number(amountPaidStr) || 0;
  const remaining =
    mode === PAYMENT_MODE.FULL ? 0
    : mode === PAYMENT_MODE.UNPAID ? total
    : Math.max(total - paidNum, 0);

  return (
    <View style={styles.wrapper}>
      <View style={styles.segment}>
        {OPTIONS.map((o) => {
          const active = mode === o.value;
          return (
            <TouchableOpacity
              key={o.value}
              style={[styles.segmentBtn, active && { backgroundColor: o.color + '14', borderColor: o.color }]}
              onPress={() => onModeChange(o.value)}
              activeOpacity={0.7}
            >
              <Ionicons name={o.icon} size={14} color={active ? o.color : colors.textTertiary} />
              <ThemedText
                type="caption"
                color={active ? o.color : colors.textSecondary}
                style={active ? { fontWeight: '700' } : undefined}
              >
                {o.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Summary line */}
      {total > 0 && (
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <ThemedText type="caption" color={colors.textTertiary}>Total</ThemedText>
            <ThemedText type="numericSm" color={colors.textPrimary}>{fmtCurrency(total)}</ThemedText>
          </View>
          <View style={styles.summaryRow}>
            <ThemedText type="caption" color={colors.textTertiary}>
              {mode === PAYMENT_MODE.FULL ? 'Paid' : 'Paid now'}
            </ThemedText>
            <ThemedText
              type="numericSm"
              color={colors.success}
            >
              {fmtCurrency(mode === PAYMENT_MODE.FULL ? total : mode === PAYMENT_MODE.UNPAID ? 0 : paidNum)}
            </ThemedText>
          </View>
          <View style={[styles.summaryRow, styles.summaryRowEm]}>
            <ThemedText type="caption" color={colors.textSecondary} style={{ fontWeight: '700' }}>
              {partyLabel === 'customer' ? 'Customer owes' : 'You owe'}
            </ThemedText>
            <ThemedText
              type="numeric"
              color={remaining > 0 ? colors.danger : colors.success}
            >
              {fmtCurrency(remaining)}
            </ThemedText>
          </View>
        </View>
      )}

      {showAmount && (
        <Input
          label="Amount Paid *"
          placeholder="0.00"
          keyboardType="numeric"
          value={amountPaidStr}
          onChangeText={onAmountPaidChange}
          error={amountPaidError}
          leftIcon={<ThemedText type="caption" color={colors.textTertiary}>₨</ThemedText>}
        />
      )}

      {showDueDate && (
        <View style={dueDateError ? styles.dueErrorWrap : undefined}>
          <DatePickerField
            label="Due date *"
            value={dueDate}
            onChange={onDueDateChange}
            placeholder="Pick a due date"
            minimumDate={new Date()}
          />
          {dueDateError && (
            <ThemedText type="caption" color={colors.danger} style={{ marginTop: spacing[1] }}>
              {dueDateError}
            </ThemedText>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing[3] },
  segment: { flexDirection: 'row', gap: spacing[2] },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[2] + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  summary: {
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryRowEm: {
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dueErrorWrap: { gap: 0 },
});
