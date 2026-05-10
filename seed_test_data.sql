-- SEED SCRIPT FOR CRAXNET SCHOOL ECOSYSTEM
-- USES INDIAN NAMES AND RANDOMIZED DATA FOR TESTING ANALYTICS

-- 1. Create Classes
INSERT INTO classes (id, name, section) VALUES
(uuid_generate_v4(), 'Grade 10', 'A'),
(uuid_generate_v4(), 'Grade 11', 'B'),
(uuid_generate_v4(), 'Grade 12', 'Science-C')
ON CONFLICT DO NOTHING;

-- 2. Create Admin & Teacher Profiles
-- Note: Replace '00000000-...' with actual auth IDs if you want to log in as them, 
-- or just use these for dashboard visualization.
INSERT INTO profiles (id, full_name, role, email) VALUES
(uuid_generate_v4(), 'Aditya Sharma', 'admin', 'aditya.admin@craxnet.com'),
(uuid_generate_v4(), 'Priya Iyer', 'teacher', 'priya.teacher@craxnet.com'),
(uuid_generate_v4(), 'Rajesh Kumar', 'teacher', 'rajesh.teacher@craxnet.com'),
(uuid_generate_v4(), 'Sneha Reddy', 'teacher', 'sneha.teacher@craxnet.com')
ON CONFLICT DO NOTHING;

-- 3. Create Student Profiles
INSERT INTO profiles (id, full_name, role, email) VALUES
(uuid_generate_v4(), 'Arjun Patel', 'student', 'arjun@student.com'),
(uuid_generate_v4(), 'Ananya Singh', 'student', 'ananya@student.com'),
(uuid_generate_v4(), 'Ishaan Gupta', 'student', 'ishaan@student.com'),
(uuid_generate_v4(), 'Diya Malhotra', 'student', 'diya@student.com'),
(uuid_generate_v4(), 'Kabir Das', 'student', 'kabir@student.com'),
(uuid_generate_v4(), 'Zoya Khan', 'student', 'zoya@student.com'),
(uuid_generate_v4(), 'Vivaan Rao', 'student', 'vivaan@student.com'),
(uuid_generate_v4(), 'Saanvi Joshi', 'student', 'saanvi@student.com'),
(uuid_generate_v4(), 'Aarav Mehta', 'student', 'aarav@student.com'),
(uuid_generate_v4(), 'Kyra Nair', 'student', 'kyra@student.com')
ON CONFLICT DO NOTHING;

-- 4. Map Students to Classes (Enrollments)
-- This logic takes all students and puts 3-4 in each class
INSERT INTO enrollments (student_id, class_id)
SELECT p.id, c.id 
FROM profiles p, classes c
WHERE p.role = 'student'
AND c.name = 'Grade 10'
LIMIT 4;

INSERT INTO enrollments (student_id, class_id)
SELECT p.id, c.id 
FROM profiles p, classes c
WHERE p.role = 'student'
AND p.id NOT IN (SELECT student_id FROM enrollments)
AND c.name = 'Grade 11'
LIMIT 3;

INSERT INTO enrollments (student_id, class_id)
SELECT p.id, c.id 
FROM profiles p, classes c
WHERE p.role = 'student'
AND p.id NOT IN (SELECT student_id FROM enrollments)
AND c.name = 'Grade 12'
LIMIT 3;

-- 5. Create Exam Subjects
INSERT INTO exam_subjects (id, name, total_marks, passing_marks) VALUES
(uuid_generate_v4(), 'Mathematics', 100, 35),
(uuid_generate_v4(), 'Science', 100, 35),
(uuid_generate_v4(), 'English', 100, 35),
(uuid_generate_v4(), 'History', 100, 35)
ON CONFLICT DO NOTHING;

-- 6. Generate Dummy Exam Results (Academic Momentum Testing)
-- This inserts random scores for all students in all subjects
INSERT INTO exam_results (student_id, subject_id, marks_obtained, exam_date)
SELECT p.id, s.id, floor(random() * (100-40+1) + 40), CURRENT_DATE - INTERVAL '1 month'
FROM profiles p, exam_subjects s
WHERE p.role = 'student';

-- 7. Generate Attendance Records (God Stats Testing)
-- This creates a week of attendance for every student
INSERT INTO attendance_records (student_id, class_id, status, date)
SELECT e.student_id, e.class_id, 
       CASE WHEN random() > 0.1 THEN 'present' ELSE 'absent' END,
       d::date
FROM enrollments e
CROSS JOIN generate_series(CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE, '1 day'::interval) AS d;

-- 8. Assign Teachers to Classes (Optional metadata)
-- Assuming you have a teacher_assignments or similar join table
-- INSERT INTO teacher_assignments (teacher_id, class_id) ...
