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
      locked_at,
      unlock_request_status,
      unlock_reason,
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
    .select('id, session_date, locked_at, unlock_request_status, unlock_reason')
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

export async function requestSessionUnlock(sessionId: string, reason: string) {
  return supabase
    .from('attendance_sessions')
    .update({
      unlock_request_status: 'pending',
      unlock_reason: reason,
      unlock_requested_at: new Date().toISOString()
    })
    .eq('id', sessionId);
}

export async function approveSessionUnlock(sessionId: string) {
  // Give them a fresh 30-minute window
  const lockedAt = new Date();
  lockedAt.setMinutes(lockedAt.getMinutes() + 30);
  
  return supabase
    .from('attendance_sessions')
    .update({
      unlock_request_status: 'approved',
      locked_at: lockedAt.toISOString()
    })
    .eq('id', sessionId);
}

export async function rejectSessionUnlock(sessionId: string) {
  return supabase
    .from('attendance_sessions')
    .update({
      unlock_request_status: 'rejected'
    })
    .eq('id', sessionId);
}

export async function getPendingUnlockRequests() {
  return supabase
    .from('attendance_sessions')
    .select(`
      id,
      session_date,
      unlock_reason,
      unlock_requested_at,
      classes ( id, name ),
      sections ( id, name )
    `)
    .eq('unlock_request_status', 'pending')
    .order('unlock_requested_at', { ascending: false });
}

export async function saveAllRecords(
  sessionId: string,
  records: Array<{
    studentId: string;
    status: 'present' | 'absent' | 'late' | 'holiday';
    remark?: string;
  }>
) {
  const { data: session } = await supabase.from('attendance_sessions').select('locked_at, unlock_request_status').eq('id', sessionId).single();
  
  if (session?.locked_at && new Date(session.locked_at) < new Date() && session?.unlock_request_status !== 'approved') {
    return { error: { message: "Session is locked. Please request an unlock from the admin." } };
  }

  const results = await Promise.all(
    records.map((r) =>
      upsertRecord({ sessionId, studentId: r.studentId, status: r.status, remark: r.remark })
    )
  );
  
  const firstError = results.find((r) => r.error);

  if (!session?.locked_at || session?.unlock_request_status === 'approved') {
    await supabase.from('attendance_sessions').update({ 
      locked_at: new Date().toISOString(),
      unlock_request_status: 'none'
    }).eq('id', sessionId);
  }

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
