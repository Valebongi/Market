# ══════════════════════════════════════════════════════════════════════════
# Frontend — Next.js 15 (output: "standalone", ver next.config.ts)
#
# ⚠️ EL CONTEXTO DE BUILD ES LA RAÍZ DEL MONOREPO, NO `frontend/`.
#
#     docker build -f frontend/Dockerfile -t davinci-frontend .     ← desde la raíz
#     docker build -t davinci-frontend ./frontend                   ← ROMPE
#
# Por qué: Railway autodetecta Next.js leyendo el `package.json` que esté en la
# RAÍZ del contexto de build. Si ahí encuentra `next` en `dependencies`, descarta
# este Dockerfile y aplica su propio plan de build, que falla sin emitir una sola
# línea de BuildKit. Con el contexto en la raíz del repo, el `package.json` de
# Next queda en el subdirectorio `frontend/` y la autodetección no se dispara.
# (Detalle completo del hallazgo y de los workarounds descartados —
#  RAILWAY_DOCKERFILE_PATH y railway.json — en documentacion/despliegue.md.)
#
# Consecuencia práctica: el lado IZQUIERDO de cada `COPY` va prefijado con
# `frontend/`. El `WORKDIR` interno sigue siendo `/app`.
# El filtrado del contexto lo hace el `.dockerignore` DE LA RAÍZ del repo
# (`frontend/.dockerignore` ya NO se lee con este contexto).
# ══════════════════════════════════════════════════════════════════════════

FROM node:20-alpine AS builder

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./

# ──────────────────────────────────────────────────────────────────────────
# Variables BUILD-TIME.
#
# Next.js reemplaza literalmente cada `process.env.NEXT_PUBLIC_*` por su valor
# durante `npm run build`. En los chunks compilados NO queda ninguna lectura de
# `process.env`: queda el string horneado. Si estas variables no llegan a este
# stage, el bundle sale con los fallbacks del código
# (`http://localhost:8080/api/v1`, `https://davinci-inventa.com`) y NINGUNA
# variable de runtime lo puede corregir después — hay que rebuildear la imagen.
#
# Railway inyecta las variables del servicio como build args SOLO si el
# Dockerfile las declara con `ARG`. Sin estos `ARG`, setearlas en el panel de
# Railway no cambia nada.
# ──────────────────────────────────────────────────────────────────────────
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_GITHUB_CLIENT_ID
# Opcional. Solo agrega un `remotePattern` http para next/image (uploads sin TLS,
# típicamente desarrollo). En producción no hace falta: next.config.ts ya cubre
# `https://**`, y si falta o es inválida el patrón se omite sin romper el build.
ARG ASSETS_SERVICE_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID \
    NEXT_PUBLIC_GITHUB_CLIENT_ID=$NEXT_PUBLIC_GITHUB_CLIENT_ID \
    ASSETS_SERVICE_URL=$ASSETS_SERVICE_URL

# ⚠️ NUNCA declarar GITHUB_CLIENT_SECRET como ARG/ENV en este stage.
# Se lee en RUNTIME dentro de app/api/auth/github/callback/route.ts (route
# handler, corre en el server), así que no necesita estar en el build; y si se
# pasara como build arg quedaría horneado en una capa de la imagen, visible con
# `docker history`. Va como variable de entorno del contenedor (stage runner).

# Fail-fast: preferimos que el build explote acá y no desplegar una imagen que
# apunta a localhost. Si querés construir sin API real, pasá el valor explícito.
RUN test -n "$NEXT_PUBLIC_API_URL" || ( \
      echo "ERROR: falta --build-arg NEXT_PUBLIC_API_URL." >&2; \
      echo "       Sin ella el bundle queda apuntando a http://localhost:8080/api/v1." >&2; \
      echo "       Ej: --build-arg NEXT_PUBLIC_API_URL=https://api.tu-dominio.com/api/v1" >&2; \
      exit 1 )

RUN npm run build

# ══════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
# server.js del build standalone lee PORT y HOSTNAME.
# Railway sobrescribe PORT; HOSTNAME=0.0.0.0 es necesario para que el contenedor
# sea alcanzable desde afuera (por defecto ya es 0.0.0.0, se explicita).
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Variables de RUNTIME (no se declaran acá, se pasan como env del contenedor):
#   GITHUB_CLIENT_SECRET  → app/api/auth/github/callback/route.ts

# Estos COPY salen del stage `builder`, NO del contexto: sus rutas son internas
# a la imagen (/app/...) y no cambian con el contexto de build.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
