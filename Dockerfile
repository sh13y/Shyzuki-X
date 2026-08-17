# ─── Stage 1: Base with Chromium ─────────────────────────────────────────────
FROM node:20-slim AS base

# Install Chromium and all required system libraries for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    libgbm-dev \
    libxkbcommon-x11-0 \
    libgtk-3-0 \
    libnss3 \
    libxss1 \
    libasound2 \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    wget \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use the system Chromium instead of downloading its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# ─── Stage 2: App ─────────────────────────────────────────────────────────────
WORKDIR /app

# Copy package files first (better layer caching)
COPY package.json package-lock.json* ./

# Install Node dependencies
RUN npm install --omit=dev

# Copy the rest of the source
COPY index.js find-lid.js ./

# Create a non-root user for security
RUN groupadd -r botuser && useradd -r -g botuser -G audio,video botuser \
    && mkdir -p /app/.wwebjs_auth /app/logs \
    && chown -R botuser:botuser /app

USER botuser

# ─── Runtime ──────────────────────────────────────────────────────────────────
EXPOSE 3000

CMD ["node", "index.js"]
