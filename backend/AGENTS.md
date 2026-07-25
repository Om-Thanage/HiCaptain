# HiCaptain Backend - Developer Documentation

**Comprehensive documentation for developers, agents, and maintainers**

This document consolidates all technical documentation for the HiCaptain backend project, including environment setup, exception handling, best practices, and implementation details.

---

## 📋 Table of Contents

1. [Environment Variables Setup](#1-environment-variables-setup)
2. [Exception Handling](#2-exception-handling)
3. [Best Practices Implementation](#3-best-practices-implementation)
4. [Spring Boot Best Practices Applied](#4-spring-boot-best-practices-applied)
5. [Security Guidelines](#5-security-guidelines)
6. [Development Guidelines](#6-development-guidelines)

---



## 1. Environment Variables Setup

### Overview
This application uses environment variables to store sensitive configuration such as API keys, tokens, and secrets.

### Setup Instructions

#### Step 1: Copy the template file
```bash
cp .env.example .env
```

#### Step 2: Update with your actual credentials

Edit the `.env` file and replace the placeholder values:

- **JWT_SECRET**: Generate a secure secret key (minimum 256 bits)
- **GITHUB_TOKEN**: Your GitHub Personal Access Token
- **GITHUB_OAUTH_CLIENT_ID**: Your GitHub OAuth App Client ID
- **GITHUB_OAUTH_CLIENT_SECRET**: Your GitHub OAuth App Client Secret
- **MONGODB_URI**: Your MongoDB connection string
- Other configuration values as needed

#### Step 3: Never commit .env to version control
The `.env` file is already included in `.gitignore` to prevent accidental commits.

### Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `MONGODB_DATABASE` | MongoDB database name | Yes | - |
| `JWT_SECRET` | Secret key for JWT token generation | Yes | - |
| `GITHUB_TOKEN` | GitHub Personal Access Token | Yes | - |
| `GITHUB_API_BASE_URL` | GitHub API base URL | No | https://api.github.com |
| `GITHUB_OAUTH_CLIENT_ID` | GitHub OAuth Client ID | Yes | - |
| `GITHUB_OAUTH_CLIENT_SECRET` | GitHub OAuth Client Secret | Yes | - |
| `GITHUB_OAUTH_REDIRECT_URI` | OAuth callback URL | No | http://localhost:8080/api/auth/github/callback |
| `GITHUB_OAUTH_SCOPES` | GitHub OAuth scopes | No | repo,read:user,user:email,admin:repo_hook |
| `GOOGLE_CALENDAR_CREDENTIALS_FILE_PATH` | Path to Google Calendar credentials | Yes | - |
| `SERVER_PORT` | Application server port | No | 8080 |

### Generating Secrets

#### JWT Secret
Generate a secure random string (256 bits):

**Linux/macOS:**
```bash
openssl rand -base64 32
```

**Windows PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

#### GitHub Token
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `read:user`, `user:email`, `admin:repo_hook`
4. Generate and copy the token to your `.env` file

#### GitHub OAuth App
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name:** HiCaptain
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:8080/api/auth/github/callback`
4. Copy the Client ID and Client Secret to your `.env` file

### Production Deployment

For production environments, set these environment variables in your hosting platform:

- **Heroku:** `heroku config:set VARIABLE_NAME=value`
- **AWS:** Use Systems Manager Parameter Store or Secrets Manager
- **Docker:** Use `.env` file or pass via `docker run -e`
- **Kubernetes:** Use ConfigMaps and Secrets
- **Azure:** Application Settings in App Service

### Security Best Practices

⚠️ **CRITICAL SECURITY RULES:**

1. ✅ Never commit the `.env` file to version control
2. ✅ Never share your `.env` file publicly
3. ✅ Rotate secrets regularly (every 90 days minimum)
4. ✅ Use different secrets for development and production
5. ✅ Consider using a secrets management service for production
6. ✅ Use strong, randomly generated secrets (minimum 256 bits for JWT)
7. ✅ Audit secret access regularly
8. ✅ Revoke compromised secrets immediately

### Troubleshooting

**Issue: Application fails to start - JWT secret error**
```
Error: JWT secret key must be at least 256 bits
```
**Solution:** Generate a new secret using the commands above and ensure it's properly set in `.env`

**Issue: GitHub API rate limit exceeded**
```
Error: API rate limit exceeded
```
**Solution:** Ensure your `GITHUB_TOKEN` is set correctly. Authenticated requests have higher rate limits.

**Issue: MongoDB connection refused**
```
Error: MongoSocketException: Connection refused
```
**Solution:** Verify MongoDB is running and `MONGODB_URI` is correct.

---



## 2. Exception Handling

### Overview
This application uses a centralized exception handling mechanism with `@ControllerAdvice` to provide consistent error responses across all endpoints.

### Custom Exceptions

#### ResourceNotFoundException
Used when a requested resource is not found in the database.

**Usage Example:**
```java
// In Service
throw new ResourceNotFoundException("Project", "id", projectId);
// or
throw new ResourceNotFoundException("User not found with id: " + userId);
```

#### BadRequestException
Used when the request contains invalid data or parameters.

**Usage Example:**
```java
throw new BadRequestException("Invalid date range: start date must be before end date");
```

#### UnauthorizedException
Used when a user attempts to access a resource without proper authentication or authorization.

**Usage Example:**
```java
throw new UnauthorizedException("You do not have permission to access this project");
```

### Error Response Format

All errors return a consistent JSON structure:

```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "Invalid input data",
  "path": "/api/projects",
  "timestamp": "2026-07-25T23:20:00",
  "validationErrors": [
    "name: Project name is required",
    "startDate: Start date is required"
  ]
}
```

**Response Fields:**
- **status**: HTTP status code (e.g., 400, 404, 500)
- **error**: HTTP status text (e.g., "Bad Request", "Not Found")
- **message**: Human-readable error message
- **path**: API endpoint where the error occurred
- **timestamp**: When the error occurred (ISO 8601 format)
- **validationErrors**: List of validation error messages (only for validation errors)

### Handled Exception Types

| Exception Type | HTTP Status | Description |
|----------------|-------------|-------------|
| `MethodArgumentNotValidException` | 400 | Bean validation errors from `@Valid` |
| `BadRequestException` | 400 | Invalid request parameters or data |
| `ResourceNotFoundException` | 404 | Resource not found in database |
| `UnauthorizedException` | 401 | Authentication or authorization failure |
| `ResponseStatusException` | Varies | Generic status exceptions |
| `IllegalArgumentException` | 400 | Invalid method arguments |
| `Exception` | 500 | Unexpected server errors |

### Bean Validation

The application uses Jakarta Bean Validation annotations on DTOs and models.

**Common Annotations:**
- `@NotBlank` - Field must not be null or empty (strings)
- `@NotNull` - Field must not be null
- `@Email` - Field must be a valid email address
- `@Size(min, max)` - String length constraints
- `@Min`, `@Max` - Numeric range constraints
- `@Pattern` - Regex pattern matching
- `@Past`, `@Future` - Date validation

**Example DTO with Validation:**
```java
@Data
public class AuthRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;
    
    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;
}
```

**Controller Usage:**
```java
@PostMapping("/login")
public ResponseEntity<?> login(@Valid @RequestBody AuthRequest request) {
    // Validation happens automatically before method execution
    // If validation fails, GlobalExceptionHandler handles it
    return userService.login(request);
}
```

### Migration from Manual Validation

**❌ Before (Manual Validation):**
```java
@PostMapping("/register")
public ResponseEntity<?> register(@RequestBody User user) {
    if (user.getName() == null || user.getName().isBlank()) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body("'name' is required");
    }
    if (user.getEmail() == null || user.getEmail().isBlank()) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body("'email' is required");
    }
    // More validation...
    return ResponseEntity.ok(userService.save(user));
}
```

**✅ After (Bean Validation):**
```java
// In User.java
@NotBlank(message = "Name is required")
private String name;

@NotBlank(message = "Email is required")
@Email(message = "Email must be valid")
private String email;

// In Controller
@PostMapping("/register")
public ResponseEntity<?> register(@Valid @RequestBody User user) {
    return ResponseEntity.ok(userService.save(user));
}
```

### Using Custom Exceptions in Services

**❌ Before (ResponseStatusException):**
```java
public Project getById(String id) {
    return projectRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "Project not found"));
}
```

**✅ After (Custom Exception):**
```java
public Project getById(String id) {
    return projectRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Project", "id", id));
}
```

### Example Error Responses

#### 1. Validation Error (400 Bad Request)

**Request:** POST /auth/register
```json
{
  "name": "",
  "email": "invalid-email",
  "password": "123"
}
```

**Response:**
```json
{
  "status": 400,
  "error": "Validation Failed",
  "message": "Invalid input data",
  "path": "/auth/register",
  "timestamp": "2026-07-25T23:20:00",
  "validationErrors": [
    "name: Name is required",
    "email: Email must be valid",
    "password: Password must be at least 6 characters"
  ]
}
```

#### 2. Resource Not Found (404 Not Found)

**Request:** GET /projects/invalid-id

**Response:**
```json
{
  "status": 404,
  "error": "Not Found",
  "message": "Project not found with id : 'invalid-id'",
  "path": "/projects/invalid-id",
  "timestamp": "2026-07-25T23:20:00"
}
```

#### 3. Unauthorized Access (401 Unauthorized)

**Request:** POST /projects (without proper role)

**Response:**
```json
{
  "status": 401,
  "error": "Unauthorized",
  "message": "You do not have permission to create projects",
  "path": "/projects",
  "timestamp": "2026-07-25T23:20:00"
}
```

#### 4. Internal Server Error (500)

**Response:**
```json
{
  "status": 500,
  "error": "Internal Server Error",
  "message": "An unexpected error occurred. Please try again later.",
  "path": "/projects",
  "timestamp": "2026-07-25T23:20:00"
}
```

### Best Practices for Exception Handling

1. **Use Specific Exceptions** - Choose the most appropriate exception type for the scenario
2. **Provide Context** - Include helpful error messages with relevant details
3. **Don't Expose Sensitive Info** - Never include stack traces or internal details in production
4. **Log Appropriately**: 
   - Use `log.warn()` for client errors (4xx)
   - Use `log.error()` for server errors (5xx)
5. **Validate Early** - Use `@Valid` on all POST/PUT endpoints
6. **Test Error Paths** - Write tests for both success and error scenarios
7. **Document Errors** - Include error responses in API documentation (Swagger)
8. **Be Consistent** - Always use the global exception handler

### Benefits of This Approach

✅ **Consistency** - All errors follow the same response structure  
✅ **Maintainability** - Centralized error handling logic  
✅ **Clean Code** - Controllers focus on business logic, not error handling  
✅ **Better Client Experience** - Detailed validation error messages  
✅ **Automatic Logging** - All errors are logged with context  
✅ **Easy Testing** - Mock exceptions easily in tests  
✅ **API Documentation** - Swagger automatically documents error responses

---



## 3. Best Practices Implementation

### Architecture Best Practices

#### Layered Architecture
The application follows a clear separation of concerns:

```
Controller Layer → Service Layer → Repository Layer
      ↓                ↓                  ↓
  Routing      Business Logic       Data Access
