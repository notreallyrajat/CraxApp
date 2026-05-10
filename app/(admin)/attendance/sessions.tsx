import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getSessionsForClass } from '../../../lib/services/attendance';

export default function AttendanceSessionsScreen() {
  const router = useRouter();
  const { classId, className, sectionId, sectionName } = useLocalSearchParams<{
    classId: string;
    className: string;
    sectionId?: string;
    sectionName?: string;
  }>();

  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    if (classId) loadSessions();
  }, [classId, sectionId]);

  const loadSessions = async () => {
    setLoading(true);
    const { data, error } = await getSessionsForClass(classId, sectionId);
    if (!error && data) {
      setSessions(data);
    }
    setLoading(false);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
      if (Platform.OS === 'android') {
        navigateToMark(selectedDate.toISOString().split('T')[0]);
      }
    }
  };

  const navigateToMark = (sessionDate: string) => {
    router.push({
      pathname: '/(admin)/attendance/mark',
      params: {
        classId,
        className,
        sectionId: sectionId || undefined,
        sectionName: sectionName || 'All Sec',
        date: sessionDate,
      }
    });
  };

  const onConfirmIosDate = () => {
    setShowDatePicker(false);
    navigateToMark(date.toISOString().split('T')[0]);
  };

  return (
    <View style={styles.container}>
      {/* Royal Blue Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Session History</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.headerContext}>
          <Text style={styles.className}>{className} {sectionName !== 'All Sec' ? `(${sectionName})` : ''}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0047AB" />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>No attendance records found.</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card} 
              activeOpacity={0.7}
              onPress={() => navigateToMark(item.session_date)}
            >
              <View style={[styles.iconBlock, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="calendar" size={24} color="#4CAF50" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>
                  {new Date(item.session_date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </Text>
                <View style={styles.pillBadge}>
                  <Text style={styles.pillText}>Past Session</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          )}
        />
      )}

      {/* Mark New Attendance Button */}
      <View style={styles.bottomFixedContainer}>
        {Platform.OS === 'ios' && showDatePicker ? (
          <View style={styles.iosDatePickerContainer}>
            <View style={styles.iosDatePickerHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onConfirmIosDate}>
                <Text style={styles.confirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={date}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={() => setShowDatePicker(true)} 
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Mark New Attendance</Text>
          </TouchableOpacity>
        )}
      </View>

      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  header: {
    backgroundColor: '#0047AB',
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  headerContext: {
    paddingHorizontal: 8,
  },
  className: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  emptyText: { marginTop: 12, color: '#8E8E93', fontWeight: '500', fontSize: 14 },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBlock: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1C1C1E', marginBottom: 6 },
  pillBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  pillText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  bottomFixedContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 16,
    backgroundColor: 'transparent',
  },
  primaryButton: {
    backgroundColor: '#0047AB',
    borderRadius: 100,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0047AB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  iosDatePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  iosDatePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  cancelText: { color: '#8E8E93', fontSize: 16, fontWeight: '600' },
  confirmText: { color: '#0047AB', fontSize: 16, fontWeight: '800' },
});
