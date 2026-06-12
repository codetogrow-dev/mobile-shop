import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { fmtKarachi } from '@/lib/datetime';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { fmtCurrency, fmtPct } from '@/lib/format-num';
import { StatInfoModal } from '@/components/ui/stat-info-modal';
import { QK } from '@/constants/query-keys';
import { getProduct, softDeleteProduct } from '@/api/products';
import { listPurchases } from '@/api/purchases';
import { listSales } from '@/api/sales';
import { getProductSummary } from '@/api/reports';
import { PurchaseCard } from '@/views/purchases/purchase-card';
import { SaleCard } from '@/views/sales/sale-card';
import { PRODUCT_TAB } from '@/constants/enums';

type Tab = typeof PRODUCT_TAB[keyof typeof PRODUCT_TAB];

export default function ProductDetailView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>(PRODUCT_TAB.INFO);
  const [infoModal, setInfoModal] = useState<'sold' | 'revenue' | 'profit' | 'margin' | null>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: QK.products.detail(id),
    queryFn: () => getProduct(id),
    enabled: !!id,
  });

  const { data: purchases } = useQuery({
    queryKey: QK.purchases.byProduct(id),
    queryFn: () => listPurchases(id),
    enabled: !!id && activeTab === PRODUCT_TAB.PURCHASES,
  });

  const { data: sales } = useQuery({
    queryKey: QK.sales.byProduct(id),
    queryFn: () => listSales(id),
    enabled: !!id && activeTab === PRODUCT_TAB.SALES,
  });

  const { data: summary } = useQuery({
    queryKey: QK.reports.product(id),
    queryFn: () => getProductSummary(id),
    enabled: !!id && activeTab === PRODUCT_TAB.INFO,
  });

  const deleteMutation = useMutation({
    mutationFn: () => softDeleteProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.products.all });
      router.back();
    },
  });

  const handleDelete = () => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product?.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ],
    );
  };

  if (isLoading || !product) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary500} />
      </View>
    );
  }

  const stockColor =
    product.current_stock === 0
      ? colors.danger
      : product.current_stock <= product.reorder_point
      ? colors.warning
      : colors.success;

  const stockLabel =
    product.current_stock === 0
      ? 'Out of Stock'
      : product.current_stock <= product.reorder_point
      ? 'Low Stock'
      : 'In Stock';

  const stockVariant =
    product.current_stock === 0
      ? 'danger'
      : product.current_stock <= product.reorder_point
      ? 'warning'
      : 'success';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <ThemedText type="h3" numberOfLines={1} style={styles.headerTitle}>
          {product.name}
        </ThemedText>
        <TouchableOpacity
          onPress={() => router.push(`/(app)/edit-product/${id}` as any)}
          style={styles.editBtn}
        >
          <Ionicons name="create-outline" size={22} color={colors.primary500} />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {([PRODUCT_TAB.INFO, PRODUCT_TAB.PURCHASES, PRODUCT_TAB.SALES] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <ThemedText
              type="caption"
              color={activeTab === tab ? colors.textInverse : colors.textSecondary}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === PRODUCT_TAB.INFO && (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Stock Summary */}
          <Card>
            <View style={styles.stockRow}>
              <View>
                <ThemedText type="caption" color={colors.textSecondary}>Current Stock</ThemedText>
                <View style={styles.stockCount}>
                  <ThemedText type="numericLg" color={stockColor}>
                    {product.current_stock}
                  </ThemedText>
                  <ThemedText type="body" color={colors.textTertiary}> {product.unit ?? 'units'}</ThemedText>
                </View>
              </View>
              <Badge label={stockLabel} variant={stockVariant} />
            </View>
            <View style={styles.reorderRow}>
              <Ionicons name="alert-circle-outline" size={14} color={colors.textTertiary} />
              <ThemedText type="caption" color={colors.textTertiary}>
                Reorder point: {product.reorder_point} units
              </ThemedText>
            </View>
          </Card>

          {/* Product Info */}
          <Card>
            <ThemedText type="h4" style={styles.sectionTitle}>Product Info</ThemedText>

            {product.sku && (
              <InfoRow label="SKU" value={product.sku} />
            )}
            {product.barcode && (
              <InfoRow label="Barcode" value={product.barcode} icon="barcode-outline" />
            )}
            <InfoRow label="Unit" value={product.unit ?? 'piece'} />
            {(product as any).categories && (
              <View style={styles.infoRow}>
                <ThemedText type="caption" color={colors.textTertiary} style={styles.infoLabel}>
                  Category
                </ThemedText>
                <Badge
                  label={(product as any).categories.name}
                  variant="primary"
                  bgColor={(product as any).categories.color_hex ? `${(product as any).categories.color_hex}22` : undefined}
                  color={(product as any).categories.color_hex ?? undefined}
                />
              </View>
            )}
            {product.description && (
              <InfoRow label="Description" value={product.description} />
            )}
            <InfoRow
              label="Added"
              value={fmtKarachi(product.created_at, 'dd MMM yyyy')}
            />
          </Card>

          {/* All-time Stats */}
          {summary && (
            <Card>
              <ThemedText type="h4" style={styles.sectionTitle}>All-time Performance</ThemedText>
              <View style={styles.statsGrid}>
                <StatBox label="Total Sold" value={String(summary.total_sold_qty)} onPress={() => setInfoModal('sold')} />
                <StatBox label="Revenue" value={fmtCurrency(Number(summary.total_sales_revenue))} color={colors.accent} onPress={() => setInfoModal('revenue')} />
                <StatBox label="Profit" value={fmtCurrency(Number(summary.total_gross_profit), true)} color={Number(summary.total_gross_profit) >= 0 ? colors.success : colors.danger} onPress={() => setInfoModal('profit')} />
                <StatBox label="Margin" value={fmtPct(Number(summary.profit_margin_pct ?? 0))} color={colors.info} onPress={() => setInfoModal('margin')} />
              </View>
            </Card>
          )}

          {summary && (
            <>
              <StatInfoModal visible={infoModal === 'sold'} onClose={() => setInfoModal(null)} label="Total Sold" description="Total units of this product sold across all time." value={summary.total_sold_qty} isCurrency={false} icon="cube-outline" accentColor={colors.textSecondary} accentBg={colors.bgElevated} />
              <StatInfoModal visible={infoModal === 'revenue'} onClose={() => setInfoModal(null)} label="All-time Revenue" description="Total revenue generated from sales of this product." value={Number(summary.total_sales_revenue)} icon="cash-outline" accentColor={colors.accent} accentBg={colors.primary50} />
              <StatInfoModal visible={infoModal === 'profit'} onClose={() => setInfoModal(null)} label="All-time Profit" description="Total gross profit earned from this product (revenue minus FIFO cost)." value={Number(summary.total_gross_profit)} icon="trending-up-outline" accentColor={Number(summary.total_gross_profit) >= 0 ? colors.success : colors.danger} accentBg={Number(summary.total_gross_profit) >= 0 ? colors.successBg : colors.dangerBg} />
              <StatInfoModal visible={infoModal === 'margin'} onClose={() => setInfoModal(null)} label="Profit Margin" description="Overall profit margin for this product (gross profit ÷ revenue × 100)." value={Number(summary.profit_margin_pct ?? 0)} isCurrency={false} icon="pie-chart-outline" accentColor={colors.info} accentBg={colors.infoBg} />
            </>
          )}

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.editActionBtn]}
              onPress={() => router.push(`/(app)/edit-product/${id}` as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary500} />
              <ThemedText type="caption" color={colors.primary500}>Edit Product</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteActionBtn]}
              onPress={handleDelete}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <ThemedText type="caption" color={colors.danger}>Delete</ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {activeTab === PRODUCT_TAB.PURCHASES && (
        <FlashList
          data={purchases ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PurchaseCard item={item} showProduct={false} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing[3] }} />}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Ionicons name="cart-outline" size={48} color={colors.textTertiary} />
              <ThemedText type="body" color={colors.textSecondary}>No purchases yet</ThemedText>
            </View>
          )}
        />
      )}

      {activeTab === PRODUCT_TAB.SALES && (
        <FlashList
          data={sales ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SaleCard item={item} showProduct={false} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing[3] }} />}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color={colors.textTertiary} />
              <ThemedText type="body" color={colors.textSecondary}>No sales yet</ThemedText>
            </View>
          )}
        />
      )}
    </View>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: string }) {
  return (
    <View style={styles.infoRow}>
      <ThemedText type="caption" color={colors.textTertiary} style={styles.infoLabel}>
        {label}
      </ThemedText>
      <View style={styles.infoValue}>
        {icon && <Ionicons name={icon as any} size={14} color={colors.textSecondary} />}
        <ThemedText type="body" color={colors.textPrimary}>{value}</ThemedText>
      </View>
    </View>
  );
}

