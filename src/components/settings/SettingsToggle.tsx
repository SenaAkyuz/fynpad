import { StyleSheet, Switch, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export type SettingsToggleProps = {
  icon?: IconName;
  label: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  /** Etiket altında küçük açıklama (örn. "Önce cihaz kilidi açılmalı"). */
  hint?: string;
};

/**
 * Toggle ayar satırı: sol icon + label (+ hint), sağ React Native Switch.
 * Renkler tema primary'sinden gelir; SettingsRow ile aynı yükseklik/padding.
 */
export function SettingsToggle({
  icon,
  label,
  value,
  onValueChange,
  disabled = false,
  hint,
}: SettingsToggleProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, disabled && styles.disabled]}>
      <View style={styles.left}>
        {icon ? <Icon name={icon} size={20} color={colors.onSurfaceVariant} strokeWidth={2} /> : null}
        <View style={styles.texts}>
          <Text variant="bodyMd" numberOfLines={1}>
            {label}
          </Text>
          {hint ? (
            <Text variant="labelSm" color="onSurfaceVariant">
              {hint}
            </Text>
          ) : null}
        </View>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.surfaceContainerHighest, true: colors.primary }}
        thumbColor={value ? colors.onPrimary : colors.surfaceContainerLowest}
        ios_backgroundColor={colors.surfaceContainerHighest}
      />
    </View>
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
  texts: {
    flex: 1,
    gap: spacing.xs,
  },
});
