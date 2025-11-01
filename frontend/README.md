# HiCaptain Frontend

A modern Next.js-based project management platform frontend built for admins, project managers, developers, and clients.

## Features

- **Role-based Dashboards**: Tailored interfaces for different user roles
- **Project Management**: Create, track, and manage projects with kanban boards
- **Task Management**: Assign and monitor tasks with priorities and deadlines
- **Analytics**: Visual insights into project progress and team performance
- **Invoice Management**: Track billing and payments
- **Feedback System**: Client feedback collection and management
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Forms**: React Hook Form
- **Icons**: Lucide React
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend server running on port 8080

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file (already created):
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Dashboard pages
│   ├── projects/          # Project management pages
│   ├── analytics/         # Analytics and reports
│   ├── invoices/          # Invoice management
│   ├── feedback/          # Feedback system
│   ├── users/             # User management (Admin only)
│   ├── settings/          # User settings
│   ├── login/             # Authentication pages
│   └── register/
├── components/            # Reusable components
│   └── layout/           # Layout components
├── lib/                  # Utilities and configurations
├── services/             # API service functions
├── store/                # Zustand state management
├── types/                # TypeScript type definitions
└── middleware.ts         # Next.js middleware for auth
```

## Authentication

The app uses JWT-based authentication with the backend. Users can register and login with different roles:

- **Admin**: Full system access, user management
- **Project Manager**: Project oversight, analytics, team management
- **Developer**: Task management, time tracking
- **Client**: Project visibility, feedback submission

## API Integration

The frontend communicates with the Spring Boot backend through RESTful APIs:

- **Authentication**: `/auth/login`, `/auth/register`
- **Users**: `/users/*`
- **Projects**: `/projects/*`
- **Tasks**: `/tasks/*`
- **Invoices**: `/invoices/*`
- **Feedback**: `/feedback/*`

## Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint

## Usage

1. **Register/Login**: Create an account or login with existing credentials
2. **Dashboard**: View role-specific dashboard with key metrics
3. **Projects**: Create and manage projects, view details and kanban boards
4. **Tasks**: Assign tasks, set priorities and deadlines
5. **Analytics**: View project insights and performance metrics
6. **Invoices**: Track billing and payment status
7. **Feedback**: View and manage client feedback

## Deployment

Build the application:
```bash
npm run build
npm run start
```

Or deploy to platforms like Vercel, Netlify, or AWS.
