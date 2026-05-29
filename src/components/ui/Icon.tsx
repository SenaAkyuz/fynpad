import type { ReactNode } from 'react';
import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';

/**
 * İkon kütüphanesi (paket listesinde) YOK — Feather/Lucide stili line-art ikonlar
 * react-native-svg ile inline çizilir (DESIGN.md: 1.5px stroke line-art).
 * viewBox 0 0 24 24, stroke = color, fill yok, round cap/join.
 */
export type IconName =
  | 'home'
  | 'credit-card'
  | 'plus'
  | 'bar-chart'
  | 'settings'
  | 'bell'
  | 'trending-up'
  | 'trending-down'
  | 'arrow-down'
  | 'arrow-up'
  | 'arrow-up-right'
  | 'briefcase'
  | 'edit-3'
  | 'shopping-bag'
  | 'shopping-cart'
  | 'navigation'
  | 'coffee'
  | 'repeat'
  | 'more-horizontal'
  | 'x'
  | 'check'
  | 'chevron-left'
  | 'chevron-right'
  | 'trash-2'
  | 'calendar'
  | 'heart'
  | 'gift'
  | 'dollar-sign'
  | 'film'
  | 'music'
  | 'book'
  | 'smartphone'
  | 'zap'
  | 'droplet'
  | 'truck'
  | 'tag'
  | 'activity'
  | 'award'
  | 'lock'
  | 'tv'
  | 'cloud'
  | 'gamepad'
  | 'file-text'
  | 'alert-triangle'
  | 'rotate-ccw'
  | 'user'
  | 'globe'
  | 'sun'
  | 'shield'
  | 'download'
  | 'info'
  | 'wifi-off'
  | 'target'
  | 'plane'
  | 'car'
  | 'graduation-cap'
  | 'piggy-bank'
  | 'star'
  | 'log-out';

export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

type Stroke = {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: 'round';
  strokeLinejoin: 'round';
  fill: 'none';
};

