import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import CraxLogoSvg from '../../components/CraxLogoSvg';

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
          <Text style={styles.drawerTitle}>Student Portal</Text>
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

export default function StudentLayout() {
  const { isAuthorized } = useRoleGuard('student');

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
            drawerIcon: ({ color }) => (
              <Ionicons name="home" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="attendance"
          options={{
            drawerLabel: 'Attendance',
            drawerIcon: ({ color }) => (
              <Ionicons name="calendar" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="marks"
          options={{
            drawerLabel: 'My Marks',
            drawerIcon: ({ color }) => (
              <Ionicons name="trophy" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="documents"
          options={{
            drawerLabel: 'Resources',
            drawerIcon: ({ color }) => (
              <Ionicons name="library" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="timetable"
          options={{
            drawerLabel: 'Timetable',
            drawerIcon: ({ color }) => (
              <Ionicons name="calendar" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="records"
          options={{
            drawerLabel: 'My Records',
            drawerIcon: ({ color }) => (
              <Ionicons name="folder-open" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="assignments"
          options={{
            drawerLabel: 'Assignments',
            drawerIcon: ({ color }) => (
              <Ionicons name="clipboard" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="chat/index"
          options={{
            drawerLabel: 'Chat with Teachers',
            drawerIcon: ({ color }) => (
              <Ionicons name="chatbubbles" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="gps"
          options={{
            drawerLabel: 'Bus Tracking',
            drawerIcon: ({ color }) => (
              <Ionicons name="bus" size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="fees"
          options={{
            drawerLabel: 'Pay Fees',
            drawerIcon: ({ color }) => (
              <Ionicons name="wallet" size={22} color={color} />
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
});
