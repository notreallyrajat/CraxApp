import { supabase } from '../supabase';

export type Assignment = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  class_id: string;
  section_id: string | null;
  subject_id: string | null;
  teacher_id: string | null;
  created_at: string;
  classes?: { id: string; name: string };
  sections?: { id: string; name: string };
  subjects?: { id: string; name: string };
};

export async function getAssignments(teacherId?: string) {
  let query = supabase
    .from('assignments')
    .select(`
      *,
      classes ( id, name ),
      sections ( id, name ),
      subjects ( id, name )
    `)
    .order('created_at', { ascending: false });

  if (teacherId) {
    query = query.eq('teacher_id', teacherId);
  }

  return query;
}

export async function createAssignment(payload: {
  title: string;
  description?: string;
  classId: string;
  sectionId?: string;
  subjectId?: string;
  teacherId?: string;
  dueDate?: string;
}) {
  return supabase
    .from('assignments')
    .insert({
      title: payload.title,
      description: payload.description || null,
      class_id: payload.classId,
      section_id: payload.sectionId || null,
      subject_id: payload.subjectId || null,
      teacher_id: payload.teacherId || null,
      due_date: payload.dueDate || null,
    })
    .select()
    .single();
}

export async function deleteAssignment(id: string) {
  return supabase.from('assignments').delete().eq('id', id);
}
