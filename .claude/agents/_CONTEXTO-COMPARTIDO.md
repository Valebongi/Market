# Contexto compartido — Da Vinci Inventa

> Este bloque está replicado en el brief de cada agente. Es la verdad común.

## Producto
Marketplace SaaS de **intermediación de licencias sobre activos intelectuales**.
Conecta titulares (marcas, software, diseños, modelos de negocio, proyectos) con
emprendedores que quieren licenciarlos. Monetiza por comisión declarada (5-10%)
sobre acuerdos cerrados, suscripción premium para titulares y afiliación de dominios.

## LÍMITES DUROS DEL MVP — no negociables
La plataforma **NO**:
- procesa pagos
- verifica titularidad legal ni autenticidad de la propiedad intelectual
- firma contratos vinculantes ni hace firma digital
- resuelve disputas ni actúa como garante
- implementa rating de usuarios
- automatiza contratos

**Si una tarea roza cualquiera de estos puntos → PARÁ y reportá al orquestador.**
No implementes "una versión chiquita" de ninguno.

## Topología
```
Next.js 15 (3000) → Gateway NestJS (8080) → 6 microservicios (3001-3006)
```
| Servicio | Puerto | DB |
|---|---|---|
| gateway | 8080 | — |
| auth-service | 3001 | davinci_auth |
| assets-service | 3002 | davinci_assets |
| users-service | 3003 | davinci_users |
| messaging-service | 3004 | davinci_messaging |
| domains-service | 3005 | davinci_domains |
| admin-service | 3006 | davinci_admin |

PostgreSQL 18 local (postgres/postgres). Cada servicio corre con `npm run dev`.

## Hecho arquitectónico clave
**No hay comunicación servicio-a-servicio**, salvo `auth-service → users-service`
(crear perfil al registrar). La orquestación de datos (activo + dueño + solicitudes)
la hace el **frontend**. No introduzcas llamadas cruzadas sin aprobación del
orquestador: rompe el desacople y no hay message broker en el MVP.

## Autenticación
El gateway valida el JWT e inyecta headers `x-user-id`, `x-user-email`, `x-user-role`
hacia los servicios. Los servicios **confían** en esos headers y no revalidan el token.
El JWT lo emite auth-service y contiene `sub`, `email`, `role`.

## Roles
`admin` · `asset_owner` (titular) · `entrepreneur` (emprendedor).
Se validan **siempre** en backend, nunca solo en frontend.

## Protocolo multi-agente
1. **Escribís SOLO en los archivos que tu brief declara como tuyos.** Si necesitás
   tocar algo fuera de tu scope, **no lo toques**: reportalo al orquestador.
2. **Cambios de contrato de API** (shape de request/response): NO los propagues vos
   al otro lado de la pila. Reportá el cambio exacto (endpoint, campos antes/después)
   y el orquestador lo rutea al agente dueño.
3. Nunca commitees a `main`. Trabajás sobre la rama que te indique el orquestador.
4. Al terminar, tu reporte final debe incluir: qué archivos tocaste, qué contratos
   cambiaste (si hubo), y qué quedó pendiente o bloqueado.
