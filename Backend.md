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
