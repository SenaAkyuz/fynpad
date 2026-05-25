/**
 * FynPad design tokens.
 *
 * Light değerleri Lumina Wealth `DESIGN.md` YAML'inden AYNEN gelir.
 * Dark değerleri `*_1` HTML dosyalarından çıkarıldı; eşleşmeyenler MD3 dark tonal
 * mantığıyla türetildi. Tam köken ve gerekçe: ../../DESIGN_TOKENS_EXTRACTED.md
 */
import type { TextStyle } from 'react-native';

export const lightColors = {
  // surfaces
  background: '#f8f9fc',
  surface: '#f8f9fc',
  surfaceDim: '#d9dadd',
  surfaceBright: '#f8f9fc',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f2f3f6',
  surfaceContainer: '#edeef1',
  surfaceContainerHigh: '#e7e8eb',
  surfaceContainerHighest: '#e1e2e5',
  surfaceVariant: '#e1e2e5',
  surfaceTint: '#6d3bd7',
  inverseSurface: '#2e3133',
  inverseOnSurface: '#f0f1f4',

  // text on surfaces
  onBackground: '#191c1e',
  onSurface: '#191c1e',
  onSurfaceVariant: '#494454',

  // borders
  outline: '#7b7486',
  outlineVariant: '#cbc3d7',

  // primary (Electric Violet)
  primary: '#6b38d4',
  onPrimary: '#ffffff',
  primaryContainer: '#8455ef',
  onPrimaryContainer: '#fffbff',
  inversePrimary: '#d0bcff',
  primaryFixed: '#e9ddff',
  primaryFixedDim: '#d0bcff',
  onPrimaryFixed: '#23005c',
  onPrimaryFixedVariant: '#5516be',

  // secondary (Emerald — success / income)
  secondary: '#006c49',
  onSecondary: '#ffffff',
  secondaryContainer: '#6cf8bb',
  onSecondaryContainer: '#00714d',
  secondaryFixed: '#6ffbbe',
  secondaryFixedDim: '#4edea3',
  onSecondaryFixed: '#002113',
  onSecondaryFixedVariant: '#005236',

  // tertiary (Coral — danger / expense)
  tertiary: '#b90538',
  onTertiary: '#ffffff',
  tertiaryContainer: '#dc2c4f',
  onTertiaryContainer: '#fffbff',
  tertiaryFixed: '#ffdadb',
  tertiaryFixedDim: '#ffb2b7',
  onTertiaryFixed: '#40000d',
  onTertiaryFixedVariant: '#92002a',

  // error
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  // glass (DESIGN.md prose)
  glassBackground: 'rgba(255, 255, 255, 0.7)',
  glassBorder: 'rgba(255, 255, 255, 0.5)',
  // Floating bottom nav — blur Android'de zayıf, içerik geçmesin diye daha opak (~85%).
  glassBackgroundStrong: 'rgba(255, 255, 255, 0.85)',
} as const;

/** Renk değerleri string'e genişletilir ki dark paleti aynı şekle uysun. */
export type ThemeColors = { [K in keyof typeof lightColors]: string };

/**
 * Dark tokens — `_1` HTML'lerden çıkarılan değerler + MD3 dark inferred.
 * Aynı key isimleri korunur ki ThemeProvider iki paleti birebir değiştirebilsin.
 */
