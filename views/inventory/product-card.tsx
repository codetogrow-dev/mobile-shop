import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { colors, spacing } from '@/constants/theme';

export interface ProductCardData {
  id: string;
  name: string;
  current_stock: number;
  reorder_point: number;
  selling_price?: number;
  sku?: string;
  categories?: { name: string; color_hex?: string } | null;
}

function getStockBadge(stock: number, reorder: number) {
  if (stock === 0) return { label: 'Out of Stock', variant: 'danger' as const };
  if (stock <= reorder) return { label: 'Low Stock', variant: 'warning' as const };
  return { label: 'In Stock', variant: 'success' as const };
}

interface ProductCardProps {
  item: ProductCardData;
  onPress?: () => void;
}

export function ProductCard({ item, onPress }: ProductCardProps) {
  const badge = getStockBadge(item.current_stock, item.reorder_point);

  return (
    <Card onPress={onPress ?? (() => router.push(`/(app)/(tabs)/inventory/${item.id}` as any))}>
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={styles.iconBox}>
            <Ionicons name="cube-outline" size={22} color={colors.primary500} />
          </View>
          <View style={styles.info}>
            <ThemedText type="h4" numberOfLines={1}>{item.name}</ThemedText>
            {item.sku && (
              <ThemedText type="caption" color={colors.textTertiary}>SKU: {item.sku}</ThemedText>
            )}
            {item.categories && (
              <Badge
                label={item.categories.name}
                variant="primary"
                bgColor={item.categories.color_hex ? `${item.categories.color_hex}22` : undefined}
                color={item.categories.color_hex ?? undefined}
              />
            )}
          </View>
        </View>

        <View style={styles.right}>
          <View style={styles.stockRow}>
            <ThemedText type="numeric" color={colors.accent}>{item.current_stock}</ThemedText>
            <ThemedText type="caption" color={colors.textTertiary}> units</ThemedText>
          </View>
          <Badge label={badge.label} variant={badge.variant} />
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: spacing[1] },
  right: { alignItems: 'flex-end', gap: spacing[1] },
  stockRow: { flexDirection: 'row', alignItems: 'baseline' },
});