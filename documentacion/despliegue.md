# Guía de Despliegue — Da Vinci Inventa

Hay dos caminos de despliegue documentados acá:

- **Railway** (sección 3) — es el entorno de producción actual. Empezá por ahí.
  La sección 11 cubre los 4 microservicios que faltan desplegar, y las fallas
  del gateway que salían a la luz al levantarlos (arregladas, a verificar en vivo).
- **Docker Compose** (sección 2) — despliegue autoalojado en un servidor propio,
  y también la forma de levantar la pila completa en local.

Las secciones 5 a 10 (persistencia, migraciones, rate limiting, checklist de
seguridad) aplican a los dos. Las 12 y 13 son el estado de la operación
(monitoreo, backups, límites) y de los costos.

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

> **`NODE_ENV=production`: seteala igual, pero ya no es lo que tapa el agujero
> del token de reseteo.** Esa condición era fail-OPEN y se cambió. Hoy
> `POST /auth/forgot-password` devuelve `devToken` en el body **solo** si
> `EXPOSE_RESET_TOKEN=true` **o** `NODE_ENV=development`
> (`auth-service/src/modules/auth/auth.service.ts:312-318`). O sea: con
> `NODE_ENV` sin setear el token **no** se expone — falla cerrado.
>
> Lo que hay que garantizar en producción es **no** setear `EXPOSE_RESET_TOKEN`
> y **no** poner `NODE_ENV=development`. `NODE_ENV=production` sigue siendo la
> forma explícita de dejarlo claro (y los `Dockerfile` la traen como default).

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

Los seis microservicios y el gateway exponen `GET /health` (fuera del prefijo
global). El gateway espera que **los seis microservicios** estén `healthy` antes
de arrancar (`depends_on: … condition: service_healthy`).

> **Ojo con `docker compose ps`:** solo esos seis tienen bloque `healthcheck:` en
> `docker-compose.yml`. El **gateway** y el **frontend** no lo tienen, así que
> nunca van a figurar como `healthy` — van a decir `running` y está bien. El
> frontend además no expone `/health` en absoluto. Para el gateway, verificá a
> mano con `curl http://localhost:8080/health`.

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
| Los paquetes del frontend **sin** `next` | ✅ Deploy complete |
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

> **Conflicto conocido con `messaging-service/.env.example`.** Ese archivo —y solo
> ese— documenta la topología opuesta para Railway: *una sola base compartida y un
> schema de Postgres por servicio* (`...@host:port/railway?schema=messaging`), con
> la nota de que `prisma migrate deploy` crea el schema si no existe. Las dos
> topologías funcionan, pero hay que elegir UNA: **esta guía manda, y es una base
> por servicio.** Si se prefiere el modelo de schemas, hay que cambiar los seis
> `.env.example` a la vez, no uno.



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

`NODE_ENV=production` va en **los cuatro** servicios de aplicación.

> **El `devToken` de `forgot-password` hoy falla cerrado.** La condición ya no es
> `NODE_ENV !== 'production'` (que era fail-OPEN: en cualquier entorno donde
> nadie definiera `NODE_ENV` —Railway incluido— el endpoint entregaba un token
> de reseteo válido a cualquiera que supiera un email registrado).
>
> Hoy, en `auth-service/src/modules/auth/auth.service.ts:312-318`:
>
> ```ts
> const exposeResetToken =
>   this.config.get('EXPOSE_RESET_TOKEN') === 'true' ||
>   this.config.get('NODE_ENV') === 'development';
> ```
>
> Hay que **optar** por exponerlo. La regla operativa en Railway es entonces:
> **nunca setear `EXPOSE_RESET_TOKEN`** y nunca poner `NODE_ENV=development`.
> `NODE_ENV=production` se setea igual, por claridad y porque otras cosas la leen.

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
| `GOOGLE_CLIENT_ID` | mismo valor que `NEXT_PUBLIC_GOOGLE_CLIENT_ID` del frontend |

> **`GOOGLE_CLIENT_ID` es obligatoria si se usa el login con Google.** Es la
> audiencia (`aud`) contra la que `auth-service` valida el ID token en
> `POST /auth/oauth/callback`. Sin ella el endpoint responde **503** y el login
> con Google no funciona. No es un secreto: es el mismo client ID público que ya
> viaja al browser.

