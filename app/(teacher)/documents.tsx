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
  Platform,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../lib/supabase';
import { getTeacherProfile, getAssignedClasses } from '../../lib/services/teacher';
import { 
  getMyDocuments, 
  createDocument, 
  deleteDocument, 
  setAccessClasses, 
  uploadTeacherFileMobile 
} from '../../lib/services/teacherDocument';

export default function TeacherDocumentsScreen() {
  const [teacher, setTeacher] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Upload State
  const [uploadModal, setUploadModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  // Access State
  const [accessModal, setAccessModal] = useState(false);
  const [activeDoc, setActiveDoc] = useState<any>(null);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [savingAccess, setSavingAccess] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: profile } = await getTeacherProfile(session.user.id);
      if (profile?.teachers) {
        setTeacher(profile.teachers);
        const [docsRes, classesRes] = await Promise.all([
          getMyDocuments(profile.teachers.id),
          getAssignedClasses(profile.teachers.id)
        ]);
        setDocs(docsRes.data || []);
        
        // Unique classes for access list
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
    } catch (error) {
      console.error("Error loading documents:", error);
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

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true
    });

    if (!result.canceled) {
      const file = result.assets[0];
      // Strict PDF Check
      if (file.mimeType !== "application/pdf" && !file.name.toLowerCase().endsWith('.pdf')) {
        Alert.alert("Invalid Format", "Only PDF documents are allowed for institutional resources.");
        return;
      }
      setSelectedFile(file);
      if (!title) setTitle(file.name.split('.')[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title.trim() || !teacher) {
      Alert.alert("Error", "Please provide a title and select a PDF file.");
      return;
    }

    setUploading(true);
    try {
      const { data: uploaded, error: uploadErr } = await uploadTeacherFileMobile(
        selectedFile.uri,
        selectedFile.name,
        'application/pdf',
        teacher.id
      );

      if (uploadErr || !uploaded) throw uploadErr;

      const { error: dbErr } = await createDocument({
        teacherId: teacher.id,
        title,
        description,
        filePath: uploaded.path,
        fileUrl: uploaded.publicUrl,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: 'application/pdf'
      });

      if (dbErr) throw dbErr;

      setUploadModal(false);
      setTitle('');
      setDescription('');
      setSelectedFile(null);
      loadData();
      Alert.alert("Success", "Document optimized and uploaded successfully!");
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (doc: any) => {
    Alert.alert("Delete Document", `Are you sure you want to delete "${doc.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await deleteDocument(doc.id, doc.file_path);
        loadData();
      }}
    ]);
  };

  const openAccess = (doc: any) => {
    setActiveDoc(doc);
    setSelectedClassIds(doc.document_access?.map((a: any) => a.class_id) || []);
    setAccessModal(true);
  };

  const handleSaveAccess = async () => {
    setSavingAccess(true);
    try {
      await setAccessClasses(activeDoc.id, selectedClassIds);
      setAccessModal(false);
      loadData();
    } catch (error) {
      Alert.alert("Error", "Failed to save permissions.");
    } finally {
      setSavingAccess(false);
    }
  };

  const getFileIcon = (mime: string) => {
    if (mime?.includes('pdf')) return { name: 'document-text', color: '#F44336' };
    if (mime?.includes('image')) return { name: 'image', color: '#2196F3' };
    if (mime?.includes('word') || mime?.includes('text')) return { name: 'document', color: '#1976D2' };
    return { name: 'file-tray-full', color: '#607D8B' };
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a1d2e" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>My Documents</Text>
          <Text style={styles.headerSub}>Manage your shared resources</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a1d2e']} />}
      >
        {docs.map(doc => {
          const icon = getFileIcon(doc.mime_type);
          return (
            <View key={doc.id} style={styles.docCard}>
              <View style={styles.docMain}>
                <View style={[styles.iconBox, { backgroundColor: icon.color + '15' }]}>
                  <Ionicons name={icon.name as any} size={24} color={icon.color} />
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docTitle}>{doc.title}</Text>
                  <Text style={styles.docMeta}>
                    {(doc.file_size / 1024).toFixed(1)} KB • {new Date(doc.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.actionRow}>
                  <TouchableOpacity onPress={() => Linking.openURL(doc.file_url)} style={styles.viewBtn}>
                    <Ionicons name="eye-outline" size={20} color="#1a1d2e" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(doc)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.docFooter}>
                <View style={styles.accessTags}>
                  {doc.document_access?.length === 0 ? (
                    <Text style={styles.noAccess}>No classes can see this</Text>
                  ) : (
                    doc.document_access.map((a: any) => (
                      <View key={a.class_id} style={styles.tag}>
                        <Text style={styles.tagText}>{a.classes.name}</Text>
                      </View>
                    ))
                  )}
                </View>
                <TouchableOpacity style={styles.manageBtn} onPress={() => openAccess(doc)}>
                  <Text style={styles.manageBtnText}>Manage Access</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setUploadModal(true)}>
        <Ionicons name="cloud-upload" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Upload Modal */}
      <Modal visible={uploadModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Upload Document</Text>
            
            <TouchableOpacity style={styles.filePicker} onPress={handlePickFile}>
              <Ionicons name={selectedFile ? "checkmark-circle" : "attach"} size={24} color={selectedFile ? "#4CAF50" : "#1a1d2e"} />
              <Text style={[styles.filePickerText, selectedFile && { color: '#4CAF50' }]}>
                {selectedFile ? selectedFile.name : "Select File"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.label}>Title</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Document Title" />
            
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="What is this for?" multiline numberOfLines={3} />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setUploadModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleUpload} disabled={uploading}>
                {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Upload</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Access Modal */}
      <Modal visible={accessModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Share with Classes</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {assignedClasses.map(cls => (
                <TouchableOpacity 
                  key={cls.id} 
                  style={styles.classSelectItem}
                  onPress={() => {
                    if (selectedClassIds.includes(cls.class_id)) {
                      setSelectedClassIds(prev => prev.filter(id => id !== cls.class_id));
                    } else {
                      setSelectedClassIds(prev => [...prev, cls.class_id]);
                    }
                  }}
                >
                  <Text style={styles.classSelectName}>{cls.classes.name}</Text>
                  <Ionicons 
                    name={selectedClassIds.includes(cls.class_id) ? "checkbox" : "square-outline"} 
                    size={24} 
                    color={selectedClassIds.includes(cls.class_id) ? "#1a1d2e" : "#CBD5E1"} 
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAccessModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveAccess} disabled={savingAccess}>
                {savingAccess ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Save</Text>}
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
    paddingHorizontal: 20 
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  content: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  docCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, elevation: 2 },
  docMain: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  docInfo: { flex: 1, marginRight: 10 },
  docTitle: { fontSize: 16, fontWeight: '700', color: '#1a1d2e' },
  docMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 10 },
  viewBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  docFooter: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accessTags: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  noAccess: { fontSize: 11, color: '#94A3B8', fontStyle: 'italic' },
  manageBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#1a1d2e' },
  manageBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#1a1d2e', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1a1d2e', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#64748b', marginBottom: 8 },
  input: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 15 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  filePicker: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F1F5F9', padding: 16, borderRadius: 12, marginBottom: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
  filePickerText: { fontSize: 15, fontWeight: '600', color: '#1a1d2e' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelBtnText: { fontWeight: '700', color: '#64748b' },
  submitBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#1a1d2e', alignItems: 'center' },
  submitBtnText: { fontWeight: '700', color: '#fff' },
  classSelectItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  classSelectName: { fontSize: 15, fontWeight: '600', color: '#1a1d2e' }
});
