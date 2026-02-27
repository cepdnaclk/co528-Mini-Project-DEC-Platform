# Copy to each service root and adjust if needed
FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package definitions
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Run as non-root user
USER node

# Expose port (adjust per service if needed)
EXPOSE 3000

CMD ["node", "src/index.js"]
