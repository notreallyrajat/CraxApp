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

  if (loading && !refreshing) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#3B3D6B" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={{ width: 28 }} />
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B3D6B']} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {teachers.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={56} color="#cbd5e1" />
            <Text style={styles.emptyText}>No teachers found for your class</Text>
          </View>
        ) : (
          teachers.map(teacher => (
            <TouchableOpacity 
              key={teacher.id} 
              style={styles.card}
              onPress={() => router.push(`/(student)/chat/${teacher.id}` as any)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{teacher.name.charAt(0)}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{teacher.name}</Text>
                <Text style={styles.subjects}>{teacher.subjects.join(', ')}</Text>
              </View>
              <View style={styles.actionIcon}>
                <Ionicons name="chatbubble-ellipses" size={20} color="#3B3D6B" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    marginTop: Platform.OS === 'android' ? 50 : 60, 
    marginBottom: 10,
    paddingHorizontal: 20
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  backBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  
  content: { flex: 1, paddingHorizontal: 20 },
  
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#94a3b8', marginTop: 16, fontSize: 16, fontWeight: '500' },
  
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 3
  },
  avatar: { 
    width: 52, 
    height: 52, 
    borderRadius: 16, 
    backgroundColor: '#e0e7ff', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16 
  },
  avatarText: { color: '#3B3D6B', fontSize: 22, fontWeight: '800' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  subjects: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center'
  }
});
