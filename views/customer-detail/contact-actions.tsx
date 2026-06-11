import { View, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { colors, spacing, radius } from '@/constants/theme';

interface Props {
  phone: string | null;
}

function normalizeWa(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits.slice(1);
  if (digits.startsWith('0')) return '92' + digits.slice(1);
  return digits;
}

export function ContactActions({ phone }: Props) {
  const disabled = !phone || phone.trim().length === 0;

  const handleCall = async () => {
    if (!phone) return;
    const url = `tel:${phone}`;
    const can = await Linking.canOpenURL(url);
    if (can) Linking.openURL(url);
    else Alert.alert('Cannot place call', 'No dialer available on this device.');
  };

  const handleWhatsapp = async () => {
    if (!phone) return;
    const url = `whatsapp://send?phone=${normalizeWa(phone)}`;
    const can = await Linking.canOpenURL(url);
    if (can) Linking.openURL(url);
    else Linking.openURL(`https://wa.me/${normalizeWa(phone)}`);
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.btn, styles.callBtn, disabled && styles.btnDisabled]}
        onPress={handleCall}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Ionicons name="call" size={16} color={disabled ? colors.textTertiary : colors.textInverse} />
        <ThemedText type="caption" color={disabled ? colors.textTertiary : colors.textInverse} style={{ fontWeight: '700' }}>
          Call
        </ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btn, styles.waBtn, disabled && styles.btnDisabled]}
        onPress={handleWhatsapp}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Ionicons name="logo-whatsapp" size={16} color={disabled ? colors.textTertiary : colors.textInverse} />
        <ThemedText type="caption" color={disabled ? colors.textTertiary : colors.textInverse} style={{ fontWeight: '700' }}>
          WhatsApp
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing[2] },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
  },
  callBtn: { backgroundColor: colors.primary500 },
  waBtn:   { backgroundColor: '#25D366' },
  btnDisabled: { backgroundColor: colors.bgElevated },
});
