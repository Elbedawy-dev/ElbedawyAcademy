FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies (use the lockfile if present)
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi \
  && npm cache clean --force

COPY src ./src

RUN mkdir -p logs && chown -R node:node /app
USER node

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/api/v1/health || exit 1

CMD ["node", "src/server.js"]
