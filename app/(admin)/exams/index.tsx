import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Modal, Alert, ScrollView, RefreshControl } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getExams, deleteExam, createExam, type Exam, type ExamSubjectEntry } from '../../../lib/services/exam';
import { getClasses, getSections } from '../../../lib/services/class';
import { getSubjects } from '../../../lib/services/subject';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

type Step = 'details' | 'subjects';
type DateField = 'startDate' | 'endDate' | { type: 'subjectDate'; id: string };

export default function ExamsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string }[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState("");

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [step, setStep] = useState<Step>('details');
  const [saving, setSaving] = useState(false);

  // Step 1: Details
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Step 2: Subjects
  const [selectedSubjects, setSelectedSubjects] = useState<{ subjectId: string; examDate: string; totalMarks: string }[]>([]);

  // Date Picker State
  const [showPicker, setShowPicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState<DateField | null>(null);

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowPicker(false);
    if (event.type === 'dismissed' || !selectedDate || !activeDateField) {
      setActiveDateField(null);
      return;
    }

    const dateString = selectedDate.toISOString().split('T')[0];

    if (activeDateField === 'startDate') setStartDate(dateString);
    else if (activeDateField === 'endDate') setEndDate(dateString);
    else if (typeof activeDateField === 'object' && activeDateField.type === 'subjectDate') {
      const subId = activeDateField.id;
      setSelectedSubjects(prev => prev.map(p => p.subjectId === subId ? { ...p, examDate: dateString } : p));
    }
    setActiveDateField(null);
  };

  const showCalendar = (field: DateField) => {
    setActiveDateField(field);
    setShowPicker(true);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [exRes, clRes] = await Promise.all([getExams(), getClasses()]);
      setExams(exRes.data as Exam[] || []);
      setClasses(clRes.data || []);
    } catch (error) {
      console.error("Error loading exams:", error);
      Alert.alert("Network Error", "Failed to fetch exams. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Load sections and subjects when class changes in modal
  useEffect(() => {
    if (classId) {
      getSections(classId).then(res => setSections(res.data || []));
      getSubjects(classId).then(res => {
        const subs = res.data || [];
        setAvailableSubjects(subs);
        // Default select all subjects with 100 marks
        setSelectedSubjects(subs.map(s => ({ subjectId: s.id, examDate: "", totalMarks: "100" })));
      });
    } else {
      setSections([]);
      setAvailableSubjects([]);
      setSelectedSubjects([]);
    }
  }, [classId]);

  const handleCreateExam = async () => {
    if (selectedSubjects.length === 0) {
      Alert.alert("Error", "Please select at least one subject.");
      return;
    }

    setSaving(true);
    const { error } = await createExam({
      title,
      classId,
      sectionId: sectionId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      subjects: selectedSubjects
    });

    setSaving(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setModalVisible(false);
      resetForm();
      loadData();
    }
  };

  const resetForm = () => {
    setStep('details');
    setTitle("");
    setClassId("");
    setSectionId("");
    setStartDate("");
    setEndDate("");
    setSelectedSubjects([]);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      "Delete Exam",
      `Are you sure you want to delete "${name}"? This will also delete all associated subject schedules.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            const { error } = await deleteExam(id);
            if (error) Alert.alert("Error", "Failed to delete exam.");
            else loadData();
          } 
        }
      ]
    );
  };

  const isUpcoming = (exam: Exam) => {
    const today = new Date().toISOString().split('T')[0];
    if (exam.end_date) return exam.end_date >= today;
    if (exam.start_date) return exam.start_date >= today;
    return true;
  };

  const filtered = exams.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchClass = !filterClass || e.classes?.id === filterClass;
    return matchSearch && matchClass;
  });

  const upcoming = filtered.filter(isUpcoming);
  const past = filtered.filter(e => !isUpcoming(e));

  const renderExamItem = ({ item }: { item: Exam }) => (
    <TouchableOpacity 
      style={styles.examCard}
      onPress={() => router.push(`/(admin)/exams/${item.id}`)}
    >
      <View style={styles.examCardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name="trophy" size={20} color="#0047AB" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.examTitle}>{item.title}</Text>
          <Text style={styles.examMeta}>
            {item.classes?.name} {item.sections ? `· Section ${item.sections.name}` : ""}
          </Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id, item.title)}>
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <View style={styles.subjectPills}>
        {item.exam_subjects?.slice(0, 3).map(es => (
          <View key={es.id} style={styles.pill}>
            <Text style={styles.pillText}>{es.subjects?.name}</Text>
          </View>
        ))}
        {item.exam_subjects?.length > 3 && (
          <Text style={styles.moreText}>+{item.exam_subjects.length - 3} more</Text>
        )}
      </View>

      <View style={styles.examFooter}>
        <View style={styles.dateBadge}>
          <Ionicons name="calendar-outline" size={14} color="#8E8E93" />
          <Text style={styles.dateText}>
            {item.start_date ? new Date(item.start_date).toLocaleDateString() : "TBD"}
            {item.end_date ? ` - ${new Date(item.end_date).toLocaleDateString()}` : ""}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Royal Blue Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.menuButton}>
            <Ionicons name="menu" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Examination Management</Text>
          <View style={styles.menuButton} />
        </View>
        
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#A0A0A0" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exams..."
            placeholderTextColor="#A0A0A0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity 
            style={[styles.filterChip, !filterClass && styles.activeFilterChip]}
            onPress={() => setFilterClass("")}
          >
            <Text style={[styles.filterText, !filterClass && styles.activeFilterText]}>All Classes</Text>
          </TouchableOpacity>
          {classes.map(c => (
            <TouchableOpacity 
              key={c.id}
              style={[styles.filterChip, filterClass === c.id && styles.activeFilterChip]}
              onPress={() => setFilterClass(c.id)}
            >
              <Text style={[styles.filterText, filterClass === c.id && styles.activeFilterText]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0047AB" />
        </View>
      ) : (
        <ScrollView 
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0047AB"]} />}
        >
          {upcoming.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Upcoming Exams ({upcoming.length})</Text>
              {upcoming.map(item => (
                <View key={item.id}>{renderExamItem({ item })}</View>
              ))}
            </View>
          )}

          {past.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Past Exams ({past.length})</Text>
              {past.map(item => (
                <View key={item.id}>{renderExamItem({ item })}</View>
              ))}
            </View>
          )}

          {filtered.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="trophy-outline" size={80} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Exams Found</Text>
              <Text style={styles.emptySub}>Schedule your first exam by tapping the button below.</Text>
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => { resetForm(); setModalVisible(true); }}>
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Create Exam Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {step === 'details' ? "New Exam Schedule" : "Select Subjects"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1C1C1E" />
              </TouchableOpacity>
            </View>

            {/* Step Indicator */}
            <View style={styles.stepIndicator}>
              <View style={[styles.stepItem, step === 'details' && styles.activeStepItem]}>
                <Text style={[styles.stepNumber, step === 'details' && styles.activeStepNumber]}>1</Text>
                <Text style={[styles.stepLabel, step === 'details' && styles.activeStepLabel]}>Basic Info</Text>
              </View>
              <View style={styles.stepConnector} />
              <View style={[styles.stepItem, step === 'subjects' && styles.activeStepItem]}>
                <Text style={[styles.stepNumber, step === 'subjects' && styles.activeStepNumber]}>2</Text>
                <Text style={[styles.stepLabel, step === 'subjects' && styles.activeStepLabel]}>Subjects</Text>
              </View>
            </View>

            <ScrollView style={styles.modalBody}>
              {step === 'details' ? (
                <View style={styles.form}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Exam Title *</Text>
                    <TextInput 
                      style={styles.input} 
                      placeholder="e.g. Mid-Term Examination 2025"
                      value={title}
                      onChangeText={setTitle}
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Class *</Text>
                      <View style={styles.pickerContainer}>
                        {classes.map(c => (
                          <TouchableOpacity 
                            key={c.id} 
                            style={[styles.pickerItem, classId === c.id && styles.activePickerItem]}
                            onPress={() => setClassId(c.id)}
                          >
                            <Text style={[styles.pickerText, classId === c.id && styles.activePickerText]}>{c.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Section (Optional)</Text>
                    <View style={styles.pickerContainer}>
                      <TouchableOpacity 
                        style={[styles.pickerItem, !sectionId && styles.activePickerItem]}
                        onPress={() => setSectionId("")}
                      >
                        <Text style={[styles.pickerText, !sectionId && styles.activePickerText]}>All</Text>
                      </TouchableOpacity>
                      {sections.map(s => (
                        <TouchableOpacity 
                          key={s.id} 
                          style={[styles.pickerItem, sectionId === s.id && styles.activePickerItem]}
                          onPress={() => setSectionId(s.id)}
                        >
                          <Text style={[styles.pickerText, sectionId === s.id && styles.activePickerText]}>Sec {s.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                      <Text style={styles.label}>Start Date</Text>
                      <TouchableOpacity style={styles.dateInput} onPress={() => showCalendar('startDate')}>
                        <Ionicons name="calendar-outline" size={18} color="#0047AB" />
                        <Text style={[styles.dateInputText, !startDate && styles.placeholderText]}>
                          {startDate || "YYYY-MM-DD"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>End Date</Text>
                      <TouchableOpacity style={styles.dateInput} onPress={() => showCalendar('endDate')}>
                        <Ionicons name="calendar-outline" size={18} color="#0047AB" />
                        <Text style={[styles.dateInputText, !endDate && styles.placeholderText]}>
                          {endDate || "YYYY-MM-DD"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.form}>
                  {availableSubjects.length === 0 ? (
                    <Text style={styles.emptySubjects}>No subjects found for this class.</Text>
                  ) : (
                    availableSubjects.map(sub => {
                      const isSelected = selectedSubjects.some(s => s.subjectId === sub.id);
                      return (
                        <View key={sub.id} style={styles.subjectRow}>
                          <TouchableOpacity 
                            style={styles.subjectCheck}
                            onPress={() => {
                              if (isSelected) {
                                setSelectedSubjects(prev => prev.filter(p => p.subjectId !== sub.id));
                              } else {
                                setSelectedSubjects(prev => [...prev, { subjectId: sub.id, examDate: "", totalMarks: "100" }]);
                              }
                            }}
                          >
                            <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={24} color={isSelected ? "#0047AB" : "#D1D5DB"} />
                            <Text style={styles.subjectNameText}>{sub.name}</Text>
                          </TouchableOpacity>
                          
                          {isSelected && (
                            <View style={styles.subjectDetails}>
                              <TouchableOpacity 
                                style={[styles.smallDateInput, { flex: 1, marginRight: 8 }]} 
                                onPress={() => showCalendar({ type: 'subjectDate', id: sub.id })}
                              >
                                <Ionicons name="calendar-outline" size={14} color="#0047AB" />
                                <Text style={styles.smallDateText}>
                                  {selectedSubjects.find(s => s.subjectId === sub.id)?.examDate || "Set Date"}
                                </Text>
                              </TouchableOpacity>
                              <TextInput 
                                style={[styles.smallInput, { width: 80 }]} 
                                placeholder="Marks"
                                keyboardType="numeric"
                                value={selectedSubjects.find(s => s.subjectId === sub.id)?.totalMarks}
                                onChangeText={(val) => {
                                  setSelectedSubjects(prev => prev.map(p => p.subjectId === sub.id ? { ...p, totalMarks: val } : p));
                                }}
                              />
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              {step === 'details' ? (
                <TouchableOpacity 
                  style={[styles.primaryButton, !classId && styles.disabledButton]} 
                  disabled={!classId}
                  onPress={() => setStep('subjects')}
                >
                  <Text style={styles.primaryButtonText}>Next: Subjects</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <View style={styles.row}>
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep('details')}>
                    <Text style={styles.secondaryButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.primaryButton, { flex: 1, marginLeft: 12 }]} 
                    onPress={handleCreateExam}
                    disabled={saving}
                  >
                    {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>Schedule Exam</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {showPicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    backgroundColor: '#0047AB',
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#0047AB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  menuButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  filterSection: { paddingVertical: 12 },
  filterScroll: { paddingHorizontal: 20, gap: 10 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  activeFilterChip: { backgroundColor: '#0047AB', borderColor: '#0047AB' },
  filterText: { fontSize: 13, fontWeight: '700', color: '#6C757D' },
  activeFilterText: { color: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: 20 },
  section: { marginTop: 24 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  examCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F3F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  examCardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8F0FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: { flex: 1 },
  examTitle: { fontSize: 16, fontWeight: '800', color: '#212529', marginBottom: 2 },
  examMeta: { fontSize: 12, color: '#868E96', fontWeight: '500' },
  subjectPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, marginBottom: 16 },
  pill: { backgroundColor: '#F1F3F5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  pillText: { fontSize: 11, fontWeight: '700', color: '#495057' },
  moreText: { fontSize: 11, color: '#ADB5BD', fontWeight: '600' },
  examFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F8F9FA',
    paddingTop: 12,
  },
  dateBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 12, color: '#868E96', fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#495057', marginTop: 24, marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#868E96', textAlign: 'center', lineHeight: 20 },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0047AB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0047AB',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '90%',
    padding: 24,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#212529' },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  stepItem: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E9ECEF',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '800',
    color: '#ADB5BD',
    overflow: 'hidden',
  },
  activeStepNumber: { backgroundColor: '#0047AB', color: '#FFFFFF' },
  stepLabel: { fontSize: 13, fontWeight: '700', color: '#ADB5BD' },
  activeStepLabel: { color: '#0047AB' },
  stepConnector: { width: 40, height: 2, backgroundColor: '#E9ECEF', marginHorizontal: 10 },
  modalBody: { flex: 1 },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '800', color: '#495057' },
  input: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 14, fontSize: 15, color: '#212529', fontWeight: '500', borderWidth: 1, borderColor: '#E9ECEF' },
  row: { flexDirection: 'row' },
  pickerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F1F3F5' },
  activePickerItem: { backgroundColor: '#E8F0FE' },
  pickerText: { fontSize: 13, fontWeight: '700', color: '#495057' },
  activePickerText: { color: '#0047AB' },
  modalFooter: { paddingTop: 20, borderTopWidth: 1, borderTopColor: '#F8F9FA' },
  primaryButton: {
    backgroundColor: '#0047AB',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  secondaryButton: { paddingVertical: 16, paddingHorizontal: 24 },
  secondaryButtonText: { color: '#868E96', fontSize: 16, fontWeight: '700' },
  disabledButton: { opacity: 0.5 },
  emptySubjects: { textAlign: 'center', color: '#868E96', marginTop: 40 },
  subjectRow: { marginBottom: 16, backgroundColor: '#F8F9FA', padding: 12, borderRadius: 16 },
  subjectCheck: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subjectNameText: { fontSize: 15, fontWeight: '700', color: '#212529' },
  subjectDetails: { flexDirection: 'row', marginTop: 12 },
  smallInput: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 8, fontSize: 13, borderWidth: 1, borderColor: '#E9ECEF' },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    gap: 10,
  },
  dateInputText: { fontSize: 15, color: '#212529', fontWeight: '500' },
  placeholderText: { color: '#ADB5BD' },
  smallDateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    gap: 6,
  },
  smallDateText: { fontSize: 13, color: '#212529', fontWeight: '600' },
});
