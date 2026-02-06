# ARCHITECTURE.md  
## Arquitectura Técnica del Producto

---

## 1. Principios de Arquitectura

La arquitectura del sistema se diseña bajo los siguientes principios:

- **Separación clara de responsabilidades**
- **Escalabilidad progresiva**, no prematura
- **Despliegue independiente por servicio**
- **Comunicación simple y predecible**
- **Evitar sobre-ingeniería innecesaria en el MVP**

Aunque se adopta una arquitectura de microservicios, el MVP prioriza **claridad y velocidad de desarrollo**, manteniendo los servicios bien delimitados pero operables por un equipo pequeño.

---

## 2. Enfoque de Microservicios para el MVP

El sistema se compone de múltiples servicios backend desacoplados, cada uno responsable de un dominio funcional específico.

Cada microservicio:
- Es una aplicación NestJS independiente
- Tiene su propia base de datos (schema separado en PostgreSQL)
- Expone una API REST
- Se comunica con el API Gateway

---

## 3. Diagrama Conceptual de Arquitectura

```text
[ Client Web (Next.js) ]
           |
           v
     [ API Gateway ]
           |
   ---------------------------------
   |       |        |        |     |
 Auth   Users    Assets   Messaging Domains
 Service Service  Service   Service  Service
   |
 Admin / Metrics Service
4. Servicios Definidos
4.1 API Gateway

Responsabilidad

Punto único de entrada al backend

Routing hacia microservicios

Autenticación y autorización centralizada

Rate limiting básico

Tecnología

NestJS

Middleware JWT

Guards por rol

4.2 Auth Service

Responsabilidad

Registro y login

OAuth (Google / GitHub)

Emisión y validación de JWT

Gestión de sesiones

No hace

Gestión de perfiles

Autorización de negocio

4.3 Users Service

Responsabilidad

Gestión de usuarios

Roles (admin / titular / emprendedor)

Perfil público y privado

Estados de cuenta

4.4 Assets Service

Responsabilidad

CRUD de activos intelectuales

Tipos de activos

Tipos de licencias

Publicación y estado del activo

Moderación automática inicial

Este servicio es el core del negocio.

4.5 Messaging Service

Responsabilidad

Mensajería interna básica

Registro de solicitudes de licencia

Historial de conversaciones

Notificaciones internas

Importante

No reemplaza canales externos

Facilita el contacto, no lo cierra

4.6 Domains Service

Responsabilidad

Integración con API externa de dominios

Búsqueda de disponibilidad

Registro de consultas

Redirección al proveedor

4.7 Admin / Metrics Service

Responsabilidad

Panel administrativo

Moderación posterior

Métricas de uso

KPIs del MVP

5. Comunicación entre Servicios
Estrategia

Comunicación sincrónica vía HTTP

No usar message brokers en el MVP

Contratos claros vía DTOs

Motivo

Simplicidad

Facilidad de debugging

Menor carga cognitiva

6. Gestión de Datos

PostgreSQL como base común

Un schema por microservicio

Migraciones independientes

No compartir tablas entre servicios

7. Autenticación y Autorización

JWT emitido por Auth Service

Validación centralizada en API Gateway

Roles incluidos en el token

Guards específicos por endpoint

8. Manejo de Errores

Respuestas HTTP estandarizadas

Códigos claros

Mensajes legibles

Logs estructurados por servicio

9. Escalabilidad Proyectada

Post-MVP, la arquitectura permite:

Escalar servicios críticos de forma independiente

Incorporar pagos sin tocar el core

Añadir firma digital como servicio externo

Incorporar colas/eventos si el tráfico lo requiere

Nada de esto es obligatorio en el MVP.

10. Qué NO se Implementa en el MVP

Event-driven architecture

Message brokers (Kafka, RabbitMQ)

Service mesh

GraphQL

CQRS complejo

Estas decisiones son intencionales.

11. Resumen de la Arquitectura

Microservicios claros

NestJS como base

API Gateway central

Comunicación simple

Escalable sin ser compleja

Diseñada para un equipo pequeño

La arquitectura está pensada para construir rápido, validar el negocio y escalar con criterio, no para impresionar técnicamente.
