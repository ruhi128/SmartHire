import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import StudentDashboardScreen from '../screens/student/StudentDashboardScreen';
import JobsListScreen from '../screens/student/JobsListScreen';
import JobDetailScreen from '../screens/student/JobDetailScreen';
import ApplicationsScreen from '../screens/student/ApplicationsScreen';
import PracticeHubScreen from '../screens/student/PracticeHubScreen';
import AptitudeTestsScreen from '../screens/student/AptitudeTestsScreen';
import AptitudeAttemptScreen from '../screens/student/AptitudeAttemptScreen';
import AptitudeResultScreen from '../screens/student/AptitudeResultScreen';
import DsaListScreen from '../screens/student/DsaListScreen';
import DsaProblemScreen from '../screens/student/DsaProblemScreen';
import DsaPerformanceScreen from '../screens/student/DsaPerformanceScreen';
import MockOaListScreen from '../screens/student/MockOaListScreen';
import MockOaAttemptScreen from '../screens/student/MockOaAttemptScreen';
import MockOaResultScreen from '../screens/student/MockOaResultScreen';
import CompanyOaListScreen from '../screens/student/CompanyOaListScreen';
import CompanyOaAttemptScreen from '../screens/student/CompanyOaAttemptScreen';
import CompanyOaResultScreen from '../screens/student/CompanyOaResultScreen';
import AtsGuideScreen from '../screens/student/AtsGuideScreen';
import InterviewHubScreen from '../screens/student/InterviewHubScreen';
import MockInterviewScreen from '../screens/student/MockInterviewScreen';
import InterviewResultScreen from '../screens/student/InterviewResultScreen';
import InterviewSessionDetailScreen from '../screens/student/InterviewSessionDetailScreen';
import ProfileScreen from '../screens/student/ProfileScreen';
import ResumeBuilderScreen from '../screens/student/ResumeBuilderScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const stackOptions = { headerShown: false, animation: 'slide_from_right' };

function HomeStack() {
  return <Stack.Navigator screenOptions={stackOptions}><Stack.Screen name="StudentDashboard" component={StudentDashboardScreen} /></Stack.Navigator>;
}
function JobsStack() {
  return <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="JobsList" component={JobsListScreen} />
    <Stack.Screen name="JobDetail" component={JobDetailScreen} />
    <Stack.Screen name="Applications" component={ApplicationsScreen} />
  </Stack.Navigator>;
}
function PracticeStack() {
  return <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="PracticeHub" component={PracticeHubScreen} />
    <Stack.Screen name="AptitudeTests" component={AptitudeTestsScreen} />
    {/* Timed assessment routes run natively and share protected server-side
        scoring contracts; no answer keys are sent to the client before submit. */}
    <Stack.Screen name="AptitudeAttempt" component={AptitudeAttemptScreen} />
    <Stack.Screen name="AptitudeResult" component={AptitudeResultScreen} />
    <Stack.Screen name="DsaList" component={DsaListScreen} />
    <Stack.Screen name="DsaProblem" component={DsaProblemScreen} />
    <Stack.Screen name="DsaPerformance" component={DsaPerformanceScreen} />
    <Stack.Screen name="MockOaList" component={MockOaListScreen} />
    <Stack.Screen name="MockOaAttempt" component={MockOaAttemptScreen} />
    <Stack.Screen name="MockOaResult" component={MockOaResultScreen} />
    <Stack.Screen name="CompanyOaList" component={CompanyOaListScreen} />
    <Stack.Screen name="CompanyOaAttempt" component={CompanyOaAttemptScreen} />
    <Stack.Screen name="CompanyOaResult" component={CompanyOaResultScreen} />
    <Stack.Screen name="AtsGuidance" component={AtsGuideScreen} />
    <Stack.Screen name="InterviewHub" component={InterviewHubScreen} />
    <Stack.Screen name="MockInterview" component={MockInterviewScreen} />
    <Stack.Screen name="InterviewResult" component={InterviewResultScreen} />
    <Stack.Screen name="InterviewSessionDetail" component={InterviewSessionDetailScreen} />
  </Stack.Navigator>;
}
function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="ResumeBuilder" component={ResumeBuilderScreen} />
    </Stack.Navigator>
  );
}
const tabMeta = {
  HomeTab: ['Home', 'home'],
  JobsTab: ['Jobs', 'briefcase'],
  PracticeTab: ['Practice', 'school'],
  ProfileTab: ['Profile', 'person'],
};

export default function StudentNavigator() {
  const insets = useSafeAreaInsets();
  const tabBarStyle = {
    borderTopColor: '#E2E8F0',
    height: 58 + insets.bottom,
    paddingTop: 5,
    paddingBottom: Math.max(insets.bottom, 5),
  };

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle,
        tabBarLabelStyle: { fontWeight: '700', fontSize: 11 },
        tabBarIcon: ({ color, focused, size }) => {
          const [, icon] = tabMeta[route.name];
          return <Ionicons name={`${icon}${focused ? '' : '-outline'}`} size={size || 22} color={color} />;
        },
      })}
    >
      {Object.entries(tabMeta).map(([name, [title]]) => {
        const component = { HomeTab: HomeStack, JobsTab: JobsStack, PracticeTab: PracticeStack, ProfileTab: ProfileStack }[name];
        return <Tab.Screen key={name} name={name} component={component} options={{ title }} />;
      })}
    </Tab.Navigator>
  );
}
