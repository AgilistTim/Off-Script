#!/bin/sh
set -e

ENV_FILE="/usr/share/nginx/html/environment.js"

echo "=== Docker Entrypoint Debug ==="
echo "ENV_FILE: $ENV_FILE"
echo "File exists: $(test -f "$ENV_FILE" && echo "YES" || echo "NO")"
echo "All environment variables starting with VITE_:"
env | grep "VITE_" || echo "NO VITE_ ENVIRONMENT VARIABLES FOUND!"
echo ""
echo "Individual variable check:"
echo "  VITE_FIREBASE_API_KEY: ${VITE_FIREBASE_API_KEY:-NOT_SET}"
echo "  VITE_FIREBASE_AUTH_DOMAIN: ${VITE_FIREBASE_AUTH_DOMAIN:-NOT_SET}"
echo "  VITE_FIREBASE_PROJECT_ID: ${VITE_FIREBASE_PROJECT_ID:-NOT_SET}"
echo "  VITE_FIREBASE_STORAGE_BUCKET: ${VITE_FIREBASE_STORAGE_BUCKET:-NOT_SET}"
echo "  VITE_FIREBASE_MESSAGING_SENDER_ID: ${VITE_FIREBASE_MESSAGING_SENDER_ID:-NOT_SET}"
echo "  VITE_FIREBASE_APP_ID: ${VITE_FIREBASE_APP_ID:-NOT_SET}"
echo "  VITE_FIREBASE_MEASUREMENT_ID: ${VITE_FIREBASE_MEASUREMENT_ID:-NOT_SET}"

if [ -f "$ENV_FILE" ]; then
    echo "Current file contents:"
    cat "$ENV_FILE"
    echo ""
    echo "File permissions: $(ls -la "$ENV_FILE")"
else
    echo "❌ ERROR: Environment file not found at $ENV_FILE"
    echo "Available files in /usr/share/nginx/html/:"
    ls -la /usr/share/nginx/html/ || echo "Cannot list directory"
    echo "This should not happen - check Dockerfile COPY instructions"
fi

# Check if the file has already been processed by looking for the marker
if ! grep -q "__FIREBASE_API_KEY__" "$ENV_FILE" 2>/dev/null; then
    echo "Environment variables already injected, skipping..."
else
    echo "Found placeholders, injecting environment variables..."
    
    # Check if we have required environment variables
    if [ -z "$VITE_FIREBASE_API_KEY" ] || [ -z "$VITE_FIREBASE_PROJECT_ID" ] || [ -z "$VITE_FIREBASE_AUTH_DOMAIN" ]; then
        echo "❌ CRITICAL ERROR: Required environment variables are missing!"
        echo "This usually means Render environment variables are not configured properly."
        echo "Please check your Render service environment settings."
        echo "Required variables: VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_AUTH_DOMAIN"
        echo "Proceeding with fallback values - app will NOT work correctly!"
    fi
    
    # Replace placeholder values in environment.js with actual environment variables
    sed -i "s|__FIREBASE_API_KEY__|${VITE_FIREBASE_API_KEY:-demo-key-missing}|g" "$ENV_FILE"
    sed -i "s|__FIREBASE_AUTH_DOMAIN__|${VITE_FIREBASE_AUTH_DOMAIN:-demo.firebaseapp.com}|g" "$ENV_FILE"
    sed -i "s|__FIREBASE_PROJECT_ID__|${VITE_FIREBASE_PROJECT_ID:-demo-project-missing}|g" "$ENV_FILE"
    sed -i "s|__FIREBASE_STORAGE_BUCKET__|${VITE_FIREBASE_STORAGE_BUCKET:-demo.appspot.com}|g" "$ENV_FILE"
    sed -i "s|__FIREBASE_MESSAGING_SENDER_ID__|${VITE_FIREBASE_MESSAGING_SENDER_ID:-123456789}|g" "$ENV_FILE"
    sed -i "s|__FIREBASE_APP_ID__|${VITE_FIREBASE_APP_ID:-1:123456789:web:demo}|g" "$ENV_FILE"
    sed -i "s|__FIREBASE_MEASUREMENT_ID__|${VITE_FIREBASE_MEASUREMENT_ID:-G-DEMO}|g" "$ENV_FILE"
    
    if [ -n "$VITE_FIREBASE_API_KEY" ] && [ -n "$VITE_FIREBASE_PROJECT_ID" ]; then
        echo "✅ Environment variables injected successfully!"
    else
        echo "⚠️ Environment variables injected with fallback values - check Render config!"
    fi
fi

if [ -f "$ENV_FILE" ]; then
    echo "Final file contents:"
    cat "$ENV_FILE"
    echo ""
fi

echo "=== End Debug ==="

# Start nginx
exec nginx -g "daemon off;" 