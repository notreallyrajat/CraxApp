import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { View, ActivityIndicator } from 'react-native';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    // Check if we're in the (auth) group or on the login page directly
    const isLoginPage = segments[0] === 'login';
    
    if (!session && !isLoginPage) {
      // Not logged in, and trying to access a protected screen
      router.replace('/login');
    } else if (session && isLoginPage) {
      // Logged in, but stuck on login page -> check role and redirect
      checkRoleAndRedirect(session.user.id);
    } else if (session && segments.length === 0) {
      // Logged in, and at the root `/` -> check role and redirect
      checkRoleAndRedirect(session.user.id);
    }
  }, [session, isLoading, segments]);

  const checkRoleAndRedirect = async (userId: string) => {
    try {
      // Find the profile using auth_user_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', userId)
        .single();

      if (profileError || !profile) {
        console.error("Profile not found:", profileError);
        router.replace('/login');
        return;
      }

      // Find the role using profile_id
      const { data: roleRow, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('profile_id', profile.id)
        .single();

      if (roleError || !roleRow) {
        console.error("Role not found:", roleError);
        router.replace('/login');
        return;
      }

      const role = roleRow.role;

      if (role === 'admin') router.replace('/(admin)');
      else if (role === 'teacher') router.replace('/(teacher)');
      else if (role === 'student') router.replace('/(student)');
      else router.replace('/login'); // Fallback
    } catch (e) {
      console.error("Error fetching role", e);
      router.replace('/login');
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fc' }}>
        <ActivityIndicator size="large" color="#1a1d2e" />
      </View>
    );
  }

  return <Slot />;
}
