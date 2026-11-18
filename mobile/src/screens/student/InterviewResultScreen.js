import { useEffect } from 'react';
import { LaptopRequiredNotice, LAPTOP_FEATURES } from '../../components/LaptopRequired';

// Older links may target the former phone interview result with client-supplied
// scores. Only a server-saved session ID can now open a read-only result.
export default function InterviewResultScreen({ navigation, route }) {
  const sessionId = route.params?.sessionId;
  useEffect(() => {
    if (sessionId) navigation.replace('InterviewSessionDetail', { sessionId });
  }, [navigation, sessionId]);
  return <LaptopRequiredNotice feature={LAPTOP_FEATURES.mockInterview} navigation={navigation} />;
}
