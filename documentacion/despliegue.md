# Guía de Despliegue — Da Vinci Inventa

Hay dos caminos de despliegue documentados acá:

- **Railway** (sección 3) — es el entorno de producción actual. Empezá por ahí.
- **Docker Compose** (sección 2) — despliegue autoalojado en un servidor propio,
  y también la forma de levantar la pila completa en local.

Las secciones 5 a 10 (persistencia, migraciones, rate limiting, checklist de
seguridad) aplican a los dos.

## Requisitos previos

**Para Railway:** una cuenta con acceso al proyecto `vincisale` y permisos de push
sobre el repo `Valebongi/Market`. No hace falta Docker local: Railway construye.

**Para Docker Compose (autoalojado):**

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
| `NODE_ENV` | Entorno de ejecución | `production` |
| `POSTGRES_USER` | Usuario de PostgreSQL | `davinci_prod` |
| `POSTGRES_PASSWORD` | Contraseña fuerte de PostgreSQL | (generado) |
| `JWT_SECRET` | Secreto JWT (mín. 64 chars random) | (generado) |
| `FRONTEND_URL` | URL pública del frontend | `https://davinci-inventa.com` |
| `NEXT_PUBLIC_API_URL` | URL pública de la API (gateway) | `https://davinci-inventa.com/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio (canonical, robots, sitemap) | `https://davinci-inventa.com` |
| `ASSETS_PUBLIC_URL` | URL pública del assets-service | `https://assets.davinci-inventa.com` |

> **`NODE_ENV=production` no es opcional.** Sin esa variable, `auth-service`
> devuelve el token de reseteo de contraseña en el body de la respuesta de
> `POST /auth/forgot-password`: cualquiera que conozca un email registrado puede
> apoderarse de esa cuenta. Los `Dockerfile` traen `ENV NODE_ENV=production` como
> red de seguridad, pero la variable debe estar seteada explícitamente igual.

> **IMPORTANTE:** las variables `NEXT_PUBLIC_*` se **hornean** en el frontend
> durante el build de Docker: `docker-compose.yml` las pasa como `build.args` y
> `frontend/Dockerfile` las declara con `ARG`. Si cambia cualquiera de ellas
> —el dominio incluido— hay que **reconstruir** la imagen del frontend
> (`docker compose build frontend`); reiniciar el contenedor no alcanza.
> `GITHUB_CLIENT_SECRET` es el caso opuesto: es un secreto de runtime y nunca
> debe pasarse como build arg. Ver la sección 3.4 para el detalle.

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

## 3. Despliegue en Railway (entorno de producción actual)

Proyecto Railway: **`vincisale`** (workspace GrowthIMBAR).
Origen de cada servicio: el repo de GitHub **`Valebongi/Market`**. Railway rebuildea
en cada push a la rama configurada, construyendo con el `Dockerfile` de cada
subdirectorio (no con Nixpacks). **Excepción: el `frontend` se construye con el
contexto en la raíz del repo** — el motivo, en § 3.1.1.

### 3.1 Núcleo mínimo: 5 servicios + 1 Postgres

Esta etapa despliega **solo** el camino crítico. `users-service`, `messaging-service`,
`domains-service` y `admin-service` **no se despliegan todavía**.

| Servicio Railway | Root Directory | Dockerfile | `PORT` | Dominio público |
|---|---|---|---|---|
| `postgres` | — (plugin/template de Railway) | — | 5432 | no |
| `gateway` | `backend/gateway` | `Dockerfile` | `8080` | **sí** → es la API |
| `auth-service` | `backend/auth-service` | `Dockerfile` | `3001` | no (red interna) |
| `assets-service` | `backend/assets-service` | `Dockerfile` | `3002` | **sí** (ver 3.6) |
| `frontend` | **— (raíz del repo)** | `frontend/Dockerfile` | `3000` | **sí** → es el sitio |

> **Seteá `PORT` a mano en cada servicio.** Railway respeta el `PORT` explícito y lo
> usa como *target port* del dominio público. Si lo dejás que lo detecte, el puerto
> de la red interna queda ambiguo y las `*_SERVICE_URL` del gateway pueden apuntar a
> un puerto equivocado.

**Consecuencia de dejar 4 servicios afuera:** el gateway responde
`502 {"message":"Service X is unavailable"}` en `/api/v1/users/*`,
`/api/v1/requests/*`, `/api/v1/domains/*` y `/api/v1/admin/*` (`ProxyService` lanza
`BadGatewayException` cuando el `fetch` al downstream falla). En el frontend eso
apaga: perfiles de usuario, wishlist/guardados, solicitudes, mensajería,
notificaciones, dominios y el panel de admin. El registro **sí** funciona:
`auth-service` llama a `users-service` para crear el perfil dentro de un `try/catch`
no fatal, así que el usuario se crea igual, sin perfil asociado.