`GITHUB_CLIENT_SECRET` de `auth-service/.env.example` no hace falta acá: el
intercambio del `code` de GitHub lo hace el route handler de Next, no auth-service.
Y **no existe** ninguna `GOOGLE_CLIENT_SECRET` en el repo, a propósito:
`auth-service` verifica el ID token de Google contra las claves públicas del
proveedor, o sea criptografía de clave pública, sin secreto de por medio.

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
| `NEXT_PUBLIC_SITE_URL` | `https://<frontend>.up.railway.app` | cae a `https://vinciinventa.com` (el fallback real en `lib/site.ts`, `app/robots.ts` y `app/sitemap.ts`) → canonical, `robots.txt` y `sitemap.xml` mal |
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
# MAL:      la respuesta trae "devToken" → alguien seteo EXPOSE_RESET_TOKEN=true
#           o NODE_ENV=development. Con NODE_ENV sin setear NO sale (falla cerrado).
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
| `sharp` | `frontend` (optionalDependency de `next` 15.5.24) | **OK.** El lockfile trae `@img/sharp-linuxmusl-x64` + `@img/sharp-libvips-linuxmusl-x64`. |
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

El límite **`auth`** se aplica únicamente a `/api/v1/auth/login`, `/auth/register`,
`/auth/forgot-password`, `/auth/reset-password` y `/auth/oauth/callback` (la lista vive en
`AUTH_SENSITIVE_PATHS`, en `gateway/src/common/throttler.config.ts`). Tiene cupo propio,
independiente del general: agotar el límite navegando activos no bloquea el login, y viceversa.
El resto de `/auth/*` (`/auth/me`, `/auth/logout`) solo cae bajo el límite general.
La comparación es contra el path en minúsculas, así que cambiarle el case a la URL no
esquiva el límite estricto. Se matchea **solo por path, sin mirar el método**: un `GET`
a `/auth/login` también debita del cupo estricto.

**Granularidad del límite general:** la clave del cupo que arma `@nestjs/throttler` es
*IP + clase + handler*, o sea **por método del controller**, no por servicio. Y
`ProxyController` tiene **11** handlers: un `<servicio>/*` para los seis, más un
handler de raíz para cinco de ellos (`assets`, `users`, `requests`, `domains`, `admin`).

Consecuencia práctica: `GET /api/v1/assets` (handler `proxyAssetsRoot`) y
`GET /api/v1/assets/123` (handler `proxyAssets`) consumen cupos **distintos**, cada uno
de `RATE_LIMIT_MAX`. El techo real por IP es entonces ~11 × `RATE_LIMIT_MAX` por
ventana, no 6 ×, y ninguna ruta sola puede consumir más de `RATE_LIMIT_MAX`.
Tenerlo en cuenta al dimensionar el valor: es más permisivo de lo que parece.

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
- [ ] Backup de Postgres **restaurado al menos una vez** sobre una base descartable
- [ ] Alertas de monitoreo configuradas (`/health` endpoints)
- [ ] *Healthcheck Path* = `/health` declarado en **cada** servicio de Railway (§ 12.1)
- [ ] Volume de Railway montado en `/app/public/uploads` de `assets-service`,
      o uploads ya migrados a object storage (§ 3.6) — si no, cada deploy borra
      las imágenes y las fichas quedan con `<img>` rotos
- [ ] **El check de rol admin del gateway verificado en vivo** (§ 11.2): con un JWT
      de rol `entrepreneur`, `GET /api/v1/admin/dashboard` debe devolver **403**.
      Probar también `GET /api/v1/ADMIN/dashboard` (en mayúsculas): también 403.
      `admin-service` además valida el rol por su cuenta (`AdminGuard`), así que
      un fallo acá degrada la primera capa, no deja el panel abierto
- [ ] `GET /api/v1/users` con JWT de admin **no** devuelve 404 (§ 11.2)
- [ ] **Los `x-user-*` del cliente se descartan en el borde** (§ 9.1). Verificado en vivo:
      `curl -s <API>/api/v1/assets -H 'x-user-role: admin' -H 'x-user-id: falso'` sobre
      una ruta pública no debe llegar al microservicio con esos headers
