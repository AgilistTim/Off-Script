# Docker Deployment Guide

## Overview

The OffScript application can be deployed using Docker containers. The setup includes:

- **Multi-stage Docker build** for optimized production images
- **Environment variable injection** at runtime for security
- **Nginx web server** for serving the built React application
- **Health checks** for container monitoring

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Build and run the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

The application will be available at `http://localhost:8080`

### Using Docker Commands

```bash
# Build the image
docker build -t offscript-app .

# Run the container
docker run -d -p 8080:80 \
  -e VITE_FIREBASE_API_KEY="your-api-key" \
  -e VITE_FIREBASE_AUTH_DOMAIN="your-auth-domain" \
  -e VITE_FIREBASE_PROJECT_ID="your-project-id" \
  -e VITE_FIREBASE_STORAGE_BUCKET="your-storage-bucket" \
  -e VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id" \
  -e VITE_FIREBASE_APP_ID="your-app-id" \
  -e VITE_FIREBASE_MEASUREMENT_ID="your-measurement-id" \
  --name offscript-container \
  offscript-app
```

## Environment Variables

The following environment variables must be provided at runtime:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_FIREBASE_API_KEY` | Firebase API Key | `AIzaSyA...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | `project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | `project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket | `project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID | `123456789` |
| `VITE_FIREBASE_APP_ID` | Firebase App ID | `1:123:web:abc` |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase Measurement ID | `G-ABC123` |

## Security Features

- **No hardcoded secrets**: API keys are injected at runtime
- **Template-based configuration**: Uses placeholders during build
- **Production-ready nginx**: Optimized for serving static assets
- **Security headers**: Includes XSS protection and content type enforcement

## Architecture

### Build Process

1. **Build Stage**: Uses Node.js Alpine to build the React application
2. **Production Stage**: Uses Nginx Alpine to serve the built files
3. **Environment Injection**: Runtime script replaces placeholders with actual values

### File Structure

```
/usr/share/nginx/html/
├── index.html                 # Main HTML file
├── environment.js             # Runtime environment configuration
├── assets/                    # Built CSS/JS assets
└── ...                        # Other static files
```

## Monitoring

The container includes health checks that verify the application is responding:

```bash
# Check container health
docker ps

# View detailed health status
docker inspect offscript-app | grep -A 10 "Health"
```

## Troubleshooting

### Container won't start

1. Check Docker logs: `docker logs offscript-app`
2. Verify environment variables are set correctly
3. Ensure port 8080 is not already in use

### Application not loading

1. Check if nginx is serving files: `curl http://localhost:8080`
2. Verify environment.js was created correctly:
   ```bash
   docker exec offscript-app cat /usr/share/nginx/html/environment.js
   ```

### Environment variables not working

1. Ensure all required variables are provided
2. Check the docker-entrypoint.sh logs for injection messages
3. Verify placeholders in environment.template.js match the script

## Production Deployment

For production deployment:

1. **Use secrets management** instead of environment variables in compose files
2. **Set up SSL termination** (nginx proxy or load balancer)
3. **Configure proper logging** and monitoring
4. **Set resource limits** for the container
5. **Use multi-replica setup** for high availability

Example production docker-compose.yml:

```yaml
version: '3.8'
services:
  offscript-app:
    build: .
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M
    environment:
      - VITE_FIREBASE_API_KEY=${FIREBASE_API_KEY}
      # ... other variables from secrets
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost"]
      interval: 30s
      timeout: 10s
      retries: 3
``` 