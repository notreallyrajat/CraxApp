import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Platform,
  Alert,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { getUserDocuments, updateDocumentStatus } from '../../../lib/services/documents';

export default function UserRecordsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      // Fetch profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('*, user_roles(role)')
        .eq('auth_user_id', id)
        .single();
      
      setProfile(prof);

      // Fetch documents
      const { data: docs } = await getUserDocuments(id as string);
      setDocuments(docs || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenDoc = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Error", "Don't know how to open this URL: " + url);
    }
  };

  const handleStatusUpdate = async (docId: string, status: 'approved' | 'rejected') => {
    const { error } = await updateDocumentStatus(docId, status);
    if (error) {
      Alert.alert("Error", "Failed to update status");
    } else {
      loadData();
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a1d2e" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.userName}>{profile?.full_name}</Text>
          <Text style={styles.userRole}>{profile?.user_roles?.[0]?.role?.toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>E-Documents</Text>
          <Text style={styles.sectionCount}>{documents.length} Files</Text>
        </View>

        {documents.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No documents uploaded yet.</Text>
          </View>
        ) : (
          documents.map(doc => (
            <View key={doc.id} style={styles.docCard}>
              <View style={styles.docIcon}>
                <Ionicons name="document-text" size={30} color="#1a1d2e" />
              </View>
              <View style={styles.docInfo}>
                <Text style={styles.docName}>{doc.document_name}</Text>
                <Text style={styles.docDate}>Uploaded: {new Date(doc.created_at).toLocaleDateString()}</Text>
                <View style={[
                  styles.statusBadge, 
                  doc.status === 'pending_approval' ? styles.statusPending : 
                  doc.status === 'rejected' ? styles.statusRejected : styles.statusApproved
                ]}>
                  <Text style={[
                    styles.statusText,
                    doc.status === 'pending_approval' ? styles.statusTextPending : 
                    doc.status === 'rejected' ? styles.statusTextRejected : styles.statusTextApproved
                  ]}>
                    {doc.status?.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>
              
              <View style={styles.actions}>
                <TouchableOpacity 
                  style={styles.viewButton}
                  onPress={() => handleOpenDoc(doc.file_url)}
                >
                  <Ionicons name="eye" size={20} color="#1a1d2e" />
                </TouchableOpacity>

                {doc.status === 'pending_approval' && (
                  <View style={styles.adminActions}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => handleStatusUpdate(doc.id, 'approved')}
                    >
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => handleStatusUpdate(doc.id, 'rejected')}
                    >
                      <Ionicons name="close" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))
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
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center'
  },
  backButton: { marginRight: 15 },
  headerContent: { flex: 1 },
  userName: { fontSize: 20, fontWeight: '800', color: '#fff' },
  userRole: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '700', letterSpacing: 1 },
  content: { flex: 1, padding: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1a1d2e' },
  sectionCount: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#94A3B8', marginTop: 15, fontSize: 15, fontWeight: '600' },
  docCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 15, 
    marginBottom: 12, 
    flexDirection: 'row', 
    alignItems: 'center',
    elevation: 1
  },
  docIcon: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  docInfo: { flex: 1 },
  docName: { fontSize: 15, fontWeight: '700', color: '#1a1d2e' },
  docDate: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 6 },
  statusApproved: { backgroundColor: '#DCFCE7' },
  statusPending: { backgroundColor: '#FEF9C3' },
  statusRejected: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 9, fontWeight: '800' },
  statusTextApproved: { color: '#166534' },
  statusTextPending: { color: '#854d0e' },
  statusTextRejected: { color: '#991b1b' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  viewButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  adminActions: { flexDirection: 'row', marginLeft: 10 },
  actionBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginLeft: 5 },
  approveBtn: { backgroundColor: '#10B981' },
  rejectBtn: { backgroundColor: '#EF4444' }
});
