import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { logActivity } from '../../lib/services/logger';
import { getAdminStats } from '../../lib/services/stats';

const adminProfileTable = "profiles";

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
  const router = useRouter();
  const navigation = useNavigation();

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("auth_user_id", session.user.id)
          .maybeSingle();
          
        if (profile?.full_name) {
          setAdminName(profile.full_name.split(" ")[0]);
        }
      }

      const data = await getAdminStats();
      setStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    logActivity('view_dashboard', 'admin_panel');
  }, []);

  const StatCard = ({ title, value, icon, color, trend }: any) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statCardHeader}>
        <View style={[styles.statIconBox, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        {trend && (
          <View style={styles.trendBadge}>
            <Ionicons name="trending-up" size={12} color="#10B981" />
            <Text style={styles.trendText}>{trend}</Text>
          </View>
        )}
      </View>
      <Text style={styles.statCardValue}>{loading ? "..." : value}</Text>
      <Text style={styles.statCardTitle}>{title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerBackground}>
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.menuButton}>
              <Ionicons name="menu" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ width: 8 }} />
            <Ionicons name="school" size={22} color="#FFFFFF" />
            <Text style={styles.logoText}>CraxNet</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.avatar}>
              <Text style={styles.avatarText}>{adminName.charAt(0)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.welcomeBox}>
          <Text style={styles.welcomeText}>Hello, {adminName}</Text>
          <Text style={styles.dateText}>{new Date().toDateString()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Analytics Grid */}
        <View style={styles.statsGrid}>
          <StatCard title="Total Students" value={stats.totalStudents} icon="people" color="#3B82F6" trend="+2%" />
          <StatCard title="Active Teachers" value={stats.totalTeachers} icon="school" color="#8B5CF6" />
          <StatCard title="Attendance Today" value={`${stats.attendanceToday}%`} icon="checkmark-circle" color="#10B981" />
          <StatCard title="Live Classes" value={stats.totalClasses} icon="book" color="#F59E0B" />
        </View>

        {/* Catchy Banner */}
        <TouchableOpacity 
          style={styles.analyticsBanner}
          onPress={() => router.push('/(admin)/student-analytics')}
        >
          <View style={styles.bannerInfo}>
            <Text style={styles.bannerTitle}>Institutional Performance Engine</Text>
            <Text style={styles.bannerDesc}>Access deep performance insights, academic trends, and real-time student analytics.</Text>
            <View style={styles.bannerBtn}>
              <Text style={styles.bannerBtnText}>OPEN ANALYTICS DIRECTORY</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </View>
          </View>
          <Ionicons name="analytics" size={60} color="rgba(255,255,255,0.2)" style={styles.bannerIcon} />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  headerBackground: { 
    backgroundColor: '#1a1d2e', 
    paddingTop: 50, 
    paddingHorizontal: 20, 
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  menuButton: { padding: 4 },
  logoText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginLeft: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#1a1d2e', fontWeight: '800', fontSize: 16 },
  welcomeBox: { marginTop: 5 },
  welcomeText: { fontSize: 24, fontWeight: '800', color: '#fff' },
  dateText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4, fontWeight: '600' },
  scrollContent: { padding: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 25 },
  statCard: { 
    width: '48%', 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 15, 
    marginBottom: 15,
    borderLeftWidth: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  statCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  statIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 },
  trendText: { fontSize: 10, fontWeight: '800', color: '#10B981', marginLeft: 2 },
  statCardValue: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  statCardTitle: { fontSize: 11, fontWeight: '700', color: '#64748b', marginTop: 4, textTransform: 'uppercase' },
  sectionContainer: { marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  actionItem: { width: '22%', alignItems: 'center' },
  actionIcon: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 11, fontWeight: '700', color: '#475569', textAlign: 'center' },
  analyticsBanner: { 
    backgroundColor: '#1a1d2e', 
    borderRadius: 20, 
    padding: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    overflow: 'hidden',
    elevation: 4
  },
  bannerInfo: { flex: 1, zIndex: 1 },
  bannerTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 6 },
  bannerDesc: { fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 18, marginBottom: 15 },
  bannerBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    alignSelf: 'flex-start', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 10 
  },
  bannerBtnText: { fontSize: 10, fontWeight: '800', color: '#fff', marginRight: 6 },
  bannerIcon: { position: 'absolute', right: -10, bottom: -10 }
});
