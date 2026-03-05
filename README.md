# Da Vinci Inventa — Marketplace de Licencias Intelectuales

Plataforma SaaS que conecta titulares de activos intelectuales con emprendedores.

## Arquitectura

```
frontend/          → Next.js 15 + TailwindCSS (puerto 3000)
backend/
  gateway/         → API Gateway NestJS (puerto 8080)
  auth-service/    → Autenticación JWT + OAuth (puerto 3001)
  assets-service/  → CRUD de activos (puerto 3002)
  users-service/   → Perfiles de usuario (puerto 3003)
  messaging-service/ → Solicitudes y mensajería (puerto 3004)
  domains-service/ → Búsqueda de dominios (puerto 3005)
  admin-service/   → Moderación y métricas (puerto 3006)
```

## Inicio Rápido (Docker)

```bash
# 1. Clonar y entrar al directorio
cd Marketplace

# 2. Copiar variables de entorno
cp backend/auth-service/.env.example backend/auth-service/.env
cp backend/assets-service/.env.example backend/assets-service/.env
cp backend/users-service/.env.example backend/users-service/.env
cp backend/messaging-service/.env.example backend/messaging-service/.env
cp backend/domains-service/.env.example backend/domains-service/.env
cp backend/admin-service/.env.example backend/admin-service/.env
cp backend/gateway/.env.example backend/gateway/.env

# 3. Levantar todo
docker compose up --build

# Frontend → http://localhost:3000
# API Gateway → http://localhost:8080/api/v1
```

## Desarrollo Local

### Frontend
```bash
cd frontend
npm install
npm run dev       # → http://localhost:3000
```

### Backend (cada servicio en su terminal)
```bash
# Base de datos (solo postgres)
docker compose up postgres -d

# Auth Service
cd backend/auth-service
npm install
npx prisma migrate dev
npm run dev

# Assets Service
cd backend/assets-service
npm install
npx prisma migrate dev
npm run dev

# (repetir para users, messaging, domains, admin)

# Gateway (último)
cd backend/gateway
npm install
npm run dev
```

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15, React 19, TailwindCSS, Radix UI, Recharts |
| Backend | NestJS 10, TypeScript, Prisma ORM |
| Base de datos | PostgreSQL 16 |
| Auth | JWT, Passport.js |
| Containerización | Docker, Docker Compose |

## Variables de Entorno Críticas

- `JWT_SECRET` — debe ser igual en `gateway` y `auth-service`
- `DATABASE_URL` — cada servicio tiene su propia base de datos
- `FRONTEND_URL` — configurar en producción

## Roles de Usuario

| Rol | Permisos |
|-----|----------|
| `admin` | Acceso total, moderación, métricas |
| `asset_owner` | Publicar activos, gestionar solicitudes recibidas |
| `entrepreneur` | Explorar activos, enviar solicitudes |
