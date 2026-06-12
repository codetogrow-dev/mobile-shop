import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { listCategories } from "@/api/categories";
import { createProduct } from "@/api/products";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoryPicker } from "@/components/ui/category-picker";
import { Input } from "@/components/ui/input";
import { QK } from "@/constants/query-keys";
import { colors, radius, shadows, spacing } from "@/constants/theme";
import { useAuthStore } from "@/store/auth-store";
import { productSchema, type ProductFormValues } from "@/types/app";

export default function AddProductView() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data: categories } = useQuery({
    queryKey: QK.categories.all,
    queryFn: listCategories,
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ProductFormValues, any, ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: { name: "", unit: "piece", reorder_point: 5 },
  });

  const selectedCategoryId = watch("category_id");

  const mutation = useMutation({
    mutationFn: (values: ProductFormValues) =>
      createProduct({
        ...values,
        tenant_id: (user as any)?.user_metadata?.tenant_id ?? user?.id ?? "",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.products.all });
      router.back();
    },
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <ThemedText type="h3">Add Product</ThemedText>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {mutation.error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <ThemedText type="caption" color={colors.danger}>
                {(mutation.error as any)?.message ?? "Failed to add product"}
              </ThemedText>
            </View>
          )}

          {/* ── Basic Info ── */}
          <Card>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Basic Info
            </ThemedText>

            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <Input
                  label="Product Name *"
                  placeholder="e.g. iPhone 15 Back Cover"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.name?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="sku"
              render={({ field }) => (
                <Input
                  label="SKU / Item Code"
                  placeholder="Optional — e.g. IP15-COVER-BLK"
                  value={field.value ?? ""}
                  onChangeText={field.onChange}
                  error={errors.sku?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="barcode"
              render={({ field }) => (
                <Input
                  label="Barcode"
                  placeholder="Scan or type barcode number"
                  value={field.value ?? ""}
                  onChangeText={field.onChange}
                  rightIcon={
                    <Ionicons
                      name="scan-outline"
                      size={18}
                      color={colors.primary500}
                    />
                  }
                />
              )}
            />

            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <Input
                  label="Notes"
                  placeholder="Any extra details about this product"
                  multiline
                  numberOfLines={3}
                  value={field.value ?? ""}
                  onChangeText={field.onChange}
                />
              )}
            />
          </Card>

          {/* ── Category ── */}
          <Card>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Category
            </ThemedText>
            <CategoryPicker
              categories={categories ?? []}
              selectedId={selectedCategoryId}
              onSelect={(id) => setValue("category_id", id)}
              error={errors.category_id?.message}
            />
          </Card>

          {/* ── Stock Settings ── */}
          <Card>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Stock Settings
            </ThemedText>

            <Controller
              control={control}
              name="unit"
              render={({ field }) => (
                <Input
                  label="Unit"
                  placeholder="e.g. piece, box, pack, pair"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.unit?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="reorder_point"
              render={({ field }) => (
                <Input
                  label="Low Stock Warning At"
                  placeholder="e.g. 5 — you'll be alerted when stock hits this"
                  keyboardType="numeric"
                  value={String(field.value ?? "")}
                  onChangeText={field.onChange}
                  error={errors.reorder_point?.message}
                  leftIcon={
                    <Ionicons
                      name="warning-outline"
                      size={18}
                      color={colors.textTertiary}
                    />
                  }
                />
              )}
            />
          </Card>

          <Button
            label="Add Product"
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.bgElevated,
  },
  content: {
    padding: spacing[5],
    gap: spacing[4],
    paddingBottom: spacing[10],
  },
  sectionTitle: { marginBottom: spacing[1] },
  sectionHint: { marginBottom: spacing[3], lineHeight: 18 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    backgroundColor: colors.dangerBg,
    borderRadius: radius.md,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.danger,
  },
});
