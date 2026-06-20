import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  RefreshControl,
  Platform,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getStudentProfile } from '../../lib/services/student';

export default function StudentAssignmentsScreen() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: profile } = await getStudentProfile(session.user.id);
      if (profile?.students) {
        // Get class enrollments
        const { data: enrData } = await supabase
          .from('enrollments')
          .select('class_id')
          .eq('student_id', profile.students.id);
        
        const classIds = (enrData || []).map(e => e.class_id);
        
        if (classIds.length > 0) {
          const { data } = await supabase
            .from('assignments')
            .select(`
              *,
              classes ( name ),
              subjects ( name )
            `)
            .in('class_id', classIds)
            .order('due_date', { ascending: true });
          
          setAssignments(data || []);
        }
      }
    } catch (error) {
      console.error("Error loading student assignments:", error);
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

  const isOverdue = (date: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  if (loading && !refreshing) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#3B3D6B" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Homework</Text>
          <View style={{ width: 28 }} />
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B3D6B']} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {assignments.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="clipboard-outline" size={56} color="#cbd5e1" />
            <Text style={styles.emptyText}>No assignments pending</Text>
          </View>
        ) : (
          assignments.map(asn => {
            const overdue = isOverdue(asn.due_date);
            return (
              <View key={asn.id} style={[styles.asnCard, overdue && styles.overdueCard]}>
                <View style={styles.asnHeader}>
                  <View style={[styles.iconBox, { backgroundColor: overdue ? '#FEF2F2' : '#e0e7ff', marginRight: 16 }]}>
                    <Ionicons name="clipboard" size={24} color={overdue ? '#EF4444' : '#3B3D6B'} />
                  </View>
                  <View style={styles.titleInfo}>
                    <Text style={styles.asnTitle}>{asn.title}</Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.classText}>{asn.classes?.name}</Text>
                      {asn.subjects && (
                        <>
                          <Text style={styles.dot}>•</Text>
                          <Text style={styles.subjectText}>{asn.subjects.name}</Text>
                        </>
                      )}
                    </View>
                  </View>
                </View>
                
                {asn.description && <Text style={styles.asnDesc}>{asn.description}</Text>}
                
                <View style={styles.asnFooter}>
                  <View style={styles.dueDateRow}>
                    <Ionicons name="calendar-outline" size={16} color={overdue ? '#EF4444' : '#64748b'} />
                    <Text style={[styles.dueDateText, overdue && styles.overdueText]}>
                      Due: {asn.due_date ? new Date(asn.due_date).toLocaleDateString() : 'No deadline'}
                    </Text>
                  </View>
                  {overdue && (
                    <View style={styles.overdueBadge}>
                      <Text style={styles.overdueBadgeText}>Overdue</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    marginTop: Platform.OS === 'android' ? 50 : 60, 
    marginBottom: 10,
    paddingHorizontal: 20
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  backBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  
  content: { flex: 1, paddingHorizontal: 20 },
  
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#94a3b8', marginTop: 16, fontSize: 16, fontWeight: '500' },
  
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 16, 
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 3
  },
  // Assignment styles
  asnCard: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 16, 
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 3
  },
  overdueCard: { borderLeftWidth: 4, borderLeftColor: '#EF4444' },
  asnHeader: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  titleInfo: { flex: 1 },
  asnTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  classText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  dot: { color: '#cbd5e1', marginHorizontal: 6 },
  subjectText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  asnDesc: { fontSize: 14, color: '#475569', marginTop: 16, lineHeight: 22 },
  asnFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  dueDateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dueDateText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  overdueText: { color: '#EF4444', fontWeight: '700' },
  overdueBadge: { backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  overdueBadgeText: { fontSize: 11, fontWeight: '800', color: '#EF4444' }
});
