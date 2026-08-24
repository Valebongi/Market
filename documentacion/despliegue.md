# Guía de Despliegue — Da Vinci Inventa

## Requisitos previos

- Docker Engine 24+ y Docker Compose v2
- Node.js 20 LTS (ver `.nvmrc` en raíz del repositorio)
- Acceso SSH o panel de control al servidor de producción

---

## 1. Preparación del entorno

### 1.1 Variables de entorno

Copiar el template y completar todos los valores:

```bash
cp .env.example .env
```

Editar `.env` con los valores reales de producción:

```bash
# Generar JWT_SECRET seguro (mínimo 64 chars)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Variables obligatorias en producción:**

| Variable | Descripción | Ejemplo |
|---|---|---|
| `POSTGRES_USER` | Usuario de PostgreSQL | `davinci_prod` |
| `POSTGRES_PASSWORD` | Contraseña fuerte de PostgreSQL | (generado) |
| `JWT_SECRET` | Secreto JWT (mín. 64 chars random) | (generado) |
| `FRONTEND_URL` | URL pública del frontend | `https://davinci-inventa.com` |
| `NEXT_PUBLIC_API_URL` | URL pública de la API (gateway) | `https://davinci-inventa.com/api/v1` |
| `ASSETS_PUBLIC_URL` | URL pública del assets-service | `https://assets.davinci-inventa.com` |

> **IMPORTANTE:** `NEXT_PUBLIC_API_URL` se bake en el frontend durante el build de Docker. Si cambia el dominio, hay que reconstruir la imagen del frontend.

### 1.2 OAuth (si se usa)

Configurar en el proveedor correspondiente y completar en `.env`:
- Google: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- GitHub: `NEXT_PUBLIC_GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET`

> **⚠️ ADVERTENCIA:** Si las credenciales de OAuth fueron expuestas en un repositorio público, revocarlas inmediatamente desde el panel del proveedor antes de generar nuevas.

---

## 2. Despliegue con Docker Compose

### 2.1 Primera vez (inicialización)

```bash
# 1. Clonar el repositorio
git clone <repo-url> && cd Marketplace

# 2. Crear y completar variables de entorno
cp .env.example .env
# Editar .env con valores de producción

# 3. Construir todas las imágenes
docker compose build

# 4. Levantar todos los servicios
docker compose up -d

# 5. Verificar que todos los servicios están healthy
docker compose ps
```

### 2.2 Health checks

Todos los servicios exponen `GET /health`. El gateway espera que todos estén `healthy` antes de arrancar:

```bash
# Verificar health de un servicio específico
curl http://localhost:3001/health
# → {"status":"ok","service":"auth-service","timestamp":"..."}

# Ver estado de todos los contenedores
docker compose ps
```

### 2.3 Logs

```bash
# Logs de todos los servicios
docker compose logs -f

# Logs de un servicio específico
docker compose logs -f gateway
docker compose logs -f assets-service
```

---

## 3. Actualización (rolling update)

```bash
# 1. Hacer pull de los cambios
git pull origin main

# 2. Reconstruir solo las imágenes afectadas
docker compose build gateway auth-service

# 3. Reiniciar esos servicios (zero-downtime si hay load balancer)
docker compose up -d --no-deps gateway auth-service

# 4. Verificar health
docker compose ps
```

---

## 4. Persistencia de datos

### Base de datos
Los datos de PostgreSQL persisten en el volumen Docker `postgres_data`. Para hacer backup:

```bash
docker exec davinci_postgres pg_dumpall -U postgres > backup_$(date +%Y%m%d).sql
```

Para restaurar:

```bash
docker exec -i davinci_postgres psql -U postgres < backup_20260312.sql
```

### Imágenes subidas (uploads)
Los archivos de imagen subidos persisten en el volumen Docker `assets_uploads`, montado en `/app/public/uploads` del contenedor `assets-service`.

```bash
# Backup de uploads
docker run --rm -v Marketplace_assets_uploads:/data -v $(pwd):/backup \
  alpine tar czf /backup/uploads_backup_$(date +%Y%m%d).tar.gz /data
```

> **RECOMENDACIÓN para producción:** Migrar los uploads a un servicio de almacenamiento externo (AWS S3, Cloudflare R2, etc.) para mayor durabilidad y velocidad de entrega.

---

## 5. Migraciones de base de datos

Las migraciones de Prisma se ejecutan **automáticamente** cuando los contenedores de servicios arrancan:

```dockerfile
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
```

Para ejecutar migraciones manualmente:

```bash
# Dentro del contenedor
docker exec davinci_auth npx prisma migrate deploy
docker exec davinci_assets npx prisma migrate deploy
# ... etc para cada servicio con DB
```

---

## 6. Rate limiting

El gateway tiene rate limiting configurable vía variables de entorno:

```env
RATE_LIMIT_TTL=60000   # Ventana de tiempo en ms (default: 1 minuto)
RATE_LIMIT_MAX=100     # Máximo de requests por ventana por IP (default: 100)
```

Para producción con tráfico alto, considerar ajustar estos valores según el perfil de uso.

---

## 7. Checklist de seguridad pre-producción

- [ ] `JWT_SECRET` generado con `crypto.randomBytes(64)` (≥ 64 chars random)
- [ ] `POSTGRES_PASSWORD` no es la contraseña por defecto (`postgres`)
- [ ] Credenciales OAuth no son las de desarrollo
- [ ] Credenciales OAuth previas revocadas si estuvieron expuestas
- [ ] `FRONTEND_URL` apunta al dominio real (no localhost)
- [ ] `NEXT_PUBLIC_API_URL` apunta al dominio real de la API
- [ ] Certificado SSL/TLS activo en el servidor (Let's Encrypt o similar)
- [ ] Puertos internos de microservicios (3001-3006) no expuestos públicamente (solo el gateway en 8080)
- [ ] Reverse proxy (nginx/Caddy) enfrente del gateway
- [ ] Backups automáticos configurados para `postgres_data` y `assets_uploads`
- [ ] Alertas de monitoreo configuradas (`/health` endpoints)

---

## 8. Arquitectura de red recomendada en producción

```
Internet
    │
    ▼
[nginx / Caddy]  ← SSL termination, HTTPS → HTTP proxy
    │
    ▼ :8080
[Gateway Container]  ← único servicio expuesto
    │
    ├─ :3001 ← auth-service     (red interna Docker)
    ├─ :3002 ← assets-service   (red interna Docker)
    ├─ :3003 ← users-service    (red interna Docker)
    ├─ :3004 ← messaging-service (red interna Docker)
    ├─ :3005 ← domains-service  (red interna Docker)
    └─ :3006 ← admin-service    (red interna Docker)

[Frontend Container] :3000  ← servido también detrás de nginx
```

En producción, los puertos 3001-3006 **no deben estar expuestos** al exterior. Solo el gateway (:8080) y el frontend (:3000) deberían ser accesibles, y ambos a través del reverse proxy.

---

## 9. Variables de entorno por servicio (referencia)

| Servicio | Archivo template |
|---|---|
| docker-compose (prod) | `.env.example` (raíz) |
| gateway | `backend/gateway/.env.example` |
| auth-service | `backend/auth-service/.env.example` |
| assets-service | `backend/assets-service/.env.example` |
| users-service | `backend/users-service/.env.example` |
| messaging-service | `backend/messaging-service/.env.example` |
| domains-service | `backend/domains-service/.env.example` |
| admin-service | `backend/admin-service/.env.example` |
| frontend | `frontend/.env.example` |
