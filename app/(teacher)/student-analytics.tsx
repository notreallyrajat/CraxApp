import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  Platform,
  RefreshControl,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getAssignedClasses } from '../../lib/services/teacher';

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  header: { 
    paddingTop: Platform.OS === 'android' ? 50 : 60, 
    paddingBottom: 20, 
    paddingHorizontal: 20,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1e293b', marginLeft: 15, letterSpacing: -0.5 },
  filterSection: { marginBottom: 20 },
  classList: { flexDirection: 'row' },
  classPill: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 16, backgroundColor: '#fff', marginRight: 12, shadowColor: '#3B3D6B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  activePill: { backgroundColor: '#3B3D6B' },
  classLabel: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  activeLabel: { color: '#fff' },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    paddingHorizontal: 16, 
    height: 52,
    shadowColor: '#3B3D6B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2
  },
  searchInput: { flex: 1, marginLeft: 12, color: '#1e293b', fontSize: 15, fontWeight: '500' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  studentCard: { 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    padding: 18, 
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#3B3D6B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16
  },
  cardMain: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 2 },
  id: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
  stat: { width: '45%' },
  statLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', marginBottom: 8, letterSpacing: 0.5 },
  progressBg: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  statValue: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#64748b', fontSize: 15, fontWeight: '600', marginTop: 16 }
});

// ─── Components ────────────────────────────────────────────────────────────────

const AnalyticalStudentCard = React.memo(({ item, onPress }: { item: any, onPress: (id: string) => void }) => (
  <TouchableOpacity 
    style={styles.studentCard}
    onPress={() => onPress(item.id)}
  >
    <View style={styles.cardMain}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.fullName?.charAt(0)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.fullName}</Text>
        <Text style={styles.id}>ID: {item.admissionNo}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
    </View>

    <View style={styles.statsRow}>
      <View style={styles.stat}>
        <Text style={styles.statLabel}>ATTENDANCE</Text>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${item.attendance}%`, backgroundColor: item.attendance > 75 ? '#10B981' : '#F59E0B' }]} />
        </View>
        <Text style={styles.statValue}>{item.attendance}%</Text>
      </View>

      <View style={styles.stat}>
        <Text style={styles.statLabel}>PERFORMANCE</Text>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${item.performance}%`, backgroundColor: item.performance > 70 ? '#3B82F6' : '#EF4444' }]} />
        </View>
        <Text style={styles.statValue}>{item.performance}%</Text>
      </View>
    </View>
  </TouchableOpacity>
));

export default function StudentAnalyticsScreen() {
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      
      const { data: profile } = await supabase.from('profiles').select('teachers(id)').eq('auth_user_id', session.user.id).single();
      const teacherId = profile?.teachers?.[0]?.id || profile?.teachers?.id;
      
      if (!teacherId) {
        setLoading(false);
        return;
      }

      const classesRes = await getAssignedClasses(teacherId);
      let classData: any[] = [];
      
      if (classesRes.data) {
        const uniqueClasses = new Map();
        classesRes.data.forEach((c: any) => {
           if (!uniqueClasses.has(c.class_id) && c.classes) {
              uniqueClasses.set(c.class_id, { id: c.class_id, name: c.classes.name });
           }
        });
        classData = Array.from(uniqueClasses.values());
      }
      
      setClasses(classData);
      
      if (classData && classData.length > 0) {
        setSelectedClass(classData[0].id);
        await loadStudents(classData[0].id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const loadStudents = async (classId: string) => {
    setLoading(true);
    try {
      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select(`
          student_id,
          students (
            id,
            admission_no,
            profiles ( full_name, email )
          )
        `)
        .eq('class_id', classId);

      const studentIds = enrollmentData?.map(e => e.student_id) || [];
      if (studentIds.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      const [attData, marksData] = await Promise.all([
        supabase.from('attendance_records').select('student_id, status').in('student_id', studentIds),
        supabase.from('exam_results').select('student_id, marks_obtained, exam_subjects(total_marks)').in('student_id', studentIds)
      ]);

      const enrichedStudents = enrollmentData?.map(e => {
        const s = e.students as any;
        const studentAtt = (attData.data || []).filter(a => a.student_id === s.id);
        const attRate = studentAtt.length > 0 
          ? Math.round((studentAtt.filter(a => a.status === 'present').length / studentAtt.length) * 100) 
          : 0;

        const studentMarks = (marksData.data || []).filter(m => m.student_id === s.id);
        const avgScore = studentMarks.length > 0
          ? Math.round((studentMarks.reduce((acc, m) => {
              const obtained = parseFloat(m.marks_obtained);
              const total = parseFloat((m.exam_subjects as any)?.total_marks || "100");
              return acc + (obtained / (total || 100));
            }, 0) / studentMarks.length) * 100)
          : 0;

        return {
          id: s.id,
          fullName: s.profiles?.full_name,
          admissionNo: s.admission_no,
          attendance: attRate,
          performance: avgScore
        };
      });

      setStudents(enrichedStudents || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (selectedClass) loadStudents(selectedClass);
  }, [selectedClass]);

  const handleClassSelect = useCallback((classId: string) => {
    setSelectedClass(classId);
    loadStudents(classId);
  }, []);

  const handleStudentPress = useCallback((id: string) => {
    router.push(`/(teacher)/student-analytics/${id}` as any);
  }, []);

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    return students.filter(s => 
      s.fullName?.toLowerCase().includes(search.toLowerCase()) || 
      s.admissionNo?.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, students]);

  const renderStudentItem = useCallback(({ item }: { item: any }) => (
    <AnalyticalStudentCard item={item} onPress={handleStudentPress} />
  ), [handleStudentPress]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Student Analytics</Text>
        </View>
        
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classList}>
            {classes.map(c => (
              <TouchableOpacity 
                key={c.id} 
                style={[styles.classPill, selectedClass === c.id && styles.activePill]}
                onPress={() => handleClassSelect(c.id)}
              >
                <Text style={[styles.classLabel, selectedClass === c.id && styles.activeLabel]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#64748b" />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search student in this class..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <View style={styles.content}>
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#1a1d2e" style={{ marginTop: 50 }} />
        ) : filteredStudents.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people" size={60} color="#D1D5DB" />
            <Text style={styles.emptyText}>No students found in this class.</Text>
          </View>
        ) : (
          <FlatList 
            data={filteredStudents}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a1d2e']} />}
            renderItem={renderStudentItem}
            initialNumToRender={8}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            ListFooterComponent={<View style={{ height: 40 }} />}
          />
        )}
      </View>
    </View>
  );
}
