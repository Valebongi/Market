# Documentación — Da Vinci Inventa

Marketplace para la compra, venta y licenciamiento de activos digitales.

## Índice

| Archivo | Contenido |
|---|---|
| [arquitectura-microservicios.md](./arquitectura-microservicios.md) | Arquitectura general, stack tecnológico, comunicación entre servicios |
| [servicios.md](./servicios.md) | Descripción detallada de cada microservicio, puertos, bases de datos y endpoints |
| [flujos.md](./flujos.md) | Flujos principales: autenticación, ciclo de vida de activos, solicitudes de licencia |
| [diagrama-microservicios.png](./diagrama-microservicios.png) | Arquitectura general: cliente → gateway → servicios → DBs |
| [diagrama-flujo-auth.png](./diagrama-flujo-auth.png) | Flujo de autenticación: registro, login, recuperación de contraseña |
| [diagrama-flujo-activos.png](./diagrama-flujo-activos.png) | Flujo de activos y solicitudes: crear, publicar, negociar, cerrar |
| [diagrama-endpoints.png](./diagrama-endpoints.png) | Mapa completo de endpoints por servicio con nivel de acceso |
| [despliegue.md](./despliegue.md) | Guía de despliegue Docker, checklist de seguridad, backups y actualizaciones |

## Stack principal

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend:** NestJS (microservicios independientes)
- **Base de datos:** PostgreSQL 18 (una instancia por servicio)
- **ORM:** Prisma
- **Autenticación:** JWT (Bearer tokens)
- **Gateway:** Proxy HTTP + middleware de autenticación
