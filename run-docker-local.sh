#!/bin/bash

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please create a .env file with your Firebase configuration."
  echo "Example:"
  echo "VITE_FIREBASE_API_KEY=your_firebase_api_key"
  echo "VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain"
  echo "VITE_FIREBASE_PROJECT_ID=your_firebase_project_id"
  echo "VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket"
  echo "VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id"
  echo "VITE_FIREBASE_APP_ID=your_firebase_app_id"
  echo "VITE_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id"
  exit 1
fi

# Load environment variables from .env file
export $(grep -v '^#' .env | xargs)

# Stop and remove existing container if it exists
docker-compose down

# Build and start the container
docker-compose up --build -d

echo "Docker container started. You can access the application at http://localhost:8080"
echo "To view logs, run: docker-compose logs -f"
echo "To stop the container, run: docker-compose down" 