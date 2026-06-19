/**
 * timetableEngine.ts
 * Core timetable generation algorithm using backtracking constraint-satisfaction search.
 * Pure JS/TS, zero database dependencies, highly unit-testable.
 */

// Basic models for input
export interface TimetableSettings {
  daysOfWeek: string[];
  periodsPerDay: number;
  breaks: { after_period: number }[]; // 1-indexed (e.g., break after period 4)
}

export interface Room {
  id: string;
  type: 'normal' | 'lab';
  capacity: number;
}

export interface Section {
  id: string;
  class_id: string;
  strength: number;
}

export interface Subject {
  id: string;
  priority: number; // 1 (High) to 5 (Low)
  periods_per_week: number;
  requires_lab: boolean;
  max_per_day: number;
}

export interface Teacher {
  id: string;
  unavailableSlots: { day: string; periods: number[] }[]; // periods are 1-indexed
}

export interface TeacherAssignment {
  id: string;
  teacher_id: string;
  class_id: string;
  section_id?: string;
  subject_id: string;
}

export interface TimetableInput {
  settings: TimetableSettings;
  rooms: Room[];
  sections: Section[];
  subjects: Subject[];
  teachers: Teacher[];
  assignments: TeacherAssignment[];
}

export interface TimetableResult {
  isComplete: boolean;
  timetable: any[];
  unplacedLessons: any[];
  reason?: string;
  relaxationLevel?: number;
}

interface Lesson {
  id: string;
  assignment_id: string;
  teacher_id: string;
  class_id: string;
  section_id: string; // "whole_class" if null
  subject_id: string;
  priority: number;
  requires_lab: boolean;
  max_per_day: number;
  section_strength: number;
}

export class TimetableEngine {
  private startTime: number = 0;
  private readonly TIMEOUT_MS = 8000;
  private currentRelaxation: number = 0;
  private iterations: number = 0;
  private bestAssignments: any[] = [];
  
  // O(1) Lookups using Uint8Arrays. 0 = free, 1 = occupied
  private teacherGrid!: Record<string, Uint8Array>;
  private sectionGrid!: Record<string, Uint8Array>;
  private roomGrid!: Record<string, Uint8Array>;
  
  // Tracks how many times a subject is taught to a section on a given day to enforce max_per_day
  private subjectDayCount!: Record<string, Uint8Array>; // Key: "sectionId_subjectId", Array index: dayIndex

  private totalSlots: number = 0;
  private numDays: number = 0;
  private periodsPerDay: number = 0;
  private breakPeriods: Set<number> = new Set();
  
  private daysMap: Record<string, number> = {};

  private rooms: Room[] = [];

  constructor(private input: TimetableInput) {}

  public async generate(): Promise<TimetableResult> {
    const lessons = this.buildLessonList();
    this.sortLessonsByConstraint(lessons);

    // Retry loop for relaxations:
    // 0 = Strict (No Gaps, MaxPerDay strict, High priority mornings)
    // 1 = Allow Gaps
    // 2 = Allow maxPerDay + 1
    // 3 = Allow High Priority in afternoons
    for (let level = 0; level <= 3; level++) {
      this.currentRelaxation = level;
      this.startTime = Date.now();
      this.iterations = 0;
      this.bestAssignments = [];
      this.initGrids();

      const assignments: any[] = [];
      
      try {
        const success = await this.backtrack(lessons, 0, assignments);
        if (success) {
          return {
            isComplete: true,
            timetable: assignments,
            unplacedLessons: [],
            relaxationLevel: level,
            reason: level > 0 ? `Generated with relaxed constraints (Level ${level})` : undefined
          };
        }
      } catch (e: any) {
        if (e.message !== 'TIMEOUT') {
          throw e;
        }
      }

      // If we reach the last level, we return the best partial result
      if (level === 3) {
        return {
          isComplete: false,
          timetable: this.bestAssignments,
          unplacedLessons: lessons.slice(this.bestAssignments.length),
          relaxationLevel: level,
          reason: 'Hard timeout or search exhausted at max relaxation.'
        };
      }
    }
    throw new Error('Unexpected generator end');
  }

  private initGrids() {
    this.numDays = this.input.settings.daysOfWeek.length;
    this.periodsPerDay = this.input.settings.periodsPerDay;
    this.totalSlots = this.numDays * this.periodsPerDay;
    
    this.input.settings.daysOfWeek.forEach((d, i) => { this.daysMap[d] = i; });
    this.input.settings.breaks.forEach(b => this.breakPeriods.add(b.after_period - 1)); // 0-indexed period where break slot would theoretically map

    this.rooms = this.input.rooms;

    this.teacherGrid = {};
    this.sectionGrid = {};
    this.roomGrid = {};
    this.subjectDayCount = {};

    this.input.teachers.forEach(t => {
      this.teacherGrid[t.id] = new Uint8Array(this.totalSlots);
      // Pre-fill unavailable slots
      t.unavailableSlots?.forEach(un => {
        const dIdx = this.daysMap[un.day];
        if (dIdx !== undefined) {
          un.periods.forEach(p => {
            if (p >= 1 && p <= this.periodsPerDay) {
              this.teacherGrid[t.id][dIdx * this.periodsPerDay + (p - 1)] = 1;
            }
          });
        }
      });
    });

    this.input.sections.forEach(s => {
      this.sectionGrid[s.id] = new Uint8Array(this.totalSlots);
    });
    // Add "whole_class" generic grids for classes
    const classIds = [...new Set(this.input.sections.map(s => s.class_id))];
    classIds.forEach(cId => {
      this.sectionGrid[`class_${cId}`] = new Uint8Array(this.totalSlots);
    });

    this.rooms.forEach(r => {
      this.roomGrid[r.id] = new Uint8Array(this.totalSlots);
    });
  }