- [ ] Límites de CPU/memoria seteados por servicio en Railway (§ 12.2)

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

> **`docker-compose.yml` ya lo hace cumplir.** Postgres y los seis microservicios
> se publican como `127.0.0.1:<puerto>:<puerto>`, o sea solo en loopback: siguen
> accesibles desde la máquina que levanta el stack (psql, `prisma migrate`, un
> `curl` de depuración) pero no desde la red. Antes eran `'3004:3004'`, que Docker
> interpreta como `0.0.0.0` — todas las interfaces.
>
> Importa porque **los microservicios no validan el JWT**: confían en los headers
> `x-user-*` que inyecta el gateway. Uno alcanzable sin pasar por el gateway no
> tiene autenticación alguna, y un `curl -H 'x-user-role: admin' http://host:3004/requests`
> se lleva las negociaciones de toda la plataforma. Además, las reglas de iptables
> que escribe Docker **esquivan a ufw/firewalld**, así que un firewall del host no
> tapa un `ports:` mal puesto.
>
> Si necesitás llegar a un servicio desde otra máquina, usá un túnel SSH
> (`ssh -L 3004:127.0.0.1:3004 host`), no ensanches el bind.

### 9.1 Los headers `x-user-*` son propiedad del gateway

Los microservicios **confían** en `x-user-id` / `x-user-email` / `x-user-role` y no
revalidan el JWT. Eso solo es seguro si esos headers no pueden originarse en el cliente.

`identityHeaderScrubber` (`backend/gateway/src/common/identity-headers.ts`) los borra de
**toda** request entrante, con `app.use()` en `main.ts`, antes de helmet y antes de
`AuthMiddleware`. Va sobre el Express desnudo y no como middleware de Nest a propósito:
los middlewares de Nest se montan bajo el prefijo global y respetan el `.exclude()` de
`app.module.ts`, así que las rutas públicas (`GET /assets`, `POST /auth/login`, …) los
esquivarían. Después del borrado, un `x-user-*` que vea un microservicio solo puede
haberlo puesto el gateway.

Esto **no** reemplaza el aislamiento de red del diagrama de arriba: si alguien alcanza
`:3002` directo, se saltea el borde entero. Las dos medidas se necesitan juntas.

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

---

## 11. Desplegar los 4 servicios restantes (users, messaging, domains, admin)

Esta sección completa la § 3.1, que cubre solo el núcleo de 5 servicios.

### 11.1 Configuración por servicio

Los cuatro son idénticos en forma: *Root Directory* en su subdirectorio,
`Dockerfile` propio y **sin dominio público** (solo red interna). Las cuatro
variables base son las mismas, pero **tres de los cuatro leen variables propias
además de esas** — ver el bloque de opcionales más abajo.

| Servicio Railway | Root Directory | `PORT` | Base | Dominio público |
|---|---|---|---|---|
| `users-service` | `backend/users-service` | `3003` | `davinci_users` | no |
| `messaging-service` | `backend/messaging-service` | `3004` | `davinci_messaging` | no |
| `domains-service` | `backend/domains-service` | `3005` | `davinci_domains` | no |
| `admin-service` | `backend/admin-service` | `3006` | `davinci_admin` | no |

Variables de cada uno:

```
PORT=<3003..3006>
NODE_ENV=production
DATABASE_URL=postgresql://${{Postgres.PGUSER}}:${{Postgres.PGPASSWORD}}@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/<base>
FRONTEND_URL=https://<frontend>.up.railway.app
```

> Los `.env.example` de estos cuatro servicios **no declaran `NODE_ENV`**.
> Seteala igual: Prisma y Nest cambian de comportamiento según el valor.

**Variables propias de cada servicio.** Todas tienen default razonable en el
código, así que el deploy no se rompe si faltan — pero no verlas acá hizo creer
que no existían. Cada una está documentada en el `.env.example` de su servicio.

`users-service`:

