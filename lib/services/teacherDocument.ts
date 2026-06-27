import { supabase } from '../supabase';
import { decode } from 'base64-arraybuffer';

export const TEACHER_DOCS_BUCKET = "school-resources";

export type DocumentVisibility = 'admin_only' | 'all_classes' | 'all_teachers' | 'specific_class';

export async function getMyDocuments(teacherId: string) {
  return supabase
    .from("teacher_documents")
    .select(`
      id, title, description, file_path, file_url, file_name,
      file_size, mime_type, is_public, visibility, created_at,
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
  visibility?: DocumentVisibility;
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
      visibility: data.visibility || 'admin_only',
    })
    .select()
    .single();
}

export async function updateDocumentVisibility(
  documentId: string,
  visibility: DocumentVisibility,
  classIds: string[]
) {
  // Update the visibility field
  const { error: visErr } = await supabase
    .from("teacher_documents")
    .update({ visibility })
    .eq("id", documentId);

  if (visErr) return { error: visErr };

  // Clear existing access entries
  await supabase.from("document_access").delete().eq("document_id", documentId);

  // If specific_class, insert the selected class access rows
  if (visibility === 'specific_class' && classIds.length > 0) {
    const { error: accessErr } = await supabase.from("document_access").insert(
      classIds.map((cid) => ({ document_id: documentId, class_id: cid }))
    );
    if (accessErr) return { error: accessErr };
  }

  // If all_classes, insert ALL classes (we need the full class list from caller)
  if (visibility === 'all_classes' && classIds.length > 0) {
    const { error: accessErr } = await supabase.from("document_access").insert(
      classIds.map((cid) => ({ document_id: documentId, class_id: cid }))
    );
    if (accessErr) return { error: accessErr };
  }

  return { error: null };
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
  // Strict PDF Protocol
  if (mimeType !== "application/pdf" && !fileName.toLowerCase().endsWith('.pdf')) {
    return { data: null, error: new Error("Only PDF files are allowed for institutional resources.") };
  }

  const safeName = fileName.replace(/\s+/g, "_");
  const path = `teachers/${teacherId}/${Date.now()}_${safeName}`;

  try {
    console.log(`[Cloud Optimizer] Processing institutional document: ${safeName}`);
    
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

export async function getAllClasses() {
  return supabase
    .from("classes")
    .select("id, name")
    .order("name", { ascending: true });
}
