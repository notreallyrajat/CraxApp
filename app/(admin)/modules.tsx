import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ModulesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modules</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1a1d2e' },
});
