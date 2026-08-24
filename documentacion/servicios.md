# Descripción de Servicios

## 1. API Gateway (`gateway`) — Puerto 8080

**Responsabilidad:** Único punto de entrada de la API. Autentica requests y los redirige al microservicio correspondiente.

**Base de datos:** Ninguna (stateless).

**Tecnologías:** NestJS, `@nestjs/jwt`, `@nestjs/throttler`

**Funciones clave:**
- Middleware `AuthMiddleware`: verifica JWT y agrega headers `x-user-id`, `x-user-email`, `x-user-role`
- `ProxyService.forwardRequest()`: proxy HTTP genérico para JSON
- `ProxyService.forwardMultipart()`: pipe directo de streams para uploads de archivos
- Rate limiting: 100 requests/min por IP

---

## 2. Auth Service (`auth-service`) — Puerto 3001

**Responsabilidad:** Registro, login, validación de tokens y recuperación de contraseña.

**Base de datos:** `davinci_auth` (PostgreSQL)

**Modelos Prisma:**
- `User`: credentials, OAuth info, reset tokens
- `UserProfile`: displayName, bio, contactEmail (espejo básico del perfil)

**Endpoints:**

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register` | Registro con email/password. Crea User + UserProfile + sincroniza a users-service |
| POST | `/auth/login` | Login. Devuelve JWT + user data |
| GET | `/auth/validate` | Valida token (usado internamente por el gateway) |
| POST | `/auth/oauth/callback` | Login/registro vía OAuth (Google, LinkedIn) |
| POST | `/auth/forgot-password` | Genera reset token (dev: devuelve token en respuesta) |
| POST | `/auth/reset-password` | Aplica nueva contraseña, invalida token |

**JWT Payload:** `{ sub: userId, email, role, iat, exp }`

---

## 3. Assets Service (`assets-service`) — Puerto 3002

**Responsabilidad:** CRUD completo de activos digitales. Maneja el ciclo de vida (draft → published → archived).

**Base de datos:** `davinci_assets` (PostgreSQL)

**Modelos Prisma:**
- `Asset`: datos del activo, pricing, licencia, territorio, estado
- `AssetTag`: tags asociados al activo
- `AssetLink`: links externos y previews
- `AssetAttachment`: archivos adjuntos

**Campos del activo:**
- `title`, `slug`, `description`, `category` (software/design/business_model/content/other)
- `licenseType` (exclusive/non-exclusive/saas/open-source)
- `pricingType` (fixed/negotiable/free), `price`, `currency`
- `territory`, `duration`, `allowedUses[]`, `restrictions[]`
- `coverImageUrl`, `status` (draft/published/archived)
- `viewCount`, `requestCount`

**Endpoints clave:**

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/assets` | Listar/filtrar activos (sin status = todos; con status=published = solo publicados) |
| GET | `/assets/:id` | Ver activo por ID (incrementa viewCount) |
| POST | `/assets` | Crear activo (requiere auth) |
| PUT | `/assets/:id` | Editar activo |
| PATCH | `/assets/:id/publish` | Publicar activo |
| PATCH | `/assets/:id/archive` | Archivar activo |
| DELETE | `/assets/:id` | Soft-delete |
| POST | `/assets/upload-image` | Upload de imagen de portada (multipart, max 5MB) |
| POST | `/assets/:id/flag` | Reportar activo para moderación |

---

## 4. Users Service (`users-service`) — Puerto 3003

**Responsabilidad:** Perfiles públicos de usuario, configuración de notificaciones, activos guardados, contadores de reputación.

**Base de datos:** `davinci_users` (PostgreSQL)

**Modelos Prisma:**
- `UserProfile`: displayName, bio, avatarUrl, role, status, assetCount, licenseCount
- `NotificationSettings`: preferencias de email por tipo de evento
- `SavedAsset`: wishlist (userId + assetId, unique constraint)