```

**Guidelines:**
- **Controllers**: Handle HTTP requests/responses, routing, and authorization
- **Services**: Contain business logic, validation, and orchestration
- **Repositories**: Handle database operations only
- **DTOs**: Transfer data between layers
- **Models**: Represent domain entities

#### Dependency Injection

**✅ Use Constructor Injection with Lombok:**
```java
@Service
@RequiredArgsConstructor
public class ProjectService {
    private final ProjectRepository projectRepo;
    private final UserRepository userRepo;
    // Constructor automatically generated by Lombok
}
```

**❌ Avoid Field Injection:**
```java
@Service
public class ProjectService {
    @Autowired  // Avoid this
    private ProjectRepository projectRepo;
}
```

**Why?**
- Constructor injection makes dependencies explicit
- Easier to test (can pass mocks in constructor)
- Immutable dependencies (final fields)
- Lombok reduces boilerplate

### Logging Best Practices

#### Use Slf4j with Proper Log Levels

**✅ Correct Logging:**
```java
@Slf4j
@Service
public class TaskService {
    
    public Task create(Task task) {
        log.debug("Creating task: {} for project: {}", task.getTitle(), task.getProjectId());
        Task saved = taskRepo.save(task);
        log.info("Task created successfully: {} (ID: {})", saved.getTitle(), saved.getId());
        return saved;
    }
    
