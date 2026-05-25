import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { radii, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export type PreferenceOption<T extends string> = {
  value: T;
  label: string;
  helperText?: string;
};

export type PreferencePickerProps<T extends string> = {
  visible: boolean;
  title: string;
  options: PreferenceOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  onClose: () => void;
};

/**
 * Alt-sheet seçici (Language / Currency / Theme ortak). Option tap → onSelect + kapanış.
 * Backdrop tap kapatır. Seçili option primary tint + check ile işaretlenir.
 */
export function PreferencePicker<T extends string>({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: PreferencePickerProps<T>) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surfaceContainerLowest }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text variant="headlineSm">{title}</Text>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={onClose}>
              <Icon name="x" size={22} color={colors.onSurfaceVariant} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.options}>
            {options.map((opt) => {
              const active = opt.value === selectedValue;
              return (
                <Pressable
                  key={opt.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    onSelect(opt.value);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      backgroundColor: active
                        ? colors.primaryContainer
                        : pressed
                          ? colors.surfaceContainer
                          : colors.surfaceContainerLow,
                      borderColor: active ? colors.primary : colors.outlineVariant,
                    },
                  ]}
                >
                  <View style={styles.optionText}>
                    <Text variant="bodyMd" color={active ? 'onPrimaryContainer' : 'onSurface'}>
                      {opt.label}
                    </Text>
                    {opt.helperText ? (
                      <Text
                        variant="labelSm"
                        color={active ? 'onPrimaryContainer' : 'onSurfaceVariant'}
                      >
                        {opt.helperText}
                      </Text>
                    ) : null}
                  </View>
                  {active ? (
                    <Icon name="check" size={20} color={colors.onPrimaryContainer} strokeWidth={2.5} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.stackMd,
    paddingBottom: spacing.stackLg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  options: {
    gap: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  optionText: {
    flex: 1,
    gap: spacing.xs,
  },
});
