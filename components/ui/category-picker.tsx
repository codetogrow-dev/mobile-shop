import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { colors, spacing, radius } from '@/constants/theme';

export interface CategoryOption {
  id: string;
  name: string;
  color_hex: string | null;
  parent_id: string | null;
}

interface CategoryPickerProps {
  categories: CategoryOption[];
  selectedId: string | null | undefined;
  onSelect: (id: string | null) => void;
  error?: string;
}

export function CategoryPicker({ categories, selectedId, onSelect, error }: CategoryPickerProps) {
  const [expandedParent, setExpandedParent] = useState<string | null>(null);

  const parents = categories.filter((c) => !c.parent_id);
  const childrenOf = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  const selectedCat = categories.find((c) => c.id === selectedId);

  const handleSelect = (id: string) => {
    onSelect(selectedId === id ? null : id);
    setExpandedParent(null);
  };

  return (
    <View style={styles.wrapper}>
      {/* Selected preview */}
      {selectedCat && (
        <View style={[styles.selectedBadge, { backgroundColor: `${selectedCat.color_hex ?? colors.primary500}18`, borderColor: `${selectedCat.color_hex ?? colors.primary500}44` }]}>
          <View style={[styles.dot, { backgroundColor: selectedCat.color_hex ?? colors.primary500 }]} />
          <ThemedText type="caption" color={selectedCat.color_hex ?? colors.primary500} style={{ fontWeight: '600', flex: 1 }}>
            {selectedCat.name}
          </ThemedText>
          <TouchableOpacity onPress={() => onSelect(null)} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={selectedCat.color_hex ?? colors.primary500} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {parents.map((parent) => {
          const children = childrenOf(parent.id);
          const isParentSelected = selectedId === parent.id;
          const hasSelectedChild = children.some((c) => c.id === selectedId);
          const isExpanded = expandedParent === parent.id;
          const highlight = isParentSelected || hasSelectedChild;

          return (
            <View key={parent.id} style={styles.parentGroup}>
              {/* Parent chip */}
              <TouchableOpacity
                style={[
                  styles.chip,
                  highlight && { backgroundColor: parent.color_hex ?? colors.primary500, borderColor: parent.color_hex ?? colors.primary500 },
                ]}
                onPress={() => {
                  if (children.length === 0) {
                    handleSelect(parent.id);
                  } else {
                    setExpandedParent(isExpanded ? null : parent.id);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.chipDot, { backgroundColor: highlight ? '#fff' : (parent.color_hex ?? colors.primary500) }]} />
                <ThemedText
                  type="caption"
                  color={highlight ? '#fff' : colors.textSecondary}
                  style={{ fontWeight: highlight ? '600' : '400' }}
                >
                  {parent.name}
                </ThemedText>
                {children.length > 0 && (
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={12}
                    color={highlight ? '#fff' : colors.textTertiary}
                  />
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* Sub-category chips — shown below when a parent is expanded */}
      {expandedParent && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subRow}>
          {childrenOf(expandedParent).map((child) => {
            const isSelected = selectedId === child.id;
            return (
              <TouchableOpacity
                key={child.id}
                style={[
                  styles.subChip,
                  isSelected && { backgroundColor: child.color_hex ?? colors.primary500, borderColor: child.color_hex ?? colors.primary500 },
                ]}
                onPress={() => handleSelect(child.id)}
                activeOpacity={0.7}
              >
                <Ionicons name="return-down-forward" size={11} color={isSelected ? '#fff' : colors.textTertiary} />
                <ThemedText
                  type="caption"
                  color={isSelected ? '#fff' : colors.textSecondary}
                  style={{ fontWeight: isSelected ? '600' : '400' }}
                >
                  {child.name}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {error && (
        <ThemedText type="caption" color={colors.danger} style={{ marginTop: spacing[1] }}>
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing[2] },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  row: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  parentGroup: {},
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  subRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingLeft: spacing[4],
    paddingVertical: spacing[1],
  },
  subChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
});
