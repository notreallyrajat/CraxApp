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
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getStudentProfile } from '../../lib/services/student';
import { getDocumentsForClass } from '../../lib/services/teacherDocument';

export default function StudentResourcesScreen() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: profile } = await getStudentProfile(session.user.id);
      if (profile?.students) {
        // Get all enrollments for classes
        const { data: enrData } = await supabase
          .from('enrollments')
          .select('class_id')
          .eq('student_id', profile.students.id);
        
        const classIds = (enrData || []).map(e => e.class_id);
        const allDocs: any[] = [];
        const seen = new Set();

        for (const cid of classIds) {
          const { data } = await getDocumentsForClass(cid);
          (data || []).forEach((row: any) => {
            if (row.teacher_documents && !seen.has(row.teacher_documents.id)) {
              seen.add(row.teacher_documents.id);
              allDocs.push(row.teacher_documents);
            }
          });
        }
        
        setDocs(allDocs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
    } catch (error) {
      console.error("Error loading student resources:", error);
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

  const getFileIcon = (mime: string) => {
    if (mime?.includes('pdf')) return { name: 'document-text', color: '#F44336' };
    if (mime?.includes('image')) return { name: 'image', color: '#2196F3' };
    return { name: 'file-tray-full', color: '#607D8B' };
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a1d2e" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Resources</Text>
            <Text style={styles.headerSub}>Study materials shared by teachers</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a1d2e']} />}
      >
        {docs.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="library-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No shared resources found.</Text>
          </View>
        ) : (
          docs.map(doc => {
            const icon = getFileIcon(doc.mime_type);
            return (
              <TouchableOpacity 
                key={doc.id} 
                style={styles.docCard}
                onPress={() => Linking.openURL(doc.file_url)}
              >
                <View style={[styles.iconBox, { backgroundColor: icon.color + '15' }]}>
                  <Ionicons name={icon.name as any} size={24} color={icon.color} />
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docTitle}>{doc.title}</Text>
                  <Text style={styles.docMeta}>
                    By {doc.teachers?.profiles?.full_name} • {new Date(doc.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Ionicons name="download-outline" size={20} color="#64748b" />
              </TouchableOpacity>
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
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  content: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#94A3B8', marginTop: 15, fontSize: 15, fontWeight: '600' },
  docCard: { 
    backgroundColor: '#fff', 
    borderRadius: 18, 
    padding: 16, 
    marginBottom: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5
  },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  docInfo: { flex: 1 },
  docTitle: { fontSize: 15, fontWeight: '700', color: '#1a1d2e' },
  docMeta: { fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: '600' }
});