### 3.1.1 Por qué el frontend se construye con contexto = raíz del repo

**No toques esto para "simplificarlo".** La fila `frontend` de la tabla de arriba
es la única sin *Root Directory*, y es a propósito.

**El hallazgo:** Railway autodetecta Next.js leyendo el `package.json` que esté en
la **raíz del contexto de build**. Cuando lo detecta, descarta el `Dockerfile` y
aplica su propio plan de build, que muere **sin emitir una sola línea de
BuildKit** — no hay log útil, parece un error de infraestructura y no lo es.

Casos mínimos verificados, todos con un `Dockerfile` trivial
(`FROM node:20-alpine` + `WORKDIR` + `COPY` + `RUN echo`):

| Contexto de build | Resultado |
|---|---|
| `package.json` mínimo en la raíz del contexto | ✅ Deploy complete |
| Los 23 paquetes del frontend **sin** `next` | ✅ Deploy complete |
| **Solo** `next` en `dependencies`, en la raíz del contexto | ❌ Deploy failed |
| `package.json` con `next` en un **subdirectorio** (`frontend/package.json`), Dockerfile en la raíz | ✅ **Deploy complete** |

O sea: el disparador es exactamente la presencia de `next` en el `package.json`
de la raíz del contexto. La solución es correr ese `package.json` un nivel hacia
abajo, y eso se consigue moviendo el **contexto**, no el código.

**Workarounds que NO funcionan** (probados, no gastes tiempo de nuevo):

- `RAILWAY_DOCKERFILE_PATH=Dockerfile` como variable del servicio.
- Un `railway.json` con `"builder": "DOCKERFILE"`.

Ninguno de los dos evita la autodetección.

**La configuración resultante:**

- En Railway, el servicio `frontend` va **sin Root Directory** → el contexto es la
  raíz del repo clonado, y `frontend/package.json` queda en un subdirectorio.
- `frontend/Dockerfile` tiene todos los `COPY` prefijados con `frontend/`
  (`COPY frontend/package*.json ./`, `COPY frontend/ ./`). El `WORKDIR` interno
  sigue siendo `/app`: lo único que cambió es el lado izquierdo de los `COPY`.
  Los `COPY --from=builder` no cambian: sus rutas son internas a la imagen.
- El filtro del contexto es **`<repo>/.dockerignore`**, el de la raíz.
  `frontend/.dockerignore` ya **no se lee** (Docker toma el `.dockerignore` de la
  raíz del contexto); se conserva con una cabecera que lo aclara, pero editarlo
  no cambia nada.
- `docker-compose.yml` usa `context: .` + `dockerfile: frontend/Dockerfile` para
  que el build local sea idéntico al de Railway.

**Construir la imagen a mano** — siempre **desde la raíz del repo**:

```bash
# ✅ correcto (el punto final es el contexto: la raíz)
docker build -f frontend/Dockerfile   --build-arg NEXT_PUBLIC_API_URL=https://api.tu-dominio.com/api/v1   --build-arg NEXT_PUBLIC_SITE_URL=https://tu-dominio.com   -t davinci-frontend .

# ❌ rompe: el contexto es ./frontend y los COPY buscan frontend/frontend/...
docker build -t davinci-frontend ./frontend

# vía compose (ya trae el contexto correcto)
docker compose build frontend
```

**Sobre el `.dockerignore` de la raíz.** Con el contexto en la raíz, sin él se
empaquetan los `node_modules` de los siete servicios, `.next`, `.git`, `Market/`
(repo embebido), los PNG de `documentacion/` y — lo grave — los `.env` reales.
Está escrito con patrones `**/…` (independientes de la profundidad) a propósito:
los patrones anclados a un prefijo, tipo `frontend/.next/`, dejan de coincidir
apenas cambia la raíz del contexto. Ya nos mordió una vez y se colaron ~200MB.

**Los Dockerfile de backend NO cambian.** Cada servicio se sigue construyendo con
*Root Directory* en su propio subdirectorio y su propio `.dockerignore`. Ninguno
tiene `next` en su `package.json`, así que no disparan la autodetección y ya
despliegan bien. No hay motivo para tocarlos.

**Esto también alinea con el despliegue desde GitHub**, que es a donde vamos:
Railway clona el repo y, sin *Root Directory* configurado, el contexto ya es la
raíz. La misma solución sirve para los dos caminos y no hay que tocar el
dashboard.

### 3.2 Una sola instancia de Postgres, seis bases

No se crea una instancia por servicio. Se replica el modelo de
`scripts/init-databases.sql`: **una instancia** con **seis bases** dentro.

`scripts/init-databases.sql` solo corre en el contenedor de docker-compose
(`/docker-entrypoint-initdb.d/`); el Postgres de Railway **no lo ejecuta**. Hay que
crear las bases una vez a mano, desde el plugin de Postgres → *Data* → *Query*, o
por `psql` con la URL pública que Railway expone:

