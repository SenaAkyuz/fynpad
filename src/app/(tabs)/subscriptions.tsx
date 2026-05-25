import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { SubscriptionGrowthChart } from '@/components/subscriptions/SubscriptionGrowthChart';
import { SubscriptionList } from '@/components/subscriptions/SubscriptionList';
import { SubscriptionSummaryCard } from '@/components/subscriptions/SubscriptionSummaryCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Spinner } from '@/components/ui/Spinner';
import { Text } from '@/components/ui/Text';
import { useProfile } from '@/hooks/useProfile';
import { useSubscriptions, useSubscriptionTotals } from '@/hooks/useSubscriptions';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Currency, Subscription } from '@/types';
import { useAppStore } from '@/stores/useAppStore';

/**
 * Subscription Manager (Part 7, brief 4.4). Özet kart + büyüme grafiği (bar) + aktif abonelik
 * listesi + FAB. Tasarım: subscription_manager_*.html (clarification ile design kazandı).
 */
export default function SubscriptionsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const locale = useAppStore((s) => s.locale);

  const { data: subscriptions = [], isLoading } = useSubscriptions();
  const { data: profile } = useProfile();
  const currency: Currency = profile?.defaultCurrency ?? 'TRY';

  const { monthly, momPct, growthHistory, nextDue, count } = useSubscriptionTotals(subscriptions);
  const hasSubs = subscriptions.length > 0;

  const openEdit = (sub: Subscription) => router.push(`/subscription-edit?id=${sub.id}`);

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleBlock}>
          <Text variant="headlineMd" style={styles.title}>
            {t('subscriptions.title')}
          </Text>
          <Text variant="bodyMd" color="onSurfaceVariant">
            {t('subscriptions.subtitle')}
          </Text>
        </View>

        <SubscriptionSummaryCard
          totalMonthly={monthly}
          momPct={momPct}
          count={count}
          nextDue={nextDue}
          currency={currency}
          locale={locale}
        />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="headlineSm">{t('subscriptions.active')}</Text>
            {/* Tasarım header-action pattern'i (subscription_manager: başlığın sağında aksiyon).
                Brief 4.4 ekleme gerektirdiği için aksiyon = "+" ekle butonu. FAB kaldırıldı. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('subscriptions.addSubscription')}
              onPress={() => router.push('/subscription-edit')}
              hitSlop={8}
              style={[styles.addAction, { backgroundColor: colors.surfaceContainerHigh }]}
            >
              <Icon name="plus" size={20} color={colors.primary} strokeWidth={2.5} />
            </Pressable>
          </View>
          {isLoading && !hasSubs ? (
            <View style={styles.loading}>
              <Spinner />
            </View>
          ) : hasSubs ? (
            <SubscriptionList items={subscriptions} locale={locale} onItemPress={openEdit} />
          ) : (
            <Pressable accessibilityRole="button" onPress={() => router.push('/subscription-edit')}>
              <GlassCard style={styles.empty}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceContainerHigh }]}>
                  <Icon name="repeat" size={28} color={colors.primary} strokeWidth={2} />
                </View>
                <Text variant="headlineSm" style={styles.emptyText}>
                  {t('subscriptions.empty')}
                </Text>
                <Text variant="bodyMd" color="onSurfaceVariant" style={styles.emptyText}>
                  {t('subscriptions.emptyHint')}
                </Text>
              </GlassCard>
            </Pressable>
          )}
        </View>

        {hasSubs ? (
          <View style={styles.section}>
            <Text variant="headlineSm">{t('subscriptions.growth')}</Text>
            <SubscriptionGrowthChart data={growthHistory} locale={locale} />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.lg,
    // Floating bottom nav clearance (dashboard/settings ile tutarlı). FAB yok artık.
    paddingBottom: 120,
    gap: spacing.stackMd,
  },
  titleBlock: {
    gap: spacing.xs,
  },
  title: {
    fontWeight: '800',
  },
  section: {
    gap: spacing.stackSm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addAction: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    paddingVertical: spacing.stackLg,
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
  },
});
