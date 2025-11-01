# HiCaptain Backend - Setup Guide

## Features Added

### ✅ GitHub Integration
- Repository synchronization with GitHub API
- Commit tracking and analytics
- Pull request management
- Issue tracking
- Webhook support for real-time updates
- Language and contributor statistics

### ✅ Google Calendar & Meet Integration
- Google Calendar event creation/update/deletion
- Automatic Google Meet link generation for virtual meetings
- OAuth2 authentication flow
- Calendar synchronization
- Meeting reminders and notifications

### ✅ Real-time Analytics
- Project progress tracking
- Task completion statistics
- Time tracking analytics
- Revenue and billing insights
- Git activity metrics
- Meeting and productivity analytics

## Setup Instructions

### 1. GitHub Integration Setup

1. **Get GitHub Personal Access Token:**
   - Go to GitHub → Settings → Developer settings → Personal access tokens
   - Generate a new token with these scopes:
     - `repo` (for repository access)
     - `read:user` (for user information)
     - `read:org` (for organization access if needed)

2. **Set Environment Variable:**
   ```bash
   # Windows
   set GITHUB_TOKEN=your_github_token_here
   
   # Linux/Mac
   export GITHUB_TOKEN=your_github_token_here
   ```

3. **Test GitHub Integration:**
   ```bash
   # Sync a repository
   POST /api/github/repositories/sync?owner=username&repoName=repository&projectId=your_project_id
   
   # Get commits
   GET /api/github/commits?owner=username&repoName=repository&branch=main&limit=50
   ```

### 2. Google Calendar Integration Setup

1. **Create Google Cloud Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable APIs:**
   - Enable Google Calendar API
   - Enable Google Meet API (if available)

3. **Create OAuth2 Credentials:**
   - Go to APIs & Services → Credentials
   - Create OAuth 2.0 Client ID
   - Set authorized redirect URI: `http://localhost:8080/api/auth/google/callback`

4. **Download Credentials:**
   - Download the credentials JSON file
   - Rename it to `credentials.json`
   - Place it in `src/main/resources/`

5. **Test Google Calendar Integration:**
   ```bash
   # Get authorization URL
   GET /api/google-calendar/auth/url?userId=your_user_id
   
   # Check auth status
   GET /api/google-calendar/auth/status?userId=your_user_id
   ```

### 3. Database Setup

Make sure MongoDB is running and the collections will be auto-created:

- `meetings` - Enhanced meeting model with Google Calendar integration
- `github_repositories` - GitHub repository data
- `github_commits` - Git commit history
- `github_pull_requests` - Pull request information

### 4. Frontend Integration

Update your frontend to use these new endpoints:

```typescript
// GitHub Integration
const syncRepository = async (owner: string, repoName: string, projectId: string) => {
  const response = await fetch(`/api/github/repositories/sync?owner=${owner}&repoName=${repoName}&projectId=${projectId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Google Calendar Integration
const getGoogleAuthUrl = async (userId: string) => {
  const response = await fetch(`/api/google-calendar/auth/url?userId=${userId}`);
  return response.text();
};

// Analytics
const getDashboardAnalytics = async () => {
  const response = await fetch('/api/analytics/dashboard', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

### 5. Environment Variables

Add these to your environment or application.properties:

```properties
# GitHub
GITHUB_TOKEN=your_github_personal_access_token

# Google Calendar
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Database
MONGODB_URI=mongodb://localhost:27017/hicaptain
```

### 6. API Endpoints

#### GitHub Integration
- `POST /api/github/repositories/sync` - Sync repository with GitHub
- `GET /api/github/repositories` - Get repositories by project
- `GET /api/github/commits` - Get commit history
- `GET /api/github/pull-requests` - Get pull requests
- `GET /api/github/stats/contributors` - Get contributor statistics
- `GET /api/github/stats/languages` - Get language statistics

#### Google Calendar Integration
- `GET /api/google-calendar/auth/url` - Get OAuth authorization URL
- `GET /api/google-calendar/auth/callback` - OAuth callback handler
- `GET /api/google-calendar/events/upcoming` - Get upcoming events
- `GET /api/google-calendar/auth/status` - Check authorization status

#### Analytics
- `GET /api/analytics/dashboard` - Get dashboard analytics
- `GET /api/analytics/projects/progress` - Get project progress
- `GET /api/analytics/user/{userId}/productivity` - Get user productivity

#### Enhanced Meetings
- `GET /api/meetings/upcoming` - Get upcoming meetings
- `GET /api/meetings/project/{projectId}` - Get meetings by project
- `POST /api/meetings` - Create meeting (with Google Calendar sync)
- `PUT /api/meetings/{id}` - Update meeting (with Google Calendar sync)

## Security Notes

1. **Never commit sensitive credentials** to version control
2. **Use environment variables** for API keys and secrets
3. **Implement proper OAuth2 flow** for Google Calendar
4. **Validate webhook signatures** from GitHub
5. **Use HTTPS in production** for OAuth callbacks

## Troubleshooting

### GitHub Issues
- **403 Forbidden**: Check if your GitHub token has required permissions
- **Rate Limiting**: GitHub API has rate limits, implement caching and pagination

### Google Calendar Issues
- **Invalid Credentials**: Ensure credentials.json is properly configured
- **OAuth Errors**: Check redirect URI matches exactly
- **Calendar Access**: Ensure user has granted calendar permissions

### Database Issues
- **Connection Failed**: Verify MongoDB is running and accessible
- **Missing Collections**: Collections are auto-created on first use

## Production Deployment

1. **Update redirect URIs** in Google Cloud Console for production domain
2. **Set production environment variables**
3. **Use secure connections** (HTTPS) for all OAuth flows
4. **Implement proper logging** and monitoring
5. **Set up webhook endpoints** with proper security

## Support

For issues or questions:
1. Check the logs for detailed error messages
2. Verify all credentials and environment variables
3. Test endpoints using Postman or similar tools
4. Check GitHub and Google API documentation for latest changes