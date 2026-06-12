import { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { HeroKpi } from '@/components/ui/hero-kpi';
import { KpiGrid, type KpiItem } from '@/components/ui/kpi-grid';
import { BarChart } from '@/components/ui/bar-chart';
import { InsightStrip, type InsightChip } from '@/components/ui/insight-strip';
import { colors, spacing } from '@/constants/theme';
import { fmtRupee, fmtRupeeCompact } from '@/lib/format-num';
import { fmtKarachi, todayKarachi } from '@/lib/datetime';
import { QK } from '@/constants/query-keys';
import { listPurchasesByDateRange } from '@/api/purchases';
import type { ReportPeriod } from '@/components/ui/period-segment';

interface Props { period: ReportPeriod; year: number; month: number }

export function PurchasesPanel({ period, year, month }: Props) {
  const { from, to, label, todayDom, daysInMonth } = usePeriodRange(period, year, month);

  const { data } = useQuery({
    queryKey: ['reports', 'purchases', period, from, to],
    queryFn: () => listPurchasesByDateRange(from, to),
  });

  const rows = (data ?? []) as any[];
  const totalSpent = rows.reduce((s, r) => s + Number(r.cost_price) * Number(r.quantity), 0);
  const batches = rows.length;
  const units = rows.reduce((s, r) => s + Number(r.quantity ?? 0), 0);
  const avgBatch = batches > 0 ? totalSpent / batches : 0;
  const uniqueSuppliers = new Set(rows.map((r) => r.supplier_id).filter(Boolean)).size;

  // Bucket by day-of-month / month-of-year for the chart
  const series: number[] = useMemo(() => {
    if (period === 'daily') {
      // 7-day rolling window of total spend
      const buckets = new Array(7).fill(0);
      const today = new Date();
      rows.forEach((r) => {
        const d = new Date(r.purchased_at);
        const diff = Math.floor((today.getTime() - d.getTime()) / 86_400_000);
        if (diff >= 0 && diff < 7) buckets[6 - diff] += Number(r.cost_price) * Number(r.quantity);
      });
      return buckets;
    }
    if (period === 'monthly') {
      const buckets = new Array(daysInMonth).fill(0);
      rows.forEach((r) => {
        const d = new Date(r.purchased_at).getDate();
        buckets[d - 1] += Number(r.cost_price) * Number(r.quantity);
      });
      return buckets;
    }
    const buckets = new Array(12).fill(0);
    rows.forEach((r) => {
      const m = new Date(r.purchased_at).getMonth();
      buckets[m] += Number(r.cost_price) * Number(r.quantity);
    });
    return buckets;
  }, [rows, period, daysInMonth]);

  const max = Math.max(...series, 1);
  const bars = series.map((v, i) => ({
    label: chartLabel(period, i, todayDom, daysInMonth),
    value: v,
    max,
  }));

  // Top suppliers in the period — group by supplier_id
  const topSuppliers = useMemo(() => {
    const m = new Map<string, { name: string; total: number }>();
    rows.forEach((r) => {
      const sid = r.supplier_id;
      if (!sid) return;
      const name = r.suppliers?.name ?? '—';
      const cur = m.get(sid) ?? { name, total: 0 };
      cur.total += Number(r.cost_price) * Number(r.quantity);
      m.set(sid, cur);
    });
    return Array.from(m.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [rows]);

  const insights: InsightChip[] = [];
  if (rows.length > 0) {
    const biggest = rows.reduce((mx, r) => {
      const v = Number(r.cost_price) * Number(r.quantity);
      const mv = Number(mx.cost_price) * Number(mx.quantity);
      return v > mv ? r : mx;
    }, rows[0]);
    const bigVal = Number(biggest.cost_price) * Number(biggest.quantity);
    insights.push({
      id: 'biggest',
      icon: 'trophy-outline',
      tone: 'positive',
      text: `Biggest batch: ${biggest.suppliers?.name ?? 'unknown'} — ${fmtRupeeCompact(bigVal)}`,
    });
  }
  if (uniqueSuppliers > 0) {
    insights.push({
      id: 'suppliers',
      icon: 'business-outline',
      tone: 'info',
      text: `${uniqueSuppliers} supplier${uniqueSuppliers === 1 ? '' : 's'} active in this period`,
    });
  }
  if (rows.length === 0) {
    insights.push({ id: 'noop', icon: 'pause-circle-outline', tone: 'caution', text: 'No purchases recorded in this period' });
  }

  return (
    <View style={styles.body}>
      <HeroKpi
        label={`SPENT (${label.toUpperCase()})`}
        value={fmtRupee(totalSpent)}
        icon="cart-outline"
        accent={colors.info}
      />

      <KpiGrid items={[
        kpi('Batches', String(batches), 'layers-outline', colors.primary500, colors.primary50, batches, 'Number of separate purchase batches recorded.', false),
        kpi('Suppliers', String(uniqueSuppliers), 'business-outline', colors.info, colors.infoBg, uniqueSuppliers, 'Distinct suppliers you bought from.', false),
        kpi('Avg batch cost', fmtRupee(avgBatch), 'receipt-outline', colors.success, colors.successBg, avgBatch, 'Average money spent per purchase batch.'),
        kpi('Units bought', String(units), 'cube-outline', colors.warning, colors.warningBg, units, 'Total units across every batch.', false),
      ] as KpiItem[]} />

      <Card>
        <ThemedText type="h4" style={styles.cardTitle}>Spend trend</ThemedText>
        <BarChart bars={bars} compact={period !== 'daily'} />
      </Card>

      <InsightStrip items={insights} />

      {topSuppliers.length > 0 && (
        <Card>
          <ThemedText type="h4" style={styles.cardTitle}>Top suppliers</ThemedText>
          {topSuppliers.map((s, i) => (
            <View key={s.id} style={styles.row}>
              <View style={styles.rank}>
                <ThemedText type="caption" color={i === 0 ? colors.warning : colors.textTertiary}>
                  #{i + 1}
                </ThemedText>
              </View>
              <ThemedText type="body" numberOfLines={1} style={{ flex: 1 }}>{s.name}</ThemedText>
              <ThemedText type="numericSm" color={colors.info}>{fmtRupeeCompact(s.total)}</ThemedText>
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function usePeriodRange(period: ReportPeriod, year: number, month: number) {
  if (period === 'daily') {
    const tk = todayKarachi();
    const seven = new Date(); seven.setDate(seven.getDate() - 6);
    return {
      from: fmtKarachi(seven, 'yyyy-MM-dd'),
      to: tk,
      label: 'Last 7 days',
      todayDom: 7,
      daysInMonth: 7,
    };
  }
  if (period === 'monthly') {
    const last = new Date(year, month, 0).getDate();
    return {
      from: `${year}-${String(month).padStart(2, '0')}-01`,
      to: `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`,
      label: monthName(month) + ' ' + year,
      todayDom: new Date().getDate(),
      daysInMonth: last,
    };
  }
  return {
    from: `${year}-01-01`,
    to: `${year}-12-31`,
    label: String(year),
    todayDom: new Date().getMonth() + 1,
    daysInMonth: 12,
  };
}

function chartLabel(period: ReportPeriod, i: number, _todayDom: number, _daysInMonth: number): string {
  if (period === 'daily') {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return fmtKarachi(d, 'EEE');
  }
  if (period === 'monthly') return String(i + 1);
  return monthName(i + 1).slice(0, 1);
}

function monthName(m: number) {
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1] ?? '';
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
