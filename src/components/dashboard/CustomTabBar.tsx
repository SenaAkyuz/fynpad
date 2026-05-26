import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { blur, radii, shadows, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * DESIGN.md "Bottom Navigation": floating glass bar, kenarlardan boşluklu, full radius.
 * Sıra (tasarım canonical): Dashboard · Analiz · [+ Ekle (yükseltilmiş)] · Hedefler · Ayarlar.
 * Aktif: primary tint + 4px nokta. Ekle: quick-add modal'ını açar.
 */
const TAB_ICONS: Record<string, IconName> = {
  dashboard: 'home',
  analytics: 'bar-chart',
  goals: 'target',
  settings: 'settings',
};
const LEFT = ['dashboard', 'analytics'];
const RIGHT = ['goals', 'settings'];

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  const { colors, resolved } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const focusedName = state.routes[state.index]?.name;

  const renderTab = (name: string) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) {
      return null;
    }
    const active = focusedName === name;
    const color = active ? colors.primary : colors.onSurfaceVariant;

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!active && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <Pressable
        key={name}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={styles.tab}
        onPress={onPress}
      >
        <Icon name={TAB_ICONS[name]} size={24} color={color} strokeWidth={2} />
        <Text
          variant="labelSm"
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[styles.tabLabel, { color }]}
        >
          {t(`tabs.${name}`)}
        </Text>
        <View style={[styles.dot, active && { backgroundColor: colors.primary }]} />
      </Pressable>
    );
  };

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + spacing.md }]} pointerEvents="box-none">
      <View style={[styles.pill, shadows.floating]}>
        <View style={[styles.blurClip, { borderColor: colors.glassBorder }]}>
          <BlurView
            intensity={blur.glass}
            tint={resolved === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassBackgroundStrong }]} />
        </View>

        {LEFT.map(renderTab)}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('tabs.add')}
          style={styles.tab}
          onPress={() => router.push('/quick-add')}
        >
          <View
            style={[styles.add, shadows.primaryGlow, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          >
            <Icon name="plus" size={26} color={colors.onPrimary} strokeWidth={2.5} />
          </View>
          <Text variant="labelSm" color="onSurfaceVariant" style={styles.addLabel}>
            {t('tabs.add')}
          </Text>
        </Pressable>

        {RIGHT.map(renderTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.containerMargin,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    borderRadius: radii.full,
  },
  blurClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.full,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  // labelSm 12px dar tab'a "Subscriptions" gibi uzun etiketle sığmıyor → 11px + tek satır.
  tabLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
    backgroundColor: 'transparent',
  },
  add: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginTop: -28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: {
    marginTop: 1,
  },
});
