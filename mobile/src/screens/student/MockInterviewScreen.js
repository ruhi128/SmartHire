import { LaptopRequiredNotice, LAPTOP_FEATURES } from '../../components/LaptopRequired';

// Retain the old route for stale links, but never start or save an interview
// session on the phone. Past sessions are available in InterviewHub.
export default function MockInterviewScreen({ navigation }) {
  return <LaptopRequiredNotice feature={LAPTOP_FEATURES.mockInterview} navigation={navigation} />;
}
