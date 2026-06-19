import { TimetableEngine, TimetableInput } from '../lib/services/timetableEngine';

describe('TimetableEngine (Relaxation & Constraints)', () => {
  const getBaseInput = (): TimetableInput => ({
    settings: {
      daysOfWeek: ['Monday'],
      periodsPerDay: 4, // Very tight schedule
      breaks: [] // No breaks for simplicity
    },
    rooms: [
      { id: 'r1', type: 'normal', capacity: 40 }
    ],
    classes: [{ id: 'c1' }],
    sections: [{ id: 's1', class_id: 'c1', strength: 30 }],
    subjects: [
      { id: 'subj1', priority: 1, periods_per_week: 2, requires_lab: false, max_per_day: 1 },
      { id: 'subj2', priority: 2, periods_per_week: 3, requires_lab: false, max_per_day: 1 }
    ],
    teachers: [
      { id: 't1', unavailableSlots: [] },
      { id: 't2', unavailableSlots: [] }
    ],
    assignments: [
      { id: 'a1', teacher_id: 't1', class_id: 'c1', section_id: 's1', subject_id: 'subj1' },
      { id: 'a2', teacher_id: 't2', class_id: 'c1', section_id: 's1', subject_id: 'subj2' }
    ]
  });

  it('should successfully schedule a valid baseline scenario without relaxations', async () => {
    const input = getBaseInput();
    // 2 periods for subj1, 3 for subj2 -> Total 5 periods. 
    // Wait, only 4 periods available in 1 day! 
    // This will definitely trigger relaxation or fail. Let's make it fit.
    input.subjects[1].periods_per_week = 2; // Total 4 periods. Fits perfectly.
    
    const engine = new TimetableEngine(input);
    const result = await engine.generate();
    
    expect(result.isComplete).toBe(true);
    expect(result.relaxationLevel).toBe(0); // Baseline
    expect(result.unplacedLessons.length).toBe(0);
    expect(result.timetable.length).toBe(4);
  });

  it('should trigger relaxation (max_per_day) and succeed', async () => {
    const input = getBaseInput();
    // subj1 needs 2 periods. max_per_day is 1. In 1 day, it cannot fit without relaxation Level 2 (+1 max_per_day).
    input.subjects[0].periods_per_week = 2;
    input.subjects[1].periods_per_week = 2; // Total 4. Fits in 4 periods.
    
    const engine = new TimetableEngine(input);
    const result = await engine.generate();
    
    expect(result.isComplete).toBe(true);
    // Level 0: Fails (max_per_day violation)
    // Level 1 (Allow Gaps): Fails (max_per_day violation)
    // Level 2 (max_per_day + 1): Succeeds!
    expect(result.relaxationLevel).toBeGreaterThanOrEqual(2);
    expect(result.unplacedLessons.length).toBe(0);
  });

  it('should report unplaced lessons if truly impossible (over-constrained)', async () => {
    const input = getBaseInput();
    // We need 5 periods total, but there are only 4 periods per day on 1 day.
    // It is mathematically impossible to place all lessons, even with Level 3 relaxation.
    
    const engine = new TimetableEngine(input);
    const result = await engine.generate();
    
    expect(result.isComplete).toBe(false);
    expect(result.relaxationLevel).toBe(3); // Exhausted all relaxations
    expect(result.unplacedLessons.length).toBeGreaterThan(0);
    // 4 periods scheduled, 1 left out
    expect(result.timetable.length).toBe(4); 
    expect(result.unplacedLessons.length).toBe(1);
  });
});
