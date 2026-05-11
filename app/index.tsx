import { Redirect } from 'expo-router';

export default function Index() {
  // The logic in _layout.tsx will handle the session check and redirect.
  // This file serves as a stable entry point for the router.
  return <Redirect href="/login" />;
}
