import { useState, useCallback, useRef } from 'react';
import {
  View, StyleSheet, TouchableOpacity, RefreshControl,
  TextInput, Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ListFooter } from '@/components/ui/list-footer';
import { PartySortSheet } from '@/components/ui/party-sort-sheet';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { QK } from '@/constants/query-keys';
import { usePaginatedList } from '@/hooks/use-paginated-list';
import { listCustomersPage } from '@/api/customers';
import { CustomerRow } from './customer-row';
import type { CustomerListRow, PartyListSort } from '@/types/app';

const PAGE_SIZE = 10;
const SORT_LABELS: Record<PartyListSort, string> = {
  spent:   'Top spender',
  visits:  'Most visits',
  recent:  'Recent visitor',
  balance: 'Biggest debtor',
  name:    'Name (A–Z)',
};

export default function CustomersView() {
  const insets = useSafeAreaInsets();
  const [searchInput, setSearchInput] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [sort, setSort] = useState<PartyListSort>('spent');
  const [sortOpen, setSortOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const {
    items, totalCount,
    isLoading, isRefetching, isFetchingNextPage,
    hasNextPage, fetchNextPage, refetch,
  } = usePaginatedList<CustomerListRow>({
    queryKey: QK.customers.page(committedSearch, sort),
    fetchPage: (offset, limit) =>
      listCustomersPage({ search: committedSearch, sort, offset, limit }),
    pageSize: PAGE_SIZE,
  });

  const handleSearchSubmit = useCallback(() => {
    setCommittedSearch(searchInput.trim());
  }, [searchInput]);

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    setCommittedSearch('');
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const ListHeader = (
    <View style={styles.listHeader}>
      {/* Search row */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search by name or phone…"
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
        <TouchableOpacity
          style={[styles.filterBtn, sort !== 'spent' && styles.filterBtnActive]}
          onPress={() => setSortOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="funnel-outline" size={18} color={sort !== 'spent' ? colors.primary500 : colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Sort chip */}
      <View style={styles.sortChipRow}>
        <View style={styles.sortChip}>
          <Ionicons name="swap-vertical" size={12} color={colors.primary600} />
          <ThemedText type="caption" color={colors.primary600}>
            Sorted by: {SORT_LABELS[sort]}
          </ThemedText>
        </View>
        <ThemedText type="caption" color={colors.textTertiary}>
          {totalCount} total
        </ThemedText>
      </View>

    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <ThemedText type="h2">Customers</ThemedText>
          <ThemedText type="caption" color={colors.textSecondary}>
            {totalCount} customer{totalCount === 1 ? '' : 's'}
          </ThemedText>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(app)/add-customer' as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      <FlashList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <CustomerRow
            item={item}
            rank={sort === 'spent' && committedSearch === '' ? index + 1 : undefined}
            onPress={() => router.push(`/(app)/customer/${item.id}` as any)}
          />
        )}
        ListHeaderComponent={ListHeader}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          <ListFooter
            loading={isFetchingNextPage}
            hasMore={hasNextPage}
            shown={items.length}
            total={totalCount}
          />
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary500} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
            <ThemedText type="body" color={colors.textSecondary}>
              {isLoading ? 'Loading customers…' :
                committedSearch ? `No customers match "${committedSearch}"` : 'No customers yet'}
            </ThemedText>
            {!isLoading && !committedSearch && (
              <TouchableOpacity onPress={() => router.push('/(app)/add-customer' as any)}>
                <ThemedText type="caption" color={colors.primary500}>+ Add your first customer</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + spacing[4] }]}
        onPress={() => router.push('/(app)/add-customer' as any)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      <PartySortSheet
        kind="customer"
        visible={sortOpen}
        value={sort}
        onChange={setSort}
        onClose={() => setSortOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary500,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.md,
  },
  listHeader: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    gap: spacing[3],
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
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
  searchInput: {
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  filterBtn: {
    width: 44, height: 44, borderRadius: radius.lg,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  filterBtnActive: { borderColor: colors.primary300, backgroundColor: colors.primary50 },
  sortChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    backgroundColor: colors.primary50,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary200,
  },
  list: { paddingBottom: spacing[12] },
  empty: { alignItems: 'center', paddingTop: spacing[12], gap: spacing[3] },
  fab: {
    position: 'absolute', right: spacing[5],
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary500,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.lg,
  },
});
