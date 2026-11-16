import { LaptopRequiredNotice, LAPTOP_FEATURES } from '../../components/LaptopRequired';

// Laptop-only: Mock OA attempts are taken on the SmartHire website (see
// MockOaListScreen). This route stays registered so old links/bookmarks land
// on an explanation instead of starting a timed attempt on the phone.
export default function MockOaAttemptScreen({ navigation }) {
  return <LaptopRequiredNotice feature={LAPTOP_FEATURES.mockOa} navigation={navigation} />;
}
