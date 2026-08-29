import { useCallback, useEffect, useRef } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import ArrowBackIcon from '../components/ArrowBackIcon';
import Forest from '../components/Forest';
import ProgressBar from '../components/ProgressBar';
import { formatClock } from '../format';
import { condensedDisplay, pctX, pctY } from '../layout';
import { cancelChime, ensureRung, scheduleChime, startTitleFlash, stopTitleFlash, type AlertSoundId } from '../state/chime';
import { showTimerNotification } from '../state/notifications';
import { useCountdown } from '../state/useCountdown';
import { releaseWakeLock, requestWakeLock } from '../state/wakeLock';
import { colors, fonts } from '../theme';

const ADD_TIME_OPTIONS = [5, 10, 15];
const BORDER = 0.5;

type Props = {
  presetMinutes: number;
  soundId: AlertSoundId;
  notifyEnabled: boolean;
  onBack: () => void;
  onStop: (remainingSeconds: number, elapsedSeconds: number, totalSeconds: number) => void;
  onComplete: (remainingSeconds: number, isFullCompletion: boolean, elapsedSeconds: number, totalSeconds: number) => void;
};

export default function TimerScreen({ presetMinutes, soundId, notifyEnabled, onBack, onStop, onComplete }: Props) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // handleAutoComplete is handed to useCountdown below as its onComplete callback, so it has
  // to exist before useCountdown returns totalSeconds — it reads it from this ref instead,
  // which every render refreshes to the latest value just after the hook call.
  const snapshotRef = useRef({ totalSeconds: presetMinutes * 60 });

  const handleAutoComplete = useCallback(() => {
    ensureRung();
    startTitleFlash();
    if (notifyEnabled) showTimerNotification(presetMinutes);
    // Natural completion means the session is by definition fully elapsed — use totalSeconds
    // for both arguments rather than the ref's elapsedSeconds, which is always exactly one
    // tick stale here (handleAutoComplete fires synchronously inside the same tick that just
    // computed the final elapsedSeconds, before the render that would refresh the ref). Since
    // every totalSeconds is an exact multiple of 300s, that one-tick lag always undercounts
    // the last tree by exactly one — this was SID-25's Pass A Blocking finding.
    const { totalSeconds: total } = snapshotRef.current;
    onCompleteRef.current(0, true, total, total);
  }, [notifyEnabled, presetMinutes]);

  const { remainingSeconds, progress, totalSeconds, elapsedSeconds, addMinutes, getRemainingMs } = useCountdown({
    initialMinutes: presetMinutes,
    onComplete: handleAutoComplete,
  });

  snapshotRef.current = { totalSeconds };

  // Book the tone up front so it fires on time even in a throttled background tab.
  useEffect(() => {
    scheduleChime(getRemainingMs() / 1000, soundId);
  }, [getRemainingMs, soundId]);

  // Held for the screen's whole lifetime — every exit path (back, Task Done, Stop, natural
  // completion) unmounts this screen, so the cleanup here is the single release point.
  useEffect(() => {
    requestWakeLock();
    return () => releaseWakeLock();
  }, []);

  const handleAddMinutes = useCallback(
    (minutes: number) => {
      addMinutes(minutes);
      scheduleChime(getRemainingMs() / 1000, soundId);
    },
    [addMinutes, getRemainingMs, soundId],
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

        <View style={styles.forestWrap}>
          <Forest elapsedSeconds={elapsedSeconds} totalSeconds={totalSeconds} />
        </View>

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
              onPress={() =>
                abandon(() => onComplete(remainingSeconds, remainingSeconds <= 0, elapsedSeconds, totalSeconds))
              }
            >
              <Text style={styles.taskDoneLabel}>Task Done !</Text>
            </Pressable>
            <Pressable
              style={styles.stopCell}
              onPress={() => abandon(() => onStop(remainingSeconds, elapsedSeconds, totalSeconds))}
            >
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
  forestWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: pctY(478),
    bottom: 128,
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
