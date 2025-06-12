# Use Node.js LTS alpine image for small size
FROM node:18-alpine

# Set working directory inside container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage caching
COPY package*.json ./

# Install dependencies (only production if you want, or remove --production during dev)
RUN npm install

# Copy all source files
COPY . .

# Build TypeScript to JavaScript (make sure you have a build script)
RUN npm run build

# Expose the port your API will run on (adjust if needed)
EXPOSE 3000

# Run the compiled JavaScript from dist folder
CMD ["node", "dist/index.js"]
