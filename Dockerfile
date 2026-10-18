# LeadNet API — Cloud Run image. Build context is the repo root (npm workspaces).
FROM node:22-slim AS build
WORKDIR /repo
COPY package.json package-lock.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @leadnet/api --include-workspace-root
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @leadnet/api

FROM node:22-slim AS deps
WORKDIR /repo
COPY package.json package-lock.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @leadnet/api --omit=dev

FROM node:22-slim
ENV NODE_ENV=production
ENV FFMPEG_PATH=/usr/bin/ffmpeg
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /srv
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/data ./data
USER node
EXPOSE 8080
CMD ["node", "dist/server.js"]
