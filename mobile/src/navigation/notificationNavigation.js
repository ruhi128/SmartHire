/**
 * Route persisted inbox links and validated push links to native screens.
 * Only route absolute site paths for the current authenticated role; links in
 * the database are not a reason to mount another role's navigation tree.
 * The caller ensures the matching authenticated navigator is mounted.
 */
export function navigateFromInboxLink(navigation, link, role) {
  if (!navigation || typeof navigation.navigate !== 'function') return false;
  const target = String(link || '').split(/[?#]/, 1)[0];
  if (role === 'student' && /^\/student(?:\/|$)/.test(target)) {
    if (target.startsWith('/student/applications')) {
      navigation.navigate('StudentApp', { screen: 'JobsTab', params: { screen: 'Applications' } });
    } else if (target.startsWith('/student/jobs')) {
      navigation.navigate('StudentApp', { screen: 'JobsTab', params: { screen: 'JobsList' } });
    } else if (target.startsWith('/student/aptitude')) {
      navigation.navigate('StudentApp', { screen: 'PracticeTab', params: { screen: 'AptitudeTests' } });
    } else if (target.startsWith('/student/dsa')) {
      navigation.navigate('StudentApp', { screen: 'PracticeTab', params: { screen: 'DsaList' } });
    } else {
      navigation.navigate('StudentApp', { screen: 'HomeTab' });
    }
  } else if (role === 'recruiter' && /^\/recruiter(?:\/|$)/.test(target)) {
    if (target.startsWith('/recruiter/jobs')) {
      navigation.navigate('RecruiterApp', { screen: 'RecruiterJobsTab', params: { screen: 'RecruiterJobs' } });
    } else {
      navigation.navigate('RecruiterApp', { screen: 'RecruiterHomeTab', params: { screen: 'RecruiterDashboard' } });
    }
  } else if (role === 'admin' && /^\/admin(?:\/|$)/.test(target)) {
    if (target.startsWith('/admin/job-approvals')) {
      navigation.navigate('AdminApp', { screen: 'AdminReviewsTab', params: { screen: 'AdminJobApprovals' } });
    } else if (target.startsWith('/admin/oa')) {
      navigation.navigate('AdminApp', { screen: 'AdminReviewsTab', params: { screen: 'AdminOaReviews' } });
    } else if (target.startsWith('/admin/students')) {
      navigation.navigate('AdminApp', { screen: 'AdminStudentsTab', params: { screen: 'AdminStudents' } });
    } else if (target.startsWith('/admin/reports')) {
      navigation.navigate('AdminApp', { screen: 'AdminHomeTab', params: { screen: 'AdminReports' } });
    } else {
      navigation.navigate('AdminApp', { screen: 'AdminHomeTab', params: { screen: 'AdminDashboard' } });
    }
  } else {
    return false;
  }
  return true;
}
