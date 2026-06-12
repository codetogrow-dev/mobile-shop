import { View, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { HeroKpi } from '@/components/ui/hero-kpi';
import { KpiGrid, type KpiItem } from '@/components/ui/kpi-grid';
import { BarChart } from '@/components/ui/bar-chart';
import { PaceCard } from '@/components/ui/pace-card';
import { InsightStrip, type InsightChip } from '@/components/ui/insight-strip';
import { colors, spacing, radius } from '@/constants/theme';
import { fmtRupee, fmtRupeeCompact, fmtPct } from '@/lib/format-num';
import { fmtKarachi, todayKarachi } from '@/lib/datetime';
import { forecastSeries } from '@/lib/forecast';
import { QK } from '@/constants/query-keys';
import {
  getDailySummary, getMonthlySummary, getYearlySummary,
  getWeeklyRevenue, getTopProductsForPeriod, getYesterdaySummary,
} from '@/api/reports';
import type { ReportPeriod } from '@/components/ui/period-segment';

interface Props {
  period: ReportPeriod;
  year: number;
  month: number;
}

export function SalesPanel({ period, year, month }: Props) {
  return (
    <View style={styles.body}>
      {period === 'daily'   && <DailyView />}
      {period === 'monthly' && <MonthlyView year={year} month={month} />}
      {period === 'yearly'  && <YearlyView year={year} />}
    </View>
  );
}

// ─── Today ───────────────────────────────────────────────────────────────────

function DailyView() {
  const today = todayKarachi();
  const { data: d } = useQuery({
    queryKey: QK.reports.daily(today),
    queryFn: () => getDailySummary(today),
  });
  const { data: ystd } = useQuery({
    queryKey: QK.reports.yesterday,
    queryFn: getYesterdaySummary,
  });
  const { data: weekly } = useQuery({
    queryKey: QK.reports.weeklyRevenue,
    queryFn: getWeeklyRevenue,
  });
  const { data: top } = useQuery({
    queryKey: QK.reports.topProducts(today),
    queryFn: () => getTopProductsForPeriod(today, today),
  });

  const revenue = Number(d?.total_revenue ?? 0);
  const profit  = Number(d?.gross_profit ?? 0);
  const cost    = Number(d?.total_cost ?? 0);
  const margin  = revenue > 0 ? (profit / revenue) * 100 : 0;
  const ystdRev = ystd?.revenue ?? 0;
  const deltaPct = ystdRev > 0 ? ((revenue - ystdRev) / ystdRev) * 100 : null;
  const deltaTxt = deltaPct === null ? undefined :
    `${deltaPct >= 0 ? '+' : ''}${Math.round(deltaPct)}% vs yesterday`;
  const trend = deltaPct === null ? 'flat' : deltaPct >= 0 ? 'up' : 'down';

  const max = Math.max(...(weekly ?? []).map((w) => w.revenue), 1);
  const bars = (weekly ?? []).map((w) => ({
    label: fmtKarachi(w.date, 'EEE'),
    value: w.revenue,
    max,
  }));

  const insights: InsightChip[] = [];
  if (weekly && weekly.length === 7) {
    const max7 = weekly.reduce((mx, w) => w.revenue > mx.revenue ? w : mx, weekly[0]);
    if (max7.revenue > 0) {
      insights.push({
        id: 'best-day',
        icon: 'trophy-outline',
        tone: 'positive',
        text: `Best day this week: ${fmtKarachi(max7.date, 'EEE')} (${fmtRupeeCompact(max7.revenue)})`,
      });
    }
  }
  if (revenue === 0) {
    insights.push({ id: 'noop', icon: 'pause-circle-outline', tone: 'caution', text: 'No sales recorded today yet' });
  }

  return (
    <>
      <HeroKpi
        label="REVENUE TODAY"
        value={fmtRupee(revenue)}
        delta={deltaTxt}
        trend={trend}
        icon="cash-outline"
      />

      <KpiGrid items={[
        kpi('Profit', fmtRupee(profit), 'trending-up-outline', colors.success, colors.successBg, profit, 'Gross profit for today (revenue − FIFO cost).'),
        kpi('Margin', fmtPct(margin), 'pie-chart-outline', margin >= 20 ? colors.success : colors.warning, margin >= 20 ? colors.successBg : colors.warningBg, margin, 'Gross profit as a % of revenue. Healthy retail margin is usually 20–40%.', false),
        kpi('Transactions', String(d?.transaction_count ?? 0), 'bag-check-outline', colors.info, colors.infoBg, d?.transaction_count ?? 0, 'Number of separate sales recorded today.', false),
        kpi('Cost', fmtRupee(cost), 'wallet-outline', colors.primary500, colors.primary50, cost, 'FIFO cost of goods sold today.'),
      ] as KpiItem[]} />

      {bars.length > 0 && (
        <Card>
          <ThemedText type="h4" style={styles.cardTitle}>7-day revenue trend</ThemedText>
          <BarChart bars={bars} compact />
        </Card>
      )}

      <InsightStrip items={insights} />

      {top && top.length > 0 && (
        <TopProductsCard items={top} title="Top products today" />
      )}
    </>
  );
}

// ─── Month ───────────────────────────────────────────────────────────────────

function MonthlyView({ year, month }: { year: number; month: number }) {
  const today = new Date();
  const isCurrent = year === today.getFullYear() && month === today.getMonth() + 1;

  const { data: m } = useQuery({
    queryKey: QK.reports.monthly(year, month),
    queryFn: () => getMonthlySummary(year, month),
  });

  // Previous month, used by the pace card for "X more than last month"
  const prev = (() => {
    if (month === 1) return { year: year - 1, month: 12 };
    return { year, month: month - 1 };
  })();
  const { data: prevM } = useQuery({
    queryKey: QK.reports.monthly(prev.year, prev.month),
    queryFn: () => getMonthlySummary(prev.year, prev.month),
  });

  const revenue = Number(m?.total_revenue ?? 0);
  const profit = Number(m?.gross_profit ?? 0);
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const avgSale = m?.avg_sale_value ?? 0;

  const dailyBreakdown = m?.daily_breakdown ?? [];
  const daysInMonth = new Date(year, month, 0).getDate();
  const today_dom = isCurrent ? today.getDate() : daysInMonth;

  // Build an actuals-only daily series (no future zeros).
  const elapsed: number[] = new Array(today_dom).fill(0);
  dailyBreakdown.forEach((r) => {
    const d = new Date(r.date).getDate();
    if (d - 1 < today_dom) elapsed[d - 1] = r.total_revenue;
  });

  // Forecast for the pace card only — never injected back into the chart.
  const remaining = isCurrent ? daysInMonth - today_dom : 0;
  const forecast = remaining > 0 && elapsed.filter((v) => v > 0).length >= 3
    ? forecastSeries(elapsed, remaining)
    : null;
  const projectedMonthTotal = forecast
    ? elapsed.reduce((s, n) => s + n, 0) + forecast.projected.reduce((s, n) => s + n, 0)
    : null;
  const confidence: 'high' | 'medium' | 'low' =
    !forecast ? 'low' :
    forecast.r2 >= 0.5 ? 'high' :
    forecast.r2 >= 0.25 ? 'medium' : 'low';

  // Chart shows only the days that have already happened.
  const max = Math.max(...elapsed, 1);
  const bars = elapsed.map((v, i) => ({
    label: String(i + 1),
    value: v,
    max,
  }));

  const insights: InsightChip[] = [];
  if (dailyBreakdown.length > 0) {
    const best = dailyBreakdown.reduce((mx, r) => r.total_revenue > mx.total_revenue ? r : mx, dailyBreakdown[0]);
    insights.push({
      id: 'best-day',
      icon: 'trophy-outline',
      tone: 'positive',
      text: `Best day so far: ${fmtKarachi(best.date, 'd MMM')} (${fmtRupeeCompact(best.total_revenue)})`,
    });
  }

  return (
    <>
      <HeroKpi
        label="REVENUE THIS MONTH"
        value={fmtRupee(revenue)}
        icon="cash-outline"
      />

      <KpiGrid items={[
        kpi('Profit', fmtRupee(profit), 'trending-up-outline', profit >= 0 ? colors.success : colors.danger, profit >= 0 ? colors.successBg : colors.dangerBg, profit, 'Gross profit this month — revenue minus FIFO cost.'),
        kpi('Margin', fmtPct(margin), 'pie-chart-outline', margin >= 20 ? colors.success : colors.warning, margin >= 20 ? colors.successBg : colors.warningBg, margin, 'Gross profit ÷ revenue.', false),
        kpi('Transactions', String(m?.transaction_count ?? 0), 'bag-check-outline', colors.info, colors.infoBg, m?.transaction_count ?? 0, 'Total sales count this month.', false),
        kpi('Avg sale', fmtRupee(avgSale), 'receipt-outline', colors.primary500, colors.primary50, avgSale, 'Average revenue per sale this month.'),
      ] as KpiItem[]} />

      {/* Pace card — only when we're inside the current month and have a forecast */}
      {projectedMonthTotal !== null && isCurrent && (
        <PaceCard
          unit="month"
          earnedSoFar={revenue}
          projectedTotal={projectedMonthTotal}
          previousTotal={prevM ? Number(prevM.total_revenue) : null}
          confidence={confidence}
        />
      )}

      {bars.length > 0 && (
        <Card>
          <ThemedText type="h4" style={styles.cardTitle}>
            Daily revenue {isCurrent ? `(1 – ${today_dom})` : ''}
          </ThemedText>
          <BarChart bars={bars} compact />
        </Card>
      )}

      <InsightStrip items={insights} />

      <MonthlyTopProducts year={year} month={month} />
    </>
  );
}

function MonthlyTopProducts({ year, month }: { year: number; month: number }) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const last = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  const { data } = useQuery({
    queryKey: [...QK.reports.topProducts(from), 'monthly'],
    queryFn: () => getTopProductsForPeriod(from, to),
  });
  if (!data || data.length === 0) return null;
  return <TopProductsCard items={data} title="Top products this month" />;
}