function StatBox({ label, value, color, onPress }: { label: string; value: string; color?: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.statBox} onPress={onPress} activeOpacity={onPress ? 0.75 : 1}>
      <ThemedText type="numeric" color={color ?? colors.textPrimary} numberOfLines={1}>{value}</ThemedText>
      <ThemedText type="caption" color={colors.textTertiary}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgBase },
  container: { flex: 1, backgroundColor: colors.bgBase },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginRight: spacing[3],
  },
  headerTitle: { flex: 1 },
  editBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.primary50,
    marginLeft: spacing[3],
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing[2],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[2],
    borderRadius: radius.sm,
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
  },
  tabActive: {
    backgroundColor: colors.primary500,
  },
  content: {
    padding: spacing[5],
    gap: spacing[4],
    paddingBottom: spacing[10],
  },
  listContent: {
    padding: spacing[5],
    paddingBottom: spacing[10],
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  stockCount: { flexDirection: 'row', alignItems: 'baseline' },
  reorderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  sectionTitle: { marginBottom: spacing[3] },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { flex: 0.4 },
  infoValue: { flex: 0.6, flexDirection: 'row', alignItems: 'center', gap: spacing[1], justifyContent: 'flex-end' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  statBox: {
    flex: 1,
    minWidth: '40%',
    alignItems: 'center',
    paddingVertical: spacing[3],
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    gap: spacing[1],
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
  },
  editActionBtn: {
    borderColor: colors.primary300,
    backgroundColor: colors.primary50,
  },
  deleteActionBtn: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerBg,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing[12],
    gap: spacing[3],
  },
});
