FROM node:18-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm config set fetch-retry-maxtimeout 600000 -g && npm install --network-timeout=1000000

# Copy the rest of the application
COPY . .

# Build the TypeScript code
RUN npm run build

# Expose the port the app runs on
EXPOSE 3005

# Start the application
CMD ["npm", "start"]
