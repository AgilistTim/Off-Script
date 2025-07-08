# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Copy source code (excluding sensitive files via .dockerignore)
COPY . .

# Build the app with production optimizations
ENV NODE_ENV=production
RUN npm run build

# Production stage
FROM nginx:alpine

# Add security headers and remove server tokens
RUN sed -i 's/#server_tokens off;/server_tokens off;/' /etc/nginx/nginx.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy template environment file
COPY public/environment.template.js /usr/share/nginx/html/environment.js

# Copy nginx configuration with security headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Ensure nginx can write to html directory for environment.js updates
RUN chmod 755 /usr/share/nginx/html

# Expose port
EXPOSE 80

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Set entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 