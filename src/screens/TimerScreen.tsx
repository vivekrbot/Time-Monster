import { useCallback, useEffect, useRef } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import ArrowBackIcon from '../components/ArrowBackIcon';
import ProgressBar from '../components/ProgressBar';
import { formatClock } from '../format';
import { condensedDisplay, pctX, pctY } from '../layout';
import { cancelChime, ensureRung, scheduleChime, startTitleFlash, stopTitleFlash } from '../state/chime';
import { useCountdown } from '../state/useCountdown';
import { colors, fonts } from '../theme';

const ADD_TIME_OPTIONS = [5, 10, 15];
const BORDER = 0.5;

type Props = {
  presetMinutes: number;
  onBack: () => void;
  onStop: () => void;
  onComplete: (remainingSeconds: number, isFullCompletion: boolean) => void;
};

export default function TimerScreen({ presetMinutes, onBack, onStop, onComplete }: Props) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const handleAutoComplete = useCallback(() => {
    ensureRung();
    startTitleFlash();
    onCompleteRef.current(0, true);
  }, []);

  const { remainingSeconds, progress, addMinutes, getRemainingMs } = useCountdown({
    initialMinutes: presetMinutes,
    onComplete: handleAutoComplete,
  });

  // Book the tone up front so it fires on time even in a throttled background tab.
  useEffect(() => {
    scheduleChime(getRemainingMs() / 1000);
  }, [getRemainingMs]);

  const handleAddMinutes = useCallback(
    (minutes: number) => {
      addMinutes(minutes);
      scheduleChime(getRemainingMs() / 1000);
    },
    [addMinutes, getRemainingMs],
  );

  // Leaving the timer on purpose — nothing left to ring for.
  const abandon = useCallback((leave: () => void) => {
    cancelChime();
    stopTitleFlash();
    leave();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.canvas}>
        <Pressable onPress={() => abandon(onBack)} hitSlop={12} style={styles.backButton}>
          <ArrowBackIcon size={32} />
        </Pressable>

        <Text style={styles.monster}>Monster</Text>
        <Text style={styles.awake}>Awake!</Text>

        <Text style={styles.clock}>{formatClock(remainingSeconds)}</Text>

        <View style={styles.progressWrap}>
          <ProgressBar progress={progress} height={18} />
        </View>

        <Text style={styles.focusLabel}>{presetMinutes} min focus Timer</Text>

        <View style={styles.mainButton}>
          <View style={styles.addRow}>
            {ADD_TIME_OPTIONS.map((minutes) => (
              <Pressable key={minutes} style={styles.addCell} onPress={() => handleAddMinutes(minutes)}>
                <Text style={styles.addLabel}>+ {minutes} Min</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={styles.taskDoneCell}
              onPress={() => abandon(() => onComplete(remainingSeconds, remainingSeconds <= 0))}
            >
              <Text style={styles.taskDoneLabel}>Task Done !</Text>
            </Pressable>
            <Pressable style={styles.stopCell} onPress={() => abandon(onStop)}>
              <Text style={styles.stopLabel}>Stop !?</Text>
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
  monster: {
    ...condensedDisplay,
    top: pctY(88),
    fontSize: 80,
    lineHeight: 64,
    color: colors.ink,
  },
  awake: {
    ...condensedDisplay,
    // AppName column: top 88 + Monster 64 + gap 10.
    top: pctY(162),
    fontSize: 64,
    lineHeight: 64,
    color: colors.skyGray,
  },
  clock: {
    ...condensedDisplay,
    top: pctY(258),
    fontSize: 128,
    lineHeight: 180,
    color: colors.ink,
  },
  progressWrap: {
    position: 'absolute',
    left: pctX(24),
    top: pctY(421),
    width: pctX(345),
  },
  focusLabel: {
    position: 'absolute',
    left: pctX(24),
    top: pctY(455),
    fontFamily: fonts.hubotBold,
    fontSize: 16,
    lineHeight: 23,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  mainButton: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 64,
  },
  addCell: {
    flex: 1,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderColor: colors.ink,
    borderTopWidth: BORDER,
    borderRightWidth: BORDER,
    borderLeftWidth: BORDER,
  },
  addLabel: {
    fontFamily: fonts.hubotMedium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.14,
    textTransform: 'uppercase',
    color: '#313131',
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    height: 64,
  },
  taskDoneCell: {
    flex: 2,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mint,
    borderWidth: BORDER,
    borderColor: colors.ink,
  },
  taskDoneLabel: {
    fontFamily: fonts.hubotMedium,
    fontSize: 16,
    lineHeight: 23,
    letterSpacing: 0.16,
    textTransform: 'uppercase',
    color: '#313131',
  },
  stopCell: {
    flex: 1,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
    borderWidth: BORDER,
    borderColor: colors.ink,
  },
  stopLabel: {
    fontFamily: fonts.hubotMedium,
    fontSize: 16,
    lineHeight: 23,
    letterSpacing: 0.16,
    textTransform: 'uppercase',
    color: colors.mint,
  },
});
