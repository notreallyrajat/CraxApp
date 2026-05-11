import { supabase } from '../supabase';
import { autoGrade } from '../utils/calculations';

export type ExamSubjectEntry = {
  id: string;
  exam_date: string | null;
  total_marks: string;
  subjects: { id: string; name: string; code: string | null } | null;
};

export type Exam = {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  classes: { id: string; name: string; code: string | null } | null;
  sections: { id: string; name: string } | null;
  exam_subjects: ExamSubjectEntry[];
};

export async function getExams() {
  return supabase
    .from('exams')
    .select(`
      id,
      title,
      start_date,
      end_date,
      created_at,
      classes ( id, name, code ),
      sections ( id, name ),
      exam_subjects (
        id,
        exam_date,
        total_marks,
        subjects ( id, name, code )
      )
    `)
    .order('created_at', { ascending: false });
}

export async function getExamById(id: string) {
  return supabase
    .from('exams')
    .select(`
      id,
      title,
      start_date,
      end_date,
      created_at,
      classes ( id, name, code ),
      sections ( id, name ),
      exam_subjects (
        id,
        exam_date,
        total_marks,
        subjects ( id, name, code )
      )
    `)
    .eq('id', id)
    .single();
}

export async function createExam(payload: {
  title: string;
  classId: string;
  sectionId?: string;
  startDate?: string;
  endDate?: string;
  subjects: { subjectId: string; examDate?: string; totalMarks: string }[];
}) {
  // 1. Create the exam record
  const { data: exam, error: examError } = await supabase
    .from('exams')
    .insert({
      title: payload.title,
      class_id: payload.classId,
      section_id: payload.sectionId,
      start_date: payload.startDate,
      end_date: payload.endDate,
    })
    .select()
    .single();

  if (examError || !exam) return { data: null, error: examError };

  // 2. Create the exam subjects entries
  if (payload.subjects.length > 0) {
    const { error: subjectsError } = await supabase
      .from('exam_subjects')
      .insert(
        payload.subjects.map((s) => ({
          exam_id: exam.id,
          subject_id: s.subjectId,
          exam_date: s.examDate,
          total_marks: s.totalMarks,
        }))
      );

    if (subjectsError) {
      // Cleanup if subjects failed
      await supabase.from('exams').delete().eq('id', exam.id);
      return { data: null, error: subjectsError };
    }
  }

  return { data: exam, error: null };
}

export async function getExamsForClass(classId: string, sectionId?: string) {
  let query = supabase
    .from('exams')
    .select(`
      id,
      title,
      start_date,
      end_date,
      created_at,
      classes ( id, name, code ),
      sections ( id, name ),
      exam_subjects (
        id,
        exam_date,
        total_marks,
        subjects ( id, name, code )
      )
    `)
    .eq('class_id', classId);

  if (sectionId) {
    query = query.or(`section_id.eq.${sectionId},section_id.is.null`);
  }

  return query.order('created_at', { ascending: false });
}

export async function deleteExam(id: string) {
  return supabase.from('exams').delete().eq('id', id);
}

// ─── Exam Results ─────────────────────────────────────────────────────────────

export async function getResultsForExamSubject(examSubjectId: string) {
  return supabase
    .from("exam_results")
    .select(`
      id,
      exam_subject_id,
      marks_obtained,
      grade,
      remarks,
      answer_sheet_url,
      answer_sheet_path,
      created_at,
      students (
        id,
        admission_no,
        profiles ( full_name )
      )
    `)
    .eq("exam_subject_id", examSubjectId);
}

// Deprecated: use autoGrade from ../utils/calculations instead
// Keeping for backward compatibility if needed, but internally uses the new utility
export { autoGrade };

export async function checkSubjectTeacher(teacherId: string, classId: string, subjectId: string) {
  const { data } = await supabase
    .from("teacher_assignments")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .maybeSingle();
  return !!data;
}

export async function upsertResult(data: {
  id?: string | null;
  examSubjectId: string;
  studentId: string;
  marks_obtained: string;
  grade?: string;
  remarks?: string;
  answer_sheet_url?: string;
  answer_sheet_path?: string;
}) {
  const payload: any = {
    exam_subject_id: data.examSubjectId,
    student_id: data.studentId,
    marks_obtained: data.marks_obtained,
    grade: data.grade || null,
    remarks: data.remarks || null,
  };
  if (data.id) payload.id = data.id;
  if (data.answer_sheet_url !== undefined) payload.answer_sheet_url = data.answer_sheet_url;
  if (data.answer_sheet_path !== undefined) payload.answer_sheet_path = data.answer_sheet_path;

  return supabase
    .from("exam_results")
    .upsert(payload, { onConflict: "exam_subject_id, student_id" })
    .select()
    .single();
}

export async function saveResults(
  examSubjectId: string,
  rows: Array<{
    id?: string | null;
    studentId: string;
    marksObtained: string;
    grade?: string;
    remarks?: string;
  }>
) {
  const toSave = rows
    .filter((r) => (r.marksObtained || "").toString().trim() !== "")
    .map((r) => ({
      id: r.id || undefined,
      exam_subject_id: examSubjectId,
      student_id: r.studentId,
      marks_obtained: r.marksObtained,
      grade: r.grade || null,
      remarks: r.remarks || null,
    }));

  if (toSave.length === 0) return { error: null };

  return supabase
    .from("exam_results")
    .upsert(toSave, { onConflict: "exam_subject_id, student_id" });
}

export const ANSWER_SHEETS_BUCKET = "answer-sheets";

export async function deleteResult(id: string) {
  return supabase.from("exam_results").delete().eq("id", id);
}

export async function clearAnswerSheet(resultId: string, oldPath: string) {
  await supabase.storage.from(ANSWER_SHEETS_BUCKET).remove([oldPath]);
  return supabase
    .from("exam_results")
    .update({ answer_sheet_url: null, answer_sheet_path: null })
    .eq("id", resultId)
    .select()
    .single();
}

export async function updateAnswerSheet(resultId: string, url: string, path: string) {
  return supabase
    .from("exam_results")
    .update({ answer_sheet_url: url, answer_sheet_path: path })
    .eq("id", resultId)
    .select()
    .single();
}

export async function getStudentResults(studentId: string) {
  return supabase
    .from("exam_results")
    .select(`
      id, 
      marks_obtained, 
      grade, 
      remarks, 
      answer_sheet_url, 
      created_at,
      exam_subjects (
        id, 
        total_marks, 
        exam_date,
        subjects ( id, name, code ),
        exams (
          id, 
          title,
          classes ( name )
        )
      )
    `)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
}
