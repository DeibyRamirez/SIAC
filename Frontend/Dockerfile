# syntax=docker/dockerfile:1
ARG NODE_IMAGE=node:24.11.1-bookworm-slim@sha256:48abc13a19400ca3985071e287bd405a1d99306770eb81d61202fb6b65cf0b57

FROM ${NODE_IMAGE} AS base
ENV TZ=America/Bogota
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# No hornear URL del backend ni demo de vigencia: API_URL_INTERNAL se define al ejecutar el contenedor.
ENV NEXT_PUBLIC_DEMO_VIGENCIA_7MIN=
ENV API_URL_INTERNAL=
ENV NEXT_PUBLIC_API_URL=
ENV SIAC_DOCKER_BUILD=true
RUN pnpm build

FROM base AS runtime
ENV NODE_ENV=production
ENV TZ=America/Bogota
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app
USER node
COPY --from=build /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok||r.status===307||r.status===308?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
