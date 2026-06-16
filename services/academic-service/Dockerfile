# ─── Stage 1: deps ───────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ─── Stage 2: development ────────────────────────────────────
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3002
CMD ["npm", "run", "dev"]

# ─── Stage 3: production ────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

USER nodejs
EXPOSE 3002

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3002/health || exit 1

CMD ["node", "src/server.js"]
