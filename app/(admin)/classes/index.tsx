import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Modal, Alert, Platform } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { deleteClass } from '../../../lib/services/class';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import Papa from 'papaparse';

type ClassItem = {
  id: string;
  name: string;
  code: string | null;
  created_at: string;
};

export default function ClassesScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [previewData, setPreviewData] = useState<{name: string, code: string | null}[]>([]);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);

  const loadClasses = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('classes').select('*').order('name');
    if (!error && data) {
      setClasses(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Class name is required.');
      return;
    }
    setCreating(true);
    const { error } = await supabase.from('classes').insert([{ name, code: code || null }]);
    setCreating(false);
    
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setModalVisible(false);
      setName('');
      setCode('');
      loadClasses();
    }
  };

  const confirmDelete = (classId: string, className: string) => {
    Alert.alert(
      "Delete Class",
      `Are you sure you want to delete ${className}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            const { error } = await deleteClass(classId);
            if (error) {
              Alert.alert("Error", "Could not delete class. It may have associated records.");
            } else {
              loadClasses();
            }
          }
        }
      ]
    );
  };

  const handleCsvUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/vnd.ms-excel', 'text/comma-separated-values', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setUploadingCsv(true);
      const fileUri = result.assets[0].uri;
      
      let fileData: any;
      
      // On Web, DocumentPicker returns a File object in the asset
      if (result.assets[0].file) {
        fileData = result.assets[0].file;
      } else {
        // On Native (iOS/Android), we use FileSystem to read the URI
        fileData = await FileSystem.readAsStringAsync(fileUri, {
          encoding: 'utf8' as any, // Using literal 'utf8' to prevent EncodingType undefined issues on web
        });
      }

      Papa.parse(fileData, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const rows = results.data as any[];
          
          if (rows.length === 0) {
            Alert.alert('Error', 'The CSV file is empty.');
            setUploadingCsv(false);
            return;
          }

          // Validate headers and format
          const formattedRows = rows.map(row => ({
            name: row['class name'] || row['name'] || row['Class Name'] || row['Name'] || row['class_name'],
            code: row['class code'] || row['code'] || row['Class Code'] || row['Code'] || row['class_code'] || null
          })).filter(row => row.name && String(row.name).trim() !== '');

          if (formattedRows.length === 0) {
            Alert.alert('Error', 'No valid classes found. Please ensure your CSV has a "class name" column.');
            setUploadingCsv(false);
            return;
          }

          // Show preview instead of direct insert
          setPreviewData(formattedRows);
          setPreviewModalVisible(true);
          setUploadingCsv(false);
        },
        error: (error: any) => {
          Alert.alert('Error parsing CSV', error.message);
          setUploadingCsv(false);
        }
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
      setUploadingCsv(false);
    }
  };

  const confirmCsvUpload = async () => {
    setUploadingCsv(true);
    const validData = previewData.filter(item => item.name.trim() !== '');
    
    if (validData.length === 0) {
      Alert.alert('Error', 'No valid classes to upload.');
      setUploadingCsv(false);
      return;
    }

    const { error } = await supabase.from('classes').upsert(validData, { 
      onConflict: 'code',
      ignoreDuplicates: true 
    });
    
    if (error) {
      Alert.alert('Upload Error', error.message);
    } else {
      Alert.alert('Success', `Successfully imported ${validData.length} classes.`);
      setPreviewModalVisible(false);
      setPreviewData([]);
      loadClasses();
    }
    setUploadingCsv(false);
  };

  const updatePreviewItem = (index: number, field: 'name' | 'code', value: string) => {
    const newData = [...previewData];
    newData[index][field] = value;
    setPreviewData(newData);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={{ marginRight: 16 }}>
            <Ionicons name="menu" size={32} color="#1e293b" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerSub}>Manage Institution</Text>
            <Text style={styles.headerTitle}>Classes</Text>
          </View>
        </View>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{classes.length} Total</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B3D6B" />
        </View>
      ) : classes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="school-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No Classes Configured</Text>
          <Text style={styles.emptyText}>Get started by adding an academic class.</Text>
        </View>
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(`/(admin)/classes/${item.id}?name=${encodeURIComponent(item.name)}&code=${encodeURIComponent(item.code || '')}`)}
            >
              <View style={styles.cardLeft}>
                <View style={styles.iconBlock}>
                  <Ionicons name="book" size={24} color="#3B3D6B" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  {item.code ? (
                    <Text style={styles.cardSubtitle}>Code: {item.code}</Text>
                  ) : (
                    <Text style={styles.cardSubtitle}>No code assigned</Text>
                  )}
                </View>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => confirmDelete(item.id, item.name)}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Floating Action Buttons */}
      <View style={styles.bottomFixedContainer}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity 
            style={[styles.primaryButton, { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#3B3D6B' }]} 
            onPress={handleCsvUpload} 
            disabled={uploadingCsv}
            activeOpacity={0.8}
          >
            {uploadingCsv ? (
              <ActivityIndicator size="small" color="#3B3D6B" />
            ) : (
              <Text style={[styles.primaryButtonText, { color: '#3B3D6B' }]}>Upload CSV</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>Add Class</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Add Class Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Class</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtnIcon}>
                <Ionicons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Class Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Grade 10"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Class Code</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. G10"
                placeholderTextColor="#94a3b8"
                value={code}
                onChangeText={setCode}
              />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={creating} activeOpacity={0.8}>
              {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Save Class</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CSV Preview Modal */}
      <Modal visible={previewModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review CSV Data</Text>
              <TouchableOpacity onPress={() => setPreviewModalVisible(false)} style={styles.closeBtnIcon}>
                <Ionicons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.previewHeaderRow}>
              <Text style={[styles.previewHeaderText, { flex: 2 }]}>Class Name</Text>
              <Text style={[styles.previewHeaderText, { flex: 1 }]}>Class Code</Text>
            </View>
            
            <FlatList
              data={previewData}
              keyExtractor={(_, index) => index.toString()}
              style={{ flex: 1, marginBottom: 16 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <View style={styles.previewRow}>
                  <TextInput
                    style={[styles.previewInput, { flex: 2, marginRight: 8 }]}
                    value={item.name}
                    onChangeText={(val) => updatePreviewItem(index, 'name', val)}
                    placeholder="Class Name"
                  />
                  <TextInput
                    style={[styles.previewInput, { flex: 1 }]}
                    value={item.code || ''}
                    onChangeText={(val) => updatePreviewItem(index, 'code', val)}
                    placeholder="Class Code"
                  />
                </View>
              )}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={confirmCsvUpload} disabled={uploadingCsv} activeOpacity={0.8}>
              {uploadingCsv ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Confirm Upload</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingBottom: 20 
  },
  headerSub: { fontSize: 14, color: '#64748b', fontWeight: '600', marginBottom: 4 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1e293b', letterSpacing: -0.5 },
  badgeContainer: { backgroundColor: '#e0e7ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeText: { color: '#3B3D6B', fontSize: 12, fontWeight: '700' },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, marginTop: -100 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
  
  listContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 120 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#3B3D6B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 5,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBlock: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardInfo: { flex: 1 },
  deleteButton: { padding: 8, marginRight: 8, backgroundColor: '#FEF2F2', borderRadius: 10 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  
  bottomFixedContainer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingTop: 16,
    backgroundColor: 'rgba(248, 249, 254, 0.9)',
  },
  primaryButton: {
    backgroundColor: '#3B3D6B',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B3D6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  closeBtnIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 10, marginLeft: 4 },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  
  submitBtn: { backgroundColor: '#3B3D6B', padding: 18, borderRadius: 16, marginTop: 20, alignItems: 'center', shadowColor: '#3B3D6B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  
  previewHeaderRow: { flexDirection: 'row', paddingHorizontal: 4, marginBottom: 12 },
  previewHeaderText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  previewRow: { flexDirection: 'row', marginBottom: 10 },
  previewInput: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, fontSize: 14, color: '#1e293b', borderWidth: 1, borderColor: '#f1f5f9' },
});
