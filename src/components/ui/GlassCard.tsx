import { BlurView } from 'expo-blur';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { blur, radii, shadows } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export type GlassCardProps = ViewProps & {
  style?: ViewStyle;
  /** primary outer glow uygula (DESIGN.md: aktif/öne çıkan kartlar) */
  glow?: boolean;
};

/**
 * Frosted glass kart. DESIGN.md:
 *   light → rgba(255,255,255,0.7) + blur(20px) + 1px rgba(255,255,255,0.5) border
 *   dark  → rgba(30,41,59,0.6)   + blur(20px) + 1px rgba(255,255,255,0.15) border
 *
 * Not: expo-blur BlurView Android'de zayıf blur verebilir; bu yüzden BlurView'in
 * ALTINA yarı-saydam solid bg + ince border koyuyoruz — Android'de fallback,
 * iOS'ta blur'un üstüne hafif tint olarak çalışır.
 */
export function GlassCard({ style, glow = false, children, ...rest }: GlassCardProps) {
  const { colors, resolved } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { borderColor: colors.glassBorder },
        glow && { ...shadows.primaryGlow, shadowColor: colors.primary },
        style,
      ]}
      {...rest}
    >
      <BlurView
        intensity={blur.glass}
        tint={resolved === 'dark' ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      {/* yarı-saydam tint / Android fallback */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassBackground }]} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    overflow: 'hidden',
  },
  content: {
    padding: 24,
  },
});
