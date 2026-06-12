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
import { getSuppliersDashboardSummary, listSuppliersPage, listSuppliers } from '@/api/suppliers';
import { ValuedSupplierCard } from '@/views/suppliers/supplier-row';
import type { ReportPeriod } from '@/components/ui/period-segment';

interface Props { period: ReportPeriod; year: number; month: number }

export function SuppliersPanel(_props: Props) {
  const { data: summary } = useQuery({
    queryKey: QK.suppliers.dashboardSummary,
    queryFn: getSuppliersDashboardSummary,
    staleTime: 60_000,
  });

  const { data: top } = useQuery({
    queryKey: QK.suppliers.page('', 'spent'),
    queryFn: () => listSuppliersPage({ search: '', sort: 'spent', offset: 0, limit: 5 }),
  });

  const { data: allSuppliers } = useQuery({
    queryKey: QK.suppliers.list(),
    queryFn: () => listSuppliers(),
  });

  const all = allSuppliers ?? [];
  const topList = top?.rows ?? [];

  const lifetimeTotal = topList.reduce((s, c) => s + c.lifetime_purchased, 0);
  const batches = topList.reduce((s, c) => s + c.batch_count, 0);
  const avgBatch = batches > 0 ? lifetimeTotal / batches : 0;
  const openPayables = topList.reduce((s, c) => s + c.current_balance, 0);

  const monthBuckets = useMemo(() => {
    const buckets = new Array(12).fill(0);
    const yr = new Date().getFullYear();
    all.forEach((s) => {
      if (!s.created_at) return;
      const d = new Date(s.created_at);
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

  const insights: InsightChip[] = [];
  if (topList.length > 0) {
    const mostReliable = [...topList].sort((a, b) => b.batch_count - a.batch_count)[0];
    insights.push({
      id: 'reliable',
      icon: 'shield-checkmark-outline',
      tone: 'positive',
      text: `Most reliable supplier: ${mostReliable.name} (${mostReliable.batch_count} batches)`,
    });
  }
  if (openPayables > 0) {
    insights.push({
      id: 'payables',
      icon: 'wallet-outline',
      tone: 'caution',
      text: `${fmtRupeeCompact(openPayables)} open payables across top suppliers`,
    });
  }
  if (all.length === 0) {
    insights.push({ id: 'noop', icon: 'business-outline', tone: 'info', text: 'No suppliers added yet' });
  }

  return (
    <View style={styles.body}>
      <HeroKpi
        label="ACTIVE SUPPLIERS TODAY"
        value={String(summary?.active_today ?? 0)}
        delta={summary?.new_this_month ? `${summary.new_this_month} new this month` : undefined}
        trend="flat"
        icon="business-outline"
        accent={colors.info}
      />

      <KpiGrid items={[
        kpi('New (this month)', String(summary?.new_this_month ?? 0), 'add-circle-outline', colors.success, colors.successBg, summary?.new_this_month ?? 0, 'Suppliers added to the directory this month.', false),
        kpi('Total suppliers', String(all.length), 'people-outline', colors.primary500, colors.primary50, all.length, 'Every supplier in your directory.', false),
        kpi('Avg batch', fmtRupee(avgBatch), 'receipt-outline', colors.info, colors.infoBg, avgBatch, 'Average batch value across your top 5 suppliers.'),
        kpi('Open payables', fmtRupee(openPayables), 'wallet-outline', openPayables > 0 ? colors.danger : colors.success, openPayables > 0 ? colors.dangerBg : colors.successBg, openPayables, 'Total balance you still owe across your top suppliers.'),
      ] as KpiItem[]} />

      {topList.length > 0 && (
        <View>
          <View style={styles.titleRow}>
            <Ionicons name="ribbon" size={14} color={colors.info} />
            <ThemedText type="overline" color={colors.info}>VALUED SUPPLIERS</ThemedText>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
          >
            {topList.slice(0, 5).map((s) => (
              <ValuedSupplierCard
                key={s.id}
                item={s}
                onPress={() => router.push(`/(app)/supplier/${s.id}` as any)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {bars.length > 0 && monthBuckets.some((v) => v > 0) && (
        <Card>
          <ThemedText type="h4" style={styles.cardTitle}>New suppliers per month</ThemedText>
          <BarChart bars={bars} compact />
        </Card>
      )}

      {summary?.top_supplier_id && summary.top_supplier_name && (
        <Card
          onPress={() => router.push(`/(app)/supplier/${summary.top_supplier_id}` as any)}
          padded
        >
          <View style={styles.heroRow}>
            <View style={styles.heroIcon}>
              <Ionicons name="ribbon" size={18} color={colors.info} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="overline" color={colors.info}>TOP SUPPLIER THIS MONTH</ThemedText>
              <ThemedText type="h4" numberOfLines={1}>{summary.top_supplier_name}</ThemedText>
              <ThemedText type="caption" color={colors.textSecondary}>
                {fmtRupeeCompact(summary.top_supplier_total)} this month
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
    backgroundColor: colors.infoBg,
    alignItems: 'center', justifyContent: 'center',
  },
});
