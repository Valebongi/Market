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
