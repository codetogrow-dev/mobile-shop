import { ScrollView, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { colors, spacing, radius } from '@/constants/theme';

export interface InsightChip {
  id: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: 'info' | 'positive' | 'caution';
  onPress?: () => void;
}

interface Props {
  items: InsightChip[];
}

const TONE: Record<
  Required<InsightChip>['tone'],
  { bg: string; border: string; fg: string }
> = {
  info: {
    bg: colors.primary50,
    border: colors.primary200,
    fg: colors.primary600,
  },
  positive: {
    bg: colors.successBg,
    border: colors.success + '60',
    fg: colors.success,
  },
  caution: {
    bg: colors.warningBg,
    border: colors.warning + '60',
    fg: colors.warning,
  },
};

/**
 * Horizontal-scroll row of compact analytic chips. Each chip surfaces one
 * insight ("Best Wed in 4 weeks", "12 dead-stock SKUs", etc.) and optionally
 * deep-links into a relevant list when tapped.
 */
export function InsightStrip({ items }: Props) {
  if (items.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {items.map((it) => {
        const tone = TONE[it.tone ?? 'info'];
        const Wrap: any = it.onPress ? TouchableOpacity : View;
        return (
          <Wrap
            key={it.id}
            onPress={it.onPress}
            activeOpacity={0.7}
            style={[
              styles.chip,
              { backgroundColor: tone.bg, borderColor: tone.border },
            ]}
          >
            <Ionicons name={it.icon} size={11} color={tone.fg} />
            <ThemedText type="caption" color={tone.fg} numberOfLines={1}>
              {it.text}
            </ThemedText>
          </Wrap>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing[2], paddingRight: spacing[4] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    maxWidth: 260,
  },
});
