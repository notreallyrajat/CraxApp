import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';

export function useRoleGuard(requiredRole: 'admin' | 'teacher' | 'student') {
  const segments = useSegments();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkAccess() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          if (isMounted) {
            setIsAuthorized(false);
            router.replace('/login');
          }
          return;
        }

        // Get user role
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('auth_user_id', session.user.id)
          .single();

        if (!profile) throw new Error('Profile not found');

        const { data: roleRow } = await supabase
          .from('user_roles')
          .select('role')
          .eq('profile_id', profile.id)
          .single();

        const userRole = roleRow?.role;

        if (userRole !== requiredRole) {
          if (isMounted) {
            console.warn(`Unauthorized access attempt to ${requiredRole} area by ${userRole}`);
            setIsAuthorized(false);
            // Redirect to their actual role dashboard or login
            if (userRole === 'admin') router.replace('/(admin)');
            else if (userRole === 'teacher') router.replace('/(teacher)');
            else if (userRole === 'student') router.replace('/(student)');
            else router.replace('/login');
          }
        } else {
          if (isMounted) setIsAuthorized(true);
        }
      } catch (error) {
        console.error('Role guard error:', error);
        if (isMounted) {
          setIsAuthorized(false);
          router.replace('/login');
        }
      }
    }

    checkAccess();
    return () => { isMounted = false; };
  }, [segments, requiredRole]);

  return { isAuthorized };
}