  private buildLessonList(): Lesson[] {
    const lessons: Lesson[] = [];
    const subjectMap = new Map(this.input.subjects.map(s => [s.id, s]));
    const sectionMap = new Map(this.input.sections.map(s => [s.id, s]));

    this.input.assignments.forEach(assign => {
      const subj = subjectMap.get(assign.subject_id);
      if (!subj) return;

      // Calculate strength
      let strength = 0;
      if (assign.section_id) {
        strength = sectionMap.get(assign.section_id)?.strength || 0;
      } else {
        // Whole class assignment
        strength = this.input.sections
          .filter(s => s.class_id === assign.class_id)
          .reduce((sum, s) => sum + s.strength, 0);
      }

      for (let i = 0; i < subj.periods_per_week; i++) {
        lessons.push({
          id: `${assign.id}_${i}`,
          assignment_id: assign.id,
          teacher_id: assign.teacher_id,
          class_id: assign.class_id,
          section_id: assign.section_id || `class_${assign.class_id}`,
          subject_id: subj.id,
          priority: subj.priority,
          requires_lab: subj.requires_lab,
          max_per_day: subj.max_per_day,
          section_strength: strength
        });
      }
    });
    return lessons;
  }

  private sortLessonsByConstraint(lessons: Lesson[]) {
    // Calculate teacher loads for scarcity
    const teacherLoad: Record<string, number> = {};
    lessons.forEach(l => {
      teacherLoad[l.teacher_id] = (teacherLoad[l.teacher_id] || 0) + 1;
    });

    lessons.sort((a, b) => {
      // 1. Priority (lower number = higher priority = handled first)
      if (a.priority !== b.priority) return a.priority - b.priority;
      
      // 2. Requires Lab (Harder to place, do first)
      if (a.requires_lab && !b.requires_lab) return -1;
      if (!a.requires_lab && b.requires_lab) return 1;

      // 3. Teacher Scarcity (Descending load = harder to place)
      return (teacherLoad[b.teacher_id] || 0) - (teacherLoad[a.teacher_id] || 0);
    });
  }

  private checkSlot(lesson: Lesson, slotId: number, dayIndex: number, periodIndex: number, candidateRooms: Room[]): string | null {
    // 1. Check breaks
    if (this.breakPeriods.has(periodIndex)) return null;

    // 2. Check max_per_day
    const subjKey = `${lesson.section_id}_${lesson.subject_id}`;
    const maxAllowed = lesson.max_per_day + (this.currentRelaxation >= 2 ? 1 : 0);
    if (this.subjectDayCount[subjKey] && this.subjectDayCount[subjKey][dayIndex] >= maxAllowed) return null;

    // 3. Level 3 Relaxation: Morning preference for high priority
    if (this.currentRelaxation < 3 && lesson.priority <= 2) {
      if (periodIndex >= Math.floor(this.periodsPerDay / 2)) {
        return null; // Force morning
      }
    }

    // 4. Check Teacher & Section Grid
    if (this.teacherGrid[lesson.teacher_id][slotId] !== 0) return null;
    
    const sectionIdsToCheck = lesson.section_id.startsWith('class_') 
      ? this.input.sections.filter(s => s.class_id === lesson.section_id.split('_')[1]).map(s => s.id)
      : [lesson.section_id];

    for (const secId of sectionIdsToCheck) {
      if (this.sectionGrid[secId][slotId] !== 0) return null;
      
      // Level 1 Relaxation: No Gaps (must be earliest available slot)
      if (this.currentRelaxation < 1) {
        let earliestFree = -1;
        for (let p = 0; p < this.periodsPerDay; p++) {
          if (!this.breakPeriods.has(p) && this.sectionGrid[secId][dayIndex * this.periodsPerDay + p] === 0) {
            earliestFree = p;
            break;
          }
        }
        if (earliestFree !== -1 && periodIndex > earliestFree) return null;
      }
    }

    // 5. Available Room
    for (const room of candidateRooms) {
      if (this.roomGrid[room.id][slotId] === 0) {
        return room.id;
      }
    }
    return null;
  }

