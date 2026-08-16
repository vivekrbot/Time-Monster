import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

type Props = {
  progress: number; // 0..1
  height?: number;
  fillColor?: string;
  trackColor?: string;
};

export default function ProgressBar({
  progress,
  height = 18,
  fillColor = colors.ink,
  trackColor = '#F5F5F5',
}: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.track, { height, backgroundColor: trackColor }]}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: fillColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