// ─── Year ────────────────────────────────────────────────────────────────────

function YearlyView({ year }: { year: number }) {
  const today = new Date();
  const isCurrent = year === today.getFullYear();

  const { data: y } = useQuery({
    queryKey: QK.reports.yearly(year),
    queryFn: () => getYearlySummary(year),
  });
  const { data: prevY } = useQuery({
    queryKey: QK.reports.yearly(year - 1),
    queryFn: () => getYearlySummary(year - 1),
  });

  const revenue = Number(y?.total_revenue ?? 0);
  const profit  = Number(y?.gross_profit ?? 0);
  const margin  = revenue > 0 ? (profit / revenue) * 100 : 0;
  const breakdown = y?.monthly_breakdown ?? [];
  const series: number[] = new Array(12).fill(0);
  breakdown.forEach((r) => { series[r.month - 1] = r.total_revenue; });

  const monthsElapsed = isCurrent ? today.getMonth() + 1 : 12;
  const elapsed = series.slice(0, monthsElapsed);
  const remaining = 12 - monthsElapsed;
  const forecast = remaining > 0 && elapsed.filter((v) => v > 0).length >= 3
    ? forecastSeries(elapsed, remaining)
    : null;
  const projectedYearTotal = forecast
    ? elapsed.reduce((s, n) => s + n, 0) + forecast.projected.reduce((s, n) => s + n, 0)
    : null;
  const confidence: 'high' | 'medium' | 'low' =
    !forecast ? 'low' :
    forecast.r2 >= 0.5 ? 'high' :
    forecast.r2 >= 0.25 ? 'medium' : 'low';

  // Chart shows only the months that have already happened.
  const max = Math.max(...elapsed, 1);
  const bars = elapsed.map((v, i) => ({
    label: monthName(i + 1).slice(0, 1),
    value: v,
    max,
  }));

  const insights: InsightChip[] = [];
  if (breakdown.length > 0) {
    const best = breakdown.reduce((mx, r) => r.total_revenue > mx.total_revenue ? r : mx, breakdown[0]);
    if (best.total_revenue > 0) {
      insights.push({
        id: 'best-month',
        icon: 'trophy-outline',
        tone: 'positive',
        text: `Best month: ${monthName(best.month)} (${fmtRupeeCompact(best.total_revenue)})`,
      });
    }
  }

  return (
    <>
      <HeroKpi
        label="REVENUE THIS YEAR"
        value={fmtRupee(revenue)}
        icon="cash-outline"
      />

      <KpiGrid items={[
        kpi('Profit', fmtRupee(profit), 'trending-up-outline', profit >= 0 ? colors.success : colors.danger, profit >= 0 ? colors.successBg : colors.dangerBg, profit, 'Gross profit for the year.'),
        kpi('Margin', fmtPct(margin), 'pie-chart-outline', margin >= 20 ? colors.success : colors.warning, margin >= 20 ? colors.successBg : colors.warningBg, margin, 'Gross profit as % of revenue.', false),
        kpi('Transactions', String(y?.transaction_count ?? 0), 'bag-check-outline', colors.info, colors.infoBg, y?.transaction_count ?? 0, 'Total sales count for the year.', false),
        kpi('Units sold', String(y?.units_sold ?? 0), 'cube-outline', colors.primary500, colors.primary50, y?.units_sold ?? 0, 'Total units sold across every product this year.', false),
      ] as KpiItem[]} />

      {projectedYearTotal !== null && isCurrent && (
        <PaceCard
          unit="year"
          earnedSoFar={revenue}
          projectedTotal={projectedYearTotal}
          previousTotal={prevY ? Number(prevY.total_revenue) : null}
          confidence={confidence}
        />
      )}

      {bars.length > 0 && (
        <Card>
          <ThemedText type="h4" style={styles.cardTitle}>
            Monthly revenue {isCurrent ? `(Jan – ${monthName(monthsElapsed)})` : ''}
          </ThemedText>
          <BarChart bars={bars} />
        </Card>
      )}

      <InsightStrip items={insights} />

      <YearlyTopProducts year={year} />
    </>
  );
}

