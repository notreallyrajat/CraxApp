import { supabase } from '../supabase';
import { decode } from 'base64-arraybuffer';

export const TEACHER_DOCS_BUCKET = "school-resources";

export async function getMyDocuments(teacherId: string) {
  return supabase
    .from("teacher_documents")
    .select(`
      id, title, description, file_path, file_url, file_name,
      file_size, mime_type, is_public, created_at,
      document_access ( class_id, classes ( id, name ) )
    `)
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });
}

export async function createDocument(data: {
  teacherId: string;
  title: string;
  description?: string;
  filePath: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
}) {
  return supabase
    .from("teacher_documents")
    .insert({
      teacher_id: data.teacherId,
      title: data.title,
      description: data.description || null,
      file_path: data.filePath,
      file_url: data.fileUrl,
      file_name: data.fileName,
      file_size: data.fileSize || null,
      mime_type: data.mimeType || null,
      is_public: false,
    })
    .select()
    .single();
}

export async function deleteDocument(id: string, filePath: string) {
  await supabase.storage.from(TEACHER_DOCS_BUCKET).remove([filePath]);
  return supabase.from("teacher_documents").delete().eq("id", id);
}

export async function setAccessClasses(documentId: string, classIds: string[]) {
  await supabase.from("document_access").delete().eq("document_id", documentId);
  if (classIds.length === 0) return { error: null };
  return supabase.from("document_access").insert(
    classIds.map((cid) => ({ document_id: documentId, class_id: cid }))
  );
}

import * as FileSystem from 'expo-file-system/legacy';

export async function uploadTeacherFileMobile(
  fileUri: string,
  fileName: string,
  mimeType: string,
  teacherId: string
) {
  // 1. Strict PDF Protocol
  if (mimeType !== "application/pdf" && !fileName.toLowerCase().endsWith('.pdf')) {
    return { data: null, error: new Error("Only PDF files are allowed for teacher resources.") };
  }

  const safeName = fileName.replace(/\s+/g, "_");
  const path = `teachers/${teacherId}/${Date.now()}_${safeName}`;

  try {
    // 2. Cloud Optimization Layer
    console.log(`[Cloud Optimizer] Processing faculty resource: ${safeName}`);
    
    // Read internal base64
    const base64Data = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64',
    });

    const { data, error } = await supabase.storage
      .from(TEACHER_DOCS_BUCKET)
      .upload(path, decode(base64Data), { 
        contentType: 'application/pdf',
        cacheControl: "3600", 
        upsert: false 
      });

    if (error) return { data: null, error };

    const { data: urlData } = supabase.storage
      .from(TEACHER_DOCS_BUCKET)
      .getPublicUrl(data.path);

    return {
      data: { path: data.path, publicUrl: urlData.publicUrl },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

export async function getDocumentsForClass(classId: string) {
  return supabase
    .from("document_access")
    .select(`
      document_id,
      teacher_documents (
        id, 
        title, 
        description,
        file_url, 
        file_name, 
        file_size,
        mime_type, 
        created_at,
        teachers ( 
          profiles ( full_name ) 
        )
      )
    `)
    .eq("class_id", classId);
}
