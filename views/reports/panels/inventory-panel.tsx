import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
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
import { listProducts } from '@/api/products';
import type { ReportPeriod } from '@/components/ui/period-segment';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Props { period: ReportPeriod; year: number; month: number }

// Inventory is a snapshot — period/year/month are accepted for a uniform
// container signature but unused for now.
export function InventoryPanel(_props: Props) {
  // Inventory is mostly a *snapshot* metric — period is currently advisory.
  // We still display the same KPIs across periods; future revisions can
  // segment turnover ratio by period.
  const { data: products } = useQuery({
    queryKey: QK.products.list({ stockReport: true }),
    queryFn: () => listProducts(),
  });

  const list = (products ?? []) as any[];
  const stockValue = list.reduce(
    (s, p) => s + Number(p.current_stock ?? 0) * Number(p.purchase_price ?? 0),
    0,
  );
  const skuInStock = list.filter((p) => Number(p.current_stock ?? 0) > 0).length;
  const lowStock = list.filter(
    (p) => Number(p.current_stock ?? 0) > 0 && Number(p.current_stock ?? 0) <= Number(p.reorder_point ?? 0),
  ).length;
  const outOfStock = list.filter((p) => Number(p.current_stock ?? 0) === 0).length;

  // "Dead stock" = no updates in 30+ days AND still has stock. Approximation:
  // use `updated_at` (last touched). If unavailable, fall back to `created_at`.
  const thirtyDaysAgo = Date.now() - 30 * 86_400_000;
  const deadStock = list.filter((p) => {
    const stock = Number(p.current_stock ?? 0);
    if (stock <= 0) return false;
    const ts = p.updated_at ?? p.created_at;
    if (!ts) return false;
    return new Date(ts).getTime() < thirtyDaysAgo;
  }).length;

  // Stock value by category (top 6)
  const byCategory = useMemo(() => {
    const m = new Map<string, { name: string; total: number; color: string }>();
    list.forEach((p) => {
      const name = p.categories?.name ?? 'Uncategorised';
      const color = p.categories?.color_hex ?? colors.primary500;
      const val = Number(p.current_stock ?? 0) * Number(p.purchase_price ?? 0);
      const cur = m.get(name) ?? { name, total: 0, color };
      cur.total += val;
      m.set(name, cur);
    });
    return Array.from(m.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [list]);

  const max = Math.max(...byCategory.map((c) => c.total), 1);
  const bars = byCategory.map((c) => ({
    label: c.name.length > 6 ? c.name.slice(0, 6) + '…' : c.name,
    value: c.total,
    max,
  }));

  const insights: InsightChip[] = [];
  if (lowStock > 0) {
    insights.push({
      id: 'low',
      icon: 'alert-circle-outline',
      tone: 'caution',
      text: `${lowStock} SKU${lowStock === 1 ? '' : 's'} below reorder point`,
      onPress: () => router.push('/(app)/(tabs)/inventory' as any),
    });
  }
  if (outOfStock > 0) {
    insights.push({
      id: 'out',
      icon: 'close-circle-outline',
      tone: 'caution',
      text: `${outOfStock} SKU${outOfStock === 1 ? '' : 's'} out of stock`,
      onPress: () => router.push('/(app)/(tabs)/inventory' as any),
    });
  }
  if (deadStock > 0) {
    insights.push({
      id: 'dead',
      icon: 'time-outline',
      tone: 'info',
      text: `${deadStock} dead-stock SKU${deadStock === 1 ? '' : 's'} (30+ days idle)`,
    });
  }
  if (lowStock === 0 && outOfStock === 0 && deadStock === 0 && list.length > 0) {
    insights.push({
      id: 'healthy',
      icon: 'checkmark-circle-outline',
      tone: 'positive',
      text: 'Inventory healthy — no low or dead stock',
    });
  }

  return (
    <View style={styles.body}>
      <HeroKpi
        label="STOCK ON HAND"
        value={fmtRupee(stockValue)}
        delta={`${list.length} SKU${list.length === 1 ? '' : 's'} tracked`}
        trend="flat"
        icon="cube-outline"
      />

      <KpiGrid items={[
        kpi('SKUs in stock', String(skuInStock), 'apps-outline', colors.primary500, colors.primary50, skuInStock, 'Number of distinct products with at least one unit in stock.', false),
        kpi('Low stock', String(lowStock), 'alert-circle-outline', colors.warning, colors.warningBg, lowStock, 'Products at or below their reorder point. Restock soon.', false),
        kpi('Out of stock', String(outOfStock), 'close-circle-outline', colors.danger, colors.dangerBg, outOfStock, 'Products with zero current stock.', false),
        kpi('Dead stock', String(deadStock), 'time-outline', colors.info, colors.infoBg, deadStock, 'Products that still have stock but have not moved in 30+ days.', false),
      ] as KpiItem[]} />

      {bars.length > 0 && (
        <Card>
          <ThemedText type="h4" style={styles.cardTitle}>Stock value by category</ThemedText>
          <BarChart bars={bars} />
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

const styles = StyleSheet.create({
  body: { padding: spacing[5], gap: spacing[4], paddingBottom: spacing[12] },
  cardTitle: { marginBottom: spacing[3] },
});
