FROM node:20-bullseye

# Install system tools for PDF processing
RUN apt-get update && apt-get install -y --no-install-recommends \
  qpdf \
  ghostscript \
  imagemagick \
  fontconfig \
  fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files from backend directory
COPY myapp-backend/package*.json ./
RUN npm install --omit=dev

# Copy backend source code
COPY myapp-backend/ .

ENV NODE_ENV=production

# Expose the port
EXPOSE 8000

CMD ["node", "server.js"]
