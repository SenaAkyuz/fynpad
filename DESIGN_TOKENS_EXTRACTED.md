# FynPad — Design Tokens (Extracted)

> Kaynak tasarım: `C:\Users\Monster\Downloads\stitch_modern_wealth_manager` ("Lumina Wealth").
> Uygulama adı her yerde **FynPad** ile değiştirildi; bu doküman yalnızca renk/ölçü tokenlarını taşır.
> Light tokenlar `lumina_wealth/DESIGN.md` YAML'inden **aynen** alındı. Dark tokenlar `*_1` HTML
> dosyalarının inline `<style>` bloklarından çıkarıldı; eşleşmeyenler MD3 dark tonal mantığıyla türetilip
> "Dark mode — inferred" altında işaretlendi.

---

## Light mode colors (DESIGN.md YAML — aynen)

```yaml
surface: '#f8f9fc'
surface-dim: '#d9dadd'
surface-bright: '#f8f9fc'
surface-container-lowest: '#ffffff'
surface-container-low: '#f2f3f6'
surface-container: '#edeef1'
surface-container-high: '#e7e8eb'
surface-container-highest: '#e1e2e5'
on-surface: '#191c1e'
on-surface-variant: '#494454'
inverse-surface: '#2e3133'
inverse-on-surface: '#f0f1f4'
outline: '#7b7486'
outline-variant: '#cbc3d7'
surface-tint: '#6d3bd7'
primary: '#6b38d4'
on-primary: '#ffffff'
primary-container: '#8455ef'
on-primary-container: '#fffbff'
inverse-primary: '#d0bcff'
secondary: '#006c49'           # Success / income (Emerald)
on-secondary: '#ffffff'
secondary-container: '#6cf8bb'
on-secondary-container: '#00714d'
tertiary: '#b90538'            # Danger / expense (Coral)
on-tertiary: '#ffffff'
tertiary-container: '#dc2c4f'
on-tertiary-container: '#fffbff'
error: '#ba1a1a'
on-error: '#ffffff'
error-container: '#ffdad6'
on-error-container: '#93000a'
primary-fixed: '#e9ddff'
primary-fixed-dim: '#d0bcff'
on-primary-fixed: '#23005c'
on-primary-fixed-variant: '#5516be'
secondary-fixed: '#6ffbbe'
secondary-fixed-dim: '#4edea3'
on-secondary-fixed: '#002113'
on-secondary-fixed-variant: '#005236'
tertiary-fixed: '#ffdadb'
tertiary-fixed-dim: '#ffb2b7'
on-tertiary-fixed: '#40000d'
on-tertiary-fixed-variant: '#92002a'
background: '#f8f9fc'
on-background: '#191c1e'
surface-variant: '#e1e2e5'
```

**Light glass / surface anlık değerleri** (`quick_add_transaction_2/code.html` `.premium-card` ve header):
- premium-card bg: `#ffffff`, border `#e1e2e5`, shadow `0 4px 20px rgba(0,0,0,0.05)`
- header (light): `bg-white/80` + `backdrop-blur-xl` + border `surface-container-high (#e7e8eb)`
- segmented-active (light): bg `#ffffff`, shadow `0px 2px 8px rgba(0,0,0,0.1)`

---

## Dark mode colors — extracted (from `*_1` HTML `<style>` blocks)

Tüm `_1` dosyaları (dashboard_overview_1, advanced_analytics_1, financial_goals_1,
quick_add_transaction_1, subscription_manager_1) **aynı** dark temel değerleri kullanıyor:

