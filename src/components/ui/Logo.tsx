import type { StyleProp, TextStyle } from 'react-native';

import { Text } from '@/components/ui/Text';
import type { TypographyVariant } from '@/theme/tokens';

export type LogoProps = {
  variant?: TypographyVariant;
  style?: StyleProp<TextStyle>;
};

/**
 * FynPad wordmark. Şimdilik sadece metin (headlineLg, primary). İleride görsel asset
 * eklenirse merkezi olarak buraya konur.
 */
export function Logo({ variant = 'headlineLg', style }: LogoProps) {
  return (
    <Text variant={variant} color="primary" style={style}>
      FynPad
    </Text>
  );
}
