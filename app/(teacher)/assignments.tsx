import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { getTeacherProfile, getAssignedClasses } from '../../lib/services/teacher';
import { 
  getAssignments, 
  createAssignment, 
  deleteAssignment 
} from '../../lib/services/assignment';

export default function TeacherAssignmentsScreen() {
  const [teacher, setTeacher] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [viewingAssignment, setViewingAssignment] = useState<any>(null);
  const [assignedClasses, setAssignedClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Create State
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dueDateObj, setDueDateObj] = useState(new Date());
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [saving, setSaving] = useState(false);
  
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: profile } = await getTeacherProfile(session.user.id);
      if (profile?.teachers) {
        setTeacher(profile.teachers);
        
        const [asnRes, classesRes] = await Promise.all([
          getAssignments(profile.teachers.id),
          getAssignedClasses(profile.teachers.id)
        ]);

        const assignmentsData = asnRes.data || [];
        setAssignments(assignmentsData);
        setAssignedClasses(classesRes.data || []);
        
        if (assignmentsData.length > 0) {
          const asnIds = assignmentsData.map(a => a.id);
          const { data: subsData } = await supabase
            .from('assignment_submissions')
            .select(`*, students ( profiles ( full_name ) )`)
            .in('assignment_id', asnIds);
          setSubmissions(subsData || []);
        } else {
          setSubmissions([]);
        }
      }
    } catch (error) {
      console.error("Error loading assignments:", error);
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

  const handleSave = async () => {
    if (!title.trim() || !selectedClassId) {
      Alert.alert("Error", "Title and Class are required.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await createAssignment({
        title,
        description,
        classId: selectedClassId,
        sectionId: selectedSectionId || undefined,
        subjectId: selectedSubjectId || undefined,
        teacherId: teacher.id,
        dueDate: dueDate || undefined
      });

      if (error) throw error;

      setModalVisible(false);
      setTitle('');
      setDescription('');
      setDueDate('');
      setDueDateObj(new Date());
      setShowDatePicker(false);
      setSelectedClassId('');
      setSelectedSectionId('');
      setSelectedSubjectId('');
      loadData();
      Alert.alert("Success", "Assignment created successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to create assignment.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete", "Are you sure you want to delete this assignment?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await deleteAssignment(id);
        loadData();
      }}
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a1d2e" /></View>;
  }

  const uniqueClasses = [];
  const seen = new Set();
  assignedClasses.forEach(c => {
    if (!seen.has(c.class_id)) {
      seen.add(c.class_id);
      uniqueClasses.push(c);
    }
  });

  const availableSections = assignedClasses.filter(c => c.class_id === selectedClassId);
  const availableSubjects = assignedClasses.filter(c => c.class_id === selectedClassId);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Assignments</Text>
          <Text style={styles.headerSub}>Manage homework and projects</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a1d2e']} />}
      >
        {assignments.map(asn => {
          const asnSubmissions = submissions.filter(s => s.assignment_id === asn.id);
          
          return (
            <View key={asn.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.titleArea}>
                  <Text style={styles.asnTitle}>{asn.title}</Text>
                  <View style={styles.metaRow}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{asn.classes?.name}</Text>
                    </View>
                    {asn.sections && (
                      <View style={[styles.badge, { backgroundColor: '#E0F2F1' }]}>
                        <Text style={[styles.badgeText, { color: '#00695C' }]}>Sec {asn.sections.name}</Text>
                      </View>
                    )}
                    {asn.subjects && (
                      <Text style={styles.subjectText}>{asn.subjects.name}</Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleDelete(asn.id)}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
              
              {asn.description && <Text style={styles.asnDesc} numberOfLines={2}>{asn.description}</Text>}
              
              <View style={styles.cardFooter}>
                <View style={styles.dateInfo}>
                  <Ionicons name="calendar-outline" size={14} color="#64748b" />
                  <Text style={styles.dateText}>
                    Due: {asn.due_date ? new Date(asn.due_date).toLocaleDateString() : 'No deadline'}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.subsBadge, asnSubmissions.length > 0 && styles.subsBadgeActive]}
                  onPress={() => setViewingAssignment(asn)}
                >
                  <Text style={[styles.subsText, asnSubmissions.length > 0 && styles.subsTextActive]}>
                    {asnSubmissions.length} Submissions
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>New Assignment</Text>
              
              <Text style={styles.label}>Title *</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Chapter 1 Quiz" />
              
              <Text style={styles.label}>Instructions</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                value={description} 
                onChangeText={setDescription} 
                placeholder="What should students do?" 
                multiline 
              />

              <View style={styles.grid}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Class *</Text>
                  <View style={styles.pickerContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {uniqueClasses.map(c => (
                        <TouchableOpacity 
                          key={c.class_id}
                          style={[styles.choiceBtn, selectedClassId === c.class_id && styles.choiceBtnActive]}
                          onPress={() => {
                            setSelectedClassId(c.class_id);
                            setSelectedSectionId('');
                            setSelectedSubjectId('');
                          }}
                        >
                          <Text style={[styles.choiceText, selectedClassId === c.class_id && styles.choiceTextActive]}>
                            {c.classes.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </View>

              {selectedClassId !== '' && (
                <>
                  <Text style={styles.label}>Section (Optional)</Text>
                  <View style={styles.pickerContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <TouchableOpacity 
                        style={[styles.choiceBtn, selectedSectionId === '' && styles.choiceBtnActive]}
                        onPress={() => setSelectedSectionId('')}
                      >
                        <Text style={[styles.choiceText, selectedSectionId === '' && styles.choiceTextActive]}>All</Text>
                      </TouchableOpacity>
                      {availableSections.filter(s => s.section_id).map(s => (
                        <TouchableOpacity 
                          key={s.section_id}
                          style={[styles.choiceBtn, selectedSectionId === s.section_id && styles.choiceBtnActive]}
                          onPress={() => setSelectedSectionId(s.section_id)}
                        >
                          <Text style={[styles.choiceText, selectedSectionId === s.section_id && styles.choiceTextActive]}>
                            {s.sections.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <Text style={styles.label}>Subject (Optional)</Text>
                  <View style={styles.pickerContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <TouchableOpacity 
                        style={[styles.choiceBtn, selectedSubjectId === '' && styles.choiceBtnActive]}
                        onPress={() => setSelectedSubjectId('')}
                      >
                        <Text style={[styles.choiceText, selectedSubjectId === '' && styles.choiceTextActive]}>None</Text>
                      </TouchableOpacity>
                      {availableSubjects.filter(sb => sb.subject_id).map(sb => (
                        <TouchableOpacity 
                          key={sb.subject_id}
                          style={[styles.choiceBtn, selectedSubjectId === sb.subject_id && styles.choiceBtnActive]}
                          onPress={() => setSelectedSubjectId(sb.subject_id)}
                        >
                          <Text style={[styles.choiceText, selectedSubjectId === sb.subject_id && styles.choiceTextActive]}>
                            {sb.subjects.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </>
              )}

              <Text style={styles.label}>Due Date (Optional)</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
                <Text style={{ color: dueDate ? '#1a1d2e' : '#94a3b8', fontSize: 15 }}>
                  {dueDate || "Select Date"}
                </Text>
              </TouchableOpacity>
              
              {showDatePicker && (
                <View style={Platform.OS === 'ios' ? { backgroundColor: '#fff', borderRadius: 12, marginTop: 8, padding: 8 } : {}}>
                  <DateTimePicker
                    value={dueDateObj}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={(event, selectedDate) => {
                      if (Platform.OS === 'android') {
                        setShowDatePicker(false);
                      }
                      if (selectedDate) {
                        setDueDateObj(selectedDate);
                        const yyyy = selectedDate.getFullYear();
                        const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                        const dd = String(selectedDate.getDate()).padStart(2, '0');
                        setDueDate(`${yyyy}-${mm}-${dd}`);
                      }
                    }}
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity style={{ padding: 10, alignItems: 'center' }} onPress={() => setShowDatePicker(false)}>
                      <Text style={{ color: '#1a1d2e', fontWeight: '700' }}>Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal visible={!!viewingAssignment} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={styles.modalTitle}>Submissions</Text>
              <TouchableOpacity onPress={() => setViewingAssignment(null)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {viewingAssignment && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {submissions.filter(s => s.assignment_id === viewingAssignment.id).length === 0 ? (
                  <Text style={{ textAlign: 'center', color: '#94a3b8', marginTop: 20 }}>No submissions yet.</Text>
                ) : (
                  submissions.filter(s => s.assignment_id === viewingAssignment.id).map(sub => (
                    <View key={sub.id} style={styles.submissionCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ color: '#3F51B5', fontWeight: '700' }}>{sub.students?.profiles?.full_name?.charAt(0) || 'S'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: '700', color: '#1a1d2e' }}>{sub.students?.profiles?.full_name || 'Student'}</Text>
                          <Text style={{ fontSize: 12, color: '#64748b' }}>Submitted: {new Date(sub.submitted_at).toLocaleDateString()}</Text>
                        </View>
                        {sub.file_url && (
                          <TouchableOpacity style={{ padding: 8, backgroundColor: '#F1F5F9', borderRadius: 8 }} onPress={() => {
                            Linking.openURL(sub.file_url);
                          }}>
                            <Ionicons name="document-text" size={20} color="#3B3D6B" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
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
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  content: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleArea: { flex: 1, marginRight: 10 },
  asnTitle: { fontSize: 16, fontWeight: '700', color: '#1a1d2e', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  badge: { backgroundColor: '#E8EAF6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#3F51B5' },
  subjectText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  asnDesc: { fontSize: 14, color: '#475569', marginVertical: 12, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  dateInfo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  createdText: { fontSize: 10, color: '#94A3B8' },
  subsBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#F1F5F9' },
  subsBadgeActive: { backgroundColor: '#e0e7ff' },
  subsText: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  subsTextActive: { color: '#3F51B5' },
  fab: { position: 'absolute', right: 20, bottom: 100, width: 60, height: 60, borderRadius: 30, backgroundColor: '#3B3D6B', justifyContent: 'center', alignItems: 'center', shadowColor: '#3B3D6B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 28, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1a1d2e' },
  submissionCard: { padding: 16, borderRadius: 12, backgroundColor: '#F8F9FA', marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  label: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 14, fontSize: 15, color: '#1a1d2e' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  grid: { flexDirection: 'row', gap: 12 },
  pickerContainer: { flexDirection: 'row', gap: 8, marginBottom: 5 },
  choiceBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 8 },
  choiceBtnActive: { backgroundColor: '#1a1d2e', borderColor: '#1a1d2e' },
  choiceText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  choiceTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 25 },
  cancelBtn: { flex: 1, padding: 16, borderRadius: 15, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelBtnText: { fontWeight: '700', color: '#64748b' },
  submitBtn: { flex: 1, padding: 16, borderRadius: 15, backgroundColor: '#1a1d2e', alignItems: 'center' },
  submitBtnText: { fontWeight: '700', color: '#fff' }
});