```sql
CREATE DATABASE davinci_auth;
CREATE DATABASE davinci_assets;
CREATE DATABASE davinci_users;
CREATE DATABASE davinci_messaging;
CREATE DATABASE davinci_domains;
CREATE DATABASE davinci_admin;
```

Crear las seis desde el principio aunque hoy solo se usen dos: cuando se sumen los
servicios restantes no hay que volver a tocar la base.

Cada servicio arma su `DATABASE_URL` apuntando a **su** base, con las variables de
referencia de Railway (`${{Postgres.VAR}}` se resuelve en tiempo de deploy):

```
postgresql://${{Postgres.PGUSER}}:${{Postgres.PGPASSWORD}}@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/davinci_auth
```

> Usar `RAILWAY_PRIVATE_DOMAIN` (red interna, sin costo de egreso) y **no**
> `DATABASE_PUBLIC_URL`. Y ojo: la `DATABASE_URL` que Railway genera apunta a la
> base `railway` por defecto — no sirve tal cual, hay que reescribir el nombre de la
> base al final.

Las migraciones de Prisma corren solas: el `CMD` de cada servicio con base es
`node node_modules/prisma/build/index.js migrate deploy && node dist/main`.
No es `npx` a propósito, y las imágenes instalan `openssl` — el porqué está en
**§6.1**, que es el fallo que tiró abajo el primer deploy.

### 3.3 Red interna (`*.railway.internal`)

Los servicios se hablan por el dominio privado del proyecto, que **no** sale a
internet y no consume egreso:

```
gateway  ──http──▶  auth-service.railway.internal:3001
         ──http──▶  assets-service.railway.internal:3002
todos    ──tcp───▶  postgres.railway.internal:5432
```

Dos detalles que rompen esto si se ignoran:

- **La red privada de Railway es IPv6.** Un proceso que escuche solo en `0.0.0.0` no
  es alcanzable por ese nombre. Los servicios NestJS hacen `app.listen(port)` sin
  host y Node liga `::` en dual-stack → funcionan sin cambios. El `frontend` corre
  con `HOSTNAME=0.0.0.0` (lo pone `frontend/Dockerfile`), que es lo que Railway
  documenta para Next.js standalone: solo recibe tráfico público y nunca es
  *destino* en la red privada, así que alcanza. Si alguna vez el frontend no
  recibiera tráfico, el fallback es `HOSTNAME=::`.
- **El dominio privado tarda unos segundos en resolver al arrancar.** Un servicio que
  consulta la base en el milisegundo cero puede fallar y reiniciarse una vez;
  Railway lo reintenta solo.

`auth-service` **no** lleva dominio público: su única puerta es el gateway.

### 3.4 Build-time vs runtime — la distinción que importa

Es la diferencia entre "cambio una variable y reinicio" y "cambio una variable y
tengo que reconstruir la imagen entera".

| | Build-time (`ARG`) | Runtime (env del contenedor) |
|---|---|---|
| Cuándo se aplica | durante `docker build` | al arrancar el contenedor |
| Cómo cambiarla | **rebuild + redeploy** | redeploy (o restart) |
| Queda dentro de la imagen | **sí**, en capas y en el bundle | no |
| Sirve para secretos | **NO, nunca** | sí |

**Solo el `frontend` tiene variables build-time.** Los cuatro servicios NestJS leen
todo con `ConfigService`/`process.env` en runtime.

Next.js reemplaza literalmente cada `process.env.NEXT_PUBLIC_*` por su valor durante
`npm run build`: en los chunks compilados no queda ninguna lectura de `process.env`,
queda el string. Si esas variables no llegan al stage `builder`, el bundle sale con
los fallbacks del código (`http://localhost:8080/api/v1`) y **ninguna variable de
runtime lo puede corregir**.

> **Railway inyecta las variables del servicio como build args solo si el Dockerfile
> las declara con `ARG`.** `frontend/Dockerfile` las declara. Si alguien agrega una
> `NEXT_PUBLIC_*` nueva al código, hay que agregar también su `ARG` + `ENV` ahí o va
> a salir vacía en producción, sin ningún error visible.

`frontend/Dockerfile` además **falla el build a propósito** si `NEXT_PUBLIC_API_URL`
llega vacía. Es deliberado: preferimos un build roto en Railway antes que una imagen
que parece sana y apunta a `localhost`.

**Orden de creación obligatorio** (hay dependencia circular de URLs):

1. Crear `postgres` y correr el `CREATE DATABASE` de 3.2.
2. Crear `gateway` y `auth-service`, y **generar el dominio público del gateway**.
3. Crear `assets-service` y generar su dominio público.
4. Crear el `frontend` **recién ahora**, con `NEXT_PUBLIC_API_URL` ya apuntando al
   dominio real del gateway.
