# OffScript Deployment Guide

This guide explains how to deploy the OffScript application securely to Render using Docker.

## Prerequisites

- A [Render](https://render.com/) account
- Your project pushed to GitHub
- Firebase project with configuration details
- **New Firebase API key** (if you used the project before the security fixes)

## Security Notice

⚠️ **Important**: If you've used this project before, the Firebase API key was previously exposed and has been revoked. You **must** generate a new Firebase API key before deployment.

## Pre-Deployment Security Check

Before deploying, run our security check script:

```bash
node scripts/check-deployment-readiness.js
```

This will verify that:
- All required files are present
- No sensitive files are accidentally included
- Configuration is properly set up
- Scripts use environment variables (no hardcoded credentials)

## Deployment Steps

### 1. Prepare Your Firebase Configuration

1. Go to your [Firebase Console](https://console.firebase.google.com)
2. If you used this project before, **regenerate your API key**:
   - Go to Project Settings > General
   - Delete the existing web app and create a new one
   - Copy the new configuration values
3. Note down these values (you'll need them for Render):
   - API Key
   - Auth Domain
   - Project ID
   - Storage Bucket
   - Messaging Sender ID
   - App ID
   - Measurement ID (optional)

### 2. Create a Web Service on Render

1. Log in to your Render dashboard
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: offscript (or your preferred name)
   - **Environment**: Docker
   - **Branch**: main (or your production branch)
   - **Root Directory**: Leave empty
   - **Region**: Choose the closest to your target audience

### 3. Configure Environment Variables

**Critical**: Add these environment variables in the Render dashboard under "Environment":

#### Required Firebase Configuration:
```
VITE_FIREBASE_API_KEY=your_new_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:your_app_id
```

#### Optional Configuration:
```
VITE_FIREBASE_MEASUREMENT_ID=G-YOUR_MEASUREMENT_ID
ADMIN_EMAIL=your_admin_email@domain.com
ADMIN_PASSWORD=secure_admin_password
```

### 4. Deploy

Click "Create Web Service" and Render will automatically:
1. Clone your repository
2. Build your Docker image using the secure Dockerfile
3. Inject environment variables at runtime
4. Deploy your application with security headers

Your application will be available at `https://your-service-name.onrender.com`.

## Security Features

### Build-time Security:
- Environment variables are injected at runtime, not build time
- Sensitive files are excluded from the Docker build context
- Production-only dependencies
- Template-based configuration system

### Runtime Security:
- Comprehensive security headers (CSP, XSS protection, etc.)
- Non-root user execution in Docker containers
- Health checks for monitoring
- Server version hiding

### Firebase Domain Authorization

Don't forget to authorize your Render domain in Firebase:
1. Go to Firebase Console > Authentication > Settings > Authorized domains
2. Add your Render domain: `your-service-name.onrender.com`
3. This is required for Google Sign-In and other authentication features

## Monitoring and Maintenance

### Health Checks
The application includes automatic health checks. Monitor them in your Render dashboard.

### Logs
Access logs from your Render service dashboard to monitor:
- Environment variable injection
- Application startup
- Any security warnings

### Updates
When you push to your configured branch, Render automatically:
1. Pulls the latest code
2. Rebuilds the Docker image
3. Injects current environment variables
4. Deploys the new version

## Local Testing Before Deployment

Test your secure setup locally:

```bash
# Copy environment template
cp env.example .env

# Edit with your Firebase credentials
nano .env

# Test with Docker
docker-compose up --build

# Check deployment readiness
node scripts/check-deployment-readiness.js
```

## Troubleshooting

### Common Issues:

1. **"Firebase configuration error"**
   - Check that all environment variables are set in Render
   - Verify the Firebase API key is valid and not revoked
   - Run the deployment readiness check

2. **"Authentication domain not authorized"**
   - Add your Render domain to Firebase authorized domains
   - Wait a few minutes for changes to propagate

3. **Application not loading**
   - Check Render logs for environment variable injection messages
   - Verify the Docker container is starting successfully
   - Test the environment.js file is being generated correctly

### Debug Commands:

```bash
# Check container logs
render logs your-service-name

# Verify environment variables (in Render shell)
cat /usr/share/nginx/html/environment.js

# Test health endpoint
curl https://your-service-name.onrender.com/
```

## Custom Domain Setup

1. Go to your web service in Render
2. Click "Settings" → "Custom Domain"
3. Add your domain and follow verification instructions
4. **Important**: Add your custom domain to Firebase authorized domains

## Security Best Practices

- ✅ Never commit `.env` files to git
- ✅ Regenerate Firebase credentials if they were ever exposed
- ✅ Use the deployment readiness check before each deployment
- ✅ Monitor Render logs for any security warnings
- ✅ Keep Firebase security rules up to date
- ✅ Regularly review authorized domains in Firebase

Your deployment is now secure and ready for production! 🚀 