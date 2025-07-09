#!/bin/sh
# Docker entrypoint script for Off-Script application
# This script validates environment variables and injects them into the environment.js file

set -e

ENV_FILE="/usr/share/nginx/html/environment.js"
ENV_TEMPLATE="/usr/share/nginx/html/environment.template.js"

# Validate critical environment variables
validate_environment_variables() {
  echo "🔍 Validating environment variables..."
  
  # List of all required environment variables
  REQUIRED_VARS="VITE_FIREBASE_API_KEY VITE_FIREBASE_PROJECT_ID VITE_FIREBASE_AUTH_DOMAIN"
  MISSING_VARS=""
  
  for VAR in $REQUIRED_VARS; do
    if [ -z "$(eval echo \$$VAR)" ]; then
      MISSING_VARS="$MISSING_VARS $VAR"
    fi
  done
  
  if [ -n "$MISSING_VARS" ]; then
    echo "❌ ERROR: Missing required environment variables:$MISSING_VARS"
    echo "Please set these variables in your environment or docker-compose.yml file."
    exit 1
  fi
  
  # Check for placeholder values
  if echo "$VITE_FIREBASE_API_KEY" | grep -q "YOUR_" || \
     echo "$VITE_FIREBASE_API_KEY" | grep -q "your-" || \
     echo "$VITE_FIREBASE_API_KEY" | grep -q "demo-" || \
     echo "$VITE_FIREBASE_API_KEY" | grep -q "REPLACE_WITH_"; then
    echo "❌ ERROR: VITE_FIREBASE_API_KEY contains a placeholder value."
    echo "Please replace it with your actual Firebase API key."
    exit 1
  fi
  
  echo "✅ Environment validation passed!"
}

# Display environment variables (redacted for security)
echo "🔧 Environment variables:"
echo "  VITE_FIREBASE_API_KEY: ${VITE_FIREBASE_API_KEY:-NOT_SET} (redacted)"
echo "  VITE_FIREBASE_AUTH_DOMAIN: ${VITE_FIREBASE_AUTH_DOMAIN:-NOT_SET}"
echo "  VITE_FIREBASE_PROJECT_ID: ${VITE_FIREBASE_PROJECT_ID:-NOT_SET}"
echo "  VITE_FIREBASE_STORAGE_BUCKET: ${VITE_FIREBASE_STORAGE_BUCKET:-NOT_SET}"
echo "  VITE_FIREBASE_MESSAGING_SENDER_ID: ${VITE_FIREBASE_MESSAGING_SENDER_ID:-NOT_SET}"
echo "  VITE_FIREBASE_APP_ID: ${VITE_FIREBASE_APP_ID:-NOT_SET}"
echo "  VITE_FIREBASE_MEASUREMENT_ID: ${VITE_FIREBASE_MEASUREMENT_ID:-NOT_SET}"
echo "  VITE_YOUTUBE_API_KEY: ${VITE_YOUTUBE_API_KEY:-NOT_SET} (redacted)"
echo "  VITE_RECAPTCHA_SITE_KEY: ${VITE_RECAPTCHA_SITE_KEY:-NOT_SET} (redacted)"
echo "  VITE_BUMPUPS_API_KEY: ${VITE_BUMPUPS_API_KEY:-NOT_SET} (redacted)"
echo "  VITE_BUMPUPS_PROXY_URL: ${VITE_BUMPUPS_PROXY_URL:-NOT_SET}"
echo "  VITE_OPENAI_API_KEY: ${VITE_OPENAI_API_KEY:-NOT_SET} (redacted)"
echo "  VITE_OPENAI_ASSISTANT_URL: ${VITE_OPENAI_ASSISTANT_URL:-NOT_SET}"

# Validate environment variables
validate_environment_variables

# Check if environment.js file exists
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ ERROR: Environment file $ENV_FILE not found."
  exit 1
fi

# Check if environment.template.js file exists
if [ ! -f "$ENV_TEMPLATE" ]; then
  echo "❌ ERROR: Environment template file $ENV_TEMPLATE not found."
  exit 1
fi

# Check if the template file contains the expected placeholders
if ! grep -q "__FIREBASE_API_KEY__" "$ENV_TEMPLATE" 2>/dev/null; then
  echo "❌ ERROR: Environment template file does not contain expected placeholders."
  exit 1
fi

# Validate required environment variables
if [ -z "$VITE_FIREBASE_API_KEY" ] || [ -z "$VITE_FIREBASE_PROJECT_ID" ] || [ -z "$VITE_FIREBASE_AUTH_DOMAIN" ]; then
  echo "❌ ERROR: Missing required environment variables."
  echo "Required variables: VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_AUTH_DOMAIN"
  exit 1
