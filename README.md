# CraxNet Institutional OS - Product Requirements Document (PRD)

## 📌 Product Overview
CraxNet Institutional OS is a modern, cross-platform educational management system built on React Native (Expo) and Supabase. It serves as a centralized hub connecting Students, Teachers, and Administrators through highly tailored, glassmorphic "Institutional OS" interfaces. 

The application is built with a focus on real-time data, premium minimalist aesthetics, and mobile-first accessibility. It transitions traditional school management into a fluid, user-friendly digital experience.

---

## 🎯 Core Objectives
1. **Unify Stakeholders**: Provide distinct, secure, and fully functional dashboards for Admins, Teachers, and Students.
2. **Real-time Synchronization**: Utilize Supabase for instant updates on announcements, attendance, and assignments.
3. **Premium UX/UI**: Implement a minimalist, glassmorphic design system (The "Institutional OS" aesthetic) replacing clunky traditional ERP layouts.
4. **Platform Flexibility**: Seamlessly deployable across iOS, Android, and Web from a single codebase.

---

## 👤 User Roles & Dashboards

### 1. Student Dashboard (The "Student Portal")
**Objective**: Empower students with a clear, beautiful overview of their academic life, minimizing anxiety and maximizing engagement.

**Key Features:**
* **Dynamic ID Card & Avatar System**: A personalized banner displaying the student's name, class, and roll number, featuring an interactive Avatar selector offering 12 modern, South-Asian localized "Micah-style" vectors.
* **Real-time Analytics Grid**: Four minimalist stat cards displaying overall attendance, pending homework, upcoming exams, and active announcements.
* **"Today's Timetable" Widget**: Fetches the live daily schedule from the backend, filtering out past classes and highlighting active/upcoming periods.
* **Smart Bottom Navigation**: A persistent, beautifully styled bottom tab bar giving instant access to:
  * **Dashboard** (Home)
  * **Academics** (Resources & Study Materials)
  * **Announcements** (Notice Board)
  * **Schedule** (Full weekly timetable)
  * **Chat** (Direct communication with teachers)
* **Quick Actions**: Icon-based shortcuts for high-frequency tasks like *Bus Tracking* and *Pay Fees*.
* **Secure Logout**: Handled gracefully within the profile avatar modal.

### 2. Teacher Dashboard (The "Faculty Workspace")
**Objective**: Provide educators with frictionless tools to manage classrooms, grade students, and communicate without administrative overhead.

**Key Features:**
* **Teacher ID Card**: A glassmorphic banner showing Department, Employee ID, and a radial progress chart visualizing their classes' overall attendance rate.
* **Faculty Stats Grid**: Quick insights highlighting *Assigned Classes*, *Total Students*, *Pending Tasks*, and a live *Online Status* indicator.
* **Quick Actions Scroll**: Horizontal shortcuts to deeply integrated modules:
  * **Attendance Management** (Marking students present/absent)
  * **Assignments** (Creating and tracking homework)
  * **Resources** (Uploading syllabus and study materials)
  * **Messages** (Responding to student queries)
* **Live Notice Board**: A beautifully formatted feed of school-wide announcements with distinct date-badge UI.
* **Avatar & Profile Control**: Parity with the student portal, allowing teachers to select professional avatars.

### 3. Admin Dashboard (The "Command Center")
**Objective**: Give school administrators total, secure control over the ecosystem's data, users, and global communications.

**Key Features:**
* **Ecosystem Analytics**: High-level statistical overviews of the entire institution (Total revenue, active users, average attendance).
* **Role Management**: Secure creation, modification, and deletion of Student and Teacher accounts.
* **Class & Schedule Architect**: Tools to build class hierarchies and generate daily timetables.
* **Global Announcements**: A publishing engine to broadcast notices across the entire Institutional OS.
* **Security & Logs**: Access to system logs to ensure compliance and monitor unauthorized access attempts.

---

## 🚀 Future Roadmap (Upcoming Features)

We are constantly evolving CraxNet. The following features are slated for the next major release cycles:

1. **Live GPS Bus Tracking**: 
   * Integrating real-time geolocation so students and parents can track their assigned school bus on a live map within the app.
2. **Integrated Payment Gateway (Pay Fees)**: 
   * A seamless, secure module allowing parents to pay tuition and track invoice history directly through the dashboard.
3. **AI-Powered "God Stats" Analytics**:
   * Implementing machine learning to analyze student performance trends and predict academic momentum, alerting teachers to struggling students early.
4. **Interactive Exam Portal**:
   * Allowing teachers to construct and administer secure multiple-choice and short-answer quizzes directly within the app.
5. **Push Notification Infrastructure**:
   * Migrating from pull-based data updates to real-time push notifications for instant alerts on assignments and bus proximity.

---

## 🛠 Tech Stack
* **Frontend**: React Native, Expo, Expo Router
* **Backend/BaaS**: Supabase (PostgreSQL, Auth, Edge Functions)
* **Styling**: Vanilla React Native StyleSheet (Glassmorphic & Flat Vector focus)
* **State Management**: React Hooks & Context API
* **Icons & Assets**: Expo Vector Icons (Ionicons), Dicebear API (Local Assets)
