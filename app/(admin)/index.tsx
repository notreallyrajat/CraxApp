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
import { useRouter, useNavigation } from 'expo-router';

import Svg, { Circle } from 'react-native-svg';
import { logActivity } from '../../lib/services/logger';
import { getAdminStats } from '../../lib/services/stats';

const { width } = Dimensions.get('window');

export default function AdminDashboard() {
  const [stats, setStats] = useState({ 
    totalStudents: 0, 
    totalTeachers: 0, 
    totalClasses: 0, 
    activeAnnouncements: 0,
    attendanceToday: 0
  });
  const [adminName, setAdminName] = useState("Admin");
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
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("auth_user_id", session.user.id)
          .maybeSingle();
          
        if (profile?.full_name) {
          setAdminName(profile.full_name);
        }
      }

      const data = await getAdminStats();
      setStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    logActivity('view_dashboard', 'admin_panel');
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

  const firstName = adminName.split(" ")[0];
  const attendanceVal = stats.attendanceToday || 0;
  
  const radius = 21;
  const strokeWidth = 4;
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
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View>
              <Text style={styles.greetingText}>{getGreeting()}</Text>
              <Text style={styles.nameText}>{firstName}</Text>
            </View>
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
               <Text style={styles.idCardName} numberOfLines={1}>{adminName}</Text>
               <Text style={styles.idCardClass}>System Administrator</Text>
             </View>
          </View>
          <View style={{ alignItems: "flex-end", gap: 10 }}>
             <View style={styles.attendanceChartContainer}>
                <Svg width="54" height="54" viewBox="0 0 54 54">
                  <Circle cx="27" cy="27" r={radius} stroke="#e2e8f0" strokeWidth={strokeWidth} fill="none" />
                  <Circle cx="27" cy="27" r={radius} stroke="#10B981" strokeWidth={strokeWidth} fill="none" 
                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" 
                    transform="rotate(-90 27 27)" />
                </Svg>
                <View style={styles.attendanceTextContainer}>
                  <Text style={styles.attendanceLabelText}>Avg. Att.</Text>
                  <Text style={[styles.attendanceValueText, { color: '#10B981' }]}>{attendanceVal}%</Text>
                </View>
             </View>
          </View>
        </View>

        {/* 4 Module Cards */}
        <View style={styles.statsContainer}>
           <TouchableOpacity style={styles.statCardSmall} onPress={() => router.push('/(admin)/attendance')} activeOpacity={0.8}>
             <Text style={styles.statLabelTop} numberOfLines={2}>Daily{'\n'}Attendance</Text>
             <View style={[styles.statIconBadge, { borderColor: '#3B82F6' }]}>
               <Ionicons name="calendar-outline" size={16} color="#3B82F6" />
             </View>
             <Text style={[styles.statValueSmall, { color: '#3B82F6', marginTop: 16 }]}>Manage <Ionicons name="arrow-forward" size={12} /></Text>
           </TouchableOpacity>

           <TouchableOpacity style={[styles.statCardSmall, { backgroundColor: '#F3E8FF' }]} onPress={() => router.push('/(admin)/gps')} activeOpacity={0.8}>
             <Text style={styles.statLabelTop} numberOfLines={2}>Bus{'\n'}GPS</Text>
             <View style={[styles.statIconBadge, { borderColor: '#8B5CF6' }]}>
               <Ionicons name="navigate-outline" size={16} color="#8B5CF6" />
             </View>
             <Text style={[styles.statValueSmall, { color: '#6D28D9', marginTop: 16 }]}>Track <Ionicons name="arrow-forward" size={12} /></Text>
           </TouchableOpacity>

           <TouchableOpacity style={styles.statCardSmall} onPress={() => router.push('/(admin)/fees')} activeOpacity={0.8}>
             <Text style={styles.statLabelTop} numberOfLines={2}>Fee{'\n'}Gateway</Text>
             <View style={[styles.statIconBadge, { borderColor: '#F59E0B' }]}>
               <Ionicons name="card-outline" size={16} color="#F59E0B" />
             </View>
             <Text style={[styles.statValueSmall, { color: '#D97706', marginTop: 16 }]}>Access <Ionicons name="arrow-forward" size={12} /></Text>
           </TouchableOpacity>

           <TouchableOpacity style={[styles.statCardSmall, { backgroundColor: '#D4EED7' }]} onPress={() => router.push('/(admin)/records')} activeOpacity={0.8}>
             <Text style={styles.statLabelTop} numberOfLines={2}>Digital{'\n'}Directory</Text>
             <View style={[styles.statIconBadge, { borderColor: '#2E7D32' }]}>
               <Ionicons name="folder-open-outline" size={16} color="#2E7D32" />
             </View>
             <Text style={[styles.statValueSmall, { color: '#1B5E20', marginTop: 16 }]}>Browse <Ionicons name="arrow-forward" size={12} /></Text>
           </TouchableOpacity>
        </View>

        {/* Quick Actions Scroll */}
        <View style={styles.quickActionsGrid}>
           <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/(admin)/students')}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#DBEAFE' }]}><Ionicons name="people" size={20} color="#3B82F6" /></View>
              <Text style={styles.quickActionText} numberOfLines={1}>Students</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/(admin)/teachers')}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#F3E8FF' }]}><Ionicons name="school" size={20} color="#8B5CF6" /></View>
              <Text style={styles.quickActionText} numberOfLines={1}>Teachers</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/(admin)/classes')}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#FEF3C7' }]}><Ionicons name="apps" size={20} color="#D97706" /></View>
              <Text style={styles.quickActionText} numberOfLines={1}>Classes</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/(admin)/notifications')}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#FCE7F3' }]}><Ionicons name="megaphone" size={20} color="#BE185D" /></View>
              <Text style={styles.quickActionText} numberOfLines={1}>Notices</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/(admin)/chat-logs')}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#E0E7FF' }]}><Ionicons name="chatbubbles" size={20} color="#4338CA" /></View>
              <Text style={styles.quickActionText} numberOfLines={1}>Comm Logs</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/(admin)/resources')}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#ECFCCB' }]}><Ionicons name="folder" size={20} color="#65A30D" /></View>
              <Text style={styles.quickActionText} numberOfLines={1}>Resources</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/(admin)/exams')}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#FFEDD5' }]}><Ionicons name="trophy" size={20} color="#EA580C" /></View>
              <Text style={styles.quickActionText} numberOfLines={1}>Exams</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/(admin)/allotment')}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#E0F2FE' }]}><Ionicons name="sparkles" size={20} color="#0284C7" /></View>
              <Text style={styles.quickActionText} numberOfLines={1}>AI Assign</Text>
           </TouchableOpacity>
        </View>

        {/* Catchy Banners */}
        <Text style={styles.sectionTitleText}>System Modules</Text>
        
        <TouchableOpacity 
          style={styles.analyticsBanner}
          onPress={() => router.push('/(admin)/student-analytics')}
        >
          <View style={styles.bannerInfo}>
            <Text style={styles.bannerTitle}>Institutional Performance Engine</Text>
            <Text style={styles.bannerDesc}>Access deep performance insights, academic trends, and real-time student analytics.</Text>
            <View style={styles.bannerBtn}>
              <Text style={styles.bannerBtnText}>OPEN ANALYTICS</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </View>
          </View>
          <Ionicons name="analytics" size={60} color="rgba(255,255,255,0.2)" style={styles.bannerIcon} />
        </TouchableOpacity>



      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FE' },
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  content: { flex: 1, paddingHorizontal: 16 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 16 },
  greetingText: { fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 2 },
  nameText: { fontSize: 22, fontWeight: '800', color: '#1e293b', letterSpacing: -0.5 },
  profilePicContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  profilePic: { width: 44, height: 44, borderRadius: 22 },
  
  idCard: { backgroundColor: '#fff', borderRadius: 20, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#3B3D6B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, marginBottom: 20 },
  idCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  idCardPic: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f1f5f9', marginRight: 12 },
  idCardInfo: { flex: 1 },
  idCardName: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 2 },
  idCardClass: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  
  attendanceChartContainer: { position: 'relative', width: 54, height: 54, justifyContent: 'center', alignItems: 'center' },
  attendanceTextContainer: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  attendanceLabelText: { fontSize: 7, color: '#64748b', fontWeight: '700' },
  attendanceValueText: { fontSize: 12, fontWeight: '800', marginTop: 1 },
  
  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  statCardSmall: { width: (width - 42) / 2, backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  statLabelTop: { fontSize: 12, color: '#64748b', fontWeight: '700', marginBottom: 8, lineHeight: 16 },
  statIconBadge: { position: 'absolute', top: 12, right: 12, width: 26, height: 26, borderRadius: 13, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  statValueMid: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  statValueSmall: { fontSize: 13, fontWeight: '800', color: '#1e293b', marginTop: 6 },
  
  sectionTitleText: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 12 },
  
  quickActionsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    paddingHorizontal: 8, 
    marginBottom: 20, 
    justifyContent: 'space-between',
    rowGap: 16,
  },
  quickActionItem: { alignItems: 'center', width: '22%' },
  quickActionIcon: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  quickActionText: { fontSize: 10, fontWeight: '700', color: '#64748b', textAlign: 'center' },
  
  analyticsBanner: { 
    backgroundColor: '#1a1d2e', 
    borderRadius: 20, 
    padding: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3
  },
  bannerInfo: { flex: 1, zIndex: 1 },
  bannerTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 4 },
  bannerDesc: { fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 16, marginBottom: 12 },
  bannerBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    alignSelf: 'flex-start', 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 8 
  },
  bannerBtnText: { fontSize: 9, fontWeight: '800', color: '#fff', marginRight: 4 },
  bannerIcon: { position: 'absolute', right: -15, bottom: -15, transform: [{ scale: 0.8 }] },

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
