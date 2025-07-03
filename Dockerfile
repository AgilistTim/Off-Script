FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Create a script to generate environment.js at runtime
RUN echo "const createEnvFile = () => {" > /app/create-env.js && \
    echo "  const fs = require('fs');" >> /app/create-env.js && \
    echo "  const envContent = \`window.ENV = {" >> /app/create-env.js && \
    echo "    VITE_FIREBASE_API_KEY: '\${process.env.VITE_FIREBASE_API_KEY}'," >> /app/create-env.js && \
    echo "    VITE_FIREBASE_AUTH_DOMAIN: '\${process.env.VITE_FIREBASE_AUTH_DOMAIN}'," >> /app/create-env.js && \
    echo "    VITE_FIREBASE_PROJECT_ID: '\${process.env.VITE_FIREBASE_PROJECT_ID}'," >> /app/create-env.js && \
    echo "    VITE_FIREBASE_STORAGE_BUCKET: '\${process.env.VITE_FIREBASE_STORAGE_BUCKET}'," >> /app/create-env.js && \
    echo "    VITE_FIREBASE_MESSAGING_SENDER_ID: '\${process.env.VITE_FIREBASE_MESSAGING_SENDER_ID}'," >> /app/create-env.js && \
    echo "    VITE_FIREBASE_APP_ID: '\${process.env.VITE_FIREBASE_APP_ID}'," >> /app/create-env.js && \
    echo "    VITE_FIREBASE_MEASUREMENT_ID: '\${process.env.VITE_FIREBASE_MEASUREMENT_ID}'," >> /app/create-env.js && \
    echo "  };\`;" >> /app/create-env.js && \
    echo "  fs.writeFileSync('/usr/share/nginx/html/environment.js', envContent);" >> /app/create-env.js && \
    echo "};" >> /app/create-env.js && \
    echo "createEnvFile();" >> /app/create-env.js

RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/create-env.js /app/create-env.js
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create a startup script
RUN echo "#!/bin/sh" > /docker-entrypoint.d/40-create-env-file.sh && \
    echo "node /app/create-env.js" >> /docker-entrypoint.d/40-create-env-file.sh && \
    chmod +x /docker-entrypoint.d/40-create-env-file.sh

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"] 