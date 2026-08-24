FROM node:20-alpine AS builder

WORKDIR /app

# ══════════════════════════════════════════════════════════════
# libssl — OBLIGATORIO para Prisma sobre Alpine.
#
# `node:20-alpine` (hoy Alpine 3.23, OpenSSL 3.5.x) no trae la librería.
# Sin ella `@prisma/get-platform` no detecta la versión de OpenSSL, cae al
# default `openssl-1.1.x` y elige un engine que no puede cargar:
#
#   prisma:warn Prisma failed to detect the libssl/openssl version to use...
#   Error: Could not parse schema engine response: SyntaxError: Unexpected
#   token 'E', "Error load"... is not valid JSON
#
# En el stage `builder` eso es solo un warning y el build sigue; el que
# revienta es el `runner` al correr `prisma migrate deploy` del CMD. Por eso
# va en LOS DOS stages.
#
# Va ANTES de `npm ci`: el postinstall de `@prisma/engines` detecta la
# plataforma en tiempo de instalación para decidir qué binario descargar.
# Con openssl presente resuelve `linux-musl-openssl-3.0.x` (el target de
# Prisma para cualquier OpenSSL 3.x sobre musl).
#
# libc6-compat (gcompat) es el shim de glibc: lo necesitan los binarios
# nativos precompilados contra glibc si algún paquete cae en ese prebuild.
# ══════════════════════════════════════════════════════════════
RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

# ══════════════════════════════════════════════════════════════
# libssl — OBLIGATORIO para Prisma sobre Alpine.
#
# `node:20-alpine` (hoy Alpine 3.23, OpenSSL 3.5.x) no trae la librería.
# Sin ella `@prisma/get-platform` no detecta la versión de OpenSSL, cae al
# default `openssl-1.1.x` y elige un engine que no puede cargar:
#
#   prisma:warn Prisma failed to detect the libssl/openssl version to use...
#   Error: Could not parse schema engine response: SyntaxError: Unexpected
#   token 'E', "Error load"... is not valid JSON
#
# En el stage `builder` eso es solo un warning y el build sigue; el que
# revienta es el `runner` al correr `prisma migrate deploy` del CMD. Por eso
# va en LOS DOS stages.
#
# Va ANTES de `npm ci`: el postinstall de `@prisma/engines` detecta la
# plataforma en tiempo de instalación para decidir qué binario descargar.
# Con openssl presente resuelve `linux-musl-openssl-3.0.x` (el target de
# Prisma para cualquier OpenSSL 3.x sobre musl).
#
# libc6-compat (gcompat) es el shim de glibc: lo necesitan los binarios
# nativos precompilados contra glibc si algún paquete cae en ese prebuild.
# ══════════════════════════════════════════════════════════════
RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

# CLI de Prisma + engines ya resueltos para linux-musl-openssl-3.0.x en el
# builder. No alcanza con `npm ci --omit=dev`: en varios servicios `prisma`
# es devDependency, así que el CMD terminaría haciendo que `npx` se baje
# prisma@latest de la red en CADA arranque — versión distinta a la del
# lockfile (v5) y un punto de falla de red en el boot. Copiándolo, el
# runtime usa exactamente el mismo CLI y los mismos engines que el build.
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

COPY prisma ./prisma

# NODE_ENV=production por defecto para que la imagen sea segura aunque la
# plataforma se olvide de setear la variable. Railway/compose la sobrescriben.
ENV NODE_ENV=production

EXPOSE 3006

# Se invoca el CLI por path absoluto dentro de node_modules en vez de `npx`:
# `npx` puede salir a la red a buscar el paquete si no lo resuelve local.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node dist/main"]
