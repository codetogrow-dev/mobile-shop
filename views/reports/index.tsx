import { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, FlatList, Animated, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, subMonths, addMonths } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { fmtCurrency, fmtPct, fmtCompact } from '@/lib/format-num';
import { StatInfoModal } from '@/components/ui/stat-info-modal';
import { QK } from '@/constants/query-keys';
import {
  getDailySummary, getMonthlySummary, getYearlySummary,
  getWeeklyRevenue, getTopProductsForPeriod,
} from '@/api/reports';
import { REPORT_MODE } from '@/constants/enums';

type ReportMode = typeof REPORT_MODE[keyof typeof REPORT_MODE];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, onPress }: {
  label: string; value: string; sub?: string; color?: string; onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={statStyles.card} onPress={onPress} activeOpacity={onPress ? 0.75 : 1}>
      <ThemedText type="caption" color={colors.textSecondary}>{label}</ThemedText>
      <ThemedText type="h4" color={color ?? colors.textPrimary} numberOfLines={1}>{value}</ThemedText>
      {sub ? <ThemedText type="overline" color={colors.textTertiary}>{sub}</ThemedText> : null}
    </TouchableOpacity>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <ThemedText type="h4" style={sectionStyle}>{title}</ThemedText>;
}

const sectionStyle = { marginBottom: spacing[3], color: colors.textSecondary };

const statStyles = StyleSheet.create({
  card: {
    flex: 1, alignItems: 'center', paddingVertical: spacing[4], paddingHorizontal: spacing[2],
    gap: spacing[1], backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, ...shadows.sm,
  },
});

// ─── Month Picker ─────────────────────────────────────────────────────────────