5. Volver al `gateway` y setear `FRONTEND_URL` con el dominio del frontend (CORS).
   Eso solo requiere redeploy del gateway, no rebuild.

### 3.5 Variables por servicio

`NODE_ENV=production` va en **los cuatro** servicios de aplicación. No es cosmético:

> Sin `NODE_ENV=production`, `auth-service` devuelve el token de reseteo de
> contraseña **en el body de la respuesta** de `POST /api/v1/auth/forgot-password`
> (`auth.service.ts`, campo `devToken`). Cualquiera que conozca un email registrado
> puede pedir el token y cambiarle la contraseña a esa cuenta. Es el modo dev,
> pensado para no depender de un servidor de mail.
>
> Los `Dockerfile` ya traen `ENV NODE_ENV=production` como red de seguridad, pero
> **seteala igual en Railway**: si mañana alguien la pone en `development` para
> depurar y se olvida, la cuenta queda abierta.

---

#### `postgres`

Sin variables propias. Railway expone `PGUSER`, `PGPASSWORD`, `PGDATABASE`,
`RAILWAY_PRIVATE_DOMAIN`, `DATABASE_URL` y `DATABASE_PUBLIC_URL` para que los otros
servicios las referencien.

---

#### `gateway`

**Build-time:** ninguna.

**Runtime:**

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `JWT_SECRET` | el mismo string exacto que `auth-service` |
| `JWT_EXPIRES_IN` | `7d` |
| `FRONTEND_URL` | `https://<frontend>.up.railway.app` — **origen único del CORS**, sin barra final |
| `AUTH_SERVICE_URL` | `http://auth-service.railway.internal:3001` |
| `ASSETS_SERVICE_URL` | `http://assets-service.railway.internal:3002` |
| `TRUST_PROXY` | `1` — el edge de Railway es un reverse proxy; sin esto el rate limiting ve una sola IP para todo el mundo |
| `RATE_LIMIT_TTL` | `60000` |
| `RATE_LIMIT_MAX` | `100` |
| `RATE_LIMIT_AUTH_TTL` | `60000` |
| `RATE_LIMIT_AUTH_MAX` | `5` |
| `RATE_LIMIT_TRUSTED_IPS` | vacío (ver nota) |

`USERS_SERVICE_URL`, `MESSAGING_SERVICE_URL`, `DOMAINS_SERVICE_URL` y
`ADMIN_SERVICE_URL` se dejan **sin setear** en esta etapa: esas rutas devuelven `502`
(ver 3.1). Cuando esos servicios se desplieguen, se agregan con el mismo patrón
`http://<servicio>.railway.internal:<PORT>`.

> `RATE_LIMIT_TRUSTED_IPS` existe para eximir al server de Next.js, que hace fetch al
> gateway desde Server Components. En Railway el frontend sale por el dominio
> **público** del gateway, así que su IP de egreso no es estable ni fácil de fijar.
> Empezá vacío y subí `RATE_LIMIT_MAX` si ves `429` en las páginas públicas de
> activos, que son las que se renderizan en el server.

---

#### `auth-service`

**Build-time:** ninguna.

**Runtime:**

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` ← **crítico**, ver el recuadro de 3.5 |
| `PORT` | `3001` |
| `DATABASE_URL` | `postgresql://${{Postgres.PGUSER}}:${{Postgres.PGPASSWORD}}@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/davinci_auth` |
| `JWT_SECRET` | idéntico al del gateway |
| `JWT_EXPIRES_IN` | `7d` |
| `FRONTEND_URL` | `https://<frontend>.up.railway.app` |
| `USERS_SERVICE_URL` | omitir en esta etapa (la llamada falla y se ignora) |

`GOOGLE_CLIENT_SECRET` y `GITHUB_CLIENT_SECRET` de `auth-service/.env.example` no
hacen falta acá: el intercambio de OAuth lo hace el frontend.

---

#### `assets-service`

**Build-time:** ninguna.

**Runtime:**

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3002` |
| `DATABASE_URL` | `postgresql://${{Postgres.PGUSER}}:${{Postgres.PGPASSWORD}}@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/davinci_assets` |
| `FRONTEND_URL` | `https://<frontend>.up.railway.app` |
| `SERVICE_URL` | `https://<assets-service>.up.railway.app` — su **dominio público**, sin barra final |

`SERVICE_URL` es el prefijo con el que se guardan las URLs de las imágenes subidas
(`${base}/uploads/<archivo>`). Tiene que ser una URL que abra **el browser**, no la
interna: ver 3.6.

---

#### `frontend`

**Build-time** (declaradas con `ARG` en `frontend/Dockerfile`; cambiarlas exige
**rebuild**, no alcanza con redeploy):

