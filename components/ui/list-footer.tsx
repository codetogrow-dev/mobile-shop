import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { colors, spacing } from '@/constants/theme';

interface Props {
  /** True while a fetchNextPage is in flight. */
  loading: boolean;
  /** True if more pages exist to fetch. */
  hasMore: boolean;
  /** Total fetched items so far. Used for the "Showing X of Y" caption. */
  shown?: number;
  /** Total count from the server. */
  total?: number;
}

export function ListFooter({ loading, hasMore, shown, total }: Props) {
  if (loading) {
    return (
      <View style={styles.row}>
        <ActivityIndicator size="small" color={colors.primary500} />
        <ThemedText type="caption" color={colors.textTertiary}>Loading more…</ThemedText>
      </View>
    );
  }

  if (!hasMore && shown !== undefined && shown > 0) {
    return (
      <View style={styles.row}>
        <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
        <ThemedText type="caption" color={colors.textTertiary}>
          {total !== undefined ? `Showing all ${total}` : 'End of list'}
        </ThemedText>
      </View>
    );
  }

  return <View style={styles.spacer} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[5],
  },
  spacer: { height: spacing[4] },
});
