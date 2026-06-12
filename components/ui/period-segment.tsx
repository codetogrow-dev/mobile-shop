import { View, StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors, spacing, radius } from '@/constants/theme';
import { REPORT_MODE } from '@/constants/enums';

export type ReportPeriod = typeof REPORT_MODE[keyof typeof REPORT_MODE];

interface Props {
  value: ReportPeriod;
  onChange: (v: ReportPeriod) => void;
}

const LABELS: Record<ReportPeriod, string> = {
  daily:   'Today',
  monthly: 'Month',
  yearly:  'Year',
};

/** Three-segment Today / Month / Year selector with a sliding active state. */
export function PeriodSegment({ value, onChange }: Props) {
  const order: ReportPeriod[] = [REPORT_MODE.DAILY, REPORT_MODE.MONTHLY, REPORT_MODE.YEARLY];

  return (
    <View style={styles.bar}>
      {order.map((p) => {
        const active = value === p;
        return (
          <TouchableOpacity
            key={p}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(p)}
            activeOpacity={0.75}
          >
            <ThemedText
              type="caption"
              color={active ? colors.textInverse : colors.textSecondary}
              style={active ? { fontWeight: '700' } : undefined}
            >
              {LABELS[p]}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    marginHorizontal: spacing[5],
    gap: spacing[2],
    padding: 3,
    borderRadius: radius.full,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    borderRadius: radius.full,
  },
  segmentActive: {
    backgroundColor: colors.primary500,
  },
});
