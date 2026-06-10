import { useState, useCallback, useRef } from 'react';
import {
  View, StyleSheet, TouchableOpacity, RefreshControl,
  TextInput, Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { QK } from '@/constants/query-keys';
import { listProducts } from '@/api/products';
import { ProductCard } from './product-card';
import { InventoryFilterSheet, countActive } from './inventory-filter-sheet';
import type { ProductFilters } from '@/types/app';
import { DEFAULT_FILTERS } from '@/types/app';

export default function InventoryView() {
  const insets = useSafeAreaInsets();

  // committed filters — what the API actually uses
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);
  // draft search text — only committed on submit
  const [searchInput, setSearchInput] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  const inputRef = useRef<TextInput>(null);

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: QK.products.list(filters),
    queryFn: () => listProducts(filters),
  });

  const handleSearchSubmit = useCallback(() => {
    setFilters((f) => ({ ...f, search: searchInput.trim() }));
  }, [searchInput]);

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    setFilters((f) => ({ ...f, search: '' }));
  }, []);

  const handleApplyFilters = useCallback((updated: ProductFilters) => {
    // preserve committed search when applying sheet filters
    setFilters((f) => ({ ...updated, search: f.search }));
  }, []);

  const handleResetAll = useCallback(() => {
    setSearchInput('');
    setFilters(DEFAULT_FILTERS);
  }, []);

  const activeFilterCount = countActive(filters);
  const hasAnyFilter = activeFilterCount > 0 || filters.search;

  const ListHeader = (
    <View style={styles.listHeader}>
      {/* Search row */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textTertiary} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search products…"
            placeholderTextColor={colors.textTertiary}
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter button */}
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setSheetOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={activeFilterCount > 0 ? colors.primary500 : colors.textSecondary}
          />
          {activeFilterCount > 0 && (
            <View style={styles.badge}>
              <ThemedText type="overline" color={colors.textInverse} style={styles.badgeText}>
                {activeFilterCount}
              </ThemedText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active filter summary + reset */}
      {hasAnyFilter ? (
        <View style={styles.activeRow}>
          <View style={styles.activeChips}>
            {filters.search ? (
              <ActiveChip label={`"${filters.search}"`} onRemove={handleClearSearch} />
            ) : null}
            {filters.stockFilter !== 'all' ? (
              <ActiveChip
                label={filters.stockFilter === 'ok' ? 'In Stock' : filters.stockFilter === 'low' ? 'Low Stock' : 'Out of Stock'}
                onRemove={() => setFilters((f) => ({ ...f, stockFilter: 'all' }))}
              />
            ) : null}
            {filters.categoryIds.length > 0 ? (
              <ActiveChip
                label={`Categories (${filters.categoryIds.length})`}
                onRemove={() => setFilters((f) => ({ ...f, categoryIds: [] }))}
              />
            ) : null}
            {(filters.dateFrom || filters.dateTo) ? (
              <ActiveChip label="Date range" onRemove={() => setFilters((f) => ({ ...f, dateFrom: null, dateTo: null }))} />
            ) : null}
            {filters.sortBy !== 'name' ? (
              <ActiveChip label={`Sort: ${filters.sortBy}`} onRemove={() => setFilters((f) => ({ ...f, sortBy: 'name' }))} />
            ) : null}
          </View>
          <TouchableOpacity onPress={handleResetAll} style={styles.resetAllBtn} activeOpacity={0.7}>
            <ThemedText type="caption" color={colors.danger}>Reset all</ThemedText>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <ThemedText type="h2">Inventory</ThemedText>
          <ThemedText type="caption" color={colors.textSecondary}>
            {products?.length ?? 0} products
          </ThemedText>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(app)/add-product')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      <FlashList
        data={products ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProductCard item={item} />}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing[3] }} />}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary500} />
        }
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={48} color={colors.textTertiary} />
            <ThemedText type="body" color={colors.textSecondary}>
              {isLoading ? 'Loading products…' : 'No products found'}
            </ThemedText>
            {!isLoading && !hasAnyFilter && (
              <TouchableOpacity onPress={() => router.push('/(app)/add-product')}>
                <ThemedText type="caption" color={colors.primary500}>+ Add your first product</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + spacing[4] }]}
        onPress={() => router.push('/(app)/add-product')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      <InventoryFilterSheet
        visible={sheetOpen}
        filters={filters}
        onApply={handleApplyFilters}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <View style={chipStyles.chip}>
      <ThemedText type="caption" color={colors.primary600} numberOfLines={1} style={chipStyles.label}>
        {label}
      </ThemedText>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <Ionicons name="close" size={13} color={colors.primary600} />
      </TouchableOpacity>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[2] + 2,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.primary50,
    borderWidth: 1,
    borderColor: colors.primary200,
    maxWidth: 140,
  },
  label: { flexShrink: 1 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary500,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  listHeader: {
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[3],
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    height: 44,
    gap: spacing[2],
  },
  searchIcon: { flexShrink: 0 },
  searchInput: {
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {
    borderColor: colors.primary300,
    backgroundColor: colors.primary50,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 9, lineHeight: 12 },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  activeChips: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  resetAllBtn: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    flexShrink: 0,
  },
  list: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[12],
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing[12],
    gap: spacing[3],
  },
  fab: {
    position: 'absolute',
    right: spacing[5],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary500,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
