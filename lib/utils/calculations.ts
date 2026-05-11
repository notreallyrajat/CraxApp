/**
 * Calculates the attendance percentage.
 * @param totalMarked Total number of attendance records.
 * @param presentCount Number of 'present' records.
 * @returns Rounded percentage.
 */
export function calculateAttendanceRate(totalMarked: number, presentCount: number): number {
  if (totalMarked <= 0) return 0;
  return Math.round((presentCount / totalMarked) * 100);
}

/**
 * Calculates GPA on a 4.0 scale based on exam results.
 * @param results Array of objects containing obtained marks and total marks.
 * @returns GPA rounded to 2 decimal places.
 */
export function calculateGPA(results: Array<{ marks_obtained: string | number; total_marks?: string | number }>): number {
  if (!results || results.length === 0) return 0;

  const totalPct = results.reduce((acc, r) => {
    const obtained = typeof r.marks_obtained === 'string' ? parseFloat(r.marks_obtained) : r.marks_obtained;
    const total = typeof r.total_marks === 'string' ? parseFloat(r.total_marks) : (r.total_marks ?? 100);
    
    if (isNaN(obtained as number) || isNaN(total as number) || total === 0) return acc;
    return acc + ((obtained as number) / (total as number));
  }, 0);

  return parseFloat(((totalPct / results.length) * 4).toFixed(2));
}

/**
 * Automatically calculates a grade based on percentage.
 */
export function autoGrade(marks: string | number, total: string | number | null): string {
  const m = typeof marks === 'string' ? parseFloat(marks) : marks;
  const t = typeof total === 'string' ? parseFloat(total) : (total ?? 100);
  
  if (isNaN(m) || isNaN(t as number) || t === 0) return "";
  
  const pct = (m / (t as number)) * 100;
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
}

/**
 * Validates that marks are within a sane range [0, total].
 */
export function validateMarks(marks: string | number, total: string | number): boolean {
  const m = typeof marks === 'string' ? parseFloat(marks) : marks;
  const t = typeof total === 'string' ? parseFloat(total) : total;
  
  if (isNaN(m) || isNaN(t)) return false;
  return m >= 0 && m <= t;
}
