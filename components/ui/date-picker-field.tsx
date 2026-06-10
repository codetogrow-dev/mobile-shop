import { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  format, parseISO, isValid, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, addMonths, subMonths, isSameDay,
  isSameMonth, isToday, isBefore, isAfter,
} from 'date-fns';

import { ThemedText } from '@/components/themed-text';
import { colors, spacing, radius, shadows } from '@/constants/theme';

interface Props {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  maximumDate?: Date;
  minimumDate?: Date;
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function DatePickerField({ label, value, onChange, placeholder = 'Select date', maximumDate, minimumDate }: Props) {
  const [open, setOpen] = useState(false);
  const parsed = value && isValid(parseISO(value)) ? parseISO(value) : null;
  const [viewMonth, setViewMonth] = useState(parsed ?? new Date());

  const handleOpen = () => {
    setViewMonth(parsed ?? new Date());
    setOpen(true);
  };

  const handleSelect = (day: Date) => {
    onChange(format(day, 'yyyy-MM-dd'));
    setOpen(false);
  };

  const handleClear = () => onChange(null);

  // Build calendar grid
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart); // 0=Sun
  const cells: (Date | null)[] = [
    ...Array(startPad).fill(null),
    ...days,
  ];
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const isDisabled = (day: Date) => {
    if (minimumDate && isBefore(day, minimumDate)) return true;
    if (maximumDate && isAfter(day, maximumDate)) return true;
    return false;
  };

  return (
    <View style={styles.container}>
      <ThemedText type="caption" color={colors.textTertiary}>{label}</ThemedText>
      <TouchableOpacity style={styles.field} onPress={handleOpen} activeOpacity={0.7}>
        <Ionicons name="calendar-outline" size={16} color={parsed ? colors.primary500 : colors.textTertiary} />
        <ThemedText type="caption" color={parsed ? colors.textPrimary : colors.textTertiary} style={styles.valueText}>
          {parsed ? format(parsed, 'dd MMM yyyy') : placeholder}
        </ThemedText>
        {parsed ? (
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-down" size={14} color={colors.textTertiary} />
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.popover}>
          {/* Month nav */}
          <View style={styles.monthRow}>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => setViewMonth((m) => subMonths(m, 1))}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
            <ThemedText type="h4">{format(viewMonth, 'MMMM yyyy')}</ThemedText>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => setViewMonth((m) => addMonths(m, 1))}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Day labels */}
          <View style={styles.weekRow}>
            {DAY_LABELS.map((d) => (
              <ThemedText key={d} type="overline" color={colors.textTertiary} style={styles.dayLabel}>
                {d}
              </ThemedText>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={`pad-${i}`} style={styles.cell} />;
              const selected = parsed ? isSameDay(day, parsed) : false;
              const disabled = isDisabled(day);
              const today = isToday(day);
              const inMonth = isSameMonth(day, viewMonth);

              return (
                <TouchableOpacity
                  key={day.toISOString()}
                  style={[
                    styles.cell,
                    selected && styles.cellSelected,
                    today && !selected && styles.cellToday,
                  ]}
                  onPress={() => !disabled && handleSelect(day)}
                  activeOpacity={disabled ? 1 : 0.7}
                  disabled={disabled}
                >
                  <ThemedText
                    type="caption"
                    color={
                      disabled ? colors.textTertiary
                      : selected ? colors.textInverse
                      : today ? colors.primary500
                      : inMonth ? colors.textPrimary
                      : colors.textTertiary
                    }
                    style={selected && { fontWeight: '700' }}
                  >
                    {format(day, 'd')}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Today shortcut */}
          <TouchableOpacity
            style={styles.todayBtn}
            onPress={() => {
              const today = new Date();
              if (!isDisabled(today)) handleSelect(today);
            }}
            activeOpacity={0.7}
          >
            <ThemedText type="caption" color={colors.primary500}>Today</ThemedText>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const CELL_SIZE = 36;

const styles = StyleSheet.create({
  container: { gap: spacing[1] },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  valueText: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  popover: {
    position: 'absolute',
    bottom: 80,
    left: spacing[5],
    right: spacing[5],
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing[4],
    ...shadows.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing[2],
  },
  dayLabel: {
    width: CELL_SIZE,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CELL_SIZE / 2,
  },
  cellSelected: {
    backgroundColor: colors.primary500,
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: colors.primary500,
  },
  todayBtn: {
    alignItems: 'center',
    paddingTop: spacing[3],
    marginTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