```
# Secreto compartido con auth-service para la ÚNICA llamada servicio-a-servicio
# (POST /users/profiles). Mismo valor en los dos servicios.
# Vacío en ambos = modo backstop: el registro funciona, pero NO se replica el rol
# al perfil que lee el panel de admin (auth-service loguea `skipped_no_token`).
INTERNAL_SERVICE_TOKEN=
```

`messaging-service` — cupos de escritura por usuario (`rate-limit.guard.ts`), que
son **independientes** del rate limiting del gateway de la § 7:

```
MSG_RATE_REQUESTS_PER_HOUR=10
MSG_RATE_REQUESTS_PER_DAY=40
MSG_RATE_REQUESTS_PER_OWNER_PER_DAY=5
MSG_RATE_MESSAGES_PER_MINUTE=20
MSG_RATE_MESSAGES_PER_HOUR=300
```

`domains-service`:

```
DOMAINS_PRICING_ENABLED=true      # false apaga los precios (pricing: null)
DOMAINS_LINK_TARGET=search        # search|cart — `cart` está roto en Namecheap
DOMAINS_COMPARE_REGISTRARS=true   # muestra Porkbun con precio al lado de Namecheap
DOMAINS_USER_LOOKUP_QUOTA=300     # consultas RDAP salientes por usuario por hora
NAMECHEAP_AFFILIATE_URL_TEMPLATE= # sin esto el link sale limpio y NO se cobra comisión
```

> `NAMECHEAP_AFFILIATE_URL_TEMPLATE` es la única de toda esta lista que mueve
> plata: sin ella el deep link funciona igual pero la comisión no se atribuye.
> Todo lo demás (deep link específico, precios, sugerencias) ya está construido.

`admin-service` no lee ninguna variable más allá de las cuatro base.

Y en `auth-service` (§ 3.5), dos que esa sección tampoco lista y que importan en
un despliegue nuevo:

```
INTERNAL_SERVICE_TOKEN=   # el mismo valor que en users-service
BOOTSTRAP_ADMIN_EMAIL=    # única forma de crear el PRIMER admin — ver abajo
```

> **Sin `BOOTSTRAP_ADMIN_EMAIL` el sistema queda sin ningún admin.** `RegisterDto`
> no acepta `role=admin` (y no debe), y `PATCH /users/:userId/role` ya exige ser
> admin: no hay otra puerta. Es de un solo uso — la ejecución se registra en la
> tabla `admin_bootstraps` y después queda inerte aunque la variable siga seteada.
> Camino recomendado: registrate normal por la app y seteá **solo** el email, así
> ninguna contraseña pasa por las variables de entorno del proveedor.
> Para que el rol se replique además al perfil que lista el panel hace falta
> `INTERNAL_SERVICE_TOKEN` en **los dos** servicios.

Y en el **gateway**, agregar las cuatro URLs internas que hoy caen al default
`localhost` (§ 3.5):

```
USERS_SERVICE_URL=http://users-service.railway.internal:3003
MESSAGING_SERVICE_URL=http://messaging-service.railway.internal:3004
DOMAINS_SERVICE_URL=http://domains-service.railway.internal:3005
ADMIN_SERVICE_URL=http://admin-service.railway.internal:3006
```

**Las bases hay que crearlas a mano**, igual que las dos primeras: el Postgres de
Railway no ejecuta `scripts/init-databases.sql` (§ 3.2). Y correr las migraciones
de Prisma de cada servicio (§ 6).

### 11.2 Dos cosas que fallaban al levantarlos — YA ARREGLADAS Y EN EL CODIGO

Las dos eran del **gateway** y ninguna se arreglaba con configuracion de Railway.

> **Estado: corregido y verificado en el codigo actual.** Esta seccion se
> conserva porque el *porque* es lo que evita que vuelva a pasar. Lo que sigue
> describe el bug **en pasado** y como confirmar en vivo que sigue arreglado.
> Si estas leyendo esto para diagnosticar un 404 o un 502 hoy, la causa es otra.

**1. `GET /api/v1/users` devolvia 404 — el listado de admin no existia para el gateway.**

