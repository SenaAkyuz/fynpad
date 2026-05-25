import { StyleSheet, View } from 'react-native';

import { SubscriptionItem } from '@/components/subscriptions/SubscriptionItem';
import { spacing } from '@/theme/tokens';
import type { Locale, Subscription } from '@/types';

export type SubscriptionListProps = {
  items: Subscription[];
  locale: Locale;
  onItemPress: (subscription: Subscription) => void;
};

export function SubscriptionList({ items, locale, onItemPress }: SubscriptionListProps) {
  return (
    <View style={styles.list}>
      {items.map((sub) => (
        <SubscriptionItem
          key={sub.id}
          subscription={sub}
          locale={locale}
          onPress={() => onItemPress(sub)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
});
