import React from 'react';
import { View, Text, StyleSheet, Image, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from 'expo-router';

export default function RecordsPlaceholderScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={{ marginRight: 16 }}>
            <Ionicons name="menu" size={32} color="#1e293b" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>My Records</Text>
          </View>
        </View>
      </View>

      {/* Placeholder Content */}
      <View style={styles.content}>
        <Image 
          source={require('../../assets/images/coming_soon_timetable_illustration_1778417631874.png')} 
          style={styles.image}
          resizeMode="contain"
        />
        <Text style={styles.title}>Coming Soon</Text>
        <Text style={styles.subtitle}>Features in progress. We are actively building this module to bring you a seamless digital records experience.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FE' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingBottom: 20 
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#1e293b', 
    letterSpacing: -0.5 
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: -80, // slightly lift it up to feel perfectly centered
  },
  image: {
    width: 250,
    height: 250,
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  }
});
