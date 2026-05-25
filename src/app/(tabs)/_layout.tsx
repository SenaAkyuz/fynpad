import { Tabs } from 'expo-router';

import { CustomTabBar } from '@/components/dashboard/CustomTabBar';

/**
 * Tab iskeleti (Part 4). Custom glass tab bar; sıra design'a göre
 * Dashboard · Abonelikler · [+Ekle] · Analiz · Ayarlar. Goals YOK (v1.2).
 */
export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="subscriptions" />
      <Tabs.Screen name="analytics" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
