import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getEnrolledStudents, getOrCreateSession, getRecordsForSession, saveAllRecords } from '../../../lib/services/attendance';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'holiday';

type StudentAttendance = {
  studentId: string;
  name: string;
  rollNo: string | null;
  status: AttendanceStatus;
  remark?: string;
};

export default function AttendanceMarkScreen() {
  const router = useRouter();
  const { classId, className, sectionId, sectionName, date } = useLocalSearchParams<{
    classId: string;
    className: string;
    sectionId?: string;
    sectionName?: string;
    date: string;
  }>();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!classId || !date) return;
    loadData();
  }, [classId, sectionId, date]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Get or Create Session
      const { data: sessionData, error: sessionErr } = await getOrCreateSession(
        classId,
        sectionId,
        date
      );
      if (sessionErr) throw sessionErr;
      const sId = sessionData.id;
      setSessionId(sId);

      // 2. Get Enrolled Students & Existing Records
      const [enrollRes, recordsRes] = await Promise.all([
        getEnrolledStudents(classId, sectionId),
        getRecordsForSession(sId),
      ]);

      if (enrollRes.error) throw enrollRes.error;
      if (recordsRes.error) throw recordsRes.error;

      const recordsMap = new Map(recordsRes.data.map((r: any) => [r.student_id, r.status]));

      const formattedStudents: StudentAttendance[] = enrollRes.data.map((e: any) => ({
        studentId: e.students.id,
        name: e.students.profiles?.full_name || 'Unknown',
        rollNo: e.roll_number || e.students.admission_no,
        status: recordsMap.get(e.students.id) || 'present', // Default to present
      }));

      setStudents(formattedStudents);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status } : s))
    );
  };

  const handleSave = async () => {
    if (!sessionId) return;
    setSaving(true);
    const { error } = await saveAllRecords(sessionId, students);
    setSaving(false);

    if (error) {
      Alert.alert('Error', 'Failed to save attendance: ' + error.message);
    } else {
      Alert.alert('Success', 'Attendance saved successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Royal Blue Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mark Attendance</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.headerContext}>
          <Text style={styles.className}>{className} {sectionName !== 'All Sec' ? `(${sectionName})` : ''}</Text>
          <View style={styles.datePill}>
            <Ionicons name="calendar" size={14} color="#0047AB" />
            <Text style={styles.dateText}>{date}</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0047AB" />
          <Text style={styles.loadingText}>Loading Roster...</Text>
        </View>
      ) : students.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>No students enrolled.</Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.studentId}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.studentInfoRow}>
                <View style={[styles.iconBlock, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="person" size={20} color="#2196F3" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <View style={styles.pillBadge}>
                    <Text style={styles.pillText}>Roll: {item.rollNo}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.toggleRow}>
                <TouchableOpacity 
                  style={[styles.toggleBtn, item.status === 'present' && styles.presentActive]}
                  onPress={() => handleStatusChange(item.studentId, 'present')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.toggleText, item.status === 'present' && styles.presentTextActive]}>P</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.toggleBtn, item.status === 'absent' && styles.absentActive]}
                  onPress={() => handleStatusChange(item.studentId, 'absent')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.toggleText, item.status === 'absent' && styles.absentTextActive]}>A</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.toggleBtn, item.status === 'late' && styles.lateActive]}
                  onPress={() => handleStatusChange(item.studentId, 'late')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.toggleText, item.status === 'late' && styles.lateTextActive]}>L</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Full Width Save Button */}
      {!loading && students.length > 0 && (
        <View style={styles.bottomFixedContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Save Attendance</Text>
            )}
          </TouchableOpacity>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  className: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  datePill: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  dateText: {
    marginLeft: 6,
    color: '#0047AB',
    fontWeight: '700',
    fontSize: 13,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#8E8E93', fontWeight: '600', fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  emptyText: { marginTop: 12, color: '#8E8E93', fontWeight: '500', fontSize: 14 },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  studentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1C1C1E', marginBottom: 4 },
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 100,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 100,
  },
  toggleText: {
    fontWeight: '800',
    fontSize: 13,
    color: '#9CA3AF',
  },
  presentActive: { backgroundColor: '#E8F5E9', shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  presentTextActive: { color: '#4CAF50' },
  absentActive: { backgroundColor: '#FFEBEE', shadowColor: '#F44336', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  absentTextActive: { color: '#F44336' },
  lateActive: { backgroundColor: '#FFF3E0', shadowColor: '#FF9800', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  lateTextActive: { color: '#FF9800' },
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
});
