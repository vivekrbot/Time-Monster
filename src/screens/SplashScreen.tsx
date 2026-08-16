import { useEffect, useRef, useState } from 'react';
import { Animated, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import OwlIcon from '../components/OwlIcon';
import { pctX, pctY } from '../layout';
import { colors, fonts } from '../theme';

const LOAD_DURATION_MS = 2200;

type Props = {
  onFinish: () => void;
};

export default function SplashScreen({ onFinish }: Props) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [progressWidth, setProgressWidth] = useState<`${number}%`>('0%');

  useEffect(() => {
    const listenerId = progressAnim.addListener(({ value }) => {
      setProgressWidth(`${Math.round(value * 100)}%`);
    });

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: LOAD_DURATION_MS,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) onFinish();
    });

    return () => progressAnim.removeListener(listenerId);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.canvas}>
        <View style={styles.appName}>
          <Text style={styles.title}>Time Monster</Text>
          <Text style={styles.tagline}>Personal Time Management Buddy</Text>
        </View>

        <View style={styles.owlWrap}>
          <OwlIcon size={173} color={colors.ink} />
        </View>

        <Text style={styles.wakingLabel}>Waking Monster….</Text>

        <View style={styles.loaderTrack}>
          <Animated.View style={[styles.loaderFill, { width: progressWidth }]} />
        </View>

        <Text style={styles.credit}>Made with ❤️ by Bot Studio | Itsvivek.Design</Text>
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
    letterSpacing: -2,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  tagline: {
    width: '100%',
    fontFamily: fonts.hubotRegular,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.14,
    textTransform: 'uppercase',
    color: colors.gray,
  },
  owlWrap: {
    position: 'absolute',
    left: pctX(24),
    top: pctY(243),
  },
  wakingLabel: {
    position: 'absolute',
    left: pctX(24),
    top: pctY(716),
    fontFamily: fonts.hubotRegular,
    fontSize: 16,
    lineHeight: 23,
    letterSpacing: 0.16,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  loaderTrack: {
    position: 'absolute',
    left: pctX(24),
    top: pctY(747),
    width: pctX(345),
    height: 16,
    borderRadius: 999,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
  },
  loaderFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.ink,
  },
  credit: {
    position: 'absolute',
    left: pctX(24),
    top: pctY(811),
    width: pctX(345),
    fontFamily: fonts.hubotRegular,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.12,
    textTransform: 'uppercase',
    color: colors.gray,
  },
});
