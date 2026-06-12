import { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { HeroKpi } from '@/components/ui/hero-kpi';
import { KpiGrid, type KpiItem } from '@/components/ui/kpi-grid';
import { BarChart } from '@/components/ui/bar-chart';
import { InsightStrip, type InsightChip } from '@/components/ui/insight-strip';
import { colors, spacing } from '@/constants/theme';
import { fmtRupee, fmtRupeeCompact } from '@/lib/format-num';
import { QK } from '@/constants/query-keys';
import { getCustomersDashboardSummary, listCustomersPage, listCustomers } from '@/api/customers';
import { ValuedCustomerCard } from '@/views/customers/customer-row';
import type { ReportPeriod } from '@/components/ui/period-segment';

interface Props { period: ReportPeriod; year: number; month: number }

// Customers panel mostly uses lifetime stats — period/year/month are accepted
// for a uniform container signature.
export function CustomersPanel(_props: Props) {
  const { data: summary } = useQuery({
    queryKey: QK.customers.dashboardSummary,
    queryFn: getCustomersDashboardSummary,
    staleTime: 60_000,
  });

  const { data: top } = useQuery({
    queryKey: QK.customers.page('', 'spent'),
    queryFn: () => listCustomersPage({ search: '', sort: 'spent', offset: 0, limit: 5 }),
  });

  // Need *all* customers to compute Pareto + signup buckets + retention. We
  // load a single full list (no pagination) — typical mobile-shop ranges
  // under a few thousand records.
  const { data: allCustomers } = useQuery({
    queryKey: QK.customers.list(),
    queryFn: () => listCustomers(),
  });

  const all = allCustomers ?? [];
  const topList = top?.rows ?? [];

  // KPIs ------------------------------------------------------------------
  const lifetimeTotal = topList.reduce((s, c) => s + c.lifetime_spent, 0);
  // Avg ticket / returning% need top-list visit data
  const visits = topList.reduce((s, c) => s + c.visit_count, 0);
  const avgTicket = visits > 0 ? lifetimeTotal / visits : 0;
  const returning = topList.filter((c) => c.visit_count > 1).length;
  const returningPct = topList.length > 0 ? (returning / topList.length) * 100 : 0;

  // Signups bucketed by month for the chart
  const monthBuckets = useMemo(() => {
    const buckets = new Array(12).fill(0);
    const yr = new Date().getFullYear();
    all.forEach((c) => {
      if (!c.created_at) return;
      const d = new Date(c.created_at);
      if (d.getFullYear() === yr) buckets[d.getMonth()] += 1;
    });
    return buckets;
  }, [all]);
  const max = Math.max(...monthBuckets, 1);
  const bars = monthBuckets.map((v, i) => ({
    label: monthName(i + 1).slice(0, 1),
    value: v,
    max,
  }));

  // Pareto: top 20% of customers' share of revenue
  const paretoText = useMemo(() => {
    if (topList.length < 5) return null;
    const sorted = [...topList].sort((a, b) => b.lifetime_spent - a.lifetime_spent);
    const total = sorted.reduce((s, c) => s + c.lifetime_spent, 0);
    if (total === 0) return null;
    const cutoff = Math.max(1, Math.ceil(sorted.length * 0.2));
    const topShare = sorted.slice(0, cutoff).reduce((s, c) => s + c.lifetime_spent, 0);
    return Math.round((topShare / total) * 100);
  }, [topList]);

  const insights: InsightChip[] = [];
  if (paretoText !== null) {
    insights.push({
      id: 'pareto',
      icon: 'analytics-outline',
      tone: 'info',
      text: `Top 20% of customers = ${paretoText}% of revenue`,
    });
  }
  // Churn risk: customers with no visit in 30+ days who used to visit
  const thirtyAgo = Date.now() - 30 * 86_400_000;
  const churnRisk = topList.filter(
    (c) => c.last_visit_at && new Date(c.last_visit_at).getTime() < thirtyAgo && c.visit_count >= 2,
  ).length;
  if (churnRisk > 0) {
    insights.push({
      id: 'churn',
      icon: 'walk-outline',
      tone: 'caution',
      text: `${churnRisk} regular${churnRisk === 1 ? '' : 's'} haven't visited in 30+ days`,
    });
  }
  if (all.length === 0) {
    insights.push({ id: 'noop', icon: 'person-add-outline', tone: 'info', text: 'No customers added yet' });
  }

  return (
    <View style={styles.body}>
      <HeroKpi
        label="CUSTOMERS SERVED TODAY"
        value={String(summary?.customers_today ?? 0)}
        delta={summary?.new_this_month ? `${summary.new_this_month} new this month` : undefined}
        trend="flat"
        icon="people-outline"
      />

      <KpiGrid items={[
        kpi('New (this month)', String(summary?.new_this_month ?? 0), 'person-add-outline', colors.success, colors.successBg, summary?.new_this_month ?? 0, 'Customers added to the directory this month.', false),
        kpi('Total customers', String(all.length), 'people-outline', colors.primary500, colors.primary50, all.length, 'Every customer in your directory.', false),
        kpi('Avg ticket', fmtRupee(avgTicket), 'receipt-outline', colors.info, colors.infoBg, avgTicket, 'Average spend per visit across your top 5 customers.'),
        kpi('Returning %', `${Math.round(returningPct)}%`, 'repeat-outline', colors.warning, colors.warningBg, returningPct, 'Share of top customers who have visited more than once.', false),
      ] as KpiItem[]} />

      {/* Valued customers carousel — lifted out of the customers list screen */}
      {topList.length > 0 && (
        <View>
          <View style={styles.titleRow}>
            <Ionicons name="trophy" size={14} color={colors.warning} />
            <ThemedText type="overline" color={colors.warning}>VALUED CUSTOMERS</ThemedText>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
          >
            {topList.slice(0, 5).map((c) => (
              <ValuedCustomerCard
                key={c.id}
                item={c}
                onPress={() => router.push(`/(app)/customer/${c.id}` as any)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {bars.length > 0 && monthBuckets.some((v) => v > 0) && (
        <Card>
          <ThemedText type="h4" style={styles.cardTitle}>New customers per month</ThemedText>
          <BarChart bars={bars} compact />
        </Card>
      )}

      {/* Top customer highlight */}
      {summary?.top_customer_id && summary.top_customer_name && (
        <Card
          onPress={() => router.push(`/(app)/customer/${summary.top_customer_id}` as any)}
          padded
        >
          <View style={styles.heroRow}>
            <View style={styles.heroIcon}>
              <Ionicons name="trophy" size={18} color={colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="overline" color={colors.warning}>TOP CUSTOMER THIS MONTH</ThemedText>
              <ThemedText type="h4" numberOfLines={1}>{summary.top_customer_name}</ThemedText>
              <ThemedText type="caption" color={colors.textSecondary}>
                {fmtRupeeCompact(summary.top_customer_total)} this month
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </View>
        </Card>
      )}

      <InsightStrip items={insights} />
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

function monthName(m: number) {
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1] ?? '';
}

const styles = StyleSheet.create({
  body: { padding: spacing[5], gap: spacing[4], paddingBottom: spacing[12] },
  cardTitle: { marginBottom: spacing[3] },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] },
  carousel: { gap: spacing[3], paddingRight: spacing[3] },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  heroIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.warningBg,
    alignItems: 'center', justifyContent: 'center',
  },
});
