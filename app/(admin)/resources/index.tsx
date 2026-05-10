import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Modal, Alert, ScrollView, RefreshControl } from 'react-native';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { 
  listFiles, 
  listFolders, 
  uploadFile, 
  deleteFile, 
  createFolder, 
  formatBytes, 
  fileIcon, 
  type ResourceFile 
} from '../../../lib/services/resource';

export default function ResourcesScreen() {
  const navigation = useNavigation();
  const [folders, setFolders] = useState<string[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>("general");
  const [files, setFiles] = useState<ResourceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  
  const [uploading, setUploading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [foldersRes, filesRes] = await Promise.all([
      listFolders(),
      listFiles(activeFolder),
    ]);

    const folderList = foldersRes.data as string[] || [];
    if (!folderList.includes("general")) folderList.unshift("general");
    
    setFolders(folderList);
    setFiles(filesRes.data as ResourceFile[] || []);
    setLoading(false);
  }, [activeFolder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      
      // Strict PDF Check
      if (file.mimeType !== "application/pdf" && !file.name.toLowerCase().endsWith('.pdf')) {
        Alert.alert("Invalid Format", "Only PDF files are accepted for cloud storage.");
        return;
      }

      setUploading(true);

      const { data, error } = await uploadFile(
        file.uri, 
        file.name, 
        file.mimeType || "application/pdf", 
        activeFolder
      );

      if (error) {
        Alert.alert("Upload Error", error.message || "Failed to upload file.");
      } else {
        Alert.alert(
          "Upload Success", 
          `${file.name} optimized and uploaded successfully to ${activeFolder}.`
        );
        loadData();
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "An unexpected error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    const { error } = await createFolder(newFolderName);
    setCreatingFolder(false);
    
    if (error) {
      Alert.alert("Error", "Could not create folder.");
    } else {
      setNewFolderName("");
      setFolderModalVisible(false);
      loadData();
    }
  };

  const handleDelete = (path: string, name: string) => {
    Alert.alert(
      "Delete File",
      `Are you sure you want to delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            const { error } = await deleteFile(path);
            if (error) Alert.alert("Error", "Failed to delete file.");
            else loadData();
          } 
        }
      ]
    );
  };

  const handleDownload = async (publicUrl: string, fileName: string) => {
    try {
      const fileUri = FileSystem.cacheDirectory + fileName;
      const downloadResumable = FileSystem.createDownloadResumable(
        publicUrl,
        fileUri
      );
      
      const result = await downloadResumable.downloadAsync();
      
      if (result && result.uri) {
        await Sharing.shareAsync(result.uri);
      } else {
        Alert.alert("Error", "Failed to download file.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not open file.");
    }
  };

  const filteredFiles = files.filter(f => 
    f.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderFileItem = ({ item }: { item: ResourceFile }) => (
    <View style={styles.fileCard}>
      <View style={styles.fileIconContainer}>
        <Ionicons name={fileIcon(item.metadata?.mimetype || "")} size={32} color="#0047AB" />
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>{item.displayName}</Text>
        <View style={styles.fileMeta}>
          <Text style={styles.metaText}>{formatBytes(item.metadata?.size || 0)}</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaText}>
            {new Date(item.created_at || "").toLocaleDateString()}
          </Text>
        </View>
      </View>
      <View style={styles.fileActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleDownload(item.publicUrl, item.displayName)}>
          <Ionicons name="cloud-download-outline" size={22} color="#0047AB" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(item.path, item.displayName)}>
          <Ionicons name="trash-outline" size={22} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Royal Blue Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.menuButton}>
            <Ionicons name="menu" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Resources & Cloud</Text>
          <View style={styles.menuButton} />
        </View>
        
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#A0A0A0" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search in this folder..."
            placeholderTextColor="#A0A0A0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Folders Scroll */}
      <View style={styles.folderSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderScroll}>
          {folders.map((folder) => (
            <TouchableOpacity 
              key={folder} 
              style={[styles.folderChip, activeFolder === folder && styles.activeFolderChip]}
              onPress={() => setActiveFolder(folder)}
            >
              <Ionicons 
                name={activeFolder === folder ? "folder-open" : "folder"} 
                size={18} 
                color={activeFolder === folder ? "#FFFFFF" : "#0047AB"} 
              />
              <Text style={[styles.folderText, activeFolder === folder && styles.activeFolderText]}>
                {folder}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addFolderButton} onPress={() => setFolderModalVisible(true)}>
            <Ionicons name="add-circle-outline" size={20} color="#8E8E93" />
            <Text style={styles.addFolderText}>New Folder</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0047AB" />
        </View>
      ) : filteredFiles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-upload-outline" size={80} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No files here</Text>
          <Text style={styles.emptySub}>Upload documents, images or videos to share with your staff.</Text>
          <TouchableOpacity style={styles.uploadCta} onPress={handleUpload}>
            <Text style={styles.uploadCtaText}>Upload First File</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredFiles}
          keyExtractor={(item) => item.id}
          renderItem={renderFileItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0047AB"]} />
          }
        />
      )}

      {/* Upload Progress Modal */}
      <Modal visible={uploading} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.progressCard}>
            <ActivityIndicator size="large" color="#0047AB" />
            <Text style={styles.progressText}>Uploading to Cloud...</Text>
          </View>
        </View>
      </Modal>

      {/* New Folder Modal */}
      <Modal visible={folderModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalDragIndicator} />
            <Text style={styles.modalTitle}>Create New Folder</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Folder name (e.g. Science-Projects)"
              placeholderTextColor="#A0A0A0"
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setFolderModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalConfirm} 
                onPress={handleCreateFolder}
                disabled={creatingFolder || !newFolderName.trim()}
              >
                {creatingFolder ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmText}>Create Folder</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FAB for Quick Upload */}
      {!uploading && (
        <TouchableOpacity style={styles.fab} onPress={handleUpload} activeOpacity={0.9}>
          <Ionicons name="cloud-upload" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    backgroundColor: '#0047AB',
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#0047AB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  menuButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  folderSection: { paddingVertical: 16 },
  folderScroll: { paddingHorizontal: 20, gap: 10 },
  folderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    gap: 8,
  },
  activeFolderChip: {
    backgroundColor: '#0047AB',
    borderColor: '#0047AB',
  },
  folderText: { fontSize: 14, fontWeight: '700', color: '#0047AB' },
  activeFolderText: { color: '#FFFFFF' },
  addFolderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 6,
  },
  addFolderText: { fontSize: 14, fontWeight: '600', color: '#8E8E93' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  fileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F3F5',
  },
  fileIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F0F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 16, fontWeight: '800', color: '#212529', marginBottom: 4 },
  fileMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: '#868E96', fontWeight: '500' },
  metaDot: { fontSize: 12, color: '#DEE2E6' },
  fileActions: { flexDirection: 'row', gap: 8 },
  actionButton: { padding: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#495057', marginTop: 24, marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#868E96', textAlign: 'center', lineHeight: 20 },
  uploadCta: {
    marginTop: 32,
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  uploadCtaText: { color: '#0047AB', fontSize: 15, fontWeight: '800' },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0047AB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0047AB',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  progressCard: { backgroundColor: '#FFFFFF', padding: 30, borderRadius: 24, alignItems: 'center', gap: 16 },
  progressText: { fontSize: 16, fontWeight: '700', color: '#212529' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalDragIndicator: { width: 40, height: 4, backgroundColor: '#E9ECEF', borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#212529', marginBottom: 20, textAlign: 'center' },
  modalInput: { backgroundColor: '#F8F9FA', borderRadius: 16, padding: 18, fontSize: 16, color: '#212529', fontWeight: '500', marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  cancelText: { color: '#ADB5BD', fontSize: 16, fontWeight: '700' },
  modalConfirm: { flex: 2, backgroundColor: '#0047AB', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
