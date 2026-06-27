import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Modal, 
  TextInput, 
  Alert,
  RefreshControl,
  FlatList,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { 
  getAnnouncements, 
  createAnnouncement, 
  updateAnnouncement, 
  deleteAnnouncement, 
  approveAnnouncement, 
  rejectAnnouncement,
  Announcement,
  AnnouncementAudience,
  AnnouncementPriority 
} from '../../lib/services/announcement';
import { getClasses } from '../../lib/services/class';

const PRIORITIES: AnnouncementPriority[] = ['low', 'normal', 'high', 'urgent'];
const AUDIENCES: { label: string; value: AnnouncementAudience }[] = [
  { label: 'All', value: 'all' },
  { label: 'Students', value: 'students' },
  { label: 'Teachers', value: 'teachers' },
  { label: 'Class Specific', value: 'class' },
];

export default function NotificationsScreen() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved'>('all');

  const navigation = useNavigation();

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState<AnnouncementAudience>('all');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [annRes, clsRes] = await Promise.all([getAnnouncements(), getClasses()]);
      setAnnouncements(annRes.data || []);
      setClasses(clsRes.data || []);
    } catch (error) {
      Alert.alert("Error", "Failed to load announcements.");
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

  const resetForm = () => {
    setTitle('');
    setContent('');
    setAudience('all');
    setPriority('normal');
    setSelectedClasses([]);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Missing Fields", "Please provide both title and content.");
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await updateAnnouncement(editingId, {
          title,
          body: content,
          audience,
          priority,
          classIds: selectedClasses
        });
      } else {
        await createAnnouncement({
          title,
          body: content,
          audience,
          priority,
          classIds: selectedClasses
        });
      }
      setModalVisible(false);
      resetForm();
      loadData();
    } catch (error) {
      Alert.alert("Error", "Failed to save announcement.");
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Announcement", "Are you sure you want to delete this?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await deleteAnnouncement(id);
        loadData();
      }}
    ]);
  };

  const handleApprove = async (id: string) => {
    await approveAnnouncement(id);
    loadData();
  };

  const handleReject = (id: string) => {
    Alert.prompt("Reject Announcement", "Enter reason for rejection:", [
      { text: "Cancel", style: "cancel" },
      { text: "Reject", style: "destructive", onPress: async (note) => {
        await rejectAnnouncement(id, note || "");
        loadData();
      }}
    ]);
  };

  const openEdit = (ann: Announcement) => {
    setTitle(ann.title);
    setContent(ann.content);
    setAudience(ann.audience);
    setPriority(ann.priority);
    setSelectedClasses(ann.class_ids || []);
    setEditingId(ann.id);
    setModalVisible(true);
  };

  const filteredAnnouncements = announcements.filter(ann => {
    if (activeTab === 'pending') return ann.status === 'pending';
    if (activeTab === 'approved') return ann.status === 'approved';
    return true;
  });

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'urgent': return '#EF4444';
      case 'high': return '#F59E0B';
      case 'normal': return '#3B82F6';
      case 'low': return '#94A3B8';
      default: return '#3B82F6';
    }
  };

  const renderItem = ({ item }: { item: Announcement }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '15' }]}>
          <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
            {item.priority.toUpperCase()}
          </Text>
        </View>
        <View style={styles.dateBadge}>
          <Text style={styles.dbMonth}>{new Date(item.created_at).toLocaleDateString('en-US', { month: 'short' })}</Text>
          <Text style={styles.dbDay}>{new Date(item.created_at).getDate()}</Text>
        </View>
      </View>

      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardContent} numberOfLines={3}>{item.content}</Text>

      <View style={styles.cardFooter}>
        <View style={styles.audienceContainer}>
          <Ionicons name="people" size={16} color="#64748b" />
          <Text style={styles.audienceText}>{item.audience.charAt(0).toUpperCase() + item.audience.slice(1)}</Text>
        </View>

        <View style={styles.actions}>
          {item.status === 'pending' ? (
            <>
              <TouchableOpacity onPress={() => handleApprove(item.id)} style={styles.iconBtn}>
                <Ionicons name="checkmark-circle" size={26} color="#10B981" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleReject(item.id)} style={styles.iconBtn}>
                <Ionicons name="close-circle" size={26} color="#EF4444" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
                <Ionicons name="create-outline" size={24} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {item.teacher_id && (
        <View style={styles.authorBar}>
          <Text style={styles.authorText}>By: {item.teachers?.profiles?.full_name || "Teacher"}</Text>
          {item.status === 'rejected' && item.rejection_note && (
            <Text style={styles.rejectionNote}>Note: {item.rejection_note}</Text>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={{ marginRight: 16 }}>
            <Ionicons name="menu" size={32} color="#1e293b" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerSub}>School Broadcasts</Text>
            <Text style={styles.headerTitle}>Announcements</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabBar}>
        {(['all', 'pending', 'approved'] as const).map(tab => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredAnnouncements}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B3D6B']} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="megaphone-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>No announcements found.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => { resetForm(); setModalVisible(true); }}>
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit' : 'New'} Announcement</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtnIcon}>
                <Ionicons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <Text style={styles.label}>Title</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Subject of announcement" 
                value={title} 
                onChangeText={setTitle} 
              />

              <Text style={styles.label}>Content</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                placeholder="Write your message here..." 
                multiline 
                numberOfLines={4} 
                value={content} 
                onChangeText={setContent} 
              />

              <Text style={styles.label}>Audience</Text>
              <View style={styles.audienceGrid}>
                {AUDIENCES.map(aud => (
                  <TouchableOpacity 
                    key={aud.value} 
                    style={[styles.choiceBtn, audience === aud.value && styles.activeChoice]}
                    onPress={() => setAudience(aud.value)}
                  >
                    <Text style={[styles.choiceText, audience === aud.value && styles.activeChoiceText]}>
                      {aud.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {audience === 'class' && (
                <>
                  <Text style={styles.label}>Select Classes</Text>
                  <View style={styles.audienceGrid}>
                    {classes.map(cls => (
                      <TouchableOpacity 
                        key={cls.id} 
                        style={[
                          styles.choiceBtn, 
                          selectedClasses.includes(cls.id) && styles.activeChoice
                        ]}
                        onPress={() => {
                          if (selectedClasses.includes(cls.id)) {
                            setSelectedClasses(selectedClasses.filter(id => id !== cls.id));
                          } else {
                            setSelectedClasses([...selectedClasses, cls.id]);
                          }
                        }}
                      >
                        <Text style={[
                          styles.choiceText, 
                          selectedClasses.includes(cls.id) && styles.activeChoiceText
                        ]}>
                          {cls.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.label}>Priority</Text>
              <View style={styles.audienceGrid}>
                {PRIORITIES.map(p => (
                  <TouchableOpacity 
                    key={p} 
                    style={[styles.choiceBtn, priority === p && styles.activeChoice]}
                    onPress={() => setPriority(p)}
                  >
                    <Text style={[styles.choiceText, priority === p && styles.activeChoiceText]}>
                      {p.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
                <Text style={styles.submitBtnText}>Publish Announcement</Text>
              </TouchableOpacity>
            </ScrollView>
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
  tabBar: { 
    flexDirection: 'row', 
    paddingHorizontal: 20, 
    marginBottom: 10,
    gap: 12 
  },
  tab: { 
    paddingVertical: 10, 
    paddingHorizontal: 18, 
    borderRadius: 20, 
    backgroundColor: '#f1f5f9' 
  },
  activeTab: { backgroundColor: '#3B3D6B' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  activeTabText: { color: '#FFFFFF' },
  listContent: { padding: 20, paddingBottom: 120 },
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    padding: 20, 
    marginBottom: 20, 
    shadowColor: '#3B3D6B', 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.06, 
    shadowRadius: 20, 
    elevation: 5 
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  priorityText: { fontSize: 11, fontWeight: '800' },
  dateBadge: { width: 54, height: 54, borderRadius: 16, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  dbMonth: { fontSize: 11, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  dbDay: { fontSize: 18, fontWeight: '800', color: '#3B3D6B' },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 8, lineHeight: 24 },
  cardContent: { fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 16 },
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    borderTopWidth: 1, 
    borderTopColor: '#f1f5f9', 
    paddingTop: 16 
  },
  audienceContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  audienceText: { fontSize: 13, color: '#64748b', fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 16 },
  iconBtn: { padding: 4 },
  authorBar: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  authorText: { fontSize: 13, fontWeight: '700', color: '#3B3D6B' },
  rejectionNote: { fontSize: 12, color: '#EF4444', marginTop: 6, fontStyle: 'italic', fontWeight: '500' },
  fab: { 
    position: 'absolute', 
    right: 24, 
    bottom: 24, 
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
    elevation: 8 
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: '#FFFFFF', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 24, 
    maxHeight: '90%' 
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  closeBtnIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 10, marginTop: 20 },
  input: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, fontSize: 15, color: '#1e293b', borderWidth: 1, borderColor: '#f1f5f9' },
  textArea: { textAlignVertical: 'top', minHeight: 120 },
  audienceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  choiceBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  activeChoice: { backgroundColor: '#3B3D6B', borderColor: '#3B3D6B' },
  choiceText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  activeChoiceText: { color: '#FFFFFF' },
  submitBtn: { backgroundColor: '#3B3D6B', padding: 18, borderRadius: 16, marginTop: 40, alignItems: 'center', shadowColor: '#3B3D6B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, color: '#94a3b8', fontSize: 16, fontWeight: '600' },
});
