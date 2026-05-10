import { supabase } from '../supabase';

export async function saveTimetable(entries: any[]) {
  // First, clear old timetable for these classes if needed
  // Or just upsert.
  return supabase.from('timetables').upsert(entries, { onConflict: 'class_id,day_of_week,period_number' });
}

export async function getTimetableForClass(classId: string) {
  return supabase
    .from('timetables')
    .select(`
      *,
      subjects ( name ),
      teachers ( profiles ( full_name ) )
    `)
    .eq('class_id', classId)
    .order('day_of_week', { ascending: true })
    .order('period_number', { ascending: true });
}

export async function getTimetableForTeacher(teacherId: string) {
  return supabase
    .from('timetables')
    .select(`
      *,
      classes ( name ),
      subjects ( name )
    `)
    .eq('teacher_id', teacherId)
    .order('day_of_week', { ascending: true })
    .order('period_number', { ascending: true });
}
