import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import OwlIcon from '../components/OwlIcon';
import PresetGrid from '../components/PresetGrid';
import SoundPicker from '../components/SoundPicker';
import { pctX, pctY } from '../layout';
import { DEFAULT_ALERT_SOUND, type AlertSoundId } from '../state/chime';
import { colors, fonts } from '../theme';

type Props = {
  onStartTimer: (minutes: number, soundId: AlertSoundId) => void;
};

export default function HomeScreen({ onStartTimer }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [soundId, setSoundId] = useState<AlertSoundId>(DEFAULT_ALERT_SOUND);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.canvas}>
        <View style={styles.appName}>
          <Text style={styles.title}>Focus</Text>
          <Text style={styles.subtitle}>Set timer to awake the monster in you...</Text>
        </View>

        <View style={styles.owlWrap}>
          <OwlIcon size={255} color="#F3F3F3" />
        </View>

        <View style={styles.mainButton}>
          <PresetGrid selected={selected} onSelect={setSelected} />
          <SoundPicker selected={soundId} onSelect={setSoundId} />
          <Pressable
            style={[styles.setTimer, { opacity: selected === null ? 0.4 : 1 }]}
            disabled={selected === null}
            onPress={() => selected !== null && onStartTimer(selected, soundId)}
          >
            <Text style={styles.setTimerLabel}>Set Timer</Text>
          </Pressable>
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
  },
  appName: {
    position: 'absolute',
    left: pctX(24),
    top: pctY(64),
    width: pctX(345),
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 7,
  },
  title: {
    width: '100%',
    fontFamily: fonts.hubotBlack,
    fontSize: 64,
    lineHeight: 64,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  subtitle: {
    width: '100%',
    fontFamily: fonts.hubotMedium,
    fontSize: 16,
    lineHeight: 23,
    letterSpacing: -0.75,
    textTransform: 'uppercase',
    color: colors.gray,
  },
  owlWrap: {
    position: 'absolute',
    left: pctX(69),
    top: pctY(218),
  },
  mainButton: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  setTimer: {
    width: '100%',
    height: 64,
    borderWidth: 0.5,
    borderColor: colors.ink,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setTimerLabel: {
    fontFamily: fonts.hubotMedium,
    fontSize: 16,
    lineHeight: 23,
    letterSpacing: 0.16,
    textTransform: 'uppercase',
    color: colors.mint,
  },
});
