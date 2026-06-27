import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

type ErrorType = 'network' | 'database' | 'unknown';

interface ErrorPlaceholderProps {
  type: ErrorType;
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export default function ErrorPlaceholderScreen({ type, title, description, onRetry }: ErrorPlaceholderProps) {
  const router = useRouter();
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];

  useEffect(() => {
    // Animation sequence
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const getErrorConfig = () => {
    switch (type) {
      case 'network':
        return {
          icon: 'wifi-outline' as const,
          defaultTitle: 'No Internet Connection',
          defaultDesc: 'It looks like you are offline. Please check your internet connection and try again.',
          badge: 'NETWORK ERROR',
          color: '#EF4444' // Red
        };
      case 'database':
        return {
          icon: 'server-outline' as const,
          defaultTitle: 'Database Connection Lost',
          defaultDesc: 'We are having trouble connecting to our servers. Our team has been notified.',
          badge: 'SYSTEM ERROR',
          color: '#F59E0B' // Orange/Yellow
        };
      default:
        return {
          icon: 'alert-circle-outline' as const,
          defaultTitle: 'Something Went Wrong',
          defaultDesc: 'An unexpected error occurred. Please try again later.',
          badge: 'ERROR',
          color: '#3B82F6' // Blue
        };
    }
  };

  const config = getErrorConfig();

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        
        {/* Back Button (if navigation is possible) */}
        <TouchableOpacity style={styles.backBtn} onPress={() => {
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace('/');
            }
        }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Icon Container */}
        <View style={styles.iconContainer}>
          <View style={[styles.iconGlow, { backgroundColor: config.color }]} />
          <View style={[styles.iconCircle, { borderColor: config.color }]}>
             <Ionicons name={config.icon} size={64} color={config.color} />
          </View>
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <View style={[styles.badge, { backgroundColor: config.color }]}>
            <Text style={styles.badgeText}>{config.badge}</Text>
          </View>
          
          <Text style={styles.title}>{title || config.defaultTitle}</Text>
          <Text style={styles.description}>{description || config.defaultDesc}</Text>
          
          {onRetry && (
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: config.color }]} 
              onPress={onRetry}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={20} color="#fff" style={styles.retryIcon} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          )}

          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark" size={20} color="#10B981" />
            <Text style={styles.infoText}>Your data is safe. We will restore service shortly.</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>CraxNet Systems • System Status</Text>
        </View>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1d2e', justifyContent: 'center', alignItems: 'center' },
  content: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 40 : 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    position: 'relative'
  },
  iconGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.15,
    transform: [{ scale: 1.5 }],
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  textContainer: { 
    padding: 30, 
    alignItems: 'center', 
    width: '100%'
  },
  badge: { 
    paddingHorizontal: 12, 
    paddingVertical: 4, 
    borderRadius: 8, 
    marginBottom: 15 
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 15 },
  description: { fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginTop: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  infoBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    padding: 15, 
    borderRadius: 15, 
    marginTop: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  infoText: { color: '#fff', fontSize: 13, marginLeft: 10, fontWeight: '600', fontStyle: 'italic' },
  footer: { position: 'absolute', bottom: Platform.OS === 'ios' ? 40 : 20 },
  footerText: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }
});
