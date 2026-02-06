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
