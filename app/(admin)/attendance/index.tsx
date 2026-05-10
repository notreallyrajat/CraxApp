import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

type Teacher = {
  id: string;
  employee_id: string;
  department: string | null;
  profiles: { full_name: string } | null;
};

type Assignment = {
  id: string;
  section_id: string | null;
  classes: { id: string; name: string; code: string | null } | null;
  sections: { id: string; name: string } | null;
};

export default function AttendanceModule() {
  const router = useRouter();
  const navigation = useNavigation();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  useEffect(() => {
    async function loadTeachers() {
      const { data, error } = await supabase.from('teachers').select('id, employee_id, department, profiles(full_name)');
      if (!error && data) setTeachers(data as unknown as Teacher[]);
      setLoadingTeachers(false);
    }
    loadTeachers();
  }, []);

  useEffect(() => {
    if (!selectedTeacherId) {
      setAssignments([]);
      return;
    }
    async function loadAssignments() {
      setLoadingAssignments(true);
      const { data, error } = await supabase
        .from('teacher_assignments')
        .select('id, section_id, classes(id, name, code), sections(id, name)')
        .eq('teacher_id', selectedTeacherId);
        
      if (!error && data) setAssignments(data as unknown as Assignment[]);
      setLoadingAssignments(false);
    }
    loadAssignments();
  }, [selectedTeacherId]);

  return (
    <View style={styles.container}>
      {/* Royal Blue Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.backButton}>
          <Ionicons name="menu" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance Overview</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Select Teacher</Text>
        
        {loadingTeachers ? (
          <ActivityIndicator color="#0047AB" />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teacherScroll}>
            {teachers.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.teacherChip, selectedTeacherId === t.id && styles.teacherChipSelected]}
                onPress={() => setSelectedTeacherId(t.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.teacherChipText, selectedTeacherId === t.id && styles.teacherChipTextSelected]}>
                  {t.profiles?.full_name || t.employee_id}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {selectedTeacherId && (
          <View style={styles.assignmentsSection}>
            <View style={styles.assignmentsHeader}>
              <Text style={styles.assignmentsTitle}>Assigned Classes</Text>
              {!loadingAssignments && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{assignments.length}</Text>
                </View>
              )}
            </View>

            {loadingAssignments ? (
              <ActivityIndicator color="#0047AB" style={{ marginTop: 20 }} />
            ) : assignments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="folder-open-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>No classes assigned.</Text>
              </View>
            ) : (
              <FlatList
                data={assignments}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={styles.card}>
                    <View style={[styles.iconBlock, { backgroundColor: '#E8F5E9' }]}>
                      <Ionicons name="calendar" size={24} color="#4CAF50" />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{item.classes?.name || 'Unknown Class'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={styles.pillBadge}>
                          <Text style={styles.pillText}>
                            {item.sections ? `Sec ${item.sections.name}` : 'All Sec'}
                          </Text>
                        </View>
                        {item.classes?.code && (
                          <Text style={styles.codeText}> • {item.classes.code}</Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={styles.manageButton}
                      onPress={() => {
                        router.push({
                          pathname: '/(admin)/attendance/sessions',
                          params: {
                            classId: item.classes?.id,
                            className: item.classes?.name,
                            sectionId: item.section_id || undefined,
                            sectionName: item.sections?.name || 'All Sec',
                          }
                        })
                      }}
                    >
                      <Text style={styles.manageButtonText}>Manage</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  header: {
    backgroundColor: '#0047AB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  backButton: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#1C1C1E', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  teacherScroll: { flexGrow: 0, marginBottom: 20 },
  teacherChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  teacherChipSelected: {
    backgroundColor: '#0047AB',
  },
  teacherChipText: { color: '#8E8E93', fontWeight: '700', fontSize: 13 },
  teacherChipTextSelected: { color: '#FFFFFF' },
  assignmentsSection: { flex: 1 },
  assignmentsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  assignmentsTitle: { fontSize: 16, fontWeight: '800', color: '#1C1C1E' },
  badge: { backgroundColor: '#E8F0FE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginLeft: 10 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#0047AB' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  emptyText: { marginTop: 12, color: '#8E8E93', fontWeight: '500', fontSize: 14 },
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
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1C1C1E', marginBottom: 4 },
  pillBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  pillText: { fontSize: 11, fontWeight: '700', color: '#0047AB' },
  codeText: { fontSize: 12, color: '#8E8E93', fontWeight: '500' },
  manageButton: { 
    backgroundColor: '#E8F0FE', 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 100 
  },
  manageButtonText: { 
    color: '#0047AB', 
    fontSize: 12, 
    fontWeight: '800' 
  },
});