  private getValidSlots(lesson: Lesson): { slotId: number; roomId: string }[] {
    const validSlots: { slotId: number; roomId: string }[] = [];
    const subjKey = `${lesson.section_id}_${lesson.subject_id}`;

    // Lazy init subject day tracker
    if (!this.subjectDayCount[subjKey]) {
      this.subjectDayCount[subjKey] = new Uint8Array(this.numDays);
    }

    const reqType = lesson.requires_lab ? 'lab' : 'normal';
    const candidateRooms = this.rooms.filter(r => r.type === reqType && r.capacity >= lesson.section_strength);

    for (let slotId = 0; slotId < this.totalSlots; slotId++) {
      const dayIndex = Math.floor(slotId / this.periodsPerDay);
      const periodIndex = slotId % this.periodsPerDay;

      const roomId = this.checkSlot(lesson, slotId, dayIndex, periodIndex, candidateRooms);
      if (roomId) {
        validSlots.push({ slotId, roomId });
      }
    }
    return validSlots;
  }

  private hasAnyValidSlot(lesson: Lesson): boolean {
    const reqType = lesson.requires_lab ? 'lab' : 'normal';
    const candidateRooms = this.rooms.filter(r => r.type === reqType && r.capacity >= lesson.section_strength);
    
    for (let slotId = 0; slotId < this.totalSlots; slotId++) {
      const dayIndex = Math.floor(slotId / this.periodsPerDay);
      const periodIndex = slotId % this.periodsPerDay;
      if (this.checkSlot(lesson, slotId, dayIndex, periodIndex, candidateRooms)) {
        return true;
      }
    }
    return false;
  }

  private orderSlotsByPreference(slots: { slotId: number; roomId: string }[], priority: number) {
    if (priority <= 2) {
      // High priority subjects: Prefer earlier periods
      slots.sort((a, b) => {
        const pA = a.slotId % this.periodsPerDay;
        const pB = b.slotId % this.periodsPerDay;
        return pA - pB;
      });
    } else {
      // Low priority: Shuffle or keep as is. Shuffling helps distribute load.
      for (let i = slots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [slots[i], slots[j]] = [slots[j], slots[i]];
      }
    }
  }

  private async backtrack(lessons: Lesson[], index: number, assignments: any[]): Promise<boolean> {
    this.iterations++;
    // Yield to JS Thread every 250 iterations to prevent UI freeze
    if (this.iterations % 250 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    if (Date.now() - this.startTime > this.TIMEOUT_MS) {
      throw new Error('TIMEOUT');
    }

    if (assignments.length > this.bestAssignments.length) {
      this.bestAssignments = [...assignments];
    }

    if (index === lessons.length) {
      return true; // All lessons placed
    }

    // Forward Checking
    for (let i = index + 1; i < lessons.length; i++) {
      if (!this.hasAnyValidSlot(lessons[i])) {
        return false; // Prune branch early
      }
    }

    const lesson = lessons[index];
    const candidateSlots = this.getValidSlots(lesson);
    
    this.orderSlotsByPreference(candidateSlots, lesson.priority);

    for (const { slotId, roomId } of candidateSlots) {
      // Apply constraints
      const dayIndex = Math.floor(slotId / this.periodsPerDay);
      const subjKey = `${lesson.section_id}_${lesson.subject_id}`;
      
      this.teacherGrid[lesson.teacher_id][slotId] = 1;
      this.roomGrid[roomId][slotId] = 1;
      this.subjectDayCount[subjKey][dayIndex] += 1;

      // Handle section grid marking (whole class vs specific)
      const relatedSectionIds: string[] = [];
      if (lesson.section_id.startsWith('class_')) {
        const cId = lesson.section_id.split('_')[1];
        this.input.sections.filter(s => s.class_id === cId).forEach(s => {
          this.sectionGrid[s.id][slotId] = 1;
          relatedSectionIds.push(s.id);
        });
      } else {
        this.sectionGrid[lesson.section_id][slotId] = 1;
        relatedSectionIds.push(lesson.section_id);
      }

      // Record Assignment
      assignments.push({
        lesson_id: lesson.id,
        assignment_id: lesson.assignment_id,
        teacher_id: lesson.teacher_id,
        class_id: lesson.class_id,
        section_id: lesson.section_id.startsWith('class_') ? null : lesson.section_id,
        subject_id: lesson.subject_id,
        room_id: roomId,
        day: this.input.settings.daysOfWeek[dayIndex],
        period: (slotId % this.periodsPerDay) + 1
      });

      // Recurse
      if (await this.backtrack(lessons, index + 1, assignments)) {
        return true;
      }

      // Undo constraints (Backtrack)
      assignments.pop();
      this.teacherGrid[lesson.teacher_id][slotId] = 0;
      this.roomGrid[roomId][slotId] = 0;
      this.subjectDayCount[subjKey][dayIndex] -= 1;
      relatedSectionIds.forEach(id => {
        this.sectionGrid[id][slotId] = 0;
      });
    }

    return false; // Trigger backtracking to previous level
  }
}
