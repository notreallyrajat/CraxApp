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
