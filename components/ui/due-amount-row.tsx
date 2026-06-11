import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { colors, spacing, radius } from '@/constants/theme';
import { fmtCurrency } from '@/lib/format-num';

interface Props {
  name: string;
  phone: string | null;
  totalDue: number;
  overdueAmount: number;
  oldestDueDate: string | null;
  transactionCount: number;
  onPress: () => void;
}

export function DueAmountRow({
  name,
  phone,
  totalDue,
  overdueAmount,
  oldestDueDate,
  transactionCount,
  onPress,
}: Props) {
  const isOverdue = overdueAmount > 0;
  const daysOverdue = oldestDueDate
    ? differenceInCalendarDays(new Date(), parseISO(oldestDueDate))
    : 0;

  return (
    <Card onPress={onPress} padded style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.avatar, isOverdue && styles.avatarOverdue]}>
          <ThemedText
            type="h4"
            color={isOverdue ? colors.danger : colors.primary600}
          >
            {name.charAt(0).toUpperCase()}
          </ThemedText>
        </View>

        <View style={styles.middle}>
          <View style={styles.nameRow}>
            <ThemedText type="h4" numberOfLines={1} style={{ flex: 1 }}>
              {name}
            </ThemedText>
            {isOverdue && (
              <Badge label={daysOverdue > 0 ? `${daysOverdue}d overdue` : 'Overdue'} variant="danger" dot />
            )}
          </View>
          <View style={styles.meta}>
            {phone && (
              <View style={styles.metaItem}>
                <Ionicons name="call-outline" size={11} color={colors.textTertiary} />
                <ThemedText type="caption" color={colors.textTertiary}>{phone}</ThemedText>
              </View>
            )}
            <View style={styles.metaItem}>
              <Ionicons name="receipt-outline" size={11} color={colors.textTertiary} />
              <ThemedText type="caption" color={colors.textTertiary}>
                {transactionCount} txn{transactionCount === 1 ? '' : 's'}
              </ThemedText>
            </View>
            {oldestDueDate && (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={11} color={colors.textTertiary} />
                <ThemedText type="caption" color={colors.textTertiary}>
                  due {format(parseISO(oldestDueDate), 'd MMM')}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        <View style={styles.amountCol}>
          <ThemedText type="numeric" color={isOverdue ? colors.danger : colors.textPrimary}>
            {fmtCurrency(totalDue)}
          </ThemedText>
          {isOverdue && overdueAmount < totalDue && (
            <ThemedText type="caption" color={colors.danger}>
              {fmtCurrency(overdueAmount)} overdue
            </ThemedText>
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: spacing[5], marginBottom: spacing[3] },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverdue: { backgroundColor: colors.dangerBg },
  middle: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  meta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing[3], rowGap: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  amountCol: { alignItems: 'flex-end', gap: 2 },
});
