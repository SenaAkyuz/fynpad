import { forwardRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput as RNTextInput,
  View,
  type TextInputProps as RNTextInputProps,
  type ViewStyle,
} from 'react-native';

import { ErrorText } from '@/components/ui/ErrorText';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export type TextInputProps = Omit<RNTextInputProps, 'style'> & {
  label?: string;
  /** i18n ile çevrilmiş hata metni (varsa) */
  error?: string;
  /** sol slot — opsiyonel, %40 opaklıkta nötr renkte render edilir */
  leftIcon?: ReactNode;
  /** sağ slot override (secureTextEntry verilmemişse) */
  rightIcon?: ReactNode;
  containerStyle?: ViewStyle;
};

/**
 * DESIGN.md "Input Fields": yalnızca alt border; focus'ta Electric Violet'e döner.
 * Sol icon nötr rengin %40 opaklığında. Error'da border `error`. Disabled'da opacity 0.5.
 * React Hook Form ile uyumlu (forwardRef).
 */
export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(
  {
    label,
    error,
    leftIcon,
    rightIcon,
    secureTextEntry,
    editable = true,
    containerStyle,
    onFocus,
    onBlur,
    ...rest
  },
  ref
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);

  const borderColor = error ? colors.error : focused ? colors.primary : colors.outlineVariant;
  const disabled = !editable;

  return (
    <View style={[styles.container, disabled && styles.disabled, containerStyle]}>
      {label ? (
        <Text variant="labelSm" color="onSurfaceVariant" style={styles.label}>
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.inputRow,
          {
            borderBottomColor: borderColor,
            borderBottomWidth: focused ? 2 : 1,
            paddingBottom: focused ? spacing.xs : spacing.xs + 1,
          },
        ]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}

        <RNTextInput
          ref={ref}
          editable={editable}
          secureTextEntry={hidden}
          placeholderTextColor={colors.outline}
          style={[styles.input, { color: colors.onSurface }]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />

        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setHidden((h) => !h)}
            style={styles.rightIcon}
          >
            <Icon
              name={hidden ? 'eye' : 'eye-off'}
              size={20}
              color={colors.onSurfaceVariant}
              strokeWidth={2}
            />
          </Pressable>
        ) : rightIcon ? (
          <View style={styles.rightIcon}>{rightIcon}</View>
        ) : null}
      </View>

      <ErrorText style={styles.error}>{error}</ErrorText>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftIcon: {
    marginRight: spacing.md,
    // nötr rengin %40 opaklığı (DESIGN.md)
    opacity: 0.4,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 24,
    paddingVertical: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.md,
  },
  error: {
    marginTop: spacing.sm,
  },
});
