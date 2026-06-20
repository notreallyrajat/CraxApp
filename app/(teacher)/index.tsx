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
import { getTeacherProfile, getAssignedClasses } from '../../lib/services/teacher';
import { useRouter, useNavigation } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function TeacherDashboard() {
  const [teacher, setTeacher] = useState<any>(null);
  const [stats, setStats] = useState({ assignedClasses: 0, attendanceRate: 0, totalStudents: 0, pendingTasks: 0 });
  const [announcements, setAnnouncements] = useState<any[]>([]);
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
      
      const { data: profile } = await getTeacherProfile(session.user.id);
      if (profile?.teachers) {
        setTeacher({ ...profile.teachers, ...profile });
        
        const { getTeacherStats } = require('../../lib/services/stats');
        const statsData = await getTeacherStats(profile.teachers.id);
        setStats(statsData);
        
        const { data: annRes } = await supabase.from('announcements')
          .select('*').eq('status', 'approved').eq('is_published', true).order('created_at', { ascending: false }).limit(3);

        setAnnouncements(annRes || []);
      }
    } catch (error) {
      console.error("Error loading teacher dashboard:", error);
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

  const handleLogout = async () => {
    setAvatarModalVisible(false);
    await supabase.auth.signOut();
    router.replace('/');
  };

  if (loading && !refreshing) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a1d2e" /></View>;
  }

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good Morning,';
    if (hours < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  const firstName = teacher?.full_name?.split(" ")[0] || 'Teacher';
  const attendanceVal = stats.attendanceRate || 92; // fallback
  
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
               <Text style={styles.idCardName} numberOfLines={1}>{teacher?.full_name || 'Teacher Name'}</Text>
               <Text style={styles.idCardClass}>{teacher?.department || 'Faculty'} | ID: {teacher?.employee_id || 'T-100'}</Text>
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
                  <Text style={styles.attendanceLabelText}>Class Att.</Text>
                  <Text style={styles.attendanceValueText}>{attendanceVal}%</Text>
                </View>
             </View>
          </View>
        </View>

        {/* 4 Stat Cards */}
        <View style={styles.statsContainer}>
           <View style={styles.statCardSmall}>
             <Text style={styles.statLabelTop} numberOfLines={2}>Assigned{'\n'}Classes</Text>
             <View style={[styles.statIconBadge, { borderColor: '#3B3D6B' }]}>
               <Ionicons name="book-outline" size={16} color="#3B3D6B" />
             </View>
             <Text style={styles.statValueMid}>{stats.assignedClasses}</Text>
           </View>

           <View style={[styles.statCardSmall, { backgroundColor: '#FFD9D9' }]}>
             <Text style={styles.statLabelTop} numberOfLines={2}>Tasks{'\n'}Pending</Text>
             <View style={[styles.statIconBadge, { borderColor: '#D32F2F', borderStyle: 'dashed' }]}>
               <Ionicons name="warning-outline" size={16} color="#D32F2F" />
             </View>
             <Text style={[styles.statValueMid, { color: '#B71C1C' }]}>{stats.pendingTasks}</Text>
           </View>

           <View style={styles.statCardSmall}>
             <Text style={styles.statLabelTop} numberOfLines={2}>Total{'\n'}Students</Text>
             <View style={[styles.statIconBadge, { borderColor: '#3B3D6B' }]}>
               <Ionicons name="people-outline" size={16} color="#3B3D6B" />
             </View>
             <Text style={styles.statValueMid}>{stats.totalStudents}</Text>
           </View>

           <View style={[styles.statCardSmall, { backgroundColor: '#D4EED7' }]}>
             <Text style={styles.statLabelTop} numberOfLines={2}>Active{'\n'}Status</Text>
             <View style={[styles.statIconBadge, { borderColor: '#2E7D32' }]}>
               <Ionicons name="checkmark-circle-outline" size={18} color="#2E7D32" />
             </View>
             <Text style={[styles.statValueSmall, { color: '#1B5E20' }]}>Online</Text>
           </View>
        </View>

        {/* Quick Actions Scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActionsScroll}>
           <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/(teacher)/attendance')}>
              <View style={styles.quickActionIcon}><Ionicons name="checkmark-done" size={24} color="#1e293b" /></View>
              <Text style={styles.quickActionText}>Attendance</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/(teacher)/assignments')}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#e0e7ff' }]}><Ionicons name="document-text" size={24} color="#3B3D6B" /></View>
              <Text style={styles.quickActionText}>Assignments</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/(teacher)/documents')}>
              <View style={styles.quickActionIcon}><Ionicons name="folder-open" size={24} color="#1e293b" /></View>
              <Text style={styles.quickActionText}>Resources</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/(teacher)/chat')}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#e0e7ff' }]}><Ionicons name="chatbubbles" size={24} color="#3B3D6B" /></View>
              <Text style={styles.quickActionText}>Messages</Text>
           </TouchableOpacity>
        </ScrollView>

        {/* Announcements */}
        <View style={styles.sectionHeader}>
           <Text style={styles.sectionTitleText}>Notice Board</Text>
           <TouchableOpacity onPress={() => router.push('/(teacher)/announcements')}>
             <Text style={styles.seeAllText}>View All</Text>
           </TouchableOpacity>
        </View>

        <View style={styles.announcementsWrapper}>
           {announcements.length > 0 ? announcements.map((ann, index) => (
             <TouchableOpacity key={ann.id || index} style={styles.annCard} onPress={() => router.push('/(teacher)/announcements')}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FE' },
  content: { flex: 1 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20 },
  greetingText: { fontSize: 14, color: '#64748b', fontWeight: '600', marginBottom: 4 },
  nameText: { fontSize: 28, fontWeight: '800', color: '#1e293b', letterSpacing: -0.5 },
  profilePicContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  profilePic: { width: 50, height: 50, borderRadius: 25 },
  
  idCard: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 24, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#3B3D6B', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 5, marginBottom: 30 },
  idCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  idCardPic: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f1f5f9', marginRight: 16 },
  idCardInfo: { flex: 1 },
  idCardName: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
  idCardClass: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  
  attendanceChartContainer: { position: 'relative', width: 72, height: 72, justifyContent: 'center', alignItems: 'center' },
  attendanceTextContainer: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  attendanceLabelText: { fontSize: 9, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
  attendanceValueText: { fontSize: 14, fontWeight: '800', color: '#3B3D6B', marginTop: 1 },
  
  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 30 },
  statCardSmall: { width: (width - 55) / 2, backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 15, position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  statLabelTop: { fontSize: 13, color: '#64748b', fontWeight: '700', marginBottom: 12, lineHeight: 18 },
  statIconBadge: { position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  statValueMid: { fontSize: 28, fontWeight: '800', color: '#1e293b' },
  statValueSmall: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginTop: 8 },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  sectionTitleText: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  seeAllText: { fontSize: 14, color: '#3B3D6B', fontWeight: '700' },
  
  announcementsWrapper: { paddingHorizontal: 20 },
  annCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  annTextCol: { flex: 1, paddingRight: 16 },
  annTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 6, lineHeight: 22 },
  annDate: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  dateBadge: { width: 54, height: 54, borderRadius: 16, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  dbMonth: { fontSize: 11, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  dbDay: { fontSize: 18, fontWeight: '800', color: '#3B3D6B' },
  
  quickActionsScroll: { marginBottom: 30, paddingBottom: 10, flexDirection: 'row', paddingHorizontal: 20 },
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