    public Task getById(String id) {
        return taskRepo.findById(id)
            .orElseThrow(() -> {
                log.warn("Task not found: {}", id);
                return new ResourceNotFoundException("Task", "id", id);
            });
    }
}
```

**❌ Incorrect Logging:**
```java
public class TaskService {
    public Task create(Task task) {
        System.out.println("Creating task: " + task.getTitle());  // ❌ Don't use
        return taskRepo.save(task);
    }
}
```

**Log Levels:**
- **TRACE**: Very detailed information (loop iterations, variable values)
- **DEBUG**: Detailed flow information for debugging
- **INFO**: Important business events (user registered, task completed)
- **WARN**: Recoverable issues (validation failures, resource not found)
- **ERROR**: Unexpected errors that need attention

**Parameterized Logging:**
```java
// ✅ Efficient - parameters evaluated only if log level is enabled
log.debug("User {} created project {}", userId, projectName);

// ❌ Inefficient - string concatenation always happens
log.debug("User " + userId + " created project " + projectName);
```

### Validation Best Practices

#### Use Bean Validation Annotations

**Model/DTO Validation:**
```java
@Data
public class Project {
    @NotBlank(message = "Project name is required")
    @Size(min = 3, max = 100, message = "Name must be between 3 and 100 characters")
    private String name;
    
