import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal, Alert, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getClassById, getSections, createSection, deleteSection, getClassTeacher, setClassTeacher, removeClassTeacher } from '../../../lib/services/class';
import { getEnrollments, createEnrollment, deleteEnrollment, getTeacherAssignments, createTeacherAssignment, deleteTeacherAssignment } from '../../../lib/services/enrollment';
import { getStudents } from '../../../lib/services/student';
import { getTeachers } from '../../../lib/services/teacher';
import { getSubjects } from '../../../lib/services/subject';

type Section = { id: string; name: string };
type Enrollment = {
  id: string;
  roll_number: string | null;
  students: { admission_no: string; profiles: { full_name: string } | null } | null;
  sections: { name: string } | null;
};
type Assignment = {
  id: string;
  teachers: { employee_id: string; profiles: { full_name: string } | null } | null;
  subjects: { name: string; code: string | null } | null;
  sections: { name: string } | null;
};
type ClassTeacher = {
  id: string;
  teacher_id: string;
  teachers: { employee_id: string; profiles: { full_name: string } | null } | null;
} | null;

export default function ClassDetailsScreen() {
  const router = useRouter();
  const { id, name: initialName, code: initialCode } = useLocalSearchParams<{ id: string; name: string; code: string }>();

  const [classData, setClassData] = useState({ name: initialName, code: initialCode });
  const [sections, setSections] = useState<Section[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classTeacher, setClassTeacherState] = useState<ClassTeacher>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Modals visibility
  const [sectionModalVisible, setSectionModalVisible] = useState(false);
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [ctModalVisible, setCtModalVisible] = useState(false);

  // Form states
  const [sectionName, setSectionName] = useState('');
  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [enrollSectionId, setEnrollSectionId] = useState('');
  const [enrollRoll, setEnrollRoll] = useState('');
  const [assignTeacherId, setAssignTeacherId] = useState('');
  const [assignSectionId, setAssignSectionId] = useState('');
  const [assignSubjectId, setAssignSubjectId] = useState('');
  const [ctTeacherId, setCtTeacherId] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clsRes, secRes, enrRes, asnRes, stuRes, tchRes, subRes, ctRes] = await Promise.all([
        getClassById(id),
        getSections(id),
        getEnrollments(id),
        getTeacherAssignments(id),
        getStudents(),
        getTeachers(),
        getSubjects(id),
        getClassTeacher(id),
      ]);

      if (clsRes.data) setClassData({ name: clsRes.data.name, code: clsRes.data.code });
      setSections(secRes.data || []);
      setEnrollments(enrRes.data || []);
      setAssignments(asnRes.data || []);
      setStudents(stuRes.data || []);
      setTeachers(tchRes.data || []);
      setSubjects(subRes.data || []);
      setClassTeacherState(ctRes.data || null);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load class details');
    } finally {
      setLoading(false);
    }
  };

  // ---- Section Handlers ----
  const handleAddSection = async () => {
    if (!sectionName.trim()) return;
    setSaving(true);
    const { error } = await createSection(id, sectionName.trim());
    setSaving(false);
    if (error) Alert.alert('Error', error.message);
    else {
      setSectionModalVisible(false);
      setSectionName('');
      loadData();
    }
  };

  const confirmDeleteSection = (sectionId: string, sName: string) => {
    Alert.alert("Delete Section", `Are you sure you want to delete ${sName}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          await deleteSection(sectionId);
          loadData();
        }
      }
    ]);
  };

  // ---- Enrollment Handlers ----
  const handleEnroll = async () => {
    if (!enrollStudentId) {
      Alert.alert('Error', 'Please select a student');
      return;
    }
    setSaving(true);
    const { error } = await createEnrollment({
      studentId: enrollStudentId,
      classId: id,
      sectionId: enrollSectionId || undefined,
      rollNumber: enrollRoll || undefined,
    });
    setSaving(false);
    if (error) Alert.alert('Error', error.message);
    else {
      setEnrollModalVisible(false);
      setEnrollStudentId('');
      setEnrollSectionId('');
      setEnrollRoll('');
      loadData();
    }
  };

  const confirmRemoveEnrollment = (enrollId: string, studentName: string) => {
    Alert.alert("Remove Enrollment", `Remove ${studentName} from this class?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
          await deleteEnrollment(enrollId);
          loadData();
        }
      }
    ]);
  };

  // ---- Teacher Assignment Handlers ----
  const handleAssignTeacher = async () => {
    if (!assignTeacherId || !assignSubjectId) {
      Alert.alert('Error', 'Please select teacher and subject');
      return;
    }
    setSaving(true);
    const { error } = await createTeacherAssignment({
      teacherId: assignTeacherId,
      classId: id,
      sectionId: assignSectionId || undefined,
      subjectId: assignSubjectId || undefined,
    });
    setSaving(false);
    if (error) Alert.alert('Error', error.message);
    else {
      setAssignModalVisible(false);
      setAssignTeacherId('');
      setAssignSectionId('');
      setAssignSubjectId('');
      loadData();
    }
  };

  const confirmRemoveAssignment = (assignId: string) => {
    Alert.alert("Remove Assignment", "Remove this teacher assignment?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
          await deleteTeacherAssignment(assignId);
          loadData();
        }
      }
    ]);
  };

  // ---- Class Teacher Handlers ----
  const handleSetClassTeacher = async () => {
    if (!ctTeacherId) return;
    setSaving(true);
    const { error } = await setClassTeacher(id, ctTeacherId);
    setSaving(false);
    if (error) Alert.alert('Error', error.message);
    else {
      setCtModalVisible(false);
      setCtTeacherId('');
      loadData();
    }
  };

  const confirmRemoveClassTeacher = () => {
    Alert.alert("Remove Class Teacher", "Remove class teacher for this class?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
          await removeClassTeacher(id);
          loadData();
        }
      }
    ]);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Class Details</Text>
        <View style={styles.backButton} />
      </View>
      <View style={styles.headerContext}>
        <Text style={styles.className}>{classData.name}</Text>
        {classData.code ? (
          <View style={styles.headerPill}>
            <Text style={styles.headerPillText}>{classData.code}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  const renderSectionHeader = (title: string, count: number, onAdd?: () => void, icon?: any) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderTitle}>
        {icon && <Ionicons name={icon} size={20} color="#0047AB" style={{ marginRight: 8 }} />}
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{count}</Text>
      </View>
      {onAdd && (
        <TouchableOpacity style={styles.addSmallButton} onPress={onAdd}>
          <Ionicons name="add" size={20} color="#0047AB" />
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading && !sections.length) {
    return (
      <View style={styles.loadingFull}>
        <ActivityIndicator size="large" color="#0047AB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Sections */}
        <View style={styles.sectionContainer}>
          {renderSectionHeader("Sections", sections.length, () => setSectionModalVisible(true), "grid-outline")}
          <View style={styles.horizontalScroll}>
            {sections.length === 0 ? (
              <Text style={styles.emptyTextSmall}>No sections yet.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {sections.map(s => (
                  <View key={s.id} style={styles.sectionPill}>
                    <Text style={styles.sectionPillText}>Section {s.name}</Text>
                    <TouchableOpacity onPress={() => confirmDeleteSection(s.id, s.name)}>
                      <Ionicons name="close-circle" size={18} color="#FF3B30" style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        {/* Class Teacher */}
        <View style={styles.sectionContainer}>
          {renderSectionHeader("Class Teacher", classTeacher ? 1 : 0, !classTeacher ? () => setCtModalVisible(true) : undefined, "ribbon-outline")}
          {classTeacher ? (
            <View style={styles.ctCard}>
              <View style={styles.ctAvatar}>
                <Text style={styles.ctAvatarText}>{(classTeacher.teachers?.profiles?.full_name || '?').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.ctInfo}>
                <Text style={styles.ctName}>{classTeacher.teachers?.profiles?.full_name || '—'}</Text>
                <Text style={styles.ctSub}>{classTeacher.teachers?.employee_id} · Class Teacher</Text>
              </View>
              <TouchableOpacity onPress={confirmRemoveClassTeacher}>
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.emptyCard} onPress={() => setCtModalVisible(true)}>
              <Ionicons name="person-add-outline" size={24} color="#8E8E93" />
              <Text style={styles.emptyCardText}>Assign Class Teacher</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Enrolled Students */}
        <View style={styles.sectionContainer}>
          {renderSectionHeader("Enrolled Students", enrollments.length, () => setEnrollModalVisible(true), "school-outline")}
          {enrollments.length === 0 ? (
            <Text style={styles.emptyTextSmall}>No students enrolled yet.</Text>
          ) : (
            enrollments.map(e => (
              <View key={e.id} style={styles.itemCard}>
                <View style={styles.itemAvatar}>
                  <Text style={styles.itemAvatarText}>{(e.students?.profiles?.full_name || '?').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{e.students?.profiles?.full_name || '—'}</Text>
                  <Text style={styles.itemSub}>
                    {e.students?.admission_no}
                    {e.sections ? ` · Section ${e.sections.name}` : ''}
                    {e.roll_number ? ` · Roll ${e.roll_number}` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => confirmRemoveEnrollment(e.id, e.students?.profiles?.full_name || 'Student')}>
                  <Ionicons name="remove-circle-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Teacher Assignments */}
        <View style={styles.sectionContainer}>
          {renderSectionHeader("Subject Teachers", assignments.length, () => setAssignModalVisible(true), "people-outline")}
          {assignments.length === 0 ? (
            <Text style={styles.emptyTextSmall}>No teachers assigned yet.</Text>
          ) : (
            assignments.map(a => (
              <View key={a.id} style={styles.itemCard}>
                <View style={[styles.itemAvatar, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={[styles.itemAvatarText, { color: '#4CAF50' }]}>{(a.teachers?.profiles?.full_name || '?').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{a.teachers?.profiles?.full_name || '—'}</Text>
                  <Text style={styles.itemSub}>
                    {a.subjects?.name || 'No subject'} 
                    {a.sections ? ` · Section ${a.sections.name}` : ' · Whole Class'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => confirmRemoveAssignment(a.id)}>
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* --- MODALS --- */}
      
      {/* Add Section Modal */}
      <Modal visible={sectionModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalDragIndicator} />
            <Text style={styles.modalTitle}>New Section</Text>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Section Name</Text>
              <TextInput style={styles.input} placeholder="e.g. A" value={sectionName} onChangeText={setSectionName} />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setSectionModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleAddSection} disabled={saving}><Text style={styles.saveText}>{saving ? 'Saving...' : 'Add Section'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Enroll Student Modal */}
      <Modal visible={enrollModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalDragIndicator} />
            <Text style={styles.modalTitle}>Enroll Student</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Select Student</Text>
              <View style={styles.pickerContainer}>
                <ScrollView style={{ maxHeight: 150 }}>
                  {students.map(s => (
                    <TouchableOpacity key={s.id} style={[styles.pickerItem, enrollStudentId === s.id && styles.pickerItemSelected]} onPress={() => setEnrollStudentId(s.id)}>
                      <Text style={[styles.pickerItemText, enrollStudentId === s.id && styles.pickerItemTextSelected]}>{s.profiles?.full_name} ({s.admission_no})</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Section (Optional)</Text>
              <View style={styles.pickerContainer}>
                <ScrollView horizontal>
                  <TouchableOpacity style={[styles.sectionOption, !enrollSectionId && styles.sectionOptionSelected]} onPress={() => setEnrollSectionId('')}>
                    <Text style={[styles.sectionOptionText, !enrollSectionId && styles.sectionOptionTextSelected]}>None</Text>
                  </TouchableOpacity>
                  {sections.map(s => (
                    <TouchableOpacity key={s.id} style={[styles.sectionOption, enrollSectionId === s.id && styles.sectionOptionSelected]} onPress={() => setEnrollSectionId(s.id)}>
                      <Text style={[styles.sectionOptionText, enrollSectionId === s.id && styles.sectionOptionTextSelected]}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Roll Number</Text>
              <TextInput style={styles.input} placeholder="e.g. 01" value={enrollRoll} onChangeText={setEnrollRoll} keyboardType="numeric" />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEnrollModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleEnroll} disabled={saving}><Text style={styles.saveText}>{saving ? 'Enrolling...' : 'Enroll'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign Teacher Modal */}
      <Modal visible={assignModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalDragIndicator} />
            <Text style={styles.modalTitle}>Assign Teacher</Text>
            
            <ScrollView>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Select Teacher</Text>
                <View style={styles.pickerContainer}>
                  {teachers.map(t => (
                    <TouchableOpacity key={t.id} style={[styles.pickerItem, assignTeacherId === t.id && styles.pickerItemSelected]} onPress={() => setAssignTeacherId(t.id)}>
                      <Text style={[styles.pickerItemText, assignTeacherId === t.id && styles.pickerItemTextSelected]}>{t.profiles?.full_name} ({t.employee_id})</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Select Subject</Text>
                <View style={styles.pickerContainer}>
                  {subjects.map(s => (
                    <TouchableOpacity key={s.id} style={[styles.pickerItem, assignSubjectId === s.id && styles.pickerItemSelected]} onPress={() => setAssignSubjectId(s.id)}>
                      <Text style={[styles.pickerItemText, assignSubjectId === s.id && styles.pickerItemTextSelected]}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Section</Text>
                <View style={styles.pickerContainer}>
                  <ScrollView horizontal>
                    <TouchableOpacity style={[styles.sectionOption, !assignSectionId && styles.sectionOptionSelected]} onPress={() => setAssignSectionId('')}>
                      <Text style={[styles.sectionOptionText, !assignSectionId && styles.sectionOptionTextSelected]}>Whole Class</Text>
                    </TouchableOpacity>
                    {sections.map(s => (
                      <TouchableOpacity key={s.id} style={[styles.sectionOption, assignSectionId === s.id && styles.sectionOptionSelected]} onPress={() => setAssignSectionId(s.id)}>
                        <Text style={[styles.sectionOptionText, assignSectionId === s.id && styles.sectionOptionTextSelected]}>{s.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setAssignModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleAssignTeacher} disabled={saving}><Text style={styles.saveText}>{saving ? 'Assigning...' : 'Assign'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Class Teacher Modal */}
      <Modal visible={ctModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalDragIndicator} />
            <Text style={styles.modalTitle}>Class Teacher</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Select Teacher</Text>
              <View style={styles.pickerContainer}>
                <ScrollView style={{ maxHeight: 200 }}>
                  {teachers.map(t => (
                    <TouchableOpacity key={t.id} style={[styles.pickerItem, ctTeacherId === t.id && styles.pickerItemSelected]} onPress={() => setCtTeacherId(t.id)}>
                      <Text style={[styles.pickerItemText, ctTeacherId === t.id && styles.pickerItemTextSelected]}>{t.profiles?.full_name} ({t.employee_id})</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setCtModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSetClassTeacher} disabled={saving}><Text style={styles.saveText}>{saving ? 'Saving...' : 'Set Class Teacher'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  loadingFull: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#0047AB',
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backButton: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  headerContext: { flexDirection: 'row', alignItems: 'center' },
  className: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginRight: 10 },
  headerPill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  headerPillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionContainer: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionHeaderTitle: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1C1C1E' },
  sectionCount: { fontSize: 12, fontWeight: '700', color: '#0047AB', backgroundColor: '#E8F0FE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
  addSmallButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8F0FE', justifyContent: 'center', alignItems: 'center' },
  horizontalScroll: { minHeight: 40 },
  sectionPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  sectionPillText: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  emptyTextSmall: { fontSize: 14, color: '#8E8E93', fontStyle: 'italic' },
  ctCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9C4', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#FFF176' },
  ctAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FBC02D', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  ctAvatarText: { color: '#FFFFFF', fontWeight: '800', fontSize: 18 },
  ctInfo: { flex: 1 },
  ctName: { fontSize: 16, fontWeight: '800', color: '#1C1C1E' },
  ctSub: { fontSize: 12, color: '#F57F17', fontWeight: '600' },
  emptyCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#D1D5DB' },
  emptyCardText: { marginLeft: 8, fontSize: 14, fontWeight: '600', color: '#8E8E93' },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  itemAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemAvatarText: { color: '#2196F3', fontWeight: '800', fontSize: 16 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '800', color: '#1C1C1E' },
  itemSub: { fontSize: 12, color: '#8E8E93', fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalDragIndicator: { width: 40, height: 4, backgroundColor: '#E5E5E5', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1C1C1E', marginBottom: 20, textAlign: 'center' },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#1C1C1E', marginBottom: 8 },
  input: { backgroundColor: '#F4F6F8', borderRadius: 12, padding: 12, fontSize: 16, color: '#1C1C1E' },
  pickerContainer: { backgroundColor: '#F4F6F8', borderRadius: 12, padding: 8, maxHeight: 200 },
  pickerItem: { padding: 12, borderRadius: 8, marginBottom: 4 },
  pickerItemSelected: { backgroundColor: '#0047AB' },
  pickerItemText: { fontSize: 14, color: '#1C1C1E' },
  pickerItemTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  sectionOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF', marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  sectionOptionSelected: { backgroundColor: '#0047AB', borderColor: '#0047AB' },
  sectionOptionText: { fontSize: 14, color: '#1C1C1E' },
  sectionOptionTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  modalActions: { flexDirection: 'row', marginTop: 10 },
  cancelButton: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  saveButton: { flex: 2, backgroundColor: '#0047AB', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelText: { color: '#8E8E93', fontWeight: '700', fontSize: 16 },
  saveText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});
