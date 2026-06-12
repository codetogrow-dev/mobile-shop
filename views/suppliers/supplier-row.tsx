import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNowStrict } from 'date-fns';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { colors, spacing, radius } from '@/constants/theme';
import { fmtRupeeCompact } from '@/lib/format-num';
import type { SupplierListRow } from '@/types/app';

interface Props {
  item: SupplierListRow;
  rank?: number;
  onPress: () => void;
}

export function SupplierRow({ item, rank, onPress }: Props) {
  const initials = item.name.charAt(0).toUpperCase();
  const last = item.last_purchase_at
    ? formatDistanceToNowStrict(new Date(item.last_purchase_at), { addSuffix: true })
    : 'No purchases';
  const isTopRank = !!rank && rank <= 3;

  return (
    <Card onPress={onPress} padded style={styles.card}>
      {/* Top row — avatar + name + lifetime purchased (the hero number) */}
      <View style={styles.headRow}>
        <View style={[styles.avatar, isTopRank && styles.avatarTop]}>
          <ThemedText type="h3" color={isTopRank ? colors.info : colors.primary600}>
            {initials}
          </ThemedText>
          {isTopRank && (
            <View style={styles.crown}>
              <Ionicons name="ribbon" size={10} color={colors.info} />
            </View>
          )}
        </View>

        <View style={styles.nameCol}>
          <ThemedText type="h4" numberOfLines={1}>
            {item.name}
          </ThemedText>
          <ThemedText type="overline" color={colors.textTertiary}>
            LIFETIME PURCHASED
          </ThemedText>
          <ThemedText
            type="numeric"
            color={isTopRank ? colors.info : colors.textPrimary}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {fmtRupeeCompact(item.lifetime_purchased)}
          </ThemedText>
        </View>
      </View>

      {/* Footer strip — meta + balance pill */}
      <View style={styles.footer}>
        <View style={styles.metaWrap}>
          {item.phone ? (
            <View style={styles.metaItem}>
              <Ionicons name="call-outline" size={11} color={colors.textTertiary} />
              <ThemedText type="caption" color={colors.textTertiary}>{item.phone}</ThemedText>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <Ionicons name="layers-outline" size={11} color={colors.textTertiary} />
            <ThemedText type="caption" color={colors.textTertiary}>
              {item.batch_count} batch{item.batch_count === 1 ? '' : 'es'}
            </ThemedText>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={11} color={colors.textTertiary} />
            <ThemedText type="caption" color={colors.textTertiary} numberOfLines={1}>
              {last}
            </ThemedText>
          </View>
        </View>
        {item.current_balance > 0 && (
          <Badge label={`${fmtRupeeCompact(item.current_balance)} due`} variant="danger" dot />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: spacing[5], marginBottom: spacing[3] },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  avatar: {
    width: 48, height: 48, borderRadius: radius.full,
    backgroundColor: colors.primary50,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  avatarTop: {
    backgroundColor: colors.infoBg,
    borderWidth: 1.5,
    borderColor: colors.info + '60',
  },
  crown: {
    position: 'absolute', top: -4, right: -4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
  },
  nameCol: { flex: 1, gap: 2 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing[3],
    rowGap: 2,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});

interface CompactProps {
  item: SupplierListRow;
  onPress: () => void;
}

export function ValuedSupplierCard({ item, onPress }: CompactProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={compactStyles.card}>
      <View style={compactStyles.head}>
        <View style={compactStyles.avatar}>
          <ThemedText type="h3" color={colors.info}>{item.name.charAt(0).toUpperCase()}</ThemedText>
        </View>
        <View style={compactStyles.crown}>
          <Ionicons name="ribbon" size={11} color={colors.info} />
        </View>
      </View>
      <ThemedText type="bodySm" numberOfLines={1} style={{ fontWeight: '700' }}>
        {item.name}
      </ThemedText>
      <ThemedText type="caption" color={colors.textTertiary} numberOfLines={1}>
        {item.batch_count} batch{item.batch_count === 1 ? '' : 'es'}
      </ThemedText>
      <ThemedText
        type="numeric"
        color={colors.info}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {fmtRupeeCompact(item.lifetime_purchased)}
      </ThemedText>
    </TouchableOpacity>
  );
}

const compactStyles = StyleSheet.create({
  card: {
    width: 160,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.info + '40',
    padding: spacing[3],
    gap: spacing[1],
  },
  head: { position: 'relative', alignSelf: 'flex-start' },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.infoBg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing[1],
  },
  crown: {
    position: 'absolute', top: -4, right: -8,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.bgCard,
    borderWidth: 1.5, borderColor: colors.info + '40',
    alignItems: 'center', justifyContent: 'center',
  },
});
