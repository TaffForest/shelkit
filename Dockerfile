# Stage 1: Build client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine
WORKDIR /app

# Install git for GitHub clone feature
RUN apk add --no-cache git python3 make g++

# Copy server package and install deps
COPY package*.json ./
RUN npm ci --production

# Copy server code
COPY server/ ./server/

# Copy built client
COPY --from=client-build /app/client/dist ./client/dist

# Create data and uploads directories
RUN mkdir -p server/data server/uploads

# Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server/index.js"]
