import { supabase } from '../supabase';
import { TimetableInput } from './timetableEngine';

export interface DBTimetableEntry {
  id?: string;
  class_id: string;
  section_id: string | null;
  subject_id: string;
  teacher_id: string;
  room_id: string | null;
  room_no?: string | null;
  day_of_week: number; // 0 = Monday, etc.
  period_number: number;
  is_free_period?: boolean;
}

/**
 * Fetches all necessary structured data from Supabase to feed into the Timetable Engine.
 */
export const fetchGenerationInputs = async (classIds: string[]): Promise<TimetableInput> => {
  const [
    { data: settings },
    { data: rooms },
    { data: classes },
    { data: sections },
    { data: subjects },
    { data: teachers },
    { data: assignments }
  ] = await Promise.all([
    supabase.from('timetable_settings').select('*').limit(1).single(),
    supabase.from('rooms').select('*'),
    supabase.from('classes').select('id, name').in('id', classIds),
    supabase.from('sections').select('id, class_id, strength').in('class_id', classIds),
    supabase.from('subjects').select('id, name, priority, periods_per_week, requires_lab, max_per_day').in('class_id', classIds),
    supabase.from('teachers').select('id, department'), // department holds JSON
    supabase.from('teacher_assignments').select('id, teacher_id, class_id, section_id, subject_id').in('class_id', classIds)
  ]);

  if (!settings) throw new Error('Timetable settings not found');

  return {
    settings: {
      daysOfWeek: settings.days_of_week || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      periodsPerDay: settings.periods_per_day || 8,
      breaks: settings.breaks || []
    },
    rooms: rooms || [],
    classes: classes || [],
    sections: sections || [],
    subjects: subjects || [],
    teachers: (teachers || []).map(t => ({
      id: t.id,
      // Default to empty; can be populated with existing timetable data for fixed constraints
      unavailableSlots: [] 
    })),
    assignments: assignments || []
  };
};

/**
 * Saves a generated timetable for a specific class.
 * Replaces any existing timetable for this class.
 */
export const saveTimetable = async (classId: string, entries: DBTimetableEntry[]) => {
  // Delete existing timetable for this class
  const { error: deleteError } = await supabase
    .from('timetables')
    .delete()
    .eq('class_id', classId);

  if (deleteError) throw deleteError;

  if (entries.length === 0) return;

  // Insert new entries
  const { error: insertError } = await supabase
    .from('timetables')
    .insert(entries.map(e => ({
      ...e,
      is_free_period: false
    })));

  if (insertError) throw insertError;
};

/**
 * Fetches the saved timetable for a specific class.
 */
export const fetchTimetable = async (classId: string): Promise<DBTimetableEntry[]> => {
  const { data, error } = await supabase
    .from('timetables')
    .select('*')
    .eq('class_id', classId);

  if (error) throw error;
  return data as DBTimetableEntry[];
};

/**
 * Re-runs generation for a single class.
 * Treats all OTHER classes' existing timetables as fixed constraints for teachers and rooms.
 */
export const regenerateForClass = async (classId: string): Promise<TimetableInput> => {
  // Fetch standard inputs for just this class
  const inputs = await fetchGenerationInputs([classId]);

  // Fetch timetables of ALL OTHER classes to use as constraints
  const { data: otherTimetables, error } = await supabase
    .from('timetables')
    .select('teacher_id, day_of_week, period_number')
    .neq('class_id', classId);

  if (error) throw error;

  // Map existing commitments to teacher unavailableSlots
  const days = inputs.settings.daysOfWeek;
  otherTimetables?.forEach(entry => {
    const teacher = inputs.teachers.find(t => t.id === entry.teacher_id);
    if (teacher) {
      const dayName = days[entry.day_of_week];
      if (dayName) {
        let slot = teacher.unavailableSlots.find(u => u.day === dayName);
        if (!slot) {
          slot = { day: dayName, periods: [] };
          teacher.unavailableSlots.push(slot);
        }
        slot.periods.push(entry.period_number);
      }
    }
  });

  // Note: To fully support room constraints here, the TimetableEngine would need a `room.unavailableSlots` property.
  // We handle teacher double-booking completely.

  return inputs;
};

/**
 * Validates and commits a manual swap of two timetable entries.
 */
export const swapEntries = async (entryIdA: string, entryIdB: string) => {
  // 1. Fetch both entries
  const { data: entries, error: fetchError } = await supabase
    .from('timetables')
    .select('*')
    .in('id', [entryIdA, entryIdB]);

  if (fetchError) throw fetchError;
  if (!entries || entries.length !== 2) throw new Error('Could not find both entries');

  const [entryA, entryB] = entries;

  // 2. Validate conflict: Check if swapping would cause a teacher double-booking
  // Check if Teacher A is already teaching on Day B / Period B
  const { data: conflictA, error: errA } = await supabase
    .from('timetables')
    .select('id')
    .eq('teacher_id', entryA.teacher_id)
    .eq('day_of_week', entryB.day_of_week)
    .eq('period_number', entryB.period_number)
    .neq('id', entryA.id); // Exclude the entry being swapped out

  // Check if Teacher B is already teaching on Day A / Period A
  const { data: conflictB, error: errB } = await supabase
    .from('timetables')
    .select('id')
    .eq('teacher_id', entryB.teacher_id)
    .eq('day_of_week', entryA.day_of_week)
    .eq('period_number', entryA.period_number)
    .neq('id', entryB.id);

  if (errA || errB) throw new Error('Conflict validation failed');
  if ((conflictA && conflictA.length > 0) || (conflictB && conflictB.length > 0)) {
    throw new Error('Swap rejected: This swap would cause a teacher double-booking conflict.');
  }

  // 3. Commit swap (Atomic RPC or sequential updates)
  // We'll swap the day_of_week, period_number, and room_id
  const { error: updateErrorA } = await supabase
    .from('timetables')
    .update({
      day_of_week: entryB.day_of_week,
      period_number: entryB.period_number,
      room_id: entryB.room_id
    })
    .eq('id', entryA.id);

  if (updateErrorA) throw updateErrorA;

  const { error: updateErrorB } = await supabase
    .from('timetables')
    .update({
      day_of_week: entryA.day_of_week,
      period_number: entryA.period_number,
      room_id: entryA.room_id
    })
    .eq('id', entryB.id);

  if (updateErrorB) throw updateErrorB;

  return true;
};
