import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { getMessagesBetween, sendMessage, subscribeToMessages } from '../../../lib/services/chat';

export default function TeacherChatDetailScreen() {
  const { id: studentProfileId } = useLocalSearchParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [studentName, setStudentName] = useState('Student');
  
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('auth_user_id', session.user.id)
        .single();
      
      setMyProfile(profile);

      const { data: sProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', studentProfileId)
        .single();
      
      if (sProfile) setStudentName(sProfile.full_name);

      if (profile) {
        const { data } = await getMessagesBetween(profile.id, studentProfileId as string);
        setMessages(data || []);
        setLoading(false);
        
        // Subscribe to incoming messages
        const subscription = subscribeToMessages(profile.id, (payload) => {
          if (payload.new.sender_id === studentProfileId) {
            setMessages(prev => [...prev, payload.new]);
          }
        });

        return () => {
          subscription.unsubscribe();
        };
      }
    }
    init();
  }, [studentProfileId]);

  const handleSend = async () => {
    if (!inputText.trim() || !myProfile || sending) return;

    setSending(true);
    const content = inputText.trim();
    setInputText('');

    try {
      const { data, error } = await sendMessage(myProfile.id, studentProfileId as string, content);
      if (error) throw error;
      setMessages(prev => [...prev, data]);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to send message.");
      setInputText(content);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a1d2e" /></View>;
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{studentName}</Text>
          <Text style={styles.headerSub}>Active Now</Text>
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.chatArea}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={{ paddingVertical: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => {
          const isMine = msg.sender_id === myProfile?.id;
          return (
            <View key={msg.id} style={[styles.msgWrapper, isMine ? styles.myMsgWrapper : styles.theirMsgWrapper]}>
              <View style={[styles.msgBubble, isMine ? styles.myMsgBubble : styles.theirMsgBubble]}>
                <Text style={[styles.msgText, isMine ? styles.myMsgText : styles.theirMsgText]}>
                  {msg.content}
                </Text>
                <Text style={[styles.msgTime, isMine ? styles.myMsgTime : styles.theirMsgTime]}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.inputContainer}>
        <View style={styles.inputArea}>
          <TextInput 
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]} 
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  header: { 
    backgroundColor: '#fff', 
    paddingTop: Platform.OS === 'android' ? 50 : 20, 
    paddingBottom: 20, 
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 15
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8F9FE', justifyContent: 'center', alignItems: 'center'
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  headerSub: { fontSize: 12, color: '#10B981', fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FE' },
  chatArea: { flex: 1, paddingHorizontal: 20 },
  msgWrapper: { marginBottom: 15, flexDirection: 'row' },
  myMsgWrapper: { justifyContent: 'flex-end' },
  theirMsgWrapper: { justifyContent: 'flex-start' },
  msgBubble: { maxWidth: '80%', padding: 15, borderRadius: 24, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  myMsgBubble: { backgroundColor: '#4F46E5', borderBottomRightRadius: 6 },
  theirMsgBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 6 },
  msgText: { fontSize: 15, lineHeight: 22 },
  myMsgText: { color: '#fff' },
  theirMsgText: { color: '#334155' },
  msgTime: { fontSize: 10, marginTop: 6, alignSelf: 'flex-end', fontWeight: '500' },
  myMsgTime: { color: 'rgba(255,255,255,0.7)' },
  theirMsgTime: { color: '#94A3B8' },
  inputContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  inputArea: { 
    flexDirection: 'row', 
    backgroundColor: '#F8F9FE', 
    borderRadius: 24, 
    paddingHorizontal: 5,
    paddingVertical: 5,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  input: { flex: 1, minHeight: 40, maxHeight: 100, paddingHorizontal: 15, paddingTop: 10, paddingBottom: 10, fontSize: 15, color: '#1e293b' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  sendBtnDisabled: { backgroundColor: '#CBD5E1' }
});
