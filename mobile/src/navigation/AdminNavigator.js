import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminJobApprovalsScreen from '../screens/admin/AdminJobApprovalsScreen';
import AdminOaReviewsScreen from '../screens/admin/AdminOaReviewsScreen';
import AdminStudentsScreen from '../screens/admin/AdminStudentsScreen';
import AdminAnnouncementsScreen from '../screens/admin/AdminAnnouncementsScreen';
import AdminCompaniesScreen from '../screens/admin/AdminCompaniesScreen';
import AdminAccountScreen from '../screens/admin/AdminAccountScreen';
import AdminReportsScreen from '../screens/admin/AdminReportsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const options = { headerShown: false, animation: 'slide_from_right' };

function HomeStack() {
  return <Stack.Navigator screenOptions={options}><Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} /><Stack.Screen name="AdminJobApprovals" component={AdminJobApprovalsScreen} /><Stack.Screen name="AdminOaReviews" component={AdminOaReviewsScreen} /><Stack.Screen name="AdminStudents" component={AdminStudentsScreen} /><Stack.Screen name="AdminAnnouncements" component={AdminAnnouncementsScreen} /><Stack.Screen name="AdminCompanies" component={AdminCompaniesScreen} /><Stack.Screen name="AdminReports" component={AdminReportsScreen} /></Stack.Navigator>;
}
function ReviewsStack() {
  return <Stack.Navigator screenOptions={options}><Stack.Screen name="AdminJobApprovals" component={AdminJobApprovalsScreen} /><Stack.Screen name="AdminOaReviews" component={AdminOaReviewsScreen} /></Stack.Navigator>;
}
function StudentsStack() {
  return <Stack.Navigator screenOptions={options}><Stack.Screen name="AdminStudents" component={AdminStudentsScreen} /><Stack.Screen name="AdminCompanies" component={AdminCompaniesScreen} /></Stack.Navigator>;
}
function AccountStack() {
  return <Stack.Navigator screenOptions={options}><Stack.Screen name="AdminAccount" component={AdminAccountScreen} /><Stack.Screen name="AdminCompanies" component={AdminCompaniesScreen} /></Stack.Navigator>;
}

const tabs = {
  AdminHomeTab: ['Home', 'home', HomeStack],
  AdminReviewsTab: ['Review', 'checkbox', ReviewsStack],
  AdminStudentsTab: ['Students', 'people', StudentsStack],
  AdminAccountTab: ['Account', 'person', AccountStack],
};

export default function AdminNavigator() {
  const insets = useSafeAreaInsets();
  const tabBarStyle = {
    borderTopColor: '#E2E8F0',
    height: 58 + insets.bottom,
    paddingTop: 5,
    paddingBottom: Math.max(insets.bottom, 5),
  };

  return (
    <Tab.Navigator
      initialRouteName="AdminHomeTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle,
        tabBarLabelStyle: { fontWeight: '700', fontSize: 10 },
        tabBarIcon: ({ color, focused, size }) => {
          const [, icon] = tabs[route.name];
          return <Ionicons name={`${icon}${focused ? '' : '-outline'}`} color={color} size={size || 22} />;
        },
      })}
    >
      {Object.entries(tabs).map(([name, [title, , component]]) => <Tab.Screen key={name} name={name} component={component} options={{ title }} />)}
    </Tab.Navigator>
  );
}
