import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchGenerationInputs, saveTimetable, regenerateForClass, DBTimetableEntry } from '../../../lib/services/timetableRepository';
import { TimetableResult, TimetableInput } from '../../../lib/services/timetableEngine';
import { supabase } from '../../../lib/supabase';

export default function TimetableGenerateScreen() {
  const router = useRouter();
  const { classId } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<TimetableResult | null>(null);
  const [inputs, setInputs] = useState<TimetableInput | null>(null);

  useEffect(() => {
    if (classId) {
      runGeneration(classId as string);
    }
  }, [classId]);

  const runGeneration = async (id: string) => {
    setLoading(true);
    try {
      // Fetch data and treat other classes as constraints
      const data = await regenerateForClass(id);
      setInputs(data);
      
      // Run generation entirely on the device CPU
      const { TimetableEngine } = require('../../../lib/services/timetableEngine');
      const engine = new TimetableEngine(data);
      const resData = await engine.generate();

      setResult(resData);
    } catch (e: any) {
      Alert.alert('Generation Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result || !inputs) return;
    setSaving(true);
    try {
      // Convert to DB Format
      const dbEntries: DBTimetableEntry[] = result.timetable.map(t => {
        const dayIdx = inputs.settings.daysOfWeek.indexOf(t.day);
        return {
          class_id: t.class_id,
          section_id: t.section_id,
          subject_id: t.subject_id,
          teacher_id: t.teacher_id,
          room_id: t.room_id,
          day_of_week: dayIdx !== -1 ? dayIdx : 0,
          period_number: t.period
        };
      });

      await saveTimetable(classId as string, dbEntries);
      router.replace({ pathname: '/(admin)/allotment/view', params: { classId } });
    } catch (e: any) {
      Alert.alert('Save Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0047AB" />
        <Text style={styles.loadingText}>Synthesizing optimal timetable...</Text>
        <Text style={styles.loadingSub}>Analyzing billions of combinations.</Text>
      </View>
    );
  }

  if (!result || !inputs) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Failed to generate timetable.</Text>
      </View>
    );
  }

  const { daysOfWeek, periodsPerDay } = inputs.settings;
  const periods = Array.from({ length: periodsPerDay }, (_, i) => i + 1);

  // Helper to map IDs to Names for the grid
  const getSubjectName = (id: string) => inputs.subjects.find(s => s.id === id)?.name || id;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Timetable</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Alerts for Relaxations / Unplaced */}
        {result.relaxationLevel && result.relaxationLevel > 0 && (
          <View style={[styles.alertBox, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
            <Ionicons name="warning" size={20} color="#D97706" />
            <Text style={[styles.alertText, { color: '#B45309' }]}>
              {result.reason}
            </Text>
          </View>
        )}

        {result.unplacedLessons.length > 0 && (
          <View style={[styles.alertBox, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.alertText, { color: '#991B1B', fontWeight: '800' }]}>
                {result.unplacedLessons.length} unplaced lessons.
              </Text>
              <Text style={{ fontSize: 12, color: '#991B1B', marginTop: 4 }}>
                The algorithm could not place these due to impossible constraints. You can map them manually later.
              </Text>
            </View>
          </View>
        )}

        {/* The Grid View */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gridWrapper}>
          <View>
            <View style={styles.gridRow}>
              <View style={[styles.gridCell, styles.gridHeaderCell]}><Text style={styles.headerText}>Day / Per.</Text></View>
              {periods.map(p => (
                <View key={`hp-${p}`} style={[styles.gridCell, styles.gridHeaderCell]}>
                  <Text style={styles.headerText}>P{p}</Text>
                </View>
              ))}
            </View>

            {daysOfWeek.map(day => (
              <View key={day} style={styles.gridRow}>
                <View style={[styles.gridCell, styles.gridHeaderCell]}>
                  <Text style={styles.headerText}>{day.substring(0, 3)}</Text>
                </View>
                {periods.map(p => {
                  const entry = result.timetable.find(t => t.day === day && t.period === p);
                  return (
                    <View key={`${day}-${p}`} style={[styles.gridCell, entry ? styles.filledCell : {}]}>
                      {entry ? (
                        <Text style={styles.cellText} numberOfLines={2}>
                          {getSubjectName(entry.subject_id)}
                        </Text>
                      ) : (
                        <Text style={styles.emptyCellText}>-</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Confirm & Save</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  header: { backgroundColor: '#0047AB', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F6F8' },
  loadingText: { marginTop: 24, fontSize: 18, fontWeight: '800', color: '#1C1C1E' },
  loadingSub: { marginTop: 8, fontSize: 14, color: '#8E8E93' },
  content: { padding: 16 },
  alertBox: { flexDirection: 'row', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16, alignItems: 'flex-start' },
  alertText: { fontSize: 14, fontWeight: '600', marginLeft: 8, flex: 1 },
  gridWrapper: { backgroundColor: '#FFF', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#E5E5EA' },
  gridRow: { flexDirection: 'row' },
  gridCell: { width: 80, height: 60, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#F4F6F8', padding: 4 },
  gridHeaderCell: { backgroundColor: '#F8FAFC' },
  headerText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  filledCell: { backgroundColor: '#E0E7FF' },
  cellText: { fontSize: 11, fontWeight: '600', color: '#3730A3', textAlign: 'center' },
  emptyCellText: { color: '#CBD5E1' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F4F6F8' },
  saveBtn: { backgroundColor: '#0047AB', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' }
});
