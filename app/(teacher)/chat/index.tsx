import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Platform,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { getTeacherProfile, getStudentsForTeacher } from '../../../lib/services/teacher';
import { useRouter } from 'expo-router';

export default function TeacherChatListScreen() {
  const [students, setStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: profile } = await getTeacherProfile(session.user.id);
      if (profile?.teachers) {
        const { data } = await getStudentsForTeacher(profile.teachers.id);
        
        const grouped: Record<string, any> = {};
        (data || []).forEach((item: any) => {
          if (!item.students?.profiles) return;
          const sid = item.students.profiles.id;
          if (!grouped[sid]) {
            grouped[sid] = {
              id: sid,
              name: item.students.profiles.full_name,
              admissionNo: item.students.admission_no,
              className: item.classes?.name,
              sectionName: item.sections?.name
            };
          }
        });
        
        const list = Object.values(grouped);
        setStudents(list);
        setFilteredStudents(list);
      }
    } catch (error) {
      console.error("Error loading students for chat:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const filtered = students.filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase()) || 
      s.admissionNo.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredStudents(filtered);
  }, [search, students]);

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
        <Text style={styles.headerTitle}>Student Chats</Text>
        <Text style={styles.headerSub}>Communicate with your students</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search by name or admission no..." 
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a1d2e']} />}
      >
        {filteredStudents.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No students found.</Text>
          </View>
        ) : (
          filteredStudents.map(student => (
            <TouchableOpacity 
              key={student.id} 
              style={styles.studentCard}
              onPress={() => router.push(`/(teacher)/chat/${student.id}` as any)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{student.name.charAt(0)}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{student.name}</Text>
                <Text style={styles.meta}>{student.className} • {student.admissionNo}</Text>
              </View>
              <Ionicons name="chatbubble-ellipses-outline" size={24} color="#1a1d2e" />
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
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: 15 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 15, height: 45 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1a1d2e' },
  content: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#94A3B8', marginTop: 15, fontSize: 15, fontWeight: '600' },
  studentCard: { 
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
  avatar: { width: 50, height: 50, borderRadius: 18, backgroundColor: '#E8EAF6', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#3F51B5', fontSize: 20, fontWeight: '800' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#1a1d2e' },
  meta: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '600' }
});