const ICONS: Record<IconName, (s: Stroke, color: string) => ReactNode> = {
  home: (s) => (
    <>
      <Path {...s} d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Polyline {...s} points="9 22 9 12 15 12 15 22" />
    </>
  ),
  'credit-card': (s) => (
    <>
      <Rect {...s} x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <Line {...s} x1="1" y1="10" x2="23" y2="10" />
    </>
  ),
  plus: (s) => (
    <>
      <Line {...s} x1="12" y1="5" x2="12" y2="19" />
      <Line {...s} x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  'bar-chart': (s) => (
    <>
      <Line {...s} x1="18" y1="20" x2="18" y2="10" />
      <Line {...s} x1="12" y1="20" x2="12" y2="4" />
      <Line {...s} x1="6" y1="20" x2="6" y2="14" />
    </>
  ),
  settings: (s) => (
    <>
      <Circle {...s} cx="12" cy="12" r="3" />
      <Path
        {...s}
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
      />
    </>
  ),
  bell: (s) => (
    <>
      <Path {...s} d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path {...s} d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>
  ),
  'trending-up': (s) => (
    <>
      <Polyline {...s} points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <Polyline {...s} points="17 6 23 6 23 12" />
    </>
  ),
  'trending-down': (s) => (
    <>
      <Polyline {...s} points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <Polyline {...s} points="17 18 23 18 23 12" />
    </>
  ),
  'arrow-down': (s) => (
    <>
      <Line {...s} x1="12" y1="5" x2="12" y2="19" />
      <Polyline {...s} points="19 12 12 19 5 12" />
    </>
  ),
  'arrow-up': (s) => (
    <>
      <Line {...s} x1="12" y1="19" x2="12" y2="5" />
      <Polyline {...s} points="5 12 12 5 19 12" />
    </>
  ),
  'arrow-up-right': (s) => (
    <>
      <Line {...s} x1="7" y1="17" x2="17" y2="7" />
      <Polyline {...s} points="7 7 17 7 17 17" />
    </>
  ),
  briefcase: (s) => (
    <>
      <Rect {...s} x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <Path {...s} d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </>
  ),
  'edit-3': (s) => (
    <>
      <Path {...s} d="M12 20h9" />
      <Path {...s} d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </>
  ),
  'shopping-bag': (s) => (
    <>
      <Path {...s} d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <Line {...s} x1="3" y1="6" x2="21" y2="6" />
      <Path {...s} d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  navigation: (s) => <Polygon {...s} points="3 11 22 2 13 21 11 13 3 11" />,
  coffee: (s) => (
    <>
      <Path {...s} d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <Path {...s} d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <Line {...s} x1="6" y1="1" x2="6" y2="4" />
      <Line {...s} x1="10" y1="1" x2="10" y2="4" />
      <Line {...s} x1="14" y1="1" x2="14" y2="4" />
    </>
  ),
  repeat: (s) => (
    <>
      <Polyline {...s} points="17 1 21 5 17 9" />
      <Path {...s} d="M3 11V9a4 4 0 0 1 4-4h14" />
      <Polyline {...s} points="7 23 3 19 7 15" />
      <Path {...s} d="M21 13v2a4 4 0 0 1-4 4H3" />
    </>
  ),
  'more-horizontal': (_s, color) => (
    <>
      <Circle cx="12" cy="12" r="1.6" fill={color} />
      <Circle cx="19" cy="12" r="1.6" fill={color} />
      <Circle cx="5" cy="12" r="1.6" fill={color} />
    </>
  ),
  'shopping-cart': (s) => (
    <>
      <Circle {...s} cx="9" cy="21" r="1" />
      <Circle {...s} cx="20" cy="21" r="1" />
      <Path {...s} d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </>
  ),
  x: (s) => (
    <>
      <Line {...s} x1="18" y1="6" x2="6" y2="18" />
      <Line {...s} x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  check: (s) => <Polyline {...s} points="20 6 9 17 4 12" />,
  'chevron-left': (s) => <Polyline {...s} points="15 18 9 12 15 6" />,
  'chevron-right': (s) => <Polyline {...s} points="9 18 15 12 9 6" />,
  'trash-2': (s) => (
    <>
      <Polyline {...s} points="3 6 5 6 21 6" />
      <Path {...s} d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <Line {...s} x1="10" y1="11" x2="10" y2="17" />
      <Line {...s} x1="14" y1="11" x2="14" y2="17" />
    </>
  ),
  calendar: (s) => (
    <>
      <Rect {...s} x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <Line {...s} x1="16" y1="2" x2="16" y2="6" />
      <Line {...s} x1="8" y1="2" x2="8" y2="6" />
      <Line {...s} x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  heart: (s) => (
    <Path
      {...s}
      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
    />
  ),
  gift: (s) => (
    <>
      <Polyline {...s} points="20 12 20 22 4 22 4 12" />
      <Rect {...s} x="2" y="7" width="20" height="5" />
      <Line {...s} x1="12" y1="22" x2="12" y2="7" />
      <Path {...s} d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <Path {...s} d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </>
  ),
  'dollar-sign': (s) => (
    <>
      <Line {...s} x1="12" y1="1" x2="12" y2="23" />
      <Path {...s} d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </>
  ),
  film: (s) => (
    <>
      <Rect {...s} x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
      <Line {...s} x1="7" y1="2" x2="7" y2="22" />
      <Line {...s} x1="17" y1="2" x2="17" y2="22" />
      <Line {...s} x1="2" y1="12" x2="22" y2="12" />
      <Line {...s} x1="2" y1="7" x2="7" y2="7" />
      <Line {...s} x1="2" y1="17" x2="7" y2="17" />
      <Line {...s} x1="17" y1="17" x2="22" y2="17" />
      <Line {...s} x1="17" y1="7" x2="22" y2="7" />
    </>
  ),
  music: (s) => (
    <>
      <Path {...s} d="M9 18V5l12-2v13" />
      <Circle {...s} cx="6" cy="18" r="3" />
      <Circle {...s} cx="18" cy="16" r="3" />
    </>
  ),
  book: (s) => (
    <>
      <Path {...s} d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <Path {...s} d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </>
  ),
  smartphone: (s) => (
    <>
      <Rect {...s} x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <Line {...s} x1="12" y1="18" x2="12.01" y2="18" />
    </>
  ),
  zap: (s) => <Polygon {...s} points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  droplet: (s) => <Path {...s} d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />,
  truck: (s) => (
    <>
      <Rect {...s} x="1" y="3" width="15" height="13" />
      <Polygon {...s} points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <Circle {...s} cx="5.5" cy="18.5" r="2.5" />
      <Circle {...s} cx="18.5" cy="18.5" r="2.5" />
    </>
  ),
  tag: (s) => (
    <>
      <Path {...s} d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <Line {...s} x1="7" y1="7" x2="7.01" y2="7" />
    </>
  ),
  activity: (s) => <Polyline {...s} points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  award: (s) => (
    <>
      <Circle {...s} cx="12" cy="8" r="7" />
      <Polyline {...s} points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </>
  ),
  lock: (s) => (
    <>
      <Rect {...s} x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <Path {...s} d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  tv: (s) => (
    <>
      <Rect {...s} x="2" y="7" width="20" height="15" rx="2" ry="2" />
      <Polyline {...s} points="17 2 12 7 7 2" />
    </>
  ),
  cloud: (s) => <Path {...s} d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />,
  gamepad: (s) => (
    <>
      <Rect {...s} x="2" y="6" width="20" height="12" rx="3" ry="3" />
      <Line {...s} x1="6" y1="12" x2="10" y2="12" />
      <Line {...s} x1="8" y1="10" x2="8" y2="14" />
      <Line {...s} x1="15" y1="13" x2="15.01" y2="13" />
      <Line {...s} x1="18" y1="11" x2="18.01" y2="11" />
    </>
  ),
  'file-text': (s) => (
    <>
      <Path {...s} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <Polyline {...s} points="14 2 14 8 20 8" />
      <Line {...s} x1="16" y1="13" x2="8" y2="13" />
      <Line {...s} x1="16" y1="17" x2="8" y2="17" />
      <Polyline {...s} points="10 9 9 9 8 9" />
    </>
  ),
  'alert-triangle': (s) => (
    <>
      <Path {...s} d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <Line {...s} x1="12" y1="9" x2="12" y2="13" />
      <Line {...s} x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
  'rotate-ccw': (s) => (
    <>
      <Polyline {...s} points="1 4 1 10 7 10" />
      <Path {...s} d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </>
  ),
  user: (s) => (
    <>
      <Path {...s} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Circle {...s} cx="12" cy="7" r="4" />
    </>
  ),
  globe: (s) => (
    <>
      <Circle {...s} cx="12" cy="12" r="10" />
      <Line {...s} x1="2" y1="12" x2="22" y2="12" />
      <Path {...s} d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>
  ),
  sun: (s) => (
    <>
      <Circle {...s} cx="12" cy="12" r="5" />
      <Line {...s} x1="12" y1="1" x2="12" y2="3" />
      <Line {...s} x1="12" y1="21" x2="12" y2="23" />
      <Line {...s} x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <Line {...s} x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <Line {...s} x1="1" y1="12" x2="3" y2="12" />
      <Line {...s} x1="21" y1="12" x2="23" y2="12" />
      <Line {...s} x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <Line {...s} x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </>
  ),
  shield: (s) => <Path {...s} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  download: (s) => (
    <>
      <Path {...s} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <Polyline {...s} points="7 10 12 15 17 10" />
      <Line {...s} x1="12" y1="15" x2="12" y2="3" />
    </>
  ),
  info: (s) => (
    <>
      <Circle {...s} cx="12" cy="12" r="10" />
      <Line {...s} x1="12" y1="16" x2="12" y2="12" />
      <Line {...s} x1="12" y1="8" x2="12.01" y2="8" />
    </>
  ),
  'log-out': (s) => (
    <>
      <Path {...s} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <Polyline {...s} points="16 17 21 12 16 7" />
      <Line {...s} x1="21" y1="12" x2="9" y2="12" />
    </>
  ),
  plane: (s) => (
    <Path
      {...s}
      d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"
    />
  ),
  car: (s) => (
    <>
      <Path {...s} d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <Path {...s} d="M9 17h6" />
      <Circle {...s} cx="7" cy="17" r="2" />
      <Circle {...s} cx="17" cy="17" r="2" />
    </>
  ),
  'graduation-cap': (s) => (
    <>
      <Path {...s} d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <Path {...s} d="M6 12v5c3 3 9 3 12 0v-5" />
    </>
  ),
  'piggy-bank': (s) => (
    <>
      <Path {...s} d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z" />
      <Path {...s} d="M2 9v1c0 1.1.9 2 2 2h1" />
      <Path {...s} d="M16 11h.01" />
    </>
  ),
  star: (s) => (
    <Polygon
      {...s}
      points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
    />
  ),
  target: (s) => (
    <>
      <Circle {...s} cx="12" cy="12" r="10" />
      <Circle {...s} cx="12" cy="12" r="6" />
      <Circle {...s} cx="12" cy="12" r="2" />
    </>
  ),
  'wifi-off': (s) => (
    <>
      <Line {...s} x1="1" y1="1" x2="23" y2="23" />
      <Path {...s} d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <Path {...s} d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <Path {...s} d="M10.71 5.05A16 16 0 0 1 22.58 9" />
      <Path {...s} d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <Path {...s} d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <Line {...s} x1="12" y1="20" x2="12.01" y2="20" />
    </>
  ),
};

export function Icon({ name, size = 24, color = '#000000', strokeWidth = 2 }: IconProps) {
  const s: Stroke = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {ICONS[name](s, color)}
    </Svg>
  );
}
