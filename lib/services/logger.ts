import { supabase } from '../supabase';
import { Platform } from 'react-native';

/**
 * Logs user activity to the Supabase activity_logs table.
 * @param action - The action performed (e.g., 'login', 'view_dashboard')
 * @param module - The part of the app where the action happened (e.g., 'admin_panel', 'student_app')
 */
export async function logActivity(action: string, module: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // 1. Get the internal profile ID for the current auth user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', session.user.id)
      .single();

    if (profileError || !profile) {
      console.warn("Could not find profile for logging:", profileError);
      return;
    }

    // 2. Insert the log entry
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        user_id: session.user.id,
        profile_id: profile.id,
        action,
        module,
        device_info: {
          os: Platform.OS,
          version: Platform.Version,
          is_mobile: true,
          model: Platform.constants?.Model || 'Unknown'
        }
      });

    if (logError) {
      console.error("Database log error:", logError);
    }
  } catch (err) {
    // Silent fail for logger - we don't want to break the app if logging fails
    console.error("Activity logging failed:", err);
  }
}

export async function getActivityLogs() {
  return supabase
    .from('admin_activity_view')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
}
