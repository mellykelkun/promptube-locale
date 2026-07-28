# syntax=docker/dockerfile:1.7

FROM node:24.18.0-alpine3.23@sha256:595398b0081eacda8e1c4c5b97b76cd1020e4d58a8ebcb4843b9bca1e79e7436 AS base

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies

COPY package.json package-lock.json ./
RUN npm ci

FROM base AS production_dependencies

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && \
    rm -rf \
    node_modules/@esbuild* \
    node_modules/@esbuild-kit \
    node_modules/@vitejs \
    node_modules/@vitest \
    node_modules/drizzle-kit \
    node_modules/esbuild \
    node_modules/tsx \
    node_modules/vite \
    node_modules/vitest \
    /usr/local/lib/node_modules/corepack \
    /usr/local/lib/node_modules/npm \
    /usr/local/bin/corepack \
    /usr/local/bin/npm \
    /usr/local/bin/npx \
    /usr/local/bin/pnpm \
    /usr/local/bin/pnpx \
    /usr/local/bin/yarn \
    /usr/local/bin/yarnpkg

FROM base AS builder

ARG NEXT_PUBLIC_APP_NAME="Promptube Admin"
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM production_dependencies AS tools

ENV NODE_ENV=development

COPY --chown=node:node . .

USER node

FROM base AS runner

ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV PORT=3000

RUN rm -rf \
    /usr/local/lib/node_modules/corepack \
    /usr/local/lib/node_modules/npm \
    /usr/local/bin/corepack \
    /usr/local/bin/npm \
    /usr/local/bin/npx \
    /usr/local/bin/pnpm \
    /usr/local/bin/pnpx \
    /usr/local/bin/yarn \
    /usr/local/bin/yarnpkg

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=6 \
  CMD wget --quiet --spider http://127.0.0.1:3000/api/health/live || exit 1

CMD ["node", "server.js"]