export const darkColors: ThemeColors = {
  // surfaces — body bg #0b1326, glass tabanı slate-800 (#1e293b)
  background: '#0b1326',
  surface: '#0b1326',
  surfaceDim: '#070d1c',
  surfaceBright: '#1e293b',
  surfaceContainerLowest: '#0b1326',
  surfaceContainerLow: '#141d33',
  surfaceContainer: '#1e293b',
  surfaceContainerHigh: '#27324a',
  surfaceContainerHighest: '#313c56',
  surfaceVariant: '#27324a',
  surfaceTint: '#d0bcff',
  inverseSurface: '#dae2fd',
  inverseOnSurface: '#2e3133',

  // text on surfaces — body text #dae2fd
  onBackground: '#dae2fd',
  onSurface: '#dae2fd',
  onSurfaceVariant: '#aab4d4',

  // borders
  outline: '#8a93b2',
  outlineVariant: '#3a455f',

  // primary — screenshot parlak violet (light primary-container tonuna yükseltildi)
  primary: '#8455ef',
  onPrimary: '#ffffff',
  primaryContainer: '#5516be',
  onPrimaryContainer: '#e9ddff',
  inversePrimary: '#6b38d4',
  primaryFixed: '#e9ddff',
  primaryFixedDim: '#d0bcff',
  onPrimaryFixed: '#23005c',
  onPrimaryFixedVariant: '#5516be',

  // secondary (income) — screenshot parlak emerald
  secondary: '#4edea3',
  onSecondary: '#002113',
  secondaryContainer: '#005236',
  onSecondaryContainer: '#6ffbbe',
  secondaryFixed: '#6ffbbe',
  secondaryFixedDim: '#4edea3',
  onSecondaryFixed: '#002113',
  onSecondaryFixedVariant: '#005236',

  // tertiary (expense) — screenshot parlak coral
  tertiary: '#ffb2b7',
  onTertiary: '#40000d',
  tertiaryContainer: '#92002a',
  onTertiaryContainer: '#ffdadb',
  tertiaryFixed: '#ffdadb',
  tertiaryFixedDim: '#ffb2b7',
  onTertiaryFixed: '#40000d',
  onTertiaryFixedVariant: '#92002a',

  // error — MD3 dark
  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',

  // glass (dark, HTML'den): rgba(30,41,59,0.6) + rgba(255,255,255,0.15)
  glassBackground: 'rgba(30, 41, 59, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.15)',
  // Floating bottom nav — blur Android'de zayıf, içerik geçmesin diye daha opak (~85%).
  glassBackgroundStrong: 'rgba(30, 41, 59, 0.85)',
};

export const typography = {
  headlineXl: { fontFamily: 'Inter_800ExtraBold', fontSize: 40, fontWeight: '800', lineHeight: 48, letterSpacing: -0.8 },
  headlineXlMobile: { fontFamily: 'Inter_800ExtraBold', fontSize: 32, fontWeight: '800', lineHeight: 40, letterSpacing: -0.64 },
  headlineLg: { fontFamily: 'Inter_700Bold', fontSize: 32, fontWeight: '700', lineHeight: 40, letterSpacing: -0.64 },
  headlineMd: { fontFamily: 'Inter_600SemiBold', fontSize: 24, fontWeight: '600', lineHeight: 32 },
  headlineSm: { fontFamily: 'Inter_600SemiBold', fontSize: 20, fontWeight: '600', lineHeight: 28 },
  bodyLg: { fontFamily: 'Inter_400Regular', fontSize: 18, fontWeight: '400', lineHeight: 28 },
  bodyMd: { fontFamily: 'Inter_400Regular', fontSize: 16, fontWeight: '400', lineHeight: 24 },
  labelMd: { fontFamily: 'Inter_600SemiBold', fontSize: 14, fontWeight: '600', lineHeight: 20, letterSpacing: 0.14 },
  labelSm: { fontFamily: 'Inter_500Medium', fontSize: 12, fontWeight: '500', lineHeight: 16 },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  // semantic aliases (DESIGN.md)
  base: 8,
  containerMargin: 24,
  gutter: 16,
  stackSm: 12,
  stackMd: 24,
  stackLg: 40,
} as const;

export const radii = {
  sm: 4,
  DEFAULT: 8,
  md: 12, // buttons, inputs
  lg: 16,
  xl: 24, // cards, primary containers
  full: 9999, // pills, chips
} as const;

export const shadows = {
  // 0px 10px 30px rgba(15, 23, 42, 0.08) (light) — dark için opacity nav'da artırılır
  floating: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 8,
  },
  // primary outer glow (#6b38d4 @ 15%)
  primaryGlow: {
    shadowColor: '#6b38d4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 0,
  },
} as const;

export const blur = {
  glass: 20, // expo-blur BlurView intensity (approx)
} as const;
