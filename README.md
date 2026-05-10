# CraxNet Mobile: Advanced School Management Ecosystem

CraxNet is a high-performance, data-driven mobile application built for modern educational institutions. It provides a unified ecosystem for Administrators, Teachers, and Students to manage academic performance, institutional resources, and daily logistics with a premium, user-centric interface.

## 🚀 Key Features

### 🏛 Admin Command Center
- **Institutional Analytics**: High-level "God Statistics" covering attendance, enrollment, and live classroom activity.
- **Academic Momentum Engine**: Deep-dive student performance tracker with class-level drill-downs and trend analysis.
- **Management Suite**: Categorized controls for classes, teachers, student directory, and institutional resources.

### 🍎 Teacher Portal
- **Mark & Exam Management**: Digital entry for results with automated GPA calculations.
- **Attendance Tracking**: Real-time roll calls and session management.
- **Collaborative Hub**: Secure communication logs and shared resource distribution.

### 🎓 Student Experience
- **Performance Profile**: Visualized academic trends, mark history, and attendance records.
- **Resource Access**: Digital library and document management system.
- **Commute Tracking**: Real-time integration for school transportation (Roadmapped).

## 🛠 Tech Stack

- **Core Framework**: [Expo](https://expo.dev/) (SDK 50+) with [React Native](https://reactnative.dev/).
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) (v3) using Stack and Drawer (categorized) patterns.
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL) with Row Level Security (RLS).
- **Authentication**: Supabase Auth with persistent session management via `expo-secure-store`.
- **Styling**: Vanilla React Native StyleSheet with modern design principles (Glassmorphism, 3D Isometric assets).
- **State Management**: React Hooks (useState, useEffect) with real-time Supabase subscriptions.

## 📁 Project Structure

```text
├── app/                  # Expo Router directory (File-based routing)
│   ├── (admin)/          # Administrative portal modules
│   ├── (teacher)/        # Educator-specific interfaces
│   ├── (student)/        # Student performance & resource modules
│   └── index.tsx         # Unified Entry & Role-based redirection
├── assets/               # 3D Illustrations, icons, and branding
├── components/           # Reusable UI components (Analytics, ComingSoon, etc.)
├── lib/                  # Core services and configuration
│   ├── services/         # Data fetching (Stats, Exams, Teachers, etc.)
│   └── supabase.ts       # Supabase client initialization
└── constants/            # Global theme and styling tokens
```

## ⚙️ Prerequisites & Setup

1. **Node.js**: Version 18.x or higher.
2. **Expo CLI**: Installed globally (`npm install -g expo-cli`).
3. **Environment Variables**: Create a `.env` file in the root with the following keys:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. **Dependencies**: Run `npm install` to set up the environment.
5. **Start Dev Server**: Run `npx expo start` to launch the Metro Bundler.

## 🛣 Future Roadmap

The application includes high-fidelity, animated placeholders for the following upcoming modules:
- **🤖 AI Allotment**: Intelligent automated timetable and classroom orchestration.
- **🚌 Live Bus GPS**: Real-time coordinate tracking and ETA notifications.
- **💳 Online Fee Gateway**: Integrated digital payments and paperless history.

---
*Developed with a focus on data integrity, visual excellence, and institutional scalability.*
