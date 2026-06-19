import { supabase } from '../supabase';

export async function getSubjects(classId?: string) {
  let query = supabase
    .from('subjects')
    .select(`
      id,
      name,
      code,
      created_at,
      classes ( id, name )
    `)
    .order('name');

  if (classId) query = query.eq('class_id', classId);

  return query;
}

export async function createSubject(data: { name: string; class_id: string; code?: string }) {
  return supabase.from('subjects').insert(data).select().single();
}

export async function deleteSubject(id: string) {
  return supabase.from('subjects').delete().eq('id', id);
}
