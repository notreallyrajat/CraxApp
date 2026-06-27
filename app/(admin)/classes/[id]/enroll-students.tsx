import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getStudents } from '../../../../lib/services/student';
import { createEnrollment, getEnrollments } from '../../../../lib/services/enrollment';

export default function EnrollStudentsScreen() {
  const router = useRouter();
  const { id: classId } = useLocalSearchParams<{ id: string }>();

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'dob'>('name');
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      // Fetch all students and all enrollments across the entire school
      const [studentsRes, enrollmentsRes] = await Promise.all([
        getStudents(0, 10000),
        getEnrollments() // Fetches all enrollments across all classes
      ]);

      let allStudents = studentsRes.data || [];
      
      if (enrollmentsRes.data) {
        // Find IDs of students who are already enrolled in ANY class
        const enrolledStudentIds = new Set(
          enrollmentsRes.data
            .filter((e: any) => e.students?.id) 
            .map((e: any) => e.students.id)
        );
        
        // Filter out those students so they can't be enrolled again
        allStudents = allStudents.filter((s: any) => !enrolledStudentIds.has(s.id));
      }
      
      setStudents(allStudents);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAndSortedStudents = () => {
    let filtered = students;
    
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.profiles?.full_name?.toLowerCase().includes(q) || 
        s.admission_no?.toLowerCase().includes(q)
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = a.profiles?.full_name || '';
        const nameB = b.profiles?.full_name || '';
        return nameA.localeCompare(nameB);
      } else {
        const dobA = a.date_of_birth ? new Date(a.date_of_birth).getTime() : 0;
        const dobB = b.date_of_birth ? new Date(b.date_of_birth).getTime() : 0;
        return dobB - dobA; // Newest to oldest (or vice versa based on preference)
      }
    });

    return filtered;
  };

  const displayedStudents = getFilteredAndSortedStudents();

  const toggleSelectAll = () => {
    if (selectedIds.size === displayedStudents.length && displayedStudents.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedStudents.map(s => s.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleEnroll = async () => {
    if (selectedIds.size === 0) return;
    
    setEnrolling(true);
    let hasError = false;
    let errorMessage = '';

    for (const sId of Array.from(selectedIds)) {
      const { error } = await createEnrollment({
        studentId: sId,
        classId: classId,
      });
      if (error) {
        hasError = true;
        errorMessage = error.message;
      }
    }
    
    setEnrolling(false);
    if (hasError) {
      Alert.alert('Error', errorMessage);
    } else {
      Alert.alert('Success', `Successfully enrolled ${selectedIds.size} students!`, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enroll Students</Text>
        <View style={styles.backButton} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}

      <View style={styles.toolsContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or admission no..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          <TouchableOpacity 
            style={[styles.sortPill, sortBy === 'name' && styles.sortPillActive]}
            onPress={() => setSortBy('name')}
          >
            <Text style={[styles.sortPillText, sortBy === 'name' && styles.sortPillTextActive]}>Name (A-Z)</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.sortPill, sortBy === 'dob' && styles.sortPillActive]}
            onPress={() => setSortBy('dob')}
          >
            <Text style={[styles.sortPillText, sortBy === 'dob' && styles.sortPillTextActive]}>DOB</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listCount}>{displayedStudents.length} Students</Text>
        <TouchableOpacity onPress={toggleSelectAll}>
          <Text style={styles.selectAllText}>
            {selectedIds.size === displayedStudents.length && displayedStudents.length > 0 ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0047AB" />
        </View>
      ) : (
        <FlatList
          data={displayedStudents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <TouchableOpacity 
                style={[styles.studentCard, isSelected && styles.studentCardSelected]} 
                onPress={() => toggleSelect(item.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
                <View style={styles.studentInfo}>
                  <Text style={[styles.studentName, isSelected && styles.studentNameSelected]}>
                    {item.profiles?.full_name}
                  </Text>
                  <Text style={[styles.studentSub, isSelected && styles.studentSubSelected]}>
                    Adm: {item.admission_no} • DOB: {item.date_of_birth ? new Date(item.date_of_birth).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {selectedIds.size > 0 && (
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarInfo}>
            <Text style={styles.selectedCount}>{selectedIds.size} Selected</Text>
          </View>
          <TouchableOpacity 
            style={[styles.enrollButton, enrolling && { opacity: 0.7 }]} 
            onPress={handleEnroll}
            disabled={enrolling}
          >
            <Text style={styles.enrollButtonText}>{enrolling ? 'Enrolling...' : 'Enroll Now'}</Text>
          </TouchableOpacity>
        </View>
      )}
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
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  toolsContainer: { padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F6F8', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: '#1C1C1E' },
  sortContainer: { flexDirection: 'row', alignItems: 'center' },
  sortLabel: { fontSize: 13, color: '#8E8E93', fontWeight: '600', marginRight: 8 },
  sortPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F4F6F8', marginRight: 8 },
  sortPillActive: { backgroundColor: '#E8F0FE' },
  sortPillText: { fontSize: 13, fontWeight: '600', color: '#8E8E93' },
  sortPillTextActive: { color: '#0047AB' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  listCount: { fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
  selectAllText: { fontSize: 14, fontWeight: '700', color: '#0047AB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 100 },
  studentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, borderWidth: 1, borderColor: 'transparent' },
  studentCardSelected: { backgroundColor: '#E8F0FE', borderColor: '#0047AB' },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D1D5DB', marginRight: 16, justifyContent: 'center', alignItems: 'center' },
  checkboxSelected: { backgroundColor: '#0047AB', borderColor: '#0047AB' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
  studentNameSelected: { color: '#0047AB' },
  studentSub: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },
  studentSubSelected: { color: '#0047AB', opacity: 0.8 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', padding: 20, paddingTop: 16, paddingBottom: 30, borderTopWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 10 },
  bottomBarInfo: { flex: 1 },
  selectedCount: { fontSize: 16, fontWeight: '800', color: '#1C1C1E' },
  enrollButton: { backgroundColor: '#0047AB', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  enrollButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});
