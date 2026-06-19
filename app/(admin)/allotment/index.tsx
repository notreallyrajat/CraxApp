import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, Alert, Modal, FlatList } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';

export default function TimetableSetupScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  // Teachers
  const [teachers, setTeachers] = useState<{id: string, name: string}[]>([]);
  const [subjectTeachers, setSubjectTeachers] = useState<Record<string, string>>({}); // subject_id -> teacher_id
  
  // Teacher Selection Modal
  const [teacherModalVisible, setTeacherModalVisible] = useState(false);
  const [activeSubjectIdForTeacher, setActiveSubjectIdForTeacher] = useState<string | null>(null);

  // Settings
  const [periods, setPeriods] = useState('8');
  const [days, setDays] = useState('Monday,Tuesday,Wednesday,Thursday,Friday');
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const { data: clsData } = await supabase.from('classes').select('*').order('name');
      if (clsData) setClasses(clsData);

      const { data: setData } = await supabase.from('timetable_settings').select('*').limit(1).single();
      if (setData) {
        setSettingsId(setData.id);
        setPeriods(setData.periods_per_day?.toString() || '8');
        setDays((setData.days_of_week || []).join(','));
      }

      // Fetch Teachers with their profile names
      const { data: tchData } = await supabase.from('teachers').select('id, profiles(full_name)');
      if (tchData) {
        const mappedTeachers = tchData.map((t: any) => ({
          id: t.id,
          name: t.profiles?.full_name || 'Unknown Teacher'
        }));
        setTeachers(mappedTeachers.sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async (classId: string) => {
    setLoading(true);
    setSelectedClassId(classId);
    
    // Fetch Subjects
    const { data: subjData } = await supabase.from('subjects').select('*').eq('class_id', classId).order('priority', { ascending: true });
    setSubjects(subjData || []);

    // Fetch existing assignments to pre-fill the teacher selection
    const { data: assignData } = await supabase.from('teacher_assignments').select('*').eq('class_id', classId);
    if (assignData) {
      const initSubjTeachers: Record<string, string> = {};
      assignData.forEach(a => {
        initSubjTeachers[a.subject_id] = a.teacher_id;
      });
      setSubjectTeachers(initSubjTeachers);
    }

    setLoading(false);
  };

  const moveSubject = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === subjects.length - 1) return;

    const newSubjects = [...subjects];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    [newSubjects[index], newSubjects[swapIndex]] = [newSubjects[swapIndex], newSubjects[index]];
    
    const updated = newSubjects.map((s, i) => {
      const priority = Math.min(5, Math.max(1, Math.ceil(((i + 1) / newSubjects.length) * 5)));
      return { ...s, priority };
    });
    
    setSubjects(updated);
  };

  const openTeacherSelect = (subjectId: string) => {
    setActiveSubjectIdForTeacher(subjectId);
    setTeacherModalVisible(true);
  };

  const selectTeacher = (teacherId: string) => {
    if (activeSubjectIdForTeacher) {
      setSubjectTeachers(prev => ({ ...prev, [activeSubjectIdForTeacher]: teacherId }));
    }
    setTeacherModalVisible(false);
    setActiveSubjectIdForTeacher(null);
  };

  const getTeacherName = (subjectId: string) => {
    const tId = subjectTeachers[subjectId];
    if (!tId) return "Tap to assign teacher";
    return teachers.find(t => t.id === tId)?.name || "Unknown Teacher";
  };

  const handleSaveSettingsAndGenerate = async () => {
    if (!selectedClassId) {
      Alert.alert('Error', 'Please select a class first.');
      return;
    }

    // Ensure all subjects have teachers assigned
    const missingTeachers = subjects.filter(s => !subjectTeachers[s.id]);
    if (missingTeachers.length > 0) {
      Alert.alert('Missing Teachers', 'Please assign a teacher to all subjects before generating.');
      return;
    }

    setSaving(true);
    try {
      // 1. Save global settings
      const daysArr = days.split(',').map(s => s.trim()).filter(Boolean);
      await supabase.from('timetable_settings').update({
        periods_per_day: parseInt(periods) || 8,
        days_of_week: daysArr
      }).eq('id', settingsId);

      // 2. Save subject priorities
      for (const subj of subjects) {
        await supabase.from('subjects').update({ priority: subj.priority }).eq('id', subj.id);
      }

      // 3. Save Teacher Assignments
      // First get a default section for this class since assignments are section-bound in the schema
      const { data: sectionData } = await supabase.from('sections').select('id').eq('class_id', selectedClassId).limit(1).single();
      const defaultSectionId = sectionData?.id || null;

      // Delete old assignments
      await supabase.from('teacher_assignments').delete().eq('class_id', selectedClassId);
      
      // Insert new assignments
      const newAssignments = subjects.map(s => ({
        class_id: selectedClassId,
        subject_id: s.id,
        teacher_id: subjectTeachers[s.id],
        section_id: defaultSectionId
      }));
      
      if (newAssignments.length > 0) {
        const { error } = await supabase.from('teacher_assignments').insert(newAssignments);
        if (error) throw error;
      }

      // Proceed to generation
      router.push({ pathname: '/(admin)/allotment/generate', params: { classId: selectedClassId } });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.menuButton}>
            <Ionicons name="menu" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Allotment Setup</Text>
          <View style={styles.menuButton} />
        </View>
      </View>

      {loading && !selectedClassId ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0047AB" />
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Global Settings</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Working Days (Comma separated)</Text>
              <TextInput style={styles.input} value={days} onChangeText={setDays} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Periods Per Day</Text>
              <TextInput style={styles.input} value={periods} onChangeText={setPeriods} keyboardType="numeric" />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Select Class to Generate</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classScroll}>
              {classes.map(c => (
                <TouchableOpacity 
                  key={c.id} 
                  style={[styles.classChip, selectedClassId === c.id && styles.classChipActive]}
                  onPress={() => fetchSubjects(c.id)}
                >
                  <Text style={[styles.classChipText, selectedClassId === c.id && styles.classChipTextActive]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {selectedClassId && (
            <View style={styles.card}>
              <View style={styles.subjHeader}>
                <Text style={styles.cardTitle}>Subject Configuration</Text>
                <Text style={styles.subText}>Assign teachers and set priority (top = High)</Text>
              </View>
              
              {loading ? (
                <ActivityIndicator size="small" color="#0047AB" />
              ) : subjects.length === 0 ? (
                <Text style={styles.subText}>No subjects found for this class.</Text>
              ) : (
                subjects.map((subj, idx) => {
                  const tName = getTeacherName(subj.id);
                  const isAssigned = !!subjectTeachers[subj.id];
                  
                  return (
                    <View key={subj.id} style={styles.subjectRow}>
                      <View style={styles.subjectInfo}>
                        <Text style={styles.subjectName}>{subj.name}</Text>
                        
                        <TouchableOpacity 
                          style={[styles.teacherBtn, !isAssigned && styles.teacherBtnUnassigned]} 
                          onPress={() => openTeacherSelect(subj.id)}
                        >
                          <Ionicons name="person" size={12} color={isAssigned ? "#0047AB" : "#EF4444"} />
                          <Text style={[styles.teacherBtnText, !isAssigned && {color: "#EF4444"}]}>
                            {tName}
                          </Text>
                        </TouchableOpacity>

                      </View>
                      <View style={styles.arrows}>
                        <TouchableOpacity onPress={() => moveSubject(idx, 'up')} disabled={idx === 0} style={styles.arrowBtn}>
                          <Ionicons name="chevron-up" size={24} color={idx === 0 ? '#D1D5DB' : '#0047AB'} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => moveSubject(idx, 'down')} disabled={idx === subjects.length - 1} style={styles.arrowBtn}>
                          <Ionicons name="chevron-down" size={24} color={idx === subjects.length - 1 ? '#D1D5DB' : '#0047AB'} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

        </ScrollView>
      )}

      {selectedClassId && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.generateBtn}
            onPress={handleSaveSettingsAndGenerate}
            disabled={saving || loading}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.generateBtnText}>Save & Generate</Text>}
            {!saving && <Ionicons name="sparkles" size={18} color="#fff" style={{ marginLeft: 8 }} />}
          </TouchableOpacity>
        </View>
      )}

      {/* Teacher Selection Modal */}
      <Modal visible={teacherModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Teacher</Text>
              <TouchableOpacity onPress={() => setTeacherModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1C1C1E" />
              </TouchableOpacity>
            </View>
            <FlatList 
              data={teachers}
              keyExtractor={item => item.id}
              renderItem={({item}) => (
                <TouchableOpacity style={styles.teacherItem} onPress={() => selectTeacher(item.id)}>
                  <Ionicons name="person-circle-outline" size={24} color="#64748B" />
                  <Text style={styles.teacherItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  header: { backgroundColor: '#0047AB', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  menuButton: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1C1C1E', marginBottom: 16 },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', color: '#8E8E93', marginBottom: 6 },
  input: { backgroundColor: '#F4F6F8', borderRadius: 10, padding: 12, fontSize: 14, color: '#1C1C1E', fontWeight: '500' },
  classScroll: { flexDirection: 'row' },
  classChip: { backgroundColor: '#F4F6F8', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#E5E5EA' },
  classChipActive: { backgroundColor: '#0047AB', borderColor: '#0047AB' },
  classChipText: { color: '#666', fontWeight: '600' },
  classChipTextActive: { color: '#FFF' },
  subjHeader: { marginBottom: 12 },
  subText: { fontSize: 12, color: '#8E8E93', fontWeight: '500' },
  subjectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F4F6F8' },
  subjectInfo: { flex: 1 },
  subjectName: { fontSize: 15, fontWeight: '700', color: '#1C1C1E', marginBottom: 6 },
  teacherBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F7FF', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  teacherBtnUnassigned: { backgroundColor: '#FEE2E2' },
  teacherBtnText: { fontSize: 12, fontWeight: '600', color: '#0047AB', marginLeft: 6 },
  arrows: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F6F8', borderRadius: 12, padding: 4 },
  arrowBtn: { padding: 4, marginHorizontal: 4 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F4F6F8' },
  generateBtn: { backgroundColor: '#0047AB', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12 },
  generateBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1C1C1E' },
  teacherItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  teacherItemText: { fontSize: 16, color: '#1C1C1E', fontWeight: '600', marginLeft: 12 },
  separator: { height: 1, backgroundColor: '#F1F5F9' }
});
