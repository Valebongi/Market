# BACKEND.md  
## Guía de Desarrollo Backend – Microservicios (NestJS)

---

## 1. Objetivo del Backend

El backend debe ser:

- Robusto
- Predecible
- Fácil de mantener
- Escalable sin complejidad innecesaria

El objetivo del MVP es **tener servicios reales, listos para producción**, no prototipos descartables.

---

## 2. Stack Backend

- Runtime: **Node.js**
- Framework: **NestJS**
- Lenguaje: **TypeScript**
- API: **REST**
- Validaciones: `class-validator`
- Configuración: `@nestjs/config`
- ORM: **Prisma** o **TypeORM** (uno solo, consistente)
- Auth: JWT + OAuth

---

## 3. Organización General de Microservicios

Cada microservicio es un proyecto independiente con la misma estructura base:

```text
src/
├── main.ts
├── app.module.ts
├── modules/
│   ├── module-name/
│   │   ├── controller.ts
│   │   ├── service.ts
│   │   ├── dto/
│   │   ├── entities/
│   │   └── module.ts
├── common/
│   ├── guards/
│   ├── filters/
│   ├── interceptors/
│   └── decorators/
├── config/
└── prisma / orm/

4. Convenciones de Endpoints
Reglas generales

REST puro

Verbos HTTP correctos

Nombres en plural

Versionado explícito

Ejemplo:

GET    /api/v1/assets
POST   /api/v1/assets
GET    /api/v1/assets/:id
PATCH  /api/v1/assets/:id
DELETE /api/v1/assets/:id
5. DTOs y Validaciones
Obligatorio

Todo input debe pasar por DTO

Nada entra sin validación

Ejemplo:

export class CreateAssetDto {
  @IsString()
  title: string;


  @IsEnum(AssetType)
  type: AssetType;


  @IsEnum(LicenseType)
  licenseType: LicenseType;
}
6. Manejo de Errores
Estrategia

HTTP Exceptions

Mensajes claros

Nada de errores genéricos

Ejemplo:

throw new BadRequestException('Invalid license type');
Formato de error estándar
{
  "statusCode": 400,
  "message": "Invalid license type",
  "error": "Bad Request"
}
7. Autenticación y Autorización
JWT

Emitido por Auth Service

Contiene:

userId

role

email

Guards

AuthGuard → autenticación

RolesGuard → autorización por rol

Ejemplo:

@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
8. Roles del Sistema

admin

asset_owner (titular)

entrepreneur (emprendedor)

Los roles se validan en backend, nunca solo en frontend.

9. Comunicación entre Servicios
MVP

HTTP sincrónico

Timeout controlado

Manejo de errores explícito

No usar

Message brokers

Eventos async

CQRS

10. Logging
Reglas

Logs estructurados

Niveles: info / warn / error

Nunca loggear datos sensibles

11. Seguridad Básica

Rate limiting

CORS configurado

Sanitización de inputs

Headers seguros

12. Servicios Específicos – Reglas Clave
Assets Service

Solo el titular puede modificar su activo

Moderación automática inicial

Estados del activo:

draft

published

flagged

archived

Messaging Service

Solo partes involucradas pueden ver mensajes

Historial inmutable

No eliminación de mensajes

Domains Service

Nunca guarda datos sensibles

Solo registra consultas

Redirección controlada

13. Qué NO Implementar en Backend

Pagos

Lógica legal

Validación de IP

Firma digital

Automatización contractual

Si una feature roza esto → NO IMPLEMENTAR.

14. Objetivo Final del Backend

Tener un backend que:

Soporte usuarios reales

Sea seguro

Escale con criterio

Permita agregar features sin romper el core

No dependa de hacks

El backend no debe ser brillante, debe ser confiable.