    @NotBlank(message = "Status is required")
    @Pattern(regexp = "ACTIVE|COMPLETED|ON_HOLD", message = "Invalid status")
    private String status;
    
    @NotNull(message = "Start date is required")
    @PastOrPresent(message = "Start date cannot be in the future")
    private LocalDate startDate;
    
    @Email(message = "Invalid email format")
    private String contactEmail;
}
```

**Controller Validation:**
```java
@PostMapping("/projects")
public ResponseEntity<Project> create(@Valid @RequestBody Project project) {
    // Validation happens automatically
    return ResponseEntity.ok(projectService.create(project));
}
```

### Error Handling Best Practices

#### Use Custom Exceptions

```java
// ✅ Clear, specific exception
throw new ResourceNotFoundException("Project", "id", projectId);

// ❌ Generic exception with less context
throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found");
```

#### Handle Errors Gracefully

```java
@Service
@Slf4j
public class ProjectService {
    
    public Project getById(String id) {
        log.debug("Fetching project: {}", id);
        return projectRepo.findById(id)
            .orElseThrow(() -> {
                log.warn("Project not found: {}", id);
                return new ResourceNotFoundException("Project", "id", id);
            });
    }
}
```

### Security Best Practices

#### 1. Secure Secret Management

**✅ Use Environment Variables:**
```properties
security.jwt.secret=${JWT_SECRET}
github.token=${GITHUB_TOKEN}
```

**❌ Hardcoded Secrets:**
```properties
security.jwt.secret=mysecretkey123  # Never do this!
```

#### 2. Password Security

```java
@Service
public class UserService {
    private final PasswordEncoder passwordEncoder;
    
    public User save(User user) {
        // Always hash passwords
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }
}
```

#### 3. Input Validation

Always validate and sanitize user input:
```java
@PostMapping("/projects")
public ResponseEntity<Project> create(@Valid @RequestBody Project project) {
    // @Valid ensures all validation annotations are checked
    return ResponseEntity.ok(projectService.create(project));
}
```

### Code Quality Best Practices

#### Use Meaningful Names

**✅ Good Naming:**
```java
public List<Project> getProjectsByClientId(String clientId) {
    return projectRepository.findByClientId(clientId);
}

