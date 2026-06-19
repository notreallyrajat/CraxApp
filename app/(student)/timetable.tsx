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
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>My Timetable</Text>
            <Text style={styles.headerSub}>Class schedule and periods</Text>
          </View>
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#1a1d2e" /></View>
        ) : activePeriods.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
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
                    <Ionicons name="person-outline" size={14} color="#64748b" />
                    <Text style={styles.teacherText}>{period.teachers?.profiles?.full_name || 'TBA'}</Text>
                  </View>
                )}
                {period.room_no && (
                  <View style={styles.roomRow}>
                    <Ionicons name="location-outline" size={14} color="#64748b" />
                    <Text style={styles.roomText}>{period.room_no}</Text>
                  </View>
                )}
              </View>
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
    paddingBottom: 20, 
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingHorizontal: 20, marginBottom: 20 },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  daysWrapper: { paddingLeft: 20 },
  daysContainer: { gap: 10, paddingRight: 40 },
  dayCard: { 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.1)' 
  },
  dayCardActive: { backgroundColor: '#fff' },
  dayText: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 14 },
  dayTextActive: { color: '#1a1d2e', fontWeight: '800' },
  content: { flex: 1, padding: 20 },
  center: { marginTop: 50, alignItems: 'center' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 20, padding: 40, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, marginTop: 20 },
  emptyText: { color: '#94A3B8', fontSize: 15, fontWeight: '700', marginTop: 15, textAlign: 'center' },
  periodCard: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 15, 
    marginBottom: 15, 
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 5,
    alignItems: 'center'
  },
  periodNumber: { 
    width: 45, 
    height: 45, 
    borderRadius: 22.5, 
    backgroundColor: '#F1F5F9', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 15
  },
  periodNumText: { fontSize: 18, fontWeight: '900', color: '#1a1d2e' },
  periodInfo: { flex: 1, justifyContent: 'center' },
  subjectText: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  teacherRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  teacherText: { fontSize: 13, color: '#64748b', fontWeight: '600', marginLeft: 6 },
  roomRow: { flexDirection: 'row', alignItems: 'center' },
  roomText: { fontSize: 13, color: '#64748b', fontWeight: '600', marginLeft: 6 }
});
