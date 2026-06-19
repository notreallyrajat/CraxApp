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
    } catch (error) {
      Alert.alert("Error", "Failed to send message.");
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
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

      <View style={styles.inputArea}>
        <TextInput 
          style={styles.input}
          placeholder="Type a message..."
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity 
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]} 
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  header: { 
    backgroundColor: '#1a1d2e', 
    paddingTop: Platform.OS === 'android' ? 40 : 15, 
    paddingBottom: 15, 
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 11, color: '#4CAF50', fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chatArea: { flex: 1, paddingHorizontal: 15 },
  msgWrapper: { marginBottom: 10, flexDirection: 'row' },
  myMsgWrapper: { justifyContent: 'flex-end' },
  theirMsgWrapper: { justifyContent: 'flex-start' },
  msgBubble: { maxWidth: '80%', padding: 12, borderRadius: 18 },
  myMsgBubble: { backgroundColor: '#1a1d2e', borderBottomRightRadius: 4 },
  theirMsgBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15 },
  myMsgText: { color: '#fff' },
  theirMsgText: { color: '#1a1d2e' },
  msgTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  myMsgTime: { color: 'rgba(255,255,255,0.6)' },
  theirMsgTime: { color: '#94A3B8' },
  inputArea: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', alignItems: 'flex-end', gap: 10 },
  input: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#1a1d2e', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#CBD5E1' }
});
