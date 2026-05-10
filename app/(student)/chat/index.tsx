import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { getStudentProfile, getTeachersForStudent } from '../../../lib/services/student';
import { useRouter } from 'expo-router';

export default function StudentChatListScreen() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: profile } = await getStudentProfile(session.user.id);
      if (profile?.students) {
        const { data } = await getTeachersForStudent(profile.students.id);
        
        // Group by teacher to avoid duplicates if teacher handles multiple subjects
        const grouped: Record<string, any> = {};
        (data || []).forEach((item: any) => {
          if (!item.teachers?.profiles) return;
          const tid = item.teachers.profiles.id;
          if (!grouped[tid]) {
            grouped[tid] = {
              id: tid,
              name: item.teachers.profiles.full_name,
              email: item.teachers.profiles.email,
              subjects: [item.subjects?.name]
            };
          } else {
            if (!grouped[tid].subjects.includes(item.subjects?.name)) {
              grouped[tid].subjects.push(item.subjects?.name);
            }
          }
        });
        
        setTeachers(Object.values(grouped));
      }
    } catch (error) {
      console.error("Error loading teachers for chat:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a1d2e" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Teachers</Text>
        </View>
        <Text style={styles.headerSub}>Select a teacher to start chatting</Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a1d2e']} />}
      >
        {teachers.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No teachers found for your class.</Text>
          </View>
        ) : (
          teachers.map(teacher => (
            <TouchableOpacity 
              key={teacher.id} 
              style={styles.teacherCard}
              onPress={() => router.push(`/(student)/chat/${teacher.id}` as any)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{teacher.name.charAt(0)}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{teacher.name}</Text>
                <Text style={styles.subjects}>{teacher.subjects.join(', ')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          ))
        )}
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
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 5 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  content: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#94A3B8', marginTop: 15, fontSize: 15, fontWeight: '600' },
  teacherCard: { 
    backgroundColor: '#fff', 
    borderRadius: 18, 
    padding: 15, 
    marginBottom: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5
  },
  avatar: { width: 45, height: 45, borderRadius: 15, backgroundColor: '#1a1d2e', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#1a1d2e' },
  subjects: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '600' }
});
