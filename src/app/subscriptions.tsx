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
      {/* Artık tab değil, stack route (Settings → Abonelikler). Geri butonu eklendi. */}
      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()}>
          <Icon name="chevron-left" size={26} color={colors.primary} strokeWidth={2} />
        </Pressable>
        <Text variant="headlineMd">{t('subscriptions.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleBlock}>
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
            {/* Ekleme yalnızca genel "+" (Quick Add → Yeni Abonelik Oluştur) üzerinden yapılır.
                Bu ekran salt görüntüleme + düzenleme; buradan ekleme girişi yok. */}
          </View>
          {isLoading && !hasSubs ? (
            <View style={styles.loading}>
              <Spinner />
            </View>
          ) : hasSubs ? (
            <SubscriptionList items={subscriptions} locale={locale} onItemPress={openEdit} />
          ) : (
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.containerMargin,
    paddingVertical: spacing.md,
  },
  headerSpacer: {
    width: 26,
  },
  content: {
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.sm,
    // Floating bottom nav clearance (dashboard/settings ile tutarlı). FAB yok artık.
    paddingBottom: 120,
    gap: spacing.stackMd,
  },
  titleBlock: {
    gap: spacing.xs,
  },
  section: {
    gap: spacing.stackSm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
