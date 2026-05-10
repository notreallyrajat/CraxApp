import { supabase } from '../supabase';

export type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  sender_profile?: { full_name: string };
};

export async function sendMessage(senderId: string, receiverId: string, content: string) {
  return supabase
    .from('messages')
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      content: content,
      is_read: false
    })
    .select()
    .single();
}

export async function getMessagesBetween(userId1: string, userId2: string) {
  return supabase
    .from('messages')
    .select(`
      *,
      sender_profile:profiles!sender_id(full_name)
    `)
    .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
    .order('created_at', { ascending: true });
}

export async function markAsRead(messageIds: string[]) {
  if (messageIds.length === 0) return;
  return supabase
    .from('messages')
    .update({ is_read: true })
    .in('id', messageIds);
}

export function subscribeToMessages(userId: string, onMessage: (payload: any) => void) {
  return supabase
    .channel('realtime:messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${userId}`
      },
      onMessage
    )
    .subscribe();
}

export async function getChatLogsForAdmin() {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!sender_id(full_name),
      receiver:profiles!receiver_id(full_name)
    `)
    .order('created_at', { ascending: false });
    
  if (error) console.error("Admin chat logs error:", error);
  return { data, error };
}
