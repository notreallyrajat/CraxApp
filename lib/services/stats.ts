import { supabase } from '../supabase';

export async function getAdminStats() {
  const today = new Date().toISOString().split('T')[0];

  const [students, teachers, classes, announcements, attendance] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }),
    supabase.from('teachers').select('id', { count: 'exact', head: true }),
    supabase.from('classes').select('id', { count: 'exact', head: true }),
    supabase.from('announcements').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('attendance_records').select('status') // Removed date filter for global avg or we can add session join
  ]);

  // Calculate overall attendance %
  const totalMarked = attendance.data?.length || 0;
  const presentCount = attendance.data?.filter(a => a.status === 'present').length || 0;
  const attendanceRate = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;

  return {
    totalStudents: students.count || 0,
    totalTeachers: teachers.count || 0,
    totalClasses: classes.count || 0,
    activeAnnouncements: announcements.count || 0,
    attendanceToday: attendanceRate
  };
}

export async function getTeacherStats(teacherId: string) {
  // 1. Get assigned classes
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('class_id, subject_id')
    .eq('teacher_id', teacherId);

  const classIds = [...new Set(assignments?.map(a => a.class_id) || [])];
  
  // 2. Get attendance for these classes
  const { data: attendance } = await supabase
    .from('attendance_records')
    .select('status, student_id')
    .in('student_id', await (async () => {
       const { data: students } = await supabase.from('enrollments').select('student_id').in('class_id', classIds);
       return students?.map(s => s.student_id) || [];
    })());

  const totalMarked = attendance?.length || 0;
  const presentCount = attendance?.filter(a => a.status === 'present').length || 0;
  const attendanceRate = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;

  // 3. Get total students taught
  const { count: studentCount } = await supabase
    .from('enrollments')
    .select('id', { count: 'exact', head: true })
    .in('class_id', classIds);

  return {
    assignedClasses: classIds.length,
    attendanceRate,
    totalStudents: studentCount || 0,
    pendingTasks: 3 
  };
}

export async function getStudentStats(studentId: string, classId: string) {
  // 1. Get overall attendance %
  const { data: attendance } = await supabase
    .from('attendance_records')
    .select('status')
    .eq('student_id', studentId);

  const totalMarked = attendance?.length || 0;
  const presentCount = attendance?.filter(a => a.status === 'present').length || 0;
  const attendanceRate = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;

  // 2. Get total subjects in their class
  const { count: subjectCount } = await supabase
    .from('teacher_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', classId);

  // 3. GPA from exam_results
  const { data: results } = await supabase
    .from('exam_results')
    .select('marks_obtained, exam_subjects(total_marks)')
    .eq('student_id', studentId);

  let gpa = 0;
  if (results && results.length > 0) {
    const totalPct = results.reduce((acc, r) => {
       const obtained = parseFloat(r.marks_obtained);
       const total = parseFloat(r.exam_subjects?.total_marks || "100");
       return acc + (obtained / (total || 100));
    }, 0);
    gpa = parseFloat(((totalPct / results.length) * 4).toFixed(2)); // Scale to 4.0
  }

  return {
    attendanceRate,
    totalSubjects: subjectCount || 0,
    pendingAssignments: 2, 
    gpa
  };
}
