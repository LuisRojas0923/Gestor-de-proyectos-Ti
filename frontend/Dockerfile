# 1. Base Image: Use a slim and specific Node.js version.
FROM node:20-slim

# 2. Set Working Directory.
WORKDIR /app

# 3. Install Dependencies: Copy package files first to leverage Docker's cache.
# This layer is only rebuilt when package.json or package-lock.json changes.
COPY package*.json ./
RUN npm install

# 4. Copy Application Code.
COPY . .

# 5. Expose Port for Vite.
EXPOSE 5173
