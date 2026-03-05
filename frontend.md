# FRONTEND.md  
## Guía de Desarrollo Frontend – Plataforma Web

---

## 1. Objetivo del Frontend

El frontend debe comunicar **confianza, claridad y profesionalismo**, siendo:

- Extremadamente intuitivo
- Minimalista
- Tecnológico sin ser frío
- Usable sin onboarding ni tutoriales

El objetivo es que **cualquier usuario entienda qué hacer en menos de 30 segundos**.

---

## 2. Stack Frontend

- Framework: **Next.js (React)**
- Router: **App Router**
- Lenguaje: **TypeScript**
- Estilos: **TailwindCSS**
- Fetching: `fetch` nativo + server actions cuando aplique
- Estado:
  - Server State primero
  - Estado local solo cuando sea necesario

---

## 3. Estructura de Carpetas

```text
app/
├── (public)/
│   ├── page.tsx              # Home / Marketplace público
│   ├── assets/
│   │   └── [id]/page.tsx     # Detalle de activo
│   └── layout.tsx
│
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── layout.tsx
│
├── dashboard/
│   ├── layout.tsx
│   ├── page.tsx              # Overview
│   ├── assets/               # Gestión de activos
│   ├── requests/             # Solicitudes / mensajes
│   ├── domains/              # Dominios
│   └── admin/                # Solo admin
│
├── api/                      # Server actions / proxies
│
components/
├── ui/                       # Componentes reutilizables
├── layout/                   # Navbar, footer, sidebar
├── assets/                   # Componentes del dominio
├── forms/
└── feedback/                 # Toasts, alerts, modals

4. Tipos de Páginas
4.1 Públicas

Home / Marketplace

Detalle de activo

Login / Registro

Términos y condiciones

Estas páginas:

Deben usar SSR

Ser rápidas

Tener SEO básico

4.2 Privadas (Dashboard)

Acceso autenticado

Layout persistente

Sidebar clara

Acciones evidentes

5. Convenciones de Componentes
Reglas generales

Componentes pequeños y legibles

Un componente = una responsabilidad

Evitar lógica compleja en UI

Naming

PascalCase

Verbos claros para acciones

Nada genérico (Card, Item, Box sin contexto)

Ejemplos correctos:

AssetCard

LicenseRequestForm

DomainSearchInput

6. UI / Design System
Paleta oficial
Primary:    #0A2540
Secondary:  #3B82F6
Accent:     #22C55E


Background: #FFFFFF
Gray Light: #F3F4F6
Gray Dark:  #374151
Tipografía

Sans-serif moderna

Priorizar legibilidad

Jerarquía clara (h1 → h4)

7. Principios UX Obligatorios

Máximo 1 acción primaria por pantalla

Copy claro, sin jerga legal

Feedback inmediato (loading, success, error)

Estados vacíos explicativos

Formularios cortos

Validaciones visibles y humanas

8. Marketplace UX
Home

Explica qué es la plataforma

CTA claro: “Explorar activos”

Categorías visibles

Confianza visual (colores, spacing)

Asset Card

Título

Tipo de activo

Tipo de licencia

CTA: “Solicitar licencia”

Nada más.

9. Formularios
Reglas

No más de 5 campos por paso

Labels claros

Placeholders descriptivos

Errores visibles sin bloquear al usuario

10. Autenticación en Frontend

Protección por layout

Redirecciones claras

Persistencia de sesión

Manejo explícito de roles

11. Accesibilidad y Performance

Contraste adecuado

Botones grandes

Navegación clara

Evitar animaciones innecesarias

Carga progresiva

12. Qué NO Hacer en Frontend

No lógica de negocio compleja

No validaciones críticas (eso va en backend)

No over-engineering

No efectos visuales invasivos

No dependencias innecesarias

13. Objetivo Final del Frontend

Construir una interfaz que:

Inspire confianza

Invite a explorar

Reduzca fricción

Funcione como producto real

No requiera explicación

Si el usuario necesita instrucciones, el diseño falló.
