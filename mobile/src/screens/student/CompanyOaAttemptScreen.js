import { LaptopRequiredNotice, LAPTOP_FEATURES } from '../../components/LaptopRequired';

// Laptop-only: official Company OA attempts are taken on the SmartHire
// website (see CompanyOaListScreen). This route stays registered so old
// links/bookmarks land on an explanation instead of consuming the student's
// single attempt on the phone.
export default function CompanyOaAttemptScreen({ navigation }) {
  return <LaptopRequiredNotice feature={LAPTOP_FEATURES.companyOa} navigation={navigation} />;
}
