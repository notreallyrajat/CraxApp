import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getStudentProfile } from '../../lib/services/student';
import { getTimetableForClass } from '../../lib/services/timetable';

const DAYS = [
  { id: 1, name: 'Mon' },
  { id: 2, name: 'Tue' },
  { id: 3, name: 'Wed' },
  { id: 4, name: 'Thu' },
  { id: 5, name: 'Fri' },
  { id: 6, name: 'Sat' },
];

export default function StudentTimetableScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [activeDay, setActiveDay] = useState(new Date().getDay() || 1);

  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: profile } = await getStudentProfile(session.user.id);
      if (profile?.students?.id) {
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('class_id')
          .eq('student_id', profile.students.id)
          .single();
          
        if (enrollment?.class_id) {
          const { data } = await getTimetableForClass(enrollment.class_id);
          setTimetable(data || []);
        }
      }
    } catch (error) {
      console.error("Error fetching timetable:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getPeriodsForDay = (dayId: number) => {
    return timetable.filter(t => t.day_of_week === dayId).sort((a, b) => a.period_number - b.period_number);
  };

  const activePeriods = getPeriodsForDay(activeDay);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Schedule</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.daysWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysContainer}>
            {DAYS.map(day => {
              const isActive = activeDay === day.id;
              return (
                <TouchableOpacity 
                  key={day.id} 
                  style={[styles.dayCard, isActive && styles.dayCardActive]}
                  onPress={() => setActiveDay(day.id)}
                >
                  <Text style={[styles.dayText, isActive && styles.dayTextActive]}>{day.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#3B3D6B" /></View>
        ) : activePeriods.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={56} color="#cbd5e1" />
            <Text style={styles.emptyText}>No classes scheduled for this day</Text>
          </View>
        ) : (
          activePeriods.map((period, index) => (
            <View key={period.id} style={styles.periodCard}>
              <View style={styles.periodNumber}>
                <Text style={styles.periodNumText}>{period.period_number}</Text>
              </View>
              <View style={styles.periodInfo}>
                <Text style={styles.subjectText}>
                  {period.is_free_period ? 'Free Period' : period.subjects?.name || 'Unknown Subject'}
                </Text>
                {!period.is_free_period && (
                  <View style={styles.teacherRow}>
                    <Ionicons name="person" size={14} color="#94a3b8" />
                    <Text style={styles.teacherText}>{period.teachers?.profiles?.full_name || 'TBA'}</Text>
                  </View>
                )}
                {period.room_no && (
                  <View style={styles.roomRow}>
                    <Ionicons name="location" size={14} color="#94a3b8" />
                    <Text style={styles.roomText}>{period.room_no}</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  header: { 
    marginTop: Platform.OS === 'android' ? 50 : 60, 
    marginBottom: 10,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 20 },
  backBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  
  daysWrapper: { paddingLeft: 20, marginBottom: 10 },
  daysContainer: { gap: 10, paddingRight: 40 },
  dayCard: { 
    paddingHorizontal: 22, 
    paddingVertical: 12, 
    borderRadius: 20, 
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  dayCardActive: { 
    backgroundColor: '#3B3D6B',
    borderColor: '#3B3D6B',
    shadowColor: '#3B3D6B', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 4
  },
  dayText: { color: '#64748b', fontWeight: '600', fontSize: 15 },
  dayTextActive: { color: '#fff', fontWeight: '700' },
  
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  center: { marginTop: 100, alignItems: 'center' },
  
  emptyCard: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#94a3b8', fontSize: 16, fontWeight: '500', marginTop: 16, textAlign: 'center' },
  
  periodCard: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 16, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center'
  },
  periodNumber: { 
    width: 52, 
    height: 52, 
    borderRadius: 16, 
    backgroundColor: '#e0e7ff', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 16
  },
  periodNumText: { fontSize: 20, fontWeight: '800', color: '#3B3D6B' },
  periodInfo: { flex: 1, justifyContent: 'center' },
  subjectText: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  teacherRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  teacherText: { fontSize: 13, color: '#64748b', fontWeight: '500', marginLeft: 6 },
  roomRow: { flexDirection: 'row', alignItems: 'center' },
  roomText: { fontSize: 13, color: '#64748b', fontWeight: '500', marginLeft: 6 }
});
