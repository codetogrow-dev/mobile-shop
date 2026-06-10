import { useState, useCallback } from 'react';
import {
  View, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Combobox } from '@/components/ui/combobox';
import { TransactionFilterSheet, countTransactionFiltersActive } from '@/components/ui/transaction-filter-sheet';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { fmtCurrency } from '@/lib/format-num';
import { StatInfoModal } from '@/components/ui/stat-info-modal';
import { QK } from '@/constants/query-keys';
import { listPurchases } from '@/api/purchases';
import { listProductNames } from '@/api/products';
import { PurchaseCard } from './purchase-card';
import type { PurchaseFilters } from '@/types/app';
import { DEFAULT_PURCHASE_FILTERS } from '@/types/app';
import { TRANSACTION_SORT, TRANSACTION_MODE } from '@/constants/enums';

export default function PurchasesView() {
  const insets = useSafeAreaInsets();
  const [filters, setFilters] = useState<PurchaseFilters>(DEFAULT_PURCHASE_FILTERS);
  // selectedProductId drives the search — single-select combobox
  const [selectedProductId, setSelectedProductId] = useState<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<'batches' | 'invested' | null>(null);

  const { data: productNames } = useQuery({
    queryKey: QK.products.names,
    queryFn: listProductNames,
  });

  const productItems = (productNames ?? []).map((p) => ({ id: p.id, label: p.name }));

  const { data: purchases, isLoading, refetch } = useQuery({
    queryKey: [...QK.purchases.all, filters],
    queryFn: () => listPurchases(undefined, filters),
  });

  const totalSpent = purchases?.reduce((s, x) => s + Number(x.cost_price) * x.quantity, 0) ?? 0;
  const totalBatches = purchases?.length ?? 0;

  const handleProductSelect = useCallback((ids: string[]) => {
    setSelectedProductId(ids);
    setFilters((f) => ({ ...f, productId: ids[0] ?? null }));
  }, []);

  const handleClearSearch = useCallback(() => {
    setSelectedProductId([]);
    setFilters((f) => ({ ...f, productId: null }));
  }, []);

  const handleApply = useCallback((updated: PurchaseFilters) => {
    setFilters(updated);
    if (!updated.productId) setSelectedProductId([]);
  }, []);

  const handleResetAll = useCallback(() => {
    setSelectedProductId([]);
    setFilters(DEFAULT_PURCHASE_FILTERS);
  }, []);

  const activeCount = countTransactionFiltersActive(filters);
  const hasAnyFilter = activeCount > 0 || !!filters.productId;

  const selectedProductName = filters.productId
    ? (productNames ?? []).find((p) => p.id === filters.productId)?.name ?? ''
    : '';

  const dateLabel = filters.dateFrom || filters.dateTo
    ? `${filters.dateFrom ?? '…'} → ${filters.dateTo ?? '…'}`
    : 'All time';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <ThemedText type="h2">Purchases</ThemedText>
          <ThemedText type="caption" color={colors.textSecondary}>{dateLabel}</ThemedText>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(app)/add-purchase')} activeOpacity={0.8}>
          <Ionicons name="add" size={22} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <TouchableOpacity
          style={[styles.summaryCard, { borderLeftWidth: 3, borderLeftColor: colors.textTertiary }]}
          onPress={() => setInfoModal('batches')} activeOpacity={0.75}
        >
          <View style={styles.summaryIconRow}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.bgElevated }]}>
              <Ionicons name="layers-outline" size={14} color={colors.textSecondary} />
            </View>
            <ThemedText type="overline" color={colors.textTertiary}>BATCHES</ThemedText>
          </View>
          <ThemedText type="h4" color={colors.textPrimary} numberOfLines={1}>{totalBatches}</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.summaryCard, { borderLeftWidth: 3, borderLeftColor: colors.info }]}
          onPress={() => setInfoModal('invested')} activeOpacity={0.75}
        >
          <View style={styles.summaryIconRow}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.infoBg }]}>
              <Ionicons name="wallet-outline" size={14} color={colors.info} />
            </View>
            <ThemedText type="overline" color={colors.textTertiary}>INVESTED</ThemedText>
          </View>
          <ThemedText type="h4" color={colors.info} numberOfLines={1}>{fmtCurrency(totalSpent)}</ThemedText>
        </TouchableOpacity>
      </View>

      <StatInfoModal
        visible={infoModal === 'batches'}
        onClose={() => setInfoModal(null)}
        label="Total Batches"
        description="Number of purchase batches recorded. Each batch represents a single stock replenishment event."
        value={totalBatches}
        isCurrency={false}
        icon="layers-outline"
        accentColor={colors.textSecondary}
        accentBg={colors.bgElevated}
      />
      <StatInfoModal
        visible={infoModal === 'invested'}
        onClose={() => setInfoModal(null)}
        label="Total Invested"
        description="Total capital spent on purchasing stock in the current filter period (quantity × cost price per unit)."
        value={totalSpent}
        icon="wallet-outline"
        accentColor={colors.info}
        accentBg={colors.infoBg}
      />

      {/* Search row lives outside FlashList so dropdown overlays cards */}
      <View style={styles.searchSection}>
        <View style={styles.searchRow}>
          <View style={styles.comboboxWrap}>
            <Combobox
              items={productItems}
              selectedIds={selectedProductId}
              onChangeSelectedIds={handleProductSelect}
              placeholder="Search by product…"
              multiple={false}
            />
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, activeCount > 0 && styles.filterBtnActive]}
            onPress={() => setSheetOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={20} color={activeCount > 0 ? colors.primary500 : colors.textSecondary} />
            {activeCount > 0 && (
              <View style={styles.badge}>
                <ThemedText type="overline" color={colors.textInverse} style={styles.badgeText}>{activeCount}</ThemedText>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <FlashList
        data={purchases ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PurchaseCard item={item} onPress={() => router.push(`/(app)/purchase/${item.id}`)} />
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing[3] }} />}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary500} />}
        ListHeaderComponent={hasAnyFilter ? (
          <View style={styles.chipsHeader}>
            <View style={styles.activeChips}>
              {filters.productId ? <ActiveChip label={`Product: ${selectedProductName}`} onRemove={handleClearSearch} /> : null}
              {filters.supplier ? <ActiveChip label={`Supplier: ${filters.supplier}`} onRemove={() => setFilters((f) => ({ ...f, supplier: '' }))} /> : null}
              {(filters.dateFrom || filters.dateTo) ? (
                <ActiveChip label="Date range" onRemove={() => setFilters((f) => ({ ...f, dateFrom: null, dateTo: null }))} />
              ) : null}
              {filters.sortBy !== TRANSACTION_SORT.DATE_DESC ? (
                <ActiveChip label="Sorted" onRemove={() => setFilters((f) => ({ ...f, sortBy: TRANSACTION_SORT.DATE_DESC }))} />
              ) : null}
            </View>
            <TouchableOpacity onPress={handleResetAll} style={styles.resetAllBtn}>
              <ThemedText type="caption" color={colors.danger}>Reset all</ThemedText>
            </TouchableOpacity>
          </View>
        ) : null}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Ionicons name="cart-outline" size={48} color={colors.textTertiary} />
            <ThemedText type="body" color={colors.textSecondary}>
              {isLoading ? 'Loading…' : 'No purchases found'}
            </ThemedText>
            {!isLoading && !hasAnyFilter && (
              <TouchableOpacity onPress={() => router.push('/(app)/add-purchase')}>
                <ThemedText type="caption" color={colors.primary500}>+ Record a purchase</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + spacing[4] }]}
        onPress={() => router.push('/(app)/add-purchase')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      <TransactionFilterSheet
        mode={TRANSACTION_MODE.PURCHASES}
        visible={sheetOpen}
        filters={filters}
        onApply={handleApply}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <View style={chipStyles.chip}>
      <ThemedText type="caption" color={colors.primary600} numberOfLines={1} style={{ flexShrink: 1 }}>{label}</ThemedText>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <Ionicons name="close" size={13} color={colors.primary600} />
      </TouchableOpacity>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing[2] + 2, paddingVertical: 4,
    borderRadius: radius.full, backgroundColor: colors.primary50,
    borderWidth: 1, borderColor: colors.primary200, maxWidth: 160,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[3],
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary500, alignItems: 'center', justifyContent: 'center',
    ...shadows.md,
  },
  summaryRow: {
    flexDirection: 'row', marginHorizontal: spacing[5], marginBottom: spacing[4],
    gap: spacing[3],
  },
  summaryCard: {
    flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing[3], paddingVertical: spacing[4], gap: spacing[2],
    ...shadows.sm,
  },
  summaryIconRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  summaryIcon: {
    width: 24, height: 24, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  list: { paddingHorizontal: spacing[5], paddingBottom: spacing[12] },
  searchSection: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[3],
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  comboboxWrap: { flex: 1 },
  chipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingBottom: spacing[3],
  },
  filterBtn: {
    width: 44, height: 44, borderRadius: radius.lg,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  filterBtnActive: { borderColor: colors.primary300, backgroundColor: colors.primary50 },
  badge: {
    position: 'absolute', top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.primary500, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontSize: 9, lineHeight: 12 },
  activeChips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  resetAllBtn: { paddingHorizontal: spacing[2], paddingVertical: spacing[1], flexShrink: 0 },
  empty: { alignItems: 'center', paddingTop: spacing[12], gap: spacing[3] },
  fab: {
    position: 'absolute', right: spacing[5],
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary500, alignItems: 'center', justifyContent: 'center',
    ...shadows.lg,
  },
});
