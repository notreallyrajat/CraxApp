import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Platform,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getTeacherProfile } from '../../lib/services/teacher';
import { Stack, useRouter } from 'expo-router';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TeacherTimetableScreen() {
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Default to today if it's a weekday, otherwise Monday
  const today = new Date().getDay();
  const defaultDayIndex = (today === 0 || today === 7) ? 0 : today - 1;
  const [selectedDay, setSelectedDay] = useState(defaultDayIndex);
  
  const router = useRouter();

  const loadTimetable = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: profile } = await getTeacherProfile(session.user.id);
      if (!profile?.teachers?.id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('timetables')
        .select(`
          id,
          day_of_week,
          period_number,
          classes ( name ),
          subjects ( name ),
          rooms ( name )
        `)
        .eq('teacher_id', profile.teachers.id)
        .order('day_of_week', { ascending: true })
        .order('period_number', { ascending: true });

      if (error) throw error;
      setTimetable(data || []);
    } catch (error) {
      console.error("Error loading timetable:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTimetable();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadTimetable();
  };

  // Filter the timetable for the currently selected day
  const currentDayClasses = timetable.filter(t => t.day_of_week === selectedDay);

  // Grouping periods nicely (Assuming standard 8 periods, this just lists them dynamically)
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Schedule</Text>
          <View style={{ width: 40 }} /> {/* Spacer */}
        </View>
      </View>

      {/* Day Selector */}
      <View style={styles.daySelectorContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daySelector}
        >
          {DAYS.map((day, index) => {
            const isActive = selectedDay === index;
            return (
              <TouchableOpacity 
                key={index} 
                style={[styles.dayPill, isActive && styles.dayPillActive]}
                onPress={() => setSelectedDay(index)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayText, isActive && styles.dayTextActive]}>
                  {day.substring(0, 3)}
                </Text>
                {isActive && <View style={styles.activeIndicator} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Schedule Content */}
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a1d2e']} />}
      >
        {loading && !refreshing ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#1a1d2e" />
            <Text style={styles.loadingText}>Loading your schedule...</Text>
          </View>
        ) : currentDayClasses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cafe-outline" size={60} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Free Day!</Text>
            <Text style={styles.emptySubtitle}>You have no classes assigned for {DAYS[selectedDay]}.</Text>
          </View>
        ) : (
          <View style={styles.scheduleList}>
            {currentDayClasses.map((lecture) => (
              <View key={lecture.id} style={styles.lectureCard}>
                <View style={styles.periodBox}>
                  <Text style={styles.periodNumber}>P{lecture.period_number}</Text>
                </View>
                
                <View style={styles.lectureInfo}>
                  <Text style={styles.subjectName}>{lecture.subjects?.name || 'Unknown Subject'}</Text>
                  
                  <View style={styles.lectureMetaRow}>
                    <View style={styles.metaBadge}>
                      <Ionicons name="people" size={12} color="#64748b" style={styles.metaIcon} />
                      <Text style={styles.metaText}>{lecture.classes?.name || 'Class'}</Text>
                    </View>
                    
                    <View style={styles.metaBadge}>
                      <Ionicons name="location" size={12} color="#64748b" style={styles.metaIcon} />
                      <Text style={styles.metaText}>{lecture.rooms?.name || 'TBD'}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
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
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: 20, 
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    zIndex: 10
  },
  headerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20 
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: '#fff' 
  },
  daySelectorContainer: {
    marginTop: -20,
    zIndex: 20
  },
  daySelector: {
    paddingHorizontal: 15,
    paddingTop: 40,
    paddingBottom: 15,
  },
  dayPill: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    minWidth: 70,
    alignItems: 'center'
  },
  dayPillActive: {
    backgroundColor: '#1a1d2e',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b'
  },
  dayTextActive: {
    color: '#fff'
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3B82F6',
    position: 'absolute',
    bottom: 6
  },
  content: {
    padding: 20,
    paddingTop: 10
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100
  },
  loadingText: {
    marginTop: 15,
    color: '#64748b',
    fontWeight: '600'
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 40,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderStyle: 'dashed'
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 15
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20
  },
  scheduleList: {
    gap: 15
  },
  lectureCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    alignItems: 'center'
  },
  periodBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  periodNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3B82F6'
  },
  lectureInfo: {
    flex: 1,
    marginLeft: 16
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8
  },
  lectureMetaRow: {
    flexDirection: 'row',
    gap: 12
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  metaIcon: {
    marginRight: 4
  },
  metaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b'
  }
});
