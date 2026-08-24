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

# NODE_ENV=production por defecto para que la imagen sea segura aunque la
# plataforma se olvide de setear la variable. Railway/compose la sobrescriben.
ENV NODE_ENV=production

EXPOSE 3003

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
