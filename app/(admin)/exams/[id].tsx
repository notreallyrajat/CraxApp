import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { 
  getExamById, 
  getResultsForExamSubject, 
  saveResults, 
  deleteResult, 
  updateAnswerSheet, 
  clearAnswerSheet,
  ANSWER_SHEETS_BUCKET,
  upsertResult
} from '../../../lib/services/exam';
import { getEnrolledStudents } from '../../../lib/services/attendance';
import { uploadFile } from '../../../lib/services/resource';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

type ResultRow = {
  studentId: string;
  admissionNo: string;
  fullName: string;
  rollNumber: string | null;
  resultId: string | null;
  marksObtained: string;
  grade: string;
  remarks: string;
  answerSheetUrl: string | null;
  answerSheetPath: string | null;
  uploading: boolean;
};

export default function ExamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [exam, setExam] = useState<any>(null);
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const autoGrade = (marks: string, total: string | null): string => {
    const m = parseFloat(marks);
    const t = parseFloat(total ?? "100");
    if (isNaN(m) || isNaN(t) || t === 0) return "";
    const pct = (m / t) * 100;
    if (pct >= 90) return "A+";
    if (pct >= 80) return "A";
    if (pct >= 70) return "B";
    if (pct >= 60) return "C";
    if (pct >= 50) return "D";
    return "F";
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: examData } = await getExamById(id);
      if (!examData) {
        setLoading(false);
        return;
      }
      setExam(examData);

      const firstSubjectId = examData.exam_subjects[0]?.id ?? null;
      setActiveTab(prev => prev ?? firstSubjectId);

      const [enrolled, results] = await Promise.all([
        getEnrolledStudents(examData.classes.id, examData.sections?.id),
        firstSubjectId ? getResultsForExamSubject(firstSubjectId) : Promise.resolve({ data: [] }),
      ]);

      const resultMap = new Map();
      (results.data || []).forEach((r: any) => {
        if (r.students?.id) resultMap.set(r.students.id, r);
      });

      const resultRows: ResultRow[] = (enrolled.data || [])
        .filter((e: any) => e.students !== null)
        .map((e: any) => {
          const res = resultMap.get(e.students.id);
          return {
            studentId: e.students.id,
            admissionNo: e.students.admission_no,
            fullName: e.students.profiles?.full_name ?? "—",
            rollNumber: e.roll_number,
            resultId: res?.id ?? null,
            marksObtained: res?.marks_obtained ?? "",
            grade: res?.grade ?? "",
            remarks: res?.remarks ?? "",
            answerSheetUrl: res?.answer_sheet_url ?? null,
            answerSheetPath: res?.answer_sheet_path ?? null,
            uploading: false,
          };
        });

      // Deduplicate rows by studentId to prevent React key errors and DB upsert conflicts
      const seen = new Set();
      const deduplicated = resultRows.filter(r => {
        if (seen.has(r.studentId)) return false;
        seen.add(r.studentId);
        return true;
      });

      setRows(deduplicated);
    } catch (error) {
      console.error("Error loading exam details:", error);
      Alert.alert("Error", "Failed to load exam details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadResultsForTab = async (subjectId: string) => {
    try {
      const { data } = await getResultsForExamSubject(subjectId);
      const resultMap = new Map();
      (data || []).forEach((r: any) => {
        if (r.students?.id) resultMap.set(r.students.id, r);
      });

      setRows(prev => prev.map(row => {
        const res = resultMap.get(row.studentId);
        return {
          ...row,
          resultId: res?.id ?? null,
          marksObtained: res?.marks_obtained ?? "",
          grade: res?.grade ?? "",
          remarks: res?.remarks ?? "",
          answerSheetUrl: res?.answer_sheet_url ?? null,
          answerSheetPath: res?.answer_sheet_path ?? null,
          uploading: false,
        };
      }));
    } catch (error) {
      console.error("Error loading subject results:", error);
    }
  };

  useEffect(() => {
    if (activeTab && exam && rows.length > 0) {
      loadResultsForTab(activeTab);
    }
  }, [activeTab]);

  const setField = (studentId: string, field: keyof ResultRow, value: string) => {
    setRows(prev => prev.map(r => {
      if (r.studentId !== studentId) return r;
      const updated = { ...r, [field]: value };
      if (field === "marksObtained") {
        const activeSubject = exam.exam_subjects.find((s: any) => s.id === activeTab);
        updated.grade = autoGrade(value, activeSubject?.total_marks ?? null);
      }
      return updated;
    }));
  };

  const handleSave = async () => {
    if (!activeTab) return;
    setSaving(true);
    try {
      const { error } = await saveResults(
        activeTab,
        rows.map(r => ({
          id: r.resultId,
          studentId: r.studentId,
          marksObtained: r.marksObtained,
          grade: r.grade || undefined,
          remarks: r.remarks || undefined,
        }))
      );

      if (error) throw error;
      
      Alert.alert("Success", "Exam results saved successfully.");
      loadResultsForTab(activeTab);
    } catch (error: any) {
      console.error("Save error:", error);
      Alert.alert("Error", error.message || "Failed to save results.");
    } finally {
      setSaving(false);
    }
  };

  const handleAttachSheet = async (studentId: string) => {
    if (!activeTab || !exam) return;
    
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
      if (result.canceled) return;

      setRows(prev => prev.map(r => r.studentId === studentId ? { ...r, uploading: true } : r));

      const file = result.assets[0];
      const row = rows.find(r => r.studentId === studentId);
      let resultId = row?.resultId;

      // Ensure result exists in DB first
      if (!resultId && row?.marksObtained) {
        const { data: saved } = await upsertResult({
          examSubjectId: activeTab,
          studentId,
          marks_obtained: row.marksObtained,
          grade: row.grade || undefined,
          remarks: row.remarks || undefined,
        });
        resultId = saved?.id;
      }

      const folder = `${exam.id}/${activeTab}`;
      const fileName = `${studentId}.pdf`;
      
      const { data: uploadData, error: uploadError } = await uploadFile(
        file.uri,
        fileName,
        file.mimeType || "application/pdf",
        folder,
        ANSWER_SHEETS_BUCKET
      );

      if (uploadError) throw uploadError;

      if (resultId) {
        await updateAnswerSheet(resultId, uploadData.publicUrl, uploadData.path);
      }

      setRows(prev => prev.map(r => r.studentId === studentId ? { 
        ...r, 
        uploading: false, 
        answerSheetUrl: uploadData.publicUrl, 
        answerSheetPath: uploadData.path,
        resultId: resultId || r.resultId
      } : r));

    } catch (err) {
      console.error(err);
      Alert.alert("Upload Failed", "Could not attach answer sheet.");
      setRows(prev => prev.map(r => r.studentId === studentId ? { ...r, uploading: false } : r));
    }
  };

  const handleViewSheet = async (url: string, name: string) => {
    try {
      const fileUri = `${FileSystem.cacheDirectory}${name}.pdf`;
      const downloadResumable = FileSystem.createDownloadResumable(url, fileUri);
      const result = await downloadResumable.downloadAsync();
      if (result && result.uri) {
        await Sharing.shareAsync(result.uri);
      }
    } catch (err) {
      Alert.alert("Error", "Could not open answer sheet.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0047AB" />
      </View>
    );
  }

  const activeSubject = exam?.exam_subjects.find((s: any) => s.id === activeTab);

  const enteredCount = rows.filter((r) => r.marksObtained !== "").length;
  const avgMarks = enteredCount > 0 
    ? (rows.filter(r => r.marksObtained !== "").reduce((s, r) => s + parseFloat(r.marksObtained), 0) / enteredCount).toFixed(1)
    : null;

  return (
    <View style={styles.container}>
      {/* Royal Blue Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>{exam?.title}</Text>
            <Text style={styles.headerSub}>
              {exam?.classes?.name} {exam?.sections ? `· Sec ${exam.sections.name}` : ""}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.disabledButton]} 
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator size="small" color="#0047AB" /> : <Text style={styles.saveButtonText}>Save</Text>}
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{rows.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{enteredCount}</Text>
            <Text style={styles.statLabel}>Entered</Text>
          </View>
          {avgMarks && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{avgMarks}</Text>
                <Text style={styles.statLabel}>Avg</Text>
              </View>
            </>
          )}
        </View>

        {/* Subject Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          {exam?.exam_subjects.map((sub: any) => (
            <TouchableOpacity 
              key={sub.id} 
              style={[styles.tab, activeTab === sub.id && styles.activeTab]}
              onPress={() => setActiveTab(sub.id)}
            >
              <Text style={[styles.tabText, activeTab === sub.id && styles.activeTabText]}>
                {sub.subjects?.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={["#0047AB"]} />}
      >
        <View style={styles.subjectInfo}>
          <View style={styles.infoBadge}>
            <Ionicons name="book-outline" size={14} color="#0047AB" />
            <Text style={styles.infoText}>Max Marks: {activeSubject?.total_marks}</Text>
          </View>
          {activeSubject?.exam_date && (
            <View style={styles.infoBadge}>
              <Ionicons name="calendar-outline" size={14} color="#0047AB" />
              <Text style={styles.infoText}>{new Date(activeSubject.exam_date).toLocaleDateString()}</Text>
            </View>
          )}
        </View>

        {rows.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color="#D1D5DB" />
            <Text style={styles.emptyText}>No students enrolled in this class.</Text>
          </View>
        ) : (
          rows.map((row, idx) => (
            <View key={row.studentId} style={styles.studentCard}>
              <View style={styles.cardTop}>
                <View style={styles.rollBadge}>
                  <Text style={styles.rollText}>{row.rollNumber || idx + 1}</Text>
                </View>
                <View style={styles.studentNameContainer}>
                  <Text style={styles.studentName}>{row.fullName}</Text>
                  <Text style={styles.admissionNo}>{row.admissionNo}</Text>
                </View>
                <View style={styles.marksContainer}>
                  <TextInput 
                    style={styles.marksInput}
                    placeholder="Marks"
                    keyboardType="numeric"
                    value={row.marksObtained}
                    onChangeText={(val) => setField(row.studentId, "marksObtained", val)}
                  />
                  <Text style={styles.marksSeparator}>/</Text>
                  <Text style={styles.totalMarks}>{activeSubject?.total_marks}</Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <View style={styles.gradeBox}>
                  <Text style={styles.gradeLabel}>Grade:</Text>
                  <TextInput 
                    style={styles.gradeInput}
                    value={row.grade}
                    onChangeText={(val) => setField(row.studentId, "grade", val)}
                  />
                </View>
                <TextInput 
                  style={styles.remarksInput}
                  placeholder="Add remarks..."
                  value={row.remarks}
                  onChangeText={(val) => setField(row.studentId, "remarks", val)}
                />
              </View>

              <View style={styles.cardFooter}>
                {row.uploading ? (
                  <View style={styles.attachmentButton}>
                    <ActivityIndicator size="small" color="#0047AB" />
                    <Text style={styles.attachmentText}>Uploading...</Text>
                  </View>
                ) : row.answerSheetUrl ? (
                  <View style={styles.attachmentRow}>
                    <TouchableOpacity 
                      style={styles.viewSheetBtn}
                      onPress={() => handleViewSheet(row.answerSheetUrl!, row.fullName)}
                    >
                      <Ionicons name="document-text" size={16} color="#0047AB" />
                      <Text style={styles.viewSheetText}>View Sheet</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                      Alert.alert("Remove Sheet", "Are you sure?", [
                        { text: "Cancel" },
                        { text: "Remove", style: "destructive", onPress: () => {
                          if (row.resultId && row.answerSheetPath) clearAnswerSheet(row.resultId, row.answerSheetPath).then(() => loadResultsForTab(activeTab!));
                        }}
                      ]);
                    }}>
                      <Ionicons name="close-circle" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.attachmentButton} onPress={() => handleAttachSheet(row.studentId)}>
                    <Ionicons name="attach" size={18} color="#8E8E93" />
                    <Text style={styles.attachmentText}>Attach Answer Sheet (PDF)</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    backgroundColor: '#0047AB',
    paddingTop: 50,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
  },
  headerTop: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    marginBottom: 20,
    gap: 12
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  saveButton: { 
    backgroundColor: '#FFFFFF', 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 10,
  },
  saveButtonText: { color: '#0047AB', fontWeight: '800', fontSize: 14 },
  disabledButton: { opacity: 0.7 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' },
  statDivider: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  tabScroll: { paddingHorizontal: 20, marginBottom: 20 },
  tab: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    marginRight: 10, 
    borderRadius: 100, 
    backgroundColor: 'rgba(255,255,255,0.1)' 
  },
  activeTab: { backgroundColor: '#FFFFFF' },
  tabText: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 13 },
  activeTabText: { color: '#0047AB' },
  content: { flex: 1, paddingHorizontal: 20 },
  subjectInfo: { 
    flexDirection: 'row', 
    gap: 10, 
    marginTop: 20, 
    marginBottom: 16 
  },
  infoBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#E8F0FE', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8, 
    gap: 6 
  },
  infoText: { fontSize: 12, fontWeight: '700', color: '#0047AB' },
  studentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F3F5',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  rollBadge: { 
    width: 32, 
    height: 32, 
    borderRadius: 8, 
    backgroundColor: '#F8F9FA', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 12
  },
  rollText: { fontSize: 12, fontWeight: '800', color: '#8E8E93' },
  studentNameContainer: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '700', color: '#212529' },
  admissionNo: { fontSize: 11, color: '#8E8E93', fontWeight: '500' },
  marksContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8F9FA', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF'
  },
  marksInput: { width: 40, textAlign: 'center', fontSize: 14, fontWeight: '800', color: '#0047AB', padding: 0 },
  marksSeparator: { marginHorizontal: 2, color: '#ADB5BD' },
  totalMarks: { fontSize: 12, color: '#8E8E93', fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  gradeBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8F9FA', 
    paddingHorizontal: 10, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF'
  },
  gradeLabel: { fontSize: 11, fontWeight: '700', color: '#8E8E93', marginRight: 4 },
  gradeInput: { width: 30, fontSize: 13, fontWeight: '800', color: '#198754', textAlign: 'center', padding: 0 },
  remarksInput: { 
    flex: 1, 
    backgroundColor: '#F8F9FA', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8, 
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#E9ECEF'
  },
  cardFooter: { 
    borderTopWidth: 1, 
    borderTopColor: '#F8F9FA', 
    paddingTop: 12 
  },
  attachmentButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6 
  },
  attachmentText: { fontSize: 12, color: '#8E8E93', fontWeight: '600' },
  attachmentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewSheetBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#E8F0FE', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8, 
    gap: 6 
  },
  viewSheetText: { fontSize: 12, fontWeight: '700', color: '#0047AB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 12, color: '#8E8E93', fontWeight: '600' },
});
