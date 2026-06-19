import { supabase } from '../supabase';

export type TeacherInfo = {
  id: string;
  employee_id: string;
  department: string | null;
  profiles: {
    full_name: string;
    email: string | null;
  } | null;
};

export async function getTeacherProfile(userId: string) {
  return supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      teachers (
        id,
        employee_id,
        department
      )
    `)
    .eq('auth_user_id', userId)
    .single();
}

export async function getTeacherDashboardStats(teacherId: string) {
  const [classesRes, docsRes, annRes] = await Promise.all([
    supabase.from('teacher_assignments').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId),
    supabase.from('teacher_documents').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId),
    supabase.from('announcements').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId),
  ]);

  return {
    classesCount: classesRes.count ?? 0,
    documentsCount: docsRes.count ?? 0,
    announcementsCount: annRes.count ?? 0,
  };
}

export async function getAssignedClasses(teacherId: string) {
  return supabase
    .from('teacher_assignments')
    .select(`
      id,
      class_id,
      section_id,
      subject_id,
      is_class_teacher,
      classes ( id, name, code ),
      sections ( id, name ),
      subjects ( id, name, code )
    `)
    .eq('teacher_id', teacherId);
}

export async function getStudentsForTeacher(teacherId: string) {
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('class_id, section_id')
    .eq('teacher_id', teacherId);
  
  if (!assignments || assignments.length === 0) return { data: [], error: null };
  
  const classIds = assignments.map(a => a.class_id);
  
  return supabase
    .from('enrollments')
    .select(`
      roll_number,
      classes ( name ),
      sections ( name ),
      students (
        id,
        admission_no,
        profiles ( id, full_name, email )
      )
    `)
    .in('class_id', classIds);
}

export async function getTeachers(page = 0, pageSize = 20) {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  return supabase
    .from('teachers')
    .select(`
      *,
      profiles (
        full_name,
        email,
        phone
      )
    `)
    .order('created_at', { ascending: false })
    .range(from, to);
}

export async function deleteTeacher(id: string) {
  return supabase
    .from('teachers')
    .delete()
    .eq('id', id);
}
