import { Tabs } from 'expo-router';

import { CustomTabBar } from '@/components/dashboard/CustomTabBar';

/**
 * Tab iskeleti (Part 4). Custom glass tab bar; sıra tasarım canonical'ine göre
 * Dashboard · Analiz · [+Ekle] · Hedefler · Ayarlar. Abonelikler tab değil — stack
 * route'a taşındı (Settings → Abonelikler). Goals şimdilik placeholder (Part 14).
 */
export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="analytics" />
      <Tabs.Screen name="goals" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
