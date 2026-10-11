import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import DemoModeBadge from './src/components/DemoModeBadge';
import RootNavigator from './src/navigation/RootNavigator';
import { flushPendingNotificationNavigation, navigationRef } from './src/navigation/navigationRef';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer ref={navigationRef} onReady={flushPendingNotificationNavigation}>
          <View style={{ flex: 1 }}>
            <StatusBar style="light" />
            <DemoModeBadge />
            <View style={{ flex: 1 }}><RootNavigator /></View>
          </View>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
