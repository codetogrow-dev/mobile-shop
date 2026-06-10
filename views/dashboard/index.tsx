import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { ThemedText } from '@/components/themed-text';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { QK } from '@/constants/query-keys';
import { getDailySummary, getTopProducts, getWeeklyRevenue, getLowStockCount } from '@/api/reports';
import { listProducts } from '@/api/products';
import { KPIRow } from './kpi-row';
import { LowStockList } from './low-stock-list';
import { SparklineCard } from './sparkline-card';

const today = format(new Date(), 'yyyy-MM-dd');

const QUICK_ACTIONS = [
  { label: 'Add Sale', icon: 'receipt-outline', color: colors.primary500, route: '/(app)/add-sale' },
  { label: 'Purchase', icon: 'cart-outline', color: colors.info, route: '/(app)/add-purchase' },
  { label: 'Product', icon: 'cube-outline', color: colors.success, route: '/(app)/add-product' },
  { label: 'Reports', icon: 'bar-chart-outline', color: colors.warning, route: '/(app)/(tabs)/reports' },
] as const;

export default function DashboardView() {
  const insets = useSafeAreaInsets();

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
    queryFn: () => listProducts({ stockFilter: 'low' }),
  });

  const { data: lowStockCount } = useQuery({
    queryKey: ['low-stock-count'],
    queryFn: getLowStockCount,
  });

  const handleRefresh = () => {
    refetchDaily();
    refetchWeekly();
    refetchLow();
  };

  const sparklineData = weeklyRevenue?.map((d) => d.revenue) ?? [];
  const weekTotal = weeklyRevenue?.reduce((s, d) => s + d.revenue, 0) ?? 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <View>
          <ThemedText type="caption" color={colors.textSecondary}>
            {format(new Date(), 'EEEE, dd MMM')}
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
        {/* KPI Cards — 2 per row */}
        <KPIRow
          items={[
            {
              label: "Today's Revenue",
              value: `₨${Number(daily?.total_revenue ?? 0).toLocaleString()}`,
              trend: (daily?.total_revenue ?? 0) > 0 ? 'up' : 'neutral',
              icon: <Ionicons name="cash-outline" size={18} color={colors.primary500} />,
              iconBg: colors.primary50,
            },
            {
              label: "Today's Profit",
              value: `₨${Number(daily?.gross_profit ?? 0).toLocaleString()}`,
              trend: (daily?.gross_profit ?? 0) > 0 ? 'up' : (daily?.gross_profit ?? 0) < 0 ? 'down' : 'neutral',
              icon: <Ionicons name="trending-up-outline" size={18} color={colors.success} />,
              iconBg: colors.successBg,
            },
          ]}
        />
        <KPIRow
          items={[
            {
              label: 'Transactions',
              value: String(daily?.transaction_count ?? 0),
              trend: 'neutral',
              icon: <Ionicons name="bag-check-outline" size={18} color={colors.info} />,
              iconBg: colors.infoBg,
            },
            {
              label: 'Low Stock Items',
              value: String(lowStockCount ?? 0),
              trend: (lowStockCount ?? 0) > 0 ? 'down' : 'neutral',
              icon: <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />,
              iconBg: colors.warningBg,
            },
          ]}
        />

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
            value={`₨${weekTotal.toLocaleString()}`}
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
                  <ThemedText type="numericSm" color={colors.accent}>₨{p.revenue.toLocaleString()}</ThemedText>
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
              name: p.name,
              current_stock: p.current_stock,
              reorder_point: p.reorder_point,
              sku: p.sku ?? '',
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
