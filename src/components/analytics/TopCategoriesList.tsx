import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import type { TopCategory } from '@/lib/analytics';
import { formatCurrency } from '@/lib/format';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { Category, Currency, Locale } from '@/types';

export type TopCategoriesListProps = {
  items: TopCategory[];
  categories: Category[];
  currency: Currency;
  locale: Locale;
};

/**
 * En çok harcanan kategoriler (brief 4.5). Tasarım advanced_analytics: satır başına ikon + ad
 * (sol), tutar + % (sağ), altında kategori renginde oransal yatay bar.
 */
export function TopCategoriesList({ items, categories, currency, locale }: TopCategoriesListProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const byId = new Map(categories.map((c) => [c.id, c]));

  if (items.length === 0) {
    return (
      <GlassCard>
        <View style={styles.empty}>
          <Text variant="bodyMd" color="onSurfaceVariant">
            {t('analytics.empty.noTransactions')}
          </Text>
        </View>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <View style={styles.list}>
        {items.map((item) => {
          const cat = byId.get(item.categoryId);
          const name = cat ? t(cat.name) : t('dashboard.categories.other');
          const color = cat?.color ?? colors.onSurfaceVariant;
          return (
            <View key={item.categoryId} style={styles.row}>
              <View style={styles.top}>
                <View style={styles.left}>
                  <View style={[styles.iconBox, { backgroundColor: colors.surfaceContainerHigh }]}>
                    <Icon
                      name={(cat?.icon as IconName) ?? 'more-horizontal'}
                      size={18}
                      color={color}
                      strokeWidth={2}
                    />
                  </View>
                  <Text variant="labelMd" numberOfLines={1} style={styles.name}>
                    {name}
                  </Text>
                </View>
                <View style={styles.amounts}>
                  <Text variant="labelMd">{formatCurrency(item.total, currency, locale)}</Text>
                  <Text variant="labelSm" color="onSurfaceVariant">
                    {`%${item.percent.toFixed(0)}`}
                  </Text>
                </View>
              </View>
              <View style={[styles.track, { backgroundColor: colors.surfaceContainerHighest }]}>
                <View
                  style={[
                    styles.fill,
                    { width: `${Math.min(item.percent, 100)}%`, backgroundColor: color },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.lg,
  },
  row: {
    gap: spacing.sm,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    flexShrink: 1,
  },
  amounts: {
    alignItems: 'flex-end',
  },
  track: {
    height: 6,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.full,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
});
