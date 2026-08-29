import {
  HubotSans_400Regular,
  HubotSans_500Medium,
  HubotSans_700Bold,
  HubotSans_900Black,
  useFonts as useHubotSans,
} from '@expo-google-fonts/hubot-sans';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import HomeScreen from './src/screens/HomeScreen';
import { cancelChime, DEFAULT_ALERT_SOUND, stopTitleFlash, unlockAudio, type AlertSoundId } from './src/state/chime';
import SplashScreen from './src/screens/SplashScreen';
import TaskDoneScreen from './src/screens/TaskDoneScreen';
import TimerScreen from './src/screens/TimerScreen';
import { colors } from './src/theme';

type Screen = 'splash' | 'home' | 'timer' | 'done';

type DoneState = {
  presetMinutes: number;
  remainingSeconds: number;
  isFullCompletion: boolean;
  elapsedSeconds: number;
  totalSeconds: number;
  wasStopped: boolean;
};

export default function App() {
  const [fontsLoaded] = useHubotSans({
    HubotSans_400Regular,
    HubotSans_500Medium,
    HubotSans_700Bold,
    HubotSans_900Black,
  });

  const [screen, setScreen] = useState<Screen>('splash');
  const [presetMinutes, setPresetMinutes] = useState(15);
  const [soundId, setSoundId] = useState<AlertSoundId>(DEFAULT_ALERT_SOUND);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [doneState, setDoneState] = useState<DoneState | null>(null);

  if (!fontsLoaded) {
    return <View style={styles.blank} />;
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {screen === 'splash' && <SplashScreen onFinish={() => setScreen('home')} />}

      {screen === 'home' && (
        <HomeScreen
          onStartTimer={(minutes, chosenSoundId, chosenNotifyEnabled) => {
            unlockAudio(); // must happen inside the tap for autoplay policy
            setPresetMinutes(minutes);
            setSoundId(chosenSoundId);
            setNotifyEnabled(chosenNotifyEnabled);
            setScreen('timer');
          }}
        />
      )}

      {screen === 'timer' && (
        <TimerScreen
          presetMinutes={presetMinutes}
          soundId={soundId}
          notifyEnabled={notifyEnabled}
          onBack={() => setScreen('home')}
          onStop={(remainingSeconds, elapsedSeconds, totalSeconds) => {
            // Stop now lands on Task Done too, not straight Home — the withered tree is the
            // whole point of giving up early having a visible cost (SID-25).
            setDoneState({
              presetMinutes,
              remainingSeconds,
              isFullCompletion: false,
              elapsedSeconds,
              totalSeconds,
              wasStopped: true,
            });
            setScreen('done');
          }}
          onComplete={(remainingSeconds, isFullCompletion, elapsedSeconds, totalSeconds) => {
            setDoneState({
              presetMinutes,
              remainingSeconds,
              isFullCompletion,
              elapsedSeconds,
              totalSeconds,
              wasStopped: false,
            });
            setScreen('done');
          }}
        />
      )}

      {screen === 'done' && doneState && (
        <TaskDoneScreen
          presetMinutes={doneState.presetMinutes}
          remainingSeconds={doneState.remainingSeconds}
          isFullCompletion={doneState.isFullCompletion}
          elapsedSeconds={doneState.elapsedSeconds}
          totalSeconds={doneState.totalSeconds}
          wasStopped={doneState.wasStopped}
          onBack={() => {
            // A chime left over from natural completion (or its endless loop,
            // per SID-22) is never cancelled just by leaving this screen — do
            // it explicitly, the same way TimerScreen's abandon() does.
            cancelChime();
            stopTitleFlash();
            setScreen('home');
          }}
          onClose={() => {
            cancelChime();
            stopTitleFlash();
            setScreen('home');
          }}
          onRepeat={() => {
            unlockAudio();
            setPresetMinutes(doneState.presetMinutes);
            setScreen('timer');
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  blank: {
    flex: 1,
    backgroundColor: colors.white,
  },
});
