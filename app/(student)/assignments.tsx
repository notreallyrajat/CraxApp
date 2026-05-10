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
import { supabase } from '../../lib/supabase';
import { getStudentProfile } from '../../lib/services/student';

export default function StudentAssignmentsScreen() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a1d2e" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Assignments</Text>
        <Text style={styles.headerSub}>Homework & projects to complete</Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a1d2e']} />}
      >
        {assignments.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="clipboard-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No assignments pending.</Text>
          </View>
        ) : (
          assignments.map(asn => {
            const overdue = isOverdue(asn.due_date);
            return (
              <View key={asn.id} style={[styles.asnCard, overdue && styles.overdueCard]}>
                <View style={styles.asnHeader}>
                  <View style={[styles.iconBox, { backgroundColor: overdue ? '#FEF2F2' : '#E8EAF6' }]}>
                    <Ionicons name="clipboard" size={20} color={overdue ? '#EF4444' : '#3F51B5'} />
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
                    <Ionicons name="calendar-outline" size={14} color={overdue ? '#EF4444' : '#64748b'} />
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
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { 
    backgroundColor: '#1a1d2e', 
    paddingTop: Platform.OS === 'android' ? 40 : 15, 
    paddingBottom: 25, 
    paddingHorizontal: 20 
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  content: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#94A3B8', marginTop: 15, fontSize: 15, fontWeight: '600' },
  asnCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 15, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5 },
  overdueCard: { borderLeftWidth: 4, borderLeftColor: '#EF4444' },
  asnHeader: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  titleInfo: { flex: 1 },
  asnTitle: { fontSize: 16, fontWeight: '700', color: '#1a1d2e' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  classText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  dot: { color: '#CBD5E1', marginHorizontal: 6 },
  subjectText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  asnDesc: { fontSize: 14, color: '#475569', marginTop: 15, lineHeight: 20 },
  asnFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  dueDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dueDateText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  overdueText: { color: '#EF4444', fontWeight: '700' },
  overdueBadge: { backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  overdueBadgeText: { fontSize: 10, fontWeight: '800', color: '#EF4444' }
});
