import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  StatusBar,
  Platform
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import CraxLogoSvg from '../../components/CraxLogoSvg';
import { supabase } from '../../lib/supabase';
import { getTeacherProfile, getTeacherDashboardStats, getAssignedClasses } from '../../lib/services/teacher';
import { logActivity } from '../../lib/services/logger';

export default function TeacherDashboard() {
  const [teacher, setTeacher] = useState<any>(null);
  const [stats, setStats] = useState({ classesCount: 0, documentsCount: 0, announcementsCount: 0 });
  const [assignedClasses, setAssignedClasses] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const router = useRouter();
  const navigation = useNavigation();

  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      const { data: profile } = await getTeacherProfile(session.user.id);
      if (!profile || !profile.teachers) {
        console.error("Teacher profile not found");
        return;
      }

      const teacherInfo = {
        fullName: profile.full_name,
        teacherId: profile.teachers.id,
        employeeId: profile.teachers.employee_id,
        department: profile.teachers.department
      };
      setTeacher(teacherInfo);

      const { getTeacherStats } = require('../../lib/services/stats');
      const statsData = await getTeacherStats(teacherInfo.teacherId);
      setStats(statsData);

      const [classesRes, annRes] = await Promise.all([
        getAssignedClasses(teacherInfo.teacherId),
        supabase.from('announcements')
          .select('id, title, content, created_at')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(3)
      ]);

      setAssignedClasses(classesRes.data || []);
      setAnnouncements(annRes.data || []);
      
    } catch (error) {
      console.error("Error loading teacher dashboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    logActivity('view_dashboard', 'teacher_app');
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const StatBox = ({ label, value, icon, color }: any) => (
    <View style={styles.statBox}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View>
        <Text style={styles.statValue}>{loading ? "..." : value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a1d2e" />
        <Text style={styles.loadingText}>Loading Teacher Portal...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1d2e" />
      
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
          <Text style={styles.welcomeText}>Hello, {teacher?.fullName?.split(" ")[0]} 👋</Text>
          <Text style={styles.dateText}>{teacher?.department} Department</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a1d2e']} />}
      >
        {/* God Statistics Grid */}
        <View style={styles.statsGrid}>
          <StatBox label="Class Attendance" value={`${stats.attendanceRate}%`} icon="checkmark-circle" color="#10B981" />
          <StatBox label="Assigned Classes" value={stats.assignedClasses} icon="book" color="#3B82F6" />
          <StatBox label="Total Students" value={stats.totalStudents} icon="people" color="#8B5CF6" />
          <StatBox label="Pending Tasks" value={stats.pendingTasks} icon="time" color="#F59E0B" />
        </View>

        {/* Announcements Only Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Latest Announcements</Text>
          <TouchableOpacity onPress={() => router.push('/(teacher)/announcements')}>
            <Text style={styles.seeAll}>View History</Text>
          </TouchableOpacity>
        </View>

        {announcements.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="megaphone-outline" size={32} color="#CBD5E1" />
            <Text style={styles.emptyText}>No recent announcements.</Text>
          </View>
        ) : (
          announcements.map((ann) => (
            <View key={ann.id} style={styles.announcementCard}>
              <View style={styles.annHeader}>
                <Text style={styles.annTitle} numberOfLines={1}>{ann.title}</Text>
                <Text style={styles.annDate}>{new Date(ann.created_at).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.annContent} numberOfLines={2}>{ann.content}</Text>
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  loadingText: { marginTop: 12, fontSize: 13, color: '#64748b', fontWeight: '600' },
  headerBackground: { 
    backgroundColor: '#1a1d2e', 
    paddingTop: Platform.OS === 'android' ? 20 : 50, 
    paddingHorizontal: 20, 
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  menuButton: { padding: 4 },
  logoText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginLeft: 8 },
  headerIcons: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 4 },
  welcomeBox: { marginTop: 5 },
  welcomeText: { fontSize: 24, fontWeight: '800', color: '#fff' },
  dateText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4, fontWeight: '600' },
  scrollContent: { padding: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 25 },
  statBox: { 
    width: '48%', 
    backgroundColor: '#fff', 
    borderRadius: 18, 
    padding: 15, 
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10
  },
  statIcon: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 10
  },
  statValue: { fontSize: 18, fontWeight: '800', color: '#1a1d2e' },
  statLabel: { fontSize: 9, color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1a1d2e' },
  seeAll: { fontSize: 13, color: '#64748b', fontWeight: '700' },
  announcementCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#1a1d2e',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  annHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  annTitle: { fontSize: 14, fontWeight: '700', color: '#1a1d2e', flex: 1, marginRight: 10 },
  annDate: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  annContent: { fontSize: 12, color: '#64748b', lineHeight: 18 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 30, alignItems: 'center', marginTop: 10 },
  emptyText: { color: '#94A3B8', fontSize: 13, fontWeight: '600', marginTop: 10 }
});
