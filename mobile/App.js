import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NotificationProvider, useNotifications } from './src/context/NotificationContext';
import DemoModeBadge from './src/components/DemoModeBadge';
import RootNavigator from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';

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
