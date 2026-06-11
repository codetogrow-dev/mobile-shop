import { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { DueAmountRow } from '@/components/ui/due-amount-row';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { fmtCurrency } from '@/lib/format-num';
import { QK } from '@/constants/query-keys';
import { DUES_TAB } from '@/constants/enums';

import { getReceivablesSummary, getPayablesSummary, getOverdueCount } from '@/api/dues';

type Tab = typeof DUES_TAB[keyof typeof DUES_TAB];

export default function DuesView() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>(DUES_TAB.RECEIVABLES);

  const receivablesQ = useQuery({
    queryKey: QK.dues.receivables,
    queryFn: getReceivablesSummary,
  });
  const payablesQ = useQuery({
    queryKey: QK.dues.payables,
    queryFn: getPayablesSummary,
  });
  const overdueQ = useQuery({
    queryKey: QK.dues.overdueCount,
    queryFn: getOverdueCount,
  });

  const isReceivables = tab === DUES_TAB.RECEIVABLES;
  const data = isReceivables ? receivablesQ.data : payablesQ.data;
  const loading = isReceivables ? receivablesQ.isLoading : payablesQ.isLoading;

  const totals = useMemo(() => {
    const list = data ?? [];
    const total   = list.reduce((s, p) => s + Number(p.total_due), 0);
    const overdue = list.reduce((s, p) => s + Number(p.overdue_amount), 0);
    return { total, overdue, count: list.length };
  }, [data]);

  const overdueBadgeReceivables = overdueQ.data?.receivables_overdue ?? 0;
  const overdueBadgePayables    = overdueQ.data?.payables_overdue ?? 0;

  const refetch = () => {
    receivablesQ.refetch();
    payablesQ.refetch();
    overdueQ.refetch();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <ThemedText type="h2">Dues</ThemedText>
          <ThemedText type="caption" color={colors.textSecondary}>
            Money owed to you and money you owe
          </ThemedText>
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <DuesTab
          active={isReceivables}
          label="Receivables"
          badge={overdueBadgeReceivables}
          onPress={() => setTab(DUES_TAB.RECEIVABLES)}
        />
        <DuesTab
          active={!isReceivables}
          label="Payables"
          badge={overdueBadgePayables}
          onPress={() => setTab(DUES_TAB.PAYABLES)}
        />
      </View>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: isReceivables ? colors.primary500 : colors.info }]}>
          <ThemedText type="overline" color={colors.textTertiary}>TOTAL DUE</ThemedText>
          <ThemedText type="h3" color={colors.textPrimary} numberOfLines={1}>
            {fmtCurrency(totals.total)}
          </ThemedText>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: totals.overdue > 0 ? colors.danger : colors.success }]}>
          <ThemedText type="overline" color={colors.textTertiary}>OVERDUE</ThemedText>
          <ThemedText type="h3" color={totals.overdue > 0 ? colors.danger : colors.success} numberOfLines={1}>
            {fmtCurrency(totals.overdue)}
          </ThemedText>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: colors.warning }]}>
          <ThemedText type="overline" color={colors.textTertiary}>PEOPLE</ThemedText>
          <ThemedText type="h3" color={colors.textPrimary}>{totals.count}</ThemedText>
        </View>
      </View>

      <FlashList
        data={data ?? []}
        keyExtractor={(item) => item.party_id}
        renderItem={({ item }) => (
          <DueAmountRow
            name={item.name}
            phone={item.phone}
            totalDue={Number(item.total_due)}
            overdueAmount={Number(item.overdue_amount)}
            oldestDueDate={item.oldest_due_date}
            transactionCount={Number(item.transaction_count)}
            onPress={() =>
              router.push(
                (isReceivables
                  ? `/(app)/customer/${item.party_id}`
                  : `/(app)/supplier/${item.party_id}`) as any,
              )
            }
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary500} />
        }
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Ionicons
              name={isReceivables ? 'happy-outline' : 'checkmark-done-circle-outline'}
              size={48}
              color={colors.success}
            />
            <ThemedText type="h4" color={colors.textPrimary}>All clear</ThemedText>
            <ThemedText type="caption" color={colors.textSecondary}>
              {isReceivables
                ? 'No customer owes you money right now.'
                : "You don't owe any supplier right now."}
            </ThemedText>
          </View>
        )}
      />
    </View>
  );
}

function DuesTab({
  active,
  label,
  badge,
  onPress,
}: {
  active: boolean;
  label: string;
  badge: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.tab, active && styles.tabActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <ThemedText
        type="caption"
        color={active ? colors.textInverse : colors.textSecondary}
        style={active ? { fontWeight: '700' } : undefined}
      >
        {label}
      </ThemedText>
      {badge > 0 && (
        <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
          <ThemedText
            type="overline"
            color={colors.textInverse}
            style={{ fontSize: 9 }}
          >
            {badge}
          </ThemedText>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[3],
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing[2],
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    borderRadius: radius.sm,
    backgroundColor: colors.bgElevated,
  },
  tabActive: {
    backgroundColor: colors.primary500,
  },
  tabBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeActive: {
    backgroundColor: colors.danger,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing[5],
    marginTop: spacing[4],
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[1],
    ...shadows.sm,
  },
  list: { paddingTop: spacing[1], paddingBottom: spacing[12] },
  empty: {
    alignItems: 'center',
    gap: spacing[2],
    paddingTop: spacing[12],
    paddingHorizontal: spacing[6],
  },
});
