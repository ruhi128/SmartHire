import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import RecruiterDashboardScreen from '../screens/recruiter/RecruiterDashboardScreen';
import RecruiterJobsScreen from '../screens/recruiter/RecruiterJobsScreen';
import PostJobScreen from '../screens/recruiter/PostJobScreen';
import RecruiterApplicantsScreen from '../screens/recruiter/RecruiterApplicantsScreen';
import RecruiterOaScreen from '../screens/recruiter/RecruiterOaScreen';
import CreateCompanyOaScreen from '../screens/recruiter/CreateCompanyOaScreen';
import RecruiterAccountScreen from '../screens/recruiter/RecruiterAccountScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const options = { headerShown: false, animation: 'slide_from_right' };

function HomeStack() {
  return <Stack.Navigator screenOptions={options}><Stack.Screen name="RecruiterDashboard" component={RecruiterDashboardScreen} /><Stack.Screen name="PostJob" component={PostJobScreen} /><Stack.Screen name="RecruiterJobs" component={RecruiterJobsScreen} /><Stack.Screen name="RecruiterApplicants" component={RecruiterApplicantsScreen} /><Stack.Screen name="RecruiterOa" component={RecruiterOaScreen} /><Stack.Screen name="CreateCompanyOa" component={CreateCompanyOaScreen} /></Stack.Navigator>;
}
function JobsStack() {
  return <Stack.Navigator screenOptions={options}><Stack.Screen name="RecruiterJobs" component={RecruiterJobsScreen} /><Stack.Screen name="PostJob" component={PostJobScreen} /><Stack.Screen name="RecruiterApplicants" component={RecruiterApplicantsScreen} /></Stack.Navigator>;
}
function OaStack() {
  return <Stack.Navigator screenOptions={options}><Stack.Screen name="RecruiterOa" component={RecruiterOaScreen} /><Stack.Screen name="CreateCompanyOa" component={CreateCompanyOaScreen} /></Stack.Navigator>;
}
function AccountStack() {
  return <Stack.Navigator screenOptions={options}><Stack.Screen name="RecruiterAccount" component={RecruiterAccountScreen} /></Stack.Navigator>;
}

const tabs = {
  RecruiterHomeTab: ['Home', 'home', HomeStack],
  RecruiterJobsTab: ['Jobs', 'briefcase', JobsStack],
  RecruiterOaTab: ['Company OA', 'document-text', OaStack],
  RecruiterAccountTab: ['Account', 'person', AccountStack],
};

export default function RecruiterNavigator() {
  const insets = useSafeAreaInsets();
  const tabBarStyle = {
    borderTopColor: '#E2E8F0',
    height: 58 + insets.bottom,
    paddingTop: 5,
    paddingBottom: Math.max(insets.bottom, 5),
  };

  return (
    <Tab.Navigator
      initialRouteName="RecruiterHomeTab"
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
