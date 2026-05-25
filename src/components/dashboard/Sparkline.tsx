import Svg, { Path } from 'react-native-svg';

export type SparklineProps = {
  /** SVG path d (viewBox 0 0 200 40) */
  d: string;
  color: string;
  height?: number;
};

/** Gelir/gider kartlarındaki dekoratif sparkline (design path'leri, viewBox 0 0 200 40). */
export function Sparkline({ d, color, height = 48 }: SparklineProps) {
  return (
    <Svg width="100%" height={height} viewBox="0 0 200 40" preserveAspectRatio="none">
      <Path d={d} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** design HTML'deki sabit path'ler */
export const SPARKLINE_INCOME = 'M0,35 Q20,30 40,32 T80,15 T120,25 T160,5 T200,10';
export const SPARKLINE_EXPENSE = 'M0,10 Q20,15 40,5 T80,25 T120,20 T160,35 T200,30';
