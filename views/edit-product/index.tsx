import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CategoryPicker } from '@/components/ui/category-picker';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { productSchema, type ProductFormValues } from '@/types/app';
import { getProduct, updateProduct } from '@/api/products';
import { listCategories } from '@/api/categories';
import { QK } from '@/constants/query-keys';

export default function EditProductView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { data: product, isLoading } = useQuery({
    queryKey: QK.products.detail(id),
    queryFn: () => getProduct(id),
    enabled: !!id,
  });

  const { data: categories } = useQuery({
    queryKey: QK.categories.all,
    queryFn: listCategories,
  });

  const { control, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm<ProductFormValues, any, ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: { name: '', unit: 'piece', reorder_point: 5 },
  });

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        sku: product.sku ?? '',
        barcode: product.barcode ?? '',
        unit: product.unit,
        description: product.description ?? '',
        reorder_point: product.reorder_point,
        category_id: product.category_id ?? null,
      });
    }
  }, [product]);

  const selectedCategoryId = watch('category_id');

  const mutation = useMutation({
    mutationFn: (values: ProductFormValues) => updateProduct(id, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.products.all });
      qc.invalidateQueries({ queryKey: QK.products.detail(id) });
      router.back();
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary500} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <ThemedText type="h3">Edit Product</ThemedText>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {mutation.error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <ThemedText type="caption" color={colors.danger}>
                {(mutation.error as any)?.message ?? 'Failed to update product'}
              </ThemedText>
            </View>
          )}

          <Card>
            <ThemedText type="h4" style={styles.sectionTitle}>Product Details</ThemedText>
            <Controller control={control} name="name" render={({ field }) => (
              <Input label="Product Name *" value={field.value} onChangeText={field.onChange} error={errors.name?.message} />
            )} />
            <Controller control={control} name="sku" render={({ field }) => (
              <Input label="SKU / Code" value={field.value ?? ''} onChangeText={field.onChange} />
            )} />
            <Controller control={control} name="barcode" render={({ field }) => (
              <Input
                label="Barcode"
                value={field.value ?? ''}
                onChangeText={field.onChange}
                rightIcon={<Ionicons name="scan-outline" size={18} color={colors.primary500} />}
              />
            )} />
          </Card>

          <Card>
            <ThemedText type="h4" style={styles.sectionTitle}>Category</ThemedText>
            <CategoryPicker
              categories={categories ?? []}
              selectedId={selectedCategoryId}
              onSelect={(id) => setValue('category_id', id)}
            />
          </Card>

          <Card>
            <ThemedText type="h4" style={styles.sectionTitle}>Stock Settings</ThemedText>
            <Controller control={control} name="unit" render={({ field }) => (
              <Input label="Unit" value={field.value} onChangeText={field.onChange} error={errors.unit?.message} />
            )} />
            <Controller control={control} name="reorder_point" render={({ field }) => (
              <Input
                label="Reorder Point"
                keyboardType="numeric"
                value={String(field.value ?? '')}
                onChangeText={field.onChange}
                error={errors.reorder_point?.message}
              />
            )} />
            <Controller control={control} name="description" render={({ field }) => (
              <Input label="Description" multiline numberOfLines={3} value={field.value ?? ''} onChangeText={field.onChange} />
            )} />
          </Card>

          <Button
            label="Save Changes"
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgBase },
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
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    borderRadius: 18, backgroundColor: colors.bgElevated,
  },
  content: { padding: spacing[5], gap: spacing[4], paddingBottom: spacing[10] },
  sectionTitle: { marginBottom: spacing[3] },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    backgroundColor: colors.dangerBg, borderRadius: radius.md,
    padding: spacing[3], borderWidth: 1, borderColor: colors.danger,
  },
});