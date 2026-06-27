import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // 1. Check current session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        const errorMessage = error.message?.toLowerCase() || '';
        if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
          router.replace('/network-error');
        } else if (errorMessage.includes('database') || errorMessage.includes('connection')) {
          router.replace('/database-error');
        }
      }
      setSession(session);
      setIsLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isLoginPage = segments[0] === 'login';
    const isErrorPage = segments[0] === 'network-error' || segments[0] === 'database-error';
    
    if (!session && !isLoginPage && !inAuthGroup && !isErrorPage) {
      // Redirect to login if not authenticated
      router.replace('/login');
    } else if (session && (isLoginPage || segments.length === 0)) {
      // Redirect to appropriate dashboard if already logged in
      checkRoleAndRedirect(session.user.id);
    }
  }, [session, isLoading, segments]);

  const checkRoleAndRedirect = async (userId: string) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', userId)
        .single();

      if (profileError || !profile) {
        router.replace('/login');
        return;
      }

      const { data: roleRow, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('profile_id', profile.id)
        .single();

      if (roleError || !roleRow) {
        router.replace('/login');
        return;
      }

      const role = roleRow.role;
      if (role === 'admin') router.replace('/(admin)');
      else if (role === 'teacher') router.replace('/(teacher)');
      else if (role === 'student') router.replace('/(student)');
      else router.replace('/login');
    } catch (e: any) {
      console.error("Navigation error:", e);
      const errorMessage = String(e?.message || e).toLowerCase();
      if (errorMessage.includes('fetch') || errorMessage.includes('network request failed')) {
        router.replace('/network-error');
      } else if (errorMessage.includes('database') || errorMessage.includes('connection') || e?.code === 'PGRST') {
        router.replace('/database-error');
      } else {
        router.replace('/login');
      }
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fc' }}>
        <ActivityIndicator size="large" color="#1a1d2e" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Slot />
    </GestureHandlerRootView>
  );
}
