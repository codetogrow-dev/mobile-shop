import { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Modal, Animated, FlatList, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { colors, spacing, radius } from '@/constants/theme';
import type { ReportPeriod } from '@/components/ui/period-segment';

interface Props {
  period: ReportPeriod;
  year: number;
  /** 1–12 — meaningful only when period === 'monthly'. */
  month: number;
  onChangeYear: (y: number) => void;
  onChangeMonth: (m: number) => void;
  /** Optional override for "now". */
  now?: Date;
}

const FULL_MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

/**
 * Back / forward + tap-to-pick navigator for month or year. Tapping the
 * centre label opens a bottom-sheet picker (month grid for "monthly",
 * scrolling year list for "yearly"). Hidden entirely for "daily".
 */
export function PeriodNavigator({
  period, year, month, onChangeYear, onChangeMonth, now,
}: Props) {
  const [monthOpen, setMonthOpen] = useState(false);
  const [yearOpen,  setYearOpen]  = useState(false);

  if (period === 'daily') return null;

  const today = now ?? new Date();
  const curY = today.getFullYear();
  const curM = today.getMonth() + 1;

  const handlePrev = () => {
    if (period === 'monthly') {
      if (month === 1) { onChangeYear(year - 1); onChangeMonth(12); }
      else onChangeMonth(month - 1);
    } else {
      onChangeYear(year - 1);
    }
  };

  const canNext = period === 'monthly'
    ? !(year === curY && month === curM)
    : year < curY;

  const handleNext = () => {
    if (!canNext) return;
    if (period === 'monthly') {
      if (month === 12) { onChangeYear(year + 1); onChangeMonth(1); }
      else onChangeMonth(month + 1);
    } else {
      onChangeYear(year + 1);
    }
  };

  const label = period === 'monthly'
    ? `${FULL_MONTHS[month - 1].slice(0, 3)} ${year}`
    : String(year);

  const openPicker = () => {
    if (period === 'monthly') setMonthOpen(true);
    else setYearOpen(true);
  };

  return (
    <>
      <View style={styles.row}>
        <TouchableOpacity onPress={handlePrev} style={styles.btn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={18} color={colors.primary500} />
        </TouchableOpacity>
        <TouchableOpacity onPress={openPicker} style={styles.labelBtn} activeOpacity={0.75}>
          <Ionicons name="calendar-outline" size={14} color={colors.primary500} />
          <ThemedText type="h4" color={colors.textPrimary}>{label}</ThemedText>
          <Ionicons name="chevron-down" size={14} color={colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleNext}
          disabled={!canNext}
          style={[styles.btn, !canNext && styles.btnDisabled]}
          activeOpacity={0.7}
        >
          <Ionicons
            name="chevron-forward"
            size={18}
            color={canNext ? colors.primary500 : colors.textTertiary}
          />
        </TouchableOpacity>
      </View>

      <MonthPickerModal
        visible={monthOpen}
        currentYear={year}
        currentMonth={month}
        now={today}
        onClose={() => setMonthOpen(false)}
        onSelect={(y, m) => { onChangeYear(y); onChangeMonth(m); setMonthOpen(false); }}
      />
      <YearPickerModal
        visible={yearOpen}
        currentYear={year}
        now={today}
        onClose={() => setYearOpen(false)}
        onSelect={(y) => { onChangeYear(y); setYearOpen(false); }}
      />
    </>
  );
}

// ─── Month picker ───────────────────────────────────────────────────────────

function MonthPickerModal({ visible, currentYear, currentMonth, now, onClose, onSelect }: {
  visible: boolean;
  currentYear: number;
  currentMonth: number;
  now: Date;
  onClose: () => void;
  onSelect: (y: number, m: number) => void;
}) {
  const slide = useRef(new Animated.Value(600)).current;
  const [pickerYear, setPickerYear] = useState(currentYear);

  useEffect(() => {
    if (visible) {
      setPickerYear(currentYear);
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    } else {
      Animated.timing(slide, { toValue: 600, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  const months = Array.from({ length: 12 }, (_, i) => {
    const isFuture =
      pickerYear > now.getFullYear() ||
      (pickerYear === now.getFullYear() && i > now.getMonth());
    return { index: i, label: FULL_MONTHS[i], disabled: isFuture };
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={pickerStyles.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[pickerStyles.sheet, { transform: [{ translateY: slide }] }]}>
        <View style={pickerStyles.handle} />
        <View style={pickerStyles.header}>
          <ThemedText type="h3">Select month</ThemedText>
          <TouchableOpacity onPress={onClose} style={pickerStyles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={pickerStyles.yearNav}>
          <TouchableOpacity style={pickerStyles.yearBtn} onPress={() => setPickerYear((y) => y - 1)} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
          <ThemedText type="h4">{pickerYear}</ThemedText>
          <TouchableOpacity
            style={pickerStyles.yearBtn}
            onPress={() => setPickerYear((y) => y + 1)}
            activeOpacity={0.7}
            disabled={pickerYear >= now.getFullYear()}
          >
            <Ionicons
              name="chevron-forward"
              size={16}
              color={pickerYear >= now.getFullYear() ? colors.textTertiary : colors.textPrimary}
            />
          </TouchableOpacity>
        </View>

        <View style={pickerStyles.monthGrid}>
          {months.map((m) => {
            const isSelected = pickerYear === currentYear && m.index + 1 === currentMonth;
            return (
              <TouchableOpacity
                key={m.index}
                style={[
                  pickerStyles.monthCell,
                  isSelected && pickerStyles.monthCellActive,
                  m.disabled && pickerStyles.monthCellDisabled,
                ]}
                disabled={m.disabled}
                activeOpacity={0.75}
                onPress={() => onSelect(pickerYear, m.index + 1)}
              >
                <ThemedText
                  type="body"
                  color={m.disabled ? colors.textTertiary : isSelected ? colors.textInverse : colors.textPrimary}
                >
                  {m.label.slice(0, 3)}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </Modal>
  );
}

// ─── Year picker ────────────────────────────────────────────────────────────

function YearPickerModal({ visible, currentYear, now, onClose, onSelect }: {
  visible: boolean;
  currentYear: number;
  now: Date;
  onClose: () => void;
  onSelect: (y: number) => void;
}) {
  const slide = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    } else {
      Animated.timing(slide, { toValue: 600, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  const nowYear = now.getFullYear();
  const years = Array.from({ length: Math.max(nowYear - 2019, 6) }, (_, i) => nowYear - i);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={pickerStyles.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[pickerStyles.sheet, { transform: [{ translateY: slide }] }]}>
        <View style={pickerStyles.handle} />
        <View style={pickerStyles.header}>
          <ThemedText type="h3">Select year</ThemedText>
          <TouchableOpacity onPress={onClose} style={pickerStyles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={years}
          keyExtractor={(item) => String(item)}
          style={{ maxHeight: 320 }}
          contentContainerStyle={{ paddingHorizontal: spacing[5], paddingBottom: spacing[5] }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = item === currentYear;
            return (
              <TouchableOpacity
                style={[pickerStyles.yearRow, isSelected && pickerStyles.yearRowActive]}
                activeOpacity={0.75}
                onPress={() => onSelect(item)}
              >
                <ThemedText type="h4" color={isSelected ? colors.textInverse : colors.textPrimary}>
                  {item}
                </ThemedText>
                {isSelected && <Ionicons name="checkmark" size={18} color={colors.textInverse} />}
              </TouchableOpacity>
            );
          }}
        />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    marginTop: spacing[3],
    marginHorizontal: spacing[5],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  labelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
});

const pickerStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,27,42,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  yearNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing[5],
    marginBottom: spacing[4],
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing[3],
  },
  yearBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    gap: spacing[2],
  },
  monthCell: {
    width: '30%',
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
  },
  monthCellActive: { backgroundColor: colors.primary500 },
  monthCellDisabled: { opacity: 0.35 },
  yearRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    marginBottom: spacing[2],
  },
  yearRowActive: { backgroundColor: colors.primary500 },
});
