# syntax=docker/dockerfile:1

# ---------- Estágio 1: build (compila o TypeScript) ----------
FROM node:22-alpine AS build
WORKDIR /app

# Copiar só os manifestos primeiro aproveita o cache de camadas do Docker:
# as dependências só são reinstaladas quando o package-lock muda.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---------- Estágio 2: deps (só as dependências de produção) ----------
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------- Estágio 3: runtime (imagem final, sem ferramentas de build) ----------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# A API só precisa do node: tirar npm e yarn diminui a imagem e some com as vulnerabilidades que o Trivy achava neles.
RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx \
  /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*

COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Versão da aplicação (o pipeline passa o commit). Aparece em GET /health.
ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION}

# Executa como usuário sem privilégios.
USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/health" || exit 1

CMD ["node", "dist/server.js"]
