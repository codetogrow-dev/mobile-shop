import { ThemedText } from "@/components/themed-text";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { colors, spacing } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { FlatList, StyleSheet, View } from "react-native";

export interface LowStockItem {
  id: string;
  name: string;
  current_stock: number;
  reorder_point: number;
  sku: string;
}

interface LowStockListProps {
  items: LowStockItem[];
}

export function LowStockList({ items }: LowStockListProps) {
  const renderItem = ({ item }: { item: LowStockItem }) => {
    const stockPercentage = (item.current_stock / item.reorder_point) * 100;
    const isLowStock = stockPercentage <= 50;

    return (
      <Card variant="elevated" style={styles.itemCard}>
        <View style={styles.itemContent}>
          <View style={styles.leftSection}>
            <Ionicons
              name="alert-circle"
              size={20}
              color={isLowStock ? colors.danger : colors.warning}
            />
            <View style={styles.productInfo}>
              <ThemedText type="body" style={{ fontWeight: "600" }} numberOfLines={1}>
                {item.name}
              </ThemedText>
              {typeof item.sku === 'string' && item.sku.length > 0 && (
                <ThemedText type="caption" color={colors.textTertiary}>
                  SKU: {item.sku}
                </ThemedText>
              )}
            </View>
          </View>

          <View style={styles.rightSection}>
            <View style={styles.stockInfo}>
              <ThemedText type="numeric" color={colors.accent}>
                {Number(item.current_stock)}
              </ThemedText>
              <ThemedText type="caption" color={colors.textTertiary}>
                / {Number(item.reorder_point)}
              </ThemedText>
            </View>
            <Badge
              label={isLowStock ? "Critical" : "Low"}
              variant={isLowStock ? "danger" : "warning"}
            />
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(stockPercentage, 100)}%`,
                backgroundColor: isLowStock ? colors.danger : colors.warning,
              },
            ]}
          />
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <ThemedText type="h3" style={{ marginBottom: spacing[3] }}>
        Low Stock Items
      </ThemedText>
      {items.length === 0 ? (
        <Card variant="elevated" style={styles.emptyCard}>
          <View style={styles.emptyContent}>
            <Ionicons
              name="checkmark-circle"
              size={48}
              color={colors.success}
            />
            <ThemedText
              type="body"
              color={colors.textSecondary}
              style={{ textAlign: "center", marginTop: spacing[2] }}
            >
              All items are well stocked!
            </ThemedText>
          </View>
        </Card>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
  },
  itemCard: {
    gap: spacing[2],
  },
  itemContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  productInfo: {
    flex: 1,
    gap: spacing[1],
  },
  rightSection: {
    alignItems: "flex-end",
    gap: spacing[2],
  },
  stockInfo: {
    alignItems: "flex-end",
  },
  progressContainer: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 2,
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  emptyContent: {
    alignItems: "center",
  },
});
