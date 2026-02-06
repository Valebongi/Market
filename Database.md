# DATABASE.md  
## Diseño y Organización de Base de Datos – PostgreSQL

---

## 1. Objetivo del Diseño de Datos

El diseño de la base de datos debe:

- Ser claro y predecible
- Acompañar la arquitectura de microservicios
- Permitir cambios sin romper datos existentes
- Estar listo para producción desde el MVP

El MVP **no es descartable**, por lo tanto el esquema de datos tampoco.

---

## 2. Estrategia General

- Motor: **PostgreSQL**
- Un **schema por microservicio**
- Migraciones versionadas
- Relaciones explícitas
- Soft delete obligatorio

---

## 3. Esquemas por Microservicio


auth_schema
users_schema
assets_schema
messaging_schema
domains_schema
admin_schema

## 4. Convenciones Generales
Nombres

snake_case

tablas en plural

columnas claras y semánticas

Ejemplo:

license_requests
asset_categories
user_profiles
Campos Base (todas las tablas)

Todas las tablas deben incluir:

id UUID PRIMARY KEY
created_at TIMESTAMP
updated_at TIMESTAMP
deleted_at TIMESTAMP NULL

deleted_at define soft delete.

## 5. Modelos Principales
5.1 Users (users_schema)
users
- id
- email
- password_hash
- role (admin | asset_owner | entrepreneur)
- status (active | suspended)
- created_at
- updated_at
- deleted_at
profiles
- id
- user_id (FK)
- display_name
- bio
- contact_email
- created_at
- updated_at
5.2 Assets (assets_schema)
assets
- id
- owner_id (user_id)
- title
- description
- asset_type
- license_type
- duration
- territory
- status (draft | published | flagged | archived)
- created_at
- updated_at
- deleted_at
asset_categories
- id
- name
asset_category_relations
- asset_id
- category_id
5.3 License Requests (messaging_schema)
license_requests
- id
- asset_id
- requester_id
- owner_id
- intended_use
- duration
- status (pending | accepted | rejected)
- created_at
5.4 Messages (messaging_schema)
messages
- id
- license_request_id
- sender_id
- content
- created_at

Los mensajes no se eliminan nunca.

5.5 Domains (domains_schema)
domain_searches
- id
- user_id
- domain_name
- extension
- available
- searched_at
5.6 Admin / Metrics (admin_schema)
moderation_logs
- id
- asset_id
- action (flagged | approved | removed)
- reason
- created_at
metrics_daily
- id
- metric_name
- value
- date
## 6. Relaciones Clave

Un usuario → muchos activos

Un activo → muchas solicitudes

Una solicitud → muchos mensajes

Un usuario → muchas búsquedas de dominios

Relaciones siempre explícitas, sin magia.

## 7. Migraciones
Reglas

Una migración por cambio

Nunca modificar migraciones ya aplicadas

Siempre reversible

## 8. Auditoría Mínima

Campos obligatorios:

created_at

updated_at

deleted_at

No se implementa:

historial de cambios

versionado de registros

(Post-MVP)

## 9. Indexación
Índices recomendados

users.email

assets.status

assets.asset_type

license_requests.asset_id

domain_searches.user_id

## 10. Seguridad de Datos

Nunca guardar:

passwords en claro

tokens OAuth

datos de pago

Hash seguro para contraseñas

Validación siempre en backend

## 11. Qué NO Implementar en Base de Datos

Triggers complejos

Stored procedures

Lógica de negocio en SQL

Polimorfismo excesivo

## 12. Objetivo Final del Diseño

Un esquema que:

Sea entendible para cualquier dev

Escale sin refactors masivos

Acompañe la arquitectura

No genere deuda técnica temprana

La base de datos no debe ser ingeniosa, debe ser aburridamente correcta.
