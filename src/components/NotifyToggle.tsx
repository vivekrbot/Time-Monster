import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts } from '../theme';
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
  type NotifyPermission,
} from '../state/notifications';

type Props = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
};

const BORDER = 0.5;

export default function NotifyToggle({ enabled, onChange }: Props) {
  const [permission, setPermission] = useState<NotifyPermission>(getNotificationPermission);
  const [requesting, setRequesting] = useState(false);

  if (permission === 'unsupported') return null;

  const handleToggle = async () => {
    if (permission === 'denied' || requesting) return; // inert once blocked — see Design Brief

    if (enabled) {
      onChange(false);
      return;
    }

    // Only the toggle's own tap ever requests permission — never on load.
    setRequesting(true);
    const result = await requestNotificationPermission();
    setRequesting(false);
    setPermission(result);
    onChange(result === 'granted');
  };

  const statusLabel = requesting
    ? 'Asking…'
    : permission === 'denied'
      ? 'Blocked'
      : enabled && permission === 'granted'
        ? 'On'
        : 'Off';

  return (
    <Pressable
      onPress={handleToggle}
      style={styles.row}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled, disabled: permission === 'denied' }}
      accessibilityLabel={`Notify me when done, ${statusLabel}${permission === 'denied' ? '. Blocked in browser settings' : ''}`}
    >
      <Text style={styles.label}>Notify Me When Done</Text>
      <Text style={styles.value}>{statusLabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 4,
    borderTopWidth: BORDER,
    borderColor: colors.ink,
  },
  label: {
    fontFamily: fonts.hubotMedium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.14,
    textTransform: 'uppercase',
    color: colors.gray,
  },
  value: {
    fontFamily: fonts.hubotBold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.14,
    textTransform: 'uppercase',
    color: colors.ink,
  },
});
