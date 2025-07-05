#!/bin/sh
set -e

ENV_FILE="/usr/share/nginx/html/environment.js"

echo "=== Docker Entrypoint Debug ==="
echo "ENV_FILE: $ENV_FILE"
echo "File exists: $(test -f "$ENV_FILE" && echo "YES" || echo "NO")"
echo "Environment variables available:"
echo "  VITE_FIREBASE_API_KEY: ${VITE_FIREBASE_API_KEY:-NOT_SET}"
echo "  VITE_FIREBASE_PROJECT_ID: ${VITE_FIREBASE_PROJECT_ID:-NOT_SET}"

if [ -f "$ENV_FILE" ]; then
    echo "Current file contents:"
    cat "$ENV_FILE"
    echo ""
fi

# Check if the file has already been processed by looking for the marker
if ! grep -q "__FIREBASE_API_KEY__" "$ENV_FILE" 2>/dev/null; then
    echo "Environment variables already injected, skipping..."
else
    echo "Found placeholders, injecting environment variables..."
    
    # Replace placeholder values in environment.js with actual environment variables
    sed -i "s|__FIREBASE_API_KEY__|${VITE_FIREBASE_API_KEY:-demo-key}|g" "$ENV_FILE"
    sed -i "s|__FIREBASE_AUTH_DOMAIN__|${VITE_FIREBASE_AUTH_DOMAIN:-demo.firebaseapp.com}|g" "$ENV_FILE"
    sed -i "s|__FIREBASE_PROJECT_ID__|${VITE_FIREBASE_PROJECT_ID:-demo-project}|g" "$ENV_FILE"
    sed -i "s|__FIREBASE_STORAGE_BUCKET__|${VITE_FIREBASE_STORAGE_BUCKET:-demo.appspot.com}|g" "$ENV_FILE"
    sed -i "s|__FIREBASE_MESSAGING_SENDER_ID__|${VITE_FIREBASE_MESSAGING_SENDER_ID:-123456789}|g" "$ENV_FILE"
    sed -i "s|__FIREBASE_APP_ID__|${VITE_FIREBASE_APP_ID:-1:123456789:web:demo}|g" "$ENV_FILE"
    sed -i "s|__FIREBASE_MEASUREMENT_ID__|${VITE_FIREBASE_MEASUREMENT_ID:-G-DEMO}|g" "$ENV_FILE"
    
    echo "Environment variables injected successfully!"
fi

if [ -f "$ENV_FILE" ]; then
    echo "Final file contents:"
    cat "$ENV_FILE"
    echo ""
fi

echo "=== End Debug ==="

# Start nginx
exec nginx -g "daemon off;" 