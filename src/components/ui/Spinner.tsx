import { ActivityIndicator } from 'react-native';

import { useTheme } from '@/theme/useTheme';

export type SpinnerProps = {
  size?: 'small' | 'large';
  /** override; default primary */
  color?: string;
};

/** Küçük ActivityIndicator, default primary renkli. */
export function Spinner({ size = 'small', color }: SpinnerProps) {
  const { colors } = useTheme();
  return <ActivityIndicator size={size} color={color ?? colors.primary} />;
}
