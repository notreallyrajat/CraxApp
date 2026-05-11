import { calculateAttendanceRate, calculateGPA, autoGrade, validateMarks } from '../lib/utils/calculations';

describe('Calculation Utilities', () => {
  describe('calculateAttendanceRate', () => {
    it('calculates correct percentage for standard values', () => {
      expect(calculateAttendanceRate(100, 80)).toBe(80);
      expect(calculateAttendanceRate(10, 7)).toBe(70);
    });

    it('handles rounding correctly', () => {
      expect(calculateAttendanceRate(3, 1)).toBe(33); // 33.333%
      expect(calculateAttendanceRate(3, 2)).toBe(67); // 66.666%
    });

    it('edge case: zero total marked returns 0', () => {
      expect(calculateAttendanceRate(0, 0)).toBe(0);
      expect(calculateAttendanceRate(0, 10)).toBe(0);
    });
  });

  describe('calculateGPA', () => {
    it('calculates correct GPA for standard values', () => {
      const results = [
        { marks_obtained: '80', total_marks: '100' }, // 0.8
        { marks_obtained: '90', total_marks: '100' }, // 0.9
      ];
      // (0.8 + 0.9) / 2 * 4 = 3.4
      expect(calculateGPA(results)).toBe(3.4);
    });

    it('handles different total marks', () => {
      const results = [
        { marks_obtained: 40, total_marks: 50 }, // 0.8
        { marks_obtained: 10, total_marks: 20 }, // 0.5
      ];
      // (0.8 + 0.5) / 2 * 4 = 1.3 / 2 * 4 = 2.6
      expect(calculateGPA(results)).toBe(2.6);
    });

    it('edge case: empty results returns 0', () => {
      expect(calculateGPA([])).toBe(0);
    });

    it('edge case: invalid marks handles gracefully', () => {
      const results = [
        { marks_obtained: 'abc', total_marks: 100 },
        { marks_obtained: 80, total_marks: 0 },
      ];
      expect(calculateGPA(results)).toBe(0);
    });
  });

  describe('autoGrade', () => {
    it('returns correct grades for standard percentages', () => {
      expect(autoGrade(95, 100)).toBe('A+');
      expect(autoGrade(85, 100)).toBe('A');
      expect(autoGrade(75, 100)).toBe('B');
      expect(autoGrade(65, 100)).toBe('C');
      expect(autoGrade(55, 100)).toBe('D');
      expect(autoGrade(45, 100)).toBe('F');
    });

    it('handles custom total marks', () => {
      expect(autoGrade(45, 50)).toBe('A+'); // 90%
      expect(autoGrade(25, 50)).toBe('D');   // 50%
    });

    it('edge case: invalid inputs return empty string', () => {
      expect(autoGrade('invalid', 100)).toBe('');
      expect(autoGrade(50, 0)).toBe('');
    });
  });

  describe('validateMarks', () => {
    it('returns true for valid marks', () => {
      expect(validateMarks(50, 100)).toBe(true);
      expect(validateMarks(0, 100)).toBe(true);
      expect(validateMarks(100, 100)).toBe(true);
    });

    it('returns false for marks out of range', () => {
      expect(validateMarks(101, 100)).toBe(false);
      expect(validateMarks(-1, 100)).toBe(false);
    });

    it('handles invalid numeric strings', () => {
      expect(validateMarks('abc', 100)).toBe(false);
    });
  });
});
