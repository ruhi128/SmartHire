import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors } from '../constants/theme';
import AuthNavigator from './AuthNavigator';
import StudentNavigator from './StudentNavigator';
import RecruiterNavigator from './RecruiterNavigator';
import AdminNavigator from './AdminNavigator';
import NotificationsScreen from '../screens/common/NotificationsScreen';
import AnnouncementListScreen from '../screens/common/AnnouncementListScreen';

const Stack = createNativeStackNavigator();

function LoadingApp() {
  return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.loadingText}>Preparing SmartHire…</Text></View>;
}

export default function RootNavigator() {
  const { initializing, user } = useAuth();

  if (initializing) return <LoadingApp />;
  if (!user) return <AuthNavigator />;

  const initialScreen = user.role === 'student' ? 'StudentApp' : user.role === 'recruiter' ? 'RecruiterApp' : 'AdminApp';
  return (
    <Stack.Navigator initialRouteName={initialScreen} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudentApp" component={StudentNavigator} />
      <Stack.Screen name="RecruiterApp" component={RecruiterNavigator} />
      <Stack.Screen name="AdminApp" component={AdminNavigator} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ presentation: 'card' }} />
      <Stack.Screen name="Announcements" component={AnnouncementListScreen} options={{ presentation: 'card' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  loadingText: { color: colors.muted, marginTop: 12 },
});
