import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal, Alert, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getClassById, getSections, createSection, deleteSection, getClassTeacher, setClassTeacher, removeClassTeacher } from '../../../lib/services/class';
import { getEnrollments, createEnrollment, deleteEnrollment, getTeacherAssignments, createTeacherAssignment, deleteTeacherAssignment } from '../../../lib/services/enrollment';
import { getStudents } from '../../../lib/services/student';
import { getTeachers } from '../../../lib/services/teacher';
import { getSubjects, createSubject, deleteSubject } from '../../../lib/services/subject';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import Papa from 'papaparse';
import { supabase } from '../../../lib/supabase';

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
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Modals visibility
  const [sectionModalVisible, setSectionModalVisible] = useState(false);
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [ctModalVisible, setCtModalVisible] = useState(false);
  const [previewSubjectModalVisible, setPreviewSubjectModalVisible] = useState(false);
  const [previewStudentModalVisible, setPreviewStudentModalVisible] = useState(false);
  const [previewStudentData, setPreviewStudentData] = useState<any[]>([]);

  // Form & UI states
  const [uploadingSubjectCsv, setUploadingSubjectCsv] = useState(false);
  const [uploadingStudentCsv, setUploadingStudentCsv] = useState(false);
  const [previewSubjectData, setPreviewSubjectData] = useState<any[]>([]);
  const [sectionName, setSectionName] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [assignTeacherId, setAssignTeacherId] = useState('');
  const [assignSectionId, setAssignSectionId] = useState('');
  const [assignSubjectIds, setAssignSubjectIds] = useState<string[]>([]);
  const [ctTeacherId, setCtTeacherId] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clsRes, secRes, enrRes, asnRes, stuRes, tchRes, subRes, allSubRes, ctRes] = await Promise.all([
        getClassById(id),
        getSections(id),
        getEnrollments(id),
        getTeacherAssignments(id),
        getStudents(0, 10000),
        getTeachers(),
        getSubjects(id),
        getSubjects(),
        getClassTeacher(id),
      ]);

      if (clsRes.data) setClassData({ name: clsRes.data.name, code: clsRes.data.code });
      setSections(secRes.data || []);
      setEnrollments((enrRes.data as any) || []);
      setAssignments((asnRes.data as any) || []);
      setStudents(stuRes.data || []);
      setTeachers(tchRes.data || []);
      setSubjects(subRes.data || []);
      
      // Filter unique subjects across all classes
      if (allSubRes && allSubRes.data) {
        const uniqueSubjects = [];
        const seen = new Set();
        for (const s of allSubRes.data) {
          const key = (s.name + '|' + (s.code || '')).toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            uniqueSubjects.push(s);
          }
        }
        setAllSubjects(uniqueSubjects);
      }

      setClassTeacherState((ctRes.data as any) || null);
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

  // ---- Subject Handlers ----
  const handleAddSubject = async () => {
    if (!subjectName.trim()) return;
    setSaving(true);
    const { error } = await createSubject({ name: subjectName.trim(), class_id: id, code: subjectCode.trim() || undefined });
    setSaving(false);
    if (error) Alert.alert('Error', error.message);
    else {
      setSubjectModalVisible(false);
      setSubjectName('');
      setSubjectCode('');
      loadData();
    }
  };

  const confirmDeleteSubject = (subjectId: string, sName: string) => {
    Alert.alert("Delete Subject", `Are you sure you want to delete ${sName}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          await deleteSubject(subjectId);
          loadData();
        }
      }
    ]);
  };

  const handleSubjectCsvUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/vnd.ms-excel', 'text/comma-separated-values', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setUploadingSubjectCsv(true);
      const fileUri = result.assets[0].uri;
      let fileData: any;
      if (result.assets[0].file) fileData = result.assets[0].file;
      else fileData = await FileSystem.readAsStringAsync(fileUri, { encoding: 'utf8' as any });

      Papa.parse(fileData, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const rows = results.data as any[];
          if (rows.length === 0) {
            Alert.alert('Error', 'The CSV file is empty.');
            setUploadingSubjectCsv(false);
            return;
          }

          const formattedRows = rows.map(row => ({
            name: row['subject name'] || row['name'] || row['Subject Name'] || row['Name'] || '',
            code: row['subject code'] || row['code'] || row['Subject Code'] || row['Code'] || '',
          })).filter(row => row.name);

          if (formattedRows.length === 0) {
            Alert.alert('Error', 'No valid subjects found. Ensure CSV has "Subject Name".');
            setUploadingSubjectCsv(false);
            return;
          }

          setPreviewSubjectData(formattedRows);
          setPreviewSubjectModalVisible(true);
          setUploadingSubjectCsv(false);
        },
        error: (error: any) => {
          Alert.alert('Error parsing CSV', error.message);
          setUploadingSubjectCsv(false);
        }
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
      setUploadingSubjectCsv(false);
    }
  };

  const confirmSubjectCsvUpload = async () => {
    setUploadingSubjectCsv(true);
    const validData = previewSubjectData.filter(item => item.name.trim() !== '');
    
    if (validData.length === 0) {
      Alert.alert('Error', 'No valid subjects to upload.');
      setUploadingSubjectCsv(false);
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const subject of validData) {
      const { error } = await createSubject({
        name: subject.name,
        code: subject.code || undefined,
        class_id: id,
      });

      if (!error) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    Alert.alert('Upload Complete', `Successfully imported ${successCount} subjects. Failed: ${failCount}`);
    setPreviewSubjectModalVisible(false);
    setPreviewSubjectData([]);
    loadData();
    setUploadingSubjectCsv(false);
  };

  const updatePreviewSubjectItem = (index: number, field: string, value: string) => {
    const newData = [...previewSubjectData];
    newData[index][field] = value;
    setPreviewSubjectData(newData);
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

  const parseDob = (dobStr: string): string | null => {
    if (!dobStr) return null;
    const clean = dobStr.trim().replace(/^'|'$/g, '');
    if (!clean) return null;
    
    const parts = clean.split(/[\/\-]/);
    if (parts.length === 3) {
      let day = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      
      if (day > 0 && day <= 31 && month > 0 && month <= 12 && year > 1900) {
        const mm = month < 10 ? `0${month}` : `${month}`;
        const dd = day < 10 ? `0${day}` : `${day}`;
        return `${year}-${mm}-${dd}`;
      }
      
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
        const mm = month < 10 ? `0${month}` : `${month}`;
        const dd = day < 10 ? `0${day}` : `${day}`;
        return `${year}-${mm}-${dd}`;
      }
    }
    
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
    return null;
  };

  const handleStudentCsvUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/vnd.ms-excel', 'text/comma-separated-values', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setUploadingStudentCsv(true);
      const fileUri = result.assets[0].uri;
      let fileData: any;
      if (result.assets[0].file) {
        fileData = result.assets[0].file;
      } else {
        fileData = await FileSystem.readAsStringAsync(fileUri, { encoding: 'utf8' as any });
      }

      Papa.parse(fileData, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().replace(/^\uFEFF/g, '').toLowerCase(),
        complete: async (results) => {
          const rows = results.data as any[];
          if (rows.length === 0) {
            Alert.alert('Error', 'The CSV file is empty.');
            setUploadingStudentCsv(false);
            return;
          }

          const formattedRows = rows.map(row => {
            const nameKey = Object.keys(row).find(k => k.includes('name'));
            const emailKey = Object.keys(row).find(k => k.includes('email'));
            const passwordKey = Object.keys(row).find(k => k.includes('pass'));
            const admissionKey = Object.keys(row).find(k => k.includes('admission') || k.includes('adm'));
            const phoneKey = Object.keys(row).find(k => k.includes('phone') || k.includes('call'));
            const dobKey = Object.keys(row).find(k => k.includes('birth') || k.includes('dob') || k.includes('date'));

            const fullNameVal = nameKey ? row[nameKey] : '';
            const emailVal = emailKey ? row[emailKey] : '';
            const passwordVal = passwordKey ? row[passwordKey] : 'password123';
            const admissionNoVal = admissionKey ? row[admissionKey] : '';
            const phoneVal = phoneKey ? row[phoneKey] : '';
            const dobVal = dobKey ? row[dobKey] : '';

            const cleanStr = (val: any) => typeof val === 'string' ? val.trim().replace(/^'|'$/g, '') : '';

            return {
              fullName: cleanStr(fullNameVal),
              email: cleanStr(emailVal),
              password: cleanStr(passwordVal) || 'password123',
              admissionNo: cleanStr(admissionNoVal),
              phone: cleanStr(phoneVal),
              dateOfBirth: cleanStr(dobVal)
            };
          }).filter(row => row.fullName && row.email && row.admissionNo);

          if (formattedRows.length === 0) {
            Alert.alert('Error', 'No valid students found. Ensure CSV has "Full Name", "Email", and "Admission No".');
            setUploadingStudentCsv(false);
            return;
          }

          setPreviewStudentData(formattedRows);
          setPreviewStudentModalVisible(true);
          setUploadingStudentCsv(false);
        },
        error: (error: any) => {
          Alert.alert('Error parsing CSV', error.message);
          setUploadingStudentCsv(false);
        }
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
      setUploadingStudentCsv(false);
    }
  };

  const confirmStudentCsvUpload = async () => {
    setUploadingStudentCsv(true);
    const validData = previewStudentData.filter(
      item => item.fullName.trim() !== '' && item.email.trim() !== '' && item.admissionNo.trim() !== ''
    );

    if (validData.length === 0) {
      Alert.alert('Error', 'No valid students to upload.');
      setUploadingStudentCsv(false);
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const student of validData) {
      try {
        let studentId = '';
        
        const { data: resData, error: invokeErr } = await supabase.functions.invoke('manage-users', {
          body: {
            email: student.email,
            password: student.password,
            fullName: student.fullName,
            phone: student.phone || undefined,
            role: 'student',
            extraData: {
              admissionNo: student.admissionNo,
              dateOfBirth: parseDob(student.dateOfBirth),
            },
          }
        });

        if (!invokeErr && resData && resData.profileId) {
          const { data: stData } = await supabase
            .from('students')
            .select('id')
            .eq('profile_id', resData.profileId)
            .single();
          if (stData) studentId = stData.id;
        } else {
          const { data: stData } = await supabase
            .from('students')
            .select('id')
            .eq('admission_no', student.admissionNo)
            .single();
          
          if (stData) {
            studentId = stData.id;
          } else {
            const { data: profData } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', student.email)
              .single();
            
            if (profData) {
              const { data: stData2 } = await supabase
                .from('students')
                .select('id')
                .eq('profile_id', profData.id)
                .single();
              
              if (stData2) {
                studentId = stData2.id;
              } else {
                const { data: newSt, error: stErr } = await supabase
                  .from('students')
                  .insert({
                    profile_id: profData.id,
                    admission_no: student.admissionNo,
                    date_of_birth: parseDob(student.dateOfBirth),
                  })
                  .select('id')
                  .single();
                if (!stErr && newSt) {
                  studentId = newSt.id;
                }
              }
            }
          }
        }

        if (studentId) {
          const { data: existingEnroll } = await supabase
            .from('enrollments')
            .select('id')
            .eq('student_id', studentId)
            .eq('class_id', id)
            .maybeSingle();

          if (!existingEnroll) {
            const { error: enrollErr } = await createEnrollment({
              studentId: studentId,
              classId: id,
            });
            if (!enrollErr) {
              successCount++;
            } else {
              failCount++;
            }
          } else {
            successCount++;
          }
        } else {
          failCount++;
        }
      } catch (err) {
        console.error("Error creating/enrolling student:", err);
        failCount++;
      }
    }

    Alert.alert('Upload Complete', `Successfully imported and enrolled ${successCount} students. Failed: ${failCount}`);
    setPreviewStudentModalVisible(false);
    setPreviewStudentData([]);
    loadData();
    setUploadingStudentCsv(false);
  };

  const updatePreviewStudentItem = (index: number, field: string, value: string) => {
    const newData = [...previewStudentData];
    newData[index][field] = value;
    setPreviewStudentData(newData);
  };

  // ---- Teacher Assignment Handlers ----
  const handleAssignTeacher = async () => {
    if (!assignTeacherId || assignSubjectIds.length === 0) {
      Alert.alert('Error', 'Please select teacher and at least one subject');
      return;
    }
    setSaving(true);
    let hasError = false;
    let errorMessage = '';

    for (const subjectId of assignSubjectIds) {
      const { error } = await createTeacherAssignment({
        teacherId: assignTeacherId,
        classId: id,
        sectionId: assignSectionId || undefined,
        subjectId: subjectId,
      });
      if (error) {
        hasError = true;
        errorMessage = error.message;
      }
    }

    setSaving(false);
    if (hasError) Alert.alert('Error', errorMessage);
    else {
      setAssignModalVisible(false);
      setAssignTeacherId('');
      setAssignSectionId('');
      setAssignSubjectIds([]);
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

  const renderSectionHeader = (title: string, count: number, onAdd?: () => void, icon?: any, onUpload?: () => void) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderTitle}>
        {icon && <Ionicons name={icon} size={20} color="#0047AB" style={{ marginRight: 8 }} />}
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{count}</Text>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {onUpload && (
          <TouchableOpacity style={[styles.addSmallButton, { marginRight: 8 }]} onPress={onUpload}>
            <Ionicons name="document-text-outline" size={20} color="#0047AB" />
          </TouchableOpacity>
        )}
        {onAdd && (
          <TouchableOpacity style={styles.addSmallButton} onPress={onAdd}>
            <Ionicons name="add" size={20} color="#0047AB" />
          </TouchableOpacity>
        )}
      </View>
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

        {/* Subjects */}
        <View style={styles.sectionContainer}>
          {renderSectionHeader("Subjects", subjects.length, () => setSubjectModalVisible(true), "book-outline", handleSubjectCsvUpload)}
          <View style={styles.horizontalScroll}>
            {subjects.length === 0 ? (
              <Text style={styles.emptyTextSmall}>No subjects yet.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {subjects.map(s => (
                  <View key={s.id} style={styles.sectionPill}>
                    <Text style={styles.sectionPillText}>{s.name} {s.code ? `(${s.code})` : ''}</Text>
                    <TouchableOpacity onPress={() => confirmDeleteSubject(s.id, s.name)}>
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
          {renderSectionHeader("Enrolled Students", enrollments.length, () => router.push(`/(admin)/classes/${id}/enroll-students`), "school-outline", handleStudentCsvUpload)}
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

      {/* Add Subject Modal */}
      <Modal visible={subjectModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalDragIndicator} />
            <Text style={styles.modalTitle}>New Subject</Text>
            
            {allSubjects.length > 0 && (
              <View style={[styles.formGroup, { marginBottom: 16 }]}>
                <Text style={styles.label}>Select from Existing</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingBottom: 8 }}>
                  {allSubjects.map((s, idx) => (
                    <TouchableOpacity 
                      key={idx} 
                      style={[styles.sectionOption, subjectName === s.name && subjectCode === (s.code || '') && styles.sectionOptionSelected]}
                      onPress={() => {
                        setSubjectName(s.name);
                        setSubjectCode(s.code || '');
                      }}
                    >
                      <Text style={[styles.sectionOptionText, subjectName === s.name && subjectCode === (s.code || '') && styles.sectionOptionTextSelected]}>
                        {s.name} {s.code ? `(${s.code})` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Subject Name *</Text>
              <TextInput style={styles.input} placeholder="e.g. Mathematics" value={subjectName} onChangeText={setSubjectName} />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Subject Code (Optional)</Text>
              <TextInput style={styles.input} placeholder="e.g. MATH101" value={subjectCode} onChangeText={setSubjectCode} autoCapitalize="characters" />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setSubjectModalVisible(false); setSubjectName(''); setSubjectCode(''); }}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleAddSubject} disabled={saving}><Text style={styles.saveText}>{saving ? 'Saving...' : 'Add Subject'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CSV Subject Preview Modal */}
      <Modal visible={previewSubjectModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '85%' }]}>
            <View style={styles.modalDragIndicator} />
            <Text style={styles.modalTitle}>Review Subject Data</Text>
            
            <View style={styles.previewHeaderRow}>
              <Text style={[styles.previewHeaderText, { flex: 2 }]}>Subject Name</Text>
              <Text style={[styles.previewHeaderText, { flex: 1.5 }]}>Subject Code</Text>
            </View>
            
            <FlatList
              data={previewSubjectData}
              keyExtractor={(_, index) => index.toString()}
              style={{ flex: 1, marginBottom: 16 }}
              renderItem={({ item, index }) => (
                <View style={styles.previewRow}>
                  <View style={{ flex: 2, marginRight: 8 }}>
                    <TextInput
                      style={styles.previewInput}
                      value={item.name}
                      onChangeText={(val) => updatePreviewSubjectItem(index, 'name', val)}
                      placeholder="Subject Name"
                    />
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <TextInput
                      style={styles.previewInput}
                      value={item.code}
                      onChangeText={(val) => updatePreviewSubjectItem(index, 'code', val)}
                      placeholder="Subject Code"
                      autoCapitalize="characters"
                    />
                  </View>
                </View>
              )}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setPreviewSubjectModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, (uploadingSubjectCsv) && { opacity: 0.7 }]} 
                onPress={confirmSubjectCsvUpload} 
                disabled={uploadingSubjectCsv}
              >
                <Text style={styles.saveText}>{uploadingSubjectCsv ? 'Uploading...' : 'Confirm Upload'}</Text>
              </TouchableOpacity>
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
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Select Teacher</Text>
                <View style={styles.pickerContainer}>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                    {teachers.map(t => (
                      <TouchableOpacity key={t.id} style={[styles.pickerItem, assignTeacherId === t.id && styles.pickerItemSelected]} onPress={() => setAssignTeacherId(t.id)}>
                        <Text style={[styles.pickerItemText, assignTeacherId === t.id && styles.pickerItemTextSelected]}>{t.profiles?.full_name} ({t.employee_id})</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Select Subject(s)</Text>
                <View style={styles.pickerContainer}>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                    {subjects.length === 0 ? (
                      <Text style={{ padding: 10, color: '#8E8E93', fontStyle: 'italic', fontSize: 13 }}>No subjects available. Please add subjects to the class first.</Text>
                    ) : (
                      subjects.map(s => {
                        const isSelected = assignSubjectIds.includes(s.id);
                        return (
                          <TouchableOpacity 
                            key={s.id} 
                            style={[styles.pickerItem, isSelected && styles.pickerItemSelected]} 
                            onPress={() => {
                              if (isSelected) {
                                setAssignSubjectIds(prev => prev.filter(sid => sid !== s.id));
                              } else {
                                setAssignSubjectIds(prev => [...prev, s.id]);
                              }
                            }}
                          >
                            <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>{s.name}</Text>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Section</Text>
                <View style={styles.pickerContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

      {/* CSV Student Preview Modal */}
      <Modal visible={previewStudentModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '85%' }]}>
            <View style={styles.modalDragIndicator} />
            <Text style={styles.modalTitle}>Review Student Data ({previewStudentData.length})</Text>
            
            <View style={styles.previewHeaderRow}>
              <Text style={[styles.previewHeaderText, { flex: 2 }]}>Name & Email</Text>
              <Text style={[styles.previewHeaderText, { flex: 1.5 }]}>Adm No & DOB</Text>
            </View>
            
            <FlatList
              data={previewStudentData}
              keyExtractor={(_, index) => index.toString()}
              style={{ flex: 1, marginBottom: 16 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <View style={styles.previewRow}>
                  <View style={{ flex: 2, marginRight: 8 }}>
                    <TextInput
                      style={[styles.previewInput, { marginBottom: 8 }]}
                      value={item.fullName}
                      onChangeText={(val) => updatePreviewStudentItem(index, 'fullName', val)}
                      placeholder="Full Name"
                    />
                    <TextInput
                      style={styles.previewInput}
                      value={item.email}
                      onChangeText={(val) => updatePreviewStudentItem(index, 'email', val)}
                      placeholder="Email"
                      keyboardType="email-address"
                    />
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <TextInput
                      style={[styles.previewInput, { marginBottom: 8 }]}
                      value={item.admissionNo}
                      onChangeText={(val) => updatePreviewStudentItem(index, 'admissionNo', val)}
                      placeholder="Adm No"
                    />
                    <TextInput
                      style={styles.previewInput}
                      value={item.dateOfBirth}
                      onChangeText={(val) => updatePreviewStudentItem(index, 'dateOfBirth', val)}
                      placeholder="DOB (DD/MM/YYYY)"
                    />
                  </View>
                </View>
              )}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setPreviewStudentModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, (uploadingStudentCsv) && { opacity: 0.7 }]} 
                onPress={confirmStudentCsvUpload} 
                disabled={uploadingStudentCsv}
              >
                <Text style={styles.saveText}>{uploadingStudentCsv ? 'Enrolling...' : 'Confirm Upload'}</Text>
              </TouchableOpacity>
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
  previewHeaderRow: { flexDirection: 'row', paddingHorizontal: 4, marginBottom: 8 },
  previewHeaderText: { fontSize: 13, fontWeight: '700', color: '#8E8E93' },
  previewRow: { flexDirection: 'row', marginBottom: 12, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#F4F6F8' },
  previewInput: { backgroundColor: '#F4F6F8', borderRadius: 8, padding: 10, fontSize: 13, color: '#1C1C1E', fontWeight: '500' },
});
