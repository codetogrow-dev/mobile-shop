import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { fmtCurrency, fmtRupeeCompact, fmtPct } from '@/lib/format-num';
import { StatInfoModal } from '@/components/ui/stat-info-modal';
import { QK } from '@/constants/query-keys';
import { STOCK_FILTER } from '@/constants/enums';
import {
  getDailySummary, getTopProducts, getWeeklyRevenue,
  getOutOfStockCount, getMonthToDateSummary, getYesterdaySummary,
} from '@/api/reports';
import { listProducts } from '@/api/products';
import { KPIRow } from './kpi-row';
import { LowStockList } from './low-stock-list';
import { SparklineCard } from './sparkline-card';
import { OverdueBanner } from '@/views/dues/overdue-banner';
import { PeopleWidget } from './people-widget';
import { fmtKarachi, todayKarachi } from '@/lib/datetime';

const QUICK_ACTIONS = [
  { label: 'Add Sale', icon: 'receipt-outline', color: colors.primary500, route: '/(app)/add-sale' },
  { label: 'Purchase', icon: 'cart-outline', color: colors.info, route: '/(app)/add-purchase' },
  { label: 'Product', icon: 'cube-outline', color: colors.success, route: '/(app)/add-product' },
  { label: 'Reports', icon: 'bar-chart-outline', color: colors.warning, route: '/(app)/(tabs)/reports' },
] as const;

