# 🔑 HiCaptain Credentials Setup Guide

## 📋 What You Need

Your HiCaptain project requires **2 sets of credentials**:

### 1. **GitHub OAuth App** (for repository integration)
### 2. **Google Calendar API** (for meeting scheduling)

---

## 🐙 GitHub OAuth Setup

### Step 1: Create GitHub OAuth App
1. Go to: https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in:
   ```
   Application name: HiCaptain
   Homepage URL: http://localhost:3000
   Authorization callback URL: http://localhost:8080/api/auth/github/callback
   Description: Project management platform
   ```

### Step 2: Get Your Credentials
After creating the app, you'll get:
- **Client ID**: `Ov23lidXXXXXXXXXXXX` *(example)*
- **Client Secret**: Click "Generate new client secret"

### Step 3: Update application.properties
Replace these lines in `backend/src/main/resources/application.properties`:
```properties
# Replace with YOUR GitHub OAuth App credentials
github.oauth.client-id=YOUR_GITHUB_CLIENT_ID_HERE
github.oauth.client-secret=YOUR_GITHUB_CLIENT_SECRET_HERE
```

---

## 📅 Google Calendar API Setup

### Step 1: Google Cloud Console
1. Go to: https://console.cloud.google.com/
2. Create new project: **"HiCaptain"**
3. Select the project

### Step 2: Enable Calendar API
1. Go to **APIs & Services** → **Library**
2. Search: **"Google Calendar API"**
3. Click **Enable**

### Step 3: Create OAuth Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Application type: **"Web application"**
4. Name: **"HiCaptain Web Client"**
5. Authorized redirect URIs:
   ```
   http://localhost:8080/api/auth/google/callback
   http://localhost:3000
   ```

### Step 4: Download & Save Credentials
1. Download the JSON file
2. Copy content to: `backend/src/main/resources/credentials.json`
3. The file should look like:
   ```json
   {
     "web": {
       "client_id": "YOUR-CLIENT-ID.apps.googleusercontent.com",
       "project_id": "hi-captain",
       "client_secret": "YOUR-CLIENT-SECRET",
       "auth_uri": "https://accounts.google.com/o/oauth2/auth",
       "token_uri": "https://oauth2.googleapis.com/token",
       "redirect_uris": [
         "http://localhost:8080/api/auth/google/callback"
       ]
     }
   }
   ```

---

## ✅ Verification Checklist

After setup, verify these files are updated:

### Backend Configuration:
- [ ] `application.properties` - GitHub OAuth credentials
- [ ] `credentials.json` - Google Calendar API credentials

### Test Your Setup:
1. Start backend: `cd backend && ./mvnw spring-boot:run`
2. Start frontend: `cd frontend && npm run dev`
3. Test GitHub connection in the Git page
4. Test Calendar integration in the Schedule page

---

## 🚨 Security Notes

- **Never commit real credentials to git**
- **Use environment variables in production**
- **Keep client secrets private**
- **Regenerate secrets if compromised**

### Production Environment Variables:
```bash
export GITHUB_CLIENT_ID=your-production-github-client-id
export GITHUB_CLIENT_SECRET=your-production-github-client-secret
export GOOGLE_CLIENT_ID=your-production-google-client-id
export GOOGLE_CLIENT_SECRET=your-production-google-client-secret
```

---

## 🆘 Need Help?

**Common Issues:**
1. **"Invalid redirect URI"** - Check callback URLs match exactly
2. **"Access denied"** - Verify API is enabled in Google Console
3. **"Invalid client"** - Double-check client ID/secret copying

**Test URLs:**
- Backend: http://localhost:8080/api/health
- Frontend: http://localhost:3000
- GitHub callback: http://localhost:8080/api/auth/github/callback
- Google callback: http://localhost:8080/api/auth/google/callback