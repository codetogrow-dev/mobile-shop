import { fmtKarachi, todayKarachi } from "@/lib/datetime";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

import { listPayments } from "@/api/payments";
import { deletePurchase, getPurchase, updatePurchase } from "@/api/purchases";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Input } from "@/components/ui/input";
import { PaymentStatusBadge } from "@/components/ui/payment-status-badge";
import { StatInfoModal } from "@/components/ui/stat-info-modal";
import { QK } from "@/constants/query-keys";
import { colors, radius, shadows, spacing } from "@/constants/theme";
import { fmtCurrency, fmtPct } from "@/lib/format-num";
import { ContactActions } from "@/views/customer-detail/contact-actions";
import { PaymentTimeline } from "@/views/customer-detail/payment-timeline";
import { parseISO } from "date-fns";

const numStr = (msg?: string) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? NaN : Number(v)),
    z.number({ error: msg ?? "Enter a valid number" }),
  );

const editPurchaseSchema = z.object({
  cost_price: numStr("Enter cost price").pipe(
    z.number().min(0.01, "Enter a valid price"),
  ),
  selling_price: numStr("Enter selling price").pipe(
    z.number().min(0.01, "Enter a valid price"),
  ),
  supplier: z.string().optional(),
  notes: z.string().optional(),
  purchased_at: z.string(),
});
type EditPurchaseValues = z.infer<typeof editPurchaseSchema>;

