import { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { nowKarachiISO } from '@/lib/datetime';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { PersonPicker } from '@/components/ui/person-picker';
import { PaymentSection } from '@/components/ui/payment-section';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { saleSchema, type SaleFormValues } from '@/types/app';
import { createSale } from '@/api/sales';
import { listProducts } from '@/api/products';
import { QK } from '@/constants/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { PAYMENT_MODE } from '@/constants/enums';

interface ProductItem {
  id: string;
  label: string;
  current_stock: number;
  reorder_point: number;
}

export default function AddSaleView() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [productSearch, setProductSearch] = useState('');

  const { data: products } = useQuery({
    queryKey: QK.products.list({ search: productSearch }),
    queryFn: () => listProducts({ search: productSearch }),
  });

  const productItems: ProductItem[] = (products ?? [])
    .filter((p) => p.current_stock > 0)
    .map((p) => ({
      id: p.id,
      label: p.name,
      current_stock: Number(p.current_stock),
      reorder_point: Number(p.reorder_point),
    }));

  const { control, handleSubmit, formState: { errors }, watch, setValue } =
    useForm<SaleFormValues, any, SaleFormValues>({
      resolver: zodResolver(saleSchema) as any,
      defaultValues: {
        product_id: '',
        quantity: 1,
        sale_price_per_unit: 0,
        // Karachi-stamped ISO so Postgres timestamptz stores the real local
        // moment regardless of the device timezone.
        sold_at: nowKarachiISO(),
        payment_mode: PAYMENT_MODE.FULL,
        customer_id: null,
        due_date: null,
      } as any,
    });

  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedProductId = watch('product_id');
  const qty               = Number(watch('quantity')) || 0;
  const price             = Number(watch('sale_price_per_unit')) || 0;
  const total             = qty * price;
  const paymentMode       = watch('payment_mode');
  const amountPaidStr     = String(watch('amount_paid') ?? '');
  const dueDate           = (watch('due_date') as string | null) ?? null;
  const customerId        = (watch('customer_id') as string | null) ?? null;
  const selectedProduct = products?.find((p) => p.id === selectedProductId);

  const mutation = useMutation({
    mutationFn: (values: SaleFormValues) =>
      createSale({ ...values, tenant_id: (user as any)?.user_metadata?.tenant_id ?? user?.id ?? '' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.products.all });
      qc.invalidateQueries({ queryKey: QK.sales.all });
      qc.invalidateQueries({ queryKey: QK.dues.all });
      qc.invalidateQueries({ queryKey: QK.customers.all });
      router.back();
    },
  });

  const stockOk = !selectedProduct || qty <= selectedProduct.current_stock;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <ThemedText type="h3">Record Sale</ThemedText>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {mutation.error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <ThemedText type="caption" color={colors.danger}>
                {(mutation.error as any)?.message ?? 'Failed to record sale'}
              </ThemedText>
            </View>
          )}

          {/* Product Picker */}
          <Card style={pickerOpen ? styles.productCardElevated : undefined}>
            <ThemedText type="h4" style={styles.sectionTitle}>Select Product</ThemedText>
            <Combobox<ProductItem>
              items={productItems}
              selectedIds={selectedProductId ? [selectedProductId] : []}
              onChangeSelectedIds={(ids) =>
                setValue('product_id', ids[0] ?? '', { shouldValidate: true })
              }
              placeholder="Search products…"
              multiple={false}
              noBackdrop
              onOpenChange={setPickerOpen}
              onQueryChange={setProductSearch}
              renderItem={({ item, selected }) => (
                <View style={styles.productRowInner}>
                  <View style={styles.productRowInfo}>
                    <ThemedText
                      type="body"
                      color={selected ? colors.primary600 : colors.textPrimary}
                      style={selected ? { fontWeight: '700' } : undefined}
                      numberOfLines={1}
                    >
                      {item.label}
                    </ThemedText>
                    <ThemedText type="caption" color={colors.textTertiary}>
                      Available: {item.current_stock}
                    </ThemedText>
                  </View>
                  <View style={styles.productRowRight}>
                    <Badge
                      label={`${item.current_stock} left`}
                      variant={item.current_stock <= item.reorder_point ? 'warning' : 'success'}
                    />
                    {selected && (
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary500} />
                    )}
                  </View>
                </View>
              )}
            />
            {errors.product_id && (
              <ThemedText type="caption" color={colors.danger} style={{ marginTop: spacing[2] }}>
                {errors.product_id.message}
              </ThemedText>
            )}
          </Card>

          {/* Sale Details */}
          <Card>
            <ThemedText type="h4" style={styles.sectionTitle}>Sale Details</ThemedText>

            <Controller
              control={control}
              name="quantity"
              render={({ field }) => (
                <Input
                  label="Quantity Sold *"
                  placeholder="0"
                  keyboardType="numeric"
                  value={String(field.value)}
                  onChangeText={field.onChange}
                  error={
                    errors.quantity?.message ??
                    (!stockOk ? `Only ${selectedProduct?.current_stock} units available` : undefined)
                  }
                />
              )}
            />

            <Controller
              control={control}
              name="sale_price_per_unit"
              render={({ field }) => (
                <Input
                  label="Sale Price (per unit) *"
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={String(field.value)}
                  onChangeText={field.onChange}
                  error={errors.sale_price_per_unit?.message}
                  leftIcon={<ThemedText type="caption" color={colors.textTertiary}>₨</ThemedText>}
                />
              )}
            />

            <Controller
              control={control}
              name="notes"
              render={({ field }) => (
                <Input
                  label="Notes (optional)"
                  placeholder="Any additional notes"
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                />
              )}
            />
          </Card>

          {/* Customer */}
          <Card>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Customer{paymentMode === PAYMENT_MODE.FULL ? ' (optional)' : ''}
            </ThemedText>
            <PersonPicker
              kind="customer"
              value={customerId}
              onChange={(id) => setValue('customer_id', id, { shouldValidate: true })}
              error={errors.customer_id?.message}
              required={paymentMode !== PAYMENT_MODE.FULL}
            />
          </Card>

          {/* Payment */}
          <Card>
            <ThemedText type="h4" style={styles.sectionTitle}>Payment</ThemedText>
            <PaymentSection
              total={total}
              mode={paymentMode}
              onModeChange={(m) => setValue('payment_mode', m, { shouldValidate: true })}
              amountPaidStr={amountPaidStr}
              onAmountPaidChange={(v) => setValue('amount_paid', v as any, { shouldValidate: true })}
              amountPaidError={errors.amount_paid?.message}
              dueDate={dueDate}
              onDueDateChange={(v) => setValue('due_date', v, { shouldValidate: true })}
              dueDateError={errors.due_date?.message as string | undefined}
              partyLabel="customer"
            />
          </Card>

          <Button
            label={
              paymentMode === PAYMENT_MODE.FULL
                ? 'Record Sale'
                : paymentMode === PAYMENT_MODE.UNPAID
                  ? 'Record on Credit'
                  : 'Record Partial Sale'
            }
            onPress={handleSubmit((v) => mutation.mutate(v))}
            loading={mutation.isPending}
            disabled={!stockOk}
            fullWidth
            size="lg"
          />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.bgElevated,
  },
  content: { padding: spacing[5], gap: spacing[4], paddingBottom: spacing[10] },
  sectionTitle: { marginBottom: spacing[3] },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.dangerBg,
    borderRadius: radius.md,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.danger,
  },
  productRowInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  productRowInfo: { flex: 1, gap: 2 },
  productRowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  // Raised above the next Card while the dropdown is open so it doesn't get
  // covered. Higher than the next sibling's default elevation/zIndex.
  productCardElevated: { zIndex: 100, elevation: 12 },
});
