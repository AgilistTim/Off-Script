FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create a script to generate environment.js at runtime
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-create-env-file.sh && \
    echo 'cat > /usr/share/nginx/html/environment.js << EOF' >> /docker-entrypoint.d/40-create-env-file.sh && \
    echo 'window.ENV = {' >> /docker-entrypoint.d/40-create-env-file.sh && \
    echo '  VITE_FIREBASE_API_KEY: "${VITE_FIREBASE_API_KEY}",' >> /docker-entrypoint.d/40-create-env-file.sh && \
    echo '  VITE_FIREBASE_AUTH_DOMAIN: "${VITE_FIREBASE_AUTH_DOMAIN}",' >> /docker-entrypoint.d/40-create-env-file.sh && \
    echo '  VITE_FIREBASE_PROJECT_ID: "${VITE_FIREBASE_PROJECT_ID}",' >> /docker-entrypoint.d/40-create-env-file.sh && \
    echo '  VITE_FIREBASE_STORAGE_BUCKET: "${VITE_FIREBASE_STORAGE_BUCKET}",' >> /docker-entrypoint.d/40-create-env-file.sh && \
    echo '  VITE_FIREBASE_MESSAGING_SENDER_ID: "${VITE_FIREBASE_MESSAGING_SENDER_ID}",' >> /docker-entrypoint.d/40-create-env-file.sh && \
    echo '  VITE_FIREBASE_APP_ID: "${VITE_FIREBASE_APP_ID}",' >> /docker-entrypoint.d/40-create-env-file.sh && \
    echo '  VITE_FIREBASE_MEASUREMENT_ID: "${VITE_FIREBASE_MEASUREMENT_ID}"' >> /docker-entrypoint.d/40-create-env-file.sh && \
    echo '};' >> /docker-entrypoint.d/40-create-env-file.sh && \
    echo 'EOF' >> /docker-entrypoint.d/40-create-env-file.sh && \
    echo 'echo "Environment variables injected into environment.js"' >> /docker-entrypoint.d/40-create-env-file.sh && \
    chmod +x /docker-entrypoint.d/40-create-env-file.sh

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"] 