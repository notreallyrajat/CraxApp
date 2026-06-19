import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Modal, Alert, ScrollView } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getStudents, deleteStudent } from '../../../lib/services/student';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Config } from '../../../constants/Config';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import Papa from 'papaparse';

type Student = {
  id: string;
  admission_no: string;
  date_of_birth: string | null;
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
  admissionNo: '',
  dateOfBirth: new Date(),
  password: '',
};

// Memoized Student Card for performance
const StudentCard = React.memo(({ item, onDelete }: { item: Student, onDelete: (id: string, name: string) => void }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.profiles?.full_name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.headerInfo}>
        <Text style={styles.studentName}>{item.profiles?.full_name}</Text>
        <View style={styles.admissionBadge}>
          <Text style={styles.admissionText}>{item.admission_no}</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.deleteButton} 
        onPress={() => onDelete(item.id, item.profiles?.full_name || 'Student')}
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
      {item.date_of_birth && (
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color="#8E8E93" />
          <Text style={styles.infoText}>DOB: {new Date(item.date_of_birth).toLocaleDateString()}</Text>
        </View>
      )}
    </View>
  </View>
));

export default function StudentsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal & Form state
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);

  const PAGE_SIZE = 15;

  const loadStudents = async (pageNum = 0, isRefreshing = false, query = searchQuery) => {
    if (isRefreshing) setRefreshing(true);
    else if (pageNum > 0) setLoadingMore(true);
    else setLoading(true);

    try {
      const { data, error } = await getStudents(pageNum, PAGE_SIZE, query);
      if (!error && data) {
        const studentData = data as unknown as Student[];
        if (isRefreshing || pageNum === 0) {
          setStudents(studentData);
        } else {
          setStudents(prev => [...prev, ...studentData]);
        }
        setHasMore(studentData.length === PAGE_SIZE);
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
    loadStudents(0);
  }, []);

  const handleRefresh = React.useCallback(() => {
    loadStudents(0, true);
  }, [searchQuery]);

  const handleLoadMore = React.useCallback(() => {
    if (!loadingMore && hasMore) {
      loadStudents(page + 1);
    }
  }, [loadingMore, hasMore, page, searchQuery]);

  // Debounced search
  useEffect(() => {
    if (page === 0 && searchQuery === '') return; // Skip initial mount as it's handled by useEffect above
    
    const delayDebounceFn = setTimeout(() => {
      loadStudents(0, true);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Client-side filtering removed for server-side scalability

  const handleCreate = async () => {
    if (!form.fullName.trim() || !form.email.trim() || !form.admissionNo.trim() || !form.password.trim()) {
      Alert.alert('Error', 'Full name, email, admission number and password are required.');
      return;
    }

    setCreating(true);
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${Config.SUPABASE_FUNCTIONS_URL}/manage-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          phone: form.phone || undefined,
          role: 'student',
          extraData: {
            admissionNo: form.admissionNo,
            dateOfBirth: form.dateOfBirth.toISOString().split('T')[0],
          },
        }),
      });
      clearTimeout(id);

      if (response.ok) {
        Alert.alert('Success', 'Student created successfully.');
        setModalVisible(false);
        setForm(emptyForm);
        loadStudents(0, true);
      } else {
        const errorData = await response.json();
        Alert.alert('Backend Error', errorData.error || 'Failed to create student.');
      }
    } catch (error) {
      Alert.alert('Connection Error', 'Could not reach the backend API.');
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
            admissionNo: row['admission no'] || row['Admission No'] || row['admission_no'] || '',
            phone: row['phone'] || row['Phone'] || '',
            dateOfBirth: row['dob'] || row['Date of Birth'] || row['date_of_birth'] || ''
          })).filter(row => row.fullName && row.email && row.admissionNo);

          if (formattedRows.length === 0) {
            Alert.alert('Error', 'No valid students found. Ensure CSV has "Full Name", "Email", and "Admission No".');
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
    const validData = previewData.filter(item => item.fullName.trim() !== '' && item.email.trim() !== '' && item.admissionNo.trim() !== '');
    
    if (validData.length === 0) {
      Alert.alert('Error', 'No valid students to upload.');
      setUploadingCsv(false);
      return;
    }

    let successCount = 0;
    let failCount = 0;

    // We process sequentially to avoid overwhelming the database/functions, but we can do a loop.
    for (const student of validData) {
      try {
        let dobStr = null;
        if (student.dateOfBirth) {
          const parsedDate = new Date(student.dateOfBirth);
          if (!isNaN(parsedDate.getTime())) {
            dobStr = parsedDate.toISOString().split('T')[0];
          }
        }

        const response = await fetch(`${Config.SUPABASE_FUNCTIONS_URL}/manage-users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: student.email,
            password: student.password,
            fullName: student.fullName,
            phone: student.phone || undefined,
            role: 'student',
            extraData: {
              admissionNo: student.admissionNo,
              dateOfBirth: dobStr,
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
    
    Alert.alert('Upload Complete', `Successfully imported ${successCount} students. Failed: ${failCount}`);
    setPreviewModalVisible(false);
    setPreviewData([]);
    loadStudents(0, true);
    setUploadingCsv(false);
  };

  const updatePreviewItem = (index: number, field: string, value: string) => {
    const newData = [...previewData];
    newData[index][field] = value;
    setPreviewData(newData);
  };

  const handleDelete = React.useCallback((id: string, name: string) => {
    Alert.alert(
      "Delete Student",
      `Are you sure you want to delete ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            const { error } = await deleteStudent(id);
            if (error) Alert.alert("Error", error.message);
            else loadStudents(0, true);
          }
        }
      ]
    );
  }, []);

  const renderStudentItem = React.useCallback(({ item }: { item: Student }) => (
    <StudentCard item={item} onDelete={handleDelete} />
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
          <Text style={styles.headerTitle}>Student Management</Text>
          <View style={styles.menuButton} />
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#A0A0A0" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search students..."
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
      ) : students.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>No students found.</Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderStudentItem}
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

      {/* Add Student Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalDragIndicator} />
            <Text style={styles.modalTitle}>Register New Student</Text>
            
            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="e.g. John Doe" 
                  placeholderTextColor="#A0A0A0" 
                  value={form.fullName} 
                  onChangeText={(val) => setForm({...form, fullName: val})} 
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email Address *</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="john@example.com" 
                  placeholderTextColor="#A0A0A0" 
                  value={form.email} 
                  onChangeText={(val) => setForm({...form, email: val})} 
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Admission Number *</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="e.g. ADM-2024-001" 
                  placeholderTextColor="#A0A0A0" 
                  value={form.admissionNo} 
                  onChangeText={(val) => setForm({...form, admissionNo: val})} 
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
                <Text style={styles.label}>Date of Birth</Text>
                <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.datePickerText}>{form.dateOfBirth.toLocaleDateString()}</Text>
                  <Ionicons name="calendar-outline" size={20} color="#0047AB" />
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={form.dateOfBirth}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) setForm({...form, dateOfBirth: selectedDate});
                    }}
                  />
                )}
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
                <Text style={styles.saveText}>{creating ? 'Creating...' : 'Register Student'}</Text>
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
            <Text style={styles.modalTitle}>Review Student Data</Text>
            
            <View style={styles.previewHeaderRow}>
              <Text style={[styles.previewHeaderText, { flex: 2 }]}>Name & Email</Text>
              <Text style={[styles.previewHeaderText, { flex: 1.5 }]}>Adm No & Pass</Text>
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
                      value={item.admissionNo}
                      onChangeText={(val) => updatePreviewItem(index, 'admissionNo', val)}
                      placeholder="Adm No"
                    />
                    <TextInput
                      style={styles.previewInput}
                      value={item.password}
                      onChangeText={(val) => updatePreviewItem(index, 'password', val)}
                      placeholder="Password"
                      secureTextEntry
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
  studentName: { fontSize: 16, fontWeight: '800', color: '#1C1C1E', marginBottom: 2 },
  admissionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F4F6F8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  admissionText: { fontSize: 11, fontWeight: '700', color: '#0047AB' },
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
  datePickerButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: '#F4F6F8', 
    borderRadius: 12, 
    padding: 14 
  },
  datePickerText: { fontSize: 15, color: '#1C1C1E', fontWeight: '500' },
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
