import { createElement } from 'react';
import { Platform, Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';

import { Spinner } from '@/components/ui/Spinner';
import { Text } from '@/components/ui/Text';
import { radii, shadows, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export type ButtonVariant = 'primary' | 'secondary';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
  /** loading'de Spinner gösterir + devre dışı bırakır */
  loading?: boolean;
  href?: string;
  style?: ViewStyle;
};

/**
 * Primary: Electric Violet dolgu, beyaz metin, 12px radius, primaryGlow gölge.
 * Secondary: transparan dolgu + outline kenar.
 */
export function Button({
  label,
  variant = 'primary',
  loading = false,
  href,
  style,
  disabled,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || loading;
  const buttonStyle = [
    styles.base,
    isPrimary
      ? { backgroundColor: colors.primary, ...shadows.primaryGlow, shadowColor: colors.primary }
      : { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.outline },
    isDisabled && styles.disabled,
    style,
  ];

  if (Platform.OS === 'web' && href && !isDisabled) {
    const labelColor = isPrimary ? colors.onPrimary : colors.primary;
    return createElement(
      'a',
      {
        href,
        role: 'button',
        style: {
          ...StyleSheet.flatten(buttonStyle),
          boxSizing: 'border-box',
          cursor: 'pointer',
          display: 'flex',
          borderStyle: isPrimary ? undefined : 'solid',
          textDecoration: 'none',
        },
      },
      createElement(
        'span',
        {
          style: {
            color: labelColor,
            fontSize: 16,
            fontWeight: 600,
            lineHeight: '24px',
          },
        },
        label
      )
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        ...buttonStyle,
        pressed && styles.pressed,
      ]}
      {...rest}
    >
      {loading ? (
        <Spinner color={isPrimary ? colors.onPrimary : colors.primary} />
      ) : (
        <Text variant="labelMd" color={isPrimary ? 'onPrimary' : 'primary'} style={styles.label}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  label: {
    fontSize: 16,
    lineHeight: 24,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
