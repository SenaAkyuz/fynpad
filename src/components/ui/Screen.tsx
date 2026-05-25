import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/useTheme';

export type ScreenProps = {
  children: React.ReactNode;
  /** içeriği dikey/yatay ortala */
  center?: boolean;
  style?: ViewStyle;
  edges?: readonly Edge[];
};

/** SafeArea + tema-farkındalıklı arka plan sarmalayıcı. */
export function Screen({ children, center = false, style, edges }: ScreenProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaView style={[styles.safe, center && styles.center, style]} edges={edges}>
        {children}
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
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
