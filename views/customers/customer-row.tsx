import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNowStrict } from 'date-fns';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { colors, spacing, radius } from '@/constants/theme';
import { fmtRupeeCompact } from '@/lib/format-num';
import type { CustomerListRow } from '@/types/app';

interface Props {
  item: CustomerListRow;
  rank?: number;
  onPress: () => void;
}

export function CustomerRow({ item, rank, onPress }: Props) {
  const initials = item.name.charAt(0).toUpperCase();
  const lastVisit = item.last_visit_at
    ? formatDistanceToNowStrict(new Date(item.last_visit_at), { addSuffix: true })
    : 'No visits';
  const isTopRank = !!rank && rank <= 3;

  return (
    <Card onPress={onPress} padded style={styles.card}>
      {/* Top row — avatar + name + lifetime spent (the hero number) */}
      <View style={styles.headRow}>
        <View style={[styles.avatar, isTopRank && styles.avatarTop]}>
          <ThemedText
            type="h3"
            color={isTopRank ? colors.warning : colors.primary600}
          >
            {initials}
          </ThemedText>
          {isTopRank && (
            <View style={styles.crown}>
              <Ionicons name="trophy" size={10} color={colors.warning} />
            </View>
          )}
        </View>

        <View style={styles.nameCol}>
          <ThemedText type="h4" numberOfLines={1}>
            {item.name}
          </ThemedText>
          <ThemedText type="overline" color={colors.textTertiary}>
            LIFETIME SPENT
          </ThemedText>
          <ThemedText
            type="numeric"
            color={isTopRank ? colors.warning : colors.textPrimary}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {fmtRupeeCompact(item.lifetime_spent)}
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
            <Ionicons name="repeat-outline" size={11} color={colors.textTertiary} />
            <ThemedText type="caption" color={colors.textTertiary}>
              {item.visit_count} visit{item.visit_count === 1 ? '' : 's'}
            </ThemedText>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={11} color={colors.textTertiary} />
            <ThemedText type="caption" color={colors.textTertiary} numberOfLines={1}>
              {lastVisit}
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
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarTop: {
    backgroundColor: colors.warningBg,
    borderWidth: 1.5,
    borderColor: colors.warning + '60',
  },
  crown: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
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
  item: CustomerListRow;
  onPress: () => void;
}

/** Compact horizontal-carousel variant used by the "Valued Customers" rail. */
export function ValuedCustomerCard({ item, onPress }: CompactProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={compactStyles.card}>
      <View style={compactStyles.head}>
        <View style={compactStyles.avatar}>
          <ThemedText type="h3" color={colors.warning}>
            {item.name.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <View style={compactStyles.crown}>
          <Ionicons name="trophy" size={11} color={colors.warning} />
        </View>
      </View>
      <ThemedText type="bodySm" numberOfLines={1} style={{ fontWeight: '700' }}>
        {item.name}
      </ThemedText>
      <ThemedText type="caption" color={colors.textTertiary} numberOfLines={1}>
        {item.visit_count} visit{item.visit_count === 1 ? '' : 's'}
      </ThemedText>
      <ThemedText
        type="numeric"
        color={colors.warning}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {fmtRupeeCompact(item.lifetime_spent)}
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
    borderColor: colors.warning + '40',
    padding: spacing[3],
    gap: spacing[1],
  },
  head: { position: 'relative', alignSelf: 'flex-start' },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  crown: {
    position: 'absolute',
    top: -4,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.bgCard,
    borderWidth: 1.5,
    borderColor: colors.warning + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
