import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  Platform,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAllUserRecords } from '../../../lib/services/documents';

export default function DigitalDirectoryScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'teacher' | 'student'>('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data } = await getAllUserRecords();
    setUsers(data || []);
    setLoading(false);
    setRefreshing(false);
  }

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredUsers = users.filter(user => {
    const role = user.user_roles?.[0]?.role;
    const matchesFilter = filter === 'all' || role === filter;
    const matchesSearch = user.full_name?.toLowerCase().includes(search.toLowerCase()) || 
                          user.email?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Digital Directory</Text>
        <Text style={styles.headerSub}>Manage teacher & student e-records</Text>
        
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.tabs}>
          {['all', 'teacher', 'student'].map((t) => (
            <TouchableOpacity 
              key={t}
              style={[styles.tab, filter === t && styles.tabActive]}
              onPress={() => setFilter(t as any)}
            >
              <Text style={[styles.tabText, filter === t && styles.tabTextActive]}>
                {t.toUpperCase()}S
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a1d2e']} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#1a1d2e" style={{ marginTop: 50 }} />
        ) : filteredUsers.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="documents-outline" size={60} color="#CBD5E1" />
            <Text style={styles.emptyText}>No records found.</Text>
          </View>
        ) : (
          filteredUsers.map(user => (
            <TouchableOpacity 
              key={user.id} 
              style={styles.userCard}
              onPress={() => router.push(`/(admin)/records/${user.id}`)}
            >
              <View style={styles.userAvatar}>
                <Text style={styles.avatarText}>{user.full_name?.charAt(0)}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.full_name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{user.user_roles?.[0]?.role?.toUpperCase()}</Text>
                </View>
              </View>
              <View style={styles.stats}>
                <Text style={styles.statsCount}>{user.user_documents?.length || 0}</Text>
                <Text style={styles.statsLabel}>DOCS</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>
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
    paddingBottom: 20, 
    paddingHorizontal: 20 
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: 20 },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 12, 
    paddingHorizontal: 15, 
    height: 45,
    marginBottom: 20
  },
  searchInput: { flex: 1, marginLeft: 10, color: '#fff', fontSize: 14 },
  tabs: { flexDirection: 'row' },
  tab: { marginRight: 15, paddingBottom: 8 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#fff' },
  tabText: { color: 'rgba(255,255,255,0.5)', fontWeight: '700', fontSize: 11, letterSpacing: 1 },
  tabTextActive: { color: '#fff' },
  content: { flex: 1, padding: 15 },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#94A3B8', marginTop: 15, fontSize: 16, fontWeight: '600' },
  userCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 15, 
    marginBottom: 12, 
    flexDirection: 'row', 
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5
  },
  userAvatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#F1F5F9', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 15
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#1a1d2e' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '700', color: '#1a1d2e' },
  userEmail: { fontSize: 12, color: '#64748b', marginTop: 2 },
  roleBadge: { 
    alignSelf: 'flex-start', 
    backgroundColor: '#F1F5F9', 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    borderRadius: 6, 
    marginTop: 6 
  },
  roleText: { fontSize: 9, fontWeight: '800', color: '#64748b' },
  stats: { alignItems: 'center', marginRight: 15, paddingLeft: 15, borderLeftWidth: 1, borderLeftColor: '#F1F5F9' },
  statsCount: { fontSize: 18, fontWeight: '800', color: '#1a1d2e' },
  statsLabel: { fontSize: 8, fontWeight: '800', color: '#94A3B8' }
});
