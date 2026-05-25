import type { StyleProp, TextStyle } from 'react-native';

import { Text } from '@/components/ui/Text';

export type ErrorTextProps = {
  children?: string;
  style?: StyleProp<TextStyle>;
};

/** label-sm, error renkli. Boş/undefined ise hiçbir şey render etmez (margin atmaz). */
export function ErrorText({ children, style }: ErrorTextProps) {
  if (!children) {
    return null;
  }
  return (
    <Text variant="labelSm" color="error" style={style}>
      {children}
    </Text>
  );
}