const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function MonthPickerModal({ visible, current, onClose, onSelect }: {
  visible: boolean;
  current: Date;
  onClose: () => void;
  onSelect: (date: Date) => void;
}) {
  const now = new Date();
  const slideAnim = useRef(new Animated.Value(600)).current;

  const [pickerYear, setPickerYear] = useState(current.getFullYear());

  useEffect(() => {
    if (visible) {
      setPickerYear(current.getFullYear());
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 600, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  const months = Array.from({ length: 12 }, (_, i) => {
    const isFuture = pickerYear > now.getFullYear() || (pickerYear === now.getFullYear() && i > now.getMonth());
    return { index: i, label: FULL_MONTHS[i], disabled: isFuture };
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={pickerStyles.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[pickerStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={pickerStyles.handle} />
        <View style={pickerStyles.header}>
          <ThemedText type="h3">Select Month</ThemedText>
          <TouchableOpacity onPress={onClose} style={pickerStyles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Year nav inside picker */}
        <View style={pickerStyles.yearNav}>
          <TouchableOpacity style={pickerStyles.yearBtn} onPress={() => setPickerYear((y) => y - 1)} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
          <ThemedText type="h4">{pickerYear}</ThemedText>
          <TouchableOpacity
            style={pickerStyles.yearBtn}
            onPress={() => setPickerYear((y) => y + 1)}
            activeOpacity={0.7}
            disabled={pickerYear >= now.getFullYear()}
          >
            <Ionicons name="chevron-forward" size={16} color={pickerYear >= now.getFullYear() ? colors.textTertiary : colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Month grid */}
        <View style={pickerStyles.monthGrid}>
          {months.map((m) => {
            const isSelected = pickerYear === current.getFullYear() && m.index === current.getMonth();
            return (
              <TouchableOpacity
                key={m.index}
                style={[pickerStyles.monthCell, isSelected && pickerStyles.monthCellActive, m.disabled && pickerStyles.monthCellDisabled]}
                onPress={() => {
                  if (!m.disabled) {
                    onSelect(new Date(pickerYear, m.index, 1));
                    onClose();
                  }
                }}
                activeOpacity={m.disabled ? 1 : 0.75}
              >
                <ThemedText
                  type="body"
                  color={m.disabled ? colors.textTertiary : isSelected ? colors.textInverse : colors.textPrimary}
                >
                  {m.label.slice(0, 3)}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </Modal>
  );
}

// ─── Year Picker ──────────────────────────────────────────────────────────────

function YearPickerModal({ visible, current, onClose, onSelect }: {
  visible: boolean;
  current: number;
  onClose: () => void;
  onSelect: (year: number) => void;
}) {
  const now = new Date();
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 600, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  const currentYear = now.getFullYear();
  const years = Array.from({ length: currentYear - 2019 }, (_, i) => currentYear - i);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={pickerStyles.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[pickerStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={pickerStyles.handle} />
        <View style={pickerStyles.header}>
          <ThemedText type="h3">Select Year</ThemedText>
          <TouchableOpacity onPress={onClose} style={pickerStyles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={years}
          keyExtractor={(item) => String(item)}
          style={{ maxHeight: 280 }}
          contentContainerStyle={{ paddingHorizontal: spacing[5], paddingBottom: spacing[5] }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = item === current;
            return (
              <TouchableOpacity
                style={[pickerStyles.yearRow, isSelected && pickerStyles.yearRowActive]}
                onPress={() => { onSelect(item); onClose(); }}
                activeOpacity={0.75}
              >
                <ThemedText type="h4" color={isSelected ? colors.textInverse : colors.textPrimary}>{item}</ThemedText>
                {isSelected && <Ionicons name="checkmark" size={18} color={colors.textInverse} />}
              </TouchableOpacity>
            );
          }}
        />
      </Animated.View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,27,42,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[4] },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  yearNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: spacing[5], marginBottom: spacing[4], backgroundColor: colors.bgElevated, borderRadius: radius.md, padding: spacing[3] },
  yearBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing[4], paddingBottom: spacing[4], gap: spacing[2] },
  monthCell: { width: '30%', paddingVertical: spacing[3], borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.bgElevated },
  monthCellActive: { backgroundColor: colors.primary500 },
  monthCellDisabled: { opacity: 0.35 },
  yearRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing[4], paddingHorizontal: spacing[4], borderRadius: radius.md, marginBottom: spacing[2] },
  yearRowActive: { backgroundColor: colors.primary500 },
});

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ReportsView() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<ReportMode>(REPORT_MODE.DAILY);
  const [infoModal, setInfoModal] = useState<string | null>(null);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);

  // Date navigation state
  const now = new Date();
  const [monthDate, setMonthDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [year, setYear] = useState(now.getFullYear());

  const todayStr = format(now, 'yyyy-MM-dd');
  const selYear = monthDate.getFullYear();
  const selMonth = monthDate.getMonth() + 1;

  // ── Queries ──
  const { data: daily, isLoading: dailyLoading, refetch: refetchDaily } = useQuery({
    queryKey: QK.reports.daily(todayStr),
    queryFn: () => getDailySummary(todayStr),
    enabled: mode === REPORT_MODE.DAILY,
  });

  const { data: monthly, isLoading: monthlyLoading, refetch: refetchMonthly } = useQuery({
    queryKey: QK.reports.monthly(selYear, selMonth),
    queryFn: () => getMonthlySummary(selYear, selMonth),
    enabled: mode === REPORT_MODE.MONTHLY,
  });

  const { data: yearly, isLoading: yearlyLoading, refetch: refetchYearly } = useQuery({
    queryKey: QK.reports.yearly(year),
    queryFn: () => getYearlySummary(year),
    enabled: mode === REPORT_MODE.YEARLY,
  });

  const { data: weeklyRevenue } = useQuery({
    queryKey: QK.reports.weeklyRevenue,
    queryFn: getWeeklyRevenue,
    enabled: mode === REPORT_MODE.DAILY,
  });

  // Top products for month/year
  const monthFrom = format(monthDate, 'yyyy-MM-01');
  const monthTo = format(new Date(selYear, selMonth, 0), 'yyyy-MM-dd');
  const { data: topMonthly } = useQuery({
    queryKey: [...QK.reports.topProducts(monthFrom), REPORT_MODE.MONTHLY],
    queryFn: () => getTopProductsForPeriod(monthFrom, monthTo),
    enabled: mode === REPORT_MODE.MONTHLY,
  });

  const { data: topYearly } = useQuery({
    queryKey: [...QK.reports.topProducts(`${year}`), REPORT_MODE.YEARLY],
    queryFn: () => getTopProductsForPeriod(`${year}-01-01`, `${year}-12-31`),
    enabled: mode === REPORT_MODE.YEARLY,
  });

  const isLoading = mode === REPORT_MODE.DAILY ? dailyLoading : mode === REPORT_MODE.MONTHLY ? monthlyLoading : yearlyLoading;
  const refetch = mode === REPORT_MODE.DAILY ? refetchDaily : mode === REPORT_MODE.MONTHLY ? refetchMonthly : refetchYearly;

  // ── Derived values ──
  const d = daily;
  const m = monthly;
  const y = yearly;

  const dailyMargin = d && d.total_revenue > 0 ? (d.gross_profit / d.total_revenue) * 100 : 0;
  const monthlyMargin = m && m.total_revenue > 0 ? (m.gross_profit / m.total_revenue) * 100 : 0;
  const yearlyMargin = y && y.total_revenue > 0 ? (y.gross_profit / y.total_revenue) * 100 : 0;

  const maxWeekly = Math.max(...(weeklyRevenue?.map((r) => r.revenue) ?? [1]), 1);
  const maxMonthlyBar = Math.max(...(m?.daily_breakdown.map((r) => r.total_revenue) ?? [1]), 1);
  const maxYearlyBar = Math.max(...(y?.monthly_breakdown.map((r) => r.total_revenue) ?? [1]), 1);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="h2">Reports</ThemedText>
      </View>

      {/* Mode Tabs */}
      <View style={styles.toggleRow}>
        {([REPORT_MODE.DAILY, REPORT_MODE.MONTHLY, REPORT_MODE.YEARLY] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
            onPress={() => setMode(m)}
            activeOpacity={0.8}
          >
            <ThemedText type="caption" color={mode === m ? colors.textInverse : colors.textSecondary}>
              {m === REPORT_MODE.DAILY ? 'Today' : m === REPORT_MODE.MONTHLY ? 'Month' : 'Year'}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Period navigator — Month & Year tabs */}
      {mode === REPORT_MODE.MONTHLY && (
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={() => setMonthDate((d) => subMonths(d, 1))} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navLabel} onPress={() => setMonthPickerOpen(true)} activeOpacity={0.75}>
            <ThemedText type="h4">{format(monthDate, 'MMMM yyyy')}</ThemedText>
            <Ionicons name="calendar-outline" size={14} color={colors.primary500} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setMonthDate((d) => addMonths(d, 1))}
            activeOpacity={0.7}
            disabled={selYear === now.getFullYear() && selMonth === now.getMonth() + 1}
          >
            <Ionicons name="chevron-forward" size={18}
              color={selYear === now.getFullYear() && selMonth === now.getMonth() + 1
                ? colors.textTertiary : colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      )}
      {mode === REPORT_MODE.YEARLY && (
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={() => setYear((y) => y - 1)} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navLabel} onPress={() => setYearPickerOpen(true)} activeOpacity={0.75}>
            <ThemedText type="h4">{year}</ThemedText>
            <Ionicons name="calendar-outline" size={14} color={colors.primary500} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setYear((y) => y + 1)}
            activeOpacity={0.7}
            disabled={year >= now.getFullYear()}
          >
            <Ionicons name="chevron-forward" size={18} color={year >= now.getFullYear() ? colors.textTertiary : colors.textPrimary} />
          </TouchableOpacity>
        </View>
      )}

      <MonthPickerModal
        visible={monthPickerOpen}
        current={monthDate}
        onClose={() => setMonthPickerOpen(false)}
        onSelect={setMonthDate}
      />
      <YearPickerModal
        visible={yearPickerOpen}
        current={year}
        onClose={() => setYearPickerOpen(false)}
        onSelect={setYear}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary500} />}
      >
        {isLoading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.primary500} />
          </View>
        ) : (
          <>
            {/* ══════════ TODAY ══════════ */}
            {mode === REPORT_MODE.DAILY && (
              <>
                <View style={styles.statsGrid}>
                  <StatCard label="Revenue" value={fmtCurrency(Number(d?.total_revenue ?? 0))} color={colors.primary500} onPress={() => setInfoModal('revenue')} />
                  <StatCard label="Profit" value={fmtCurrency(Number(d?.gross_profit ?? 0), true)} color={(d?.gross_profit ?? 0) >= 0 ? colors.success : colors.danger} onPress={() => setInfoModal('profit')} />
                </View>
                <View style={styles.statsGrid}>
                  <StatCard label="Cost" value={fmtCurrency(Number(d?.total_cost ?? 0))} color={colors.info} onPress={() => setInfoModal('cost')} />
                  <StatCard label="Margin" value={fmtPct(dailyMargin)} color={dailyMargin >= 0 ? colors.success : colors.danger} onPress={() => setInfoModal('margin')} />
                </View>
                <View style={styles.statsGrid}>
                  <StatCard label="Transactions" value={String(d?.transaction_count ?? 0)} color={colors.textPrimary} onPress={() => setInfoModal('txn')} />
                  <StatCard label="Avg Sale" value={d && d.transaction_count > 0 ? fmtCurrency(Number(d.total_revenue) / d.transaction_count) : '—'} color={colors.accent} onPress={() => setInfoModal('avg')} />
                </View>

                {/* Margin progress bar */}
                {(d?.total_revenue ?? 0) > 0 && (
                  <Card>
                    <View style={styles.marginRow}>
                      <ThemedText type="body" color={colors.textSecondary}>Profit Margin</ThemedText>
                      <ThemedText type="h4" color={dailyMargin >= 0 ? colors.success : colors.danger}>{fmtPct(dailyMargin)}</ThemedText>
                    </View>
                    <ProgressBar pct={dailyMargin} />
                  </Card>
                )}

                {/* 7-day sparkline */}
                {weeklyRevenue && weeklyRevenue.length > 0 && (
                  <Card>
                    <SectionTitle title="Last 7 Days — Revenue" />
                    <BarChart
                      bars={weeklyRevenue.map((r) => ({ label: format(new Date(r.date), 'EEE'), value: r.revenue, max: maxWeekly }))}
                    />
                  </Card>
                )}
              </>
            )}

            {/* ══════════ MONTH ══════════ */}
            {mode === REPORT_MODE.MONTHLY && (
              <>
                <View style={styles.statsGrid}>
                  <StatCard label="Revenue" value={fmtCurrency(Number(m?.total_revenue ?? 0))} color={colors.primary500} onPress={() => setInfoModal('revenue')} />
                  <StatCard label="Profit" value={fmtCurrency(Number(m?.gross_profit ?? 0), true)} color={(m?.gross_profit ?? 0) >= 0 ? colors.success : colors.danger} onPress={() => setInfoModal('profit')} />
                </View>
                <View style={styles.statsGrid}>
                  <StatCard label="Cost" value={fmtCurrency(Number(m?.total_cost ?? 0))} color={colors.info} onPress={() => setInfoModal('cost')} />
                  <StatCard label="Margin" value={fmtPct(monthlyMargin)} color={monthlyMargin >= 0 ? colors.success : colors.danger} onPress={() => setInfoModal('margin')} />
                </View>
                <View style={styles.statsGrid}>
                  <StatCard label="Transactions" value={String(m?.transaction_count ?? 0)} color={colors.textPrimary} onPress={() => setInfoModal('txn')} />
                  <StatCard label="Units Sold" value={String(m?.units_sold ?? 0)} color={colors.accent} onPress={() => setInfoModal('units')} />
                </View>
                <View style={styles.statsGrid}>
                  <StatCard label="Avg Sale Value" value={m && m.transaction_count > 0 ? fmtCurrency(m.avg_sale_value) : '—'} color={colors.primary500} onPress={() => setInfoModal('avg')} />
                  <StatCard label="Active Days" value={String(m?.daily_breakdown.filter((d) => d.transaction_count > 0).length ?? 0)} color={colors.textSecondary} sub="days with sales" />
                </View>

                {/* Margin */}
                {(m?.total_revenue ?? 0) > 0 && (
                  <Card>
                    <View style={styles.marginRow}>
                      <ThemedText type="body" color={colors.textSecondary}>Profit Margin</ThemedText>
                      <ThemedText type="h4" color={monthlyMargin >= 0 ? colors.success : colors.danger}>{fmtPct(monthlyMargin)}</ThemedText>
                    </View>
                    <ProgressBar pct={monthlyMargin} />
                  </Card>
                )}

                {/* Daily bar chart */}
                {(m?.daily_breakdown.length ?? 0) > 0 && (
                  <Card>
                    <SectionTitle title="Daily Revenue" />
                    <BarChart
                      bars={(m?.daily_breakdown ?? []).map((r) => ({
                        label: format(new Date(r.date), 'd'),
                        value: r.total_revenue,
                        max: maxMonthlyBar,
                        profit: r.gross_profit,
                      }))}
                      compact
                    />
                  </Card>
                )}

                {/* Top products */}
                {(topMonthly?.length ?? 0) > 0 && (
                  <Card>
                    <SectionTitle title="Top Products" />
                    <TopProductsList items={topMonthly!} />
                  </Card>
                )}

                {/* Daily breakdown table */}
                {(m?.daily_breakdown.filter((d) => d.transaction_count > 0).length ?? 0) > 0 && (
                  <Card>
                    <SectionTitle title="Daily Breakdown" />
                    {m!.daily_breakdown.filter((d) => d.transaction_count > 0).map((r, i, arr) => (
                      <View key={r.date} style={[styles.breakdownRow, i < arr.length - 1 && styles.breakdownDivider]}>
                        <ThemedText type="caption" color={colors.textSecondary} style={{ width: 50 }}>
                          {format(new Date(r.date), 'dd MMM')}
                        </ThemedText>
                        <ThemedText type="caption" color={colors.textTertiary} style={{ width: 28, textAlign: 'center' }}>
                          {r.transaction_count}tx
                        </ThemedText>
                        <ThemedText type="numericSm" color={colors.primary500} style={{ flex: 1, textAlign: 'right' }}>
                          {fmtCurrency(Number(r.total_revenue))}
                        </ThemedText>
                        <ThemedText type="caption" color={r.gross_profit >= 0 ? colors.success : colors.danger} style={{ width: 72, textAlign: 'right' }}>
                          {fmtCurrency(Number(r.gross_profit), true)}
                        </ThemedText>
                      </View>
                    ))}
                  </Card>
                )}
              </>
            )}

            {/* ══════════ YEAR ══════════ */}
            {mode === REPORT_MODE.YEARLY && (
              <>
                <View style={styles.statsGrid}>
                  <StatCard label="Revenue" value={fmtCurrency(Number(y?.total_revenue ?? 0))} color={colors.primary500} onPress={() => setInfoModal('revenue')} />
                  <StatCard label="Profit" value={fmtCurrency(Number(y?.gross_profit ?? 0), true)} color={(y?.gross_profit ?? 0) >= 0 ? colors.success : colors.danger} onPress={() => setInfoModal('profit')} />
                </View>
                <View style={styles.statsGrid}>
                  <StatCard label="Cost" value={fmtCurrency(Number(y?.total_cost ?? 0))} color={colors.info} onPress={() => setInfoModal('cost')} />
                  <StatCard label="Margin" value={fmtPct(yearlyMargin)} color={yearlyMargin >= 0 ? colors.success : colors.danger} onPress={() => setInfoModal('margin')} />
                </View>
                <View style={styles.statsGrid}>
                  <StatCard label="Transactions" value={String(y?.transaction_count ?? 0)} color={colors.textPrimary} onPress={() => setInfoModal('txn')} />
                  <StatCard label="Units Sold" value={String(y?.units_sold ?? 0)} color={colors.accent} onPress={() => setInfoModal('units')} />
                </View>
                <View style={styles.statsGrid}>
                  <StatCard label="Avg Sale Value" value={y && y.transaction_count > 0 ? fmtCurrency(y.total_revenue / y.transaction_count) : '—'} color={colors.primary500} onPress={() => setInfoModal('avg')} />
                  <StatCard label="Active Months" value={String(y?.monthly_breakdown.filter((m) => m.transaction_count > 0).length ?? 0)} color={colors.textSecondary} sub="months with sales" />
                </View>

                {/* Margin */}
                {(y?.total_revenue ?? 0) > 0 && (
                  <Card>
                    <View style={styles.marginRow}>
                      <ThemedText type="body" color={colors.textSecondary}>Annual Profit Margin</ThemedText>
                      <ThemedText type="h4" color={yearlyMargin >= 0 ? colors.success : colors.danger}>{fmtPct(yearlyMargin)}</ThemedText>
                    </View>
                    <ProgressBar pct={yearlyMargin} />
                  </Card>
                )}

                {/* Monthly bar chart */}
                <Card>
                  <SectionTitle title="Monthly Revenue" />
                  <BarChart
                    bars={(y?.monthly_breakdown ?? []).map((r) => ({
                      label: MONTH_NAMES[r.month - 1],
                      value: r.total_revenue,
                      max: maxYearlyBar,
                      profit: r.gross_profit,
                    }))}
                    compact
                  />
                </Card>

                {/* Top products */}
                {(topYearly?.length ?? 0) > 0 && (
                  <Card>
                    <SectionTitle title="Top Products" />
                    <TopProductsList items={topYearly!} />
                  </Card>
                )}

                {/* Monthly breakdown table */}
                {(y?.monthly_breakdown.filter((m) => m.transaction_count > 0).length ?? 0) > 0 && (
                  <Card>
                    <SectionTitle title="Monthly Breakdown" />
                    {y!.monthly_breakdown.filter((m) => m.transaction_count > 0).map((r, i, arr) => (
                      <View key={r.month} style={[styles.breakdownRow, i < arr.length - 1 && styles.breakdownDivider]}>
                        <ThemedText type="caption" color={colors.textSecondary} style={{ width: 40 }}>
                          {MONTH_NAMES[r.month - 1]}
                        </ThemedText>
                        <ThemedText type="caption" color={colors.textTertiary} style={{ width: 32, textAlign: 'center' }}>
                          {r.transaction_count}tx
                        </ThemedText>
                        <ThemedText type="numericSm" color={colors.primary500} style={{ flex: 1, textAlign: 'right' }}>
                          {fmtCurrency(r.total_revenue)}
                        </ThemedText>
                        <ThemedText type="caption" color={r.gross_profit >= 0 ? colors.success : colors.danger} style={{ width: 72, textAlign: 'right' }}>
                          {fmtCurrency(r.gross_profit, true)}
                        </ThemedText>
                      </View>
                    ))}
                  </Card>
                )}
              </>
            )}

            {/* ── Shared StatInfo modals ── */}
            {renderModals(mode, d, m, y, dailyMargin, monthlyMargin, yearlyMargin, infoModal, setInfoModal)}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Shared modal renderer ────────────────────────────────────────────────────

function renderModals(
  mode: ReportMode,
  d: ReturnType<typeof getDailySummary> extends Promise<infer T> ? T | undefined : never,
  m: ReturnType<typeof getMonthlySummary> extends Promise<infer T> ? T | undefined : never,
  y: ReturnType<typeof getYearlySummary> extends Promise<infer T> ? T | undefined : never,
  dailyMargin: number, monthlyMargin: number, yearlyMargin: number,
  infoModal: string | null, setInfoModal: (v: string | null) => void,
) {
  const period = mode === REPORT_MODE.DAILY ? 'today' : mode === REPORT_MODE.MONTHLY ? 'this month' : 'this year';
  const revenue = mode === REPORT_MODE.DAILY ? Number(d?.total_revenue ?? 0) : mode === REPORT_MODE.MONTHLY ? Number(m?.total_revenue ?? 0) : Number(y?.total_revenue ?? 0);
  const profit = mode === REPORT_MODE.DAILY ? Number(d?.gross_profit ?? 0) : mode === REPORT_MODE.MONTHLY ? Number(m?.gross_profit ?? 0) : Number(y?.gross_profit ?? 0);
  const cost = mode === REPORT_MODE.DAILY ? Number(d?.total_cost ?? 0) : mode === REPORT_MODE.MONTHLY ? Number(m?.total_cost ?? 0) : Number(y?.total_cost ?? 0);
  const txn = mode === REPORT_MODE.DAILY ? (d?.transaction_count ?? 0) : mode === REPORT_MODE.MONTHLY ? (m?.transaction_count ?? 0) : (y?.transaction_count ?? 0);
  const units = mode === REPORT_MODE.MONTHLY ? (m?.units_sold ?? 0) : mode === REPORT_MODE.YEARLY ? (y?.units_sold ?? 0) : 0;
  const margin = mode === REPORT_MODE.DAILY ? dailyMargin : mode === REPORT_MODE.MONTHLY ? monthlyMargin : yearlyMargin;
  const avgSale = txn > 0 ? revenue / txn : 0;

  return (
    <>
      <StatInfoModal visible={infoModal === 'revenue'} onClose={() => setInfoModal(null)} label="Total Revenue" description={`Total money collected from all sales ${period}.`} value={revenue} icon="cash-outline" accentColor={colors.primary500} accentBg={colors.primary50} />
      <StatInfoModal visible={infoModal === 'profit'} onClose={() => setInfoModal(null)} label="Gross Profit" description={`Revenue minus cost of goods sold (FIFO) ${period}.`} value={profit} icon="trending-up-outline" accentColor={profit >= 0 ? colors.success : colors.danger} accentBg={profit >= 0 ? colors.successBg : colors.dangerBg} />
      <StatInfoModal visible={infoModal === 'cost'} onClose={() => setInfoModal(null)} label="Total Cost" description={`Total cost of goods sold (COGS) ${period}.`} value={cost} icon="wallet-outline" accentColor={colors.info} accentBg={colors.infoBg} />
      <StatInfoModal visible={infoModal === 'txn'} onClose={() => setInfoModal(null)} label="Transactions" description={`Number of individual sale transactions recorded ${period}.`} value={txn} isCurrency={false} icon="bag-check-outline" accentColor={colors.info} accentBg={colors.infoBg} />
      <StatInfoModal visible={infoModal === 'margin'} onClose={() => setInfoModal(null)} label="Profit Margin" description={`Gross profit as a percentage of revenue ${period}. Higher is better.`} value={margin} isCurrency={false} icon="pie-chart-outline" accentColor={margin >= 0 ? colors.success : colors.danger} accentBg={margin >= 0 ? colors.successBg : colors.dangerBg} />
      <StatInfoModal visible={infoModal === 'units'} onClose={() => setInfoModal(null)} label="Units Sold" description={`Total individual product units sold ${period}.`} value={units} isCurrency={false} icon="cube-outline" accentColor={colors.accent} accentBg={colors.primary50} />
      <StatInfoModal visible={infoModal === 'avg'} onClose={() => setInfoModal(null)} label="Avg Sale Value" description={`Average revenue per transaction ${period} (total revenue ÷ transactions).`} value={avgSale} icon="stats-chart-outline" accentColor={colors.primary500} accentBg={colors.primary50} />
    </>
  );
}

// ─── Bar chart ────────────────────────────────────────────────────────────────

function BarChart({ bars, compact = false }: {
  bars: { label: string; value: number; max: number; profit?: number }[];
  compact?: boolean;
}) {
  return (
    <View style={[chartStyles.container, compact && { height: 70 }]}>
      {bars.map((b, i) => (
        <View key={i} style={chartStyles.col}>
          <View style={chartStyles.track}>
            <View
              style={[
                chartStyles.fill,
                { height: `${Math.max((b.value / b.max) * 100, b.value > 0 ? 4 : 0)}%` },
                b.profit !== undefined && b.profit < 0 && { backgroundColor: colors.danger + 'AA' },
              ]}
            />
          </View>
          <ThemedText type="overline" color={colors.textTertiary} style={chartStyles.label} numberOfLines={1}>
            {b.label}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 3 },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  track: { flex: 1, width: '100%', justifyContent: 'flex-end', backgroundColor: colors.bgElevated, borderRadius: 4 },
  fill: { width: '100%', backgroundColor: colors.primary500, borderRadius: 4 },
  label: { textAlign: 'center', fontSize: 9 },
});

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  const filled = Math.min(Math.max(pct, 0), 100);
  return (
    <View style={pbStyles.bg}>
      <View style={[pbStyles.fill, { width: `${filled}%`, backgroundColor: pct >= 0 ? colors.success : colors.danger }]} />
    </View>
  );
}

const pbStyles = StyleSheet.create({
  bg: { height: 8, backgroundColor: colors.bgElevated, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});

// ─── Top products list ────────────────────────────────────────────────────────

function TopProductsList({ items }: { items: { name: string; units_sold: number; revenue: number }[] }) {
  const maxRev = Math.max(...items.map((i) => i.revenue), 1);
  return (
    <View style={tpStyles.container}>
      {items.map((p, i) => (
        <View key={i} style={[tpStyles.row, i < items.length - 1 && tpStyles.divider]}>
          <View style={[tpStyles.rank, { backgroundColor: i === 0 ? colors.warningBg : colors.bgElevated }]}>
            <ThemedText type="caption" color={i === 0 ? colors.warning : colors.textTertiary}>#{i + 1}</ThemedText>
          </View>
          <View style={tpStyles.nameCol}>
            <ThemedText type="body" numberOfLines={1}>{p.name}</ThemedText>
            <View style={tpStyles.barWrap}>
              <View style={[tpStyles.barFill, { width: `${(p.revenue / maxRev) * 100}%` }]} />
            </View>
          </View>
          <View style={tpStyles.right}>
            <ThemedText type="numericSm" color={colors.primary500}>{fmtCurrency(p.revenue)}</ThemedText>
            <ThemedText type="caption" color={colors.textTertiary}>{p.units_sold} units</ThemedText>
          </View>
        </View>
      ))}
    </View>
  );
}

const tpStyles = StyleSheet.create({
  container: { gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[3] },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rank: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  nameCol: { flex: 1, gap: 5 },
  barWrap: { height: 4, backgroundColor: colors.bgElevated, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.primary500 + 'AA', borderRadius: 2 },
  right: { alignItems: 'flex-end', gap: 2 },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  header: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[3] },
  toggleRow: {
    flexDirection: 'row', marginHorizontal: spacing[5], marginBottom: spacing[3],
    backgroundColor: colors.bgElevated, borderRadius: radius.md, padding: 4, gap: 4,
  },
  toggleBtn: { flex: 1, paddingVertical: spacing[2], borderRadius: radius.sm, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: colors.primary500 },
  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: spacing[5], marginBottom: spacing[3],
    backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing[3],
    borderWidth: 1, borderColor: colors.border, ...shadows.sm,
  },
  navBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center',
  },
  navLabel: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    paddingVertical: spacing[1], paddingHorizontal: spacing[3],
    borderRadius: radius.md, backgroundColor: colors.bgElevated,
  },
  content: { paddingHorizontal: spacing[5], gap: spacing[4], paddingBottom: spacing[12] },
  statsGrid: { flexDirection: 'row', gap: spacing[3] },
  marginRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] },
  loader: { paddingTop: spacing[12], alignItems: 'center' },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3] },
  breakdownDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
});
