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
  Image,
  Dimensions,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getStudentProfile } from '../../lib/services/student';
import { getStudentResults } from '../../lib/services/exam';
import { getTimetableForClass } from '../../lib/services/timetable';
import { useRouter, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import Svg, { Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function StudentDashboard() {
  const [student, setStudent] = useState<any>(null);
  const [stats, setStats] = useState({ attendanceRate: 0, pendingAssignments: 0, gpa: 0, totalSubjects: 0, nextExam: null as any });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [recentMarks, setRecentMarks] = useState<any[]>([]);
  const [todayTimetable, setTodayTimetable] = useState<any[]>([]);
  const [recentHomework, setRecentHomework] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  
  const localAvatars = [
    require('../../assets/avatars/avatar_1.png'),
    require('../../assets/avatars/avatar_2.png'),
    require('../../assets/avatars/avatar_3.png'),
    require('../../assets/avatars/avatar_4.png'),
    require('../../assets/avatars/avatar_5.png'),
    require('../../assets/avatars/avatar_6.png'),
    require('../../assets/avatars/avatar_7.png'),
    require('../../assets/avatars/avatar_8.png'),
    require('../../assets/avatars/avatar_9.png'),
    require('../../assets/avatars/avatar_10.png'),
    require('../../assets/avatars/avatar_11.png'),
    require('../../assets/avatars/avatar_12.png'),
  ];
  const [selectedAvatar, setSelectedAvatar] = useState(localAvatars[0]);

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
        
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = days[new Date().getDay()];

        const [marksRes, annRes, ttRes, hwRes] = await Promise.all([
          getStudentResults(profile.students.id),
          supabase.from('announcements').select('*').eq('status', 'approved').eq('is_published', true).order('created_at', { ascending: false }).limit(3),
          getTimetableForClass(classId),
          supabase.from('assignments').select('id, title, due_date').eq('class_id', classId).gte('due_date', new Date().toISOString()).order('due_date', { ascending: true }).limit(4)
        ]);

        setAnnouncements(annRes.data || []);
        setRecentMarks((marksRes.data || []).slice(0, 3));
        setRecentHomework(hwRes.data || []);

        if (ttRes.data) {
           const todaysPeriods = ttRes.data
             .filter((p: any) => p.day_of_week === currentDay)
             .sort((a: any, b: any) => a.period_number - b.period_number);
           setTodayTimetable(todaysPeriods);
        }
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

  if (loading && !refreshing) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a1d2e" /></View>;
  }

  const handleLogout = async () => {
    setAvatarModalVisible(false);
    await supabase.auth.signOut();
    router.replace('/');
  };

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good Morning,';
    if (hours < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  const firstName = student?.full_name?.split(" ")[0] || 'Student';
  const attendanceVal = stats.attendanceRate || 96; // fallback for UI inspiration matching
  
  const radius = 28;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (attendanceVal / 100) * circumference;

  return (
    <View style={styles.container}>
      <Modal visible={avatarModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Avatar</Text>
            <View style={styles.avatarGrid}>
              {localAvatars.map((av, idx) => (
                <TouchableOpacity key={idx} onPress={() => { setSelectedAvatar(av); setAvatarModalVisible(false); }}>
                  <Image source={av} style={[styles.avatarOption, selectedAvatar === av && styles.avatarOptionSelected]} />
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{marginRight: 6}} />
                <Text style={styles.logoutBtnText}>Logout</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setAvatarModalVisible(false)}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B3D6B']} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>{getGreeting()}</Text>
            <Text style={styles.nameText}>{firstName}</Text>
          </View>
          <TouchableOpacity style={styles.profilePicContainer} onPress={() => setAvatarModalVisible(true)}>
            <Image source={selectedAvatar} style={styles.profilePic} />
          </TouchableOpacity>
        </View>

        {/* Main ID Card */}
        <View style={styles.idCard}>
          <View style={styles.idCardLeft}>
             <Image source={selectedAvatar} style={styles.idCardPic} />
             <View style={styles.idCardInfo}>
               <Text style={styles.idCardName} numberOfLines={1}>{student?.full_name || 'Rajat Sharma'}</Text>
               <Text style={styles.idCardClass}>Class 10-A | Roll 24</Text>
             </View>
          </View>
          <View style={styles.idCardRight}>
             <View style={styles.attendanceChartContainer}>
                <Svg width="72" height="72" viewBox="0 0 72 72">
                  <Circle cx="36" cy="36" r={radius} stroke="#e2e8f0" strokeWidth={strokeWidth} fill="none" />
                  <Circle cx="36" cy="36" r={radius} stroke="#3B3D6B" strokeWidth={strokeWidth} fill="none" 
                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" 
                    transform="rotate(-90 36 36)" />
                </Svg>
                <View style={styles.attendanceTextContainer}>
                  <Text style={styles.attendanceLabelText}>Attendance:</Text>
                  <Text style={styles.attendanceValueText}>{attendanceVal}%</Text>
                </View>
             </View>
          </View>
        </View>

        {/* 4 Stat Cards */}
        <View style={styles.statsContainer}>
           <View style={styles.statCardSmall}>
             <Text style={styles.statLabelTop} numberOfLines={2}>Attendance</Text>
             <View style={[styles.statIconBadge, { borderColor: '#3B3D6B' }]}>
               <Ionicons name="clipboard-outline" size={16} color="#3B3D6B" />
             </View>
             <Text style={styles.statValueMid}>{attendanceVal}%</Text>
           </View>

           <View style={[styles.statCardSmall, { backgroundColor: '#FFD9D9' }]}>
             <Text style={styles.statLabelTop} numberOfLines={2}>Assignments{'\n'}Pending</Text>
             <View style={[styles.statIconBadge, { borderColor: '#D32F2F', borderStyle: 'dashed' }]}>
               <Ionicons name="warning-outline" size={16} color="#D32F2F" />
             </View>
             <Text style={[styles.statValueMid, { color: '#B71C1C' }]}>{stats.pendingAssignments}</Text>
           </View>

           <View style={styles.statCardSmall}>
             <Text style={styles.statLabelTop} numberOfLines={2}>Upcoming{'\n'}Exams</Text>
             <View style={[styles.statIconBadge, { borderColor: '#3B3D6B' }]}>
               <Ionicons name="clipboard-outline" size={16} color="#3B3D6B" />
             </View>
             <Text style={styles.statValueSmall}>
               {stats.nextExam ? `${stats.nextExam.title}\n${new Date(stats.nextExam.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'No upcoming exams'}
             </Text>
           </View>

           <View style={[styles.statCardSmall, { backgroundColor: '#D4EED7' }]}>
             <Text style={styles.statLabelTop} numberOfLines={2}>Fee Status</Text>
             <View style={[styles.statIconBadge, { borderColor: '#2E7D32' }]}>
               <Ionicons name="checkmark-circle-outline" size={18} color="#2E7D32" />
             </View>
             <Text style={[styles.statValueMid, { color: '#1B5E20' }]}>Paid</Text>
           </View>
        </View>

        {/* Today's Timetable */}
        <Text style={styles.sectionTitleText}>Today's Timetable</Text>
        <View style={styles.timetableContainer}>
           {todayTimetable.length > 0 ? (
             todayTimetable.map((period, index) => (
               <View key={period.id} style={[styles.ttRow, index === todayTimetable.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={styles.ttSubj} numberOfLines={1}>
                    {period.subjects?.name} - {period.teachers?.profiles?.full_name?.split(' ')[0] || 'Teacher'}
                  </Text>
                  <Text style={styles.ttTime}>Period {period.period_number}</Text>
               </View>
             ))
           ) : (
             <View style={[styles.ttRow, { borderBottomWidth: 0, justifyContent: 'center' }]}>
                <Text style={{ color: '#94a3b8', fontSize: 14, fontWeight: '500', textAlign: 'center' }}>No classes scheduled for today.</Text>
             </View>
           )}
           <View style={styles.glassEffect} />
        </View>

        {/* Announcements & Events */}
        <View style={styles.rowHeader}>
           <Text style={styles.sectionTitleText}>Recent Announcements</Text>
           <View style={{flexDirection:'row', alignItems:'center'}}>
              <Text style={styles.sectionTitleText}>Upcoming Events</Text>
              <Ionicons name="chevron-forward" size={16} color="#000" style={{marginTop: 6, marginLeft: 2}} />
           </View>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20}}>
          <View style={styles.announcementsRow}>
            {announcements.length > 0 ? announcements.map((ann, index) => (
              <TouchableOpacity key={ann.id || index} style={styles.annCard} onPress={() => router.push('/(student)/announcements')}>
                <View style={styles.annTextCol}>
                  <Text style={styles.annTitle} numberOfLines={2}>{ann.title}</Text>
                  <Text style={styles.annDate}>{new Date(ann.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                </View>
                <View style={styles.dateBadge}>
                  <Text style={styles.dbMonth}>{new Date(ann.created_at).toLocaleDateString('en-US', { month: 'short' })}</Text>
                  <Text style={styles.dbDay}>{new Date(ann.created_at).getDate()}</Text>
                </View>
              </TouchableOpacity>
            )) : (
              <View style={[styles.annCard, { width: width - 40, justifyContent: 'center' }]}>
                <Text style={{ color: '#94a3b8', fontSize: 14, fontWeight: '500', textAlign: 'center' }}>No recent announcements</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Homework/Tasks */}
        <Text style={styles.sectionTitleText}>Pending Homework</Text>
        <View style={styles.tasksContainer}>
           <View style={styles.taskCol}>
              {recentHomework.slice(0, 2).map((hw) => (
                <View key={hw.id} style={{ marginBottom: 12 }}>
                  <Text style={styles.taskTitle} numberOfLines={1}>{hw.title}</Text>
                  <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2, marginBottom: 4, fontWeight: '600' }}>
                    Due: {new Date(hw.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                  <View style={styles.progBg}><View style={[styles.progFill, {width: '10%'}]} /></View>
                </View>
              ))}
              {recentHomework.length === 0 && <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '500' }}>No pending homework!</Text>}
           </View>
           <View style={styles.taskCol}>
              {recentHomework.slice(2, 4).map((hw) => (
                <View key={hw.id} style={{ marginBottom: 12 }}>
                  <Text style={styles.taskTitle} numberOfLines={1}>{hw.title}</Text>
                  <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2, marginBottom: 4, fontWeight: '600' }}>
                    Due: {new Date(hw.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                  <View style={styles.progBg}><View style={[styles.progFill, {width: '10%'}]} /></View>
                </View>
              ))}
           </View>
        </View>

        {/* Quick Actions Scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActionsScroll}>
           <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/(student)/gps')}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#e0e7ff' }]}><Ionicons name="bus" size={24} color="#3B3D6B" /></View>
              <Text style={styles.quickActionText}>Bus Tracking</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/(student)/fees')}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#e0e7ff' }]}><Ionicons name="card" size={24} color="#3B3D6B" /></View>
              <Text style={styles.quickActionText}>Pay Fees</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/(student)/attendance')}>
              <View style={styles.quickActionIcon}><Ionicons name="checkmark-done" size={24} color="#1e293b" /></View>
              <Text style={styles.quickActionText}>Attendance</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/(student)/marks')}>
              <View style={styles.quickActionIcon}><Ionicons name="stats-chart" size={24} color="#1e293b" /></View>
              <Text style={styles.quickActionText}>Results</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/(student)/assignments')}>
              <View style={styles.quickActionIcon}><Ionicons name="book" size={24} color="#1e293b" /></View>
              <Text style={styles.quickActionText}>Homework</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/(student)/timetable')}>
              <View style={styles.quickActionIcon}><Ionicons name="calendar-clear" size={24} color="#1e293b" /></View>
              <Text style={styles.quickActionText}>Timetable</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/(student)/chat')}>
              <View style={styles.quickActionIcon}><Ionicons name="mail" size={24} color="#1e293b" /></View>
              <Text style={styles.quickActionText}>Messages</Text>
           </TouchableOpacity>
        </ScrollView>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  content: { flex: 1, paddingHorizontal: 20 },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    marginTop: Platform.OS === 'android' ? 50 : 60, marginBottom: 20 
  },
  greetingText: { fontSize: 24, color: '#1e293b', fontWeight: '500' },
  nameText: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  profilePicContainer: { 
    width: 52, height: 52, borderRadius: 26, overflow: 'hidden', backgroundColor: '#e2e8f0',
    borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2
  },
  profilePic: { width: '100%', height: '100%' },
  
  idCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, padding: 16,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 4, marginBottom: 20
  },
  idCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  idCardPic: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#e2e8f0', marginRight: 14 },
  idCardInfo: { flex: 1, justifyContent: 'center' },
  idCardName: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  idCardClass: { fontSize: 14, color: '#64748b' },
  idCardRight: { marginLeft: 10 },
  attendanceChartContainer: { width: 72, height: 72, justifyContent: 'center', alignItems: 'center' },
  attendanceTextContainer: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  attendanceLabelText: { fontSize: 8, color: '#64748b' },
  attendanceValueText: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statCardSmall: {
    width: (width - 40 - 24) / 4, 
    backgroundColor: '#fff', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 6,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 5, elevation: 2
  },
  statLabelTop: { fontSize: 10, color: '#475569', textAlign: 'center', height: 28, marginBottom: 6, fontWeight: '500' },
  statIconBadge: { 
    width: 28, height: 28, borderRadius: 14, borderWidth: 1, 
    justifyContent: 'center', alignItems: 'center', marginBottom: 6
  },
  statValueMid: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  statValueSmall: { fontSize: 10, fontWeight: '600', color: '#0f172a', textAlign: 'center' },
  
  sectionTitleText: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  
  timetableContainer: { 
    backgroundColor: '#fff', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 5, elevation: 2,
    overflow: 'hidden', marginBottom: 24
  },
  ttRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  ttSubj: { fontSize: 14, color: '#1e293b', fontWeight: '500' },
  ttTime: { fontSize: 14, color: '#334155' },
  glassEffect: { 
    position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, 
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  announcementsRow: { flexDirection: 'row', gap: 12 },
  annCard: { 
    width: 180, backgroundColor: '#fff', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 5, elevation: 2
  },
  annTextCol: { flex: 1 },
  annTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a', marginBottom: 6, lineHeight: 18 },
  annDate: { fontSize: 11, color: '#64748b' },
  dateBadge: { backgroundColor: '#e2e8f0', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, alignItems: 'center', marginLeft: 8 },
  dbMonth: { fontSize: 10, color: '#475569', fontWeight: '600' },
  dbDay: { fontSize: 14, color: '#0f172a', fontWeight: '800' },
  
  tasksContainer: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  taskCol: { flex: 1 },
  taskTitle: { fontSize: 12, color: '#1e293b', fontWeight: '500', marginBottom: 6 },
  progBg: { height: 5, backgroundColor: '#e2e8f0', borderRadius: 3, marginBottom: 16 },
  progFill: { height: '100%', backgroundColor: '#3B3D6B', borderRadius: 3 },
  
  quickActionsScroll: { marginBottom: 30, paddingBottom: 10, flexDirection: 'row' },
  quickActionItem: { alignItems: 'center', marginRight: 22 },
  quickActionIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickActionText: { fontSize: 13, color: '#334155', fontWeight: '600' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 20 },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 15, marginBottom: 24 },
  avatarOption: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: 'transparent', backgroundColor: '#f8fafc' },
  avatarOptionSelected: { borderColor: '#3B3D6B' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 12 },
  logoutBtn: { flex: 1, flexDirection: 'row', paddingVertical: 14, backgroundColor: '#FEF2F2', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  logoutBtnText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
  closeBtn: { flex: 1, paddingVertical: 14, backgroundColor: '#f1f5f9', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 15, fontWeight: '700', color: '#475569' }
});
