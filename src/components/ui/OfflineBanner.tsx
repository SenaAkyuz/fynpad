import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * Çevrimdışı durum şeridi (Part 13.5). Screen'in en üstünde otomatik görünür.
 * İlk NetInfo fetch tamamlanana kadar (isInitialized=false) gösterilmez — yanlış flash olmasın.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const isOnline = useNetworkStore((s) => s.isOnline);
  const isInitialized = useNetworkStore((s) => s.isInitialized);

  if (!isInitialized || isOnline) {
    return null;
  }

  return (
    <View style={[styles.bar, { backgroundColor: colors.tertiaryContainer }]}>
      <Icon name="wifi-off" size={14} color={colors.onTertiaryContainer} strokeWidth={2} />
      <Text variant="labelSm" color="onTertiaryContainer" numberOfLines={1} style={styles.label}>
        {t('common.offline')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.lg,
  },
  label: {
    flexShrink: 1,
  },
});
