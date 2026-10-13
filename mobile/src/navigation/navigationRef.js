import { createNavigationContainerRef } from '@react-navigation/native';

// A single imperative ref lets a notification response be queued outside a
// screen and then routed only after the authenticated role navigator mounts.
export const navigationRef = createNavigationContainerRef();
