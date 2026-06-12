import { View, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { differenceInCalendarDays, parseISO } from 'date-fns';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { HeroKpi } from '@/components/ui/hero-kpi';
import { KpiGrid, type KpiItem } from '@/components/ui/kpi-grid';
import { BarChart } from '@/components/ui/bar-chart';
import { InsightStrip, type InsightChip } from '@/components/ui/insight-strip';
import { colors, spacing } from '@/constants/theme';
import { fmtRupee, fmtRupeeCompact } from '@/lib/format-num';
import { QK } from '@/constants/query-keys';
import {
  getReceivablesSummary, getPayablesSummary, getOverdueCount,
} from '@/api/dues';
import type { ReportPeriod } from '@/components/ui/period-segment';

interface Props { period: ReportPeriod; year: number; month: number }

export function DuesPanel(_props: Props) {
  const { data: receivables } = useQuery({
    queryKey: QK.dues.receivables,
    queryFn: getReceivablesSummary,
  });
  const { data: payables } = useQuery({
    queryKey: QK.dues.payables,
    queryFn: getPayablesSummary,
  });
  const { data: overdue } = useQuery({
    queryKey: QK.dues.overdueCount,
    queryFn: getOverdueCount,
    staleTime: 60_000,
  });

  const rec = receivables ?? [];
  const pay = payables ?? [];
  const totalReceivable = rec.reduce((s, r) => s + r.total_due, 0);
  const totalPayable    = pay.reduce((s, r) => s + r.total_due, 0);
  const overdueReceivable = rec.reduce((s, r) => s + r.overdue_amount, 0);
  const overduePayable    = pay.reduce((s, r) => s + r.overdue_amount, 0);
  const netDues = totalReceivable - totalPayable;
  const netIsPositive = netDues >= 0;

  // Oldest unpaid sale / purchase (days)
  const oldestRec = rec.reduce<string | null>((m, r) => {
    if (!r.oldest_due_date) return m;
    if (!m || new Date(r.oldest_due_date) < new Date(m)) return r.oldest_due_date;
    return m;
  }, null);
  const oldestPay = pay.reduce<string | null>((m, r) => {
    if (!r.oldest_due_date) return m;
    if (!m || new Date(r.oldest_due_date) < new Date(m)) return r.oldest_due_date;
    return m;
  }, null);
  const oldestRecDays = oldestRec ? differenceInCalendarDays(new Date(), parseISO(oldestRec)) : null;
  const oldestPayDays = oldestPay ? differenceInCalendarDays(new Date(), parseISO(oldestPay)) : null;

  // Top-3 each side
  const topDebtors = [...rec].sort((a, b) => b.total_due - a.total_due).slice(0, 3);
  const topOwedTo  = [...pay].sort((a, b) => b.total_due - a.total_due).slice(0, 3);

  // Bar chart — receivables vs payables, grouped (interleaved bars)
  const bars = [
    { label: 'Receiv.',  value: totalReceivable, max: Math.max(totalReceivable, totalPayable, 1) },
    { label: 'Payab.',   value: totalPayable,    max: Math.max(totalReceivable, totalPayable, 1) },
    { label: 'Over (R)', value: overdueReceivable, max: Math.max(totalReceivable, totalPayable, 1) },
    { label: 'Over (P)', value: overduePayable,    max: Math.max(totalReceivable, totalPayable, 1) },
  ];

  const insights: InsightChip[] = [];
  if (oldestRecDays && oldestRecDays > 0) {
    insights.push({
      id: 'oldest-rec',
      icon: 'hourglass-outline',
      tone: 'caution',
      text: `Oldest unpaid sale: ${oldestRecDays} day${oldestRecDays === 1 ? '' : 's'} old`,
    });
  }
  if (totalPayable > 0) {
    insights.push({
      id: 'cashflow',
      icon: 'cash-outline',
      tone: 'info',
      text: `Need ${fmtRupeeCompact(totalPayable)} cash to clear payables`,
    });
  }
  if ((overdue?.receivables_overdue ?? 0) === 0 && (overdue?.payables_overdue ?? 0) === 0) {
    insights.push({
      id: 'clear',
      icon: 'checkmark-done-circle-outline',
      tone: 'positive',
      text: 'No overdue items right now',
    });
  }

  return (
    <View style={styles.body}>
      <HeroKpi
        label="NET DUES"
        value={fmtRupee(Math.abs(netDues))}
        delta={netIsPositive
          ? 'People owe you more than you owe — healthy cashflow'
          : 'You owe more than people owe you'}
        trend={netIsPositive ? 'up' : 'down'}
        accent={netIsPositive ? colors.success : colors.danger}
        icon={netIsPositive ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
      />

      <KpiGrid items={[
        kpi('Receivables', fmtRupee(totalReceivable), 'arrow-down-circle-outline', colors.primary500, colors.primary50, totalReceivable, 'Total amount customers owe you across all unpaid sales.'),
        kpi('Payables', fmtRupee(totalPayable), 'arrow-up-circle-outline', colors.info, colors.infoBg, totalPayable, 'Total amount you owe suppliers across unpaid purchase batches.'),
        kpi('Overdue receiv.', String(overdue?.receivables_overdue ?? 0), 'alert-circle-outline', overdueReceivable > 0 ? colors.danger : colors.success, overdueReceivable > 0 ? colors.dangerBg : colors.successBg, overdue?.receivables_overdue ?? 0, 'Customers with at least one overdue sale.', false),
        kpi('Overdue payab.', String(overdue?.payables_overdue ?? 0), 'alert-circle-outline', overduePayable > 0 ? colors.danger : colors.success, overduePayable > 0 ? colors.dangerBg : colors.successBg, overdue?.payables_overdue ?? 0, 'Suppliers you have at least one overdue payment to.', false),
      ] as KpiItem[]} />

      <Card>
        <ThemedText type="h4" style={styles.cardTitle}>Receivables vs payables</ThemedText>
        <BarChart bars={bars} />
      </Card>

      <InsightStrip items={insights} />

      {topDebtors.length > 0 && (
        <Card>
          <ThemedText type="h4" style={styles.cardTitle}>Top debtors</ThemedText>
          {topDebtors.map((d, i) => (
            <View key={d.party_id} style={styles.row}>
              <View style={styles.rank}>
                <ThemedText type="caption" color={i === 0 ? colors.warning : colors.textTertiary}>
                  #{i + 1}
                </ThemedText>
              </View>
              <ThemedText
                type="body"
                numberOfLines={1}
                style={{ flex: 1 }}
                onPress={() => router.push(`/(app)/customer/${d.party_id}` as any)}
              >
                {d.name}
              </ThemedText>
              <ThemedText type="numericSm" color={colors.danger}>{fmtRupeeCompact(d.total_due)}</ThemedText>
            </View>
          ))}
        </Card>
      )}

      {topOwedTo.length > 0 && (
        <Card>
          <ThemedText type="h4" style={styles.cardTitle}>You owe most to</ThemedText>
          {topOwedTo.map((d, i) => (
            <View key={d.party_id} style={styles.row}>
              <View style={styles.rank}>
                <ThemedText type="caption" color={i === 0 ? colors.warning : colors.textTertiary}>
                  #{i + 1}
                </ThemedText>
              </View>
              <ThemedText
                type="body"
                numberOfLines={1}
                style={{ flex: 1 }}
                onPress={() => router.push(`/(app)/supplier/${d.party_id}` as any)}
              >
                {d.name}
              </ThemedText>
              <ThemedText type="numericSm" color={colors.info}>{fmtRupeeCompact(d.total_due)}</ThemedText>
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

function kpi(
  label: string,
  value: string,
  icon: keyof typeof Ionicons.glyphMap,
  accent: string,
  accentBg: string,
  rawValue: number,
  description: string,
  isCurrency = true,
): KpiItem {
  return { label, value, icon, accent, accentBg, rawValue, description, isCurrency };
}

const styles = StyleSheet.create({
  body: { padding: spacing[5], gap: spacing[4], paddingBottom: spacing[12] },
  cardTitle: { marginBottom: spacing[3] },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[2] },
  rank: {
    width: 28, height: 22, borderRadius: 6,
    backgroundColor: colors.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },
});
