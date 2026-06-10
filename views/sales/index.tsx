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
import { QK } from '@/constants/query-keys';
import { listSales } from '@/api/sales';
import { listProductNames } from '@/api/products';
import { SaleCard } from './sale-card';
import type { SaleFilters } from '@/types/app';
import { DEFAULT_SALE_FILTERS } from '@/types/app';

export default function SalesView() {
  const insets = useSafeAreaInsets();
  const [filters, setFilters] = useState<SaleFilters>(DEFAULT_SALE_FILTERS);
  const [selectedProductId, setSelectedProductId] = useState<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: productNames } = useQuery({
    queryKey: QK.products.names,
    queryFn: listProductNames,
  });

  const productItems = (productNames ?? []).map((p) => ({ id: p.id, label: p.name }));

  const { data: sales, isLoading, refetch } = useQuery({
    queryKey: [...QK.sales.all, filters],
    queryFn: () => listSales(undefined, filters),
  });

  const totalRevenue = sales?.reduce((s, x) => s + Number(x.total_revenue), 0) ?? 0;
  const totalProfit = sales?.reduce((s, x) => s + Number(x.gross_profit), 0) ?? 0;

  const handleProductSelect = useCallback((ids: string[]) => {
    setSelectedProductId(ids);
    setFilters((f) => ({ ...f, productId: ids[0] ?? null }));
  }, []);

  const handleClearSearch = useCallback(() => {
    setSelectedProductId([]);
    setFilters((f) => ({ ...f, productId: null }));
  }, []);

  const handleApply = useCallback((updated: SaleFilters) => {
    setFilters(updated);
    if (!updated.productId) setSelectedProductId([]);
  }, []);

  const handleResetAll = useCallback(() => {
    setSelectedProductId([]);
    setFilters(DEFAULT_SALE_FILTERS);
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
        <View>
          <ThemedText type="h2">Sales</ThemedText>
          <ThemedText type="caption" color={colors.textSecondary}>{dateLabel}</ThemedText>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(app)/add-sale')} activeOpacity={0.8}>
          <Ionicons name="add" size={22} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <ThemedText type="caption" color={colors.textSecondary}>Revenue</ThemedText>
          <ThemedText type="numeric" color={colors.accent}>₨{totalRevenue.toLocaleString()}</ThemedText>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryCard}>
          <ThemedText type="caption" color={colors.textSecondary}>Profit</ThemedText>
          <ThemedText type="numeric" color={totalProfit >= 0 ? colors.success : colors.danger}>
            ₨{totalProfit.toLocaleString()}
          </ThemedText>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryCard}>
          <ThemedText type="caption" color={colors.textSecondary}>Transactions</ThemedText>
          <ThemedText type="numeric" color={colors.textPrimary}>{sales?.length ?? 0}</ThemedText>
        </View>
      </View>

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
        data={sales ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SaleCard item={item} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing[3] }} />}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary500} />}
        ListHeaderComponent={hasAnyFilter ? (
          <View style={styles.chipsHeader}>
            <View style={styles.activeChips}>
              {filters.productId ? <ActiveChip label={`Product: ${selectedProductName}`} onRemove={handleClearSearch} /> : null}
              {(filters.dateFrom || filters.dateTo) ? (
                <ActiveChip label="Date range" onRemove={() => setFilters((f) => ({ ...f, dateFrom: null, dateTo: null }))} />
              ) : null}
              {filters.sortBy !== 'date_desc' ? (
                <ActiveChip label="Sorted" onRemove={() => setFilters((f) => ({ ...f, sortBy: 'date_desc' }))} />
              ) : null}
            </View>
            <TouchableOpacity onPress={handleResetAll} style={styles.resetAllBtn}>
              <ThemedText type="caption" color={colors.danger}>Reset all</ThemedText>
            </TouchableOpacity>
          </View>
        ) : null}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={colors.textTertiary} />
            <ThemedText type="body" color={colors.textSecondary}>
              {isLoading ? 'Loading…' : 'No sales found'}
            </ThemedText>
            {!isLoading && !hasAnyFilter && (
              <TouchableOpacity onPress={() => router.push('/(app)/add-sale')}>
                <ThemedText type="caption" color={colors.primary500}>+ Record a sale</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + spacing[4] }]}
        onPress={() => router.push('/(app)/add-sale')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      <TransactionFilterSheet
        mode="sales"
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
    borderWidth: 1, borderColor: colors.primary200, maxWidth: 150,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[3],
  },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary500, alignItems: 'center', justifyContent: 'center',
    ...shadows.md,
  },
  summaryRow: {
    flexDirection: 'row', marginHorizontal: spacing[5], marginBottom: spacing[4],
    backgroundColor: colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    ...shadows.sm,
  },
  summaryCard: { flex: 1, alignItems: 'center', paddingVertical: spacing[4], gap: spacing[1] },
  divider: { width: 1, backgroundColor: colors.border, marginVertical: spacing[3] },
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
