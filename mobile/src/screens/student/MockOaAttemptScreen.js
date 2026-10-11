import TimedAssessmentAttempt from '../../components/TimedAssessmentAttempt';
import { mockOaApi } from '../../api';

async function loadMockOa(testId) {
  return mockOaApi.test(testId);
}

async function submitMockOa({ testId, answers, proctoring }) {
  // The website contract accepts only the protected test id, answers, and its
  // optional client-reported integrity context. Correct answers never enter
  // the mobile bundle or request until the server scores the attempt.
  return mockOaApi.submit({ testId, answers, proctoring });
}

export default function MockOaAttemptScreen({ navigation, route }) {
  return (
    <TimedAssessmentAttempt
      navigation={navigation}
      testId={route?.params?.testId}
      fallbackTitle={route?.params?.title || 'Mock OA'}
      loadAssessment={loadMockOa}
      submitAssessment={submitMockOa}
      resultRoute="MockOaResult"
      assessmentLabel="Mock OA"
      persistIntegrity
    />
  );
}
