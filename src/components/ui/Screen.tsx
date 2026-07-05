import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { useTheme } from '@/theme/useTheme';

/**
 * Geniş ekranlarda (tablet) içerik sütununun ortalanacağı üst genişlik sınırı. Telefon
 * genişlikleri (≈360–430dp) bu sınırın ALTINDA kaldığı için telefonda hiçbir şey değişmez;
 * 7"/10" tablette içerik ortalanır, kenarlarda boşluk kalır (standart tablet düzeni).
 */
const DEFAULT_MAX_WIDTH = 600;

export type ScreenProps = {
  children: React.ReactNode;
  /** içeriği dikey/yatay ortala */
  center?: boolean;
  style?: ViewStyle;
  edges?: readonly Edge[];
  /** İçerik sütunu üst genişlik sınırı (tablet ortalaması). Varsayılan 600. */
  maxWidth?: number;
  /** true → genişlik sınırı yok (grafik/tam-en gerektiren ekranlar, ör. dashboard). */
  fluid?: boolean;
};

/** SafeArea + tema-farkındalıklı arka plan sarmalayıcı. */
export function Screen({
  children,
  center = false,
  style,
  edges,
  maxWidth = DEFAULT_MAX_WIDTH,
  fluid = false,
}: ScreenProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={edges}>
        {/* Çevrimdışı şeridi her ekranın en üstünde (Part 13.5). center prop'undan etkilenmesin. */}
        <OfflineBanner />
        <View
          style={[
            styles.content,
            center && styles.center,
            !fluid && { maxWidth, width: '100%', alignSelf: 'center' },
            style,
          ]}
        >
          {children}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
