import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Modal, Alert, ScrollView } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getTeachers, deleteTeacher } from '../../../lib/services/teacher';
import { Config } from '../../../constants/Config';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import Papa from 'papaparse';

type Teacher = {
  id: string;
  employee_id: string;
  department: string | null;
  profiles: {
    full_name: string;
    email: string | null;
    phone: string | null;
  } | null;
};

const emptyForm = {
  fullName: '',
  email: '',
  phone: '',
  employeeId: '',
  department: '',
  expertSubjects: '',
  password: '',
};

// Memoized Teacher Card for performance
const TeacherCard = React.memo(({ item, onDelete }: { item: Teacher, onDelete: (id: string, name: string) => void }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={[styles.avatar, { backgroundColor: '#F3E5F5' }]}>
        <Text style={[styles.avatarText, { color: '#9C27B0' }]}>{item.profiles?.full_name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.headerInfo}>
        <Text style={styles.teacherName}>{item.profiles?.full_name}</Text>
        <View style={styles.idBadge}>
          <Text style={styles.idText}>ID: {item.employee_id}</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.deleteButton} 
        onPress={() => onDelete(item.id, item.profiles?.full_name || 'Teacher')}
      >
        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
      </TouchableOpacity>
    </View>
    
    <View style={styles.cardContent}>
      {item.profiles?.email && (
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={14} color="#8E8E93" />
          <Text style={styles.infoText}>{item.profiles.email}</Text>
        </View>
      )}
      {item.profiles?.phone && (
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={14} color="#8E8E93" />
          <Text style={styles.infoText}>{item.profiles.phone}</Text>
        </View>
      )}
      {item.department && (
        <View style={styles.infoRow}>
          <Ionicons name="book-outline" size={14} color="#8E8E93" />
          <Text style={styles.infoText}>
            {(() => {
              try {
                const parsed = JSON.parse(item.department);
                const deptStr = parsed.dept ? `${parsed.dept}` : '';
                const subjStr = parsed.expertSubjects && parsed.expertSubjects.length > 0 
                  ? `Expertise: ${parsed.expertSubjects.join(', ')}` 
                  : '';
                return [deptStr, subjStr].filter(Boolean).join(' | ') || item.department;
              } catch (e) {
                return item.department;
              }
            })()}
          </Text>
        </View>
      )}
    </View>
  </View>
));

