import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { colors, spacing, radius } from '@/constants/theme';

export interface FeatureChipItem<T extends string> {
  id: T;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface Props<T extends string> {
  items: FeatureChipItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
}

/**
 * Horizontal scrolling row of large icon-chips. Active chip glows in neon
 * cyan; inactive chips are muted. Tapping a chip switches the active feature
 * in the reports screen.
 */
export function FeatureChipRail<T extends string>({ items, activeId, onChange }: Props<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
    >
      {items.map((it) => {
        const active = it.id === activeId;
        return (
          <TouchableOpacity
            key={it.id}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(it.id)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={it.icon}
              size={16}
              color={active ? colors.textPrimary : colors.primary500}
            />
            <ThemedText
              type="bodySm"
              color={active ? colors.textPrimary : colors.textSecondary}
              style={[styles.label, active && styles.labelActive]}
              numberOfLines={1}
            >
              {it.label}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2] + 2,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 36,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  label: { fontSize: 13, lineHeight: 16 },
  labelActive: { fontWeight: '700' },
});