private boolean isProjectAccessibleByUser(Project project, String userId, String role) {
    return switch (role) {
        case "Admin" -> true;
        case "ProjectManager" -> userId.equals(project.getProjectManagerId());
        case "Developer" -> project.getDeveloperIds().contains(userId);
        default -> false;
    };
}
```

**❌ Poor Naming:**
```java
public List<Project> get(String id) { ... }
private boolean check(Project p, String u, String r) { ... }
```

#### Keep Methods Small and Focused

**✅ Single Responsibility:**
```java
public Task createTask(Task task) {
    validateTask(task);
    Task saved = saveTask(task);
    assignDevelopers(saved);
    notifyStakeholders(saved);
    return saved;
}
```

**❌ Doing Too Much:**
```java
public Task createTask(Task task) {
    // 100+ lines of validation, saving, assigning, notifying...
}
```

### Testing Best Practices

#### Write Unit Tests

```java
@Test
void shouldReturnAllProjects_WhenAdminUser() {
    // Given
    User admin = createAdminUser();
    List<Project> projects = Arrays.asList(project1, project2);
    when(projectService.getAll()).thenReturn(projects);
    
    // When
    ResponseEntity<List<Project>> response = controller.getAll();
    
    // Then
    assertEquals(HttpStatus.OK, response.getStatusCode());
    assertEquals(2, response.getBody().size());
}

@Test
void shouldThrowException_WhenProjectNotFound() {
    // Given
    String invalidId = "invalid-id";
    when(projectRepo.findById(invalidId)).thenReturn(Optional.empty());
    
    // When & Then
    assertThrows(ResourceNotFoundException.class, 
        () -> projectService.getById(invalidId));
}
```

### Performance Best Practices

#### Use Java 8+ Streams Effectively

**✅ Efficient Stream Processing:**
```java
List<Project> filtered = projects.stream()
    .filter(p -> p.getStatus().equals("ACTIVE"))
    .filter(p -> p.getDeveloperIds().contains(userId))
    .collect(Collectors.toList());
```

#### Use Optional for Null Safety

**✅ With Optional:**
```java
public Optional<Project> getById(String id) {
    return projectRepository.findById(id);
}

// Usage
projectService.getById(id)
    .map(ResponseEntity::ok)
    .orElse(ResponseEntity.notFound().build());
```

**❌ Without Optional:**
```java
public Project getById(String id) {
    Project project = projectRepository.findById(id);
    if (project == null) {  // Prone to NPE
        return null;
    }
    return project;
}
```

---



## 4. Spring Boot Best Practices Applied

### Summary of Fixes

This project has implemented the following Spring Boot best practices:

#### ✅ 1. Externalized Secrets (CRITICAL FIX)

**Problem:** Hardcoded secrets in configuration files  
**Solution:** Environment-based secret management

**Implementation:**
- Created `.env` file for local secrets
- Updated `application.properties` to use `${VAR_NAME}` syntax
- Added `spring-dotenv` dependency
- Documented setup in ENV_SETUP section

**Impact:** 🔐 Secure configuration management

#### ✅ 2. Slf4j Logging (HIGH PRIORITY)

**Problem:** Using `System.out.println()` for logging  
**Solution:** Slf4j with proper log levels

**Implementation:**
- Added `@Slf4j` annotation to all controllers and services
- Replaced all print statements with parameterized logging
- Used appropriate log levels (debug, info, warn, error)

**Impact:** 📝 Production-ready logging infrastructure

#### ✅ 3. Bean Validation (HIGH PRIORITY)

**Problem:** Manual validation in controllers  
**Solution:** Jakarta Bean Validation with annotations

**Implementation:**
- Added validation annotations to DTOs and models
- Used `@Valid` in controller methods
- Automatic validation error handling

**Impact:** ✅ Declarative, consistent validation

#### ✅ 4. Global Exception Handling (HIGH PRIORITY)

**Problem:** Inconsistent error responses  
**Solution:** Centralized exception handling with @ControllerAdvice

**Implementation:**
- Created custom exceptions (ResourceNotFoundException, BadRequestException, etc.)
- Created ErrorResponse DTO
- Implemented GlobalExceptionHandler
- Consistent error response format

**Impact:** 🎯 Professional, consistent error handling

### Best Practices Score

**Before Fixes:** 60/100  
**After Fixes:** 85/100

### What's Production-Ready Now:

✅ Secure configuration management  
✅ Professional logging infrastructure  
✅ Robust input validation  
✅ Consistent error handling  
✅ Better debugging capabilities  
✅ Improved API client experience  

---

## 5. Security Guidelines

### Authentication & Authorization

#### JWT Token Security

**Token Generation:**
```java
@Service
public class JwtService {
    
