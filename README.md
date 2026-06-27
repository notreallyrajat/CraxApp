# School Management System (CraxNet App)

A modern, comprehensive, and scalable School Management System built with React Native (Expo) and Supabase. The platform provides dedicated portals for Administrators, Teachers, and Students, all wrapped in a sleek, "Institutional OS" glassmorphic design language.

## 🚀 Key Features

### 👑 Administrator Portal
The Admin dashboard is the command center for managing the entire school's operations.

* **Batch Student Onboarding:** Upload large batches of student data via CSV files. The system automatically provisions user accounts and handles complex edge cases like duplicate email handling.
* **Class & Section Management:** Create classes, organize them into sections, and define academic structures seamlessly.
* **Smart Subject Allocation ("Create Once, Use Forever"):** Add subjects to a global repository. When configuring new classes, simply select from existing subjects without having to type out identical names and codes repeatedly. The database structure cleanly supports multi-class subject mapping.
* **Advanced Student Enrollment:** 
  * Full-screen enrollment UI.
  * Real-time search by name or admission number.
  * Sort lists alphabetically or by Date of Birth (DOB).
  * Bulk selection tools to enroll entire cohorts at once.
  * **Strict Enrollment Rule:** The system automatically filters out students who are already enrolled elsewhere, guaranteeing that a student can mathematically only belong to one class at a time.
* **Teacher Management:** Assign teachers to specific subjects within sections and designate Class Teachers with specialized privileges.

### 🧑‍🏫 Teacher Portal
A highly functional, data-driven dashboard tailored for educators.

* **"Institutional OS" Aesthetics:** A clean, professional UI matching the premium student experience.
* **Attendance Management:** Class Teachers have exclusive permissions to seamlessly mark and manage attendance for their assigned classes.
* **Dynamic Timetables:** View personalized schedules and teaching assignments.
* **Personalized Avatars:** Local avatar selection and seamless account management.

### 🎓 Student Dashboard
A beautiful, engaging, and modern interface designed for the end-user.

* **Glassmorphic Design:** Vibrant colors, smooth gradients, and interactive micro-animations.
* **Live Chat & Messaging:** An integrated chat module with an Android-optimized UI that ensures smooth interaction without keyboard overlap issues.
* **Timetable Module:** Dynamic data fetching that displays the student's exact daily schedule based on their specific class and section enrollments.
* **Academic Records:** View examination results and performance metrics (currently seeded for testing).

## 🛠️ Technology Stack

* **Frontend:** React Native, Expo, Expo Router
* **Styling:** Custom Vanilla CSS & StyleSheet (Glassmorphism & Modern Web/App Aesthetics)
* **Backend:** Supabase (PostgreSQL Database)
* **Authentication:** Supabase Auth (JWT)
* **Cloud Logic:** Supabase Edge Functions (e.g., `manage-users` for secure role and account provisioning)
* **Data Processing:** PapaParse for client-side CSV parsing

## ⚙️ Architecture Highlights

* **Role-Based Access Control (RBAC):** Strict boundaries between Admin, Teacher, and Student routes.
* **Database Integrity:** Utilizes PostgreSQL unique constraints customized for multi-tenant mapping (e.g., allowing the same subject code across different classes while preventing true duplicates).
* **Cross-Platform Compatibility:** UI optimized for seamless operation on both Android and iOS devices, handling edge cases like virtual keyboards and safe area insets.
