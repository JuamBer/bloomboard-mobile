import Svg, { Circle, Path, Rect } from 'react-native-svg';

// The social networks' marks, drawn the way lucide drew them (24×24, round
// 2px strokes) before it dropped brand icons — so they sit beside the app's
// other icons. One colour, the row's.

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const stroke = ({ color = 'currentColor', strokeWidth = 2 }: IconProps) => ({
  fill: 'none',
  stroke: color,
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function InstagramIcon(props: IconProps) {
  const s = stroke(props);
  return (
    <Svg width={props.size ?? 24} height={props.size ?? 24} viewBox="0 0 24 24">
      <Rect x={2} y={2} width={20} height={20} rx={5} ry={5} {...s} />
      <Circle cx={12} cy={12} r={4} {...s} />
      <Path d="M17.5 6.5h.01" {...s} />
    </Svg>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <Svg width={props.size ?? 24} height={props.size ?? 24} viewBox="0 0 24 24">
      <Path
        d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"
        {...stroke(props)}
      />
    </Svg>
  );
}

export function LinkedinIcon(props: IconProps) {
  const s = stroke(props);
  return (
    <Svg width={props.size ?? 24} height={props.size ?? 24} viewBox="0 0 24 24">
      <Path
        d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"
        {...s}
      />
      <Rect x={2} y={9} width={4} height={12} {...s} />
      <Circle cx={4} cy={4} r={2} {...s} />
    </Svg>
  );
}
