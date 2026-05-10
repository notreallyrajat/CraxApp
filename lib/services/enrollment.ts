import { supabase } from '../supabase';

export async function getEnrollments(classId?: string) {
  let query = supabase.from('enrollments').select(`
    id,
    roll_number,
    created_at,
    students (
      id,
      admission_no,
      profiles (
        full_name,
        email
      )
    ),
    classes (
      id,
      name,
      code
    ),
    sections (
      id,
      name
    )
  `);

  if (classId) {
    query = query.eq('class_id', classId);
  }

  return query.order('created_at', { ascending: false });
}

export async function createEnrollment(data: {
  studentId: string;
  classId: string;
  sectionId?: string;
  rollNumber?: string;
}) {
  return supabase
    .from('enrollments')
    .insert({
      student_id: data.studentId,
      class_id: data.classId,
      section_id: data.sectionId || null,
      roll_number: data.rollNumber || null,
    })
    .select()
    .single();
}

export async function deleteEnrollment(id: string) {
  return supabase.from('enrollments').delete().eq('id', id);
}

export async function getTeacherAssignments(classId?: string) {
  let query = supabase.from('teacher_assignments').select(`
    id,
    subject_id,
    created_at,
    teachers (
      id,
      employee_id,
      department,
      profiles (
        full_name,
        email
      )
    ),
    classes (
      id,
      name,
      code
    ),
    sections (
      id,
      name
    ),
    subjects (
      id,
      name,
      code
    )
  `);

  if (classId) {
    query = query.eq('class_id', classId);
  }

  return query.order('created_at', { ascending: false });
}

export async function createTeacherAssignment(data: {
  teacherId: string;
  classId: string;
  sectionId?: string;
  subjectId?: string;
}) {
  return supabase
    .from('teacher_assignments')
    .insert({
      teacher_id: data.teacherId,
      class_id: data.classId,
      section_id: data.sectionId || null,
      subject_id: data.subjectId || null,
    })
    .select()
    .single();
}

export async function deleteTeacherAssignment(id: string) {
  return supabase.from('teacher_assignments').delete().eq('id', id);
}
