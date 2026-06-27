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
  Alert,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { getMessagesBetween, sendMessage, subscribeToMessages } from '../../../lib/services/chat';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StudentChatDetailScreen() {
  const { id: teacherProfileId } = useLocalSearchParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [teacherName, setTeacherName] = useState('Chat');
  
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  useEffect(() => {
    let subscription: any;

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('auth_user_id', session.user.id)
        .single();
      
      setMyProfile(profile);

      const { data: tProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', teacherProfileId)
        .single();
      
      if (tProfile) setTeacherName(tProfile.full_name);

      if (profile) {
        const { data } = await getMessagesBetween(profile.id, teacherProfileId as string);
        setMessages(data || []);
        setLoading(false);
        
        // Subscribe
        subscription = subscribeToMessages(profile.id, (payload) => {
          if (payload.new.sender_id === teacherProfileId) {
            setMessages(prev => [...prev, payload.new]);
          }
        });
      }
    }
    init();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [teacherProfileId]);

  const handleSend = async () => {
    if (!inputText.trim() || !myProfile || sending) return;

    setSending(true);
    const content = inputText.trim();
    setInputText('');

    try {
      const { data, error } = await sendMessage(myProfile.id, teacherProfileId as string, content);
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
    return <View style={styles.center}><ActivityIndicator size="large" color="#3B3D6B" /></View>;
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{teacherName}</Text>
          <Text style={styles.headerSub}>Online</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{teacherName.charAt(0)}</Text>
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.chatArea}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: 16 }}
      >
        {messages.map((msg, index) => {
          const isMine = msg.sender_id === myProfile?.id;
          const showAvatar = !isMine && (index === messages.length - 1 || messages[index + 1]?.sender_id === myProfile?.id);

          return (
            <View key={msg.id} style={[styles.msgWrapper, isMine ? styles.myMsgWrapper : styles.theirMsgWrapper]}>
              {!isMine && (
                <View style={styles.msgAvatarContainer}>
                  {showAvatar ? (
                    <View style={styles.msgAvatar}>
                      <Text style={styles.msgAvatarText}>{teacherName.charAt(0)}</Text>
                    </View>
                  ) : <View style={{ width: 28, marginRight: 8 }} />}
                </View>
              )}
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

      <View style={[styles.inputContainer, { paddingBottom: (Platform.OS === 'ios' && isKeyboardVisible) ? Math.max(insets.bottom, 16) : Math.max(insets.bottom, 16) + 75 }]}>
        <View style={styles.inputWrapper}>
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
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 3 }} />}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FE',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  headerSub: { fontSize: 12, color: '#10b981', fontWeight: '600', marginTop: 2 },
  avatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 14, 
    backgroundColor: '#e0e7ff', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  avatarText: { color: '#3B3D6B', fontSize: 16, fontWeight: '800' },
  
  chatArea: { flex: 1 },
  msgWrapper: { marginBottom: 12, flexDirection: 'row', alignItems: 'flex-end' },
  myMsgWrapper: { justifyContent: 'flex-end' },
  theirMsgWrapper: { justifyContent: 'flex-start' },
  
  msgAvatarContainer: { justifyContent: 'flex-end', marginBottom: 2 },
  msgAvatar: { width: 28, height: 28, borderRadius: 10, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  msgAvatarText: { color: '#3B3D6B', fontSize: 12, fontWeight: '800' },
  
  msgBubble: { 
    maxWidth: '75%', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1
  },
  myMsgBubble: { backgroundColor: '#3B3D6B', borderBottomRightRadius: 4 },
  theirMsgBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  
  msgText: { fontSize: 15, lineHeight: 22 },
  myMsgText: { color: '#fff' },
  theirMsgText: { color: '#0f172a' },
  
  msgTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  myMsgTime: { color: 'rgba(255,255,255,0.7)' },
  theirMsgTime: { color: '#94a3b8' },
  
  inputContainer: { 
    padding: 16, 
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F8F9FE',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  input: { 
    flex: 1, 
    fontSize: 15, 
    maxHeight: 100,
    color: '#0f172a',
    paddingTop: 8,
    paddingBottom: 8
  },
  sendBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#3B3D6B', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginLeft: 12,
    marginBottom: 2
  },
  sendBtnDisabled: { backgroundColor: '#cbd5e1' }
});
