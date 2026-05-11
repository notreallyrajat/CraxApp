# CraxNet Mobile: Advanced School Management Ecosystem

CraxNet is a high-performance, data-driven mobile application built for modern educational institutions. It provides a unified ecosystem for Administrators, Teachers, and Students to manage academic performance, institutional resources, and daily logistics with a premium, user-centric interface.

## 🚀 Key Features

### 🏛 Admin Command Center
- **Institutional Analytics**: High-level "God Statistics" covering attendance, enrollment, and live classroom activity.
- **User Management**: Integrated creation and management of Students and Teachers directly from the mobile interface.
- **Academic Momentum Engine**: Deep-dive student performance tracker with class-level drill-downs and trend analysis.
- **Management Suite**: Categorized controls for classes, teachers, student directory, and institutional resources.

### 🍎 Teacher Portal
- **Mark & Exam Management**: Digital entry for results with automated GPA calculations.
- **Attendance Tracking**: Real-time roll calls and session management.
- **Collaborative Hub**: Secure communication logs and shared resource distribution.

### 🎓 Student Experience
- **Performance Profile**: Visualized academic trends, mark history, and attendance records.
- **AI-Powered Chat**: Intelligent assistant for academic queries and institutional information.
- **Resource Access**: Digital library and document management system.

## 🛠 Tech Stack

- **Core Framework**: [Expo](https://expo.dev/) (SDK 54) with [React Native](https://reactnative.dev/).
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) (v4) using Stack, Tabs, and Drawer patterns.
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL) with Row Level Security (RLS).
- **AI Integration**: OpenAI GPT-4o and Groq LPU integration for intelligent chat and data analysis.
- **Authentication**: Supabase Auth with persistent session management via `expo-secure-store`.
- **Styling**: Vanilla React Native StyleSheet with modern design principles (Glassmorphism, 3D Isometric assets).

## 📁 Project Structure

```text
├── app/                  # Expo Router directory (File-based routing)
│   ├── (admin)/          # Administrative portal modules (Analytics, Records, Management)
│   ├── (teacher)/        # Educator-specific interfaces (Attendance, Marks)
│   ├── (student)/        # Student performance & AI Chat modules
│   ├── (auth)/           # Authentication flows (Login, Forgot Password)
│   ├── _layout.tsx       # Root layout with providers (GestureHandler, Auth)
│   └── index.tsx         # Unified Entry & Role-based redirection
├── assets/               # 3D Illustrations, icons, and branding
├── components/           # Reusable UI components (Analytics, AI Chat, etc.)
├── lib/                  # Core services and configuration
│   ├── services/         # Data fetching & Business logic
│   └── supabase.ts       # Supabase client initialization
├── constants/            # Global theme and styling tokens
└── supabase/             # Edge Functions and DB configurations
```

## ⚙️ Prerequisites & Setup

1. **Node.js**: Version 18.x or higher.
2. **Expo CLI**: Installed globally (`npm install -g expo-cli`).
3. **Environment Variables**: Create a `.env` file in the root with the following keys:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_OPENAI_API_KEY=your_openai_key
   EXPO_PUBLIC_GROQ_API_KEY=your_groq_key
   ```
4. **Dependencies**: Run `npm install` to set up the environment.
5. **Start Dev Server**: Run `npx expo start` to launch the Metro Bundler.

## 🛣 Future Roadmap

- **🚌 Live Bus GPS**: Real-time coordinate tracking and ETA notifications.
- **💳 Online Fee Gateway**: Integrated digital payments and paperless history.
- **📈 Advanced Predictive Analytics**: AI-driven student success forecasting.

---
*Developed with a focus on data integrity, visual excellence, and institutional scalability.*
