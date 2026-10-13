/**
 * Route persisted inbox links (and validated remote-push payload links) to
 * their native equivalents. The caller is responsible for ensuring a matching
 * authenticated role navigator is mounted before invoking this function.
 * Returns true when a supported native target was selected.
 */
export function navigateFromInboxLink(navigation, link) {
  const target = String(link || '');

  if (target.includes('/student/applications')) {
    navigation.navigate('StudentApp', { screen: 'JobsTab', params: { screen: 'Applications' } });
  } else if (target.includes('/student/jobs')) {
    navigation.navigate('StudentApp', { screen: 'JobsTab', params: { screen: 'JobsList' } });
  } else if (target.includes('/student/aptitude')) {
    navigation.navigate('StudentApp', { screen: 'PracticeTab', params: { screen: 'AptitudeTests' } });
  } else if (target.includes('/student/dsa')) {
    navigation.navigate('StudentApp', { screen: 'PracticeTab', params: { screen: 'DsaList' } });
  } else if (target.includes('/student')) {
    navigation.navigate('StudentApp', { screen: 'HomeTab' });
  } else if (target.includes('/recruiter/jobs')) {
    navigation.navigate('RecruiterApp', { screen: 'RecruiterJobsTab', params: { screen: 'RecruiterJobs' } });
  } else if (target.includes('/recruiter')) {
    navigation.navigate('RecruiterApp', { screen: 'RecruiterHomeTab', params: { screen: 'RecruiterDashboard' } });
  } else if (target.includes('/admin/job-approvals')) {
    navigation.navigate('AdminApp', { screen: 'AdminReviewsTab', params: { screen: 'AdminJobApprovals' } });
  } else if (target.includes('/admin/oa')) {
    navigation.navigate('AdminApp', { screen: 'AdminReviewsTab', params: { screen: 'AdminOaReviews' } });
  } else if (target.includes('/admin/students')) {
    navigation.navigate('AdminApp', { screen: 'AdminStudentsTab', params: { screen: 'AdminStudents' } });
  } else if (target.includes('/admin/reports')) {
    navigation.navigate('AdminApp', { screen: 'AdminHomeTab', params: { screen: 'AdminReports' } });
  } else if (target.includes('/admin')) {
    navigation.navigate('AdminApp', { screen: 'AdminHomeTab', params: { screen: 'AdminDashboard' } });
  } else {
    return false;
  }
  return true;
}