| Token | Değer | Kaynak |
|---|---|---|
| background / surface (body bg) | `#0b1326` | dashboard_overview_1 (yorum: `/* surface-dim */`), subscription_manager_1, advanced_analytics_1, financial_goals_1 |
| on-surface (body text) | `#dae2fd` | dashboard_overview_1, advanced_analytics_1, financial_goals_1 |
| glass-card bg | `rgba(30, 41, 59, 0.6)` (slate-800 / `#1e293b` @ %60) | tüm `_1` dosyaları |
| glass-card border | `rgba(255, 255, 255, 0.15)` | tüm `_1` dosyaları |
| accent / chart glow | `rgba(208, 188, 255, 0.2–0.3)` (= inverse-primary `#d0bcff`) | dashboard_overview_1 (`.glow-primary`), financial_goals_1, subscription_manager_1, advanced_analytics_1 |
| segmented-active (dark) | bg `rgba(255,255,255,0.1)`, shadow `0px 4px 12px rgba(0,0,0,0.3)` | quick_add_transaction_1 |
| bottom-nav floating shadow (dark) | `0px 10px 30px rgba(0,0,0,0.5)` | dashboard_overview_1 nav |
| active nav dot | `#d0bcff` | financial_goals_1 (`.active-indicator::after`) |
| primary (buttons/active) | `#6b38d4` (tailwind config — tüm dosyalarda ortak) | tailwind-config |

> Not: Tüm `_1` ve `_2` HTML dosyaları **aynı** tailwind `colors` paletini (yukarıdaki light YAML)
> taşıyor; dark/light farkı yalnızca body bg, glass-card ve metin renklerinin inline `<style>`
> ile override edilmesinden geliyor. Yani brand renkleri (primary/secondary/tertiary) iki temada da
> aynı hue; dark modda zemin koyulaşıyor.

### Dark mode — inferred (MD3 dark tonal, HTML'de doğrudan yok)

Aşağıdakiler `_1` HTML'lerinde açık değer olarak yoktu; navy/slate ailesi + MD3 dark mantığıyla türetildi
(zemin `#0b1326`, glass `#1e293b` ailesine uyumlu). Ekran görüntüleri (dashboard_overview_1/screen.png)
ile görsel olarak doğrulandı: parlak violet bakiye, parlak emerald gelir, parlak coral gider.

| Token | Inferred değer | Gerekçe |
|---|---|---|
| surfaceContainerLowest | `#0b1326` | en koyu zemin = background |
| surfaceContainerLow | `#141d33` | nav `bg-surface-container-low/60` koyu eşleniği |
| surfaceContainer | `#1e293b` | glass-card opak tabanı (slate-800) |
| surfaceContainerHigh | `#27324a` | tonal bir basamak üstü |
| surfaceContainerHighest | `#313c56` | ikon kutusu / chip zemini |
| surfaceVariant | `#27324a` | container-high ile aynı tonal seviye |
| surfaceDim | `#070d1c` | background'tan bir tık koyu |
| surfaceBright | `#1e293b` | glass taban |
| onSurfaceVariant | `#aab4d4` | `#dae2fd` metnin düşük-vurgu eşleniği (HTML opacity ile yapıyordu) |
| outline | `#8a93b2` | navy üzerinde okunur nötr kenar |
| outlineVariant | `#3a455f` | düşük-vurgu ayraç |
| primary (dark) | `#8455ef` | screenshot'taki parlak violet bakiye (= light primary-container); buton kontrastı için yükseltildi |
| onPrimary | `#ffffff` | — |
| primaryContainer | `#5516be` | on-primary-fixed-variant tonu |
| secondary (dark income) | `#4edea3` | screenshot parlak emerald (= light secondary-fixed-dim) |
| onSecondary | `#002113` | — |
| tertiary (dark expense) | `#ffb2b7` | screenshot parlak coral (= light tertiary-fixed-dim) |
| onTertiary | `#40000d` | — |
| error (dark) | `#ffb4ab` | MD3 dark error standardı |
| onError | `#690005` | MD3 dark |
| inverseSurface | `#dae2fd` | dark'ın açık eşleniği |
| inverseOnSurface | `#2e3133` | — |
| inversePrimary | `#6b38d4` | light primary |

> Bu inferred accent değerleri **yalnızca dark modda** kullanılır. Brand kimliği korunur (aynı hue
> ailesi), yalnızca koyu zeminde okunabilirlik için MD3 dark tonuna yükseltilir.

---

## Typography (DESIGN.md YAML — aynen)

