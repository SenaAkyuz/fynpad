import { LogBox } from 'react-native';

/**
 * expo-notifications SDK 53+ Expo Go'da remote push'u DESTEKLEMİYOR; paket import edilince
 * kendi içinden bir uyarı basıyor (bizim kodumuzda token çağrısı YOK — sadece local scheduled
 * notification kullanıyoruz, brief 4.4 için yeterli). Dev/Expo Go'da LogBox'ı tetikleyip kırmızı
 * ekran gösteriyordu. Bu suppress YALNIZCA dev içindir (LogBox dev-only); production EAS Build'de
 * uyarı zaten görünmez, suppress'in etkisi olmaz.
 *
 * Bu modül `_layout.tsx`'in İLK import'u olmalı: Babel import'ları hoist ettiği için suppress'in
 * `expo-notifications` require'ından önce çalışmasını ancak ayrı/önce-yüklenen bir modül garanti eder.
 */
LogBox.ignoreLogs([
  /expo-notifications: Android Push notifications.*Expo Go/,
  /expo-notifications.*was removed from Expo Go/,
  // Offline mod (Part 13.5): mutation'lar 'online' networkMode ile paused olur, ama bağlantı
  // tam kopmadan (zayıf sinyal) fırlatılan Supabase fetch hataları yine de dev'de kırmızı overlay
  // tetikleyebilir. Bu suppress YALNIZCA dev içindir; gerçek hata UI'ı (toast/inline) çalışmaya devam eder.
  /TypeError: Network request failed/,
  /Network request failed/,
]);
