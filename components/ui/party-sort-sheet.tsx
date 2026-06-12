import { useEffect, useRef } from 'react';
import {
  View, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import type { PartyListSort } from '@/types/app';

interface Props {
  kind: 'customer' | 'supplier';
  visible: boolean;
  value: PartyListSort;
  onChange: (s: PartyListSort) => void;
  onClose: () => void;
}

interface Option {
  value: PartyListSort;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const customerOptions: Option[] = [
  { value: 'spent',   label: 'Top spender',      icon: 'trophy-outline' },
  { value: 'visits',  label: 'Most visits',      icon: 'repeat-outline' },
  { value: 'recent',  label: 'Recent visitor',   icon: 'time-outline' },
  { value: 'balance', label: 'Biggest debtor',   icon: 'alert-circle-outline' },
  { value: 'name',    label: 'Name (A–Z)',       icon: 'text-outline' },
];

const supplierOptions: Option[] = [
  { value: 'spent',   label: 'Most purchased',   icon: 'trophy-outline' },
  { value: 'visits',  label: 'Most batches',     icon: 'layers-outline' },
  { value: 'recent',  label: 'Recent purchase',  icon: 'time-outline' },
  { value: 'balance', label: 'You owe most',     icon: 'alert-circle-outline' },
  { value: 'name',    label: 'Name (A–Z)',       icon: 'text-outline' },
];

export function PartySortSheet({ kind, visible, value, onChange, onClose }: Props) {
  const slideAnim = useRef(new Animated.Value(700)).current;
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 700,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [visible]);

  const options = kind === 'customer' ? customerOptions : supplierOptions;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <ThemedText type="h3">Sort {kind === 'customer' ? 'customers' : 'suppliers'}</ThemedText>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {options.map((o) => {
            const active = value === o.value;
            return (
              <TouchableOpacity
                key={o.value}
                style={[styles.row, active && styles.rowActive]}
                onPress={() => { onChange(o.value); onClose(); }}
                activeOpacity={0.7}
              >
                <Ionicons name={o.icon} size={18} color={active ? colors.primary500 : colors.textTertiary} />
                <ThemedText
                  type="body"
                  color={active ? colors.primary500 : colors.textPrimary}
                  style={[{ flex: 1 }, active && { fontWeight: '700' }]}
                >
                  {o.label}
                </ThemedText>
                {active && <Ionicons name="checkmark" size={18} color={colors.primary500} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing[5],
    ...shadows.lg,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing[3], marginBottom: spacing[1],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: spacing[5], gap: spacing[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowActive: { borderColor: colors.primary300, backgroundColor: colors.primary50 },
});
