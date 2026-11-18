import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NotificationProvider, useNotifications } from './src/context/NotificationContext';
import DemoModeBadge from './src/components/DemoModeBadge';
import RootNavigator from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { API_CONFIGURATION_ERROR } from './src/api/client';
import { DEMO_MODE } from './src/config/runtime';

function ApiConfigurationNotice() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.configuration}>
        <StatusBar style="dark" />
        <Text style={styles.configurationTitle}>SmartHire cannot connect</Text>
        <Text selectable style={styles.configurationMessage}>{API_CONFIGURATION_ERROR}</Text>
        <Text style={styles.configurationHint}>
          Ask the app owner for a new build configured with a reachable backend. An installed app does not pick up changes to mobile/.env automatically.
        </Text>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function AppNavigation() {
  const { initializing, user } = useAuth();
  const { setNavigationReady } = useNotifications();
  const [containerReady, setContainerReady] = useState(false);

  // A notification response may arrive while auth restores or a role stack is
  // swapping. The provider additionally verifies the expected root route, so
  // it will not mark/read/navigate a payload prematurely.
  useEffect(() => {
    setNavigationReady(Boolean(containerReady && !initializing && user?.id));
  }, [containerReady, initializing, setNavigationReady, user?.id, user?.role]);

  return (
    <NavigationContainer ref={navigationRef} onReady={() => setContainerReady(true)}>
      <View style={{ flex: 1 }}>
        <StatusBar style="light" />
        <DemoModeBadge />
        <View style={{ flex: 1 }}><RootNavigator /></View>
      </View>
    </NavigationContainer>
  );
}

export default function App() {
  if (!DEMO_MODE && API_CONFIGURATION_ERROR) return <ApiConfigurationNotice />;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationProvider>
          <AppNavigation />
        </NotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  configuration: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#F8FAFC' },
  configurationTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  configurationMessage: { color: '#334155', fontSize: 16, lineHeight: 24 },
  configurationHint: { color: '#64748B', marginTop: 16, lineHeight: 20 },
});
