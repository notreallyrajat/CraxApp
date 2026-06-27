import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, Alert, Modal, TextInput, RefreshControl,
  Platform, Linking, Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../../lib/supabase';
import { getTeacherProfile, getAssignedClasses } from '../../lib/services/teacher';
import { 
  getMyDocuments, createDocument, deleteDocument,
  uploadTeacherFileMobile, updateDocumentVisibility, getAllClasses,
  DocumentVisibility
} from '../../lib/services/teacherDocument';

const VISIBILITY_OPTIONS: { key: DocumentVisibility; label: string; icon: string; desc: string }[] = [
  { key: 'admin_only', label: 'Admin Only', icon: 'shield-checkmark', desc: 'Only visible to school admin' },
  { key: 'all_teachers', label: 'All Teachers', icon: 'people', desc: 'Visible to all teachers & admin' },
  { key: 'all_classes', label: 'All Classes', icon: 'school', desc: 'Visible to all students & admin' },
  { key: 'specific_class', label: 'Specific Class', icon: 'person', desc: 'Choose which class can see this' },
];

export default function TeacherDocumentsScreen() {
  const [teacher, setTeacher] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<any[]>([]);
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Upload State
  const [uploadModal, setUploadModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadVisibility, setUploadVisibility] = useState<DocumentVisibility>('admin_only');
  const [uploadClassIds, setUploadClassIds] = useState<string[]>([]);
  const [showClassPicker, setShowClassPicker] = useState(false);

  // Access/Share State
  const [shareModal, setShareModal] = useState(false);
  const [activeDoc, setActiveDoc] = useState<any>(null);
  const [shareVisibility, setShareVisibility] = useState<DocumentVisibility>('admin_only');
  const [shareClassIds, setShareClassIds] = useState<string[]>([]);
  const [savingShare, setSavingShare] = useState(false);
  const [showShareClassPicker, setShowShareClassPicker] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await getTeacherProfile(session.user.id);
      if (profile?.teachers) {
        setTeacher(profile.teachers);
        const [docsRes, classesRes, allClassesRes] = await Promise.all([
          getMyDocuments(profile.teachers.id),
          getAssignedClasses(profile.teachers.id),
          getAllClasses()
        ]);
        setDocs(docsRes.data || []);
        setAllClasses(allClassesRes.data || []);
        const uniqueClasses: any[] = [];
        const seen = new Set();
        (classesRes.data || []).forEach((c: any) => {
          if (!seen.has(c.class_id)) { seen.add(c.class_id); uniqueClasses.push(c); }
        });
        setAssignedClasses(uniqueClasses);
      }
    } catch (error) { console.error("Error loading documents:", error); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (!result.canceled && result.assets?.length) {
      const file = result.assets[0];
      if (file.mimeType !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        Alert.alert("Invalid Format", "Only PDF documents are allowed."); return;
      }
      setSelectedFile(file);
      if (!title) setTitle(file.name.split('.')[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title.trim() || !teacher) {
      Alert.alert("Error", "Please provide a title and select a PDF."); return;
    }
    if (uploadVisibility === 'specific_class' && uploadClassIds.length === 0) {
      Alert.alert("Error", "Please select at least one class."); return;
    }
    setUploading(true);
    try {
      const { data: uploaded, error: uploadErr } = await uploadTeacherFileMobile(
        selectedFile.uri, selectedFile.name, 'application/pdf', teacher.id
      );
      if (uploadErr || !uploaded) throw uploadErr;

      const { data: newDoc, error: dbErr } = await createDocument({
        teacherId: teacher.id, title, description,
        filePath: uploaded.path, fileUrl: uploaded.publicUrl,
        fileName: selectedFile.name, fileSize: selectedFile.size,
        mimeType: 'application/pdf', visibility: uploadVisibility,
      });
      if (dbErr) throw dbErr;

      // Set class access based on visibility
      if (newDoc && (uploadVisibility === 'specific_class' || uploadVisibility === 'all_classes')) {
        const classIds = uploadVisibility === 'all_classes'
          ? allClasses.map(c => c.id)
          : uploadClassIds;
        await updateDocumentVisibility(newDoc.id, uploadVisibility, classIds);
      }

      setUploadModal(false); setTitle(''); setDescription('');
      setSelectedFile(null); setUploadVisibility('admin_only'); setUploadClassIds([]);
      loadData();
      Alert.alert("Success", "Document uploaded successfully!");
    } catch (error: any) {
      console.error(error); Alert.alert("Error", error.message || "Upload failed.");
    } finally { setUploading(false); }
  };

  const handleDelete = (doc: any) => {
    Alert.alert("Delete Document", `Delete "${doc.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await deleteDocument(doc.id, doc.file_path); loadData(); }}
    ]);
  };

  const openShareModal = (doc: any) => {
    setActiveDoc(doc);
    setShareVisibility(doc.visibility || 'admin_only');
    setShareClassIds(doc.document_access?.map((a: any) => a.class_id) || []);
    setShowShareClassPicker(doc.visibility === 'specific_class');
    setShareModal(true);
  };

  const handleSaveShare = async () => {
    setSavingShare(true);
    try {
      if (shareVisibility === 'specific_class' && shareClassIds.length === 0) {
        Alert.alert("Error", "Select at least one class."); setSavingShare(false); return;
      }
      const classIds = shareVisibility === 'all_classes'
        ? allClasses.map(c => c.id)
        : shareClassIds;
      await updateDocumentVisibility(activeDoc.id, shareVisibility, classIds);
      setShareModal(false); loadData();
    } catch (error) { Alert.alert("Error", "Failed to update sharing."); }
    finally { setSavingShare(false); }
  };

  const getVisLabel = (v: string) => VISIBILITY_OPTIONS.find(o => o.key === v)?.label || 'Admin Only';
  const getVisIcon = (v: string) => VISIBILITY_OPTIONS.find(o => o.key === v)?.icon || 'shield-checkmark';
  const getVisColor = (v: string) => {
    if (v === 'all_classes') return '#10b981';
    if (v === 'all_teachers') return '#3b82f6';
    if (v === 'specific_class') return '#f59e0b';
    return '#8b5cf6';
  };

  const filteredDocs = docs.filter(d =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#1a1d2e" /></View>;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Resources</Text>
        <Text style={s.headerSub}>Upload & share PDF materials</Text>
        <View style={s.searchBox}>
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput style={s.searchInput} placeholder="Search..." placeholderTextColor="#94a3b8" value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery !== '' && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color="#94a3b8" /></TouchableOpacity>}
        </View>
      </View>

      {/* Upload Button - inline below header */}
      <View style={s.uploadRow}>
        <TouchableOpacity style={s.uploadBtn} onPress={() => setUploadModal(true)}>
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={s.uploadBtnText}>Upload PDF</Text>
        </TouchableOpacity>
        <Text style={s.docCount}>{docs.length} document{docs.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Document List */}
      <ScrollView style={s.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a1d2e']} />}>
        {filteredDocs.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="folder-open-outline" size={56} color="#cbd5e1" />
            <Text style={s.emptyTitle}>No documents yet</Text>
            <Text style={s.emptySub}>Upload PDFs to share with your institution</Text>
          </View>
        ) : filteredDocs.map(doc => (
          <View key={doc.id} style={s.card}>
            <View style={s.cardTop}>
              <View style={s.pdfIcon}><Ionicons name="document-text" size={26} color="#EF4444" /></View>
              <View style={s.cardInfo}>
                <Text style={s.cardTitle} numberOfLines={1}>{doc.title}</Text>
                {doc.description ? <Text style={s.cardDesc} numberOfLines={1}>{doc.description}</Text> : null}
                <Text style={s.cardMeta}>{((doc.file_size || 0) / 1024).toFixed(0)} KB · {new Date(doc.created_at).toLocaleDateString()}</Text>
              </View>
            </View>
            <View style={s.cardActions}>
              <TouchableOpacity style={s.actBtn} onPress={() => Linking.openURL(doc.file_url)}>
                <Ionicons name="eye-outline" size={18} color="#3b82f6" />
                <Text style={[s.actText, { color: '#3b82f6' }]}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actBtn} onPress={() => Share.share({ message: `${doc.title}\n${doc.file_url}`, url: doc.file_url })}>
                <Ionicons name="share-social-outline" size={18} color="#10b981" />
                <Text style={[s.actText, { color: '#10b981' }]}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actBtn} onPress={() => handleDelete(doc)}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                <Text style={[s.actText, { color: '#ef4444' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={s.visRow} onPress={() => openShareModal(doc)}>
              <View style={[s.visBadge, { backgroundColor: getVisColor(doc.visibility) + '18' }]}>
                <Ionicons name={getVisIcon(doc.visibility) as any} size={14} color={getVisColor(doc.visibility)} />
                <Text style={[s.visBadgeText, { color: getVisColor(doc.visibility) }]}>{getVisLabel(doc.visibility)}</Text>
              </View>
              {doc.visibility === 'specific_class' && doc.document_access?.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginLeft: 8 }}>
                  {doc.document_access.map((a: any) => (
                    <View key={a.class_id} style={s.classChip}><Text style={s.classChipText}>{a.classes?.name}</Text></View>
                  ))}
                </ScrollView>
              )}
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Upload Modal */}
      <Modal visible={uploadModal} animationType="slide" transparent>
        <View style={s.modalBg}>
          <View style={s.modal}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Upload PDF</Text>
              <TouchableOpacity onPress={() => { setUploadModal(false); setSelectedFile(null); setTitle(''); setDescription(''); setUploadVisibility('admin_only'); setUploadClassIds([]); setShowClassPicker(false); }}>
                <Ionicons name="close" size={26} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* File Picker */}
              <TouchableOpacity style={s.picker} onPress={handlePickFile}>
                <View style={[s.pickerIcon, selectedFile && { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name={selectedFile ? "checkmark-circle" : "cloud-upload-outline"} size={28} color={selectedFile ? "#10B981" : "#3B3D6B"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.pickerLabel}>{selectedFile ? "PDF Selected" : "Tap to browse"}</Text>
                  <Text style={s.pickerSub} numberOfLines={1}>{selectedFile ? selectedFile.name : "Only PDF files are accepted"}</Text>
                </View>
              </TouchableOpacity>

              <Text style={s.fieldLabel}>Title</Text>
              <TextInput style={s.fieldInput} value={title} onChangeText={setTitle} placeholder="e.g. Chapter 4 Notes" placeholderTextColor="#94a3b8" />

              <Text style={s.fieldLabel}>Description (Optional)</Text>
              <TextInput style={[s.fieldInput, { minHeight: 80, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} placeholder="What is this resource for?" placeholderTextColor="#94a3b8" multiline />

              {/* Visibility Selector */}
              <Text style={s.fieldLabel}>Share With</Text>
              <Text style={s.fieldHint}>Admin always has access to all documents</Text>
              {VISIBILITY_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.key} style={[s.visOption, uploadVisibility === opt.key && s.visOptionActive]}
                  onPress={() => { setUploadVisibility(opt.key); setShowClassPicker(opt.key === 'specific_class'); }}>
                  <View style={s.visOptionLeft}>
                    <Ionicons name={opt.icon as any} size={20} color={uploadVisibility === opt.key ? '#3b82f6' : '#64748b'} />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={[s.visOptLabel, uploadVisibility === opt.key && { color: '#1e293b', fontWeight: '700' }]}>{opt.label}</Text>
                      <Text style={s.visOptDesc}>{opt.desc}</Text>
                    </View>
                  </View>
                  <Ionicons name={uploadVisibility === opt.key ? "checkmark-circle" : "ellipse-outline"} size={22} color={uploadVisibility === opt.key ? '#3b82f6' : '#cbd5e1'} />
                </TouchableOpacity>
              ))}

              {/* Class Picker for specific_class */}
              {showClassPicker && (
                <View style={s.classPicker}>
                  <Text style={s.fieldLabel}>Select Class</Text>
                  {assignedClasses.map(cls => {
                    const sel = uploadClassIds.includes(cls.class_id);
                    return (
                      <TouchableOpacity key={cls.class_id} style={[s.classItem, sel && s.classItemSel]}
                        onPress={() => setUploadClassIds(prev => sel ? prev.filter(id => id !== cls.class_id) : [...prev, cls.class_id])}>
                        <Text style={[s.classItemText, sel && { color: '#1e293b', fontWeight: '700' }]}>{cls.classes?.name}</Text>
                        <Ionicons name={sel ? "checkmark-circle" : "ellipse-outline"} size={20} color={sel ? '#3b82f6' : '#cbd5e1'} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={[s.mainBtn, uploading && { opacity: 0.6 }]} onPress={handleUpload} disabled={uploading}>
              {uploading ? <ActivityIndicator color="#fff" /> : <Text style={s.mainBtnText}>Upload Document</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Share/Visibility Modal */}
      <Modal visible={shareModal} animationType="fade" transparent>
        <View style={s.modalBg}>
          <View style={s.modal}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Manage Sharing</Text>
              <TouchableOpacity onPress={() => setShareModal(false)}>
                <Ionicons name="close" size={26} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={s.fieldHint}>Admin always has access regardless of selection</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {VISIBILITY_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.key} style={[s.visOption, shareVisibility === opt.key && s.visOptionActive]}
                  onPress={() => { setShareVisibility(opt.key); setShowShareClassPicker(opt.key === 'specific_class'); }}>
                  <View style={s.visOptionLeft}>
                    <Ionicons name={opt.icon as any} size={20} color={shareVisibility === opt.key ? '#3b82f6' : '#64748b'} />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={[s.visOptLabel, shareVisibility === opt.key && { color: '#1e293b', fontWeight: '700' }]}>{opt.label}</Text>
                      <Text style={s.visOptDesc}>{opt.desc}</Text>
                    </View>
                  </View>
                  <Ionicons name={shareVisibility === opt.key ? "checkmark-circle" : "ellipse-outline"} size={22} color={shareVisibility === opt.key ? '#3b82f6' : '#cbd5e1'} />
                </TouchableOpacity>
              ))}
              {showShareClassPicker && (
                <View style={s.classPicker}>
                  <Text style={s.fieldLabel}>Select Class</Text>
                  {assignedClasses.map(cls => {
                    const sel = shareClassIds.includes(cls.class_id);
                    return (
                      <TouchableOpacity key={cls.class_id} style={[s.classItem, sel && s.classItemSel]}
                        onPress={() => setShareClassIds(prev => sel ? prev.filter(id => id !== cls.class_id) : [...prev, cls.class_id])}>
                        <Text style={[s.classItemText, sel && { color: '#1e293b', fontWeight: '700' }]}>{cls.classes?.name}</Text>
                        <Ionicons name={sel ? "checkmark-circle" : "ellipse-outline"} size={20} color={sel ? '#3b82f6' : '#cbd5e1'} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>
            <TouchableOpacity style={[s.mainBtn, savingShare && { opacity: 0.6 }]} onPress={handleSaveShare} disabled={savingShare}>
              {savingShare ? <ActivityIndicator color="#fff" /> : <Text style={s.mainBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#1a1d2e', paddingTop: Platform.OS === 'android' ? 48 : 58, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: '#94a3b8', marginTop: 4, marginBottom: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2d3348', borderRadius: 14, paddingHorizontal: 14, height: 44 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, marginLeft: 8 },

  uploadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, gap: 8, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  uploadBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  docCount: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },

  content: { flex: 1, paddingHorizontal: 20 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#64748b', marginTop: 14 },
  emptySub: { fontSize: 13, color: '#94a3b8', marginTop: 6 },

  card: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  pdfIcon: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: 14 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  cardDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },
  cardMeta: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 4 },

  cardActions: { flexDirection: 'row', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 8 },
  actBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: '#f8fafc', gap: 6 },
  actText: { fontSize: 12, fontWeight: '700' },

  visRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  visBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 5 },
  visBadgeText: { fontSize: 11, fontWeight: '700' },
  classChip: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 6 },
  classChipText: { fontSize: 10, fontWeight: '700', color: '#475569' },

  modalBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: Platform.OS === 'ios' ? 36 : 22, maxHeight: '90%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },

  picker: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 14, borderRadius: 16, marginBottom: 20, borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed' },
  pickerIcon: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  pickerLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  pickerSub: { fontSize: 12, color: '#64748b' },

  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, marginTop: 4 },
  fieldHint: { fontSize: 12, color: '#94a3b8', marginBottom: 12, fontStyle: 'italic' },
  fieldInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 14, fontSize: 14, color: '#0f172a', marginBottom: 16 },

  visOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 14, marginBottom: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: 'transparent' },
  visOptionActive: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  visOptionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  visOptLabel: { fontSize: 14, fontWeight: '600', color: '#475569' },
  visOptDesc: { fontSize: 11, color: '#94a3b8', marginTop: 2 },

  classPicker: { marginTop: 8, marginBottom: 8 },
  classItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 6, backgroundColor: '#f8fafc' },
  classItemSel: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  classItemText: { fontSize: 14, fontWeight: '600', color: '#475569' },

  mainBtn: { padding: 16, borderRadius: 14, backgroundColor: '#1a1d2e', alignItems: 'center', marginTop: 12 },
  mainBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