export default function PurchaseDetailView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [infoModal, setInfoModal] = useState<
    "cost" | "profit" | "margin" | null
  >(null);

  const { data: purchase, isLoading } = useQuery({
    queryKey: QK.purchases.detail(id),
    queryFn: () => getPurchase(id),
    enabled: !!id,
  });

  const { data: payments } = useQuery({
    queryKey: QK.payments.byTransaction("purchase", id),
    queryFn: () => listPayments("purchase", id),
    enabled: !!id,
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EditPurchaseValues, any, EditPurchaseValues>({
    resolver: zodResolver(editPurchaseSchema) as any,
    values: purchase
      ? {
          cost_price: Number(purchase.cost_price),
          selling_price: Number(purchase.selling_price),
          supplier: purchase.supplier ?? "",
          notes: purchase.notes ?? "",
          purchased_at: purchase.purchased_at,
        }
      : undefined,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: QK.purchases.all });
    qc.invalidateQueries({ queryKey: QK.purchases.detail(id) });
    qc.invalidateQueries({
      queryKey: QK.payments.byTransaction("purchase", id),
    });
    qc.invalidateQueries({ queryKey: QK.products.all });
    qc.invalidateQueries({ queryKey: QK.reports.weeklyRevenue });
    qc.invalidateQueries({ queryKey: QK.reports.daily(todayKarachi()) });
    if (purchase?.product_id) {
      qc.invalidateQueries({
        queryKey: QK.purchases.byProduct(purchase.product_id),
      });
      qc.invalidateQueries({
        queryKey: QK.reports.product(purchase.product_id),
      });
    }
  };

  const updateMutation = useMutation({
    mutationFn: (values: EditPurchaseValues) => updatePurchase(id, values),
    onSuccess: () => {
      invalidateAll();
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePurchase(id),
    onSuccess: () => {
      invalidateAll();
      router.back();
    },
  });

  const handleDelete = () => {
    Alert.alert(
      "Delete Purchase",
      "This will permanently delete this purchase batch. Stock levels will not be automatically adjusted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(),
        },
      ],
    );
  };

  const handleCancelEdit = () => {
    reset();
    setEditing(false);
  };

  if (isLoading || !purchase) {
    return (
      <View
        style={[styles.container, styles.centered, { paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color={colors.primary500} />
      </View>
    );
  }

  const totalCost = Number(purchase.cost_price) * purchase.quantity;
  const profitPerUnit =
    Number(purchase.selling_price) - Number(purchase.cost_price);
  const totalExpectedProfit = profitPerUnit * purchase.quantity;
  const marginPct =
    Number(purchase.cost_price) > 0
      ? fmtPct((profitPerUnit / Number(purchase.cost_price)) * 100)
      : "0%";
  const remaining = purchase.quantity_remaining ?? null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <ThemedText type="h3" numberOfLines={1}>
              {purchase.products?.name ?? "Purchase"}
            </ThemedText>
            <ThemedText type="caption" color={colors.textSecondary}>
              {fmtKarachi(purchase.purchased_at, "dd MMM yyyy · hh:mm a")}
            </ThemedText>
          </View>
          {!editing && (
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => setEditing(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="pencil" size={16} color={colors.primary500} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={colors.danger}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!editing ? (
            <>
              {/* Stats row */}
              <View style={styles.statsRow}>
                <StatCard
                  label="Total Cost"
                  value={fmtCurrency(totalCost)}
                  color={colors.info}
                  onPress={() => setInfoModal("cost")}
                />
                <StatCard
                  label="Exp. Profit"
                  value={fmtCurrency(totalExpectedProfit, true)}
                  color={
                    totalExpectedProfit >= 0 ? colors.success : colors.danger
                  }
                  onPress={() => setInfoModal("profit")}
                />
                <StatCard
                  label="Margin"
                  value={marginPct}
                  color={colors.primary500}
                  onPress={() => setInfoModal("margin")}
                />
              </View>

              <StatInfoModal
                visible={infoModal === "cost"}
                onClose={() => setInfoModal(null)}
                label="Total Cost"
                description="Total capital invested in this purchase batch (quantity × cost price per unit)."
                value={totalCost}
                icon="wallet-outline"
                accentColor={colors.info}
                accentBg={colors.infoBg}
              />
              <StatInfoModal
                visible={infoModal === "profit"}
                onClose={() => setInfoModal(null)}
                label="Expected Profit"
                description="Projected profit if all units in this batch are sold at the intended selling price."
                value={totalExpectedProfit}
                icon="trending-up-outline"
                accentColor={
                  totalExpectedProfit >= 0 ? colors.success : colors.danger
                }
                accentBg={
                  totalExpectedProfit >= 0 ? colors.successBg : colors.dangerBg
                }
              />
              <StatInfoModal
                visible={infoModal === "margin"}
                onClose={() => setInfoModal(null)}
                label="Profit Margin"
                description="Expected profit as a percentage of cost price per unit. Shows how much markup is applied."
                value={
                  Number(purchase.cost_price) > 0
                    ? (profitPerUnit / Number(purchase.cost_price)) * 100
                    : 0
                }
                isCurrency={false}
                icon="pie-chart-outline"
                accentColor={colors.primary500}
                accentBg={colors.primary50}
              />

              {/* Detail card */}
              <View style={styles.card}>
                <DetailRow
                  icon="cube-outline"
                  label="Qty Purchased"
                  value={`${purchase.quantity} units`}
                />
                {remaining !== null && (
                  <>
                    <Divider />
                    <DetailRow
                      icon="layers-outline"
                      label="Remaining"
                      value={`${remaining} units`}
                      valueColor={
                        remaining === 0
                          ? colors.danger
                          : remaining < purchase.quantity * 0.3
                            ? colors.warning
                            : colors.success
                      }
                    />
                  </>
                )}
                <Divider />
                <DetailRow
                  icon="cart-outline"
                  label="Cost Price / unit"
                  value={fmtCurrency(Number(purchase.cost_price))}
                />
                <Divider />
                <DetailRow
                  icon="pricetag-outline"
                  label="Selling Price / unit"
                  value={fmtCurrency(Number(purchase.selling_price))}
                />
                <Divider />
                <DetailRow
                  icon="cash-outline"
                  label="Total Cost"
                  value={fmtCurrency(totalCost)}
                  valueColor={colors.info}
                />
                <Divider />
                <DetailRow
                  icon="trending-up-outline"
                  label={`Profit / unit (${marginPct})`}
                  value={fmtCurrency(profitPerUnit, true)}
                  valueColor={
                    profitPerUnit >= 0 ? colors.success : colors.danger
                  }
                />
                {purchase.supplier ? (
                  <>
                    <Divider />
                    <DetailRow
                      icon="business-outline"
                      label="Supplier"
                      value={purchase.supplier}
                    />
                  </>
                ) : null}
                {purchase.notes ? (
                  <>
                    <Divider />
                    <DetailRow
                      icon="document-text-outline"
                      label="Notes"
                      value={purchase.notes}
                    />
                  </>
                ) : null}
              </View>

              {/* Payment & Dues card */}
              <PaymentDuesCard
                purchase={purchase}
                payments={payments ?? []}
                onRecordPayment={() =>
                  router.push({
                    pathname: "/(app)/record-payment",
                    params: {
                      transactionType: "purchase",
                      transactionId: id,
                      maxAmount: String(Number(purchase.balance_due ?? 0)),
                    },
                  })
                }
              />

              <View style={styles.card}>
                <DetailRow
                  icon="storefront-outline"
                  label="Product"
                  value={purchase.products?.name ?? "—"}
                />
              </View>
            </>
          ) : (
            <View style={styles.editForm}>
              <ThemedText type="h4" style={{ marginBottom: spacing[2] }}>
                Edit Purchase
              </ThemedText>

              <Controller
                control={control}
                name="cost_price"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Cost Price / unit (₨)"
                    value={String(value)}
                    onChangeText={onChange}
                    keyboardType="numeric"
                    error={errors.cost_price?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="selling_price"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Selling Price / unit (₨)"
                    value={String(value)}
                    onChangeText={onChange}
                    keyboardType="numeric"
                    error={errors.selling_price?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="supplier"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Supplier (optional)"
                    value={value ?? ""}
                    onChangeText={onChange}
                  />
                )}
              />
              <Controller
                control={control}
                name="notes"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Notes (optional)"
                    value={value ?? ""}
                    onChangeText={onChange}
                    multiline
                  />
                )}
              />
              <Controller
                control={control}
                name="purchased_at"
                render={({ field: { value, onChange } }) => (
                  <DatePickerField
                    label="Purchase Date"
                    value={value ? value.split("T")[0] : null}
                    onChange={(v) =>
                      onChange(
                        v
                          ? `${v}T${value?.split("T")[1] ?? "00:00:00"}`
                          : value,
                      )
                    }
                    maximumDate={new Date()}
                    placeholder="Select date"
                  />
                )}
              />

              <View style={styles.editActions}>
                <Button
                  title="Cancel"
                  onPress={handleCancelEdit}
                  variant="outline"
                  style={{ flex: 1 }}
                />
                <Button
                  title={updateMutation.isPending ? "Saving…" : "Save Changes"}
                  onPress={handleSubmit((v) => updateMutation.mutate(v))}
                  disabled={updateMutation.isPending}
                  style={{ flex: 1 }}
                />
              </View>
              {updateMutation.error ? (
                <ThemedText type="caption" color={colors.danger}>
                  {String(
                    (updateMutation.error as any)?.message ?? "Failed to save",
                  )}
                </ThemedText>
              ) : null}
            </View>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function PaymentDuesCard({
  purchase,
  payments,
  onRecordPayment,
}: {
  purchase: any;
  payments: any[];
  onRecordPayment: () => void;
}) {
  const total = Number(purchase.quantity) * Number(purchase.cost_price);
  const paid = Number(purchase.amount_paid ?? 0);
  const balance = Number(purchase.balance_due ?? 0);
  const status =
    (purchase.payment_status as "paid" | "partial" | "unpaid" | null) ?? null;
  const dueDate = purchase.due_date ? parseISO(purchase.due_date) : null;
  const today = new Date(new Date().toDateString());
  const overdue = balance > 0 && !!dueDate && dueDate < today;
  const supplier = purchase.suppliers ?? null;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.duesHeader}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[2],
          }}
        >
          <Ionicons
            name="wallet-outline"
            size={16}
            color={colors.textSecondary}
          />
          <ThemedText type="h4">Payment & Dues</ThemedText>
        </View>
        {status && <PaymentStatusBadge status={status} overdue={overdue} />}
      </View>

      <Divider />
      <DetailRow
        icon="cash-outline"
        label="Total Cost"
        value={fmtCurrency(total)}
      />
      <Divider />
      <DetailRow
        icon="checkmark-circle-outline"
        label="Paid"
        value={fmtCurrency(paid)}
        valueColor={colors.success}
      />
      <Divider />
      <DetailRow
        icon="alert-circle-outline"
        label="You Owe"
        value={fmtCurrency(balance)}
        valueColor={balance > 0 ? colors.danger : colors.success}
      />
      {dueDate && (
        <>
          <Divider />
          <DetailRow
            icon="calendar-outline"
            label={overdue ? "Overdue since" : "Due Date"}
            value={fmtKarachi(dueDate, "dd MMM yyyy")}
            valueColor={overdue ? colors.danger : colors.textPrimary}
          />
        </>
      )}

      {/* Supplier sub-section */}
      {supplier && (
        <>
          <Divider />
          <TouchableOpacity
            onPress={() => router.push(`/(app)/supplier/${supplier.id}` as any)}
            activeOpacity={0.7}
          >
            <DetailRow
              icon="business-outline"
              label="Supplier"
              value={supplier.name}
              valueColor={colors.primary500}
            />
          </TouchableOpacity>
          {supplier.phone ? (
            <>
              <Divider />
              <DetailRow
                icon="call-outline"
                label="Phone"
                value={supplier.phone}
              />
            </>
          ) : null}
          {supplier.cnic ? (
            <>
              <Divider />
              <DetailRow
                icon="card-outline"
                label="CNIC"
                value={supplier.cnic}
              />
            </>
          ) : null}
          {supplier.address ? (
            <>
              <Divider />
              <DetailRow
                icon="location-outline"
                label="Address"
                value={supplier.address}
              />
            </>
          ) : null}
          <View style={styles.contactActionsWrap}>
            <ContactActions phone={supplier.phone ?? null} />
          </View>
        </>
      )}

      {/* Record-payment CTA */}
      {balance > 0 && (
        <View style={styles.recordBtnWrap}>
          <Button
            label={`Record Payment (${fmtCurrency(balance)} remaining)`}
            onPress={onRecordPayment}
            fullWidth
          />
        </View>
      )}

      {/* Payment history */}
      <View style={styles.timelineWrap}>
        <ThemedText
          type="overline"
          color={colors.textTertiary}
          style={{ marginBottom: spacing[2] }}
        >
          PAYMENTS
        </ThemedText>
        <PaymentTimeline payments={payments} />
      </View>
    </View>
  );
}

function StatCard({
  label,
  value,
  color,
  onPress,
}: {
  label: string;
  value: string;
  color: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.statCard}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <ThemedText type="caption" color={colors.textSecondary}>
        {label}
      </ThemedText>
      <ThemedText type="h4" color={color} numberOfLines={1}>
        {value}
      </ThemedText>
    </TouchableOpacity>
  );
}

function DetailRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons
        name={icon as any}
        size={16}
        color={colors.textTertiary}
        style={styles.detailIcon}
      />
      <ThemedText
        type="body"
        color={colors.textSecondary}
        style={styles.detailLabel}
      >
        {label}
      </ThemedText>
      <ThemedText
        type="body"
        color={valueColor ?? colors.textPrimary}
        style={styles.detailValue}
      >
        {value}
      </ThemedText>
    </View>
  );
}

function Divider() {
  return <View style={styles.rowDivider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  centered: { alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  headerActions: { flexDirection: "row", gap: spacing[2] },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.danger + "40",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: spacing[5], gap: spacing[4], paddingBottom: spacing[12] },
  statsRow: { flexDirection: "row", gap: spacing[3] },
  statCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[1],
    alignItems: "center",
    ...shadows.sm,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  detailIcon: { width: 20, flexShrink: 0 },
  detailLabel: { flex: 1 },
  detailValue: {
    fontFamily: "Montserrat_600SemiBold",
    textAlign: "right",
    flexShrink: 1,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing[4],
  },
  editForm: { gap: spacing[4] },
  editActions: { flexDirection: "row", gap: spacing[3], marginTop: spacing[2] },
  duesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  contactActionsWrap: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  recordBtnWrap: { paddingHorizontal: spacing[4], paddingTop: spacing[3] },
  timelineWrap: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
  },
});
