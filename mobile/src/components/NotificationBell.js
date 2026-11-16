import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../context/NotificationContext';
import { colors } from '../constants/theme';

/**
 * Header bell with an unread-count badge, mirroring the website's
 * NotificationBell (red bubble, "99+" cap, hidden when zero). The count is
 * the persisted inbox unread total owned by NotificationProvider - it
 * refreshes on sign-in, on AppState active, on foreground push receipt, on a
 * 30s poll while signed in, and adjusts locally when items are read/removed.
 */
export default function NotificationBell({ navigation, size = 23 }) {
  const { unreadCount } = useNotifications();
  const count = Math.max(0, Number(unreadCount) || 0);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count ? `Notifications, ${count} unread` : 'Notifications'}
      onPress={() => navigation.navigate('Notifications')}
      style={styles.bell}
    >
      <Ionicons name="notifications-outline" size={size} color={colors.white} />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bell: { padding: 9, position: 'relative' },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 999,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
});
