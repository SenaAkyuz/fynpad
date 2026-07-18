/**
 * Jest ortam kurulumu.
 *
 * Test edilen fonksiyonlar SAF (currency filtreleri, toplamlar, bütçe hesabı) fakat
 * import zincirleri lib/supabase'e kadar uzanıyor. Bu dosya o zincirin test ortamında
 * patlamaması için gereken en küçük sahte ortamı kurar — test edilen mantığa dokunmaz.
 */

// AsyncStorage native modülü Node ortamında yok; paketin resmî jest mock'u kullanılır.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// supabase.ts env yoksa modül yüklenirken throw ediyor. Testte gerçek ağ çağrısı
// yapılmadığı için sahte ama biçimsel olarak geçerli değerler yeterli.
process.env.EXPO_PUBLIC_SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';
