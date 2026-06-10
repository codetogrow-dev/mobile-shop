import { Modal, View, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { fmtCurrency } from '@/lib/format-num';
import { numToWords } from '@/lib/num-to-words';

export interface StatInfoModalProps {
  visible: boolean;
  onClose: () => void;
  label: string;
  description: string;
  value: number;
  /** Pass true for amounts that can be negative (profit) */
  isCurrency?: boolean;
  /** Icon name from Ionicons */
  icon: string;
  accentColor: string;
  accentBg: string;
}

export function StatInfoModal({
  visible, onClose, label, description, value, isCurrency = true,
  icon, accentColor, accentBg,
}: StatInfoModalProps) {
  const isNeg = value < 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={styles.sheet}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: accentBg }]}>
            <Ionicons name={icon as any} size={20} color={accentColor} />
          </View>
          <ThemedText type="h3" style={{ flex: 1 }}>{label}</ThemedText>
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={styles.closeBtn}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </View>
          </TouchableWithoutFeedback>
        </View>

        {/* Description */}
        <ThemedText type="body" color={colors.textSecondary} style={styles.desc}>
          {description}
        </ThemedText>

        {/* Exact value block */}
        <View style={[styles.valueBlock, { borderLeftColor: accentColor }]}>
          <ThemedText type="caption" color={colors.textTertiary}>Exact Value</ThemedText>
          <ThemedText type="h2" color={accentColor} style={styles.exactNumber}>
            {isCurrency ? fmtCurrency(value, isNeg) : String(value)}
          </ThemedText>
          {isCurrency && (
            <ThemedText type="caption" color={colors.textSecondary}>
              ₨ {Math.abs(value).toLocaleString('en-PK')}
            </ThemedText>
          )}
        </View>

        {/* In words — only for currency */}
        {isCurrency && (
          <View style={styles.wordsBlock}>
            <ThemedText type="overline" color={colors.textTertiary}>IN WORDS</ThemedText>
            <ThemedText type="body" color={colors.textPrimary} style={styles.wordsText}>
              {isNeg ? 'Minus ' : ''}{numToWords(Math.abs(value))}
            </ThemedText>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing[5],
    paddingBottom: spacing[8],
    gap: spacing[4],
    ...shadows.lg,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
  },
  iconBox: {
    width: 40, height: 40, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  desc: { lineHeight: 22 },
  valueBlock: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    padding: spacing[4],
    gap: spacing[1],
  },
  exactNumber: { marginVertical: spacing[1] },
  wordsBlock: {
    gap: spacing[2],
    padding: spacing[4],
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
  },
  wordsText: {
    fontStyle: 'italic',
    lineHeight: 22,
  },
});
