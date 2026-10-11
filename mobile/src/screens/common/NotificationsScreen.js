import { useCallback, useEffect } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from '@react-navigation/native';
import { notificationsApi } from '../../api';
import AppHeader from '../../components/AppHeader';
import Screen from '../../components/Screen';
import { AppButton, Badge, EmptyState, ErrorState, LoadingState } from '../../components/Ui';
import useAsyncData from '../../utils/useAsyncData';
import { relativeDate } from '../../utils/format';
import { colors, spacing } from '../../constants/theme';
import { navigateFromNotification } from '../../navigation/navigationRef';
import { DEMO_MODE } from '../../config/runtime';

// The live API returns { notifications: [...] }. Preserve that envelope while
// optimistically editing a list so future refreshes and callers retain the
// exact response shape. Demo mode intentionally still supports its array mock.
function patchNotifications(data, transform) {
  if (Array.isArray(data)) return transform(data);
  if (data && Array.isArray(data.notifications)) {
    return { ...data, notifications: transform(data.notifications) };
  }
  return data;
}

export default function NotificationsScreen({ navigation }) {
  const { data, loading, refreshing, error, reload, setData } = useAsyncData(() => notificationsApi.list(), []);
  const notifications = Array.isArray(data) ? data : data?.notifications || [];

  // Notifications may arrive while this screen remains mounted behind a route.
  // Refresh on focus as well, so deliveries received before it mounted are also
  // reflected when the inbox is opened.
  useFocusEffect(useCallback(() => {
    reload({ refresh: true }).catch(() => {});
  }, [reload]));

  useEffect(() => {
    if (DEMO_MODE) return undefined;
    const subscription = Notifications.addNotificationReceivedListener(() => {
      reload({ refresh: true }).catch(() => {});
    });
    return () => subscription.remove();
  }, [reload]);

  const markAll = async () => {
    try {
      await notificationsApi.markAllRead();
      setData((old) => patchNotifications(old, (items) => items.map((item) => ({ ...item, is_read: true }))));
    } catch {
      Alert.alert('Could not update notifications', 'Please try again.');
    }
  };

  const open = async (item) => {
    try {
      if (!item.is_read) {
        await notificationsApi.markRead(item.id);
        setData((old) => patchNotifications(old, (items) => items.map((notification) => (
          notification.id === item.id ? { ...notification, is_read: true } : notification
        ))));
      }
    } finally {
      if (item.link) navigateFromNotification({ link: item.link, notificationId: item.id });
    }
  };

  const remove = (item) => Alert.alert('Delete notification?', 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: async () => {
        try {
          await notificationsApi.remove(item.id);
          setData((old) => patchNotifications(old, (items) => items.filter((notification) => notification.id !== item.id)));
        } catch {
          Alert.alert('Could not delete notification', 'Please try again.');
        }
      },
    },
  ]);

  if (loading) return <><AppHeader navigation={navigation} title="Notifications" /><Screen hasHeader scroll={false} contentContainerStyle={styles.page}><LoadingState /></Screen></>;
  if (error) return <><AppHeader navigation={navigation} title="Notifications" /><Screen hasHeader scroll={false} contentContainerStyle={styles.page}><ErrorState message={error} onRetry={() => reload().catch(() => {})} /></Screen></>;

  return (
    <>
      <AppHeader navigation={navigation} title="Notifications" right={<AppButton title="Read all" compact variant="ghost" onPress={markAll} />} />
      <Screen hasHeader scroll={false} contentContainerStyle={styles.page}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, !notifications.length && styles.emptyList]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload({ refresh: true }).catch(() => {})} />}
        ListEmptyComponent={<EmptyState title="You're all caught up" body="New application, job, and account updates will appear here." />}
        renderItem={({ item }) => (
          <Pressable onPress={() => open(item)} onLongPress={() => remove(item)} style={[styles.item, !item.is_read && styles.unread]}>
            <View style={styles.icon}><Ionicons name={item.is_read ? 'notifications-outline' : 'notifications'} size={20} color={colors.primary} /></View>
            <View style={styles.content}>
              <View style={styles.topLine}><Text style={styles.title}>{item.title}</Text>{!item.is_read ? <Badge tone="info">New</Badge> : null}</View>
              {item.body ? <Text numberOfLines={3} style={styles.body}>{item.body}</Text> : null}
              <Text style={styles.time}>{relativeDate(item.created_at)}</Text>
            </View>
          </Pressable>
        )}
      />
      <Text style={styles.hint}>Long press an item to delete it.</Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, gap: spacing.sm },
  emptyList: { flexGrow: 1 },
  item: { flexDirection: 'row', borderRadius: 14, padding: spacing.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  unread: { borderColor: '#C7D2FE', backgroundColor: '#F8FAFF' },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 11 },
  content: { flex: 1 },
  topLine: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  title: { color: colors.text, fontWeight: '800', flex: 1 },
  body: { color: colors.muted, marginTop: 5, lineHeight: 19 },
  time: { fontSize: 12, color: '#94A3B8', marginTop: 8 },
  hint: { textAlign: 'center', paddingVertical: 8, color: colors.muted, fontSize: 12 },
});
