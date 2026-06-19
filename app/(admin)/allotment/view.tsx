import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { printToFileAsync } from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { fetchTimetable, swapEntries, fetchGenerationInputs, DBTimetableEntry } from '../../../lib/services/timetableRepository';

export default function TimetableViewScreen() {
  const router = useRouter();
  const { classId } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [swapping, setSwapping] = useState(false);
  const [timetable, setTimetable] = useState<DBTimetableEntry[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [days, setDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [periodsPerDay, setPeriodsPerDay] = useState(8);

  // Swap State
  const [selectedEntryA, setSelectedEntryA] = useState<DBTimetableEntry | null>(null);
  const [selectedEntryB, setSelectedEntryB] = useState<DBTimetableEntry | null>(null);
  const [swapModalVisible, setSwapModalVisible] = useState(false);

  useEffect(() => {
    if (classId) {
      loadData();
    }
  }, [classId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Need subjects & settings to map IDs and draw grid
      const inputs = await fetchGenerationInputs([classId as string]);
      setSubjects(inputs.subjects);
      setDays(inputs.settings.daysOfWeek);
      setPeriodsPerDay(inputs.settings.periodsPerDay);

      const data = await fetchTimetable(classId as string);
      setTimetable(data);
    } catch (e: any) {
      Alert.alert('Error loading timetable', e.message);
    } finally {
      setLoading(false);
    }
  };

  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || id;

  const handleCellTap = (entry: DBTimetableEntry) => {
    if (!selectedEntryA) {
      setSelectedEntryA(entry);
    } else if (selectedEntryA.id === entry.id) {
      setSelectedEntryA(null); // Deselect
    } else {
      setSelectedEntryB(entry);
      setSwapModalVisible(true);
    }
  };

  const confirmSwap = async () => {
    if (!selectedEntryA || !selectedEntryB || !selectedEntryA.id || !selectedEntryB.id) return;
    
    setSwapping(true);
    // Optimistic UI update
    const previousTimetable = [...timetable];
    const newTimetable = timetable.map(t => {
      if (t.id === selectedEntryA.id) {
        return { ...t, day_of_week: selectedEntryB.day_of_week, period_number: selectedEntryB.period_number, room_id: selectedEntryB.room_id };
      }
      if (t.id === selectedEntryB.id) {
        return { ...t, day_of_week: selectedEntryA.day_of_week, period_number: selectedEntryA.period_number, room_id: selectedEntryA.room_id };
      }
      return t;
    });
    setTimetable(newTimetable);
    setSwapModalVisible(false);

    try {
      await swapEntries(selectedEntryA.id, selectedEntryB.id);
      setSelectedEntryA(null);
      setSelectedEntryB(null);
    } catch (e: any) {
      // Rollback
      setTimetable(previousTimetable);
      Alert.alert('Swap Failed', e.message);
      setSelectedEntryA(null);
      setSelectedEntryB(null);
    } finally {
      setSwapping(false);
    }
  };

  const cancelSwap = () => {
    setSwapModalVisible(false);
    setSelectedEntryA(null);
    setSelectedEntryB(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0047AB" />
      </View>
    );
  }

  const periods = Array.from({ length: periodsPerDay }, (_, i) => i + 1);

  const exportToPDF = async () => {
    try {
      setLoading(true);
      let html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; }
              h1 { text-align: center; color: #0047AB; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #E5E5EA; padding: 10px; text-align: center; }
              th { background-color: #F8FAFC; color: #64748B; }
              td { font-weight: 600; color: #1E293B; }
            </style>
          </head>
          <body>
            <h1>Class Timetable</h1>
            <table>
              <tr>
                <th>Day / Per.</th>
                ${periods.map(p => `<th>P${p}</th>`).join('')}
              </tr>
              ${days.map((day, dIdx) => `
                <tr>
                  <th>${day}</th>
                  ${periods.map(p => {
                    const entry = timetable.find(t => t.day_of_week === dIdx && t.period_number === p);
                    return `<td>${entry ? getSubjectName(entry.subject_id) : '-'}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </table>
          </body>
        </html>
      `;

      const { uri } = await printToFileAsync({ html });
      await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error: any) {
      Alert.alert('Export Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(admin)/allotment')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>View Timetable</Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={exportToPDF} style={[styles.backBtn, { marginRight: 16 }]}>
            <Ionicons name="print" size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={loadData} style={styles.backBtn}>
            <Ionicons name="refresh" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.instructions}>
        <Ionicons name="information-circle" size={20} color="#0047AB" />
        <Text style={styles.instText}>
          {selectedEntryA ? "Select a second slot to swap with." : "Tap any two slots to swap them."}
        </Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
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

            {days.map((day, dIdx) => (
              <View key={day} style={styles.gridRow}>
                <View style={[styles.gridCell, styles.gridHeaderCell]}>
                  <Text style={styles.headerText}>{day.substring(0, 3)}</Text>
                </View>
                {periods.map(p => {
                  const entry = timetable.find(t => t.day_of_week === dIdx && t.period_number === p);
                  const isSelected = selectedEntryA?.id === entry?.id;
                  
                  return (
                    <TouchableOpacity 
                      key={`${day}-${p}`} 
                      style={[
                        styles.gridCell, 
                        entry ? styles.filledCell : {},
                        isSelected && styles.selectedCell
                      ]}
                      onPress={() => entry && handleCellTap(entry)}
                      activeOpacity={0.7}
                      disabled={!entry}
                    >
                      {entry ? (
                        <>
                          <Text style={[styles.cellText, isSelected && { color: '#FFF' }]} numberOfLines={2}>
                            {getSubjectName(entry.subject_id)}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.emptyCellText}>-</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>

      {/* Swap Confirmation Modal */}
      <Modal visible={swapModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Swap</Text>
            <Text style={styles.modalText}>
              Swap <Text style={{fontWeight:'bold'}}>{selectedEntryA ? getSubjectName(selectedEntryA.subject_id) : ''}</Text> with <Text style={{fontWeight:'bold'}}>{selectedEntryB ? getSubjectName(selectedEntryB.subject_id) : ''}</Text>?
            </Text>
            <Text style={styles.modalSubText}>This will check for teacher conflicts before saving.</Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={cancelSwap} disabled={swapping}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmSwap} disabled={swapping}>
                {swapping ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmText}>Swap</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  header: { backgroundColor: '#0047AB', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  instructions: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0E7FF', padding: 12, margin: 16, borderRadius: 8 },
  instText: { color: '#3730A3', fontWeight: '600', marginLeft: 8 },
  content: { paddingHorizontal: 16 },
  gridWrapper: { backgroundColor: '#FFF', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#E5E5EA' },
  gridRow: { flexDirection: 'row' },
  gridCell: { width: 80, height: 60, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#F4F6F8', padding: 4 },
  gridHeaderCell: { backgroundColor: '#F8FAFC' },
  headerText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  filledCell: { backgroundColor: '#F1F5F9' },
  selectedCell: { backgroundColor: '#0047AB', borderColor: '#002D6B', borderWidth: 2 },
  cellText: { fontSize: 11, fontWeight: '600', color: '#1E293B', textAlign: 'center' },
  emptyCellText: { color: '#CBD5E1' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1C1C1E', marginBottom: 12 },
  modalText: { fontSize: 15, color: '#333', marginBottom: 8 },
  modalSubText: { fontSize: 13, color: '#8E8E93', marginBottom: 24 },
  modalActions: { flexDirection: 'row' },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center', backgroundColor: '#F4F6F8', borderRadius: 8, marginRight: 8 },
  cancelText: { color: '#64748B', fontWeight: '700' },
  confirmBtn: { flex: 1, padding: 14, alignItems: 'center', backgroundColor: '#0047AB', borderRadius: 8 },
  confirmText: { color: '#FFF', fontWeight: '700' }
});
