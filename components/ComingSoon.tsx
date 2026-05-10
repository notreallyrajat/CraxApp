import React from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';

interface ComingSoonProps {
  title: string;
}

export default function ComingSoon({ title }: ComingSoonProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image 
          source={require('../assets/coming-soon.png')} 
          style={styles.image}
          resizeMode="contain"
        />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          This feature is currently under development to ensure a seamless and intelligent experience. 
          Stay tuned for updates!
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>COMING SOON</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  image: {
    width: '100%',
    height: 300,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1d2e',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
    marginBottom: 30,
  },
  badge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1a1d2e',
    letterSpacing: 2,
  },
});
