import { useIsMutating } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * Bekleyen senkron sayacı (Part 13.5, Settings). Çalışan + paused mutation sayısını gösterir.
 * 0 ise hiç render etmez. Online → "senkronize ediliyor", offline → "senkronize bekleniyor".
 */
export function SyncStatusIndicator() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const isOnline = useNetworkStore((s) => s.isOnline);
  const pending = useIsMutating();

  if (pending === 0) {
    return null;
  }

  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceContainerLow }]}>
      <Icon
        name={isOnline ? 'rotate-ccw' : 'wifi-off'}
        size={16}
        color={colors.onSurfaceVariant}
        strokeWidth={2}
      />
      <Text variant="labelSm" color="onSurfaceVariant" style={styles.label}>
        {isOnline
          ? t('common.syncing', { count: pending })
          : t('common.queuedOffline', { count: pending })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
  },
  label: {
    flexShrink: 1,
  },
});
