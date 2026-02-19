FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Build for production or run dev?
# For efficient dev in docker, we might want dev. But user asked for efficiency.
# Let's stick to dev for now to avoid build times during initial verification, 
# or build for "robustness".
# The user said "If docker is more efficient". A built image is more efficient at runtime.
# But for development/iteration, npm run dev is better.
# I'll enable dev mode by default for the "task" scope.

CMD ["npm", "run", "dev"]