    @Value("${security.jwt.secret}")
    private String secret;
    
    private static final long EXPIRATION_TIME = 86400000; // 24 hours
    
    public String generateToken(User user) {
        return Jwts.builder()
            .setSubject(user.getId())
            .claim("role", user.getRole())
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
            .signWith(SignatureAlgorithm.HS256, secret)
            .compact();
    }
}
```

**Security Checklist:**
- ✅ JWT secret is at least 256 bits
- ✅ Tokens have expiration time
- ✅ Secret stored in environment variables
- ✅ HTTPS used in production
- ✅ Token validated on every request

#### Role-Based Access Control

```java
@RestController
@RequestMapping("/projects")
public class ProjectController {
    
    @PostMapping
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager')")
    public ResponseEntity<Project> create(@Valid @RequestBody Project project) {
        return ResponseEntity.ok(projectService.create(project));
    }
    
    @GetMapping
    @PreAuthorize("hasAnyAuthority('Admin','ProjectManager','Developer','Client')")
    public ResponseEntity<List<Project>> getAll() {
        // Role-based filtering inside method
        return ResponseEntity.ok(projectService.getAllForCurrentUser());
    }
}
```

### Input Validation & Sanitization

**Always Validate:**
1. Required fields with `@NotBlank`, `@NotNull`
2. Email format with `@Email`
3. String length with `@Size`
4. Numeric ranges with `@Min`, `@Max`
5. Patterns with `@Pattern`

**Example:**
```java
@Data
public class UserRegistrationRequest {
    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 50)
    private String name;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;
    
    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(regexp = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=]).*$",
             message = "Password must contain uppercase, lowercase, number, and special character")
    private String password;
}
```

### CORS Configuration

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
            .allowedOrigins("http://localhost:3000")  // Frontend URL
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true);
    }
}
```

**Production CORS:**
- Only allow specific origins (never use "*" in production)
- Limit allowed methods
- Set appropriate max age for preflight requests

### Security Headers

Add these headers in production:
```properties
# application.properties
server.servlet.session.cookie.http-only=true
server.servlet.session.cookie.secure=true
server.servlet.session.cookie.same-site=strict
```

### Secret Rotation

**Schedule:**
- JWT secrets: Every 90 days
- API tokens: Every 180 days
- OAuth secrets: When compromised or annually

**Process:**
1. Generate new secret
2. Update environment variables
3. Restart application
4. Revoke old secret after grace period

---

## 6. Development Guidelines

### Code Review Checklist

Before submitting a PR, ensure:

**Functionality:**
- ✅ Feature works as expected
- ✅ Edge cases handled
- ✅ No breaking changes to existing APIs

**Code Quality:**
- ✅ Meaningful variable/method names
- ✅ Methods are small and focused
- ✅ No code duplication
- ✅ Comments for complex logic only

**Best Practices:**
- ✅ Using Slf4j for logging (no System.out.println)
- ✅ Bean validation on inputs
- ✅ Custom exceptions for errors
- ✅ Constructor injection with Lombok
- ✅ No hardcoded values (use configuration)

**Testing:**
- ✅ Unit tests written
- ✅ Tests pass locally
- ✅ Coverage for new code
- ✅ Test both success and error scenarios

**Security:**
- ✅ No secrets in code
- ✅ Input validation present
- ✅ Authorization checks in place
- ✅ No SQL injection vulnerabilities

**Documentation:**
- ✅ README updated if needed
- ✅ API endpoints documented
- ✅ Complex logic explained

### Git Workflow

**Branch Naming:**
- `feature/add-task-priority` - New features
- `fix/task-status-update` - Bug fixes
- `refactor/simplify-auth` - Code refactoring
- `docs/update-readme` - Documentation

