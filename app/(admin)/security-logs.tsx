import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function SecurityLogsScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('security_logs')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Error loading security logs:", err);
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

  const getSeverityColor = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return '#DC2626'; // Red
      case 'HIGH': return '#EA580C'; // Orange
      case 'MEDIUM': return '#D97706'; // Amber
      case 'LOW': return '#2563EB'; // Blue
      default: return '#6B7280'; // Gray
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const color = getSeverityColor(item.severity);
    return (
      <View style={[styles.logCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name="shield-alert" size={20} color={color} />
        </View>
        <View style={styles.logInfo}>
          <View style={styles.logHeader}>
            <Text style={[styles.actionText, { color }]}>{item.event_type.replace(/_/g, ' ')}</Text>
            <Text style={styles.timeText}>{new Date(item.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</Text>
          </View>
          <Text style={styles.detailsText}>{item.details}</Text>
          <View style={styles.metaRow}>
            {item.user_id && <Text style={styles.deviceText}>User: {item.user_id.substring(0, 8)}...</Text>}
            {item.ip_address && <Text style={styles.deviceText}>IP: {item.ip_address}</Text>}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Red/Dark Header for Security */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Security Audit Logs</Text>
            <Text style={styles.headerSub}>Monitor advanced threats & blocked actions</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
        </View>
      ) : (
        <FlatList
          data={logs}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#DC2626']} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-checkmark" size={60} color="#10B981" />
              <Text style={styles.emptyText}>No security threats detected.</Text>
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
    backgroundColor: '#1E293B', 
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
  actionText: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  timeText: { fontSize: 11, color: '#ADB5BD', fontWeight: '600' },
  detailsText: { fontSize: 12, color: '#4B5563', marginBottom: 8, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  deviceText: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 12, color: '#6B7280', fontWeight: '600', fontSize: 16 },
});