| Variable | Valor | Si falta |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<gateway>.up.railway.app/api/v1` | **el build falla a propósito** |
| `NEXT_PUBLIC_SITE_URL` | `https://<frontend>.up.railway.app` | cae a `https://davinci-inventa.com` → canonical, `robots.txt` y `sitemap.xml` mal |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Client ID de Google | el botón de Google queda muerto |
| `NEXT_PUBLIC_GITHUB_CLIENT_ID` | Client ID de GitHub | el botón de GitHub queda muerto |
| `ASSETS_SERVICE_URL` | **no setear** | correcto: `next.config.ts` ya cubre `https://**` en `remotePatterns` |

`NEXT_PUBLIC_API_URL` **incluye el `/api/v1`** y no lleva barra final.

**Runtime:**

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` (ya viene en la imagen; explicitarla no molesta) |
| `PORT` | `3000` |
| `HOSTNAME` | `0.0.0.0` (ya viene en la imagen) |
| `GITHUB_CLIENT_SECRET` | el secreto de la OAuth App de GitHub |

> ⚠️ **`GITHUB_CLIENT_SECRET` es runtime y nunca build-time.** Lo lee
> `app/api/auth/github/callback/route.ts`, que corre en el server de Next.js.
> Pasarlo como build arg lo hornearía en una capa de la imagen, recuperable con
> `docker history`. En Railway es una variable de servicio común, y en el Dockerfile
> **no** existe un `ARG` para él: está así a propósito.

En el panel de la OAuth App de GitHub y en el de Google hay que agregar la
**callback URL** del dominio de Railway, o el login OAuth devuelve
`redirect_uri_mismatch`.

### 3.6 Imágenes subidas: por qué `assets-service` necesita dominio público

Las imágenes se sirven como archivos estáticos desde `assets-service`
(`useStaticAssets` en `main.ts`, prefijo `/uploads`). **El gateway no proxea
`/uploads/*`**: `ProxyController` solo mapea `/auth`, `/assets`, `/users`,
`/requests`, `/domains` y `/admin`. Entonces el `<img>` del browser tiene que llegar
directo a `assets-service` → necesita dominio público, y `SERVICE_URL` apuntando a
él.

**El filesystem del contenedor es efímero.** Cada deploy (o sea: cada push a GitHub)
arranca un contenedor nuevo y **se pierden todas las imágenes subidas**, mientras las
filas de la base siguen apuntando a URLs que ya dan 404. Dos salidas:

1. Montar un **Volume** de Railway en `/app/public/uploads` del `assets-service`.
   Resuelve la persistencia; sigue atando el servicio a una sola réplica.
2. Migrar los uploads a almacenamiento externo (S3, Cloudflare R2). Es la
   recomendación de fondo, y no está hecha.

`backend/assets-service/Dockerfile` crea `/app/public/uploads` dentro de la imagen:
multer usa `diskStorage` y **no** crea el directorio destino, así que sin eso el
primer upload responde `500`.

### 3.7 Rebuild vs redeploy — tabla rápida

| Cambio | Qué hace falta |
|---|---|
| Push de código a `Valebongi/Market` | Railway rebuildea solo el servicio afectado |
| Cambiar una variable de un servicio NestJS | redeploy (Railway lo dispara al guardar) |
| Cambiar una `NEXT_PUBLIC_*` o el dominio del gateway | **rebuild del `frontend`** — redeploy no alcanza |
| Cambiar `GITHUB_CLIENT_SECRET` | redeploy del `frontend`, sin rebuild |
| Sumar un microservicio | crear el servicio, su base, y agregar su `*_SERVICE_URL` al gateway |

Si el dominio del gateway cambia y solo se hace redeploy del frontend, el sitio sigue
llamando al dominio viejo: el valor está horneado en el JS del cliente. El síntoma es
un error de CORS o un `Failed to fetch` en el browser mientras el gateway responde
perfecto por `curl`.

### 3.8 Verificación post-deploy

```bash
# 1. El gateway está vivo (fuera del prefijo global y del rate limiting)
curl -s https://<gateway>.up.railway.app/health

# 2. El rate limiting corre de verdad
curl -si https://<gateway>.up.railway.app/api/v1/assets | grep -i x-ratelimit

# 3. auth-service NO filtra el token de reseteo  ← el check de NODE_ENV
curl -s -X POST https://<gateway>.up.railway.app/api/v1/auth/forgot-password \
  -H 'Content-Type: application/json' -d '{"email":"un-email-registrado@ejemplo.com"}'
# Correcto: {"message":"Si el email está registrado, ..."}
# MAL:      la respuesta trae "devToken" → falta NODE_ENV=production
```

Y en el browser, sobre el sitio ya desplegado:

```
4. DevTools → Network: los XHR salen al dominio del gateway.
   Si aparece localhost:8080, la imagen se horneó sin NEXT_PUBLIC_API_URL.
5. Ver el fuente de https://<frontend>.up.railway.app/sitemap.xml y el
   <link rel="canonical">: deben usar el dominio real, no davinci-inventa.com.
```

Si el paso 4 falla no sirve tocar variables en Railway: hay que **rebuildear** el
frontend con el `NEXT_PUBLIC_API_URL` correcto.

---

## 4. Actualización (rolling update)

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

## 5. Persistencia de datos

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

## 6. Migraciones de base de datos

Las migraciones de Prisma se ejecutan **automáticamente** cuando los contenedores de servicios arrancan:

```dockerfile
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node dist/main"]
```

Para ejecutar migraciones manualmente:

```bash
# Dentro del contenedor
docker exec davinci_auth   node node_modules/prisma/build/index.js migrate deploy
docker exec davinci_assets node node_modules/prisma/build/index.js migrate deploy
# ... etc para cada servicio con DB
```

### 6.1 Prisma sobre Alpine: `openssl` en LOS DOS stages

> Esto es lo que rompió el primer deploy en Railway. La imagen construía bien y
> el contenedor entraba en loop de reinicio con:
>
> ```
> prisma:warn Prisma failed to detect the libssl/openssl version to use, and may
> not work as expected. Defaulting to "openssl-1.1.x".
> Error: Could not parse schema engine response: SyntaxError: Unexpected token
> 'E', "Error load"... is not valid JSON
> ```
>
> **No era la `DATABASE_URL` ni la red privada** — la conexión resolvía bien. Era
> la imagen.

Los `Dockerfile` de los seis servicios con base parten de `node:20-alpine`, que
hoy resuelve a **Alpine 3.23 con OpenSSL 3.5.x** pero **no incluye `libssl`**.
Sin esa librería, `@prisma/get-platform` no puede detectar la versión de OpenSSL,
cae al default `openssl-1.1.x` y termina eligiendo un engine que no carga. El
binario escupe texto plano donde el CLI espera JSON → `SyntaxError`.

El detalle que hace perder un ciclo de deploy entero: **en el stage `builder` eso
es solo un warning** (`prisma generate` sigue de largo y el build termina OK). El
que muere es el **`runner`**, al ejecutar `migrate deploy` en el `CMD`. Por eso el
`apk add` va en **los dos stages**, no en uno:

```dockerfile
RUN apk add --no-cache openssl libc6-compat
```

Tres reglas que no hay que romper al tocar estos Dockerfile:

1. **El `apk add` va ANTES de `npm ci`.** El postinstall de `@prisma/engines`
   detecta la plataforma *en tiempo de instalación* para decidir qué binario
   descargar. Si `openssl` llega después, ya bajó el equivocado.
2. **Va en `builder` Y en `runner`.** Son dos imágenes base distintas; instalarlo
   en una no hace nada por la otra.
3. **El target correcto de Prisma es `linux-musl-openssl-3.0.x`** — es el que
   Prisma usa para cualquier OpenSSL 3.x sobre musl, no hay uno `3.5.x`. Con
   `openssl` instalado la detección lo resuelve sola y **no hace falta declarar
   `binaryTargets`** en `schema.prisma`. Si en algún futuro la detección volviera
   a fallar, el fix explícito es:
   ```prisma
   generator client {
     provider      = "prisma-client-js"
     binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
   }
   ```

### 6.2 El CLI de Prisma se copia del `builder`, no se resuelve con `npx`

En `messaging-service`, `domains-service` y `admin-service` el paquete `prisma`
está en **`devDependencies`**, así que `npm ci --omit=dev` del `runner` **no lo
instala**. Con el `CMD` viejo (`npx prisma migrate deploy`), `npx` no lo
encontraba local y salía **a la red en cada arranque** a bajarse `prisma@latest`
— o sea v6, contra un cliente y migraciones generadas con v5, y con un
`npm registry` caído el contenedor ni levanta.

La solución no toca ningún `package.json`: el `runner` copia del `builder` el CLI
y los engines ya resueltos para `linux-musl-openssl-3.0.x`.

```dockerfile
COPY --from=builder /app/node_modules/prisma   ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma  ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma  ./node_modules/.prisma
```

Y el `CMD` lo invoca por path, sin pasar por `npx`:

```dockerfile
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node dist/main"]
```

Resultado: el CLI, el *query engine* y el *schema engine* del contenedor son
byte por byte los mismos que se usaron para generar el cliente en el build.

### 6.3 Otras dependencias nativas sobre Alpine

| Paquete | Dónde | Estado |
|---|---|---|
| `bcrypt` 5.1.1 | `auth-service` | **OK.** Su `package_name` de node-pre-gyp incluye `{libc}`, y el release v5.1.1 publica `bcrypt_lib-...-napi-v3-linux-x64-musl.tar.gz`. Baja el prebuild musl y no compila nada. |
| `sharp` | `frontend` (optionalDependency de `next` 15.1.6) | **OK.** El lockfile trae `@img/sharp-linuxmusl-x64` + `@img/sharp-libvips-linuxmusl-x64`. |
| — | `gateway` | **Sin Prisma y sin nativos.** Es solo un proxy: su `Dockerfile` no lleva `apk add` y así debe quedar. |

Dos avisos sobre `bcrypt`:

- El prebuild se descarga **de GitHub durante el build**. Si GitHub no responde,
  node-pre-gyp cae a `--fallback-to-build`, que necesita `python3 make g++` —
  que las imágenes **no** traen. Si alguna vez ves `node-gyp` en el log de build,
  ese es el motivo, y el arreglo es agregar `build-base python3` al `apk add`
  **de los dos stages** (el `runner` también corre `npm ci`).
- `libc6-compat` (gcompat) ya está instalado como red de seguridad para cualquier
  binario nativo linkeado contra glibc.

> **Nota:** la etiqueta base `node:20-alpine` **no está pineada**. Si un futuro
> bump de Alpine cambia la familia de OpenSSL (a 4.x), `linux-musl-openssl-3.0.x`
> deja de servir. Pinear a `node:20-alpine3.23` es la mitigación.

---

## 7. Rate limiting

Lo aplica `GatewayThrottlerGuard` (`backend/gateway/src/common/gateway-throttler.guard.ts`),
registrado como `APP_GUARD` global en `app.module.ts`. Corre **antes** del `ProxyController`,
así que cubre todas las rutas proxeadas, incluidos los uploads multipart.

### 7.1 Los dos límites

```env
# Límite general
RATE_LIMIT_TTL=60000        # Ventana en ms (default: 1 minuto)
RATE_LIMIT_MAX=100          # Requests por ventana (default: 100)

# Límite estricto anti fuerza bruta
RATE_LIMIT_AUTH_TTL=60000
RATE_LIMIT_AUTH_MAX=5
```

El límite **`auth`** se aplica únicamente a `POST /api/v1/auth/login`, `/auth/register`,
`/auth/forgot-password` y `/auth/reset-password`. Tiene cupo propio, independiente del
general: agotar el límite navegando activos no bloquea el login, y viceversa.
El resto de `/auth/*` (`/auth/me`, `/auth/logout`, `/auth/oauth/callback`) solo cae bajo
el límite general.

**Granularidad del límite general:** la clave del cupo es *IP + handler del proxy*, y hay
un handler por servicio (`/auth/*`, `/assets/*`, `/users/*`, `/requests/*`, `/domains/*`,
`/admin/*`). O sea: `RATE_LIMIT_MAX` requests por minuto **por grupo de rutas**, no un
único cupo global por IP. Tenerlo en cuenta al dimensionar el valor.

### 7.2 Headers de respuesta

Cada respuesta lleva `X-RateLimit-Limit`, `X-RateLimit-Remaining` y `X-RateLimit-Reset`.
En las rutas de login/registro aparecen además las variantes con sufijo `-auth`, que
reflejan el cupo estricto. Al pasarse: `429` + `Retry-After` (o `Retry-After-auth` si lo
que se agotó fue el cupo de auth — el sufijo lo agrega `@nestjs/throttler` para los
throttlers con nombre).

```bash
# Verificar que el rate limiting está realmente activo
curl -si http://localhost:8080/api/v1/assets | grep -i x-ratelimit
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 99
```

Si esos headers **no** aparecen, el throttling no se está aplicando: revisar que el
`APP_GUARD` siga en los `providers` de `app.module.ts`.

### 7.3 `/health` nunca se throttlea

`GET /health` se registra directo sobre el adaptador Express en `main.ts`, fuera del
prefijo global y fuera del router de Nest, así que ningún guard global lo toca. Además
está en la lista `NEVER_THROTTLED` del guard por si en el futuro pasa a ser una ruta Nest.
Los health checks del load balancer no consumen cupo.

### 7.4 `TRUST_PROXY` — obligatorio detrás de nginx/Caddy

Sin esto, Express reporta la IP del reverse proxy en **todas** las requests y el throttler
mete a todos los usuarios en el mismo cupo: un solo atacante deja afuera al resto.

```env
TRUST_PROXY=1   # cantidad de proxies de confianza delante del gateway
```

| Valor | Efecto |
|---|---|
| ausente, `0`, `false` | desactivado (default) — se usa la IP del socket |
| `1`, `2`, … | toma el N-ésimo salto desde la derecha de `X-Forwarded-For` |
| `loopback`, `10.0.0.0/8,192.168.0.0/16` | lista/CIDR que interpreta Express |

**No lo actives si el gateway se expone directo a internet:** con `trust proxy` encendido
sin un proxy real delante, cualquiera puede mandar un `X-Forwarded-For` inventado y
esquivar el límite. El reverse proxy debe además *sobrescribir* el header, no
concatenar el que venga del cliente (`proxy_set_header X-Forwarded-For $remote_addr;`
en nginx).

### 7.5 `RATE_LIMIT_TRUSTED_IPS` — el frontend con SSR

`frontend/app/(public)/assets/[id]/page.tsx` es un Server Component que llama al gateway
**desde el server de Next.js**. Todas esas requests salen con una única IP (la del
contenedor `frontend`), así que se throttlean entre sí sin importar cuántos visitantes
distintos haya.

```env
RATE_LIMIT_TRUSTED_IPS=172.18.0.5   # IP del contenedor/host del frontend, separadas por coma
```

Las IPs listadas quedan exentas del rate limiting. Usar solo para orígenes internos de
confianza, nunca para rangos alcanzables desde internet.

### 7.6 Limitaciones conocidas

**Storage en memoria.** El contador vive en el proceso. Con más de una réplica del
gateway el límite efectivo se multiplica por la cantidad de instancias. Si se escala
horizontalmente hay que cambiar a un storage compartido (Redis) o aplicar el límite en
el reverse proxy.

**Rutas protegidas sin token no llegan al throttler.** En NestJS el middleware corre
antes que los guards, así que `AuthMiddleware` devuelve `401` en rutas protegidas antes
de que el throttler cuente la request (se nota en que esas respuestas no traen headers
`X-RateLimit-*`). No hay riesgo de fuerza bruta ahí — la verificación del JWT es local y
no toca ningún microservicio — pero un flood de tokens inválidos no consume cupo. Las
rutas públicas y las de auth, que son las que importan, sí pasan por el throttler.

---

## 8. Checklist de seguridad pre-producción

- [ ] **`NODE_ENV=production` seteada en los 4 servicios de aplicación**
      (si falta, `POST /auth/forgot-password` filtra el token de reseteo)
- [ ] Verificado en vivo: `POST /api/v1/auth/forgot-password` **no** devuelve `devToken`
- [ ] `JWT_SECRET` generado con `crypto.randomBytes(64)` (≥ 64 chars random)
- [ ] `JWT_SECRET` idéntico en gateway y auth-service
- [ ] `POSTGRES_PASSWORD` no es la contraseña por defecto (`postgres`)
- [ ] Credenciales OAuth no son las de desarrollo
- [ ] Credenciales OAuth previas revocadas si estuvieron expuestas
- [ ] `FRONTEND_URL` apunta al dominio real (no localhost)
- [ ] `NEXT_PUBLIC_API_URL` apunta al dominio real de la API
- [ ] `NEXT_PUBLIC_SITE_URL` apunta al dominio real del sitio
- [ ] Frontend **reconstruido** (no solo reiniciado) después del último cambio de dominio
- [ ] Verificado en el browser (DevTools → Network): los XHR **no** salen a `localhost:8080`
- [ ] `GITHUB_CLIENT_SECRET` seteado como variable de runtime del frontend, **nunca** como build arg
- [ ] Callback URLs de Google/GitHub actualizadas al dominio de producción
- [ ] Existe `.dockerignore` en la **raíz del repo** (contexto del build del frontend,
      ver § 3.1.1) y en cada `backend/<servicio>/` — sin él, el `COPY` mete
      `frontend/.env.local` con secretos reales en la imagen
- [ ] El `.dockerignore` de la raíz excluye `**/.env` y `**/.env.*` y solo reincluye
      los `*.example`
- [ ] Certificado SSL/TLS activo en el servidor (Let's Encrypt o similar)
- [ ] Puertos internos de microservicios (3001-3006) no expuestos públicamente (solo el gateway en 8080)
- [ ] Reverse proxy (nginx/Caddy) enfrente del gateway
- [ ] `TRUST_PROXY=1` si hay reverse proxy delante (si no, el rate limiting ve una sola IP)
- [ ] `TRUST_PROXY` en `0` si el gateway se expone directo (si no, `X-Forwarded-For` es falseable)
- [ ] Rate limiting verificado en vivo: `curl -si <API>/api/v1/assets | grep -i x-ratelimit` devuelve headers
- [ ] `RATE_LIMIT_AUTH_MAX` ajustado para login/registro (default: 5/min)
- [ ] `RATE_LIMIT_TRUSTED_IPS` con la IP del frontend si usa fetch server-side
- [ ] Backups automáticos configurados para `postgres_data` y `assets_uploads`
- [ ] Alertas de monitoreo configuradas (`/health` endpoints)

---

## 9. Arquitectura de red recomendada en producción

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

## 10. Variables de entorno por servicio (referencia)

Para Railway, la lista definitiva de variables build-time y runtime está en la
**sección 3.5**, servicio por servicio. Los `.env.example` de abajo son la referencia
para desarrollo local y para el despliegue con Docker Compose.

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
