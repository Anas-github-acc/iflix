# Use Alpine-based Node.js image for smaller footprint
FROM node:18-alpine3.20 AS builder
WORKDIR /app

COPY package*.json ./
# Use clean install for reproducible builds
RUN npm ci

COPY src/ ./src/
COPY tsconfig.json ./

### Production stage ###
FROM node:18-alpine3.20
WORKDIR /app

COPY package*.json ./
# Install only production dependencies
RUN npm ci --omit=dev && \
    npm install tsx --location=global

# Copy source from builder
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./

# Expose the port used by the server
EXPOSE 8000

# Use tsx to run TypeScript directly
CMD ["tsx", "src/server.ts"]
