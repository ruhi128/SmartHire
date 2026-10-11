import TimedAssessmentAttempt from '../../components/TimedAssessmentAttempt';
import { companyOaApi } from '../../api';

async function loadCompanyOa(testId) {
  return companyOaApi.take(testId);
}

async function submitCompanyOa({ testId, answers, timeTaken, autoSubmitted }) {
  return companyOaApi.attempt(testId, { answers, timeTaken, autoSubmitted });
}

export default function CompanyOaAttemptScreen({ navigation, route }) {
  return (
    <TimedAssessmentAttempt
      navigation={navigation}
      testId={route?.params?.testId}
      fallbackTitle={route?.params?.title || 'Company OA'}
      loadAssessment={loadCompanyOa}
      submitAssessment={submitCompanyOa}
      resultRoute="CompanyOaResult"
      assessmentLabel="Company OA"
    />
  );
}
