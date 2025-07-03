# OffScript Deployment Guide

This guide explains how to deploy the OffScript application to Render using Docker.

## Prerequisites

- A [Render](https://render.com/) account
- Your project pushed to GitHub
- Firebase project with configuration details

## Deployment Steps

### 1. Create a Web Service on Render

1. Log in to your Render dashboard
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: offscript (or your preferred name)
   - **Environment**: Docker
   - **Branch**: main (or your production branch)
   - **Root Directory**: Leave empty
   - **Region**: Choose the closest to your target audience

### 2. Configure Environment Variables

Add the following environment variables in the Render dashboard:

```
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
```

### 3. Deploy

Click "Create Web Service" and Render will automatically:
1. Clone your repository
2. Build your Docker image
3. Deploy your application

Your application will be available at `https://offscript.onrender.com` (or your custom subdomain).

## Continuous Deployment

Render automatically deploys when you push to your configured branch. No additional setup required.

## Custom Domain Setup

1. Go to your web service in Render
2. Click "Settings" → "Custom Domain"
3. Follow the instructions to add and verify your domain

## Monitoring and Logs

Access logs and monitoring from your web service dashboard in Render.

## Local Testing Before Deployment

Test your Docker setup locally before deploying:

```bash
# Build and run with Docker
docker build -t offscript .
docker run -p 8080:80 offscript

# Or use docker-compose
docker-compose up
```

Visit `http://localhost:8080` to verify everything works correctly. 