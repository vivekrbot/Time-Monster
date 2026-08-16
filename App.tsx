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
import SplashScreen from './src/screens/SplashScreen';
import TaskDoneScreen from './src/screens/TaskDoneScreen';
import TimerScreen from './src/screens/TimerScreen';
import { colors } from './src/theme';

type Screen = 'splash' | 'home' | 'timer' | 'done';

type DoneState = {
  presetMinutes: number;
  remainingSeconds: number;
  isFullCompletion: boolean;
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
          onStartTimer={(minutes) => {
            setPresetMinutes(minutes);
            setScreen('timer');
          }}
        />
      )}

      {screen === 'timer' && (
        <TimerScreen
          presetMinutes={presetMinutes}
          onBack={() => setScreen('home')}
          onStop={() => setScreen('home')}
          onComplete={(remainingSeconds, isFullCompletion) => {
            setDoneState({ presetMinutes, remainingSeconds, isFullCompletion });
            setScreen('done');
          }}
        />
      )}

      {screen === 'done' && doneState && (
        <TaskDoneScreen
          presetMinutes={doneState.presetMinutes}
          remainingSeconds={doneState.remainingSeconds}
          isFullCompletion={doneState.isFullCompletion}
          onBack={() => setScreen('home')}
          onClose={() => setScreen('home')}
          onRepeat={() => {
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
