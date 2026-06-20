import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Platform,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

export default function StudentAnnouncementsScreen() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('status', 'approved')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error("Error loading announcements:", error);
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

  if (loading && !refreshing) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#3B3D6B" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Announcements</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B3D6B']} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {announcements.length === 0 && !loading ? (
           <View style={styles.emptyContainer}>
             <Ionicons name="notifications-off-outline" size={48} color="#cbd5e1" />
             <Text style={styles.emptyText}>No announcements yet</Text>
           </View>
        ) : (
          announcements.map((ann, index) => {
            const date = new Date(ann.created_at);
            const month = date.toLocaleDateString('en-US', { month: 'short' });
            const day = date.getDate();
            const fullDate = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

            return (
              <View key={ann.id || index} style={styles.annCard}>
                <View style={styles.annHeader}>
                  <View style={styles.dateBadge}>
                    <Text style={styles.dbMonth}>{month}</Text>
                    <Text style={styles.dbDay}>{day}</Text>
                  </View>
                  <View style={styles.annTitleCol}>
                    <Text style={styles.annTitle}>{ann.title}</Text>
                    <Text style={styles.annDateFull}>{fullDate}</Text>
                  </View>
                </View>
                <View style={styles.divider} />
                <Text style={styles.annContent}>{ann.content}</Text>
              </View>
            )
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    marginTop: Platform.OS === 'android' ? 50 : 60, 
    marginBottom: 15,
    paddingHorizontal: 20
  },
  backBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  content: { flex: 1, paddingHorizontal: 20 },
  
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#94a3b8', fontWeight: '500' },

  annCard: { 
    backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 3
  },
  annHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dateBadge: { 
    backgroundColor: '#e0e7ff', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, 
    alignItems: 'center', marginRight: 16 
  },
  dbMonth: { fontSize: 11, color: '#4f46e5', fontWeight: '700', textTransform: 'uppercase' },
  dbDay: { fontSize: 18, color: '#312e81', fontWeight: '800' },
  annTitleCol: { flex: 1, justifyContent: 'center' },
  annTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4, lineHeight: 22 },
  annDateFull: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  
  divider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 12 },
  annContent: { fontSize: 14, color: '#475569', lineHeight: 22 }
});
