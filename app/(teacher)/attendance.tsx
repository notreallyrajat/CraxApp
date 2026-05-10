import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getAssignedClasses, getTeacherProfile } from '../../lib/services/teacher';
import { 
  getSessionsForClass, 
  createSession, 
  getEnrolledStudents, 
  getRecordsForSession, 
  saveAllRecords 
} from '../../lib/services/attendance';

type AttendanceStatus = "present" | "absent" | "late" | "holiday";

export default function TeacherAttendanceScreen() {
  const [view, setView] = useState<'classes' | 'sessions' | 'take'>('classes');
  const [teacher, setTeacher] = useState<any>(null);
  const [assignedClasses, setAssignedClasses] = useState<any[]>([]);
  const [activeClass, setActiveClass] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);

  const router = useRouter();
  const params = useLocalSearchParams();

  const loadTeacher = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: profile } = await getTeacherProfile(session.user.id);
    if (profile?.teachers) {
      setTeacher(profile.teachers);
      const classesRes = await getAssignedClasses(profile.teachers.id);
      setAssignedClasses(classesRes.data || []);
      
      // Check if we came from dashboard with specific class
      if (params.classId) {
        const target = (classesRes.data || []).find(c => c.class_id === params.classId);
        if (target) openClass(target);
      }
    }
    setLoading(false);
  }, [params.classId]);

  useEffect(() => {
    loadTeacher();
  }, [loadTeacher]);

  const openClass = async (cls: any) => {
    setActiveClass(cls);
    setView('sessions');
    setLoading(true);
    const { data } = await getSessionsForClass(cls.class_id, cls.section_id);
    setSessions(data || []);
    setLoading(false);
  };

  const handleCreateSession = async () => {
    if (!activeClass) return;
    setSaving(true);
    try {
      const { data, error } = await createSession({
        classId: activeClass.class_id,
        sectionId: activeClass.section_id,
        sessionDate
      });
      if (error) throw error;
      setModalVisible(false);
      openClass(activeClass); // Refresh sessions
    } catch (error) {
      Alert.alert("Error", "Failed to create session.");
    } finally {
      setSaving(false);
    }
  };

  const openSession = async (session: any) => {
    setActiveSession(session);
    setView('take');
    setLoading(true);
    try {
      const [enrolled, records] = await Promise.all([
        getEnrolledStudents(activeClass.class_id, activeClass.section_id),
        getRecordsForSession(session.id)
      ]);

      const existingMap = new Map();
      (records.data || []).forEach((r: any) => {
        existingMap.set(r.student_id, { status: r.status, remark: r.remark || "" });
      });

      const studentRows = (enrolled.data || [])
        .filter((e: any) => e.students !== null)
        .map((e: any) => {
          const ex = existingMap.get(e.students.id);
          return {
            studentId: e.students.id,
            admissionNo: e.students.admission_no,
            fullName: e.students.profiles?.full_name ?? "—",
            rollNumber: e.roll_number,
            status: ex?.status ?? "present",
            remark: ex?.remark ?? ""
          };
        });
      setRows(studentRows);
    } catch (error) {
      Alert.alert("Error", "Failed to load students.");
    } finally {
      setLoading(false);
    }
  };

  const setStatus = (sid: string, status: AttendanceStatus) => {
    setRows(prev => prev.map(r => r.studentId === sid ? { ...r, status } : r));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await saveAllRecords(activeSession.id, rows.map(r => ({
        studentId: r.studentId,
        status: r.status,
        remark: r.remark || undefined
      })));
      if (error) throw error;
      Alert.alert("Success", "Attendance saved successfully!");
      setView('sessions');
      openClass(activeClass); // Refresh
    } catch (error) {
      Alert.alert("Error", "Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return '#4CAF50';
      case 'absent': return '#F44336';
      case 'late': return '#FF9800';
      case 'holiday': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  if (loading && view === 'classes') {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a1d2e" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => view === 'classes' ? router.back() : view === 'sessions' ? setView('classes') : setView('sessions')}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>
            {view === 'classes' ? 'Attendance' : view === 'sessions' ? activeClass?.classes?.name : 'Take Attendance'}
          </Text>
          <Text style={styles.headerSub}>
            {view === 'sessions' ? (activeClass?.sections?.name ? `Section ${activeClass.sections.name}` : 'Whole Class') : 
             view === 'take' ? new Date(activeSession?.session_date).toLocaleDateString() : 'Select a class'}
          </Text>
        </View>
      </View>

      {view === 'classes' && (
        <ScrollView style={styles.content}>
          {assignedClasses.map(cls => (
            <TouchableOpacity key={cls.id} style={styles.classCard} onPress={() => openClass(cls)}>
              <View style={styles.classInfo}>
                <Ionicons name="people-circle" size={40} color="#1a1d2e" />
                <View>
                  <Text style={styles.className}>{cls.classes.name}</Text>
                  <Text style={styles.classSub}>{cls.sections ? `Section ${cls.sections.name}` : 'Whole Class'}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {view === 'sessions' && (
        <View style={{ flex: 1 }}>
          <ScrollView style={styles.content}>
            {sessions.map(s => (
              <TouchableOpacity key={s.id} style={styles.sessionCard} onPress={() => openSession(s)}>
                <View>
                  <Text style={styles.sessionDate}>{new Date(s.session_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
                  <Text style={styles.sessionStats}>Tap to view/edit attendance</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={30} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {view === 'take' && (
        <View style={{ flex: 1 }}>
          <ScrollView style={styles.content}>
            {rows.map((row, idx) => (
              <View key={row.studentId} style={styles.studentCard}>
                <View style={styles.studentInfo}>
                  <Text style={styles.rollNo}>#{row.rollNumber || idx + 1}</Text>
                  <View>
                    <Text style={styles.studentName}>{row.fullName}</Text>
                    <Text style={styles.studentAdm}>{row.admissionNo}</Text>
                  </View>
                </View>
                <View style={styles.statusButtons}>
                  {(['present', 'absent', 'late', 'holiday'] as AttendanceStatus[]).map(s => (
                    <TouchableOpacity 
                      key={s} 
                      onPress={() => setStatus(row.studentId, s)}
                      style={[
                        styles.statusBtn, 
                        row.status === s && { backgroundColor: getStatusColor(s), borderColor: getStatusColor(s) }
                      ]}
                    >
                      <Text style={[styles.statusBtnText, row.status === s && { color: '#fff' }]}>
                        {s.charAt(0).toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Attendance</Text>}
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Session</Text>
            <Text style={styles.label}>Select Date</Text>
            <TextInput 
              style={styles.input} 
              value={sessionDate} 
              onChangeText={setSessionDate} 
              placeholder="YYYY-MM-DD"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createBtn} onPress={handleCreateSession}>
                <Text style={styles.createBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { 
    backgroundColor: '#1a1d2e', 
    paddingTop: Platform.OS === 'android' ? 40 : 15, 
    paddingBottom: 20, 
    paddingHorizontal: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 15 
  },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  content: { flex: 1, padding: 20 },
  classCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 2 },
  classInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  className: { fontSize: 16, fontWeight: '700', color: '#1a1d2e' },
  classSub: { fontSize: 13, color: '#64748b' },
  sessionCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 2 },
  sessionDate: { fontSize: 15, fontWeight: '700', color: '#1a1d2e' },
  sessionStats: { fontSize: 12, color: '#64748b', marginTop: 4 },
  studentCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 1 },
  studentInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rollNo: { fontSize: 12, fontWeight: '800', color: '#64748b', width: 25 },
  studentName: { fontSize: 14, fontWeight: '700', color: '#1a1d2e' },
  studentAdm: { fontSize: 11, color: '#94A3B8' },
  statusButtons: { flexDirection: 'row', gap: 5 },
  statusBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  statusBtnText: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  saveBtn: { backgroundColor: '#1a1d2e', margin: 20, padding: 16, borderRadius: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#1a1d2e', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1d2e', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#64748b', marginBottom: 8 },
  input: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 12, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelBtnText: { fontWeight: '700', color: '#64748b' },
  createBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#1a1d2e', alignItems: 'center' },
  createBtnText: { fontWeight: '700', color: '#fff' }
});
