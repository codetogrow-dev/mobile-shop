import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { QK } from '@/constants/query-keys';
import { getDailySummary, getMonthlySummary, getWeeklyRevenue } from '@/api/reports';

type ReportMode = 'daily' | 'monthly';

const today = format(new Date(), 'yyyy-MM-dd');
const nowYear = new Date().getFullYear();
const nowMonth = new Date().getMonth() + 1;

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={statStyles.card}>
      <ThemedText type="caption" color={colors.textSecondary}>{label}</ThemedText>
      <ThemedText type="numeric" color={color ?? colors.accent}>{value}</ThemedText>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[4],
    gap: spacing[1],
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
});

export default function ReportsView() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<ReportMode>('daily');

  const { data: daily, isLoading: dailyLoading, refetch: refetchDaily } = useQuery({
    queryKey: QK.reports.daily(today),
    queryFn: () => getDailySummary(today),
    enabled: mode === 'daily',
  });

  const { data: monthly, isLoading: monthlyLoading, refetch: refetchMonthly } = useQuery({
    queryKey: QK.reports.monthly(nowYear, nowMonth),
    queryFn: () => getMonthlySummary(nowYear, nowMonth),
    enabled: mode === 'monthly',
  });

  const { data: weeklyRevenue } = useQuery({
    queryKey: QK.reports.weeklyRevenue,
    queryFn: getWeeklyRevenue,
  });

  const isLoading = mode === 'daily' ? dailyLoading : monthlyLoading;
  const refetch = mode === 'daily' ? refetchDaily : refetchMonthly;

  const summary = mode === 'daily' ? daily : monthly;
  const maxRevenue = Math.max(...(weeklyRevenue?.map((d) => d.revenue) ?? [1]), 1);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ThemedText type="h2">Reports</ThemedText>
      </View>

      {/* Mode Toggle */}
      <View style={styles.toggleRow}>
        {(['daily', 'monthly'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
            onPress={() => setMode(m)}
            activeOpacity={0.8}
          >
            <ThemedText type="caption" color={mode === m ? colors.textInverse : colors.textSecondary}>
              {m === 'daily' ? 'Today' : 'This Month'}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary500} />}
      >
        {/* Summary Stats */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Revenue"
            value={`₨${Number(summary?.total_revenue ?? 0).toLocaleString()}`}
            color={colors.accent}
          />
          <StatCard
            label="Profit"
            value={`₨${Number(summary?.gross_profit ?? 0).toLocaleString()}`}
            color={Number(summary?.gross_profit ?? 0) >= 0 ? colors.success : colors.danger}
          />
        </View>
        <View style={styles.statsGrid}>
          <StatCard
            label="Cost"
            value={`₨${Number(summary?.total_cost ?? 0).toLocaleString()}`}
            color={colors.textPrimary}
          />
          <StatCard
            label="Transactions"
            value={String(summary?.transaction_count ?? 0)}
            color={colors.info}
          />
        </View>

        {/* Profit Margin */}
        {(summary?.total_revenue ?? 0) > 0 && (
          <Card>
            <View style={styles.marginRow}>
              <ThemedText type="body" color={colors.textSecondary}>Profit Margin</ThemedText>
              <ThemedText type="numeric" color={colors.success}>
                {(((summary?.gross_profit ?? 0) / (summary?.total_revenue ?? 1)) * 100).toFixed(1)}%
              </ThemedText>
            </View>
            <View style={styles.progressBg}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(
                      Math.max(((summary?.gross_profit ?? 0) / (summary?.total_revenue ?? 1)) * 100, 0),
                      100
                    )}%`,
                  },
                ]}
              />
            </View>
          </Card>
        )}

        {/* 7-Day Revenue Chart */}
        {weeklyRevenue && weeklyRevenue.length > 0 && (
          <Card>
            <ThemedText type="h4" style={styles.chartTitle}>Last 7 Days — Revenue</ThemedText>
            <View style={styles.barChart}>
              {weeklyRevenue.map((d, i) => (
                <View key={i} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { height: `${Math.max((d.revenue / maxRevenue) * 100, 4)}%` },
                      ]}
                    />
                  </View>
                  <ThemedText type="caption" color={colors.textTertiary} style={styles.barLabel}>
                    {format(new Date(d.date), 'EEE')}
                  </ThemedText>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Monthly breakdown (daily rows) */}
        {mode === 'monthly' && monthly?.daily_breakdown && monthly.daily_breakdown.length > 0 && (
          <Card>
            <ThemedText type="h4" style={styles.chartTitle}>Daily Breakdown</ThemedText>
            {monthly.daily_breakdown.map((d) => (
              <View key={d.date} style={styles.breakdownRow}>
                <ThemedText type="caption" color={colors.textSecondary}>
                  {format(new Date(d.date), 'dd MMM')}
                </ThemedText>
                <ThemedText type="numericSm" color={colors.accent}>
                  ₨{Number(d.total_revenue).toLocaleString()}
                </ThemedText>
                <ThemedText type="caption" color={d.gross_profit >= 0 ? colors.success : colors.danger}>
                  {d.gross_profit >= 0 ? '+' : ''}₨{Number(d.gross_profit).toLocaleString()}
                </ThemedText>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: spacing[5],
    marginBottom: spacing[4],
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing[2],
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: colors.primary500,
  },
  content: { paddingHorizontal: spacing[5], gap: spacing[4], paddingBottom: spacing[10] },
  statsGrid: { flexDirection: 'row', gap: spacing[3] },
  marginRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[3] },
  progressBg: {
    height: 8,
    backgroundColor: colors.bgElevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 4,
  },
  chartTitle: { marginBottom: spacing[4] },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    gap: spacing[2],
  },
  barCol: { flex: 1, alignItems: 'center', gap: spacing[1] },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    backgroundColor: colors.bgElevated,
    borderRadius: 4,
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.primary500,
    borderRadius: 4,
  },
  barLabel: { textAlign: 'center' },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
