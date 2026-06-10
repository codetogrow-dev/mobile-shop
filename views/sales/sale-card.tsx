import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ThemedText } from '@/components/themed-text';
import { colors, spacing, radius } from '@/constants/theme';

export interface SaleCardData {
  id: string;
  quantity: number;
  sale_price_per_unit: number;
  cost_price_per_unit?: number;
  total_revenue: number;
  total_cost?: number;
  gross_profit: number;
  notes?: string | null;
  sold_at: string;
  products?: { name: string } | null;
}

export function SaleCard({ item, showProduct = true }: { item: SaleCardData; showProduct?: boolean }) {
  const revenue = Number(item.total_revenue);
  const cost = Number(item.total_cost ?? (Number(item.cost_price_per_unit ?? 0) * item.quantity));
  const profit = Number(item.gross_profit);
  const isProfit = profit >= 0;
  const marginPct = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0';

  return (
    <View style={styles.card}>
      {/* Top row: icon + title + date */}
      <View style={styles.topRow}>
        <View style={styles.iconBox}>
          <Ionicons name="receipt" size={18} color={colors.primary500} />
        </View>
        <View style={styles.titleBlock}>
          {showProduct && item.products?.name ? (
            <ThemedText type="h4" numberOfLines={1}>{item.products.name}</ThemedText>
          ) : null}
          <ThemedText type="caption" color={colors.textTertiary}>
            {format(new Date(item.sold_at), 'dd MMM yyyy · hh:mm a')}
          </ThemedText>
        </View>
        {/* Revenue pill */}
        <View style={styles.revenuePill}>
          <ThemedText type="caption" color={colors.primary500} style={{ fontWeight: '700' }}>
            ₨{revenue.toLocaleString()}
          </ThemedText>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Metrics grid */}
      <View style={styles.grid}>
        <MetricCell label="Qty Sold" value={`${item.quantity} units`} />
        <MetricCell
          label="Sale Price / unit"
          value={`₨${Number(item.sale_price_per_unit).toLocaleString()}`}
        />
        {item.cost_price_per_unit != null && (
          <MetricCell
            label="Cost / unit"
            value={`₨${Number(item.cost_price_per_unit).toLocaleString()}`}
          />
        )}
        {cost > 0 && (
          <MetricCell label="Total Cost" value={`₨${cost.toLocaleString()}`} />
        )}
        <MetricCell
          label="Total Revenue"
          value={`₨${revenue.toLocaleString()}`}
          valueColor={colors.accent}
        />
        <MetricCell
          label={`Margin (${marginPct}%)`}
          value={`${isProfit ? '+' : ''}₨${profit.toLocaleString()}`}
          valueColor={isProfit ? colors.success : colors.danger}
        />
      </View>

      {/* Profit banner */}
      <View style={[styles.profitBanner, { backgroundColor: isProfit ? colors.successBg : colors.dangerBg }]}>
        <ThemedText type="caption" color={colors.textSecondary}>Gross Profit</ThemedText>
        <ThemedText type="h4" color={isProfit ? colors.success : colors.danger}>
          {isProfit ? '+' : ''}₨{profit.toLocaleString()}
        </ThemedText>
      </View>

      {item.notes ? (
        <View style={styles.notesRow}>
          <Ionicons name="document-text-outline" size={13} color={colors.textTertiary} />
          <ThemedText type="caption" color={colors.textSecondary}>{item.notes}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

function MetricCell({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.metricCell}>
      <ThemedText type="caption" color={colors.textTertiary}>{label}</ThemedText>
      <ThemedText type="caption" color={valueColor ?? colors.textPrimary} style={styles.metricValue}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    padding: spacing[4],
    paddingBottom: spacing[3],
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  titleBlock: { flex: 1, gap: 3 },
  revenuePill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    backgroundColor: colors.primary50,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary200,
    alignSelf: 'flex-start',
  },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing[4] },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[1],
  },
  metricCell: {
    width: '48%',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.bgElevated,
    borderRadius: radius.sm,
    gap: 2,
  },
  metricValue: { fontWeight: '600' },
  profitBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
});