**Endpoints clave:**

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/users` | Listar usuarios (admin). Filtros: search, role, status, page, limit |
| GET | `/users/:userId` | Ver perfil público |
| PUT | `/users/:userId/profile` | Actualizar perfil propio |
| PATCH | `/users/:userId/status` | Admin: suspender/activar usuario |
| PATCH | `/users/:userId/role` | Admin: cambiar rol |
| PATCH | `/users/:userId/asset-count` | Interno: incrementar contador de activos |
| GET | `/users/:userId/saved` | Obtener activos guardados |
| POST | `/users/:userId/saved/:assetId` | Guardar activo |
| DELETE | `/users/:userId/saved/:assetId` | Eliminar de guardados |

---

## 5. Messaging Service (`messaging-service`) — Puerto 3004

**Responsabilidad:** Solicitudes de licencia entre usuarios, mensajes dentro de cada solicitud y notificaciones del sistema.

**Base de datos:** `davinci_messaging` (PostgreSQL)

**Modelos Prisma:**
- `LicenseRequest`: solicitud de licencia (requesterId, ownerId, assetId, status, proposedPrice, message)
- `Message`: mensajes dentro de una solicitud (requestId, senderId, content)
- `Notification`: notificaciones de usuario (userId, type, title, body, link, read)

**Estados de solicitud:** `pending` → `accepted` / `rejected` / `closed`

**Notificaciones automáticas:**
- Al crear solicitud → notifica al dueño del activo (`new_request`)
- Al enviar mensaje → notifica a la otra parte (`new_message`)
- Al cambiar estado → notifica al requester (`request_accepted/rejected/closed`)

**Endpoints clave:**

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/requests` | Crear solicitud de licencia |
| GET | `/requests` | Listar solicitudes del usuario (como dueño o requester) |
| GET | `/requests/:id` | Ver solicitud y mensajes |
| PATCH | `/requests/:id/status` | Cambiar estado (accept/reject/close) |
| POST | `/requests/:id/messages` | Enviar mensaje en una solicitud |
| GET | `/requests/notifications` | Listar notificaciones del usuario |
| PATCH | `/requests/notifications/:id/read` | Marcar notificación como leída |
| PATCH | `/requests/notifications/read-all` | Marcar todas como leídas |

---

## 6. Domains Service (`domains-service`) — Puerto 3005

**Responsabilidad:** Gestión de dominios de negocio y categorías del marketplace.

**Base de datos:** `davinci_domains` (PostgreSQL)

**Endpoints clave:**

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/domains` | Listar dominios disponibles |
| POST | `/domains` | Crear dominio (admin) |
| PUT | `/domains/:id` | Editar dominio |
| DELETE | `/domains/:id` | Eliminar dominio |

---

## 7. Admin Service (`admin-service`) — Puerto 3006

**Responsabilidad:** Métricas históricas de la plataforma y logs de moderación de activos.

**Base de datos:** `davinci_admin` (PostgreSQL)

**Modelos Prisma:**
- `MetricSnapshot`: snapshot diario de contadores (totalUsers, totalAssets, publishedAssets, totalRequests, closedRequests, totalViews). Upsert por fecha.
- `ModerationLog`: historial de acciones de moderación (assetId, adminId, action, notes)

**Endpoints:**

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/admin/dashboard` | Último snapshot + logs de moderación recientes |
| GET | `/admin/metrics?range=7d\|30d\|90d\|365d` | Snapshots históricos + summary calculado |
| POST | `/admin/metrics/snapshot` | Guardar snapshot actual (se llama manualmente desde el panel) |
| POST | `/admin/moderation/log` | Registrar acción de moderación |
| GET | `/admin/moderation/logs` | Listar logs con filtros |

---

## Bases de datos

| Servicio | Base de datos | Usuario |
|---|---|---|
| auth-service | `davinci_auth` | postgres |
| assets-service | `davinci_assets` | postgres |
| users-service | `davinci_users` | postgres |
| messaging-service | `davinci_messaging` | postgres |
| domains-service | `davinci_domains` | postgres |
| admin-service | `davinci_admin` | postgres |

**Host:** `localhost:5432` (PostgreSQL 18, local)

**Nota:** La convención de naming en DB varía por servicio. `auth-service` y `assets-service` usan camelCase en columnas (creadas por Prisma sin `@map`). `users-service`, `messaging-service` y `admin-service` usan snake_case con `@map()` en el schema Prisma.
