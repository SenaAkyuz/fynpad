import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { radii } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export type CheckboxProps = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  accessibilityLabel?: string;
};

/**
 * Özel 24×24 onay kutusu (paket kurmamak için). Seçili: primary dolgu + check;
 * boş: outline kenar. expo-checkbox / community checkbox yerine.
 */
export function Checkbox({ value, onValueChange, accessibilityLabel }: CheckboxProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={() => onValueChange(!value)}
      style={[
        styles.box,
        {
          backgroundColor: value ? colors.primary : 'transparent',
          borderColor: value ? colors.primary : colors.outline,
        },
      ]}
    >
      {value ? <Icon name="check" size={16} color={colors.onPrimary} strokeWidth={3} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
