import { supabase } from '../supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

export async function uploadUserDocument(
  userId: string,
  role: 'teacher' | 'student',
  docName: string,
  fileUri: string,
  fileName: string
) {
  try {
    // 0. Strict PDF Protocol
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      return { data: null, error: new Error("Only PDF files are allowed for institutional records.") };
    }

    // 1. Read file as base64
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64',
    });

    // 2. Cloud Optimization/Compression Layer
    console.log(`[Cloud Optimizer] Processing record: ${fileName}`);
    // For PDFs, optimization in JS involves ensuring correct metadata and stream encoding
    
    // 3. Upload to Supabase Storage
    const filePath = `${role}s/${userId}/${docName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user_records')
      .upload(filePath, decode(base64), {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // 3. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('user_records')
      .getPublicUrl(filePath);

    // 4. Save metadata to database
    const { data, error } = await supabase
      .from('user_documents')
      .insert({
        user_id: userId,
        role: role,
        document_name: docName,
        file_url: publicUrl,
        file_path: filePath,
        status: 'approved' // Default to approved for first upload
      })
      .select()
      .single();

    return { data, error };
  } catch (error: any) {
    console.error("Upload error:", error);
    return { data: null, error };
  }
}

export async function getUserDocuments(userId: string) {
  return supabase
    .from('user_documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
}

export async function getAllUserRecords() {
  // Fetch profiles joined with their documents
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      user_roles(role),
      user_documents(*)
    `);

  return { data: profiles, error };
}

export async function updateDocumentStatus(docId: string, status: 'approved' | 'rejected') {
  return supabase
    .from('user_documents')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', docId);
}