`ProxyController` registraba `@All('users/*')` pero no `@All('users')`. En Express 4
esa ruta compila a `^/api/v1/users/(.*)$`, que **no** matchea el path desnudo, asi que
el 404 lo producia el gateway antes de proxear — aunque `users-service` si implementa
el endpoint (`@Get()` en `users.controller.ts`). Rompia el listado de usuarios del
panel de admin y el contador "usuarios totales".

**Arreglado:** hoy `ProxyController` declara handler de raiz para **los cinco**
servicios que lo necesitan — `assets` (linea 43), `users` (53), `requests` (63),
`domains` (73) y `admin` (83) — ademas del `<servicio>/*` de cada uno. Se declararon
todos a proposito, incluso donde el downstream todavia no expone `@Get()`: asi el
404 lo devuelve el servicio y no el gateway, que es mucho mas facil de diagnosticar.
El unico sin handler de raiz es `auth`, que no tiene endpoint en la raiz.

**2. El check de rol admin del gateway no corria.**

`AuthMiddleware` decidia si una ruta era admin-only leyendo **`req.path`**. Nest monta
ese middleware con `forRoutes('*')` sobre el prefijo global, o sea
`app.use('/api/v1/*', ...)`. Express consume todo el path matcheado como `baseUrl` y deja
`req.url` — y por lo tanto `req.path` — en `/`.

Medido inyectando un log en el middleware del gateway compilado:

| Request | `req.path` | `req.baseUrl` | `req.originalUrl` |
|---|---|---|---|
| `GET /api/v1/admin/dashboard` | `/` | `/api/v1/admin/dashboard` | `/api/v1/admin/dashboard` |
| `GET /api/v1/users/u1/saved` | `/` | `/api/v1/users/u1/saved` | `/api/v1/users/u1/saved` |

Con `req.path === '/'`, **ninguna** comparacion contra `/api/v1/...` podia dar
verdadero: con un JWT de rol `entrepreneur`, `GET /api/v1/admin/dashboard` se proxeaba
al downstream en vez de dar 403.

**Arreglado:** `auth.middleware.ts:67` usa `requestPath(req)`, que lee `originalUrl`.
El helper vive en **`gateway/src/common/request-path.ts`** (no en `throttler.config.ts`,
que solo lo importa) y hace tres cosas, las tres necesarias:

```ts
// gateway/src/common/request-path.ts
export function requestPath(req): string {
  const raw = req.originalUrl ?? req.url ?? req.path ?? '';
  const q = raw.indexOf('?');
  const withoutQuery = q === -1 ? raw : raw.slice(0, q);
  return withoutQuery.replace(/\/+$/, '').toLowerCase() || '/';
}
```

Saca el query string, saca la barra final (`/api/v1/users/` matchea igual que
`/api/v1/users`) y **pasa a minusculas**. Lo ultimo no es cosmetico: el routing de
Express es case-insensitive, asi que sin normalizar el case bastaba pedir
`/api/v1/ADMIN/dashboard` para esquivar el check de rol, y `/api/v1/auth/LOGIN` para
caer al limite general de 100/min en vez del estricto de 5/min.

Es la **unica** fuente de path del gateway: middleware, guard del throttler y config
comparan todos contra `/api/v1/...`.

> El `.exclude()` de `app.module.ts` sigue siendo la excepcion legitima: Nest lo
> matchea **sin** el prefijo global, y funciona. No lo "unifiques" agregandole
> `api/v1`: se rompen todas las rutas publicas.

**Defensa en profundidad: `admin-service` tambien valida el rol.** El gateway no es
la unica defensa. `AdminController` lleva `@UseGuards(AdminGuard)` a nivel de
controller, y `AdminGuard` exige `x-user-role === 'admin'` mas un `x-user-id` presente
y con forma sana (`admin-service/src/common/admin.guard.ts:66`). O sea que `/admin/*`
queda cerrado aunque el request no haya pasado por el gateway. Los `x-user-*` que
manda un cliente ya los borra `identityHeaderScrubber` en el borde (§ 9.1), asi que
las dos capas se sostienen entre si.

