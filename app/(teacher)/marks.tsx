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
  Platform,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getTeacherProfile, getAssignedClasses } from '../../lib/services/teacher';
import { 
  getExamsForClass, 
  getResultsForExamSubject, 
  saveResults,
  autoGrade,
  checkSubjectTeacher,
  updateAnswerSheet,
  clearAnswerSheet
} from '../../lib/services/exam';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { uploadFile } from '../../lib/services/resource';

export default function TeacherMarksScreen() {
  const [view, setView] = useState<'classes' | 'exams' | 'subjects' | 'enter'>('classes');
  const [teacher, setTeacher] = useState<any>(null);
  const [assignedClasses, setAssignedClasses] = useState<any[]>([]);
  const [activeClass, setActiveClass] = useState<any>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [activeExam, setActiveExam] = useState<any>(null);
  const [activeExamSubject, setActiveExamSubject] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const router = useRouter();

  const loadTeacher = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: profile } = await getTeacherProfile(session.user.id);
    if (profile?.teachers) {
      setTeacher(profile.teachers);
      const classesRes = await getAssignedClasses(profile.teachers.id);
      
      const uniqueClasses = [];
      const seen = new Set();
      (classesRes.data || []).forEach(c => {
        if (!seen.has(c.class_id)) {
          seen.add(c.class_id);
          uniqueClasses.push(c);
        }
      });
      setAssignedClasses(uniqueClasses);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTeacher();
  }, [loadTeacher]);

  const openClass = async (cls: any) => {
    setActiveClass(cls);
    setView('exams');
    setLoading(true);
    const { data } = await getExamsForClass(cls.class_id, cls.section_id);
    setExams(data || []);
    setLoading(false);
  };

  const openExam = (exam: any) => {
    setActiveExam(exam);
    setView('subjects');
  };

  const openSubject = async (examSub: any) => {
    setActiveExamSubject(examSub);
    setView('enter');
    setLoading(true);
    try {
      const [resultsRes, teacherCheck] = await Promise.all([
        getResultsForExamSubject(examSub.id),
        checkSubjectTeacher(teacher.id, activeClass.class_id, examSub.subject_id)
      ]);
      
      setCanEdit(teacherCheck);

      let studentQuery = supabase
        .from('enrollments')
        .select(`
          roll_number,
          students (
            id,
            admission_no,
            profiles ( full_name )
          )
        `)
        .eq('class_id', activeClass.class_id);

      if (activeClass.section_id) {
        studentQuery = studentQuery.eq('section_id', activeClass.section_id);
      }

      const { data: enrolled } = await studentQuery.order('roll_number');

      const resultMap = new Map();
      (resultsRes.data || []).forEach((r: any) => {
        if (r.students?.id) resultMap.set(r.students.id, r);
      });

      const marksRows = (enrolled || [])
        .filter((e: any) => e.students !== null)
        .map((e: any) => {
          const res = resultMap.get(e.students.id);
          return {
            studentId: e.students.id,
            admissionNo: e.students.admission_no,
            fullName: e.students.profiles?.full_name ?? "—",
            rollNumber: e.roll_number,
            resultId: res?.id ?? null,
            marksObtained: res?.marks_obtained?.toString() ?? "",
            grade: res?.grade ?? "",
            remarks: res?.remarks ?? "",
            answerSheetUrl: res?.answer_sheet_url ?? null,
            answerSheetPath: res?.answer_sheet_path ?? null,
          };
        });
      setRows(marksRows);
    } catch (error) {
      Alert.alert("Error", "Failed to load marks.");
    } finally {
      setLoading(false);
    }
  };

  const setMark = (sid: string, field: string, value: string) => {
    setRows(prev => prev.map(r => {
      if (r.studentId === sid) {
        const updated = { ...r, [field]: value };
        if (field === 'marksObtained') {
          updated.grade = autoGrade(value, activeExamSubject.total_marks);
        }
        return updated;
      }
      return r;
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await saveResults(activeExamSubject.id, rows.map(r => ({
        id: r.resultId,
        studentId: r.studentId,
        marksObtained: r.marksObtained,
        grade: r.grade || undefined,
        remarks: r.remarks || undefined
      })));
      if (error) throw error;
      Alert.alert("Success", "Marks saved successfully!");
      setView('subjects');
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save marks.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadSheet = async (sid: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (result.canceled) return;

      const file = result.assets[0];
      
      // Strict PDF Protocol
      if (file.mimeType !== "application/pdf" && !file.name.toLowerCase().endsWith('.pdf')) {
        Alert.alert("Invalid Format", "Only PDF files are accepted for academic evidence.");
        return;
      }

      setUploading(sid);
      const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: 'base64' });
      
      const { data, error } = await uploadFile(
        file.uri,
        file.name,
        'application/pdf',
        `answer-sheets/${activeExamSubject.id}/${sid}`
      );

      if (error) throw error;

      const row = rows.find(r => r.studentId === sid);
      if (row?.resultId) {
        await updateAnswerSheet(row.resultId, data.publicUrl, data.path);
        setRows(prev => prev.map(r => r.studentId === sid ? { ...r, answerSheetUrl: data.publicUrl, answerSheetPath: data.path } : r));
        Alert.alert("Success", "Answer sheet optimized and attached.");
      } else {
        Alert.alert("Note", "Please save marks for this student first before attaching an answer sheet.");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to upload answer sheet.");
    } finally {
      setUploading(null);
    }
  };

  if (loading && view === 'classes') {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a1d2e" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            if (view === 'classes') router.back();
            else if (view === 'exams') setView('classes');
            else if (view === 'subjects') setView('exams');
            else setView('subjects');
          }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>
            {view === 'classes' ? 'Exams & Marks' : 
             view === 'exams' ? activeClass?.classes?.name : 
             view === 'subjects' ? activeExam?.title : 'Enter Marks'}
          </Text>
          <Text style={styles.headerSub}>
            {view === 'subjects' ? 'Select Subject' : 
             view === 'enter' ? activeExamSubject?.subjects?.name : 'Manage student performance'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {loading && <ActivityIndicator color="#1a1d2e" style={{ marginTop: 20 }} />}
        
        {!loading && view === 'classes' && assignedClasses.map(cls => (
          <TouchableOpacity key={cls.id} style={styles.card} onPress={() => openClass(cls)}>
            <View style={styles.cardInfo}>
              <View style={[styles.iconBox, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="trophy" size={24} color="#9C27B0" />
              </View>
              <View>
                <Text style={styles.cardName}>{cls.classes.name}</Text>
                <Text style={styles.cardSub}>{cls.sections ? `Section ${cls.sections.name}` : 'Whole Class'}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        ))}

        {!loading && view === 'exams' && exams.map(exam => (
          <TouchableOpacity key={exam.id} style={styles.card} onPress={() => openExam(exam)}>
            <View style={styles.cardInfo}>
              <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="document-text" size={24} color="#1976D2" />
              </View>
              <View>
                <Text style={styles.cardName}>{exam.title}</Text>
                <Text style={styles.cardSub}>
                  {new Date(exam.start_date).toLocaleDateString()} - {new Date(exam.end_date).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        ))}

        {!loading && view === 'subjects' && activeExam?.exam_subjects?.map((es: any) => (
          <TouchableOpacity key={es.id} style={styles.card} onPress={() => openSubject(es)}>
            <View style={styles.cardInfo}>
              <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                <Text style={styles.subjectInit}>{es.subjects.name.charAt(0)}</Text>
              </View>
              <View>
                <Text style={styles.cardName}>{es.subjects.name}</Text>
                <Text style={styles.cardSub}>Max Marks: {es.total_marks}</Text>
              </View>
            </View>
            <View style={styles.rightAction}>
              <Text style={styles.viewEnterText}>Enter</Text>
              <Ionicons name="chevron-forward" size={16} color="#1a1d2e" />
            </View>
          </TouchableOpacity>
        ))}

        {!loading && view === 'enter' && (
          <>
            {!canEdit && (
              <View style={styles.readOnlyBanner}>
                <Ionicons name="lock-closed" size={16} color="#92400E" />
                <Text style={styles.readOnlyText}>View Only — You are not the subject teacher.</Text>
              </View>
            )}
            {rows.map((row, idx) => {
              const marks = parseFloat(row.marksObtained);
              const total = parseFloat(activeExamSubject.total_marks);
              const isPassing = isNaN(marks) || isNaN(total) ? true : (marks / total) >= 0.4;

              return (
                <View key={row.studentId} style={[styles.markRow, !isPassing && styles.failingRow]}>
                  <View style={styles.rowTop}>
                    <View style={styles.studentMeta}>
                      <Text style={styles.studentName}>{row.fullName}</Text>
                      <Text style={styles.studentAdm}>{row.admissionNo} • Roll: {row.rollNumber || idx + 1}</Text>
                    </View>
                    <View style={styles.markInputContainer}>
                      <TextInput 
                        style={[styles.markInput, !canEdit && styles.disabledInput]}
                        keyboardType="numeric"
                        value={row.marksObtained}
                        onChangeText={(v) => setMark(row.studentId, 'marksObtained', v)}
                        placeholder="Marks"
                        editable={canEdit}
                      />
                      <TextInput 
                        style={[styles.markInput, { width: 45 }, !canEdit && styles.disabledInput]}
                        value={row.grade}
                        onChangeText={(v) => setMark(row.studentId, 'grade', v)}
                        placeholder="Gr."
                        autoCapitalize="characters"
                        editable={canEdit}
                      />
                    </View>
                  </View>
                  
                  <View style={styles.rowBottom}>
                    <TextInput 
                      style={[styles.remarksInput, !canEdit && styles.disabledInput]}
                      value={row.remarks}
                      onChangeText={(v) => setMark(row.studentId, 'remarks', v)}
                      placeholder="Remarks..."
                      editable={canEdit}
                    />
                    {row.answerSheetUrl && (
                      <TouchableOpacity 
                        style={[styles.sheetBtn, { backgroundColor: '#F3E5F5', marginRight: 5 }]} 
                        onPress={() => Linking.openURL(row.answerSheetUrl)}
                      >
                        <Ionicons name="eye-outline" size={20} color="#9C27B0" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      style={styles.sheetBtn} 
                      onPress={() => handleUploadSheet(row.studentId)}
                      disabled={!canEdit || uploading === row.studentId}
                    >
                      {uploading === row.studentId ? (
                        <ActivityIndicator size="small" color="#1a1d2e" />
                      ) : (
                        <Ionicons 
                          name={row.answerSheetUrl ? "cloud-upload" : "attach"} 
                          size={20} 
                          color={row.answerSheetUrl ? "#1a1d2e" : "#64748b"} 
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {view === 'enter' && canEdit && (
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save All Results</Text>}
        </TouchableOpacity>
      )}
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
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 2 },
  cardInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardName: { fontSize: 16, fontWeight: '700', color: '#1a1d2e' },
  cardSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  subjectInit: { fontSize: 18, fontWeight: '800', color: '#43A047' },
  rightAction: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0f0f5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  viewEnterText: { fontSize: 12, fontWeight: '700', color: '#1a1d2e' },
  readOnlyBanner: { backgroundColor: '#FFFBEB', borderBottomWidth: 1, borderBottomColor: '#FEF3C7', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
  readOnlyText: { fontSize: 12, color: '#92400E', fontWeight: '600', flex: 1 },
  markRow: { backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5 },
  failingRow: { backgroundColor: '#FEF2F2', borderLeftWidth: 3, borderLeftColor: '#EF4444' },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  studentMeta: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '700', color: '#1a1d2e' },
  studentAdm: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  markInputContainer: { flexDirection: 'row', gap: 8 },
  markInput: { backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 10, height: 40, width: 65, fontSize: 14, fontWeight: '700', color: '#1a1d2e', textAlign: 'center' },
  disabledInput: { opacity: 0.6, backgroundColor: 'transparent' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  remarksInput: { flex: 1, fontSize: 13, color: '#475569', height: 36, paddingHorizontal: 10, backgroundColor: '#f8fafc', borderRadius: 8 },
  sheetBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  saveBtn: { backgroundColor: '#1a1d2e', margin: 20, padding: 18, borderRadius: 18, alignItems: 'center', elevation: 4 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
