import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

const ROWS = [[5, 15, 30], [45], [60, 95]];
const BORDER = 0.5;

type Props = {
  selected: number | null;
  onSelect: (minutes: number) => void;
};

export default function PresetGrid({ selected, onSelect }: Props) {
  return (
    <View>
      {ROWS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((minutes) => {
            const isSelected = selected === minutes;
            return (
              <Pressable
                key={minutes}
                onPress={() => onSelect(minutes)}
                style={[
                  styles.cell,
                  {
                    backgroundColor: isSelected ? colors.mint : colors.white,
                    borderTopWidth: rowIndex === 0 ? BORDER : 0,
                    borderBottomWidth: rowIndex < 2 ? BORDER : 0,
                    borderLeftWidth: BORDER,
                    borderRightWidth: BORDER,
                  },
                ]}
              >
                <Text style={styles.cellLabel}>{minutes} min</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
    height: 64,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.ink,
  },
  cellLabel: {
    fontFamily: fonts.hubotMedium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.14,
    textTransform: 'uppercase',
    color: '#313131',
  },
});
