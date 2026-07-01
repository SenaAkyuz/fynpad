// Ağırlıkları paket kök index'inden değil alt-yol modüllerinden import ediyoruz:
// kök index tüm 18 ağırlığı (italic dahil) require ettiği için Metro hepsini
// bundle'a gömüyordu (~6.2 MB). Alt-yol import'u yalnızca kullanılan 5 TTF'i gömer.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';

/** Root layout'taki useFonts(fontMap) ile yüklenir. */
export const fontMap = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
};
