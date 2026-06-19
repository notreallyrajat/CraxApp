import React from 'react';
import { Stack } from 'expo-router';

export default function AllotmentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="generate" />
      <Stack.Screen name="view" />
    </Stack>
  );
}
