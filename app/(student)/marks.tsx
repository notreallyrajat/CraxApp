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
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getStudentProfile } from '../../lib/services/student';
import { getStudentResults } from '../../lib/services/exam';

export default function StudentMarksScreen() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: profile } = await getStudentProfile(session.user.id);
      if (profile?.students) {
        const { data } = await getStudentResults(profile.students.id);
        setResults(data || []);
      }
    } catch (error) {
      console.error("Error loading student marks:", error);
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

  const getGradeColor = (grade: string) => {
    if (grade?.startsWith('A')) return '#22C55E';
    if (grade?.startsWith('B')) return '#3B82F6';
    if (grade?.startsWith('C')) return '#F59E0B';
    if (grade?.startsWith('D')) return '#F97316';
    return '#EF4444';
  };

  if (loading && !refreshing) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#3B3D6B" /></View>;
  }

  // Group results by Exam
  const exams: Record<string, any[]> = {};
  results.forEach(r => {
    const examTitle = r.exam_subjects?.exams?.title || 'Unknown Exam';
    if (!exams[examTitle]) exams[examTitle] = [];
    exams[examTitle].push(r);
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Marks</Text>
          <View style={{ width: 28 }} />
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B3D6B']} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {Object.keys(exams).length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="ribbon-outline" size={56} color="#cbd5e1" />
            <Text style={styles.emptyText}>No exam results published yet</Text>
          </View>
        ) : (
          Object.keys(exams).map(examTitle => (
            <View key={examTitle} style={styles.examSection}>
              <View style={styles.examHeader}>
                <View style={styles.examHeaderIconBg}>
                  <Ionicons name="ribbon" size={18} color="#3B3D6B" />
                </View>
                <Text style={styles.examTitle}>{examTitle}</Text>
              </View>
              {exams[examTitle].map(result => (
                <View key={result.id} style={styles.card}>
                  <View style={styles.markInfo}>
                    <Text style={styles.subjectName}>{result.exam_subjects?.subjects?.name}</Text>
                    <Text style={styles.examMeta}>
                      Max Marks: {result.exam_subjects?.total_marks}
                    </Text>
                  </View>
                  <View style={styles.scoreArea}>
                    <Text style={styles.scoreText}>{result.marks_obtained}</Text>
                    <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(result.grade) + '15' }]}>
                      <Text style={[styles.gradeText, { color: getGradeColor(result.grade) }]}>{result.grade}</Text>
                    </View>
                  </View>
                  {result.answer_sheet_url && (
                    <TouchableOpacity 
                      style={styles.sheetBtn} 
                      onPress={() => Linking.openURL(result.answer_sheet_url)}
                    >
                      <Ionicons name="document-text" size={20} color="#3B3D6B" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
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
  
  examSection: { marginBottom: 25, marginTop: 10 },
  examHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  examHeaderIconBg: { backgroundColor: '#e0e7ff', padding: 8, borderRadius: 10, marginRight: 12 },
  examTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  
  markInfo: { flex: 1 },
  subjectName: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  examMeta: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  scoreArea: { alignItems: 'flex-end', marginRight: 15 },
  scoreText: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  gradeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
  gradeText: { fontSize: 11, fontWeight: '800' },
  sheetBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' }
});
