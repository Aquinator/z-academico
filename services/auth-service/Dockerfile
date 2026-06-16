# ─── Stage 1: deps ───────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Instala apenas dependências de produção primeiro (cache layer)
COPY package*.json ./
RUN npm ci --only=production

# ─── Stage 2: development ────────────────────────────────────
FROM node:20-alpine AS development
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3001
CMD ["npm", "run", "dev"]

# ─── Stage 3: build/test ────────────────────────────────────
FROM node:20-alpine AS test
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run lint
RUN npm test

# ─── Stage 4: production ────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Usuário não-root por segurança
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copia apenas deps de produção do stage deps
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "src/server.js"]
