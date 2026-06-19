import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Animated, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface ComingSoonProps {
  title: string;
  description: string;
  images: any[];
  featureName: string;
}

const randomTexts = [
  "We're crafting something legendary for you.",
  "The future of education is just around the corner.",
  "Engineering the next-gen experience. Stay tuned!",
  "Our team is busy building your new favorite feature.",
  "Innovation takes time. We're almost there!",
  "Preparing a world-class module just for our campus."
];

export default function ComingSoonScreen({ title, description, images, featureName }: ComingSoonProps) {
  const [currentImage, setCurrentImage] = useState(images[0]);
  const [currentText, setCurrentText] = useState(randomTexts[0]);
  const router = useRouter();
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];

  useEffect(() => {
    // Randomize image and text on mount
    const randomImg = images[Math.floor(Math.random() * images.length)];
    const randomTxt = randomTexts[Math.floor(Math.random() * randomTexts.length)];
    setCurrentImage(randomImg);
    setCurrentText(randomTxt);

    // Animation sequence
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.imageContainer}>
          <Image source={currentImage} style={styles.image} resizeMode="cover" />
          <View style={styles.overlay} />
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.textContainer}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>COMING SOON</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          
          <View style={styles.infoBox}>
            <Ionicons name="sparkles" size={20} color="#F59E0B" />
            <Text style={styles.infoText}>{currentText}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Part of CraxNet 2024 Roadmap</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1d2e', justifyContent: 'center', alignItems: 'center' },
  content: { width: '100%', height: '100%', alignItems: 'center' },
  imageContainer: { width: '100%', height: '55%', position: 'relative' },
  image: { width: '100%', height: '100%' },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 40 : 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  overlay: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    height: '40%', 
    backgroundColor: '#1a1d2e',
    // In actual app, we'd use LinearGradient here
  },
  textContainer: { 
    padding: 30, 
    alignItems: 'center', 
    marginTop: -40,
    backgroundColor: '#1a1d2e',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    flex: 1,
    width: '100%'
  },
  badge: { 
    backgroundColor: '#3B82F6', 
    paddingHorizontal: 12, 
    paddingVertical: 4, 
    borderRadius: 8, 
    marginBottom: 15 
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 15 },
  description: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  infoBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    padding: 15, 
    borderRadius: 15, 
    marginTop: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  infoText: { color: '#fff', fontSize: 13, marginLeft: 10, fontWeight: '600', fontStyle: 'italic' },
  footer: { position: 'absolute', bottom: Platform.OS === 'ios' ? 40 : 20 },
  footerText: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }
});
