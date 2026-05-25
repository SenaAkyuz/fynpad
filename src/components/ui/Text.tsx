import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { typography, type TypographyVariant } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import type { ThemeColors } from '@/theme/tokens';

export type TextColor = keyof ThemeColors;

export type TextProps = RNTextProps & {
  /** tipografi tokenı; varsayılan bodyMd */
  variant?: TypographyVariant;
  /** tema renk anahtarı; varsayılan onSurface */
  color?: TextColor;
};

/**
 * Tema-farkındalıklı Text. fontFamily / lineHeight / letterSpacing tokendan gelir.
 * Hiçbir komponent doğrudan fontFamily yazmasın — hep bunun üzerinden.
 */
export function Text({ variant = 'bodyMd', color = 'onSurface', style, ...rest }: TextProps) {
  const { colors } = useTheme();
  return <RNText style={[typography[variant], { color: colors[color] }, style]} {...rest} />;
}
