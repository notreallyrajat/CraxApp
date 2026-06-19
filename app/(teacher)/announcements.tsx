import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getTeacherProfile, getAssignedClasses } from '../../lib/services/teacher';
import { 
  createAnnouncement, 
  deleteAnnouncement,
  Announcement,
  AnnouncementAudience,
  AnnouncementPriority
} from '../../lib/services/announcement';

export default function TeacherAnnouncementsScreen() {
  const [teacher, setTeacher] = useState<any>(null);
  const [myAnnouncements, setMyAnnouncements] = useState<any[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Create State
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState<AnnouncementAudience>('all');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: profile } = await getTeacherProfile(session.user.id);
      if (profile?.teachers) {
        setTeacher(profile.teachers);
        
        const [annRes, classesRes] = await Promise.all([
          supabase.from('announcements')
            .select('*')
            .eq('teacher_id', profile.teachers.id)
            .order('created_at', { ascending: false }),
          getAssignedClasses(profile.teachers.id)
        ]);

        setMyAnnouncements(annRes.data || []);
        
        // Unique classes for selection
        const uniqueClasses = [];
        const seen = new Set();
        (classesRes.data || []).forEach(c => {
          if (!seen.has(c.class_id)) {
            seen.add(c.class_id);
            uniqueClasses.push(c);
          }
        });
        setAssignedClasses(uniqueClasses);
      }
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

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Error", "Title and content are required.");
      return;
    }

    setSaving(true);
    try {
      // For teachers, we manually set status to 'pending'
      // Note: my service createAnnouncement defaults to 'approved' for admin.
      // I should have a separate function or pass status.
      
      const { error } = await supabase.from('announcements').insert({
        title,
        content,
        audience,
        priority,
        class_ids: selectedClasses,
        status: 'pending',
        is_published: false,
        teacher_id: teacher.id
      });

      if (error) throw error;

      setModalVisible(false);
      setTitle('');
      setContent('');
      setAudience('all');
      setSelectedClasses([]);
      loadData();
      Alert.alert("Submitted", "Your announcement has been submitted for admin approval.");
    } catch (error) {
      Alert.alert("Error", "Failed to submit announcement.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete", "Are you sure you want to delete this?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await deleteAnnouncement(id);
        loadData();
      }}
    ]);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'approved': return { label: 'Approved', color: '#4CAF50', icon: 'checkmark-circle' };
      case 'pending': return { label: 'Pending Approval', color: '#FF9800', icon: 'time' };
      case 'rejected': return { label: 'Rejected', color: '#F44336', icon: 'close-circle' };
      default: return { label: 'Unknown', color: '#9E9E9E', icon: 'help-circle' };
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a1d2e" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Announcements</Text>
          <Text style={styles.headerSub}>Communicate with your students</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a1d2e']} />}
      >
        {myAnnouncements.map(ann => {
          const status = getStatusInfo(ann.status);
          return (
            <View key={ann.id} style={styles.annCard}>
              <View style={styles.annHeader}>
                <View style={styles.titleArea}>
                  <Text style={styles.annTitle}>{ann.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
                    <Ionicons name={status.icon as any} size={12} color={status.color} />
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleDelete(ann.id)}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
              <Text style={styles.annBody} numberOfLines={3}>{ann.content}</Text>
              <View style={styles.annFooter}>
                <Text style={styles.annDate}>{new Date(ann.created_at).toLocaleDateString()}</Text>
                <Text style={styles.annAudience}>{ann.audience.toUpperCase()}</Text>
              </View>
              {ann.rejection_note && (
                <View style={styles.rejectionBox}>
                  <Text style={styles.rejectionTitle}>Admin Note:</Text>
                  <Text style={styles.rejectionBody}>{ann.rejection_note}</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Announcement</Text>
            
            <Text style={styles.label}>Title</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Subject" />
            
            <Text style={styles.label}>Message</Text>
            <TextInput style={[styles.input, styles.textArea]} value={content} onChangeText={setContent} placeholder="Write your announcement..." multiline />

            <Text style={styles.label}>Audience</Text>
            <View style={styles.audienceGrid}>
              {['all', 'students', 'teachers', 'class'].map(aud => (
                <TouchableOpacity 
                  key={aud} 
                  style={[styles.audBtn, audience === aud && styles.audBtnActive]}
                  onPress={() => setAudience(aud as any)}
                >
                  <Text style={[styles.audBtnText, audience === aud && styles.audBtnTextActive]}>{aud.charAt(0).toUpperCase() + aud.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {audience === 'class' && (
              <>
                <Text style={styles.label}>Select Classes</Text>
                <View style={styles.audienceGrid}>
                  {assignedClasses.map(cls => (
                    <TouchableOpacity 
                      key={cls.id} 
                      style={[styles.audBtn, selectedClasses.includes(cls.class_id) && styles.audBtnActive]}
                      onPress={() => {
                        if (selectedClasses.includes(cls.class_id)) {
                          setSelectedClasses(prev => prev.filter(id => id !== cls.class_id));
                        } else {
                          setSelectedClasses(prev => [...prev, cls.class_id]);
                        }
                      }}
                    >
                      <Text style={[styles.audBtnText, selectedClasses.includes(cls.class_id) && styles.audBtnTextActive]}>{cls.classes.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { 
    backgroundColor: '#1a1d2e', 
    paddingTop: Platform.OS === 'android' ? 40 : 15, 
    paddingBottom: 20, 
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15
  },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  content: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  annCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, elevation: 2 },
  annHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleArea: { flex: 1, marginRight: 10 },
  annTitle: { fontSize: 16, fontWeight: '700', color: '#1a1d2e', marginBottom: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  statusText: { fontSize: 10, fontWeight: '800' },
  annBody: { fontSize: 14, color: '#475569', lineHeight: 20, marginVertical: 12 },
  annFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  annDate: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  annAudience: { fontSize: 10, fontWeight: '800', color: '#64748b' },
  rejectionBox: { marginTop: 12, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 10, borderLeftWidth: 3, borderLeftColor: '#EF4444' },
  rejectionTitle: { fontSize: 11, fontWeight: '800', color: '#991B1B' },
  rejectionBody: { fontSize: 11, color: '#B91C1C', marginTop: 2 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#1a1d2e', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1a1d2e', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#64748b', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 15 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  audienceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  audBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  audBtnActive: { backgroundColor: '#1a1d2e', borderColor: '#1a1d2e' },
  audBtnText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  audBtnTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelBtnText: { fontWeight: '700', color: '#64748b' },
  submitBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#1a1d2e', alignItems: 'center' },
  submitBtnText: { fontWeight: '700', color: '#fff' }
});