function YearlyTopProducts({ year }: { year: number }) {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const { data } = useQuery({
    queryKey: [...QK.reports.topProducts(from), 'yearly'],
    queryFn: () => getTopProductsForPeriod(from, to),
  });
  if (!data || data.length === 0) return null;
  return <TopProductsCard items={data} title={`Top products in ${year}`} />;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function kpi(
  label: string,
  value: string,
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap,
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

function TopProductsCard({ items, title }: { items: { name: string; units_sold: number; revenue: number }[]; title: string }) {
  const maxRev = Math.max(...items.map((i) => i.revenue), 1);
  return (
    <Card>
      <ThemedText type="h4" style={styles.cardTitle}>{title}</ThemedText>
      <View style={{ gap: spacing[2] }}>
        {items.map((p, i) => (
          <View key={p.name + i} style={styles.tpRow}>
            <View style={styles.tpRank}>
              <ThemedText type="caption" color={i === 0 ? colors.warning : colors.textTertiary}>
                #{i + 1}
              </ThemedText>
            </View>
            <ThemedText type="body" style={styles.tpName} numberOfLines={1}>{p.name}</ThemedText>
            <View style={styles.tpBarTrack}>
              <View style={[styles.tpBarFill, { width: `${(p.revenue / maxRev) * 100}%` }]} />
            </View>
            <ThemedText type="caption" color={colors.textSecondary}>{p.units_sold}u</ThemedText>
            <ThemedText type="numericSm" color={colors.accent}>{fmtRupeeCompact(p.revenue)}</ThemedText>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing[5], gap: spacing[4], paddingBottom: spacing[12] },
  cardTitle: { marginBottom: spacing[3] },
  tpRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  tpRank: {
    width: 28, height: 22, borderRadius: 6,
    backgroundColor: colors.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  tpName: { flex: 1 },
  tpBarTrack: {
    width: 50, height: 6, borderRadius: 3,
    backgroundColor: colors.bgElevated, overflow: 'hidden',
  },
  tpBarFill: { height: '100%', backgroundColor: colors.primary500 },
});
