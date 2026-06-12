import { ThemedText } from "@/components/themed-text";
import { PaymentStatusBadge } from "@/components/ui/payment-status-badge";
import { colors, radius, spacing } from "@/constants/theme";
import { fmtRupeeCompact } from "@/lib/format-num";
import { fmtKarachi } from "@/lib/datetime";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import type { PaymentStatus } from "@/types/app";

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
  customers?: { id: string; name: string; phone: string | null } | null;
  payment_status?: PaymentStatus | null;
  balance_due?: number | null;
  due_date?: string | null;
}

export function SaleCard({
  item,
  showProduct = true,
  onPress,
}: {
  item: SaleCardData;
  showProduct?: boolean;
  onPress?: () => void;
}) {
  const revenue = Number(item.total_revenue);
  const cost = Number(
    item.total_cost ?? Number(item.cost_price_per_unit ?? 0) * item.quantity,
  );
  const profit = Number(item.gross_profit);
  const isProfit = profit >= 0;
  const marginPct = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : "0";

  const status = item.payment_status ?? null;
  const balance = Number(item.balance_due ?? 0);
  const overdue =
    balance > 0 &&
    !!item.due_date &&
    new Date(item.due_date) < new Date(new Date().toDateString());
  const customerName = item.customers?.name ?? null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
    >
      {/* Top row: icon + title + date */}
      <View style={styles.topRow}>
        <View style={styles.iconBox}>
          <Ionicons name="receipt" size={18} color={colors.primary500} />
        </View>
        <View style={styles.titleBlock}>
          {showProduct && item.products?.name ? (
            <ThemedText type="h4" numberOfLines={1}>
              {item.products.name}
            </ThemedText>
          ) : null}
          <ThemedText type="caption" color={colors.textTertiary}>
            {fmtKarachi(item.sold_at, "dd MMM yyyy · hh:mm a")}
          </ThemedText>
          {customerName ? (
            <View style={styles.customerRow}>
              <Ionicons name="person-outline" size={12} color={colors.textTertiary} />
              <ThemedText type="caption" color={colors.textSecondary}>{customerName}</ThemedText>
            </View>
          ) : null}
        </View>
        <View style={styles.topRowRight}>
          {/* Revenue pill */}
          <View style={styles.revenuePill}>
            <ThemedText
              type="caption"
              color={colors.primary500}
              style={{ fontWeight: "700" }}
            >
              {fmtRupeeCompact(revenue)}
            </ThemedText>
          </View>
          {status && (
            <PaymentStatusBadge status={status} overdue={overdue} compact />
          )}
        </View>
      </View>

      {balance > 0 && (
        <View style={[styles.dueRow, overdue && styles.dueRowOverdue]}>
          <View style={styles.dueRowLeft}>
            <Ionicons
              name="time-outline"
              size={13}
              color={overdue ? colors.danger : colors.warning}
            />
            <ThemedText
              type="caption"
              color={overdue ? colors.danger : colors.textSecondary}
            >
              {item.due_date
                ? `Due ${fmtKarachi(item.due_date, "dd MMM")}`
                : "No due date"}
            </ThemedText>
          </View>
          <ThemedText
            type="caption"
            color={overdue ? colors.danger : colors.textPrimary}
            style={{ fontWeight: "700" }}
          >
            {fmtRupeeCompact(balance)} due
          </ThemedText>
        </View>
      )}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Metrics grid */}
      <View style={styles.grid}>
        <MetricCell label="Qty Sold" value={`${item.quantity} units`} />
        <MetricCell
          label="Sale Price / unit"
          value={fmtRupeeCompact(Number(item.sale_price_per_unit))}
        />
        {item.cost_price_per_unit != null && (
          <MetricCell
            label="Cost / unit"
            value={fmtRupeeCompact(Number(item.cost_price_per_unit))}
          />
        )}
        {cost > 0 && (
          <MetricCell label="Total Cost" value={fmtRupeeCompact(cost)} />
        )}
        <MetricCell
          label="Total Revenue"
          value={fmtRupeeCompact(revenue)}
          valueColor={colors.accent}
        />
        <MetricCell
          label={`Margin (${marginPct}%)`}
          value={fmtRupeeCompact(profit, true)}
          valueColor={isProfit ? colors.success : colors.danger}
        />
      </View>

      {/* Profit banner */}
      <View
        style={[
          styles.profitBanner,
          { backgroundColor: isProfit ? colors.successBg : colors.dangerBg },
        ]}
      >
        <ThemedText type="caption" color={colors.textSecondary}>
          Gross Profit
        </ThemedText>
        <ThemedText type="h4" color={isProfit ? colors.success : colors.danger}>
          {fmtRupeeCompact(profit, true)}
        </ThemedText>
      </View>

      {item.notes ? (
        <View style={styles.notesRow}>
          <Ionicons
            name="document-text-outline"
            size={13}
            color={colors.textTertiary}
          />
          <ThemedText type="caption" color={colors.textSecondary}>
            {item.notes}
          </ThemedText>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function MetricCell({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.metricCell}>
      <ThemedText type="caption" color={colors.textTertiary}>
        {label}
      </ThemedText>
      <ThemedText
        type="caption"
        color={valueColor ?? colors.textPrimary}
        style={styles.metricValue}
      >
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
    overflow: "hidden",
    paddingHorizontal: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
    padding: spacing[4],
    paddingBottom: spacing[3],
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primary50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  titleBlock: { flex: 1, gap: 3 },
  customerRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  topRowRight: { alignItems: "flex-end", gap: spacing[1] },
  revenuePill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    backgroundColor: colors.primary50,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary200,
    alignSelf: "flex-start",
  },
  dueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: spacing[4],
    marginTop: spacing[1],
    marginBottom: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.warningBg,
    borderRadius: radius.md,
  },
  dueRowOverdue: { backgroundColor: colors.dangerBg },
  dueRowLeft: { flexDirection: "row", alignItems: "center", gap: spacing[1] },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing[4],
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[1],
  },
  metricCell: {
    width: "48%",
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.bgElevated,
    borderRadius: radius.sm,
    gap: 2,
  },
  metricValue: { fontWeight: "600" },
  profitBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
  },
  notesRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
});
