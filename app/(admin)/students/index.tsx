import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Modal, Alert, ScrollView, Platform } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getStudents, deleteStudent } from '../../../lib/services/student';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Config } from '../../../constants/Config';
import * as DocumentPicker from 'expo-document-picker';
import Papa from 'papaparse';
import { supabase } from '../../../lib/supabase';

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
      <View style={[styles.avatar, { backgroundColor: '#DBEAFE' }]}>
        <Text style={[styles.avatarText, { color: '#3B82F6' }]}>{item.profiles?.full_name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.headerInfo}>
        <Text style={styles.studentName}>{item.profiles?.full_name}</Text>
        <View style={styles.admissionBadge}>
          <Text style={styles.admissionText}>ADM: {item.admission_no}</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.deleteButton} 
        onPress={() => onDelete(item.id, item.profiles?.full_name || 'Student')}
      >
        <Ionicons name="trash-outline" size={20} color="#EF4444" />
      </TouchableOpacity>
    </View>
    
    <View style={styles.cardContent}>
      {item.profiles?.email && (
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={16} color="#64748b" />
          <Text style={styles.infoText}>{item.profiles.email}</Text>
        </View>
      )}
      {item.profiles?.phone && (
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={16} color="#64748b" />
          <Text style={styles.infoText}>{item.profiles.phone}</Text>
        </View>
      )}
      {item.date_of_birth && (
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#64748b" />
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

  const handleCreate = async () => {
    if (!form.fullName.trim() || !form.email.trim() || !form.admissionNo.trim() || !form.password.trim()) {
      Alert.alert('Error', 'Full name, email, admission number and password are required.');
      return;
    }

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 10000);

      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          phone: form.phone || undefined,
          role: 'student',
          extraData: {
            admissionNo: form.admissionNo,
            dateOfBirth: form.dateOfBirth.toISOString().split('T')[0],
          },
        }
      });
      clearTimeout(id);

      if (!error) {
        Alert.alert('Success', 'Student created successfully.');
        setModalVisible(false);
        setForm(emptyForm);
        loadStudents(0, true);
      } else {
        Alert.alert('Backend Error', error.message || 'Failed to create student.');
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
      if (Platform.OS === 'web' && result.assets[0].file) {
        fileData = result.assets[0].file;
      } else {
        const response = await fetch(fileUri);
        fileData = await response.text();
      }

      Papa.parse(fileData, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().replace(/^\uFEFF/g, '').toLowerCase(),
        complete: async (results) => {
          const rows = results.data as any[];
          if (rows.length === 0) {
            Alert.alert('Error', 'The CSV file is empty.');
            setUploadingCsv(false);
            return;
          }

          const formattedRows = rows.map(row => ({
            fullName: row['full name'] || row['name'] || '',
            email: row['email'] || '',
            password: row['password'] || 'password123',
            admissionNo: row['admission no'] || row['admission_no'] || '',
            phone: row['phone'] || '',
            dateOfBirth: row['dob'] || row['date of birth'] || row['date_of_birth'] || ''
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

    const { data: { session } } = await supabase.auth.getSession();

    for (const student of validData) {
      try {
        let dobStr = null;
        if (student.dateOfBirth) {
          // Handle DD/MM/YYYY format
          const parts = student.dateOfBirth.split('/');
          let parsedDate;
          if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
            // Reconstruct as YYYY-MM-DD
            parsedDate = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T12:00:00Z`);
          } else {
            parsedDate = new Date(student.dateOfBirth);
          }
          
          if (!isNaN(parsedDate.getTime())) {
            dobStr = parsedDate.toISOString().split('T')[0];
          }
        }

        const { error } = await supabase.functions.invoke('manage-users', {
          body: {
            email: student.email,
            password: student.password,
            fullName: student.fullName,
            phone: student.phone || undefined,
            role: 'student',
            extraData: {
              admissionNo: student.admissionNo,
              dateOfBirth: dobStr,
            },
          }
        });

        if (!error) {
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
        <ActivityIndicator size="small" color="#3B3D6B" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={{ marginRight: 16 }}>
            <Ionicons name="menu" size={32} color="#1e293b" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerSub}>Manage Institution</Text>
            <Text style={styles.headerTitle}>Students</Text>
          </View>
        </View>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{students.length} Loaded</Text>
        </View>
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search students by name or admission no..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading && page === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B3D6B" />
        </View>
      ) : students.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No students found</Text>
          <Text style={styles.emptyText}>Get started by registering a new student.</Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
          style={[styles.fab, { backgroundColor: '#FFFFFF', marginBottom: 16 }]} 
          onPress={handleCsvUpload}
          activeOpacity={0.8}
        >
          {uploadingCsv ? <ActivityIndicator size="small" color="#3B3D6B" /> : <Ionicons name="document-text-outline" size={24} color="#3B3D6B" />}
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Add Student Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register Student</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtnIcon}>
                <Ionicons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="e.g. John Doe" 
                  placeholderTextColor="#94a3b8" 
                  value={form.fullName} 
                  onChangeText={(val) => setForm({...form, fullName: val})} 
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email Address *</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="john@example.com" 
                  placeholderTextColor="#94a3b8" 
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
                  placeholderTextColor="#94a3b8" 
                  value={form.admissionNo} 
                  onChangeText={(val) => setForm({...form, admissionNo: val})} 
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="+1 234 567 890" 
                  placeholderTextColor="#94a3b8" 
                  value={form.phone} 
                  onChangeText={(val) => setForm({...form, phone: val})} 
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Date of Birth</Text>
                <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.datePickerText}>{form.dateOfBirth.toLocaleDateString()}</Text>
                  <Ionicons name="calendar-outline" size={22} color="#64748b" />
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
                    placeholderTextColor="#94a3b8" 
                    value={form.password} 
                    onChangeText={(val) => setForm({...form, password: val})} 
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={{ height: 20 }} />
            </ScrollView>

            <TouchableOpacity 
              style={[styles.submitBtn, (creating) && { opacity: 0.7 }]} 
              onPress={handleCreate} 
              disabled={creating}
              activeOpacity={0.8}
            >
              {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Register Student</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CSV Preview Modal */}
      <Modal visible={previewModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review Student Data</Text>
              <TouchableOpacity onPress={() => setPreviewModalVisible(false)} style={styles.closeBtnIcon}>
                <Ionicons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.previewHeaderRow}>
              <Text style={[styles.previewHeaderText, { flex: 2 }]}>Name & Email</Text>
              <Text style={[styles.previewHeaderText, { flex: 1.5 }]}>Adm No & Pass</Text>
            </View>
            
            <FlatList
              data={previewData}
              keyExtractor={(_, index) => index.toString()}
              style={{ flex: 1, marginBottom: 16 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <View style={styles.previewRow}>
                  <View style={{ flex: 2, marginRight: 8 }}>
                    <TextInput
                      style={[styles.previewInput, { marginBottom: 8 }]}
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
                      style={[styles.previewInput, { marginBottom: 8 }]}
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

            <TouchableOpacity 
              style={[styles.submitBtn, (uploadingCsv) && { opacity: 0.7 }]} 
              onPress={confirmCsvUpload} 
              disabled={uploadingCsv}
              activeOpacity={0.8}
            >
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
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#3B3D6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#1e293b', fontSize: 15, fontWeight: '600' },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -100 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
  
  listContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#3B3D6B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 5,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#3B82F6' },
  headerInfo: { flex: 1, justifyContent: 'center' },
  studentName: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
  admissionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  admissionText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  deleteButton: { padding: 8, backgroundColor: '#FEF2F2', borderRadius: 10, marginLeft: 8 },
  
  cardContent: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16, gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoText: { fontSize: 14, color: '#475569', marginLeft: 10, fontWeight: '600' },
  
  fabContainer: { position: 'absolute', bottom: 30, right: 20, alignItems: 'center' },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3B3D6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B3D6B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: '#FFFFFF', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 24, 
    maxHeight: '85%' 
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  closeBtnIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  
  formScroll: { marginBottom: 20 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 10, marginLeft: 4 },
  input: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, fontSize: 15, color: '#1e293b', borderWidth: 1, borderColor: '#f1f5f9' },
  datePickerButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: '#f8fafc', 
    borderRadius: 16, 
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  datePickerText: { fontSize: 15, color: '#1e293b' },
  passwordInputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f8fafc', 
    borderRadius: 16, 
    paddingRight: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  passwordInput: { flex: 1, padding: 16, fontSize: 15, color: '#1e293b' },
  
  submitBtn: { backgroundColor: '#3B3D6B', padding: 18, borderRadius: 16, marginTop: 10, marginBottom: Platform.OS === 'ios' ? 20 : 0, alignItems: 'center', shadowColor: '#3B3D6B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  
  previewHeaderRow: { flexDirection: 'row', paddingHorizontal: 4, marginBottom: 12 },
  previewHeaderText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  previewRow: { flexDirection: 'row', marginBottom: 12, backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  previewInput: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, fontSize: 13, color: '#1e293b', borderWidth: 1, borderColor: '#f1f5f9', fontWeight: '600' },
});
