import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppButton, Badge, Card } from './Ui';
import { colors, spacing } from '../constants/theme';
import { DEMO_MODE } from '../config/runtime';
import {
  getPushConfiguration,
  getPushRegistrationStatus,
  registerForPushNotificationsAsync,
  unregisterForPushNotificationsAsync,
} from '../services/pushNotifications';

const PRESENTATION = {
  'demo-disabled': { label: 'Disabled in demo', tone: 'warning' },
  registered: { label: 'Enabled', tone: 'success' },
  'permission-denied': { label: 'Permission off', tone: 'warning' },
  'setup-required': { label: 'Setup required', tone: 'warning' },
  'registration-failed': { label: 'Needs attention', tone: 'danger' },
  'unregister-failed': { label: 'Needs attention', tone: 'danger' },
  'not-registered': { label: 'Off', tone: 'neutral' },
};

function formatUpdatedAt(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
}

/**
 * Shared account setting used to make physical-device push validation observable.
 * It only reports registration state; Expo push tokens are never rendered.
 */
export default function NotificationSettingsCard() {
  const [registration, setRegistration] = useState(null);
  const [busy, setBusy] = useState(false);
  const configuration = useMemo(() => getPushConfiguration(), []);

  const reload = useCallback(async () => {
    setRegistration(await getPushRegistrationStatus());
  }, []);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  const enable = async () => {
    setBusy(true);
    try {
      await registerForPushNotificationsAsync();
      await reload();
    } catch {
      await reload();
      Alert.alert(
        'Could not enable notifications',
        'Check the API connection and push setup, then try again. Your in-app notifications are still available.'
      );
    } finally {
      setBusy(false);
    }
  };

  const disable = () => Alert.alert(
    'Stop notifications on this device?',
    'This removes this device from SmartHire push delivery. You can enable it again later.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop notifications',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await unregisterForPushNotificationsAsync();
            await reload();
          } catch {
            await reload();
            Alert.alert('Could not update notifications', 'Please try again when your connection is available.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]
  );

  if (DEMO_MODE) {
    return (
      <Card>
        <View style={styles.heading}>
          <View style={styles.copy}>
            <Text style={styles.title}>Device notifications</Text>
            <Text style={styles.body}>Disabled in local demo mode. The demo does not request permission, create an Expo token, register a device, or navigate from push responses.</Text>
          </View>
          <Badge tone="warning">Disabled in demo</Badge>
        </View>
        <Text style={styles.note}>In-app sample notifications remain local to this demo session.</Text>
      </Card>
    );
  }

  const status = registration?.status || 'not-registered';
  const presentation = PRESENTATION[status] || { label: 'Checking', tone: 'neutral' };
  const detail = registration?.detail || (
    configuration.ready
      ? 'Enable notifications to receive important SmartHire updates on this device.'
      : configuration.reason
  );
  const updatedAt = formatUpdatedAt(registration?.updatedAt);

  return (
    <Card>
      <View style={styles.heading}>
        <View style={styles.copy}>
          <Text style={styles.title}>Device notifications</Text>
          <Text style={styles.body}>{detail}</Text>
        </View>
        <Badge tone={presentation.tone}>{presentation.label}</Badge>
      </View>
      {updatedAt ? <Text style={styles.updated}>Last checked: {updatedAt}</Text> : null}
      {status === 'permission-denied' ? (
        <AppButton
          compact
          title="Open device settings"
          variant="outline"
          onPress={() => Linking.openSettings().catch(() => Alert.alert('Open settings', 'Please enable notifications for SmartHire in your device settings.'))}
          style={styles.action}
        />
      ) : null}
      {status === 'registered' ? (
        <View style={styles.actions}>
          <AppButton compact title="Refresh registration" variant="outline" onPress={enable} loading={busy} style={styles.flexButton} />
          <AppButton compact title="Stop on this device" variant="ghost" onPress={disable} disabled={busy} style={styles.flexButton} />
        </View>
      ) : (
        <AppButton
          compact
          title={configuration.ready ? 'Enable notifications' : 'Check notification setup'}
          variant="outline"
          onPress={enable}
          loading={busy}
          style={styles.action}
        />
      )}
      <Text style={styles.note}>In-app notifications remain available even when device notifications are off.</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  copy: { flex: 1 },
  title: { color: colors.text, fontSize: 16, fontWeight: '800' },
  body: { color: colors.muted, lineHeight: 20, marginTop: 5 },
  updated: { color: '#94A3B8', fontSize: 12, marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  flexButton: { flex: 1, paddingHorizontal: 8 },
  action: { marginTop: spacing.md },
  note: { color: '#94A3B8', fontSize: 12, lineHeight: 17, marginTop: spacing.sm },
});
