import { supabase } from '../supabase';

export type AnnouncementAudience = "all" | "students" | "teachers" | "class" | "admin_teachers";
export type AnnouncementPriority = "low" | "normal" | "high" | "urgent";
export type AnnouncementStatus = "pending" | "approved" | "rejected";

export type Announcement = {
  id: string;
  title: string;
  content: string;
  audience: AnnouncementAudience;
  class_ids: string[];
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  is_published: boolean;
  teacher_id: string | null;
  rejection_note: string | null;
  created_at: string;
  expires_at: string | null;
  teachers?: {
    id: string;
    employee_id: string;
    profiles: { full_name: string };
  };
};

export async function getAnnouncements() {
  return supabase
    .from("announcements")
    .select(`
      *,
      teachers (
        id, employee_id,
        profiles ( full_name )
      )
    `)
    .order("created_at", { ascending: false });
}

export async function createAnnouncement(data: {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  classIds?: string[];
  priority?: AnnouncementPriority;
  expiresAt?: string;
}) {
  return supabase
    .from("announcements")
    .insert({
      title: data.title,
      content: data.body,
      audience: data.audience,
      class_ids: data.classIds ?? [],
      priority: data.priority ?? "normal",
      expires_at: data.expiresAt || null,
      status: "approved",
      is_published: true,
      teacher_id: null,
    })
    .select()
    .single();
}

export async function updateAnnouncement(
  id: string,
  data: {
    title?: string;
    body?: string;
    audience?: AnnouncementAudience;
    classIds?: string[];
    priority?: AnnouncementPriority;
    expiresAt?: string | null;
    status?: AnnouncementStatus;
    is_published?: boolean;
  }
) {
  return supabase
    .from("announcements")
    .update({
      ...(data.title !== undefined && { title: data.title }),
      ...(data.body !== undefined && { content: data.body }),
      ...(data.audience !== undefined && { audience: data.audience }),
      ...(data.classIds !== undefined && { class_ids: data.classIds }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.expiresAt !== undefined && { expires_at: data.expiresAt }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.is_published !== undefined && { is_published: data.is_published }),
    })
    .eq("id", id)
    .select()
    .single();
}

export async function deleteAnnouncement(id: string) {
  return supabase.from("announcements").delete().eq("id", id);
}

export async function approveAnnouncement(id: string) {
  return supabase
    .from("announcements")
    .update({ status: "approved", is_published: true, rejection_note: null })
    .eq("id", id)
    .select()
    .single();
}

export async function rejectAnnouncement(id: string, note: string) {
  return supabase
    .from("announcements")
    .update({ status: "rejected", is_published: false, rejection_note: note })
    .eq("id", id)
    .select()
    .single();
}
