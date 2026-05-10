import { supabase } from '../supabase';

export async function getClasses() {
  return await supabase
    .from('classes')
    .select('*')
    .order('name');
}

export async function deleteClass(classId: string) {
  return await supabase.from('classes').delete().eq('id', classId);
}

export async function getClassById(id: string) {
  return supabase
    .from('classes')
    .select('*')
    .eq('id', id)
    .single();
}

export async function getSections(classId: string) {
  return await supabase
    .from('sections')
    .select('*')
    .eq('class_id', classId)
    .order('created_at');
}

export async function createSection(classId: string, name: string) {
  return await supabase.from('sections').insert({
    class_id: classId,
    name,
  });
}

export async function deleteSection(sectionId: string) {
  return await supabase.from('sections').delete().eq('id', sectionId);
}

export async function getClassTeacher(classId: string) {
  return supabase
    .from('class_teachers')
    .select(`
      id, teacher_id,
      teachers (
        id, employee_id,
        profiles ( full_name )
      )
    `)
    .eq('class_id', classId)
    .maybeSingle();
}

export async function setClassTeacher(classId: string, teacherId: string) {
  const { data: existing } = await supabase
    .from('class_teachers')
    .select('id')
    .eq('class_id', classId)
    .maybeSingle();

  if (existing?.id) {
    return supabase
      .from('class_teachers')
      .update({ teacher_id: teacherId })
      .eq('id', existing.id)
      .select()
      .single();
  }

  return supabase
    .from('class_teachers')
    .insert({ class_id: classId, teacher_id: teacherId })
    .select()
    .single();
}

export async function removeClassTeacher(classId: string) {
  return supabase.from('class_teachers').delete().eq('class_id', classId);
}
