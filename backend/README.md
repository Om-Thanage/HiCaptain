# HiCaptain Backend

A comprehensive project management system built with Spring Boot, featuring GitHub and Google Calendar integration, JWT authentication, and real-time analytics.

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.7-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-17-orange.svg)](https://www.oracle.com/java/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Latest-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
- [Authentication](#-authentication)
- [Testing](#-testing)
- [Best Practices](#-best-practices)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 Features

### Core Features
- **User Management** - Role-based access control (Admin, Project Manager, Developer, Client)
- **Project Management** - Create, update, and track projects with team assignments
- **Task Management** - Comprehensive task tracking with deadlines, priorities, and progress
- **Time Logging** - Track time spent on tasks and projects
- **Analytics Dashboard** - Real-time project and developer analytics
- **Notifications** - Multi-channel notification system (Email, SMS, Push, In-App)

### Integrations
- **GitHub Integration** - OAuth authentication, repository management, commit tracking, PR monitoring
- **Google Calendar** - Event synchronization, meeting scheduling
- **Payment Processing** - Invoice generation and payment tracking

### Advanced Features
- **JWT Authentication** - Secure token-based authentication
- **Bean Validation** - Automatic request validation with detailed error messages
- **Global Exception Handling** - Consistent error responses across all endpoints
- **Slf4j Logging** - Production-ready logging infrastructure
- **API Documentation** - Interactive Swagger/OpenAPI documentation
- **Environment Configuration** - Secure secret management with environment variables

### Security
- ✅ JWT token-based authentication
- ✅ Role-based authorization
- ✅ Password encryption with BCrypt
- ✅ CORS configuration
- ✅ Secure secret management

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Spring Boot 3.5.7** | Backend framework |
| **Java 17** | Programming language |
| **MongoDB** | NoSQL database |
| **Spring Security** | Authentication & authorization |
| **JWT (jjwt 0.11.5)** | Token-based authentication |
| **Lombok** | Reduce boilerplate code |
| **SpringDoc OpenAPI 2.3.0** | API documentation (Swagger) |
| **GitHub API** | GitHub integration |
| **Google Calendar API** | Calendar integration |
| **Slf4j** | Logging framework |
| **Maven** | Build tool |

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Java 17** or higher ([Download](https://www.oracle.com/java/technologies/downloads/))
- **Maven 3.6+** ([Download](https://maven.apache.org/download.cgi))
- **MongoDB 4.4+** ([Download](https://www.mongodb.com/try/download/community))
- **Git** ([Download](https://git-scm.com/downloads))

### Optional
- **Postman** or **Insomnia** for API testing
- **MongoDB Compass** for database visualization
- **IntelliJ IDEA** or **Eclipse** as IDE

---

## 📥 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Om-Thanage/HiCaptain.git
cd HiCaptain/backend
```

### 2. Install MongoDB

**On Windows:**
```bash
# Download and install from: https://www.mongodb.com/try/download/community
# Start MongoDB service
net start MongoDB
```

**On macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**On Linux:**
```bash
sudo apt-get install mongodb
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 3. Verify MongoDB is Running

```bash
mongo --version
# or
mongosh --version
```

---

## ⚙️ Configuration

### 1. Environment Variables Setup

Copy the example environment file:

```bash
cp .env.example .env
```

### 2. Configure Environment Variables

Edit the `.env` file with your actual credentials:

```properties
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/hicaptain
MONGODB_DATABASE=hicaptain

# Security - JWT
JWT_SECRET=your-jwt-secret-key-here-minimum-256-bits

# GitHub Integration
GITHUB_TOKEN=your-github-personal-access-token
GITHUB_API_BASE_URL=https://api.github.com

# GitHub OAuth App Configuration
GITHUB_OAUTH_CLIENT_ID=your-github-oauth-client-id
GITHUB_OAUTH_CLIENT_SECRET=your-github-oauth-client-secret
GITHUB_OAUTH_REDIRECT_URI=http://localhost:8080/api/auth/github/callback
GITHUB_OAUTH_SCOPES=repo,read:user,user:email,admin:repo_hook

# Google Calendar Integration
GOOGLE_CALENDAR_CREDENTIALS_FILE_PATH=/credentials.json

# Server Configuration
SERVER_PORT=8080
```

### 3. Generate JWT Secret

Generate a secure random string (256 bits):

```bash
# On Linux/macOS
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### 4. GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Click "Generate new token"
3. Select scopes: `repo`, `read:user`, `user:email`, `admin:repo_hook`
4. Copy the token to your `.env` file

### 5. GitHub OAuth App Setup

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name:** HiCaptain
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:8080/api/auth/github/callback`
4. Copy Client ID and Client Secret to your `.env` file

### 6. Google Calendar API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google Calendar API
4. Create credentials (OAuth 2.0 Client ID)
5. Download the `credentials.json` file
6. Place it in `src/main/resources/credentials.json`

---

## 🚀 Running the Application

### Using Maven

```bash
# Clean and install dependencies
./mvnw clean install

# Run the application
./mvnw spring-boot:run
```

### Using Maven (Windows)

```bash
mvnw.cmd clean install
mvnw.cmd spring-boot:run
```

### Using IDE

1. Open the project in IntelliJ IDEA or Eclipse
2. Wait for Maven to download dependencies
3. Run `BackendApplication.java`

### Verify the Application is Running

```bash
curl http://localhost:8080/actuator/health
```

Expected response:
```json
{"status":"UP"}
```

---

## 📚 API Documentation

### Swagger UI (Interactive)

Once the application is running, access the interactive API documentation:

**🔗 [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)**

### OpenAPI JSON

Access the raw OpenAPI specification:

**🔗 [http://localhost:8080/api-docs](http://localhost:8080/api-docs)**

### Features of Swagger UI:
- ✅ Try out APIs directly from the browser
- ✅ View request/response schemas
- ✅ JWT authentication support
- ✅ Detailed parameter descriptions
- ✅ Example values for all endpoints

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── main/
│   │   ├── java/com/HiCaptain/demo/
│   │   │   ├── config/          # Configuration classes
│   │   │   │   ├── CorsConfig.java
│   │   │   │   ├── SecurityConfig.java
│   │   │   │   ├── OpenApiConfig.java
│   │   │   │   ├── GitHubConfig.java
│   │   │   │   └── GoogleCalendarConfig.java
│   │   │   ├── controller/      # REST Controllers
│   │   │   │   ├── AuthController.java
│   │   │   │   ├── ProjectController.java
│   │   │   │   ├── TaskController.java
│   │   │   │   ├── UserController.java
│   │   │   │   ├── GitHubController.java
│   │   │   │   ├── GoogleCalendarController.java
│   │   │   │   └── ... (more controllers)
│   │   │   ├── dto/             # Data Transfer Objects
│   │   │   │   ├── AuthRequest.java
│   │   │   │   ├── AuthResponse.java
│   │   │   │   ├── ErrorResponse.java
│   │   │   │   └── TaskRequest.java
│   │   │   ├── exception/       # Custom Exceptions
│   │   │   │   ├── GlobalExceptionHandler.java
│   │   │   │   ├── ResourceNotFoundException.java
│   │   │   │   ├── BadRequestException.java
│   │   │   │   └── UnauthorizedException.java
│   │   │   ├── model/           # Domain Models
│   │   │   │   ├── User.java
│   │   │   │   ├── Project.java
│   │   │   │   ├── Task.java
│   │   │   │   └── ... (more models)
│   │   │   ├── repository/      # MongoDB Repositories
│   │   │   │   ├── UserRepository.java
│   │   │   │   ├── ProjectRepository.java
│   │   │   │   └── ... (more repositories)
│   │   │   ├── security/        # Security Components
│   │   │   │   └── JwtAuthFilter.java
│   │   │   ├── service/         # Business Logic
│   │   │   │   ├── UserService.java
│   │   │   │   ├── ProjectService.java
│   │   │   │   ├── TaskService.java
│   │   │   │   ├── JwtService.java
│   │   │   │   └── ... (more services)
│   │   │   ├── util/            # Utility Classes
│   │   │   │   └── Role.java
│   │   │   └── BackendApplication.java
│   │   └── resources/
│   │       ├── application.properties
│   │       └── credentials.json
│   └── test/                    # Test Classes
├── .env                         # Environment variables (not committed)
├── .env.example                 # Environment variables template
├── .gitignore
├── pom.xml                      # Maven configuration
├── README.md                    # This file
└── Agents.md                    # Detailed documentation
```

---

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login and get JWT token | No |

### Users

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users` | Get all users | Yes |
| GET | `/users/{id}` | Get user by ID | Yes |
| GET | `/users/role/{role}` | Get users by role | Yes |
| PUT | `/users/{id}` | Update user | Yes |
| DELETE | `/users/{id}` | Delete user | Yes (Admin) |

### Projects

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/projects` | Get all projects (filtered by role) | Yes |
| GET | `/projects/{id}` | Get project by ID | Yes |
| GET | `/projects/my` | Get my projects | Yes |
| POST | `/projects` | Create new project | Yes (Admin/PM) |
| POST | `/projects/{projectId}/developers/{developerId}` | Add developer to project | Yes (Admin/PM) |
| PUT | `/projects/{id}` | Update project | Yes (Admin/PM) |
| DELETE | `/projects/{id}` | Delete project | Yes (Admin/PM) |

### Tasks

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/tasks` | Get all tasks | Yes (Admin/PM) |
| GET | `/tasks/{id}` | Get task by ID | Yes |
| GET | `/tasks/project/{projectId}` | Get tasks by project | Yes |
| POST | `/tasks` | Create new task | Yes (Admin/PM) |
| PUT | `/tasks/{id}` | Update task | Yes |
| DELETE | `/tasks/{id}` | Delete task | Yes (Admin/PM) |

### GitHub

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/github/oauth/authorize` | Start GitHub OAuth flow | No |
| GET | `/github/oauth/callback` | GitHub OAuth callback | No |
| GET | `/github/repos` | Get user's repositories | Yes |
| GET | `/github/repos/{owner}/{repo}/commits` | Get repository commits | Yes |
| GET | `/github/repos/{owner}/{repo}/pullrequests` | Get pull requests | Yes |

### Analytics

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/analytics/overview` | Get analytics overview | Yes |
| GET | `/analytics/project/{projectId}` | Get project analytics | Yes |
| GET | `/analytics/developer/{developerId}` | Get developer analytics | Yes |
| GET | `/analytics/task-distribution` | Get task distribution | Yes |

### Additional Features

- **Time Logs** - `/timelogs/*`
- **Meetings** - `/meetings/*`
- **Notifications** - `/notifications/*`
- **Invoices** - `/invoices/*`
- **Payments** - `/payments/*`
- **Feedback** - `/feedback/*`
- **Google Calendar** - `/calendar/*`

**📖 For complete API documentation with request/response examples, visit [Swagger UI](http://localhost:8080/swagger-ui.html)**

---

## 🔐 Authentication

### 1. Register a New User

```bash
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword123",
    "role": "Developer"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3. Use JWT Token in Requests

```bash
curl -X GET http://localhost:8080/projects \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JWT Token Details

- **Expiration:** 24 hours (configurable)
- **Algorithm:** HS256
- **Contains:** User ID and Role
- **Header Format:** `Authorization: Bearer <token>`

---

## 🧪 Testing

### Run All Tests

```bash
./mvnw test
```

### Run with Coverage

```bash
./mvnw test jacoco:report
```

View coverage report: `target/site/jacoco/index.html`

### Test Specific Class

```bash
./mvnw test -Dtest=ProjectServiceTest
```

### Manual API Testing

**Using Swagger UI:**
1. Go to [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
2. Click "Authorize" button
3. Enter JWT token: `Bearer <your-token>`
4. Test APIs interactively

**Using Postman:**
1. Import the OpenAPI spec from [http://localhost:8080/api-docs](http://localhost:8080/api-docs)
2. Set Authorization header: `Bearer <your-token>`
3. Make requests

---

## ✅ Best Practices

This project follows Spring Boot best practices:

### ✅ Security
- Environment-based secret management (no hardcoded secrets)
- JWT token authentication
- Password encryption with BCrypt
- Role-based authorization

### ✅ Code Quality
- Slf4j logging (no System.out.println)
- Bean Validation (@Valid annotations)
- Global exception handling (@ControllerAdvice)
- Constructor injection with Lombok
- Meaningful naming conventions

### ✅ Architecture
- Layered architecture (Controller → Service → Repository)
- DTOs for data transfer
- Custom exceptions for error handling
- Separation of concerns

### ✅ Documentation
- Comprehensive README
- Swagger/OpenAPI documentation
- Inline code comments
- Detailed error messages

### ✅ Development
- Environment-specific configuration
- Maven for dependency management
- Git for version control
- .gitignore for sensitive files

**📖 For detailed best practices documentation, see [Agents.md](./Agents.md)**

---

## 🐛 Troubleshooting

### MongoDB Connection Error

```
Error: MongoSocketException: Connection refused
```

**Solution:**
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod
```

### Port Already in Use

```
Error: Port 8080 is already in use
```

**Solution:**
```bash
# Change port in .env file
SERVER_PORT=8081

# Or kill the process using port 8080
# On Windows:
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# On Linux/macOS:
lsof -i :8080
kill -9 <PID>
```

### JWT Secret Error

```
Error: JWT secret key must be at least 256 bits
```

**Solution:**
```bash
# Generate a new secure secret
openssl rand -base64 32

# Add to .env file
JWT_SECRET=<generated-secret>
```

### Maven Build Fails

```bash
# Clean Maven cache
./mvnw clean

# Delete .m2 repository and rebuild
rm -rf ~/.m2/repository
./mvnw clean install
```

### Validation Errors Not Working

Ensure you have:
1. `spring-boot-starter-validation` dependency in pom.xml
2. `@Valid` annotation on controller methods
3. Validation annotations on DTOs/models

### Swagger UI Not Loading

Check:
1. Application is running on correct port
2. URL is correct: `http://localhost:8080/swagger-ui.html`
3. No CORS errors in browser console
4. `springdoc.swagger-ui.enabled=true` in application.properties

---

## 👥 User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access to all endpoints |
| **Project Manager** | Create/manage projects, assign tasks, view all project data |
| **Developer** | View assigned projects/tasks, update task status, log time |
| **Client** | View their projects, provide feedback, view invoices |

---

## 📊 Database Schema

### Users Collection
```javascript
{
  "_id": "ObjectId",
  "username": "string",
  "email": "string",
  "password": "string (encrypted)",
  "role": "enum (Admin, ProjectManager, Developer, Client)",
  "projectIds": ["string"],
  "taskIds": ["string"]
}
```

### Projects Collection
```javascript
{
  "_id": "ObjectId",
  "name": "string",
  "description": "string",
  "status": "string",
  "startDate": "date",
  "endDate": "date",
  "clientId": "string",
  "projectManagerId": "string",
  "developerIds": ["string"],
  "createdBy": "string"
}
```

### Tasks Collection
```javascript
{
  "_id": "ObjectId",
  "title": "string",
  "description": "string",
  "status": "string",
  "priority": "string",
  "deadline": "date",
  "projectId": "string",
  "assignedDeveloperIds": ["string"],
  "progress": "number",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

---

## 🔄 Development Workflow

1. **Create a new branch**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make changes and test**
   ```bash
   ./mvnw test
   ```

3. **Commit with meaningful message**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

4. **Push and create PR**
   ```bash
   git push origin feature/new-feature
   ```

---

## 📝 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | Yes | - | MongoDB connection string |
| `MONGODB_DATABASE` | Yes | - | MongoDB database name |
| `JWT_SECRET` | Yes | - | JWT signing key (min 256 bits) |
| `GITHUB_TOKEN` | Yes | - | GitHub Personal Access Token |
| `GITHUB_OAUTH_CLIENT_ID` | Yes | - | GitHub OAuth Client ID |
| `GITHUB_OAUTH_CLIENT_SECRET` | Yes | - | GitHub OAuth Client Secret |
| `GITHUB_OAUTH_REDIRECT_URI` | No | http://localhost:8080/api/auth/github/callback | OAuth callback URL |
| `GOOGLE_CALENDAR_CREDENTIALS_FILE_PATH` | Yes | - | Path to Google credentials JSON |
| `SERVER_PORT` | No | 8080 | Application server port |

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style
- Follow Spring Boot best practices
- Use Lombok annotations
- Add proper logging (Slf4j)
- Write unit tests
- Update documentation

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support

For support and questions:
- **Email:** support@hicaptain.com
- **Documentation:** [Agents.md](./Agents.md)
- **Issues:** [GitHub Issues](https://github.com/yourusername/HiCaptain/issues)
- **API Docs:** [Swagger UI](http://localhost:8080/swagger-ui.html)

---

## 🙏 Acknowledgments

- Spring Boot Team for the excellent framework
- MongoDB for the database
- GitHub API for integration support
- Google Calendar API for calendar features
- All contributors to this project

---

**Built with ❤️ using Spring Boot**