export default function TeachersScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal & Form state
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);

  const PAGE_SIZE = 15;

  const loadTeachers = async (pageNum = 0, isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    else if (pageNum > 0) setLoadingMore(true);
    else setLoading(true);

    try {
      const { data, error } = await getTeachers(pageNum, PAGE_SIZE);
      if (!error && data) {
        const teacherData = data as unknown as Teacher[];
        if (isRefreshing || pageNum === 0) {
          setTeachers(teacherData);
        } else {
          setTeachers(prev => [...prev, ...teacherData]);
        }
        setHasMore(teacherData.length === PAGE_SIZE);
        setPage(pageNum);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadTeachers(0);
  }, []);

  const handleRefresh = React.useCallback(() => {
    loadTeachers(0, true);
  }, []);

  const handleLoadMore = React.useCallback(() => {
    if (!loadingMore && hasMore && searchQuery === '') {
      loadTeachers(page + 1);
    }
  }, [loadingMore, hasMore, page, searchQuery]);

  const filteredTeachers = React.useMemo(() => {
    if (searchQuery.trim() === '') return teachers;
    return teachers.filter(t => 
      t.profiles?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.department?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, teachers]);

  const handleCreate = async () => {
    if (!form.fullName.trim() || !form.email.trim() || !form.employeeId.trim() || !form.password.trim()) {
      Alert.alert('Error', 'Full name, email, employee ID and password are required.');
      return;
    }

    setCreating(true);
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${Config.SUPABASE_FUNCTIONS_URL}/manage-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          phone: form.phone || undefined,
          role: 'teacher',
          extraData: {
            employeeId: form.employeeId,
            department: JSON.stringify({
              dept: form.department,
              expertSubjects: form.expertSubjects ? form.expertSubjects.split(',').map(s => s.trim()).filter(Boolean) : []
            }),
          },
        }),
      });
      clearTimeout(id);

      if (response.ok) {
        Alert.alert('Success', 'Teacher created successfully.');
        setModalVisible(false);
        setForm(emptyForm);
        loadTeachers(0, true);
      } else {
        const errorData = await response.json();
        Alert.alert('Backend Error', errorData.error || 'Failed to create teacher.');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        Alert.alert('Timeout', 'The request timed out. Please refresh the list to check.');
      } else {
        Alert.alert('Connection Error', 'Could not reach the backend API.');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCsvUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/vnd.ms-excel', 'text/comma-separated-values', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setUploadingCsv(true);
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
            setUploadingCsv(false);
            return;
          }

          const formattedRows = rows.map(row => ({
            fullName: row['full name'] || row['name'] || row['Full Name'] || row['Name'] || '',
            email: row['email'] || row['Email'] || '',
            password: row['password'] || row['Password'] || 'password123',
            employeeId: row['employee id'] || row['Employee ID'] || row['employee_id'] || '',
            department: row['department'] || row['Department'] || '',
            expertSubjects: row['expert subjects'] || row['Expert Subjects'] || row['expert_subjects'] || '',
            phone: row['phone'] || row['Phone'] || '',
          })).filter(row => row.fullName && row.email && row.employeeId);

          if (formattedRows.length === 0) {
            Alert.alert('Error', 'No valid teachers found. Ensure CSV has "Full Name", "Email", and "Employee ID".');
            setUploadingCsv(false);
            return;
          }

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
    const validData = previewData.filter(item => item.fullName.trim() !== '' && item.email.trim() !== '' && item.employeeId.trim() !== '');
    
    if (validData.length === 0) {
      Alert.alert('Error', 'No valid teachers to upload.');
      setUploadingCsv(false);
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const teacher of validData) {
      try {
        const response = await fetch(`${Config.SUPABASE_FUNCTIONS_URL}/manage-users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: teacher.email,
            password: teacher.password,
            fullName: teacher.fullName,
            phone: teacher.phone || undefined,
            role: 'teacher',
            extraData: {
              employeeId: teacher.employeeId,
              department: JSON.stringify({
                dept: teacher.department,
                expertSubjects: teacher.expertSubjects ? teacher.expertSubjects.split(',').map((s: string) => s.trim()).filter(Boolean) : []
              }),
            },
          }),
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }
    
    Alert.alert('Upload Complete', `Successfully imported ${successCount} teachers. Failed: ${failCount}`);
    setPreviewModalVisible(false);
    setPreviewData([]);
    loadTeachers(0, true);
    setUploadingCsv(false);
  };

  const updatePreviewItem = (index: number, field: string, value: string) => {
    const newData = [...previewData];
    newData[index][field] = value;
    setPreviewData(newData);
  };

  const handleDelete = React.useCallback((id: string, name: string) => {
    Alert.alert(
      "Delete Teacher",
      `Are you sure you want to delete ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            const { error } = await deleteTeacher(id);
            if (error) Alert.alert("Error", error.message);
            else loadTeachers(0, true);
          }
        }
      ]
    );
  }, []);

  const renderTeacherItem = React.useCallback(({ item }: { item: Teacher }) => (
    <TeacherCard item={item} onDelete={handleDelete} />
  ), [handleDelete]);

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator size="small" color="#0047AB" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.menuButton}>
            <Ionicons name="menu" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Teacher Management</Text>
          <View style={styles.menuButton} />
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#A0A0A0" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search teachers..."
            placeholderTextColor="#A0A0A0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading && page === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0047AB" />
        </View>
      ) : filteredTeachers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>No teachers found.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTeachers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderTeacherItem}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListFooterComponent={renderFooter}
          // Performance Props
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
        />
      )}

      {/* Floating Action Buttons Container */}
      <View style={styles.fabContainer}>
        <TouchableOpacity 
          style={[styles.fab, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#0047AB', marginBottom: 16 }]} 
          onPress={handleCsvUpload}
          activeOpacity={0.8}
        >
          {uploadingCsv ? <ActivityIndicator size="small" color="#0047AB" /> : <Ionicons name="document-text-outline" size={24} color="#0047AB" />}
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Add Teacher Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalDragIndicator} />
            <Text style={styles.modalTitle}>Register New Teacher</Text>
            
            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="e.g. Jane Smith" 
                  placeholderTextColor="#A0A0A0" 
                  value={form.fullName} 
                  onChangeText={(val) => setForm({...form, fullName: val})} 
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email Address *</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="jane@school.edu" 
                  placeholderTextColor="#A0A0A0" 
                  value={form.email} 
                  onChangeText={(val) => setForm({...form, email: val})} 
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Employee ID *</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="e.g. EMP-001" 
                  placeholderTextColor="#A0A0A0" 
                  value={form.employeeId} 
                  onChangeText={(val) => setForm({...form, employeeId: val})} 
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Department</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="e.g. Science" 
                  placeholderTextColor="#A0A0A0" 
                  value={form.department} 
                  onChangeText={(val) => setForm({...form, department: val})} 
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Expert Subject(s)</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="e.g. Math, Physics (Comma separated)" 
                  placeholderTextColor="#A0A0A0" 
                  value={form.expertSubjects} 
                  onChangeText={(val) => setForm({...form, expertSubjects: val})} 
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="+1 234 567 890" 
                  placeholderTextColor="#A0A0A0" 
                  value={form.phone} 
                  onChangeText={(val) => setForm({...form, phone: val})} 
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Login Password *</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput 
                    style={styles.passwordInput} 
                    placeholder="Min. 6 characters" 
                    placeholderTextColor="#A0A0A0" 
                    value={form.password} 
                    onChangeText={(val) => setForm({...form, password: val})} 
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, (creating) && { opacity: 0.7 }]} 
                onPress={handleCreate} 
                disabled={creating}
              >
                <Text style={styles.saveText}>{creating ? 'Creating...' : 'Register Teacher'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CSV Preview Modal */}
      <Modal visible={previewModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '85%' }]}>
            <View style={styles.modalDragIndicator} />
            <Text style={styles.modalTitle}>Review Teacher Data</Text>
            
            <View style={styles.previewHeaderRow}>
              <Text style={[styles.previewHeaderText, { flex: 2 }]}>Name & Email</Text>
              <Text style={[styles.previewHeaderText, { flex: 1.5 }]}>Emp ID & Subjects</Text>
            </View>
            
            <FlatList
              data={previewData}
              keyExtractor={(_, index) => index.toString()}
              style={{ flex: 1, marginBottom: 16 }}
              renderItem={({ item, index }) => (
                <View style={styles.previewRow}>
                  <View style={{ flex: 2, marginRight: 8 }}>
                    <TextInput
                      style={[styles.previewInput, { marginBottom: 4 }]}
                      value={item.fullName}
                      onChangeText={(val) => updatePreviewItem(index, 'fullName', val)}
                      placeholder="Full Name"
                    />
                    <TextInput
                      style={styles.previewInput}
                      value={item.email}
                      onChangeText={(val) => updatePreviewItem(index, 'email', val)}
                      placeholder="Email"
                      keyboardType="email-address"
                    />
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <TextInput
                      style={[styles.previewInput, { marginBottom: 4 }]}
                      value={item.employeeId}
                      onChangeText={(val) => updatePreviewItem(index, 'employeeId', val)}
                      placeholder="Emp ID"
                    />
                    <TextInput
                      style={styles.previewInput}
                      value={item.expertSubjects}
                      onChangeText={(val) => updatePreviewItem(index, 'expertSubjects', val)}
                      placeholder="Expert Subjects"
                    />
                  </View>
                </View>
              )}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setPreviewModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, (uploadingCsv) && { opacity: 0.7 }]} 
                onPress={confirmCsvUpload} 
                disabled={uploadingCsv}
              >
                <Text style={styles.saveText}>{uploadingCsv ? 'Uploading...' : 'Confirm Upload'}</Text>
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
  header: {
    backgroundColor: '#0047AB',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  menuButton: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#8E8E93', fontWeight: '500' },
  listContent: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F0FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#0047AB' },
  headerInfo: { flex: 1 },
  teacherName: { fontSize: 16, fontWeight: '800', color: '#1C1C1E', marginBottom: 2 },
  idBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F4F6F8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  idText: { fontSize: 11, fontWeight: '700', color: '#0047AB' },
  deleteButton: { padding: 8 },
  cardContent: { borderTopWidth: 1, borderTopColor: '#F4F6F8', paddingTop: 12, gap: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoText: { fontSize: 13, color: '#666', marginLeft: 8, fontWeight: '500' },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    alignItems: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0047AB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0047AB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: '#FFFFFF', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 24, 
    maxHeight: '85%' 
  },
  modalDragIndicator: { width: 40, height: 4, backgroundColor: '#E5E5E5', borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1C1C1E', marginBottom: 24, textAlign: 'center' },
  formScroll: { marginBottom: 20 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '700', color: '#1C1C1E', marginBottom: 8 },
  input: { backgroundColor: '#F4F6F8', borderRadius: 12, padding: 14, fontSize: 15, color: '#1C1C1E', fontWeight: '500' },
  passwordInputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F4F6F8', 
    borderRadius: 12, 
    paddingRight: 14 
  },
  passwordInput: { flex: 1, padding: 14, fontSize: 15, color: '#1C1C1E', fontWeight: '500' },
  modalActions: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingBottom: 20 },
  cancelButton: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  cancelText: { color: '#8E8E93', fontWeight: '700', fontSize: 16 },
  saveButton: { flex: 2, backgroundColor: '#0047AB', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  previewHeaderRow: { flexDirection: 'row', paddingHorizontal: 4, marginBottom: 8 },
  previewHeaderText: { fontSize: 13, fontWeight: '700', color: '#8E8E93' },
  previewRow: { flexDirection: 'row', marginBottom: 12, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#F4F6F8' },
  previewInput: { backgroundColor: '#F4F6F8', borderRadius: 8, padding: 10, fontSize: 13, color: '#1C1C1E', fontWeight: '500' },
});