fi

# Copy template to environment.js
cp "$ENV_TEMPLATE" "$ENV_FILE"

# Replace placeholders in environment.js with actual values
sed -i "s|__FIREBASE_API_KEY__|${VITE_FIREBASE_API_KEY:-demo-key-missing}|g" "$ENV_FILE"
sed -i "s|__FIREBASE_AUTH_DOMAIN__|${VITE_FIREBASE_AUTH_DOMAIN:-demo-domain-missing}|g" "$ENV_FILE"
sed -i "s|__FIREBASE_PROJECT_ID__|${VITE_FIREBASE_PROJECT_ID:-demo-project-missing}|g" "$ENV_FILE"
sed -i "s|__FIREBASE_STORAGE_BUCKET__|${VITE_FIREBASE_STORAGE_BUCKET:-demo-bucket-missing}|g" "$ENV_FILE"
sed -i "s|__FIREBASE_MESSAGING_SENDER_ID__|${VITE_FIREBASE_MESSAGING_SENDER_ID:-000000000000}|g" "$ENV_FILE"
sed -i "s|__FIREBASE_APP_ID__|${VITE_FIREBASE_APP_ID:-demo-app-id-missing}|g" "$ENV_FILE"
sed -i "s|__FIREBASE_MEASUREMENT_ID__|${VITE_FIREBASE_MEASUREMENT_ID:-G-XXXXXXXXXX}|g" "$ENV_FILE"
sed -i "s|__YOUTUBE_API_KEY__|${VITE_YOUTUBE_API_KEY:-}|g" "$ENV_FILE"
sed -i "s|__RECAPTCHA_SITE_KEY__|${VITE_RECAPTCHA_SITE_KEY:-}|g" "$ENV_FILE"
sed -i "s|__BUMPUPS_API_KEY__|${VITE_BUMPUPS_API_KEY:-}|g" "$ENV_FILE"
sed -i "s|__OPENAI_API_KEY__|${VITE_OPENAI_API_KEY:-}|g" "$ENV_FILE"
sed -i "s|__OPENAI_ASSISTANT_URL__|${VITE_OPENAI_ASSISTANT_URL:-}|g" "$ENV_FILE"

# Handle BUMPUPS_PROXY_URL with default fallback
BUMPUPS_PROXY_DEFAULT="https://us-central1-${VITE_FIREBASE_PROJECT_ID:-offscript-8f6eb}.cloudfunctions.net/bumpupsProxy"
BUMPUPS_PROXY_FINAL="${VITE_BUMPUPS_PROXY_URL:-$BUMPUPS_PROXY_DEFAULT}"

if [ "$VITE_BUMPUPS_PROXY_URL" = "NOT_SET" ] || [ -z "$VITE_BUMPUPS_PROXY_URL" ]; then
  echo "🔧 Using default bumpups proxy URL: $BUMPUPS_PROXY_DEFAULT"
  BUMPUPS_PROXY_FINAL="$BUMPUPS_PROXY_DEFAULT"
fi

sed -i "s|__BUMPUPS_PROXY_URL__|${BUMPUPS_PROXY_FINAL}|g" "$ENV_FILE"

# Handle OPENAI_ASSISTANT_URL with default fallback
OPENAI_ASSISTANT_DEFAULT="https://us-central1-${VITE_FIREBASE_PROJECT_ID:-offscript-8f6eb}.cloudfunctions.net"
OPENAI_ASSISTANT_FINAL="${VITE_OPENAI_ASSISTANT_URL:-$OPENAI_ASSISTANT_DEFAULT}"

if [ "$VITE_OPENAI_ASSISTANT_URL" = "NOT_SET" ] || [ -z "$VITE_OPENAI_ASSISTANT_URL" ]; then
  echo "🔧 Using default OpenAI Assistant URL: $OPENAI_ASSISTANT_DEFAULT"
  OPENAI_ASSISTANT_FINAL="$OPENAI_ASSISTANT_DEFAULT"
fi

sed -i "s|__OPENAI_ASSISTANT_URL__|${OPENAI_ASSISTANT_FINAL}|g" "$ENV_FILE"

if [ -n "$VITE_FIREBASE_API_KEY" ] && [ -n "$VITE_FIREBASE_PROJECT_ID" ]; then
  echo "✅ Environment variables successfully injected into $ENV_FILE"
else
  echo "⚠️ Warning: Some environment variables may be missing."
fi

# Start nginx
echo "🚀 Starting nginx..."
exec nginx -g "daemon off;" 