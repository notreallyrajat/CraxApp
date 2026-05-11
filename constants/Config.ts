import { Platform } from 'react-native';

/**
 * For local development:
 * - Android Emulator: 10.0.2.2
 * - iOS Simulator: localhost
 * - Real Device: Your machine's local IP
 */
const DEV_BACKEND_URL = Platform.select({
  android: 'http://192.168.29.249:3000',
  ios: 'http://192.168.29.249:3000',
  default: 'http://localhost:3000',
});

export const Config = {
  BACKEND_URL: process.env.EXPO_PUBLIC_API_URL || DEV_BACKEND_URL,
  SUPABASE_FUNCTIONS_URL: 'https://rfqspaxpycpxqhakuhup.supabase.co/functions/v1',
};
