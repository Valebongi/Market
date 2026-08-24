FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

# multer (diskStorage) escribe en process.cwd()/public/uploads y NO crea el
# directorio: si no existe, el upload de imágenes falla con 500. En
# docker-compose lo crea el volumen `assets_uploads`; en Railway no hay
# volumen por defecto, así que hay que crearlo en la imagen.
# OJO: el filesystem del contenedor es efímero — montá un Volume de Railway
# en /app/public/uploads o las imágenes subidas se pierden en cada deploy.
RUN mkdir -p /app/public/uploads

# NODE_ENV=production por defecto para que la imagen sea segura aunque la
# plataforma se olvide de setear la variable. Railway/compose la sobrescriben.
ENV NODE_ENV=production

EXPOSE 3002

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
