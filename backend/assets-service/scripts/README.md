# Carga del catálogo por API

`load-catalog.mjs` crea y publica los activos de `catalog.data.mjs` llamando a la
API real. Sin dependencias: `fetch` nativo de Node 20.

## Por qué por API y no por SQL

No hay acceso SQL a la base de producción y no se va a habilitar: abrir un proxy
TCP contra el Postgres de Railway es exponer la base a internet.

Aun con acceso SQL, este sería el camino correcto. Entrando por `POST /assets`
cada activo pasa por `CreateAssetDto`, por el `ValidationPipe` con `whitelist` y
`forbidNonWhitelisted`, por la generación de slug con resolución de colisiones y
por la regla de titularidad. Un `INSERT` directo deja en la base filas que la
propia API habría rechazado.

## Antes de correr nada

1. **Existe la cuenta del titular.** Los activos se crean a nombre del `sub` del
   token. Si ese usuario no existe en `davinci_users`, el frontend pide su perfil,
   recibe 404 y la ficha muestra `Titular aa0000` en vez de un nombre.
2. **El perfil está completo**: `displayName`, `bio`, `avatarUrl` y LinkedIn.
   `ReputationBadges` calcula las insignias a partir de `bio` y `avatarUrl`: sin
   eso el titular aparece sin ninguna.
3. **Leíste el contenido.** `catalog.data.mjs` es la cara pública del producto.
   Cada activo tiene un bloque `_confirmar` con las decisiones que dependen del
   dueño; el script las imprime pero no puede resolverlas.

## Uso

```bash
# 1. Revisar contenido y plan. No escribe nada, no necesita token.
node scripts/load-catalog.mjs --dry-run

# 2. Ensayo local contra el assets-service en 3002.
DAVINCI_USER_ID=<uuid> node scripts/load-catalog.mjs \
    --api http://localhost:3002/api/v1 --direct --publish

# 3. Producción, vía gateway.
DAVINCI_TOKEN=<jwt> node scripts/load-catalog.mjs \
    --api https://<gateway>/api/v1 --publish --yes
```

| Flag | Efecto |
|---|---|
| `--dry-run` | Valida el catálogo e imprime el plan. No escribe. |
| `--api <url>` | Base con prefijo. Default `http://localhost:3002/api/v1`. |
| `--direct` | Habla al assets-service con `x-user-id` en vez de JWT. Solo localhost. |
| `--publish` | Publica lo creado. Sin esto queda todo en borrador, invisible. |
| `--yes` | Obligatorio si el destino no es localhost. |
| `--delay <ms>` | Pausa entre llamadas. Default 800. |

`DAVINCI_TOKEN` va por variable de entorno y no por argumento: los argumentos
quedan en el historial del shell y en la lista de procesos.

## Idempotencia

El script lee `GET /assets/manage/list` con el token del titular antes de escribir.
Esa ruta devuelve sus activos **en cualquier estado**, borradores incluidos,
porque el servicio pisa el `ownerId` con el `sub` del token.

La clave de deduplicación es el **título normalizado**, no el slug: el slug lo
deriva el servidor y le agrega sufijos ante colisión, así que replicar esa lógica
acá sería mantenerla dos veces.

Consecuencia: **si editás el título de un activo ya cargado, la próxima corrida
crea un duplicado.** Para renombrar algo publicado se usa `PUT /assets/:id`. El
slug no se regenera nunca — es la URL pública y es inmutable a propósito.

Una corrida cortada a la mitad se retoma sola: los ya creados se saltean y, con
`--publish`, los que quedaron en borrador se publican.

## Límite de peticiones

El gateway permite 100 peticiones por minuto por IP (`RATE_LIMIT_MAX`). Cuatro
activos son 1 lectura + 4 `POST` + 4 `PATCH` = 9. Con `--delay 800` sobra margen.
Si el catálogo crece por encima de ~40 activos, subir el delay.

## Portadas

`coverImageUrl` va vacío. `/uploads` del assets-service está muerto en producción:
el servicio ya no tiene dominio público y el disco del contenedor es efímero.
Sin portada, `AssetCard` cae a un degradé por categoría con el ícono del tipo de
activo — se ve entero.

Cuando haya capturas reales se suben al origen del **frontend**, que sí tiene
dominio público. El script hace `HEAD` sobre cada portada y **se niega a publicar
una que no responda 2xx**: preferimos sin imagen antes que con imagen rota.

## Verificación posterior

```bash
curl -s "https://<gateway>/api/v1/assets?limit=20" | jq '.total, .data[].slug'
```

Debe devolver los activos con `status: published`. Si `total` es 0 después de una
corrida con `--publish`, quedaron en borrador: revisar la salida del script.
