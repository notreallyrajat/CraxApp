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
  Linking,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getStudentProfile } from '../../lib/services/student';
import { getDocumentsForClass } from '../../lib/services/teacherDocument';
import { getStudentResults } from '../../lib/services/exam';

const { width } = Dimensions.get('window');

export default function StudentAcademicsScreen() {
  const [activeTab, setActiveTab] = useState<'materials' | 'assignments' | 'marks'>('materials');
  const [docs, setDocs] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
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
        const studentId = profile.students.id;

        // Fetch Enrollments for classes
        const { data: enrData } = await supabase
          .from('enrollments')
          .select('class_id')
          .eq('student_id', studentId);
        
        const classIds = (enrData || []).map(e => e.class_id);

        // Fetch Documents
        const allDocs: any[] = [];
        const seen = new Set();
        for (const cid of classIds) {
          const { data } = await getDocumentsForClass(cid);
          (data || []).forEach((row: any) => {
            if (row.teacher_documents && !seen.has(row.teacher_documents.id)) {
              seen.add(row.teacher_documents.id);
              allDocs.push(row.teacher_documents);
            }
          });
        }
        setDocs(allDocs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

        // Fetch Assignments
        if (classIds.length > 0) {
          const { data: asnData } = await supabase
            .from('assignments')
            .select(`
              *,
              classes ( name ),
              subjects ( name )
            `)
            .in('class_id', classIds)
            .order('due_date', { ascending: true });
          
          setAssignments(asnData || []);
        }

        // Fetch Marks
        const { data: marksData } = await getStudentResults(studentId);
        setResults(marksData || []);
      }
    } catch (error) {
      console.error("Error loading academics data:", error);
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

  const isOverdue = (date: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const getFileIcon = (mime: string) => {
    if (mime?.includes('pdf')) return { name: 'document-text', color: '#EF4444' };
    if (mime?.includes('image')) return { name: 'image', color: '#3B82F6' };
    return { name: 'document-attach', color: '#64748b' };
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
          <Text style={styles.headerTitle}>Academics</Text>
          <View style={{ width: 28 }} />
        </View>
        
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'materials' && styles.tabButtonActive]}
            onPress={() => setActiveTab('materials')}
          >
            <Text style={[styles.tabText, activeTab === 'materials' && styles.tabTextActive]}>Resources</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'assignments' && styles.tabButtonActive]}
            onPress={() => setActiveTab('assignments')}
          >
            <Text style={[styles.tabText, activeTab === 'assignments' && styles.tabTextActive]}>Homework</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'marks' && styles.tabButtonActive]}
            onPress={() => setActiveTab('marks')}
          >
            <Text style={[styles.tabText, activeTab === 'marks' && styles.tabTextActive]}>Marks</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B3D6B']} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {activeTab === 'materials' ? (
          docs.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="folder-open-outline" size={56} color="#cbd5e1" />
              <Text style={styles.emptyText}>No shared resources found</Text>
            </View>
          ) : (
            docs.map(doc => {
              const icon = getFileIcon(doc.mime_type);
              return (
                <TouchableOpacity 
                  key={doc.id} 
                  style={styles.card}
                  onPress={() => Linking.openURL(doc.file_url)}
                >
                  <View style={[styles.iconBox, { backgroundColor: icon.color + '15' }]}>
                    <Ionicons name={icon.name as any} size={26} color={icon.color} />
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docTitle}>{doc.title}</Text>
                    <Text style={styles.docMeta}>
                      {doc.teachers?.profiles?.full_name} • {new Date(doc.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Ionicons name="download-outline" size={22} color="#64748b" />
                </TouchableOpacity>
              );
            })
          )
        ) : activeTab === 'assignments' ? (
          assignments.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="clipboard-outline" size={56} color="#cbd5e1" />
              <Text style={styles.emptyText}>No assignments pending</Text>
            </View>
          ) : (
            assignments.map(asn => {
              const overdue = isOverdue(asn.due_date);
              return (
                <View key={asn.id} style={[styles.asnCard, overdue && styles.overdueCard]}>
                  <View style={styles.asnHeader}>
                    <View style={[styles.iconBox, { backgroundColor: overdue ? '#FEF2F2' : '#e0e7ff', marginRight: 16 }]}>
                      <Ionicons name="clipboard" size={24} color={overdue ? '#EF4444' : '#3B3D6B'} />
                    </View>
                    <View style={styles.titleInfo}>
                      <Text style={styles.asnTitle}>{asn.title}</Text>
                      <View style={styles.metaRow}>
                        <Text style={styles.classText}>{asn.classes?.name}</Text>
                        {asn.subjects && (
                          <>
                            <Text style={styles.dot}>•</Text>
                            <Text style={styles.subjectText}>{asn.subjects.name}</Text>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                  
                  {asn.description && <Text style={styles.asnDesc}>{asn.description}</Text>}
                  
                  <View style={styles.asnFooter}>
                    <View style={styles.dueDateRow}>
                      <Ionicons name="calendar-outline" size={16} color={overdue ? '#EF4444' : '#64748b'} />
                      <Text style={[styles.dueDateText, overdue && styles.overdueText]}>
                        Due: {asn.due_date ? new Date(asn.due_date).toLocaleDateString() : 'No deadline'}
                      </Text>
                    </View>
                    {overdue && (
                      <View style={styles.overdueBadge}>
                        <Text style={styles.overdueBadgeText}>Overdue</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )
        ) : (
          Object.keys(exams).length === 0 ? (
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
          )
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
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  
  tabContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#e2e8f0', 
    borderRadius: 12, 
    padding: 4 
  },
  tabButton: { 
    flex: 1, 
    paddingVertical: 10, 
    alignItems: 'center', 
    borderRadius: 8 
  },
  tabButtonActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#0f172a', fontWeight: '700' },
  
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  
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
  
  // Document styles
  iconBox: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  docInfo: { flex: 1 },
  docTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  docMeta: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  
  // Assignment styles
  asnCard: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 16, 
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 3
  },
  overdueCard: { borderLeftWidth: 4, borderLeftColor: '#EF4444' },
  asnHeader: { flexDirection: 'row', alignItems: 'center' },
  titleInfo: { flex: 1 },
  asnTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  classText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  dot: { color: '#cbd5e1', marginHorizontal: 6 },
  subjectText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  asnDesc: { fontSize: 14, color: '#475569', marginTop: 16, lineHeight: 22 },
  asnFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  dueDateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dueDateText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  overdueText: { color: '#EF4444', fontWeight: '700' },
  overdueBadge: { backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  overdueBadgeText: { fontSize: 11, fontWeight: '800', color: '#EF4444' },
  
  // Exam styles
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