| Variant | Font | Size | Weight | LineHeight | LetterSpacing |
|---|---|---|---|---|---|
| headline-xl | Inter | 40 | 800 | 48 | -0.02em (≈ -0.8pt) |
| headline-xl-mobile | Inter | 32 | 800 | 40 | (-0.02em ≈ -0.64pt) |
| headline-lg | Inter | 32 | 700 | 40 | -0.02em (≈ -0.64pt) |
| headline-md | Inter | 24 | 600 | 32 | — |
| headline-sm | Inter | 20 | 600 | 28 | — |
| body-lg | Inter | 18 | 400 | 28 | — |
| body-md | Inter | 16 | 400 | 24 | — |
| label-md | Inter | 14 | 600 | 20 | 0.01em (≈ 0.14pt) |
| label-sm | Inter | 12 | 500 | 16 | — |

`letterSpacing` `em` → React Native point dönüşümü: `fontSize * em`. (`40 * -0.02 = -0.8`)

---

## Spacing (DESIGN.md YAML)

```
base: 8 | container-margin: 24 | gutter: 16 | stack-sm: 12 | stack-md: 24 | stack-lg: 40
```
Numerik scale: `xs:4 sm:8 md:12 lg:16 xl:24 2xl:32 3xl:40 4xl:48`

## Border radii (DESIGN.md YAML)

```
sm: 4 | DEFAULT: 8 | md: 12 (buttons, inputs) | lg: 16 | xl: 24 (cards) | full: 9999
```

## Glassmorphism (DESIGN.md prose)

```
Glass card (light):
  background:      rgba(255, 255, 255, 0.7)
  backdrop-filter: blur(20px)
  border:          1px solid rgba(255, 255, 255, 0.5)   (top + left)
  border-radius:   24px (xl)
Glass card (dark, HTML'den):
  background:      rgba(30, 41, 59, 0.6)
  border:          1px solid rgba(255, 255, 255, 0.15)  (top + left)
```

## Shadows

```
Floating layer (modal, bottom nav) — light:  0px 10px 30px rgba(15, 23, 42, 0.08)
Floating layer — dark (HTML):                 0px 10px 30px rgba(0, 0, 0, 0.5)
Primary button outer glow:                    primary (#6b38d4 / dark #d0bcff) @ 15–20% opacity, blur 20px
```

---

## Ambiguities

1. **Background renk tutarsızlığı (çözüldü → YAML kazandı).** DESIGN.md prose `background: Soft Grey #f5f6f9`
   diyor, ama YAML `background: #f8f9fc` veriyor. Kural gereği YAML kazanır → `#f8f9fc` kullanıldı.
2. **Dark accent renkleri (inferred).** HTML tailwind config'i dark/light için aynı brand renklerini
   tutuyor (primary `#6b38d4` vb.), ama bunlar `#0b1326` zemininde düşük kontrast. Screenshot
   (dashboard_overview_1) parlak violet/emerald/coral gösteriyor → dark accent'ler light'ın `*-container` /
   `*-fixed-dim` tonlarına yükseltildi. Brand hue korundu. Karar gerekirse kullanıcıya açık.
3. **Dark surface tonal basamakları (inferred).** HTML yalnızca `#0b1326` (zemin) ve `#1e293b` (glass)
   veriyor; aradaki container basamakları (`surfaceContainerLow/High/Highest`) navy/slate ailesinden türetildi.
4. **`#0b1326` etiketi.** dashboard_overview_1 yorumu bunu `surface-dim` diye etiketliyor ama gerçekte body
   `background`/`surface` olarak kullanılıyor. Foundation'da `background = surface = #0b1326` alındı.
5. **expo-blur Android.** GlassCard `BlurView` Android'de zayıf blur verebilir; fallback yarı-saydam solid
   bg + ince border (komponentte not düşüldü).

---

## Stack port notu (önemli)

Brief Expo SDK 52+ varsayıyordu; `create-expo-app@latest` **SDK 56** kurdu (React 19.2, RN 0.85,
expo-router 56). Default template **`src/` tabanlı** (rotalar `src/app`, alias `@/* → ./src/*`).
Brief'in kök-tabanlı klasör planı (`app/`, `components/`, `theme/` …) bu yüzden **`src/` altına** taşındı:
`src/app`, `src/components/ui`, `src/theme`, `src/lib`, `src/stores`, `src/locales`, `src/types`.
İçerik/davranış brief ile bire bir; yalnızca kök yol `src/` öneki kazandı. `newArchEnabled` SDK 56'da
varsayılan açık (app.json'a eklemeye gerek yok). Demo template dosyaları (explore, animated-icon,
app-tabs, hint-row, themed-*, web-badge, collapsible, constants/theme.ts) temizlendi.

