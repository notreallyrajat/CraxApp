import { supabase } from '../supabase';

export async function getEnrolledStudents(classId: string, sectionId?: string) {
  let query = supabase
    .from('enrollments')
    .select(`
      id,
      roll_number,
      students (
        id,
        admission_no,
        profiles ( full_name )
      )
    `)
    .eq('class_id', classId)
    .order('roll_number', { ascending: true, nullsFirst: false });

  if (sectionId) {
    query = query.eq('section_id', sectionId);
  }

  return await query;
}

export async function getSessionsForClass(classId: string, sectionId?: string) {
  let query = supabase
    .from('attendance_sessions')
    .select(`
      id,
      session_date,
      created_at,
      sections ( id, name )
    `)
    .eq('class_id', classId)
    .order('session_date', { ascending: false });

  if (sectionId) {
    query = query.eq('section_id', sectionId);
  }

  return await query;
}

export async function getOrCreateSession(classId: string, sectionId: string | undefined, sessionDate: string) {
  let query = supabase
    .from('attendance_sessions')
    .select('id, session_date')
    .eq('class_id', classId)
    .eq('session_date', sessionDate);

  if (sectionId) {
    query = query.eq('section_id', sectionId);
  } else {
    query = query.is('section_id', null);
  }

  const { data: existingSession } = await query.maybeSingle();

  if (existingSession) {
    return { data: existingSession, error: null };
  }

  return await supabase
    .from('attendance_sessions')
    .insert({
      class_id: classId,
      section_id: sectionId || null,
      session_date: sessionDate,
    })
    .select()
    .single();
}

export async function getRecordsForSession(sessionId: string) {
  return await supabase
    .from('attendance_records')
    .select(`
      id,
      status,
      remark,
      student_id
    `)
    .eq('session_id', sessionId);
}

export async function upsertRecord(data: {
  sessionId: string;
  studentId: string;
  status: 'present' | 'absent' | 'late' | 'holiday';
  remark?: string;
}) {
  const { data: existing } = await supabase
    .from('attendance_records')
    .select('id')
    .eq('session_id', data.sessionId)
    .eq('student_id', data.studentId)
    .maybeSingle();

  if (existing?.id) {
    return supabase
      .from('attendance_records')
      .update({ status: data.status, remark: data.remark ?? null })
      .eq('id', existing.id)
      .select()
      .single();
  }

  return supabase
    .from('attendance_records')
    .insert({
      session_id: data.sessionId,
      student_id: data.studentId,
      status: data.status,
      remark: data.remark ?? null,
    })
    .select()
    .single();
}

export async function saveAllRecords(
  sessionId: string,
  records: Array<{
    studentId: string;
    status: 'present' | 'absent' | 'late' | 'holiday';
    remark?: string;
  }>
) {
  const results = await Promise.all(
    records.map((r) =>
      upsertRecord({ sessionId, studentId: r.studentId, status: r.status, remark: r.remark })
    )
  );
  const firstError = results.find((r) => r.error);
  return { error: firstError?.error ?? null };
}

export async function getStudentAttendanceRecords(studentId: string) {
  return supabase
    .from('attendance_records')
    .select(`
      id,
      status,
      remark,
      created_at,
      attendance_sessions (
        session_date,
        classes ( name ),
        sections ( name )
      )
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
}
