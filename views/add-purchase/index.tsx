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
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { purchaseSchema, type PurchaseFormValues } from '@/types/app';
import { createPurchase } from '@/api/purchases';
import { listProducts } from '@/api/products';
import { QK } from '@/constants/query-keys';
import { useAuthStore } from '@/store/auth-store';

export default function AddPurchaseView() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [productSearch, setProductSearch] = useState('');

  const { data: products } = useQuery({
    queryKey: QK.products.list({ search: productSearch }),
    queryFn: () => listProducts({ search: productSearch }),
  });

  const { control, handleSubmit, formState: { errors }, watch, setValue } = useForm<PurchaseFormValues, any, PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema) as any,
    defaultValues: {
      product_id: '',
      quantity: 1,
      cost_price: 0,
      selling_price: 0,
      purchased_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
    },
  });

  const selectedProductId = watch('product_id');
  const selectedProduct = products?.find((p) => p.id === selectedProductId);

  const mutation = useMutation({
    mutationFn: (values: PurchaseFormValues) =>
      createPurchase({ ...values, tenant_id: (user as any)?.user_metadata?.tenant_id ?? user?.id ?? '' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.products.all });
      qc.invalidateQueries({ queryKey: QK.purchases.all });
      router.back();
    },
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <ThemedText type="h3">Record Purchase</ThemedText>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {mutation.error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <ThemedText type="caption" color={colors.danger}>
                {(mutation.error as any)?.message ?? 'Failed to record purchase'}
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
            {selectedProduct && (
              <View style={styles.selectedProduct}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <ThemedText type="body" color={colors.success}>{selectedProduct.name}</ThemedText>
                <ThemedText type="caption" color={colors.textTertiary}>
                  Stock: {selectedProduct.current_stock}
                </ThemedText>
              </View>
            )}
            <View style={styles.productList}>
              {products?.slice(0, 6).map((p) => (
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
                      Current stock: {p.current_stock}
                    </ThemedText>
                  </View>
                  {selectedProductId === p.id && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary500} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {errors.product_id && (
              <ThemedText type="caption" color={colors.danger}>{errors.product_id.message}</ThemedText>
            )}
          </Card>

          {/* Purchase Details */}
          <Card>
            <ThemedText type="h4" style={styles.sectionTitle}>Purchase Details</ThemedText>

            <Controller
              control={control}
              name="quantity"
              render={({ field }) => (
                <Input
                  label="Quantity Purchased *"
                  placeholder="0"
                  keyboardType="numeric"
                  value={String(field.value)}
                  onChangeText={field.onChange}
                  error={errors.quantity?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="cost_price"
              render={({ field }) => (
                <Input
                  label="Cost Price (per unit) *"
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={String(field.value)}
                  onChangeText={field.onChange}
                  error={errors.cost_price?.message}
                  leftIcon={<ThemedText type="caption" color={colors.textTertiary}>₨</ThemedText>}
                />
              )}
            />

            <Controller
              control={control}
              name="selling_price"
              render={({ field }) => (
                <Input
                  label="Selling Price (per unit) *"
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={String(field.value)}
                  onChangeText={field.onChange}
                  error={errors.selling_price?.message}
                  leftIcon={<ThemedText type="caption" color={colors.textTertiary}>₨</ThemedText>}
                />
              )}
            />

            <Controller
              control={control}
              name="supplier"
              render={({ field }) => (
                <Input
                  label="Supplier (optional)"
                  placeholder="Supplier name"
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
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
                  multiline
                  numberOfLines={2}
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                />
              )}
            />
          </Card>

          <Button
            label="Record Purchase"
            onPress={handleSubmit((v) => mutation.mutate(v))}
            loading={mutation.isPending}
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
  selectedProduct: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
    padding: spacing[2],
    backgroundColor: colors.successBg,
    borderRadius: radius.sm,
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
});