export default function DashboardView() {
  const insets = useSafeAreaInsets();
  const today = todayKarachi();

  const { data: daily, isLoading: dailyLoading, refetch: refetchDaily } = useQuery({
    queryKey: QK.reports.daily(today),
    queryFn: () => getDailySummary(today),
  });

  const { data: weeklyRevenue, refetch: refetchWeekly } = useQuery({
    queryKey: QK.reports.weeklyRevenue,
    queryFn: getWeeklyRevenue,
  });

  const { data: topProducts } = useQuery({
    queryKey: QK.reports.topProducts(today),
    queryFn: () => getTopProducts(today),
  });

  const { data: lowStockProducts, refetch: refetchLow } = useQuery({
    queryKey: QK.products.lowStock,
    queryFn: () => listProducts({ stockFilter: STOCK_FILTER.LOW }),
  });

  const lowStockCount = lowStockProducts?.length ?? 0;

  const { data: outOfStockCount } = useQuery({
    queryKey: QK.reports.outOfStockCount,
    queryFn: getOutOfStockCount,
  });

  const { data: mtd, refetch: refetchMtd } = useQuery({
    queryKey: QK.reports.monthToDate,
    queryFn: getMonthToDateSummary,
  });

  const { data: yesterday, refetch: refetchYesterday } = useQuery({
    queryKey: QK.reports.yesterday,
    queryFn: getYesterdaySummary,
  });

  const handleRefresh = () => {
    refetchDaily();
    refetchWeekly();
    refetchLow();
    refetchMtd();
    refetchYesterday();
  };

  const sparklineData = weeklyRevenue?.map((d) => d.revenue) ?? [];
  const weekTotal = weeklyRevenue?.reduce((s, d) => s + d.revenue, 0) ?? 0;

  const dailyRevenue = Number(daily?.total_revenue ?? 0);
  const dailyProfit = Number(daily?.gross_profit ?? 0);
  const dailyMargin = dailyRevenue > 0 ? (dailyProfit / dailyRevenue) * 100 : 0;

  const yesterdayRevenue = yesterday?.revenue ?? 0;
  const revVsYesterday = yesterdayRevenue > 0
    ? ((dailyRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
    : null;

  const mtdRevenue = mtd?.revenue ?? 0;
  const mtdProfit = mtd?.profit ?? 0;
  const mtdUnits = mtd?.units_sold ?? 0;
  const mtdActiveDays = mtd?.active_days ?? 0;

  type InfoModalKey = 'revenue' | 'profit' | 'txn' | 'lowstock' | 'outofstock' | 'margin' | 'mtd_revenue' | 'mtd_profit' | 'mtd_units' | 'yesterday';
  const [infoModal, setInfoModal] = useState<InfoModalKey | null>(null);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <View>
          <ThemedText type="caption" color={colors.textSecondary}>
            {fmtKarachi(new Date(), 'EEEE, dd MMM')}
          </ThemedText>
          <ThemedText type="h2">Dashboard</ThemedText>
        </View>
        <View style={styles.logoBox}>
          <Ionicons name="storefront" size={20} color={colors.primary500} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={dailyLoading} onRefresh={handleRefresh} tintColor={colors.primary500} />
        }
      >
        {/* ── Overdue dues banner (renders only when overdue exists) ── */}
        <OverdueBanner />

        {/* ── Today KPIs ── */}
        <ThemedText type="h4" style={styles.sectionLabel}>Today</ThemedText>
        <KPIRow
          items={[
            {
              label: "Revenue",
              value: fmtCurrency(dailyRevenue),
              change: revVsYesterday !== null ? `${revVsYesterday >= 0 ? '+' : ''}${revVsYesterday.toFixed(0)}% vs yesterday` : undefined,
              trend: dailyRevenue > 0 ? 'up' : 'neutral',
              icon: <Ionicons name="cash-outline" size={18} color={colors.primary500} />,
              iconBg: colors.primary50,
              onPress: () => setInfoModal('revenue'),
            },
            {
              label: "Profit",
              value: fmtCurrency(dailyProfit, true),
              trend: dailyProfit > 0 ? 'up' : dailyProfit < 0 ? 'down' : 'neutral',
              icon: <Ionicons name="trending-up-outline" size={18} color={colors.success} />,
              iconBg: colors.successBg,
              onPress: () => setInfoModal('profit'),
            },
          ]}
        />
        <KPIRow
          items={[
            {
              label: 'Margin',
              value: fmtPct(dailyMargin),
              trend: dailyMargin >= 20 ? 'up' : dailyMargin > 0 ? 'neutral' : 'down',
              icon: <Ionicons name="pie-chart-outline" size={18} color={colors.accent} />,
              iconBg: colors.primary50,
              onPress: () => setInfoModal('margin'),
            },
            {
              label: 'Transactions',
              value: String(daily?.transaction_count ?? 0),
              trend: 'neutral',
              icon: <Ionicons name="bag-check-outline" size={18} color={colors.info} />,
              iconBg: colors.infoBg,
              onPress: () => setInfoModal('txn'),
            },
          ]}
        />

        {/* ── Month to Date KPIs ── */}
        <ThemedText type="h4" style={styles.sectionLabel}>This Month</ThemedText>
        <KPIRow
          items={[
            {
              label: 'MTD Revenue',
              value: fmtCurrency(mtdRevenue),
              change: `${mtdActiveDays} active day${mtdActiveDays !== 1 ? 's' : ''}`,
              trend: mtdRevenue > 0 ? 'up' : 'neutral',
              icon: <Ionicons name="calendar-outline" size={18} color={colors.primary500} />,
              iconBg: colors.primary50,
              onPress: () => setInfoModal('mtd_revenue'),
            },
            {
              label: 'MTD Profit',
              value: fmtCurrency(mtdProfit, true),
              trend: mtdProfit > 0 ? 'up' : mtdProfit < 0 ? 'down' : 'neutral',
              icon: <Ionicons name="stats-chart-outline" size={18} color={colors.success} />,
              iconBg: colors.successBg,
              onPress: () => setInfoModal('mtd_profit'),
            },
          ]}
        />
        <KPIRow
          items={[
            {
              label: 'Units Sold (MTD)',
              value: String(mtdUnits),
              trend: mtdUnits > 0 ? 'up' : 'neutral',
              icon: <Ionicons name="cube-outline" size={18} color={colors.accent} />,
              iconBg: colors.primary50,
              onPress: () => setInfoModal('mtd_units'),
            },
            {
              label: 'Yesterday Revenue',
              value: fmtCurrency(yesterdayRevenue),
              trend: 'neutral',
              icon: <Ionicons name="time-outline" size={18} color={colors.info} />,
              iconBg: colors.infoBg,
              onPress: () => setInfoModal('yesterday'),
            },
          ]}
        />

        {/* ── Inventory KPIs ── */}
        <ThemedText type="h4" style={styles.sectionLabel}>Inventory</ThemedText>
        <KPIRow
          items={[
            {
              label: 'Low Stock Items',
              value: String(lowStockCount ?? 0),
              trend: (lowStockCount ?? 0) > 0 ? 'down' : 'neutral',
              icon: <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />,
              iconBg: colors.warningBg,
              onPress: () => setInfoModal('lowstock'),
            },
            {
              label: 'Out of Stock',
              value: String(outOfStockCount ?? 0),
              trend: (outOfStockCount ?? 0) > 0 ? 'down' : 'neutral',
              icon: <Ionicons name="close-circle-outline" size={18} color={colors.danger} />,
              iconBg: colors.dangerBg,
              onPress: () => setInfoModal('outofstock'),
            },
          ]}
        />

        {/* ── People (customers + suppliers analytics) ── */}
        <PeopleWidget />

        {/* ── Modals ── */}
        <StatInfoModal visible={infoModal === 'revenue'} onClose={() => setInfoModal(null)} label="Today's Revenue" description="Total money collected from all sales recorded today." value={dailyRevenue} icon="cash-outline" accentColor={colors.primary500} accentBg={colors.primary50} />
        <StatInfoModal visible={infoModal === 'profit'} onClose={() => setInfoModal(null)} label="Today's Profit" description="Gross profit for today — revenue minus cost of goods (FIFO)." value={dailyProfit} icon="trending-up-outline" accentColor={dailyProfit >= 0 ? colors.success : colors.danger} accentBg={dailyProfit >= 0 ? colors.successBg : colors.dangerBg} />
        <StatInfoModal visible={infoModal === 'margin'} onClose={() => setInfoModal(null)} label="Today's Margin" description="Gross profit as a percentage of today's revenue. A healthy retail margin is typically 20–40%." value={dailyMargin} isCurrency={false} icon="pie-chart-outline" accentColor={colors.accent} accentBg={colors.primary50} />
        <StatInfoModal visible={infoModal === 'txn'} onClose={() => setInfoModal(null)} label="Transactions Today" description="Number of individual sale transactions recorded today." value={daily?.transaction_count ?? 0} isCurrency={false} icon="bag-check-outline" accentColor={colors.info} accentBg={colors.infoBg} />
        <StatInfoModal visible={infoModal === 'mtd_revenue'} onClose={() => setInfoModal(null)} label="Month-to-Date Revenue" description={`Total revenue earned so far this month across ${mtdActiveDays} selling day${mtdActiveDays !== 1 ? 's' : ''}.`} value={mtdRevenue} icon="calendar-outline" accentColor={colors.primary500} accentBg={colors.primary50} />
        <StatInfoModal visible={infoModal === 'mtd_profit'} onClose={() => setInfoModal(null)} label="Month-to-Date Profit" description="Gross profit earned so far this month (revenue minus FIFO cost of goods sold)." value={mtdProfit} icon="stats-chart-outline" accentColor={mtdProfit >= 0 ? colors.success : colors.danger} accentBg={mtdProfit >= 0 ? colors.successBg : colors.dangerBg} />
        <StatInfoModal visible={infoModal === 'mtd_units'} onClose={() => setInfoModal(null)} label="Units Sold This Month" description="Total individual product units sold so far this month." value={mtdUnits} isCurrency={false} icon="cube-outline" accentColor={colors.accent} accentBg={colors.primary50} />
        <StatInfoModal visible={infoModal === 'yesterday'} onClose={() => setInfoModal(null)} label="Yesterday's Revenue" description="Total revenue from all sales recorded yesterday. Compare with today to spot trends." value={yesterdayRevenue} icon="time-outline" accentColor={colors.info} accentBg={colors.infoBg} />
        <StatInfoModal visible={infoModal === 'lowstock'} onClose={() => setInfoModal(null)} label="Low Stock Items" description="Products whose current stock is at or below their reorder point. Restock soon." value={lowStockCount ?? 0} isCurrency={false} icon="alert-circle-outline" accentColor={colors.warning} accentBg={colors.warningBg} />
        <StatInfoModal visible={infoModal === 'outofstock'} onClose={() => setInfoModal(null)} label="Out of Stock" description="Products with zero remaining stock. These cannot be sold until restocked." value={outOfStockCount ?? 0} isCurrency={false} icon="close-circle-outline" accentColor={colors.danger} accentBg={colors.dangerBg} />

        {/* Quick Actions — 2x2 grid */}
        <View>
          <ThemedText type="h4" style={styles.sectionLabel}>Quick Actions</ThemedText>
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((a) => (
              <TouchableOpacity
                key={a.label}
                style={styles.actionCard}
                onPress={() => router.push(a.route as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${a.color}18` }]}>
                  <Ionicons name={a.icon as any} size={24} color={a.color} />
                </View>
                <ThemedText type="caption" color={colors.textPrimary} style={styles.actionLabel}>
                  {a.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 7-Day Sparkline */}
        {sparklineData.length > 0 && (
          <SparklineCard
            title="7-Day Revenue"
            value={fmtCurrency(weekTotal)}
            data={sparklineData}
            trend={sparklineData[sparklineData.length - 1] >= sparklineData[0] ? 'up' : 'down'}
            change={`${Math.abs(Math.round(((sparklineData[sparklineData.length - 1] - sparklineData[0]) / Math.max(sparklineData[0], 1)) * 100))}%`}
          />
        )}

        {/* Top Sellers */}
        {(topProducts?.length ?? 0) > 0 && (
          <View>
            <ThemedText type="h4" style={styles.sectionLabel}>Top Sellers Today</ThemedText>
            <View style={styles.topCard}>
              {topProducts!.map((p, i) => (
                <View
                  key={p.product_id}
                  style={[styles.topRow, i < topProducts!.length - 1 && styles.topRowDivider]}
                >
                  <View style={[styles.rankBadge, { backgroundColor: i === 0 ? colors.warningBg : colors.bgElevated }]}>
                    <ThemedText type="caption" color={i === 0 ? colors.warning : colors.textTertiary}>
                      #{i + 1}
                    </ThemedText>
                  </View>
                  <ThemedText type="body" style={styles.topName} numberOfLines={1}>{p.name}</ThemedText>
                  <ThemedText type="caption" color={colors.textTertiary}>{p.units_sold} sold</ThemedText>
                  <ThemedText type="numericSm" color={colors.accent}>{fmtRupeeCompact(p.revenue)}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Low Stock */}
        <LowStockList
          items={
            lowStockProducts?.map((p) => ({
              id: p.id,
              name: String(p.name),
              current_stock: Number(p.current_stock),
              reorder_point: Number(p.reorder_point),
              sku: typeof p.sku === 'string' ? p.sku : '',
            })) ?? []
          }
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary50,
    borderWidth: 1.5,
    borderColor: colors.primary200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing[5],
    gap: spacing[5],
    paddingBottom: spacing[12],
  },
  sectionLabel: {
    marginBottom: spacing[3],
    color: colors.textSecondary,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  actionCard: {
    width: '47%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontWeight: '600',
    flex: 1,
  },
  topCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  topRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topName: { flex: 1 },
});
