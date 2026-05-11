import { supabase } from '../supabase';

export async function getStudents(page = 0, pageSize = 20, searchQuery?: string) {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('students')
    .select(`
      id,
      admission_no,
      date_of_birth,
      created_at,
      profiles!inner (
        id,
        full_name,
        email,
        phone
      )
    `);

  if (searchQuery) {
    // Search in full_name or admission_no
    query = query.or(`admission_no.ilike.%${searchQuery}%,profiles.full_name.ilike.%${searchQuery}%`);
  }

  return query
    .order('created_at', { ascending: false })
    .range(from, to);
}

export async function getStudentById(id: string) {
  return supabase
    .from('students')
    .select(`
      id,
      admission_no,
      date_of_birth,
      created_at,
      profiles (
        id,
        full_name,
        email,
        phone
      )
    `)
    .eq('id', id)
    .single();
}

export async function getStudentProfile(userId: string) {
  return supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      students (
        id,
        admission_no
      )
    `)
    .eq('auth_user_id', userId)
    .single();
}

export async function deleteStudent(id: string) {
  return supabase.from('students').delete().eq('id', id);
}

export async function getTeachersForStudent(studentId: string) {
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('class_id, section_id')
    .eq('student_id', studentId);
  
  if (!enrollments || enrollments.length === 0) return { data: [], error: null };
  
  const classIds = enrollments.map(e => e.class_id);
  
  return supabase
    .from('teacher_assignments')
    .select(`
      id,
      subjects ( name ),
      teachers (
        id,
        profiles ( id, full_name, email )
      )
    `)
    .in('class_id', classIds);
}
