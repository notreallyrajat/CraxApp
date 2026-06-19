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
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getStudentProfile } from '../../lib/services/student';
import { getStudentResults } from '../../lib/services/exam';
import { useRouter, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import CraxLogoSvg from '../../components/CraxLogoSvg';

export default function StudentDashboard() {
  const [student, setStudent] = useState<any>(null);
  const [stats, setStats] = useState({ attendanceRate: 0, pendingAssignments: 0, gpa: 0, totalSubjects: 0 });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [recentMarks, setRecentMarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const navigation = useNavigation();

  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: profile } = await getStudentProfile(session.user.id);
      if (profile?.students) {
        setStudent({ ...profile.students, ...profile });
        
        const enrollment = await supabase.from('enrollments').select('class_id').eq('student_id', profile.students.id).single();
        const classId = enrollment.data?.class_id || '';

        const { getStudentStats } = require('../../lib/services/stats');
        const statsData = await getStudentStats(profile.students.id, classId);
        setStats(statsData);
        
        const [marksRes, annRes] = await Promise.all([
          getStudentResults(profile.students.id),
          supabase.from('announcements').select('*').eq('status', 'approved').eq('is_published', true).order('created_at', { ascending: false }).limit(3)
        ]);

        setAnnouncements(annRes.data || []);
        setRecentMarks((marksRes.data || []).slice(0, 3));
      }
    } catch (error) {
      console.error("Error loading student dashboard:", error);
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

  const StatBox = ({ label, value, icon, color }: any) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{loading ? "..." : value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  if (loading && !refreshing) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a1d2e" /></View>;
  }

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good Morning';
    if (hours < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBackground}>
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.menuButton}>
              <Ionicons name="menu" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ width: 8 }} />
            <CraxLogoSvg width={26} height={26} color="#FFFFFF" />
            <Text style={styles.logoText}>CraxNet</Text>
          </View>
        </View>
        <View style={styles.welcomeBox}>
          <Text style={styles.welcomeText}>Hello, {student?.full_name?.split(" ")[0]}</Text>
          <Text style={styles.dateText}>Admission No: {student?.admission_no}</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a1d2e']} />}
      >
        {/* God Statistics Grid */}
        <View style={styles.statsGrid}>
          <StatBox label="Attendance" value={`${stats.attendanceRate}%`} icon="checkmark-circle" color="#10B981" />
          <StatBox label="Pending Asgn" value={stats.pendingAssignments} icon="clipboard" color="#3B82F6" />
          <StatBox label="Avg GPA" value={stats.gpa} icon="trophy" color="#F59E0B" />
          <StatBox label="Subjects" value={stats.totalSubjects} icon="book" color="#8B5CF6" />
        </View>

        {/* Announcements */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Announcements</Text>
          <TouchableOpacity onPress={() => router.push('/(student)/announcements' as any)}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        {announcements.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No recent announcements</Text>
          </View>
        ) : announcements.map(ann => (
          <View key={ann.id} style={styles.annCard}>
            <View style={styles.annIndicator} />
            <View style={styles.annContent}>
              <Text style={styles.annTitle}>{ann.title}</Text>
              <Text style={styles.annBody} numberOfLines={2}>{ann.content}</Text>
              <Text style={styles.annDate}>{new Date(ann.created_at).toLocaleDateString()}</Text>
            </View>
          </View>
        ))}

        {/* Recent Marks */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Results</Text>
          <TouchableOpacity onPress={() => router.push('/(student)/marks')}>
            <Text style={styles.viewAll}>My Report</Text>
          </TouchableOpacity>
        </View>
        {recentMarks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No exam results available</Text>
          </View>
        ) : recentMarks.map(mark => (
          <View key={mark.id} style={styles.markCard}>
            <View style={styles.markInfo}>
              <Text style={styles.markSubject}>{mark.exam_subjects?.subjects?.name}</Text>
              <Text style={styles.markExam}>{mark.exam_subjects?.exams?.title}</Text>
            </View>
            <View style={styles.markScore}>
              <Text style={styles.markValue}>{mark.marks_obtained}/{mark.exam_subjects?.total_marks}</Text>
              <Text style={[styles.markGrade, { color: mark.grade?.includes('A') ? '#4CAF50' : '#FF9800' }]}>{mark.grade}</Text>
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  headerBackground: { 
    backgroundColor: '#1a1d2e', 
    paddingTop: Platform.OS === 'android' ? 40 : 50, 
    paddingHorizontal: 20, 
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  menuButton: { padding: 4 },
  logoText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginLeft: 8 },
  welcomeBox: { marginTop: 5 },
  welcomeText: { fontSize: 24, fontWeight: '800', color: '#fff' },
  dateText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4, fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 15 },
  statCard: { width: '48%', backgroundColor: '#fff', borderRadius: 20, padding: 15, marginBottom: 15, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  statIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#1a1d2e' },
  statLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1a1d2e' },
  viewAll: { fontSize: 13, fontWeight: '700', color: '#2196F3' },
  annCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', gap: 15, elevation: 1 },
  annIndicator: { width: 4, borderRadius: 2, backgroundColor: '#1a1d2e' },
  annContent: { flex: 1 },
  annTitle: { fontSize: 15, fontWeight: '700', color: '#1a1d2e', marginBottom: 4 },
  annBody: { fontSize: 13, color: '#475569', lineHeight: 18 },
  annDate: { fontSize: 11, color: '#94A3B8', marginTop: 8, fontWeight: '600' },
  markCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1 },
  markInfo: { flex: 1 },
  markSubject: { fontSize: 15, fontWeight: '700', color: '#1a1d2e' },
  markExam: { fontSize: 12, color: '#64748b', marginTop: 2 },
  markScore: { alignItems: 'flex-end' },
  markValue: { fontSize: 15, fontWeight: '800', color: '#1a1d2e' },
  markGrade: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center' },
  emptyText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' }
});
