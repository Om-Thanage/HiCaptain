# HiCaptain - Full-Stack Project Management System

<div align="center">

![HiCaptain Logo](frontend/public/logo.png)

**A comprehensive project management platform with GitHub & Google Calendar integration**

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.2-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Next.js](https://img.shields.io/badge/Next.js-16.2.12-black.svg)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green.svg)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[Features](#-features) • [Tech Stack](#-tech-stack) • [Installation](#-installation) • [Documentation](#-documentation) • [Deployment](#-deployment)

</div>

---

## Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Docker Setup](#docker-setup)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [License](#-license)

---

## Overview

HiCaptain is a modern, full-stack project management system designed for software development teams. It provides comprehensive tools for managing projects, tasks, team members, and integrations with popular development tools like GitHub and Google Calendar.

### Key Highlights

**Role-Based Access Control** - Admin, Project Manager, Developer, and Client roles with granular permissions  
**Real-Time Analytics** - Track project progress, team performance, and resource allocation  
**GitHub Integration** - Sync repositories, track commits, and monitor pull requests  
**Google Calendar Sync** - Manage meetings and deadlines seamlessly  
**Multi-Channel Notifications** - Email, SMS, Push, and In-App notifications  
**Invoice & Payment Management** - Generate invoices and track payments  
**Time Tracking** - Log hours spent on tasks and projects  
**Responsive Design** - Works on desktop, tablet, and mobile devices  

---

## Features

### Core Features

#### User Management
- User registration and authentication with JWT
- Role-based access control (RBAC)
- User profile management
- Password encryption with BCrypt

#### Project Management
- Create and manage multiple projects
- Assign team members to projects
- Track project status and progress
- Set start and end dates
- Client assignment and management

#### Task Management
- Create tasks with priorities (Low, Medium, High, Critical)
- Set deadlines and track progress
- Assign tasks to team members
- Task categories (Frontend, Backend, Mobile, QA, etc.)
- Estimated vs actual hours tracking

####  Time Logging
- Log time spent on tasks
- Track billable and non-billable hours
- Generate time reports
- Export time logs

#### Analytics & Reporting
- Real-time project analytics
- Developer productivity metrics
- Project progress tracking
- Task completion rates
- Time utilization reports


### Integration Features

####  GitHub Integration
- OAuth authentication with GitHub
- Repository management
- Commit tracking
- Pull request monitoring
- Webhook support for real-time updates
- Branch and issue tracking

####  Google Calendar Integration
- OAuth authentication with Google
- Calendar event synchronization
- Meeting scheduling
- Deadline reminders
- Two-way sync

### Advanced Features

####  Financial Management
- Invoice generation
- Payment tracking
- Payment status management
- Client billing

####  Feedback System
- Client feedback collection
- Developer feedback submission
- Feedback status tracking
- Rating system

####  Security
- JWT token-based authentication
- Refresh token support
- Role-based authorization
- CORS configuration
- Secure password hashing
- Environment variable management



---

##  Tech Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Spring Boot** | 3.3.2 | Backend framework |
| **Java** | 17 | Programming language |
| **MongoDB** | 7.0 | NoSQL database |
| **Spring Security** | 6.3.1 | Authentication & authorization |
| **JWT (jjwt)** | 0.11.5 | Token-based authentication |
| **Lombok** | Latest | Reduce boilerplate code |
| **SpringDoc OpenAPI** | 2.3.0 | API documentation (Swagger) |
| **Maven** | 3.9+ | Build tool |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.2.12 | React framework |
| **React** | 19.2.8 | UI library |
| **TypeScript** | 5.x | Type-safe JavaScript |
| **Tailwind CSS** | 4.x | Utility-first CSS framework |
| **Zustand** | 5.0.1 | State management |
| **React Hook Form** | 7.53.2 | Form validation |
| **Zod** | 3.23.8 | Schema validation |
| **Axios** | 1.7.7 | HTTP client |
| **Recharts** | 2.12.7 | Data visualization |
| **Framer Motion** | 11.18.2 | Animations |
| **Lucide React** | 0.454.0 | Icon library |

### DevOps & Tools

| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Multi-container orchestration |
| **AWS EC2** | Cloud deployment |
| **MongoDB Atlas** | Cloud database |
| **GitHub Actions** | CI/CD pipeline |
| **Swagger UI** | API testing & documentation |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  (Next.js Frontend - React Components, State Management)    │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST API
                     │
┌────────────────────▼────────────────────────────────────────┐
│                    Application Layer                         │
│        (Spring Boot Backend - Controllers, Services)         │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Security  │  │  Integration │  │  Analytics   │      │
│  │   (JWT)     │  │  (GitHub/GCal)│  │  Service     │      │
│  └─────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────┬────────────────────────────────────────┘
                     │ MongoDB Driver
                     │
┌────────────────────▼────────────────────────────────────────┐
│                     Data Layer                               │
│              (MongoDB - Collections & Indexes)               │
└──────────────────────────────────────────────────────────────┘
```

---

##  Prerequisites

Before you begin, ensure you have the following installed:

### For Backend Development
- **Java 17** or higher ([Download](https://www.oracle.com/java/technologies/downloads/))
- **Maven 3.9+** ([Download](https://maven.apache.org/download.cgi))
- **MongoDB 7.0+** ([Download](https://www.mongodb.com/try/download/community)) or MongoDB Atlas account

### For Frontend Development
- **Node.js 18+** ([Download](https://nodejs.org/))
- **npm** or **yarn** (comes with Node.js)

### For Docker Deployment
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop))
- **Docker Compose** (included with Docker Desktop)

### Optional Tools
- **Postman** or **Insomnia** for API testing
- **MongoDB Compass** for database visualization
- **IntelliJ IDEA** or **VS Code** as IDE



---

##  Installation

### Backend Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/Om-Thanage/HiCaptain
cd hicaptain/backend
```

#### 2. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/hicaptain
MONGODB_DATABASE=hicaptain

# Security - JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long

# GitHub Integration (Optional)
GITHUB_TOKEN=your_github_token
GITHUB_API_BASE_URL=https://api.github.com
GITHUB_OAUTH_CLIENT_ID=your_github_oauth_client_id
GITHUB_OAUTH_CLIENT_SECRET=your_github_oauth_client_secret
GITHUB_OAUTH_REDIRECT_URI=http://localhost:8080/api/auth/github/callback
GITHUB_OAUTH_SCOPES=repo,read:user,user:email,admin:repo_hook

# Google Calendar Integration (Optional)
GOOGLE_CALENDAR_CREDENTIALS_FILE_PATH=/credentials.json
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8080/api/calendar/callback

# Server Configuration
SERVER_PORT=8080

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
```

#### 3. Install Dependencies

```bash
mvn clean install
```

#### 4. Run the Application

```bash
mvn spring-boot:run
```

The backend will start at `http://localhost:8080`

#### 5. Verify Installation

Open your browser and go to:
- API Root: http://localhost:8080/
- Swagger UI: http://localhost:8080/swagger-ui.html
- API Docs: http://localhost:8080/v3/api-docs

### Frontend Setup

#### 1. Navigate to Frontend Directory

```bash
cd ../frontend
```

#### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

#### 3. Configure Environment Variables (Optional)

Create a `.env.local` file in the `frontend` directory:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

#### 4. Run the Development Server

```bash
npm run dev
# or
yarn dev
```

The frontend will start at `http://localhost:3000`

#### 5. Build for Production

```bash
npm run build
npm start
# or
yarn build
yarn start
```

### Docker Setup

#### Option 1: Backend Only (Using Docker Hub Image)

```bash
# Pull the image
docker pull yourdockerhubusername/hicaptain-backend:latest

# Create .env file with your configuration
nano .env

# Run the container
docker run -d \
  --name hicaptain-backend \
  -p 8080:8080 \
  --env-file .env \
  --restart unless-stopped \
  yourdockerhubusername/hicaptain-backend:latest
```

#### Option 2: Build Docker Image Locally

```bash
cd backend

# Build the image
docker build -t hicaptain-backend:latest .

# Run the container
docker run -d \
  --name hicaptain-backend \
  -p 8080:8080 \
  --env-file .env \
  --restart unless-stopped \
  hicaptain-backend:latest
```

---

## ⚙️ Configuration

### MongoDB Setup

#### Option 1: Local MongoDB

Install MongoDB locally and ensure it's running on `localhost:27017`

```bash
# Start MongoDB
mongod

# Or using systemctl (Linux)
sudo systemctl start mongod
```

#### Option 2: MongoDB Atlas (Recommended)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster (M0)
3. Create a database user
4. Whitelist your IP address (or use 0.0.0.0/0 for all IPs)
5. Get the connection string and update `.env`:

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hicaptain
```

### GitHub OAuth Setup (Optional)

1. Go to GitHub Settings → Developer Settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the details:
   - Application name: `HiCaptain`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:8080/api/auth/github/callback`
4. Copy the Client ID and Client Secret to your `.env` file

### Google Calendar Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Download the credentials JSON file
6. Update `.env` with Client ID and Client Secret

---

##  Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
mvn spring-boot:run
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - MongoDB (if local):**
```bash
mongod
```

### Production Mode

**Backend:**
```bash
cd backend
mvn clean package
java -jar target/demo-0.0.1-SNAPSHOT.jar
```

**Frontend:**
```bash
cd frontend
npm run build
npm start
```

### Docker Mode

```bash
cd backend
docker-compose up -d
```

### Accessing the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **API Docs**: http://localhost:8080/v3/api-docs

### Default Credentials

The application comes with seeded test users:

| Role | Email | Password |
|------|-------|----------|
| Admin | sarah.mitchell@hicaptain.com | admin123 |
| Project Manager | michael.chen@hicaptain.com | pm123 |
| Developer | emma.thompson@hicaptain.com | dev123 |
| Client | robert.anderson@techcorp.com | client123 |

---

##  API Documentation

### Swagger UI

Interactive API documentation is available at: http://localhost:8080/swagger-ui.html

### Key Endpoints

#### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get JWT token

#### Users
- `GET /users` - Get all users (Admin, PM, Client only)
- `GET /users/{id}` - Get user by ID (Admin only)
- `PUT /users/{id}` - Update user (Admin only)
- `DELETE /users/{id}` - Delete user (Admin only)

#### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create project (Admin, PM only)
- `GET /api/projects/{id}` - Get project by ID
- `PUT /api/projects/{id}` - Update project (Admin, PM only)
- `DELETE /api/projects/{id}` - Delete project (Admin, PM only)

#### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create task (Admin, PM only)
- `GET /api/tasks/{id}` - Get task by ID
- `PUT /api/tasks/{id}` - Update task (Admin, PM, Dev)
- `DELETE /api/tasks/{id}` - Delete task (Admin, PM only)

#### Analytics
- `GET /api/analytics/overview` - Get analytics overview
- `GET /api/analytics/project/{projectId}` - Get project analytics
- `GET /api/analytics/developer/{userId}` - Get developer analytics

#### GitHub
- `GET /api/github/repositories` - Get user repositories
- `GET /api/github/commits/{repoName}` - Get repository commits
- `GET /api/github/pull-requests/{repoName}` - Get pull requests

#### Google Calendar
- `GET /api/google-calendar/events` - Get calendar events
- `POST /api/google-calendar/events` - Create calendar event
- `PUT /api/google-calendar/events/{eventId}` - Update event

For complete API documentation, visit the Swagger UI.



---

### Backend Testing

Run tests:
```bash
cd backend
mvn test
```

### Frontend Testing

```bash
cd frontend
npm run test
```

### API Testing with cURL

**Test Authentication:**
```bash
# Login
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sarah.mitchell@hicaptain.com","password":"admin123"}'

# Use the token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/users
```

---

##  Project Structure

```
hicaptain/
├── backend/                    # Spring Boot Backend
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/HiCaptain/demo/
│   │   │   │   ├── config/           # Configuration classes
│   │   │   │   ├── controller/       # REST controllers
│   │   │   │   ├── dto/              # Data Transfer Objects
│   │   │   │   ├── exception/        # Custom exceptions
│   │   │   │   ├── model/            # MongoDB entities
│   │   │   │   ├── repository/       # MongoDB repositories
│   │   │   │   ├── security/         # JWT & Security
│   │   │   │   ├── service/          # Business logic
│   │   │   │   └── util/             # Utility classes
│   │   │   └── resources/
│   │   │       └── application.properties
│   │   └── test/                     # Test files
│   ├── Dockerfile                    # Docker configuration
│   ├── docker-compose.yml            # Docker Compose setup
│   ├── pom.xml                       # Maven dependencies
│   └── .env                          # Environment variables
│
├── frontend/                   # Next.js Frontend
│   ├── src/
│   │   ├── app/                      # Next.js App Router
│   │   │   ├── auth/                 # Authentication pages
│   │   │   ├── dashboard/            # Dashboard pages
│   │   │   ├── projects/             # Project pages
│   │   │   ├── analytics/            # Analytics pages
│   │   │   └── layout.tsx            # Root layout
│   │   ├── components/               # React components
│   │   │   ├── dashboard/            # Dashboard components
│   │   │   ├── forms/                # Form components
│   │   │   └── layout/               # Layout components
│   │   ├── services/                 # API service calls
│   │   ├── store/                    # Zustand state management
│   │   ├── types/                    # TypeScript types
│   │   └── lib/                      # Utility functions
│   ├── public/                       # Static assets
│   ├── package.json                  # npm dependencies
│   ├── tailwind.config.js            # Tailwind CSS config
│   └── tsconfig.json                 # TypeScript config
│
├── .github/                    # GitHub workflows
├── README.md                   # This file
└── .gitignore                  # Git ignore rules
```

---

##  Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

---

##  License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**⭐ Star this repo if you find it helpful!**

</div>
