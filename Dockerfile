# ── Build stage ─────────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app
# youtube-dl-exec normally downloads a Python zipapp. Use yt-dlp's official
# standalone musl build so Alpine needs neither Python nor Deno.
ENV YOUTUBE_DL_FILENAME=yt-dlp_musllinux \
    YOUTUBE_DL_SKIP_PYTHON_CHECK=1
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Runtime stage ───────────────────────────────────────────
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    YOUTUBE_DL_FILENAME=yt-dlp_musllinux \
    YOUTUBE_DL_SKIP_PYTHON_CHECK=1
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

# Persist auth + media across container restarts via volumes.
VOLUME ["/app/sessions", "/app/media", "/app/logs"]

CMD ["node", "dist/index.js"]
