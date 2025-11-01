# 🧭 HiCaptain Frontend Context

## 🪪 Project Overview
**HiCaptain** is a **Next.js-based Product and Project Management Platform** built for **Admins, Project Managers, Tech Workers, and Clients**.  
It serves as the frontend for a **Spring Boot** backend with a **MongoDB** database, offering dashboards for project tracking, analytics, Git integration, billing, time tracking, and client feedback.

---

## 🎨 Design System — Modern Minimal
**Design Language:** Clean, accessible, and professional.  
**Theme:** Light-first with dark mode support.  
**Layout:** Sidebar navigation + top navbar + card-based dashboards.  
**Typography:** Modern sans-serif (e.g., Inter, Poppins, or Manrope).  
**Visuals:** Smooth shadows, subtle gradients, high readability, and responsive grid layouts.

### UI Guidelines
- Neutral backgrounds with accent highlights  
- Rounded corners (8–12px radius)  
- Subtle depth through soft shadows  
- Light hover animations (scale/opacity)  
- Color-coded indicators for status and priority  
- Consistent padding and whitespace hierarchy  

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend Framework** | Next.js 15 (App Router) |
| **Styling** | Tailwind CSS |
| **State Management** | Zustand / Redux Toolkit |
| **Forms** | React Hook Form |
| **Data Fetching** | Axios / Next.js Server Actions |
| **Animations** | Framer Motion |
| **Icons** | Lucide-React / HeroIcons |
| **Charts** | Recharts / Chart.js |
| **Auth** | JWT-based (Spring Boot API) |
| **Backend** | Spring Boot (Java 17+) |
| **Database** | MongoDB |

---

## 🧩 Objectives
- Provide **role-based dashboards**  
- Manage **projects, tasks, and deadlines**  
- Integrate **GitHub**, **calendar**, and **payments**  
- Offer **time tracking**, **analytics**, and **reporting**  
- Ensure **secure authentication** and **responsive design**  
- Present an **intuitive user interface** optimized for productivity

---

## 👥 Roles & Dashboards

| Role | Dashboard | Description |
|------|------------|-------------|
| **Admin** | Admin Dashboard | Manage users, billing, and system analytics |
| **Project Manager** | PM Dashboard | Track progress, analyze delays, manage reports |
| **Tech Worker** | Tech Dashboard | Handle assigned tasks, time logs, commits |
| **Client** | Client Dashboard | View progress, invoices, and submit feedback |

---

## 📂 App Directory Structure

app/
├── layout.tsx # Global layout (navbar + sidebar)
├── page.tsx # Landing/Login page
├── role/ # Role selection
├── dashboard/
│ ├── admin/
│ ├── manager/
│ ├── tech/
│ └── client/
├── projects/
│ ├── page.tsx
│ └── [id]/
│ ├── page.tsx
│ └── kanban/
│ └── page.tsx
├── analytics/
├── invoices/
├── feedback/
├── schedule/
├── git/
├── notifications/
└── settings/


---

## 🧠 Global Components

| Category | Components |
|-----------|-------------|
| **Layout** | Sidebar, Navbar, Breadcrumbs, ThemeToggle |
| **UI Elements** | Button, Card, Modal, Badge, Tooltip, Input, Dropdown |
| **Data Display** | Table, ChartCard, StatWidget, ProgressBar |
| **Domain Specific** | KanbanBoard, TaskCard, InvoiceCard, TimeTracker, GitCommitList, FeedbackForm, Calendar |
| **Utility** | ToastProvider, Loader, ProtectedRoute, APIHandler |

---

## 🎨 Theme Tokens

```js
// tailwind.config.js (extend)
theme: {
  extend: {
    colors: {
      primary: '#3b82f6',        // Blue-500
      secondary: '#10b981',      // Green-500
      accent: '#f59e0b',         // Amber-500
      background: '#f9fafb',     // Neutral light background
      surface: '#ffffff',        // Card background
      border: '#e5e7eb',         // Light gray borders
      text: {
        primary: '#111827',
        secondary: '#6b7280',
      },
      success: '#22c55e',
      error: '#ef4444',
    },
  },
}
🌐 API Integration
Domain	Endpoint	Description
Auth	/api/auth	Login / Register / JWT
Users	/api/users	Manage user roles and profiles
Projects	/api/projects	CRUD for projects
Tasks	/api/tasks	CRUD + AI-based priority
Kanban	/api/kanban	Manage board columns and tasks
GitHub	/api/git	Commits, PRs, and branches
Calendar	/api/calendar	Schedule meetings and reminders
Invoices	/api/invoices	Billing and payment tracking
Analytics	/api/analytics	Dashboard metrics
Feedback	/api/feedback	Tickets and client feedback
Notifications	/api/notifications	Real-time alerts

Requests are managed in /lib/api.ts using Axios with JWT interceptors.

📊 Dashboard Metrics
Admin: User count, revenue, active sessions
Project Manager: Project timelines, delays, overall health
Tech Worker: Task progress, time logs, commits
Client: Delivery status, invoices, feedback tickets

Dashboards use dynamic widgets with auto-refresh via SWR or React Query.

🔐 Authentication Flow
User logs in → JWT returned by Spring Boot backend

Token stored securely (HTTP-only cookie or local state)

middleware.ts validates roles for route access

User redirected to /dashboard/{role}

⚡ Performance & UX
Page load time ≤ 3 seconds

API response time ≤ 200 ms

Responsive across all screen sizes

Compliant with WCAG 2.1 accessibility standards

Keyboard and screen-reader support

🧰 Development Standards
TypeScript throughout the codebase

ESLint + Prettier for consistent formatting

Modular, reusable React components

Framer Motion for smooth micro-interactions

Tailwind CSS for layout and styling

Deployed via Vercel; backend hosted on Render/AWS

✅ Deliverables
Fully responsive Next.js frontend

Functional role-based dashboards

Working Kanban, Analytics, Invoices, and Feedback modules

Integrated GitHub, Calendar, and Payments views

Connected to Spring Boot + MongoDB backend

Documented setup and API usage