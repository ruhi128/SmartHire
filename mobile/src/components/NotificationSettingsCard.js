import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppButton, Badge, Card } from './Ui';
import { colors, spacing } from '../constants/theme';
import { useNotifications } from '../context/NotificationContext';

function deviceBadge(status) {
  if (status === 'enabled') return { label: 'Device alerts enabled', tone: 'success' };
  if (status === 'registering' || status === 'checking') return { label: 'Checking device alerts', tone: 'info' };
  if (status === 'permission_denied') return { label: 'Permission needed', tone: 'warning' };
  if (status === 'unavailable' || status === 'not_configured') return { label: 'Device alerts unavailable', tone: 'neutral' };
  return { label: 'Device setup needs attention', tone: 'warning' };
}

/**
 * Profile-level visibility for both durable inbox updates and optional remote
 * Android delivery. The inbox works even when device permission is off.
 */
export default function NotificationSettingsCard() {
  const navigation = useNavigation();
  const {
    unreadCount,
    refreshing,
    lastUpdatedAt,
    refreshUnreadCount,
    pushStatus,
    registerForPushNotifications,
  } = useNotifications();
  const unreadLabel = unreadCount === 1 ? '1 unread update' : `${unreadCount} unread updates`;
  const device = deviceBadge(pushStatus?.status);
  const deviceBusy = pushStatus?.status === 'registering' || pushStatus?.status === 'checking';
  const canAttemptRegistration = !['unavailable', 'not_configured'].includes(pushStatus?.status);

  const openInbox = () => navigation.navigate('Notifications');
  const configureDeviceNotifications = async () => {
    if (pushStatus?.status === 'permission_denied') {
      try {
        await Linking.openSettings();
      } catch {
        Alert.alert('Open Android settings', 'Enable notifications for SmartHire in your device settings, then return to the app.');
      }
      return;
    }
    try {
      await registerForPushNotifications();
    } catch {
      Alert.alert('Could not enable device notifications', 'Your SmartHire inbox still works. Check Firebase/EAS setup and try again on an installed Android development build.');
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.icon}><Ionicons name="notifications-outline" size={25} color={colors.primary} /></View>
        <View style={styles.copy}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.body}>Job, application, assessment, and account updates are saved securely in your SmartHire inbox.</Text>
        </View>
      </View>

      <View style={styles.statusRow}>
        <Badge tone={unreadCount > 0 ? 'info' : 'success'}>{unreadLabel}</Badge>
        <Text style={styles.statusText}>{lastUpdatedAt ? 'Inbox synced' : 'Inbox syncs while you use the app'}</Text>
      </View>

      <View style={styles.deviceSection}>
        <View style={styles.deviceHeading}>
          <Text style={styles.deviceTitle}>Android device alerts</Text>
          <Badge tone={device.tone}>{device.label}</Badge>
        </View>
        <Text style={styles.note}>{pushStatus?.message || 'Checking whether this device can receive SmartHire alerts…'}</Text>
        <Text style={styles.note}>Turning off device alerts never removes updates from your authenticated inbox.</Text>
      </View>

      <View style={styles.actions}>
        <AppButton title="Open inbox" onPress={openInbox} compact style={styles.action} />
        <AppButton title="Refresh inbox" variant="outline" onPress={() => refreshUnreadCount().catch(() => {})} loading={refreshing} compact style={styles.action} />
      </View>
      {canAttemptRegistration ? (
        <AppButton
          title={pushStatus?.status === 'permission_denied' ? 'Open device settings' : pushStatus?.status === 'enabled' ? 'Recheck device alerts' : 'Enable device alerts'}
          variant="outline"
          onPress={configureDeviceNotifications}
          loading={deviceBusy}
          compact
          style={styles.deviceAction}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  icon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2FF', marginRight: 12 },
  copy: { flex: 1 },
  title: { color: colors.text, fontWeight: '800', fontSize: 16 },
  body: { color: colors.muted, marginTop: 4, lineHeight: 19, fontSize: 13 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.md },
  statusText: { color: colors.muted, fontSize: 12, flexShrink: 1 },
  deviceSection: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  deviceHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  deviceTitle: { color: colors.text, fontSize: 13, fontWeight: '800', flexShrink: 1 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 7 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  action: { flex: 1 },
  deviceAction: { marginTop: spacing.sm },
});