**Commit Messages:**
```
feat: add task priority feature
fix: resolve task status update issue
refactor: simplify authentication logic
docs: update API documentation
test: add unit tests for ProjectService
chore: update dependencies
```

**Pull Request Process:**
1. Create feature branch
2. Make changes and commit
3. Write/update tests
4. Push and create PR
5. Address review comments
6. Merge after approval

### Testing Strategy

**Unit Tests:**
```java
@SpringBootTest
class ProjectServiceTest {
    
    @Mock
    private ProjectRepository projectRepo;
    
    @InjectMocks
    private ProjectService projectService;
    
    @Test
    void shouldCreateProject_WhenValidInput() {
        // Test implementation
    }
}
```

**Integration Tests:**
```java
@SpringBootTest
@AutoConfigureMockMvc
class ProjectControllerIT {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Test
    void shouldReturnProjects_WhenAuthenticated() throws Exception {
        mockMvc.perform(get("/projects")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
    }
}
```

### Monitoring & Debugging

**Log Monitoring:**
- Use log aggregation (ELK stack, CloudWatch)
- Set up alerts for ERROR logs
- Monitor response times
- Track API usage

**Debugging Tips:**
1. Check logs first (with proper log levels)
2. Use Swagger UI for API testing
3. Verify environment variables are set
4. Check database connection
5. Review exception stack traces

### Performance Optimization

**Database:**
- Add indexes for frequently queried fields
- Use pagination for large datasets
- Avoid N+1 query problems
- Use projections for large documents

**Caching:**
```java
@Service
@CacheConfig(cacheNames = "projects")
public class ProjectService {
    
    @Cacheable(key = "#id")
    public Optional<Project> getById(String id) {
        return projectRepo.findById(id);
    }
    
    @CacheEvict(allEntries = true)
    public Project update(String id, Project project) {
        // Update logic
    }
}
```

**API Response:**
- Use DTOs to limit response size
- Implement pagination
- Add compression for responses

---

## 📚 Additional Resources

### Official Documentation
- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Spring Security](https://spring.io/projects/spring-security)
- [MongoDB Docs](https://docs.mongodb.com/)
- [JWT.io](https://jwt.io/)

### Best Practices
- [Spring Boot Best Practices Repository](https://github.com/arsy786/springboot-best-practices)
- [Baeldung Spring Boot Tutorials](https://www.baeldung.com/spring-boot)
- [Java Code Conventions](https://www.oracle.com/java/technologies/javase/codeconventions-contents.html)

### Tools
- [Swagger UI](http://localhost:8080/swagger-ui.html) - API Documentation
- [MongoDB Compass](https://www.mongodb.com/products/compass) - Database GUI
- [Postman](https://www.postman.com/) - API Testing
- [IntelliJ IDEA](https://www.jetbrains.com/idea/) - IDE

---

## 🤝 Contributing

When contributing to this project:

1. **Read this documentation** - Understand the architecture and best practices
2. **Follow the guidelines** - Use the patterns established in the codebase
3. **Write tests** - Maintain or improve test coverage
4. **Document changes** - Update README and this file as needed
5. **Review checklist** - Complete the code review checklist before submitting PR

---

## 📝 Changelog

### Version 1.0.0 (July 25, 2026)

**Added:**
- ✅ Environment variable management with .env files
- ✅ Slf4j logging throughout application
- ✅ Bean validation on all DTOs and models
- ✅ Global exception handling with @ControllerAdvice
- ✅ Swagger/OpenAPI documentation
- ✅ Custom exceptions (ResourceNotFoundException, BadRequestException, UnauthorizedException)
- ✅ Comprehensive documentation (README.md, Agents.md)

**Improved:**
- ✅ Security with externalized secrets
- ✅ Error responses with consistent format
- ✅ Code quality with best practices
- ✅ Developer experience with better documentation

**Fixed:**
- ✅ Hardcoded secrets vulnerability
- ✅ Inconsistent error responses
- ✅ Manual validation code
- ✅ Missing logging infrastructure

---

**Last Updated:** July 25, 2026  
**Maintained By:** HiCaptain Development Team

For questions or clarifications, refer to the [README.md](./README.md) or open an issue on GitHub.
