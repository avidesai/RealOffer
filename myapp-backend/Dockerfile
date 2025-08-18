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

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production

CMD ["node", "server.js"]


