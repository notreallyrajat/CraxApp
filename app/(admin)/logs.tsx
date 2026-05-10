import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getActivityLogs } from '../../lib/services/logger';

export default function ActivityLogsScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadLogs = async () => {
    try {
      const { data, error } = await getActivityLogs();
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Error loading logs:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadLogs();
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'login': return { name: 'log-in', color: '#4CAF50' };
      case 'view_dashboard': return { name: 'apps', color: '#2196F3' };
      default: return { name: 'information-circle', color: '#607D8B' };
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const icon = getActionIcon(item.action);
    return (
      <View style={styles.logCard}>
        <View style={[styles.iconContainer, { backgroundColor: icon.color + '20' }]}>
          <Ionicons name={icon.name as any} size={20} color={icon.color} />
        </View>
        <View style={styles.logInfo}>
          <View style={styles.logHeader}>
            <Text style={styles.userName}>{item.full_name}</Text>
            <Text style={styles.timeText}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          <Text style={styles.actionText}>{item.action.replace('_', ' ').toUpperCase()}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.roleTag}>{item.user_role}</Text>
            <Text style={styles.deviceText}>{item.os_type || 'Unknown'}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Royal Blue Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Activity Logs</Text>
            <Text style={styles.headerSub}>Monitor school app usage</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0047AB" />
        </View>
      ) : (
        <FlatList
          data={logs}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0047AB']} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={60} color="#D1D5DB" />
              <Text style={styles.emptyText}>No logs found.</Text>
            </View>
          }
        />
      )}
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
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  listContent: { padding: 20 },
  logCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  logInfo: { flex: 1 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  userName: { fontSize: 16, fontWeight: '700', color: '#212529' },
  timeText: { fontSize: 12, color: '#ADB5BD', fontWeight: '600' },
  actionText: { fontSize: 11, fontWeight: '800', color: '#6C757D', marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roleTag: { 
    fontSize: 10, 
    fontWeight: '800', 
    color: '#0047AB', 
    backgroundColor: '#E8F0FE', 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    borderRadius: 4,
    textTransform: 'uppercase'
  },
  deviceText: { fontSize: 11, color: '#ADB5BD', fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 12, color: '#8E8E93', fontWeight: '600' },
});
