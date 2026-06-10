import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ThemedText } from '@/components/themed-text';
import { colors, spacing, radius } from '@/constants/theme';
import { fmtCurrency, fmtPct } from '@/lib/format-num';

export interface PurchaseCardData {
  id: string;
  quantity: number;
  quantity_remaining?: number;
  cost_price: number;
  selling_price: number;
  supplier?: string | null;
  notes?: string | null;
  purchased_at: string;
  products?: { name: string } | null;
}

export function PurchaseCard({ item, showProduct = true, onPress }: { item: PurchaseCardData; showProduct?: boolean; onPress?: () => void }) {
  const totalCost = Number(item.cost_price) * item.quantity;
  const profitPerUnit = Number(item.selling_price) - Number(item.cost_price);
  const totalProfit = profitPerUnit * item.quantity;
  const marginPct = Number(item.cost_price) > 0
    ? ((profitPerUnit / Number(item.cost_price)) * 100).toFixed(1)
    : '0';
  const remaining = item.quantity_remaining ?? null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={onPress ? 0.75 : 1}>
      {/* Top row: icon + title + date */}
      <View style={styles.topRow}>
        <View style={styles.iconBox}>
          <Ionicons name="cart" size={18} color={colors.info} />
        </View>
        <View style={styles.titleBlock}>
          {showProduct && item.products?.name ? (
            <ThemedText type="h4" numberOfLines={1}>{item.products.name}</ThemedText>
          ) : null}
          <ThemedText type="caption" color={colors.textTertiary}>
            {format(new Date(item.purchased_at), 'dd MMM yyyy · hh:mm a')}
          </ThemedText>
          {item.supplier ? (
            <View style={styles.supplierRow}>
              <Ionicons name="business-outline" size={12} color={colors.textTertiary} />
              <ThemedText type="caption" color={colors.textSecondary}>{item.supplier}</ThemedText>
            </View>
          ) : null}
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Metrics grid */}
      <View style={styles.grid}>
        <MetricCell label="Qty Purchased" value={`${item.quantity} units`} />
        {remaining !== null && (
          <MetricCell
            label="Remaining"
            value={`${remaining} units`}
            valueColor={remaining === 0 ? colors.danger : remaining < item.quantity * 0.3 ? colors.warning : colors.success}
          />
        )}
        <MetricCell label="Purchase Price" value={fmtCurrency(Number(item.cost_price))} />
        <MetricCell label="Sale Price" value={fmtCurrency(Number(item.selling_price))} />
        <MetricCell label="Total Cost" value={fmtCurrency(totalCost)} valueColor={colors.textPrimary} />
        <MetricCell
          label={`Profit / unit (${marginPct}%)`}
          value={fmtCurrency(profitPerUnit, true)}
          valueColor={profitPerUnit >= 0 ? colors.success : colors.danger}
        />
      </View>

      {/* Total profit banner */}
      <View style={[styles.profitBanner, { backgroundColor: totalProfit >= 0 ? colors.successBg : colors.dangerBg }]}>
        <ThemedText type="caption" color={colors.textSecondary}>Expected Profit (batch)</ThemedText>
        <ThemedText type="h4" color={totalProfit >= 0 ? colors.success : colors.danger}>
          {fmtCurrency(totalProfit, true)}
        </ThemedText>
      </View>

      {item.notes ? (
        <View style={styles.notesRow}>
          <Ionicons name="document-text-outline" size={13} color={colors.textTertiary} />
          <ThemedText type="caption" color={colors.textSecondary}>{item.notes}</ThemedText>
        </View>
      ) : null}
    </TouchableOpacity>
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
    backgroundColor: colors.infoBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  titleBlock: { flex: 1, gap: 3 },
  supplierRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