---

## Auth screens — referenced HTML files (Part 2)

Tasarım klasöründe (`stitch_modern_wealth_manager`) **auth ekranı YOK**. Tüm `.html` dosyaları
isim + içerik bazında tarandı (login/signin/register/signup/forgot/reset/password/email anahtarları → **0 eşleşme**).
Mevcut dosyalar yalnızca uygulama-içi ekranlar: dashboard_overview, advanced_analytics, financial_goals,
quick_add_transaction, subscription_manager, lumina_wealth_management_flow (= bir Overview ekranı daha).

**Karar (kullanıcı onayı ile):** Login / Register / Forgot Password / Reset Password ekranları
**sistem içi tasarlandı** — kaynak HTML yok. Kullanılan tasarım dili:
- Glassmorphism `GlassCard` (mevcut token'lar), Electric Violet primary buton.
- Inputlar DESIGN.md "Input Fields" tanımına göre: yalnızca alt border, focus'ta Electric Violet'e döner,
  sol slot nötr rengin %40 opaklığında, sağ slot password göster/gizle.
- `label-sm` üst etiket, `body-md` input metni, mevcut tipografi/spacing/radius token'ları.
- Renk/font/spacing değerleri Part 1 token setinden; **yeni tasarım değeri uydurulmadı**.

> Forgot/Reset ekranları da kaynak HTML olmadığından same-style tasarlandı (prompt bunu açıkça izin veriyor).
> İkon kütüphanesi kurulmadı (paket listesinde yok); input password toggle'ı Unicode glyph ile,
> diğer ikon slotları opsiyonel `ReactNode` olarak bırakıldı.

---

## Lock & PIN screens — designed in-system, no source HTML (Part 3)

Tasarım klasöründe lock/PIN ekranı **yok**. Cihaz kilidi ekranları (LockScreen overlay,
pin-setup route, PinDots, PinKeypad) Part 1 token setiyle **sistem içi** tasarlandı; yeni renk,
spacing veya tipografi değeri uydurulmadı. Kullanılan token'lar:

- **Wordmark / başlık:** `Logo` → `typography.headlineLg` (32/700) `colors.primary`. Stage başlıkları
  `headlineMd`, alt metinler `bodyMd` + `colors.onSurfaceVariant`.
- **PIN dots:** 14px daire, `radii.full`. Boş = 2px `colors.outline` border; dolu = `colors.primary`
  dolgu; hata = `colors.error`. Yatay aralık `spacing.lg` (16). Hata shake'i RN `Animated.sequence`
  (reanimated worklet riskinden kaçınmak için core Animated).
- **Keypad butonları:** 72px daire (`radii.full`), bg `colors.surfaceContainerHigh`, basışta
  scale 0.95 + bg `colors.surfaceContainerHighest`, `opacity 0.9`. Rakam metni `headlineMd` weight 600
  `colors.onSurface`. Satır/sütun boşluğu 16/24. Her basışta `Haptics.impactAsync(Light)`.
- **Bio + Delete ikonları:** ikon kütüphanesi yok → delete `⌫` Unicode glyph (`colors.onSurfaceVariant`),
  biyometrik üç iç içe kemerden (bordered View) çizilen parmak-izi benzeri ikon, `stroke 1.5`,
  `colors.onSurfaceVariant`. pin-setup'taki büyük stage ikonları daire (`color + "1f"` alfa dolgu) içinde.
- **Accent glow:** LockScreen üstünde `colors.primary` @ `opacity 0.12` yumuşak daire — DESIGN.md
  "Accent Glows" prensibinden, abartısız.
- **Toggle (settings):** RN `Switch`, track `colors.primary` (açık) / `surfaceContainerHighest` (kapalı),
  thumb `colors.onPrimary`.
- **Arka plan:** `colors.background` (light `#f8f9fc`, dark `#0b1326`). Safe-area top+60 / bottom+24.
- Tüm ekranlar Light + Dark token'ları üzerinden çalışır (hardcode renk yok).

---

## Dashboard Overview — section breakdown (Part 4)

Kaynak: `dashboard_overview_2/code.html` (light) + `dashboard_overview_1/code.html` (dark) + `screen.png`'ler.
"Lumina Wealth" → **FynPad**. Brief vs design çelişkisi kuralı (clarifications): **brief NE'yi, design NASIL'ı** söyler.

**Layout sırası (üstten alta):**
1. **Header** (fixed bar): sol 40px avatar (initials, `primaryContainer`), orta "FynPad" (`headlineMd`/800), sağ `bell` ikonu (`primary`). Greeting YOK.
2. **Total Net Worth kartı** — `GlassCard` glow. `label-md` `onSurfaceVariant` etiket → metin "Toplam Net Değer/Total Net Worth" (design metni, Q3). `headline-xl-mobile` (32/800) `primary` rakam. Trend chip: `trending-up`/`arrow-down` + `±%` (`secondary`/`tertiary`).
3. **Gelir & Gider** — mobilde DİKEY istif (HTML `grid-cols-1`), iki `GlassCard` (min-h 150). label + arrow (income `arrow-down`/secondary, expense `arrow-up`/tertiary), `headline-md` renkli rakam, altında **sparkline** (svg path, stroke 2.5).
4. **Period seçici** — brief'e göre (madde 4.5) **D/H/A/Y SegmentedControl** (design'daki "July 2024" ay-dropdown'u yerine; brief NE'yi belirler). Recessed `surfaceContainer` track + `surfaceContainerHighest` floating tile (reanimated slide).
5. **Spending Insights / Harcama Dağılımı** — `GlassCard`. `headline-sm` başlık. **DonutChart** (`react-native-svg`, viewBox kontinüöz halka, butt linecap, strokeWidth 18, size 184) — sadece expense, top-5 + "Diğer". Orta: "Toplam" + compact tutar. Legend: dot(12px)+isim(`body-md`)+tutar(`label-md`).
6. **Recent Activity / Son İşlemler** — başlık + "Tümünü gör" (`primary`, no-op). Item: nötr 40px `surfaceContainerHigh` kare + kategori ikonu (`onSurfaceVariant`), note(`label-md`)+altsatır(kategori•tarih `label-sm`), sağda işaretli tutar (income `secondary` +, expense `tertiary` -).
7. **FAB:** ayrı yok — design'da "Ekle" bottom nav'a entegre (yükseltilmiş primary daire).
8. **Bottom nav (CustomTabBar):** floating glass pill, kenarlardan 24px, `radii.full`, blur+`glassBackground`, `shadows.floating`. 5 öğe (brief Q2): **Dashboard·Abonelikler·[+Ekle]·Analiz·Ayarlar** (Goals YOK, v1.2). Aktif: `primary` + 4px nokta; inaktif `onSurfaceVariant`. Orta Ekle: `primary` daire `-28` margin-top, `plus`/`onPrimary`, primaryGlow.

**Ölçüler:** section arası `stack-md` (24), container margin 24, card iç padding 24 (`GlassCard`), glass radius 24 (`radii.xl`), transaction kart radius 16, ikon tab 24px / kategori 20px. **Renkler:** genel `background`; kartlar `GlassCard` (light `#fff`+border, dark `rgba(30,41,59,.6)`+blur); metin `onSurface`/`onSurfaceVariant`; vurgular `primary`/`secondary`(income)/`tertiary`(expense).

**İkonlar:** ikon kütüphanesi YOK → `react-native-svg` ile Feather-stili line-art inline (`Icon.tsx`): home, credit-card, plus, bar-chart, settings, bell, trending-up, arrow-up/down, briefcase, edit-3, shopping-bag, navigation, coffee, repeat, more-horizontal.

**Caveat'ler:** (a) period selector design'da ay-dropdown'u; brief gereği D/H/A/Y segmented yapıldı. (b) "Total Net Worth" period-net (income−expense) gösterir, dönemle değişir (Q4). (c) donut renkleri kategori paletinden gelir (design'ın sabit primary/secondary/tertiary üçlüsü değil). (d) transaction kartları perf için solid (GlassCard blur değil). (e) sparkline'lar dekoratif sabit path (gerçek veri değil).
