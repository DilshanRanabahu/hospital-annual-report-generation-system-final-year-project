# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Set environment variables for production API URL (can be overriden or handled via nginx proxy)
ENV VITE_API_BASE_URL=/api
ENV VITE_WS_URL=/ws
RUN npm run build

# Serve stage
FROM nginx:alpine
# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html
# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
