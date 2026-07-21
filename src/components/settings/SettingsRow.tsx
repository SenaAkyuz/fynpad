import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export type SettingsRowProps = {
  icon?: IconName;
  label: string;
  /** Label altında gösterilen açıklama satırı (örn. "Yeni işlemlerde ön seçili…"). */
  description?: string;
  /** Sağda gösterilen değer (örn. "TRY", "Türkçe"). */
  value?: string;
  onPress?: () => void;
  /** Sağda chevron göster (navigasyon satırı). value ile birlikte de çalışır. */
  showChevron?: boolean;
  /** Sağ slot override (örn. özel rozet). value/chevron yerine geçer. */
  right?: ReactNode;
  /** Tehlike rengi (Sign Out gibi). */
  danger?: boolean;
  disabled?: boolean;
};

/**
 * Tıklanır ayarlar satırı: sol icon + label, sağ değer/chevron veya özel slot.
 * Toggle satırları için SettingsToggle kullanılır.
 */
export function SettingsRow({
  icon,
  label,
  description,
  value,
  onPress,
  showChevron = true,
  right,
  danger = false,
  disabled = false,
}: SettingsRowProps) {
  const { colors } = useTheme();
  const iconColor = danger ? colors.tertiary : colors.onSurfaceVariant;
  const labelColor = danger ? 'tertiary' : 'onSurface';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && onPress ? { backgroundColor: colors.surfaceContainer } : null,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.left}>
        {icon ? <Icon name={icon} size={20} color={iconColor} strokeWidth={2} /> : null}
        <View style={styles.labelColumn}>
          <Text
            variant="bodyMd"
            color={labelColor}
            numberOfLines={1}
            style={styles.label}
          >
            {label}
          </Text>
          {description ? (
            <Text variant="labelSm" color="onSurfaceVariant" style={styles.description}>
              {description}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.right}>
        {right ?? (
          <>
            {value ? (
              <Text variant="bodyMd" color="onSurfaceVariant" numberOfLines={1}>
                {value}
              </Text>
            ) : null}
            {showChevron ? (
              <Icon name="chevron-right" size={20} color={colors.onSurfaceVariant} strokeWidth={2} />
            ) : null}
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  disabled: {
    opacity: 0.5,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    flex: 1,
  },
  labelColumn: {
    flexShrink: 1,
    gap: 2,
  },
  label: {
    flexShrink: 1,
  },
  description: {
    flexShrink: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
});
