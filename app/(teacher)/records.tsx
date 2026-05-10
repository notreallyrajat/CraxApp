import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../../lib/supabase';
import { uploadUserDocument, getUserDocuments } from '../../lib/services/documents';

const TEACHER_DOCS = ["Aadhar Card", "Resume/CV", "Degree Certificate", "Experience Letter", "PAN Card"];

export default function TeacherRecordsScreen() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data } = await getUserDocuments(session.user.id);
      setDocuments(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const handleUpload = async (docName: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true
      });

      if (result.canceled) return;

      const file = result.assets[0];
      
      // Strict PDF Protocol
      if (file.mimeType !== "application/pdf" && !file.name.toLowerCase().endsWith('.pdf')) {
        Alert.alert("Invalid Format", "Only PDF files are accepted for professional records.");
        return;
      }

      setUploading(docName);

      const { error } = await uploadUserDocument(
        session.user.id,
        'teacher',
        docName,
        file.uri,
        file.name
      );

      if (error) throw error;

      Alert.alert("Success", `${docName} optimized and uploaded successfully!`);
      loadData();
    } catch (error: any) {
      Alert.alert("Upload Failed", error.message || "Failed to upload file.");
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a1d2e" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Professional Records</Text>
        <Text style={styles.headerSub}>Manage your teaching credentials</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark" size={20} color="#1e293b" />
          <Text style={styles.infoText}>Documents are securely stored and visible only to Admins.</Text>
        </View>

        {TEACHER_DOCS.map(docName => {
          const uploaded = documents.find(d => d.document_name === docName);
          const isUploading = uploading === docName;

          return (
            <View key={docName} style={styles.docRow}>
              <View style={styles.docMain}>
                <View style={[styles.iconBox, uploaded && styles.iconBoxUploaded]}>
                  <Ionicons 
                    name={uploaded ? "checkmark-circle" : "briefcase-outline"} 
                    size={24} 
                    color={uploaded ? "#10B981" : "#64748b"} 
                  />
                </View>
                <View style={styles.docText}>
                  <Text style={styles.docTitle}>{docName}</Text>
                  <Text style={styles.docStatus}>
                    {uploaded ? `Status: ${uploaded.status.toUpperCase()}` : "Action Required"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.uploadBtn, uploaded && styles.disabledBtn]}
                onPress={() => !uploaded && handleUpload(docName)}
                disabled={!!uploaded || isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name={uploaded ? "eye-outline" : "cloud-upload-outline"} size={18} color="#fff" />
                    <Text style={styles.uploadBtnText}>{uploaded ? "SUBMITTED" : "UPLOAD"}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
        
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Modifications</Text>
          <Text style={styles.noticeDesc}>To update or replace an existing document, please contact the administrative office for approval.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { 
    backgroundColor: '#1a1d2e', 
    paddingTop: Platform.OS === 'android' ? 40 : 15, 
    paddingBottom: 25, 
    paddingHorizontal: 20 
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  content: { flex: 1, padding: 20 },
  infoBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F1F5F9', 
    padding: 12, 
    borderRadius: 12, 
    marginBottom: 20 
  },
  infoText: { marginLeft: 10, fontSize: 12, color: '#475569', fontWeight: '500' },
  docRow: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 15, 
    marginBottom: 12, 
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 1
  },
  docMain: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  iconBoxUploaded: { backgroundColor: '#DCFCE7' },
  docText: { flex: 1 },
  docTitle: { fontSize: 15, fontWeight: '700', color: '#1a1d2e' },
  docStatus: { fontSize: 10, color: '#94A3B8', marginTop: 2, fontWeight: '700' },
  uploadBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#1a1d2e', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center'
  },
  disabledBtn: { backgroundColor: '#94A3B8' },
  uploadBtnText: { color: '#fff', fontSize: 11, fontWeight: '800', marginLeft: 5 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notice: { marginTop: 30, padding: 20, backgroundColor: '#fff', borderRadius: 16, borderLeftWidth: 4, borderLeftColor: '#1a1d2e' },
  noticeTitle: { fontSize: 16, fontWeight: '800', color: '#1a1d2e', marginBottom: 5 },
  noticeDesc: { fontSize: 13, color: '#64748b', lineHeight: 20 }
});
