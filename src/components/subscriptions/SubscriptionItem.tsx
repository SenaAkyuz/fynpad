import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ServiceIcon } from '@/components/subscriptions/ServiceIconPicker';
import { Text } from '@/components/ui/Text';
import { formatCurrency, formatRelativeFuture } from '@/lib/format';
import { nextRenewalDate } from '@/lib/subscriptions';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Locale, Subscription } from '@/types';

export type SubscriptionItemProps = {
  subscription: Subscription;
  locale: Locale;
  onPress: () => void;
};

/**
 * Abonelik satırı (design: glass card, sol ikon + servis/plan, sağ aylık ücret + sonraki yenilenme).
 * Aylık ücret: monthly→amount, yearly→amount/12 ("/ay" eki ile aylık eşdeğer; brief "aylık ücret").
 */
export function SubscriptionItem({ subscription, locale, onPress }: SubscriptionItemProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const monthlyEquivalent =
    subscription.frequency === 'monthly' ? subscription.amount : subscription.amount / 12;
  const renewal = nextRenewalDate(subscription);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.glassBorder }]}
    >
      <View style={styles.left}>
        <ServiceIcon iconKey={subscription.iconKey} size={48} />
        <View style={styles.texts}>
          <Text variant="bodyMd" style={styles.name} numberOfLines={1}>
            {subscription.serviceName}
          </Text>
          {subscription.planName ? (
            <Text variant="labelSm" color="onSurfaceVariant" numberOfLines={1}>
              {subscription.planName}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.right}>
        <Text variant="bodyMd" style={styles.amount}>
          <Text variant="bodyMd" color="primary" style={styles.amount}>
            {formatCurrency(monthlyEquivalent, subscription.currency, locale)}
          </Text>
          <Text variant="labelSm" color="onSurfaceVariant">
            {t('subscriptions.perMonth')}
          </Text>
        </Text>
        {renewal ? (
          <Text variant="labelSm" color="onSurfaceVariant">
            {t('subscriptions.nextShort')}: {formatRelativeFuture(renewal, locale)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontWeight: '700',
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  amount: {
    fontWeight: '700',
  },
});
