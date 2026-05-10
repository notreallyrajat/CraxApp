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
import { supabase } from '../../lib/supabase';
import { getStudentProfile } from '../../lib/services/student';
import { getStudentResults } from '../../lib/services/exam';

export default function StudentMarksScreen() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    if (grade?.startsWith('A')) return '#4CAF50';
    if (grade?.startsWith('B')) return '#2196F3';
    if (grade?.startsWith('C')) return '#FF9800';
    if (grade?.startsWith('D')) return '#FF5722';
    return '#F44336';
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a1d2e" /></View>;
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
        <Text style={styles.headerTitle}>My Marks</Text>
        <Text style={styles.headerSub}>Academic performance & results</Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a1d2e']} />}
      >
        {Object.keys(exams).length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="trophy-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No exam results published yet.</Text>
          </View>
        ) : (
          Object.keys(exams).map(examTitle => (
            <View key={examTitle} style={styles.examSection}>
              <View style={styles.examHeader}>
                <Ionicons name="ribbon-outline" size={20} color="#1a1d2e" />
                <Text style={styles.examTitle}>{examTitle}</Text>
              </View>
              {exams[examTitle].map(result => (
                <View key={result.id} style={styles.markRow}>
                  <View style={styles.markInfo}>
                    <Text style={styles.subjectName}>{result.exam_subjects?.subjects?.name}</Text>
                    <Text style={styles.examDate}>
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
                      <Ionicons name="document-text" size={20} color="#9C27B0" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
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
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  content: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#94A3B8', marginTop: 15, fontSize: 15, fontWeight: '600' },
  examSection: { marginBottom: 25 },
  examHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  examTitle: { fontSize: 18, fontWeight: '800', color: '#1a1d2e' },
  markRow: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 10, 
    flexDirection: 'row', 
    alignItems: 'center', 
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5
  },
  markInfo: { flex: 1 },
  subjectName: { fontSize: 15, fontWeight: '700', color: '#1a1d2e' },
  examDate: { fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: '600' },
  scoreArea: { alignItems: 'center', marginRight: 15 },
  scoreText: { fontSize: 18, fontWeight: '800', color: '#1a1d2e' },
  gradeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  gradeText: { fontSize: 10, fontWeight: '900' },
  sheetBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F3E5F5', justifyContent: 'center', alignItems: 'center' }
});
