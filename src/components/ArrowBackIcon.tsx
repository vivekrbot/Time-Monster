import Svg, { Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

// Material Symbols "arrow_back", matching the Figma arrow_back layer.
export default function ArrowBackIcon({ size = 32, color = '#1C1B1F' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill={color} />
    </Svg>
  );
}
