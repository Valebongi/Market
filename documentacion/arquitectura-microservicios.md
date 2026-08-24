# Arquitectura de Microservicios — Da Vinci Inventa

## Visión general

Da Vinci Inventa sigue una arquitectura de **microservicios desacoplados**, donde cada dominio de negocio es un servicio NestJS independiente con su propia base de datos PostgreSQL. El frontend Next.js nunca se comunica directamente con los servicios: todo pasa por un **API Gateway** centralizado.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                        │
│                     Next.js 15 – puerto 3000                    │
└────────────────────────────┬────────────────────────────────────┘
                             │  HTTP (localhost:8080/api/v1/*)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY – puerto 8080                  │
│  • Valida JWT → inyecta x-user-id, x-user-email, x-user-role   │
│  • Proxy HTTP hacia el microservicio correspondiente            │
│  • Rate limiting (100 req/min por IP)                           │
│  • Rutas públicas excluidas de autenticación                    │
└──────┬──────┬──────┬──────┬──────┬──────┬───────────────────────┘
       │      │      │      │      │      │
      3001   3002   3003   3004   3005   3006
       │      │      │      │      │      │
    auth  assets  users  msg  domains admin
```

---

## Principios de diseño

### 1. Base de datos por servicio
Cada microservicio posee su base de datos PostgreSQL exclusiva. No hay joins entre bases de datos. La sincronización de datos se realiza mediante llamadas HTTP directas entre servicios (fire-and-forget) o mediante datos redundantes cacheados.

### 2. Gateway como único punto de entrada
El frontend solo habla con `localhost:8080/api/v1/*`. El gateway:
- Verifica el JWT y lo transforma en headers internos (`x-user-id`, `x-user-email`, `x-user-role`).
- Hace proxy transparente del request al servicio destino según el prefijo de ruta.
- Para multipart/form-data (upload de imágenes), hace pipe directo del stream sin buffering.

### 3. Autenticación sin estado (JWT)
El token JWT contiene `{ sub: userId, email, role }`. Los microservicios confían en los headers inyectados por el gateway sin re-verificar el token. Esto evita dependencia de `auth-service` en cada request.

### 4. Comunicación síncrona HTTP
Los servicios se comunican entre sí de forma síncrona vía HTTP cuando necesitan datos del dominio de otro servicio (ej: `auth-service` sincroniza el perfil a `users-service` al registrar un usuario). Estas llamadas son **fire-and-forget** (no bloquean la respuesta al cliente si fallan).

---

## Routing del gateway

| Prefijo de ruta | Servicio destino | Puerto |
|---|---|---|
| `/api/v1/auth/*` | auth-service | 3001 |
| `/api/v1/assets/*` | assets-service | 3002 |
| `/api/v1/users/*` | users-service | 3003 |
| `/api/v1/requests/*` | messaging-service | 3004 |
| `/api/v1/domains/*` | domains-service | 3005 |
| `/api/v1/admin/*` | admin-service | 3006 |

### Rutas públicas (sin JWT requerido)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/assets` | Listar activos del marketplace |
| GET | `/api/v1/assets/:id` | Ver detalle de un activo |
| GET | `/api/v1/assets/slug/:slug` | Ver activo por slug |
| GET | `/api/v1/users/:userId` | Ver perfil público de usuario |
| POST | `/api/v1/auth/register` | Registro de usuario |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/forgot-password` | Solicitar reset de contraseña |
| POST | `/api/v1/auth/reset-password` | Aplicar nuevo password |
| POST | `/api/v1/auth/oauth/callback` | Login con OAuth |

---

## Seguridad

- **HTTPS en producción**: HSTS configurado en Next.js (`max-age=31536000; includeSubDomains; preload`)
- **Headers de seguridad**: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`
- **Rate limiting**: 100 requests/minuto por IP en el gateway
- **Rutas privadas**: `/dashboard/*` tiene `X-Robots-Tag: noindex, nofollow`
- **Contraseñas**: bcrypt con 12 rondas de salt
- **Tokens de reset**: 32 bytes aleatorios (hex), expiran en 1 hora, se invalidan al usarse

---

## Estructura del repositorio (monorepo)

```
Marketplace/
├── frontend/                    # Next.js 15 App Router
│   ├── app/
│   │   ├── (auth)/              # Login, Register, Forgot/Reset Password
│   │   ├── (public)/            # Landing, Assets marketplace, Terms, Privacy
│   │   └── dashboard/           # Panel privado (requiere auth)
│   │       ├── assets/          # CRUD de activos del usuario
│   │       ├── requests/        # Solicitudes de licencia
│   │       ├── saved/           # Activos guardados
│   │       ├── explore/         # Explorar marketplace
│   │       ├── domains/         # Dominios
│   │       ├── settings/        # Perfil y configuración
│   │       └── admin/           # Panel de administración
│   ├── components/              # Componentes reutilizables
│   ├── services/                # Capa de acceso a API (por dominio)
│   ├── lib/                     # Contextos globales, http client, utils
│   └── types/                   # TypeScript types compartidos
│
└── backend/
    ├── gateway/                 # API Gateway (puerto 8080)
    ├── auth-service/            # Autenticación y tokens (puerto 3001)
    ├── assets-service/          # Gestión de activos digitales (puerto 3002)
    ├── users-service/           # Perfiles de usuario (puerto 3003)
    ├── messaging-service/       # Solicitudes, mensajes y notificaciones (puerto 3004)
    ├── domains-service/         # Dominios de negocio (puerto 3005)
    └── admin-service/           # Moderación y métricas (puerto 3006)
```