**Como confirmarlo en el deploy.** Con un JWT de rol `entrepreneur` y otro de `admin`
contra el gateway ya desplegado. Salida verificada sobre el gateway compilado con
los cuatro downstream apagados (por eso los que pasan el check dan 502: el 502
significa "el gateway te dejo pasar", que es justo lo que se quiere comprobar):

| Request | Rol | Esperado |
|---|---|---|
| `GET /api/v1/admin/dashboard` | `entrepreneur` | **403** `Admin access required` |
| `GET /api/v1/admin/dashboard` | `admin` | pasa (502 sin downstream, 200 con el) |
| `GET /api/v1/ADMIN/dashboard` | `entrepreneur` | **403** (case normalizado) |
| `GET /api/v1/users` | `entrepreneur` | **403** |
| `GET /api/v1/users` | `admin` | pasa — y **no** 404 |
| `GET /api/v1/users/?page=1` | `entrepreneur` | **403** (barra final y query normalizadas) |
| `GET /api/v1/users/<id>/saved` | `entrepreneur` | pasa — **no** 403 |
| `PUT /api/v1/users/<id>/profile` | `entrepreneur` | pasa — **no** 403 |
| `GET /api/v1/assets` | sin token | pasa (ruta publica) |
| `POST /api/v1/auth/login` | sin token | pasa (ruta publica) |

Las ultimas cuatro filas son la parte que se rompe facil: si al tocar el check
de rol alguien vuelve a un match por prefijo sobre `/api/v1/users`, el dueno de la
cuenta empieza a recibir 403 sobre su propio perfil, sus guardados y sus
notificaciones. Por eso `ADMIN_EXACT_ROUTES` y `ADMIN_ROUTE_PREFIXES` estan
separados, y por eso las dos mitades se prueban juntas.

### 11.3 Timeout del proxy

`ProxyService` acepta `PROXY_TIMEOUT_MS` (default 30000). Sin timeout, un downstream
que acepta la conexión y nunca responde dejaba la request colgada para siempre: el
gateway se quedaba sin capacidad mientras `GET /health` seguía contestando `ok` —
o sea, caído para los usuarios y verde para Railway.

Distingue el caso del downstream caído:

| Situación | Respuesta |
|---|---|
| Downstream no escucha | `502` `Service X is unavailable` |
| Downstream acepta y no responde | `504` `Service X did not respond within <n>ms` |

Verificado contra un downstream que acepta y nunca contesta, con
`PROXY_TIMEOUT_MS=2000`:

```
HTTP 504 en 2.05s
{"message":"Service admin did not respond within 2000ms","statusCode":504}
```

No hace falta setear `PROXY_TIMEOUT_MS` en Railway: el default de 30s está bien.
Bajarlo tiene sentido si algún endpoint lento (upload de imágenes) empieza a dar 504
antes de terminar — en ese caso el problema es el endpoint, no el timeout.

---

## 12. Lo que falta para operar de verdad

Nada de esto está configurado hoy. Ordenado por lo que duele primero.

### 12.1 Antes de tener usuarios reales

**Uploads sobre disco efímero (§ 3.6).** Es la pérdida de datos más probable y la
más silenciosa: cada push a GitHub rebuildea `assets-service` y **borra todas las
imágenes**, mientras las filas de la base siguen apuntando a URLs que ya dan 404. No
hay error, no hay alerta: las fichas de activo se quedan sin imagen. Volume de Railway
en `/app/public/uploads` como parche inmediato; S3/R2 como solución real.

**Backups de Postgres.** Seis bases en una instancia, sin snapshots configurados y sin
un `pg_dump` verificado. Un backup que nunca se restauró no es un backup: probar la
restauración sobre una base descartable antes de necesitarla.

**Healthchecks en Railway.** Los siete servicios exponen `GET /health` fuera del prefijo
global y ninguno lo tiene declarado en Railway. Sin eso, Railway da por buena una
instancia apenas el proceso arranca — antes de que Prisma conecte — y rutea tráfico a
un contenedor que devuelve 500. Setear *Healthcheck Path* = `/health` en cada servicio
es un cambio de dashboard, sin código.

**Alertas.** No hay ninguna. El mínimo viable: notificación de deploy fallido y de
servicio caído (Railway las tiene nativas), más un chequeo externo contra
`https://<gateway>/health`.

