import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { colors, spacing, radius } from '@/constants/theme';
import type { StockFilter } from '@/types/app';

const STOCK_FILTERS: { label: string; value: StockFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'In Stock', value: 'ok' },
  { label: 'Low Stock', value: 'low' },
  { label: 'Out of Stock', value: 'out' },
];

interface InventoryFiltersProps {
  activeFilter: StockFilter;
  onFilterChange: (filter: StockFilter) => void;
}

export function InventoryFilters({ activeFilter, onFilterChange }: InventoryFiltersProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {STOCK_FILTERS.map((f) => {
        const active = activeFilter === f.value;
        return (
          <TouchableOpacity
            key={f.value}
            onPress={() => onFilterChange(f.value)}
            style={[styles.chip, active && styles.chipActive]}
            activeOpacity={0.7}
          >
            <ThemedText
              type="caption"
              color={active ? colors.textInverse : colors.textSecondary}
              style={active && styles.chipTextActive}
            >
              {f.label}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingRight: spacing[2],
  },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary500,
    borderColor: colors.primary500,
  },
  chipTextActive: {
    fontWeight: '600',
  },
});
