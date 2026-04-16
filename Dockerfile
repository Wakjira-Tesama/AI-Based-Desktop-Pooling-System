FROM node:20-slim

# Install Tesseract and other dependencies for Sharp and OCR
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY backend/package*.json ./
RUN npm install --production

# Copy source code
COPY backend/src ./src

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8000

# Start command
CMD ["npm", "start"]
