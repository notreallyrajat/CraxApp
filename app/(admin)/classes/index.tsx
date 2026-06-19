import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Modal, Alert } from 'react-native';
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
      {/* Royal Blue Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.backButton}>
            <Ionicons name="menu" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Academic Classes</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.headerStats}>
          <Text style={styles.headerCount}>{classes.length}</Text>
          <Text style={styles.headerSubtitle}>Total Classes Configured</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0047AB" />
        </View>
      ) : classes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="book" size={40} color="#0047AB" />
          </View>
          <Text style={styles.emptyTitle}>No classes yet</Text>
          <Text style={styles.emptyText}>Get started by creating your first academic class.</Text>
          <TouchableOpacity style={styles.emptyAddButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.emptyAddButtonText}>Add Class</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(`/(admin)/classes/${item.id}?name=${encodeURIComponent(item.name)}&code=${encodeURIComponent(item.code || '')}`)}
            >
              <View style={[styles.iconBlock, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="book" size={24} color="#FF9800" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                {item.code ? (
                  <View style={styles.pillBadge}>
                    <Text style={styles.pillText}>{item.code}</Text>
                  </View>
                ) : (
                  <Text style={styles.cardSubtitle}>No code</Text>
                )}
              </View>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => confirmDelete(item.id, item.name)}
              >
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              </TouchableOpacity>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          )}
        />
      )}

      {/* EdTech Royal Blue Bottom Button */}
      <View style={styles.bottomFixedContainer}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity 
            style={[styles.primaryButton, { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#0047AB' }]} 
            onPress={handleCsvUpload} 
            disabled={uploadingCsv}
            activeOpacity={0.8}
          >
            {uploadingCsv ? (
              <ActivityIndicator size="small" color="#0047AB" />
            ) : (
              <Text style={[styles.primaryButtonText, { color: '#0047AB' }]}>Upload CSV</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>Add New Class</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalDragIndicator} />
            <Text style={styles.modalTitle}>Create Class</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Class Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Grade 10"
                placeholderTextColor="#A0A0A0"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Class Code</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. G10"
                placeholderTextColor="#A0A0A0"
                value={code}
                onChangeText={setCode}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelTextButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryButton, { flex: 1, marginHorizontal: 0, marginBottom: 0 }]} onPress={handleCreate} disabled={creating} activeOpacity={0.8}>
                <Text style={styles.primaryButtonText}>{creating ? 'Saving...' : 'Create Class'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CSV Preview Modal */}
      <Modal visible={previewModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '80%' }]}>
            <View style={styles.modalDragIndicator} />
            <Text style={styles.modalTitle}>Review CSV Data</Text>
            
            <View style={styles.previewHeaderRow}>
              <Text style={[styles.previewHeaderText, { flex: 2 }]}>Class Name</Text>
              <Text style={[styles.previewHeaderText, { flex: 1 }]}>Class Code</Text>
            </View>
            
            <FlatList
              data={previewData}
              keyExtractor={(_, index) => index.toString()}
              style={{ flex: 1, marginBottom: 16 }}
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

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelTextButton} onPress={() => setPreviewModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryButton, { flex: 1, marginHorizontal: 0, marginBottom: 0 }]} onPress={confirmCsvUpload} disabled={uploadingCsv} activeOpacity={0.8}>
                <Text style={styles.primaryButtonText}>{uploadingCsv ? 'Uploading...' : 'Confirm Upload'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' }, // EdTech gray bg
  header: {
    backgroundColor: '#0047AB',
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginRight: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    flex: 1,
  },
  backButton: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8F0FE', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1C1C1E', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#8E8E93', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  emptyAddButton: { backgroundColor: '#0047AB', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 100 },
  emptyAddButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBlock: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: { flex: 1 },
  deleteButton: { padding: 8, marginRight: 4 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1C1C1E', marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: '#8E8E93', fontWeight: '500' },
  pillBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0047AB',
  },
  bottomFixedContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 16,
    backgroundColor: 'transparent',
  },
  primaryButton: {
    backgroundColor: '#0047AB',
    borderRadius: 100,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0047AB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 48,
  },
  modalDragIndicator: { width: 40, height: 4, backgroundColor: '#E5E5E5', borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1C1C1E', marginBottom: 24, textAlign: 'center' },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#1C1C1E', marginBottom: 8, marginLeft: 4 },
  input: {
    backgroundColor: '#F4F6F8',
    borderRadius: 16,
    padding: 18,
    fontSize: 15,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  modalActions: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  cancelTextButton: { paddingVertical: 16, paddingHorizontal: 20, marginRight: 10 },
  cancelText: { color: '#8E8E93', fontWeight: '700', fontSize: 15 },
  previewHeaderRow: { flexDirection: 'row', paddingHorizontal: 4, marginBottom: 8 },
  previewHeaderText: { fontSize: 13, fontWeight: '700', color: '#8E8E93' },
  previewRow: { flexDirection: 'row', marginBottom: 8 },
  previewInput: { backgroundColor: '#F4F6F8', borderRadius: 8, padding: 12, fontSize: 14, color: '#1C1C1E', fontWeight: '500' },
});
