import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { StatInfoModal } from '@/components/ui/stat-info-modal';
import { colors, spacing, radius } from '@/constants/theme';

export interface KpiItem {
  label: string;
  /** Pre-formatted value shown on the tile (e.g. "₨1.23 lakh", "12 visits"). */
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  accentBg: string;
  /**
   * Optional info-modal config. When `description` is set, the tile becomes
   * tappable and opens a StatInfoModal with the exact `rawValue`, the
   * description, and (if currency) the value spelled out in words.
   */
  description?: string;
  rawValue?: number;
  /** Defaults to true. Set false for non-money KPIs (e.g. visit count). */
  isCurrency?: boolean;
}

interface Props {
  items: KpiItem[];
}

/** 2-column grid of KPI tiles. Pass 2 or 4 items for clean wrapping. */
export function KpiGrid({ items }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <View style={styles.grid}>
        {items.map((it, i) => {
          const tappable = !!it.description;
          return (
            <Card
              key={i}
              padded
              style={styles.tile}
              onPress={tappable ? () => setOpenIndex(i) : undefined}
            >
              <View style={[styles.iconWrap, { backgroundColor: it.accentBg }]}>
                <Ionicons name={it.icon} size={16} color={it.accent} />
              </View>
              <ThemedText type="overline" color={colors.textTertiary} numberOfLines={1}>
                {it.label}
              </ThemedText>
              <ThemedText type="h4" color={it.accent} numberOfLines={1}>
                {it.value}
              </ThemedText>
            </Card>
          );
        })}
      </View>

      {items.map((it, i) =>
        it.description ? (
          <StatInfoModal
            key={`m-${i}`}
            visible={openIndex === i}
            onClose={() => setOpenIndex(null)}
            label={it.label}
            description={it.description}
            value={it.rawValue ?? 0}
            isCurrency={it.isCurrency ?? true}
            icon={String(it.icon)}
            accentColor={it.accent}
            accentBg={it.accentBg}
          />
        ) : null,
      )}
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: spacing[1],
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
});
