import { useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { fmtCurrency, fmtPct } from '@/lib/format-num';
import { StatInfoModal } from '@/components/ui/stat-info-modal';
import { getSale, updateSale, deleteSale } from '@/api/sales';
import { QK } from '@/constants/query-keys';

const numStr = (msg?: string) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? NaN : Number(v)),
    z.number({ error: msg ?? 'Enter a valid number' }),
  );

const editSaleSchema = z.object({
  quantity: numStr('Enter quantity').pipe(z.number().int().min(1, 'Min 1')),
  sale_price_per_unit: numStr('Enter price').pipe(z.number().min(0.01, 'Enter a valid price')),
  notes: z.string().optional(),
  sold_at: z.string(),
});
type EditSaleValues = z.infer<typeof editSaleSchema>;

export default function SaleDetailView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [infoModal, setInfoModal] = useState<'revenue' | 'profit' | 'margin' | null>(null);

  const { data: sale, isLoading } = useQuery({
    queryKey: QK.sales.detail(id),
    queryFn: () => getSale(id),
    enabled: !!id,
  });

  const { control, handleSubmit, formState: { errors }, reset } = useForm<EditSaleValues, any, EditSaleValues>({
    resolver: zodResolver(editSaleSchema) as any,
    values: sale ? {
      quantity: sale.quantity,
      sale_price_per_unit: Number(sale.sale_price_per_unit),
      notes: sale.notes ?? '',
      sold_at: sale.sold_at,
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (values: EditSaleValues) => updateSale(id, values),
    onSuccess: () => {
      invalidateAll();
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSale(id),
    onSuccess: () => {
      invalidateAll();
      router.back();
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: QK.sales.all });
    qc.invalidateQueries({ queryKey: QK.sales.detail(id) });
    qc.invalidateQueries({ queryKey: QK.products.all });
    qc.invalidateQueries({ queryKey: QK.reports.daily(format(new Date(), 'yyyy-MM-dd')) });
    qc.invalidateQueries({ queryKey: QK.reports.weeklyRevenue });
    qc.invalidateQueries({ queryKey: QK.reports.topProducts(format(new Date(), 'yyyy-MM-dd')) });
    if (sale?.product_id) {
      qc.invalidateQueries({ queryKey: QK.sales.byProduct(sale.product_id) });
      qc.invalidateQueries({ queryKey: QK.reports.product(sale.product_id) });
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Sale',
      'This will reverse the sale and restore product stock. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
      ],
    );
  };

  const handleCancelEdit = () => {
    reset();
    setEditing(false);
  };

  if (isLoading || !sale) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary500} />
      </View>
    );
  }

  const revenue = Number(sale.total_revenue);
  const profit = Number(sale.gross_profit);
  const isProfit = profit >= 0;
  const marginPct = revenue > 0 ? fmtPct((profit / revenue) * 100) : '0%';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <ThemedText type="h3" numberOfLines={1}>{sale.products?.name ?? 'Sale'}</ThemedText>
            <ThemedText type="caption" color={colors.textSecondary}>
              {format(new Date(sale.sold_at), 'dd MMM yyyy · hh:mm a')}
            </ThemedText>
          </View>
          {!editing && (
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)} activeOpacity={0.8}>
                <Ionicons name="pencil" size={16} color={colors.primary500} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
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
            /* ── View mode ── */
            <>
              {/* Stats row */}
              <View style={styles.statsRow}>
                <StatCard label="Revenue" value={fmtCurrency(revenue)} color={colors.primary500} onPress={() => setInfoModal('revenue')} />
                <StatCard label="Profit" value={fmtCurrency(profit, true)} color={isProfit ? colors.success : colors.danger} onPress={() => setInfoModal('profit')} />
                <StatCard label="Margin" value={marginPct} color={isProfit ? colors.success : colors.warning} onPress={() => setInfoModal('margin')} />
              </View>

              <StatInfoModal
                visible={infoModal === 'revenue'}
                onClose={() => setInfoModal(null)}
                label="Total Revenue"
                description="The total amount collected from this sale (quantity × sale price per unit)."
                value={revenue}
                icon="cash-outline"
                accentColor={colors.primary500}
                accentBg={colors.primary50}
              />
              <StatInfoModal
                visible={infoModal === 'profit'}
                onClose={() => setInfoModal(null)}
                label="Gross Profit"
                description="Revenue minus FIFO cost of goods. This is how much you earned on this sale."
                value={profit}
                icon="trending-up-outline"
                accentColor={isProfit ? colors.success : colors.danger}
                accentBg={isProfit ? colors.successBg : colors.dangerBg}
              />
              <StatInfoModal
                visible={infoModal === 'margin'}
                onClose={() => setInfoModal(null)}
                label="Profit Margin"
                description="Gross profit as a percentage of revenue. Higher means more efficient selling."
                value={revenue > 0 ? (profit / revenue) * 100 : 0}
                isCurrency={false}
                icon="pie-chart-outline"
                accentColor={isProfit ? colors.success : colors.warning}
                accentBg={isProfit ? colors.successBg : colors.warningBg}
              />

              {/* Detail card */}
              <View style={styles.card}>
                <DetailRow icon="cube-outline" label="Quantity" value={`${sale.quantity} units`} />
                <Divider />
                <DetailRow icon="pricetag-outline" label="Sale Price / unit" value={fmtCurrency(Number(sale.sale_price_per_unit))} />
                <Divider />
                <DetailRow icon="wallet-outline" label="Cost / unit" value={fmtCurrency(Number(sale.cost_price_per_unit ?? 0))} />
                <Divider />
                <DetailRow icon="cash-outline" label="Total Revenue" value={fmtCurrency(revenue)} valueColor={colors.primary500} />
                <Divider />
                <DetailRow icon="trending-up-outline" label="Gross Profit" value={fmtCurrency(profit, true)} valueColor={isProfit ? colors.success : colors.danger} />
                {sale.notes ? (
                  <>
                    <Divider />
                    <DetailRow icon="document-text-outline" label="Notes" value={sale.notes} />
                  </>
                ) : null}
              </View>

              {/* Product info */}
              <View style={styles.card}>
                <DetailRow icon="storefront-outline" label="Product" value={sale.products?.name ?? '—'} />
              </View>
            </>
          ) : (
            /* ── Edit mode ── */
            <View style={styles.editForm}>
              <ThemedText type="h4" style={{ marginBottom: spacing[2] }}>Edit Sale</ThemedText>

              <Controller
                control={control}
                name="quantity"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Quantity"
                    value={String(value)}
                    onChangeText={onChange}
                    keyboardType="numeric"
                    error={errors.quantity?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="sale_price_per_unit"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Sale Price / unit (₨)"
                    value={String(value)}
                    onChangeText={onChange}
                    keyboardType="numeric"
                    error={errors.sale_price_per_unit?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="notes"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="Notes (optional)"
                    value={value ?? ''}
                    onChangeText={onChange}
                    multiline
                  />
                )}
              />
              <Controller
                control={control}
                name="sold_at"
                render={({ field: { value, onChange } }) => (
                  <DatePickerField
                    label="Sale Date"
                    value={value ? value.split('T')[0] : null}
                    onChange={(v) => onChange(v ? `${v}T${value?.split('T')[1] ?? '00:00:00'}` : value)}
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
                  title={updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                  onPress={handleSubmit((v) => updateMutation.mutate(v))}
                  disabled={updateMutation.isPending}
                  style={{ flex: 1 }}
                />
              </View>
              {updateMutation.error ? (
                <ThemedText type="caption" color={colors.danger}>
                  {String((updateMutation.error as any)?.message ?? 'Failed to save')}
                </ThemedText>
              ) : null}
            </View>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function StatCard({ label, value, color, onPress }: { label: string; value: string; color: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.75}>
      <ThemedText type="caption" color={colors.textSecondary}>{label}</ThemedText>
      <ThemedText type="h4" color={color} numberOfLines={1}>{value}</ThemedText>
    </TouchableOpacity>
  );
}

function DetailRow({ icon, label, value, valueColor }: { icon: string; label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon as any} size={16} color={colors.textTertiary} style={styles.detailIcon} />
      <ThemedText type="body" color={colors.textSecondary} style={styles.detailLabel}>{label}</ThemedText>
      <ThemedText type="body" color={valueColor ?? colors.textPrimary} style={styles.detailValue}>{value}</ThemedText>
    </View>
  );
}

function Divider() {
  return <View style={styles.rowDivider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[3],
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center',
  },
  headerActions: { flexDirection: 'row', gap: spacing[2] },
  editBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary50, borderWidth: 1, borderColor: colors.primary200,
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.danger + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: spacing[5], gap: spacing[4], paddingBottom: spacing[12] },
  statsRow: { flexDirection: 'row', gap: spacing[3] },
  statCard: {
    flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing[4], gap: spacing[1], alignItems: 'center',
    ...shadows.sm,
  },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    ...shadows.sm,
  },
  detailRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing[4], paddingVertical: spacing[3], gap: spacing[3],
  },
  detailIcon: { width: 20, flexShrink: 0 },
  detailLabel: { flex: 1 },
  detailValue: { fontFamily: 'Montserrat_600SemiBold', textAlign: 'right', flexShrink: 1 },
  rowDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing[4] },
  editForm: { gap: spacing[4] },
  editActions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2] },
});
