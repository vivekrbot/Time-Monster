import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AlarmCheckIcon from './AlarmCheckIcon';
import { ALERT_SOUNDS, ALERT_SOUND_IDS, previewChime, type AlertSoundId } from '../state/chime';
import { colors, fonts } from '../theme';

type Props = {
  selected: AlertSoundId;
  onSelect: (id: AlertSoundId) => void;
};

const BORDER = 0.5;

export default function SoundPicker({ selected, onSelect }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [previewingId, setPreviewingId] = useState<AlertSoundId | null>(null);
  const previewTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (previewTimeout.current) clearTimeout(previewTimeout.current);
  }, []);

  const handlePick = (id: AlertSoundId) => {
    onSelect(id);
    const seconds = previewChime(id);
    setPreviewingId(id);
    if (previewTimeout.current) clearTimeout(previewTimeout.current);
    previewTimeout.current = setTimeout(() => setPreviewingId(null), seconds * 1000);
  };

  return (
    <View>
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={styles.summaryRow}
        accessibilityRole="button"
        accessibilityLabel={`Alert sound, ${ALERT_SOUNDS[selected].label}. Tap to ${expanded ? 'collapse' : 'choose a different sound'}.`}
      >
        <Text style={styles.summaryLabel}>Alert Sound</Text>
        <Text style={styles.summaryValue}>
          {ALERT_SOUNDS[selected].label} {expanded ? '▲' : '▼'}
        </Text>
      </Pressable>

      {expanded && (
        <View style={styles.list} accessibilityRole="radiogroup">
          {ALERT_SOUND_IDS.map((id) => {
            const isSelected = id === selected;
            const isPreviewing = previewingId === id;
            return (
              <Pressable
                key={id}
                onPress={() => handlePick(id)}
                style={[
                  styles.cell,
                  { backgroundColor: isSelected ? colors.mint : colors.white },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`${ALERT_SOUNDS[id].label} alert sound${isSelected ? ', selected' : ''}`}
              >
                <Text style={styles.cellLabel}>{ALERT_SOUNDS[id].label}</Text>
                {isSelected && <AlarmCheckIcon size={16} color={colors.ink} />}
                {isPreviewing && <Text style={styles.playingLabel}>Playing…</Text>}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 4,
    borderTopWidth: BORDER,
    borderColor: colors.ink,
  },
  summaryLabel: {
    fontFamily: fonts.hubotMedium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.14,
    textTransform: 'uppercase',
    color: colors.gray,
  },
  summaryValue: {
    fontFamily: fonts.hubotBold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.14,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 8,
  },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    minWidth: '30%',
    paddingHorizontal: 12,
    borderWidth: BORDER,
    borderColor: colors.ink,
  },
  cellLabel: {
    fontFamily: fonts.hubotMedium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.13,
    textTransform: 'uppercase',
    color: '#313131',
  },
  playingLabel: {
    fontFamily: fonts.hubotRegular,
    fontSize: 10,
    color: colors.gray,
  },
});
