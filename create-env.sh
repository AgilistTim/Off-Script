#!/bin/bash

# Check if .env file already exists
if [ -f .env ]; then
  echo ".env file already exists. Do you want to overwrite it? (y/n)"
  read -r answer
  if [ "$answer" != "y" ]; then
    echo "Operation cancelled."
    exit 0
  fi
fi

echo "Creating .env file for Firebase configuration..."
echo "Please enter your Firebase configuration values:"

echo -n "Firebase API Key: "
read -r api_key

echo -n "Firebase Auth Domain: "
read -r auth_domain

echo -n "Firebase Project ID: "
read -r project_id

echo -n "Firebase Storage Bucket: "
read -r storage_bucket

echo -n "Firebase Messaging Sender ID: "
read -r messaging_sender_id

echo -n "Firebase App ID: "
read -r app_id

echo -n "Firebase Measurement ID: "
read -r measurement_id

# Write to .env file
cat > .env << EOF
VITE_FIREBASE_API_KEY=$api_key
VITE_FIREBASE_AUTH_DOMAIN=$auth_domain
VITE_FIREBASE_PROJECT_ID=$project_id
VITE_FIREBASE_STORAGE_BUCKET=$storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=$messaging_sender_id
VITE_FIREBASE_APP_ID=$app_id
VITE_FIREBASE_MEASUREMENT_ID=$measurement_id
EOF

echo ".env file created successfully!"
echo "You can now run ./run-docker-local.sh to start the Docker container." 