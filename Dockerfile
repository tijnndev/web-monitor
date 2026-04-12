FROM node:20

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Default command (will be overridden by docker-compose)
CMD ["node", "src/index.js"]
