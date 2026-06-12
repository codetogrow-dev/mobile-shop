import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { parseISO, differenceInCalendarDays } from 'date-fns';

import { ThemedText } from '@/components/themed-text';
import { colors, spacing, radius, shadows } from '@/constants/theme';
import { fmtRupeeCompact } from '@/lib/format-num';
import { fmtKarachi } from '@/lib/datetime';
import { QK } from '@/constants/query-keys';
import { getOverduePeople } from '@/api/dues';

export function OverdueBanner() {
  const { data } = useQuery({
    queryKey: QK.dues.overduePeople,
    queryFn: () => getOverduePeople(10),
    staleTime: 60_000,
  });

  if (!data || data.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.headRow}>
        <View style={styles.headLeft}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <ThemedText type="h4" color={colors.danger}>Overdue</ThemedText>
          <View style={styles.countPill}>
            <ThemedText type="caption" color={colors.textInverse} style={{ fontWeight: '700' }}>
              {data.length}
            </ThemedText>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push('/(app)/(tabs)/dues' as any)} activeOpacity={0.7}>
          <ThemedText type="caption" color={colors.primary600}>View all →</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {data.map((p) => {
          const daysOver = p.oldest_due_date
            ? differenceInCalendarDays(new Date(), parseISO(p.oldest_due_date))
            : 0;
          return (
            <TouchableOpacity
              key={`${p.kind}-${p.party_id}`}
              style={styles.card}
              onPress={() =>
                router.push(
                  (p.kind === 'customer'
                    ? `/(app)/customer/${p.party_id}`
                    : `/(app)/supplier/${p.party_id}`) as any,
                )
              }
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.avatar, p.kind === 'supplier' && { backgroundColor: colors.infoBg }]}>
                  <ThemedText
                    type="h4"
                    color={p.kind === 'supplier' ? colors.info : colors.danger}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
                <View style={styles.kindBadge}>
                  <ThemedText type="overline" color={colors.textTertiary}>
                    {p.kind === 'customer' ? 'OWES YOU' : 'YOU OWE'}
                  </ThemedText>
                </View>
              </View>
              <ThemedText type="bodySm" numberOfLines={1} style={{ fontWeight: '600' }}>
                {p.name}
              </ThemedText>
              <ThemedText type="numeric" color={colors.danger}>
                {fmtRupeeCompact(p.overdue_amount)}
              </ThemedText>
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={11} color={colors.textTertiary} />
                <ThemedText type="caption" color={colors.textTertiary} numberOfLines={1}>
                  {p.oldest_due_date
                    ? `${daysOver}d · ${fmtKarachi(p.oldest_due_date, 'dd MMM')}`
                    : 'overdue'}
                </ThemedText>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing[3] },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  countPill: {
    minWidth: 22, height: 18, borderRadius: 9, paddingHorizontal: 6,
    backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center',
  },
  scroll: { gap: spacing[3], paddingRight: spacing[2] },
  card: {
    width: 170,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger + '40',
    padding: spacing[3],
    gap: spacing[1],
    ...shadows.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.dangerBg, alignItems: 'center', justifyContent: 'center',
  },
  kindBadge: {
    paddingHorizontal: spacing[2], paddingVertical: 2,
    backgroundColor: colors.bgElevated, borderRadius: radius.sm,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
