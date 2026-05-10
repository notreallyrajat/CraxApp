import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Platform,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getChatLogsForAdmin } from '../../lib/services/chat';

export default function AdminChatLogsScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLogs = async () => {
    const { data } = await getChatLogsForAdmin();
    setLogs(data || []);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadLogs();
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a1d2e" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Communication Logs</Text>
        <Text style={styles.headerSub}>Monitor teacher-student interactions</Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a1d2e']} />}
      >
        {logs.map(log => (
          <View key={log.id} style={styles.logCard}>
            <View style={styles.logHeader}>
              <View style={styles.participant}>
                <Text style={styles.roleLabel}>SENDER</Text>
                <Text style={styles.name}>{log.sender?.full_name}</Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color="#CBD5E1" />
              <View style={styles.participant}>
                <Text style={styles.roleLabel}>RECEIVER</Text>
                <Text style={styles.name}>{log.receiver?.full_name}</Text>
              </View>
            </View>
            
            <View style={styles.msgBody}>
              <Text style={styles.msgText}>{log.content}</Text>
              <Text style={styles.msgTime}>{new Date(log.created_at).toLocaleString()}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { 
    backgroundColor: '#1a1d2e', 
    paddingTop: Platform.OS === 'android' ? 40 : 15, 
    paddingBottom: 25, 
    paddingHorizontal: 20 
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  content: { flex: 1, padding: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logCard: { backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 12, elevation: 1 },
  logHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  participant: { flex: 1 },
  roleLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8', marginBottom: 2 },
  name: { fontSize: 13, fontWeight: '700', color: '#1a1d2e' },
  msgBody: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12 },
  msgText: { fontSize: 14, color: '#475569', lineHeight: 20 },
  msgTime: { fontSize: 10, color: '#94A3B8', marginTop: 8, textAlign: 'right' }
});
