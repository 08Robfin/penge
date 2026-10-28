FROM node:24-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY worker/package.json ./worker/package.json
RUN npm install --global npm@12.2.1 && npm ci

FROM deps AS build
COPY . .
ARG NEXT_PUBLIC_SERVICE_PROVIDER_NAME=Penge
ARG NEXT_PUBLIC_SERVICE_PROVIDER_URL
ENV NEXT_PUBLIC_SERVICE_PROVIDER_NAME="${NEXT_PUBLIC_SERVICE_PROVIDER_NAME}"
ENV NEXT_PUBLIC_SERVICE_PROVIDER_URL="${NEXT_PUBLIC_SERVICE_PROVIDER_URL}"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM deps AS worker-build
COPY src/lib ./src/lib
COPY scripts/mail-worker.ts scripts/runtime-config.cjs ./scripts/
RUN npx esbuild scripts/mail-worker.ts --bundle --platform=node --target=node24 --format=esm --packages=external --outfile=dist/mail-worker.mjs

FROM deps AS worker-deps
RUN npm ci --omit=dev --workspace worker --include-workspace-root=false

FROM node:24-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS runtime-base
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg \
 && apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --only-upgrade tzdata \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --chown=node:node LICENSE ./LICENSE
USER node

FROM runtime-base AS mail-worker
COPY --from=worker-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=worker-deps --chown=node:node /app/worker/package.json ./worker/package.json
COPY --from=worker-build --chown=node:node /app/dist/mail-worker.mjs ./mail-worker.mjs
CMD ["node","mail-worker.mjs"]

FROM runtime-base AS runtime
ENV PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --chown=node:node scripts/start.cjs scripts/runtime-config.cjs ./scripts/
EXPOSE 3000
CMD ["node","scripts/start.cjs"]
