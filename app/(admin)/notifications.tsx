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
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
      case 'urgent': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'normal': return '#0047AB';
      case 'low': return '#6c757d';
      default: return '#0047AB';
    }
  };

  const renderItem = ({ item }: { item: Announcement }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
          <Text style={styles.priorityText}>{item.priority.toUpperCase()}</Text>
        </View>
        <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>

      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardContent} numberOfLines={3}>{item.content}</Text>

      <View style={styles.cardFooter}>
        <View style={styles.audienceContainer}>
          <Ionicons name="people" size={14} color="#8E8E93" />
          <Text style={styles.audienceText}>{item.audience.charAt(0).toUpperCase() + item.audience.slice(1)}</Text>
        </View>

        <View style={styles.actions}>
          {item.status === 'pending' ? (
            <>
              <TouchableOpacity onPress={() => handleApprove(item.id)} style={styles.iconBtn}>
                <Ionicons name="checkmark-circle" size={24} color="#28a745" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleReject(item.id)} style={styles.iconBtn}>
                <Ionicons name="close-circle" size={24} color="#dc3545" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
                <Ionicons name="create-outline" size={22} color="#0047AB" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={22} color="#dc3545" />
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
        <Text style={styles.headerTitle}>Announcements</Text>
        <Text style={styles.headerSub}>Manage school broadcasts</Text>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0047AB']} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="megaphone-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No announcements found.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => { resetForm(); setModalVisible(true); }}>
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit' : 'New'} Announcement</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1a1d2e" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
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
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { 
    backgroundColor: '#0047AB', 
    paddingTop: 60, 
    paddingBottom: 20, 
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 4
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  tabBar: { 
    flexDirection: 'row', 
    paddingHorizontal: 20, 
    marginTop: 20, 
    marginBottom: 10,
    gap: 10 
  },
  tab: { 
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    borderRadius: 20, 
    backgroundColor: '#E9ECEF' 
  },
  activeTab: { backgroundColor: '#0047AB' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#6C757D' },
  activeTabText: { color: '#FFFFFF' },
  listContent: { padding: 20, paddingBottom: 100 },
  card: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 16, 
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  priorityText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },
  dateText: { fontSize: 12, color: '#ADB5BD', fontWeight: '600' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#212529', marginBottom: 8 },
  cardContent: { fontSize: 14, color: '#495057', lineHeight: 20, marginBottom: 16 },
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    borderTopWidth: 1, 
    borderTopColor: '#F8F9FA', 
    paddingTop: 12 
  },
  audienceContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  audienceText: { fontSize: 12, color: '#8E8E93', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 4 },
  authorBar: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F8F9FA' },
  authorText: { fontSize: 11, fontWeight: '700', color: '#0047AB' },
  rejectionNote: { fontSize: 11, color: '#dc3545', marginTop: 4, fontStyle: 'italic' },
  fab: { 
    position: 'absolute', 
    right: 20, 
    bottom: 20, 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: '#0047AB', 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 6 
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: '#FFFFFF', 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    padding: 24, 
    maxHeight: '90%' 
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1a1d2e' },
  label: { fontSize: 14, fontWeight: '700', color: '#495057', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 12, fontSize: 15, color: '#212529' },
  textArea: { textAlignVertical: 'top', minHeight: 100 },
  audienceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E9ECEF' },
  activeChoice: { backgroundColor: '#0047AB', borderColor: '#0047AB' },
  choiceText: { fontSize: 13, fontWeight: '600', color: '#6C757D' },
  activeChoiceText: { color: '#FFFFFF' },
  submitBtn: { backgroundColor: '#0047AB', padding: 16, borderRadius: 15, marginTop: 32, alignItems: 'center' },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, color: '#ADB5BD', fontSize: 16, fontWeight: '600' },
});
