import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';

import { ThemedText } from '@/components/themed-text';
import { colors, spacing, radius } from '@/constants/theme';
import { fmtCurrency } from '@/lib/format-num';
import type { Payment } from '@/types/app';

interface Props {
  payments: Payment[];
}

export function PaymentTimeline({ payments }: Props) {
  if (payments.length === 0) {
    return (
      <View style={styles.empty}>
        <ThemedText type="caption" color={colors.textTertiary}>
          No payments yet.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {payments.map((p, i) => (
        <View key={p.id} style={styles.row}>
          <View style={styles.timelineCol}>
            <View style={styles.dot} />
            {i < payments.length - 1 && <View style={styles.line} />}
          </View>
          <View style={styles.body}>
            <View style={styles.headerRow}>
              <ThemedText type="numericSm" color={colors.success}>
                {fmtCurrency(Number(p.amount))}
              </ThemedText>
              <ThemedText type="caption" color={colors.textTertiary}>
                {format(parseISO(p.paid_at), 'dd MMM yyyy')}
              </ThemedText>
            </View>
            <View style={styles.meta}>
              {p.method && (
                <View style={styles.metaItem}>
                  <Ionicons name="card-outline" size={11} color={colors.textTertiary} />
                  <ThemedText type="caption" color={colors.textSecondary}>{p.method}</ThemedText>
                </View>
              )}
              {p.note && (
                <View style={styles.metaItem}>
                  <Ionicons name="document-text-outline" size={11} color={colors.textTertiary} />
                  <ThemedText type="caption" color={colors.textSecondary} numberOfLines={1}>
                    {p.note}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing[2] },
  row: { flexDirection: 'row', gap: spacing[3] },
  timelineCol: { alignItems: 'center', width: 12 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    marginTop: 6,
  },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 2 },
  body: {
    flex: 1,
    paddingBottom: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    gap: 2,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing[3], rowGap: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  empty: { paddingVertical: spacing[3], alignItems: 'center' },
});
