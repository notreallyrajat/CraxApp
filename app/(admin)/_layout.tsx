import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

function CustomAdminDrawer(props: any) {
  const router = useRouter();
  
  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => {
        await supabase.auth.signOut();
        router.replace('/login');
      }}
    ]);
  };

  const categories = [
    { label: 'OVERVIEW', items: ['index', 'account'] },
    { label: 'ACADEMIC', items: ['classes', 'students', 'teachers', 'attendance', 'exams/index'] },
    { label: 'INSTITUTIONAL', items: ['records/index', 'resources/index', 'notifications'] },
    { label: 'ANALYTICS', items: ['student-analytics', 'chat-logs'] },
    { label: 'FUTURE READY', items: ['gps', 'allotment', 'fees'] },
  ];

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView {...props}>
        <View style={styles.drawerHeader}>
          <View style={styles.logoCircle}>
            <Ionicons name="school" size={30} color="#fff" />
          </View>
          <View>
            <Text style={styles.drawerTitle}>CraxNet</Text>
            <Text style={styles.drawerSub}>Admin Command Center</Text>
          </View>
        </View>

        {categories.map((cat, idx) => (
          <View key={cat.label} style={styles.categoryContainer}>
            <Text style={styles.categoryLabel}>{cat.label}</Text>
            {props.state.routes.filter((route: any) => cat.items.includes(route.name)).map((route: any) => {
              const focused = props.state.index === props.state.routes.findIndex((r: any) => r.name === route.name);
              const { options } = props.descriptors[route.key];
              
              return (
                <TouchableOpacity
                  key={route.key}
                  onPress={() => props.navigation.navigate(route.name)}
                  style={[styles.drawerItem, focused && styles.activeItem]}
                >
                  <View style={styles.iconContainer}>
                    {options.drawerIcon && options.drawerIcon({ color: focused ? '#0047AB' : '#8E8E93', size: 20 })}
                  </View>
                  <Text style={[styles.itemLabel, focused && styles.activeLabel]}>
                    {options.drawerLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </DrawerContentScrollView>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#EF4444" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

import { useRoleGuard } from '../../hooks/use-role-guard';
import { ActivityIndicator } from 'react-native';

export default function AdminLayout() {
  const { isAuthorized } = useRoleGuard('admin');

  if (isAuthorized === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#0047AB" />
      </View>
    );
  }

  if (isAuthorized === false) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <CustomAdminDrawer {...props} />}
        screenOptions={{
          headerShown: false,
          drawerStyle: {
            backgroundColor: '#FFFFFF',
            width: 270,
          },
        }}
      >
        <Drawer.Screen name="index" options={{ drawerLabel: 'Dashboard', drawerIcon: (p) => <Ionicons name="grid-outline" {...p} /> }} />
        <Drawer.Screen name="account" options={{ drawerLabel: 'My Profile', drawerIcon: (p) => <Ionicons name="person-outline" {...p} /> }} />
        <Drawer.Screen name="classes" options={{ drawerLabel: 'Classes', drawerIcon: (p) => <Ionicons name="book-outline" {...p} /> }} />
        <Drawer.Screen name="students" options={{ drawerLabel: 'Students', drawerIcon: (p) => <Ionicons name="people-outline" {...p} /> }} />
        <Drawer.Screen name="teachers" options={{ drawerLabel: 'Teachers', drawerIcon: (p) => <Ionicons name="school-outline" {...p} /> }} />
        <Drawer.Screen name="attendance" options={{ drawerLabel: 'Attendance', drawerIcon: (p) => <Ionicons name="calendar-outline" {...p} /> }} />
        <Drawer.Screen name="exams/index" options={{ drawerLabel: 'Exams', drawerIcon: (p) => <Ionicons name="trophy-outline" {...p} /> }} />
        <Drawer.Screen name="resources/index" options={{ drawerLabel: 'Resources', drawerIcon: (p) => <Ionicons name="folder-outline" {...p} /> }} />
        <Drawer.Screen name="notifications" options={{ drawerLabel: 'Announcements', drawerIcon: (p) => <Ionicons name="megaphone-outline" {...p} /> }} />
        <Drawer.Screen name="records/index" options={{ drawerLabel: 'Digital Directory', drawerIcon: (p) => <Ionicons name="folder-open-outline" {...p} /> }} />
        <Drawer.Screen name="student-analytics" options={{ drawerLabel: 'Performance Stats', drawerIcon: (p) => <Ionicons name="bar-chart-outline" {...p} /> }} />
        <Drawer.Screen name="chat-logs" options={{ drawerLabel: 'Comm Logs', drawerIcon: (p) => <Ionicons name="chatbubble-ellipses-outline" {...p} /> }} />
        <Drawer.Screen name="gps" options={{ drawerLabel: 'Bus GPS', drawerIcon: (p) => <Ionicons name="navigate-outline" {...p} /> }} />
        <Drawer.Screen name="allotment" options={{ drawerLabel: 'AI Allotment', drawerIcon: (p) => <Ionicons name="sparkles-outline" {...p} /> }} />
        <Drawer.Screen name="fees" options={{ drawerLabel: 'Fee Gateway', drawerIcon: (p) => <Ionicons name="card-outline" {...p} /> }} />

        {/* Hidden Technical Routes */}
        <Drawer.Screen name="logs" options={{ drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="timetable-generator" options={{ drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="timetables" options={{ drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="records/[id]" options={{ drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="student-analytics/[id]" options={{ drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="exams/[id]" options={{ drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="resources/[id]" options={{ drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="[module]" options={{ drawerItemStyle: { display: 'none' } }} />
      </Drawer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    padding: 20,
    paddingTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 10,
  },
  logoCircle: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#1a1d2e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  drawerTitle: { fontSize: 20, fontWeight: '800', color: '#1a1d2e' },
  drawerSub: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  categoryContainer: { marginTop: 15, paddingHorizontal: 15 },
  categoryLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', marginLeft: 15, marginBottom: 8, letterSpacing: 1 },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 2,
  },
  activeItem: { backgroundColor: '#F0F7FF' },
  iconContainer: { width: 30, alignItems: 'center', marginRight: 12 },
  itemLabel: { fontSize: 13.5, fontWeight: '600', color: '#64748B' },
  activeLabel: { color: '#0047AB', fontWeight: '700' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: Platform.OS === 'ios' ? 20 : 0
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: '#EF4444', marginLeft: 15 }
});
