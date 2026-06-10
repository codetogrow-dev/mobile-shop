import { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { ThemedText } from '@/components/themed-text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { fmtCurrency } from '@/lib/format-num';
import { saleSchema, type SaleFormValues } from '@/types/app';
import { createSale } from '@/api/sales';
import { listProducts } from '@/api/products';
import { QK } from '@/constants/query-keys';
import { useAuthStore } from '@/store/auth-store';

export default function AddSaleView() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [productSearch, setProductSearch] = useState('');

  const { data: products } = useQuery({
    queryKey: QK.products.list({ search: productSearch }),
    queryFn: () => listProducts({ search: productSearch }),
  });

  const { control, handleSubmit, formState: { errors }, watch, setValue } = useForm<SaleFormValues, any, SaleFormValues>({
    resolver: zodResolver(saleSchema) as any,
    defaultValues: {
      product_id: '',
      quantity: 1,
      sale_price_per_unit: 0,
      sold_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
    },
  });

  const selectedProductId = watch('product_id');
  const qty = watch('quantity');
  const price = watch('sale_price_per_unit');
  const selectedProduct = products?.find((p) => p.id === selectedProductId);
  const total = Number(qty) * Number(price);

  const mutation = useMutation({
    mutationFn: (values: SaleFormValues) =>
      createSale({ ...values, tenant_id: (user as any)?.user_metadata?.tenant_id ?? user?.id ?? '' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.products.all });
      qc.invalidateQueries({ queryKey: QK.sales.all });
      router.back();
    },
  });

  const stockOk = !selectedProduct || Number(qty) <= selectedProduct.current_stock;

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
          <Card>
            <ThemedText type="h4" style={styles.sectionTitle}>Select Product</ThemedText>
            <Input
              placeholder="Search products…"
              value={productSearch}
              onChangeText={setProductSearch}
              leftIcon={<Ionicons name="search" size={16} color={colors.textTertiary} />}
            />
            <View style={styles.productList}>
              {products?.filter(p => p.current_stock > 0).slice(0, 6).map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.productRow, selectedProductId === p.id && styles.productRowActive]}
                  onPress={() => setValue('product_id', p.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.productRowInfo}>
                    <ThemedText type="body" color={selectedProductId === p.id ? colors.primary600 : colors.textPrimary}>
                      {p.name}
                    </ThemedText>
                    <ThemedText type="caption" color={colors.textTertiary}>
                      Available: {p.current_stock}
                    </ThemedText>
                  </View>
                  <View style={styles.productRowRight}>
                    <Badge
                      label={`${p.current_stock} left`}
                      variant={p.current_stock <= p.reorder_point ? 'warning' : 'success'}
                    />
                    {selectedProductId === p.id && (
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary500} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            {errors.product_id && (
              <ThemedText type="caption" color={colors.danger}>{errors.product_id.message}</ThemedText>
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

            {total > 0 && (
              <View style={styles.totalRow}>
                <ThemedText type="body" color={colors.textSecondary}>Total Amount</ThemedText>
                <ThemedText type="numeric" color={colors.accent}>{fmtCurrency(total)}</ThemedText>
              </View>
            )}
          </Card>

          <Button
            label="Record Sale"
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
  productList: { marginTop: spacing[3], gap: spacing[2] },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productRowActive: {
    borderColor: colors.primary300,
    backgroundColor: colors.primary50,
  },
  productRowInfo: { gap: 2 },
  productRowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