### 12.2 Apenas haya tráfico

**Rate limiting compartido (§ 7.6).** El storage del throttler vive en el proceso.
Con una sola réplica el límite es exacto; con N réplicas el efectivo es N × límite.
Hoy no es un problema porque no hay réplicas — es una precondición para escalar,
no una deuda activa. Lo que hace falta concretamente:

- El paquete de storage Redis de `@nestjs/throttler` (`ThrottlerStorageRedisService`)
  y un Redis.
- Registrar `storage:` en `ThrottlerModule.forRootAsync` — `buildThrottlerOptions()`
  ya devuelve el objeto de opciones, así que es un campo más, sin tocar los dos
  throttlers con nombre ni `GatewayThrottlerGuard`.
- Un Redis en Railway es un servicio más con su costo. Alternativa sin Redis:
  **no escalar el gateway** y aceptar el límite por proceso, o mover el rate limiting
  al edge (Cloudflare).

**Límites de recursos.** Ni `docker-compose.yml` ni Railway declaran CPU/memoria por
servicio. Un leak en cualquiera de los siete puede comerse la instancia entera y
arrastrar a los demás. En Railway se setea por servicio; en compose sería
`deploy.resources.limits`.

*(El timeout del proxy figuraba acá como pendiente. Ya está implementado en los dos
caminos — ver § 11.3, que es la referencia buena.)*

### 12.3 Cuando el equipo crezca

**Logs estructurados.** Hoy es `console.log` y el logger default de Nest. Sin
request-id propagado del gateway al downstream no se puede seguir una request entre
servicios — que es justamente lo que uno necesita cuando algo falla en producción.

**Métricas de plataforma.** `admin-service` calcula KPIs de negocio desde la base. No
hay latencia por endpoint ni tasa de error.

---

## 13. Costos y topología en Railway

Nueve servicios (7 apps + Postgres + frontend) sobre un plan de uso por recurso.
Qué se puede tocar sin romper la arquitectura:

**Lo que ya está bien y no hay que cambiar:**

- **Una instancia de Postgres, seis bases** (§ 3.2). Seis instancias serían ~6× el
  costo para el mismo dato. La separación lógica se mantiene.
- **Solo tres dominios públicos** (gateway, frontend, assets-service). El resto por
  `*.railway.internal`, que además **no paga egreso**. Cada dominio público de más es
  tráfico facturado y superficie de ataque.

**Dónde está el desperdicio:**

- **`domains-service` y `admin-service` son casi idle.** El primero es un lookup RDAP
  con un link de afiliación; el segundo, unas queries de KPI para el panel. Dos
  contenedores NestJS completos, cada uno con su runtime, su Prisma y su memoria base,
  para eso. Es el candidato natural a fusión: un solo servicio periférico con dos
  módulos Nest y **dos `PrismaClient`** apuntando a `davinci_domains` y
  `davinci_admin`. Las bases siguen separadas, el contrato de API no cambia y se
  ahorra un contenedor.
  **No lo hagas durante el despliegue**: es refactor. Anotalo para después de que los
  nueve estén verdes.
- **`assets-service` tiene dominio público solo para servir imágenes estáticas.**
  Migrar los uploads a R2/S3 (§ 12.1) mata dos pájaros: resuelve la persistencia y
  permite sacarle el dominio público, dejándolo en la red interna como los demás.

**Réplicas:** una por servicio. No hay motivo para más con el tráfico actual, y
subirle réplicas al gateway hoy **degrada** el rate limiting (§ 12.2) sin dar nada a
cambio. El primero que justificaría escalar es `assets-service`, y solo después de
sacarle los uploads de encima.

**¿Y proxear `/uploads/*` por el gateway?** Se puede — `forwardMultipart()` ya
pipea streams crudos, así que la mecánica existe. Pero mete todo el tráfico de
imágenes por el gateway, que es el único proceso que no se puede replicar sin romper
el throttler. Sirve como paso intermedio para sacarle el dominio público a
`assets-service`; **no** como destino. El destino es object storage con su propia
URL, y ahí el gateway no participa.
