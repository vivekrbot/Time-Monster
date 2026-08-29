import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import AlarmCheckIcon from '../components/AlarmCheckIcon';
import ArrowBackIcon from '../components/ArrowBackIcon';
import { RecapForest } from '../components/Forest';
import { formatClock } from '../format';
import { condensedDisplay, pctX, pctY } from '../layout';
import { treesForRecap } from '../state/forest';
import { colors, fonts } from '../theme';

const BORDER = 0.5;

type Props = {
  presetMinutes: number;
  remainingSeconds: number;
  isFullCompletion: boolean;
  elapsedSeconds: number;
  totalSeconds: number;
  wasStopped: boolean;
  onBack: () => void;
  onRepeat: () => void;
  onClose: () => void;
};

export default function TaskDoneScreen({
  presetMinutes,
  remainingSeconds,
  isFullCompletion,
  elapsedSeconds,
  totalSeconds,
  wasStopped,
  onBack,
  onRepeat,
  onClose,
}: Props) {
  const trees = treesForRecap(elapsedSeconds, totalSeconds, wasStopped);
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.canvas}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backButton}>
          <ArrowBackIcon size={32} />
        </Pressable>

        <Text style={styles.title}>Task Done !</Text>

        <View style={styles.alarmWrap}>
          <AlarmCheckIcon size={80} color={colors.ink} />
        </View>

        <Text style={styles.clock}>{formatClock(remainingSeconds)}</Text>

        <Text style={styles.caption}>{presetMinutes} min focus Timer - Completed.</Text>

        <Text style={styles.note}>
          {isFullCompletion
            ? 'Full session complete — monster tamed! 🎉'
            : 'Nice work — you still had time left on the clock.'}
        </Text>

        <View style={styles.forestWrap}>
          <RecapForest trees={trees} />
        </View>

        <View style={styles.mainButton}>
          <View style={styles.actionRow}>
            <Pressable style={styles.repeatCell} onPress={onRepeat}>
              <Text style={styles.repeatLabel}>Repeat</Text>
            </Pressable>
            <Pressable style={styles.closeCell} onPress={onClose}>
              <Text style={styles.closeLabel}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  canvas: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  backButton: {
    position: 'absolute',
    left: pctX(24),
    top: pctY(40),
    width: 32,
    height: 32,
  },
  title: {
    ...condensedDisplay,
    top: pctY(88),
    fontSize: 48,
    lineHeight: 64,
    color: colors.ink,
  },
  alarmWrap: {
    position: 'absolute',
    left: pctX(24),
    top: pctY(162),
    width: 80,
    height: 80,
  },
  clock: {
    ...condensedDisplay,
    top: pctY(252),
    fontSize: 96,
    lineHeight: 135,
    color: colors.ink,
  },
  caption: {
    position: 'absolute',
    left: pctX(24),
    top: pctY(387),
    fontFamily: fonts.hubotBold,
    fontSize: 16,
    lineHeight: 23,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  note: {
    position: 'absolute',
    left: pctX(24),
    top: pctY(415),
    width: pctX(345),
    fontFamily: fonts.hubotMedium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.14,
    color: colors.gray,
  },
  forestWrap: {
    position: 'absolute',
    left: pctX(24),
    top: pctY(465),
    width: pctX(345),
    bottom: 64,
  },
  mainButton: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 64,
  },
  repeatCell: {
    flex: 1,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: BORDER,
    borderColor: colors.ink,
  },
  repeatLabel: {
    fontFamily: fonts.hubotMedium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.14,
    textTransform: 'uppercase',
    color: '#313131',
  },
  closeCell: {
    flex: 1,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
    borderWidth: BORDER,
    borderColor: colors.ink,
  },
  closeLabel: {
    fontFamily: fonts.hubotMedium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.14,
    textTransform: 'uppercase',
    color: colors.mint,
  },
});
