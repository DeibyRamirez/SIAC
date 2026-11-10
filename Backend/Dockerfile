# syntax=docker/dockerfile:1
# Imagen base fija: Node 24 LTS sobre Debian bookworm-slim.
ARG NODE_IMAGE=node:24.11.1-bookworm-slim@sha256:48abc13a19400ca3985071e287bd405a1d99306770eb81d61202fb6b65cf0b57

FROM ${NODE_IMAGE} AS base
ENV TZ=America/Bogota
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm exec prisma generate && pnpm exec nest build

# Herramientas de mantenimiento: migraciones, semilla y primer administrador (ts-node + prisma CLI).
FROM build AS tools
ENV NODE_ENV=production
WORKDIR /app

FROM build AS prod-deps
RUN pnpm exec prisma generate
RUN pnpm prune --prod

FROM base AS runtime
ENV NODE_ENV=production
ENV TZ=America/Bogota
WORKDIR /app
RUN mkdir -p /app/almacen-local && chown node:node /app/almacen-local
USER node
COPY --chown=node:node package.json pnpm-lock.yaml ./
COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/prisma ./prisma
EXPOSE 3001
ENV PUERTO=3001
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD node -e "const p=Number(process.env.PORT||process.env.PUERTO||3001);fetch('http://127.0.0.1:'+p+'/api/v1/salud').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/src/main.js"]
