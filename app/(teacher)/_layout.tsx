import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image, Platform } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { supabase } from '../../lib/supabase';
import { useRouter, usePathname, useNavigation } from 'expo-router';
import CraxLogoSvg from '../../components/CraxLogoSvg';

function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  const isDashboard = pathname === '/' || pathname === '/index' || pathname === '/(teacher)' || pathname === '/(teacher)/index';
  const isAcademics = pathname === '/documents' || pathname === '/(teacher)/documents';
  const isAnnouncements = pathname === '/announcements' || pathname === '/(teacher)/announcements';
  const isSchedule = pathname === '/timetable' || pathname === '/(teacher)/timetable';
  const isChat = pathname.startsWith('/chat') || pathname.startsWith('/(teacher)/chat');

  return (
    <View style={styles.bottomTabBar}>
      <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/(teacher)')}>
         <View style={isDashboard ? styles.tabIconActiveBg : null}>
            <Ionicons name="grid" size={isDashboard ? 20 : 24} color={isDashboard ? "#3B3D6B" : "#64748b"} />
         </View>
         <Text style={isDashboard ? styles.tabTextActive : styles.tabText}>Dashboard</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/(teacher)/documents')}>
         <View style={isAcademics ? styles.tabIconActiveBg : null}>
            <Ionicons name="library-outline" size={isAcademics ? 20 : 24} color={isAcademics ? "#3B3D6B" : "#64748b"} />
         </View>
         <Text style={isAcademics ? styles.tabTextActive : styles.tabText}>Academics</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/(teacher)/announcements')}>
         <View style={isAnnouncements ? styles.tabIconActiveBg : null}>
            <Ionicons name="megaphone-outline" size={isAnnouncements ? 20 : 24} color={isAnnouncements ? "#3B3D6B" : "#64748b"} />
         </View>
         <Text style={isAnnouncements ? styles.tabTextActive : styles.tabText}>Announcements</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/(teacher)/timetable')}>
         <View style={isSchedule ? styles.tabIconActiveBg : null}>
            <Ionicons name="calendar-outline" size={isSchedule ? 20 : 24} color={isSchedule ? "#3B3D6B" : "#64748b"} />
         </View>
         <Text style={isSchedule ? styles.tabTextActive : styles.tabText}>Schedule</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/(teacher)/chat/index')}>
         <View style={isChat ? styles.tabIconActiveBg : null}>
            <Ionicons name="chatbubbles-outline" size={isChat ? 20 : 24} color={isChat ? "#3B3D6B" : "#64748b"} />
         </View>
         <Text style={isChat ? styles.tabTextActive : styles.tabText}>Chat</Text>
      </TouchableOpacity>
    </View>
  );
}

function CustomDrawerContent(props: any) {
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

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView {...props}>
        <View style={styles.drawerHeader}>
          <View style={styles.logoCircle}>
            <CraxLogoSvg width={30} height={30} color="#FFFFFF" />
          </View>
          <Text style={styles.drawerTitle}>Teacher Portal</Text>
        </View>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
      <TouchableOpacity style={styles.logoutItem} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#F44336" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

import { useRoleGuard } from '../../hooks/use-role-guard';
import { ActivityIndicator } from 'react-native';

export default function TeacherLayout() {
  const { isAuthorized } = useRoleGuard('teacher');

  if (isAuthorized === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#1a1d2e" />
      </View>
    );
  }

  if (isAuthorized === false) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerActiveTintColor: '#1a1d2e',
          drawerInactiveTintColor: '#8E8E93',
          drawerActiveBackgroundColor: '#f0f0f5',
          drawerStyle: {
            backgroundColor: '#FFFFFF',
            width: 280,
          },
          drawerLabelStyle: {
            fontSize: 15,
            fontWeight: '700',
            marginLeft: -10,
          },
        }}
      >
        <Drawer.Screen
          name="index"
          options={{
            drawerLabel: 'Dashboard',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="home" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="timetable"
          options={{
            drawerLabel: 'My Schedule',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="calendar" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="attendance"
          options={{
            drawerLabel: 'Attendance',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="calendar" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="marks"
          options={{
            drawerLabel: 'Marks & Exams',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="trophy" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="documents"
          options={{
            drawerLabel: 'My Documents',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="folder" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="records"
          options={{
            drawerLabel: 'Personal Records',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="shield-checkmark" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="announcements"
          options={{
            drawerLabel: 'Announcements',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="megaphone" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="assignments"
          options={{
            drawerLabel: 'Assignments',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="clipboard" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="chat/index"
          options={{
            drawerLabel: 'Student Chats',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="chatbubbles" size={22} color={color} />
            ),
          }}
        />

        <Drawer.Screen
          name="gps"
          options={{
            drawerLabel: 'Bus Tracking',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="bus" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="chat/[id]"
          options={{
            drawerItemStyle: { display: 'none' },
            headerShown: false,
          }}
        />

      </Drawer>
      <BottomTabBar />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    padding: 20,
    paddingTop: 30,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f5',
    marginBottom: 10,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#1a1d2e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1d2e',
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f5',
    gap: 15,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F44336',
  },
  bottomTabBar: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 25 : 12,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIconActiveBg: { backgroundColor: '#e0e7ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginBottom: 4 },
  tabTextActive: { fontSize: 10, fontWeight: '700', color: '#3B3D6B' },
  tabText: { fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: '500' }
});
