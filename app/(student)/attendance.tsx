import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getStudentProfile } from '../../lib/services/student';
import { getStudentAttendanceRecords } from '../../lib/services/attendance';

export default function StudentAttendanceScreen() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, holiday: 0, percent: 0 });

  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: profile } = await getStudentProfile(session.user.id);
      if (profile?.students) {
        const { data } = await getStudentAttendanceRecords(profile.students.id);
        const list = data || [];
        setRecords(list);

        // Calc stats
        const s = { present: 0, absent: 0, late: 0, holiday: 0, percent: 0 };
        list.forEach((r: any) => {
          if (r.status === 'present') s.present++;
          else if (r.status === 'absent') s.absent++;
          else if (r.status === 'late') s.late++;
          else if (r.status === 'holiday') s.holiday++;
        });
        const total = s.present + s.absent + s.late;
        s.percent = total > 0 ? Math.round(((s.present + s.late) / total) * 100) : 0;
        setStats(s);
      }
    } catch (error) {
      console.error("Error loading student attendance:", error);
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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'present': return { bg: '#E8F5E9', color: '#2E7D32', label: 'Present' };
      case 'absent': return { bg: '#FFEBEE', color: '#C62828', label: 'Absent' };
      case 'late': return { bg: '#FFF3E0', color: '#EF6C00', label: 'Late' };
      case 'holiday': return { bg: '#E3F2FD', color: '#1565C0', label: 'Holiday' };
      default: return { bg: '#F5F5F5', color: '#757575', label: 'Unknown' };
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a1d2e" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Attendance History</Text>
        <Text style={styles.headerSub}>Track your presence over time</Text>
      </View>

      <View style={styles.statsPanel}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Present</Text>
          <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.present}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Absent</Text>
          <Text style={[styles.statValue, { color: '#F44336' }]}>{stats.absent}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Overall</Text>
          <Text style={[styles.statValue, { color: '#1a1d2e' }]}>{stats.percent}%</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a1d2e']} />}
      >
        {records.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No attendance records found yet.</Text>
          </View>
        ) : (
          records.map(record => {
            const style = getStatusStyle(record.status);
            return (
              <View key={record.id} style={styles.recordCard}>
                <View style={styles.recordMain}>
                  <View>
                    <Text style={styles.recordDate}>
                      {new Date(record.attendance_sessions.session_date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </Text>
                    <Text style={styles.recordSession}>
                      {record.attendance_sessions.classes.name}
                      {record.attendance_sessions.sections ? ` • Sec ${record.attendance_sessions.sections.name}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
                    <Text style={[styles.statusText, { color: style.color }]}>{style.label}</Text>
                  </View>
                </View>
                {record.remark && (
                  <View style={styles.remarkBox}>
                    <Ionicons name="chatbox-outline" size={14} color="#64748b" />
                    <Text style={styles.remarkText}>{record.remark}</Text>
                  </View>
                )}
              </View>
            );
          })
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
  statsPanel: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    marginHorizontal: 20, 
    marginTop: -20, 
    borderRadius: 20, 
    padding: 15, 
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  statItem: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#F1F5F9' },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '700', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '800' },
  content: { flex: 1, padding: 20, marginTop: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#94A3B8', marginTop: 15, fontSize: 15, fontWeight: '600' },
  recordCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 1 },
  recordMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recordDate: { fontSize: 16, fontWeight: '700', color: '#1a1d2e' },
  recordSession: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: '800' },
  remarkBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  remarkText: { fontSize: 12, color: '#64748b', flex: 1 }
});
