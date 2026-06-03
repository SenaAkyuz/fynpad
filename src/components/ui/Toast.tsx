import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { useToastStore } from '@/stores/useToastStore';
import { radii, shadows, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const AUTO_HIDE_MS = 4000;

/**
 * Üstte beliren geçici bildirim. Root overlay'de render edilir (Stack'in üstünde).
 * useToastStore.show(messageKey) ile herhangi bir yerden (React dışı dahil) tetiklenir.
 */
export function Toast() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const visible = useToastStore((s) => s.visible);
  const messageKey = useToastStore((s) => s.messageKey);
  const type = useToastStore((s) => s.type);
  const hide = useToastStore((s) => s.hide);

  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(hide, AUTO_HIDE_MS);
    return () => clearTimeout(id);
  }, [visible, messageKey, hide]);

  if (!visible || !messageKey) {
    return null;
  }

  const bg =
    type === 'error'
      ? colors.tertiary
      : type === 'success'
        ? colors.secondary
        : colors.surfaceContainerHighest;
  const fg = type === 'info' ? colors.onSurface : colors.onPrimary;

  return (
    <Animated.View
      entering={FadeInUp}
      pointerEvents="none"
      style={[styles.container, { top: insets.top + spacing.sm }]}
    >
      <View style={[styles.toast, { backgroundColor: bg, ...shadows.floating, shadowColor: '#0f172a' }]}>
        <Text variant="labelMd" style={[styles.text, { color: fg }]}>
          {t(messageKey)}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.containerMargin,
    zIndex: 1000,
  },
  toast: {
    maxWidth: 420,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
  },
  text: {
    textAlign: 'center',
  },
});
