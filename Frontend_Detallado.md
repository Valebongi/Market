# FRONTEND DETALLADO – DA VINCI INVENTA
## Descripción Completa de Diseño y Experiencia de Usuario

---

## 📋 Índice

1. [Filosofía de Diseño](#1-filosofía-de-diseño)
2. [Identidad Visual y Paleta de Colores](#2-identidad-visual-y-paleta-de-colores)
3. [Tipografía y Espaciado](#3-tipografía-y-espaciado)
4. [Arquitectura de Navegación](#4-arquitectura-de-navegación)
5. [Catálogo Completo de Pantallas](#5-catálogo-completo-de-pantallas)
6. [Sistema de Componentes](#6-sistema-de-componentes)
7. [Microinteracciones y Estados](#7-microinteracciones-y-estados)
8. [Responsive Design](#8-responsive-design)
9. [Accesibilidad](#9-accesibilidad)
10. [Conclusión](#10-conclusión)

---

## 1. Filosofía de Diseño

### 1.1 Principios Rectores

**Da Vinci Inventa** es una plataforma que democratiza el acceso a la propiedad intelectual. Su frontend debe reflejar **confianza institucional sin rigidez corporativa**, combinando **profesionalismo con accesibilidad**.

**Principios clave:**

- **Claridad sobre Complejidad**: Cada pantalla tiene un propósito claro e inmediato
- **Elegancia Funcional**: Belleza que sirve a la usabilidad, no al ego del diseñador
- **Confianza Visual**: Transmitir solidez técnica y seguridad sin intimidar
- **Minimalismo Cálido**: Espacios limpios con toques humanos sutiles
- **Profesionalismo Accesible**: Sofisticado pero nunca elitista

### 1.2 Referencias Estéticas

La interfaz se inspira en plataformas que han logrado equilibrar profesionalismo con experiencia de usuario excepcional:

- **Stripe**: Claridad técnica, documentación visual impecable
- **Linear**: Minimalismo funcional, jerarquías claras
- **Notion**: Flexibilidad sin caos, diseño breathing
- **GitHub**: Información densa presentada con elegancia
- **Vercel**: Diseño contemporáneo con personalidad contenida

### 1.3 Personalidad de Marca

**Si Da Vinci Inventa fuera una persona, sería:**
- Profesional pero conversacional
- Técnica pero accesible
- Sofisticada pero no pretenciosa
- Visionaria pero pragmática
- Confiable pero innovadora

---

## 2. Identidad Visual y Paleta de Colores

### 2.1 Paleta Principal

La paleta de colores ha sido cuidadosamente seleccionada para transmitir **confianza, innovación y claridad** sin caer en frialdad corporativa ni en exuberancia creativa descontrolada.

#### **Colores Primarios**

**Azul Medianoche (Brand Primary)**
```
Color: #0A2540
Uso: Headers, botones primarios, títulos principales
Psicología: Confianza, estabilidad, profundidad intelectual
```

**Azul Eléctrico (Interactive)**
```
Color: #2563EB
Uso: Links, botones secundarios, highlights interactivos
Psicología: Tecnología, dinamismo, claridad
```

**Esmeralda Profundo (Success/Accent)**
```
Color: #059669
Uso: Estados exitosos, confirmaciones, badges premium
Psicología: Crecimiento, validación, prosperidad
```

#### **Colores Secundarios**

**Índigo Suave (Secondary Brand)**
```
Color: #4F46E5
Uso: Elementos secundarios, categorías, tags
Psicología: Creatividad, innovación, diferenciación
```

**Ámbar Cálido (Warning/Attention)**
```
Color: #D97706
Uso: Alertas no críticas, estados pendientes, highlights informativos
Psicología: Atención sin alarma, calidez sutil
```

**Coral Suave (Error/Critical)**
```
Color: #DC2626
Uso: Errores, validaciones fallidas, acciones destructivas
Psicología: Urgencia controlada, claridad en problemas
```

#### **Escala de Grises Sofisticados**

**Blanco Puro (Background Primary)**
```
Color: #FFFFFF
Uso: Fondos principales, cards elevados
```

**Gris Nieve (Background Secondary)**
```
Color: #F9FAFB
Uso: Fondos alternos, secciones diferenciadas
```

**Gris Niebla (Borders/Dividers)**
```
Color: #E5E7EB
Uso: Separadores, bordes sutiles, outlines
```

**Gris Pizarra (Text Secondary)**
```
Color: #6B7280
Uso: Textos secundarios, descripciones, metadata
```

**Gris Carbón (Text Primary)**
```
Color: #1F2937
Uso: Textos principales, contenido de alta jerarquía
```

**Negro Absoluto (High Emphasis)**
```
Color: #000000
Uso: Títulos críticos, elementos de máxima jerarquía (uso mínimo)
```

### 2.2 Gradientes Sutiles

Para elementos premium o destacados, se utilizan gradientes controlados:

**Gradiente Marca (Hero Sections)**
```
Linear: #0A2540 → #2563EB (45deg)
Opacidad: 0.95 a 0.85
Uso: Headers hero, banners principales
```

**Gradiente Éxito (Premium Features)**
```
Linear: #059669 → #10B981 (135deg)
Opacidad: 0.1 overlay
Uso: Badges premium, planes destacados
```

### 2.3 Transparencias y Overlays

**Sistema de opacidades estandarizado:**
- Hover states: 8% del color base
- Active states: 12% del color base
- Disabled states: 50% del color base
- Overlays: 60-80% de negro sobre imágenes
- Glassmorphism: 80% blur + 5% opacidad de fondo

### 2.4 Psicología del Color Aplicada

- **Azul dominante**: Genera confianza sin rigidez bancaria
- **Verde como acento**: Refuerza ideas de crecimiento y validación positiva
- **Grises cálidos**: Evitan la frialdad típica de plataformas B2B
- **Toques de índigo**: Inyectan personalidad e innovación
- **Sin negro puro en textos**: Reduce fatiga visual, mantiene elegancia

---

## 3. Tipografía y Espaciado

### 3.1 Sistema Tipográfico

**Familia Tipográfica Principal: Inter**
```
Razón: Legibilidad excepcional en pantallas digitales
Versatilidad: De textos largos a números financieros
Personalidad: Moderna, neutral, profesional
Open Source: Sí
Variable Font: Sí (mejora performance)
```

**Pesos utilizados:**
- Regular (400): Textos de cuerpo, descripciones
- Medium (500): Labels, botones, navegación
- Semibold (600): Subtítulos, elementos destacados
- Bold (700): Títulos principales, CTAs

**Familia Tipográfica Alternativa (Opcional para Marca): Poppins**
```
Uso: Únicamente en logo, taglines, secciones hero
Personalidad: Más cálida y humanizada que Inter
Peso: Medium (500) y Semibold (600)
```

### 3.2 Escala Tipográfica

Basada en una proporción armónica (1.250 – Major Third Scale):

```
Display (Hero): 60px / 3.75rem - Line height: 1.1 - Weight: 700
H1 (Page Titles): 48px / 3rem - Line height: 1.2 - Weight: 700
H2 (Section Titles): 36px / 2.25rem - Line height: 1.3 - Weight: 600
H3 (Subsections): 28px / 1.75rem - Line height: 1.4 - Weight: 600
H4 (Components): 20px / 1.25rem - Line height: 1.5 - Weight: 600
Body Large: 18px / 1.125rem - Line height: 1.6 - Weight: 400
Body: 16px / 1rem - Line height: 1.5 - Weight: 400
Body Small: 14px / 0.875rem - Line height: 1.5 - Weight: 400
Caption: 12px / 0.75rem - Line height: 1.4 - Weight: 500
```

### 3.3 Sistema de Espaciado

Basado en unidades de 4px (multiplicadores: 1, 2, 3, 4, 6, 8, 12, 16, 24, 32):

```
xs:  4px  - Espaciado mínimo entre elementos relacionados
sm:  8px  - Espaciado entre tags, badges, iconos
md:  16px - Espaciado estándar entre componentes
lg:  24px - Espaciado entre secciones relacionadas
xl:  32px - Espaciado entre secciones principales
2xl: 48px - Espaciado hero, padding de containers grandes
3xl: 64px - Márgenes externos, secciones diferenciadas
4xl: 96px - Espacios dramáticos (landing, heros)
```

### 3.4 Contenedores y Anchos Máximos

```
Container Narrow (Formularios): 640px / 40rem
Container Standard (Contenido): 896px / 56rem
Container Wide (Dashboard): 1280px / 80rem
Container Full (Marketplace Grid): 1440px / 90rem
```

---

## 4. Arquitectura de Navegación

### 4.1 Estructura de Navegación Principal

**Zona Pública (No Autenticada)**
```
Header Sticky:
- Logo (izquierda)
- Explorar Activos
- Cómo Funciona
- [Espaciador]
- Iniciar Sesión (ghost button)
- Registrarse (primary button)
```

**Zona Privada (Autenticada – Dashboard)**
```
Sidebar Persistente (izquierda):
- Logo + Nombre de usuario
- Dashboard (overview)
- Mis Activos (solo titulares)
- Solicitudes (ambos roles)
- Explorar Marketplace
- Dominios
- [Divider]
- Configuración
- Ayuda
- Cerrar Sesión

Top Bar (derecha):
- Búsqueda global
- Notificaciones
- Avatar + dropdown
```

**Zona Administrativa (Admin)**
```
Sidebar Específico:
- Dashboard Admin
- Moderación de Activos
- Usuarios
- Métricas
- Configuración Global
```

### 4.2 Flujos de Navegación Críticos

**Flujo del Titular (Publicar Activo)**
```
Home → Registrarse → Onboarding → Dashboard → 
"Publicar Activo" → Formulario Multi-paso → 
Preview → Publicar → Confirmación
```

**Flujo del Emprendedor (Solicitar Licencia)**
```
Home → Explorar → Detalle de Activo → 
"Solicitar Licencia" → (Login si no autenticado) → 
Formulario Solicitud → Enviar → Mensajería
```

**Flujo de Dominios**
```
Dashboard → Dominios → Buscar dominio → 
Ver disponibilidad → Redirección externa
```

### 4.3 Breadcrumbs y Contexto

Las breadcrumbs aparecen solo en vistas profundas:
```
Dashboard / Mis Activos / [Nombre del Activo] / Editar
Explorar / Diseño / [Nombre del Activo]
```

---

## 5. Catálogo Completo de Pantallas

### 5.1 PANTALLAS PÚBLICAS

#### **5.1.1 Landing Page / Home**

**Objetivo:** Comunicar la propuesta de valor en 5 segundos, generar confianza, invitar a explorar.

**Estructura Visual:**

**Hero Section**
```
Layout: Full viewport height
Fondo: Gradiente sutil azul medianoche con textura de puntos
Alineación: Centro

Contenido:
- Título (Display): "Conecta Ideas con Oportunidades"
  Color: Blanco
  Max-width: 800px
  
- Subtítulo (Body Large): "La plataforma que une titulares de activos 
  intelectuales con emprendedores listos para lanzar"
  Color: Gris Niebla (#E5E7EB)
  Max-width: 600px
  Margin-top: 16px
  
- CTA Primario: "Explorar Activos Disponibles"
  Botón: Large, Esmeralda, Full rounded
  Margin-top: 32px
  
- CTA Secundario: "Publicar un Activo"
  Botón: Large, Ghost white, Full rounded
  Margin-left: 16px
  
- Trust Indicators: 
  Iconos + números: "120+ Activos" | "350+ Usuarios" | "40+ Licencias"
  Layout: Flex row, margin-top: 48px
  Color: Blanco con 70% opacidad
```

**Sección "Cómo Funciona"**
```
Layout: 3 columnas con iconos
Padding: 96px vertical
Fondo: Blanco puro

Card de paso:
- Icono: 48px, Azul Eléctrico, con círculo background
- Número: "01", "02", "03" (decorativo, gris niebla)
- Título (H4): Nombre del paso
- Descripción (Body): Breve explicación
- Espaciado: 32px entre cards

Pasos:
1. "Publica o Explora" → Titulares publican, emprendedores buscan
2. "Conecta y Negocia" → Sistema de solicitudes y mensajería
3. "Acuerda y Lanza" → Cierre de acuerdo y uso de activo
```

**Sección "Categorías Destacadas"**
```
Layout: Grid 4 columnas (responsive)
Padding: 96px vertical
Fondo: Gris Nieve

Card de categoría:
- Imagen/Icono representativo
- Overlay con gradiente
- Título de categoría
- Cantidad de activos disponibles
- Hover: Lift effect + border glow
- Link: A página de categoría filtrada

Categorías mostradas:
- Software y Apps
- Diseño y Branding
- Modelos de Negocio
- Contenido Digital
```

**Sección "Para Titulares / Para Emprendedores"**
```
Layout: 2 columnas alternadas
Padding: 96px vertical
Fondo: Blanco puro

Lado izquierdo (Titulares):
- Icono/Ilustración
- Título (H2): "Para Titulares de Activos"
- Lista de beneficios con checkmarks verdes
- CTA: "Comenzar a Publicar"

Lado derecho (Emprendedores):
- Icono/Ilustración
- Título (H2): "Para Emprendedores"
- Lista de beneficios con checkmarks verdes
- CTA: "Explorar Activos"
```

**Footer**
```
Layout: 4 columnas
Padding: 64px vertical, 32px bottom
Fondo: Azul Medianoche
Color texto: Blanco / Gris claro

Columnas:
1. Logo + Tagline
2. Producto (links: Explorar, Publicar, Dominios)
3. Soporte (Ayuda, Términos, Privacidad)
4. Newsletter signup (opcional MVP)

Copyright: Centro, pequeño, gris medio
```

---

#### **5.1.2 Marketplace / Explorar Activos**

**Objetivo:** Permitir descubrimiento rápido y efectivo de activos mediante filtros claros.

**Header de Página**
```
Layout: Container Standard
Padding-top: 32px

Título (H1): "Explora Activos Disponibles"
Descripción (Body): "Encuentra el activo perfecto para tu próximo proyecto"
```

**Barra de Filtros (Sidebar Izquierda)**
```
Width: 280px
Position: Sticky
Padding: 24px
Background: Blanco
Border: 1px gris niebla
Border-radius: 12px

Secciones:
1. Búsqueda por texto
   - Input con icono lupa
   - Placeholder: "Buscar activos..."
   
2. Categorías
   - Checkboxes con conteo
   - Max-height: 300px, scrollable
   
3. Tipo de Licencia
   - Radio buttons:
     * Todas
     * Exclusiva
     * No Exclusiva
     * Temporal
     
4. Rango de Precio (Post-MVP)
   - Slider dual
   
5. Botón "Limpiar Filtros"
   - Ghost, pequeño, al final
```

**Grid de Activos (Área Principal)**
```
Layout: Grid 3 columnas (responsive: 2 en tablet, 1 en móvil)
Gap: 24px
Padding: 32px

Asset Card:
- Background: Blanco
- Border: 1px gris niebla
- Border-radius: 16px
- Padding: 24px
- Hover: Shadow elevate + border azul eléctrico sutil
- Cursor: pointer

Contenido de Card:
1. Badge de categoría (top-left)
   - Background: Azul eléctrico 10% opacity
   - Texto: Azul eléctrico
   - Padding: 4px 12px
   - Border-radius: full
   
2. Título del activo (H4)
   - Color: Gris carbón
   - Truncate: 2 líneas
   - Margin-top: 12px
   
3. Descripción breve (Body Small)
   - Color: Gris pizarra
   - Truncate: 3 líneas
   - Margin-top: 8px
   
4. Metadata (Caption)
   - Layout: Flex row, space-between
   - Tipo de licencia | Publicado hace X
   - Color: Gris pizarra
   - Margin-top: 16px
   
5. Avatar del titular + nombre
   - Layout: Flex row
   - Avatar: 32px circular
   - Nombre: Caption
   - Margin-top: 12px
   
6. CTA: "Ver Detalles"
   - Botón secondary, small, full width
   - Margin-top: 16px
```

**Paginación**
```
Layout: Centro, margin-top: 48px
Botones: Previous / 1 2 3 ... / Next
Estilo: Ghost con current page highlighted
```

**Estado Vacío (Sin Resultados)**
```
Layout: Centro vertical
Ilustración: Icono de búsqueda vacía
Título (H3): "No encontramos activos con esos filtros"
Descripción (Body): "Intenta ajustar tus criterios de búsqueda"
CTA: "Ver Todos los Activos"
```

---

#### **5.1.3 Detalle de Activo**

**Objetivo:** Presentar toda la información necesaria para tomar decisión, generar interés, facilitar contacto.

**Layout:** 2 columnas (70/30)

**Columna Principal (Izquierda)**

**Hero del Activo**
```
Padding: 48px 0
Border-bottom: 1px gris niebla

- Badge de categoría (inline)
- Título (H1): Nombre del activo
  Margin-top: 8px
  
- Metadata Row (Body Small, Gris pizarra)
  Icons + texto:
  * Tipo de activo
  * Tipo de licencia disponible
  * Publicado hace X
  Margin-top: 12px
  
- Titular Info (inline)
  Avatar + Nombre + Badge "Verificado" (si aplica)
  Margin-top: 16px
```

**Sección: Descripción**
```
Padding: 32px 0
Border-bottom: 1px gris niebla

Título (H3): "Descripción"
Contenido (Body): 
- Párrafos con line-height generoso
- Max-width: 680px para lectura óptima
- Links en azul eléctrico si hay referencias
```

**Sección: Detalles de Licencia**
```
Padding: 32px 0
Border-bottom: 1px gris niebla

Título (H3): "Condiciones de Licencia"

Grid 2 columnas:
- Tipo de Licencia: [Valor]
- Duración: [Valor]
- Territorio: [Valor]
- Uso Permitido: [Valor]
- Exclusividad: [Valor]
- Precio Estimado: [Rango o "A consultar"]

Cada ítem:
- Label (Caption, Gris pizarra)
- Valor (Body, Gris carbón)
- Padding: 12px 0
```

**Sección: Documentación / Recursos**
```
Padding: 32px 0
Border-bottom: 1px gris niebla

Título (H3): "Recursos Disponibles"

Lista de archivos/links (si hay):
- Icono de tipo de archivo
- Nombre del archivo
- Tamaño / tipo
- Botón "Descargar" o "Disponible tras acuerdo"
```

**Sección: Tags / Palabras Clave**
```
Padding: 32px 0

Título (H3): "Etiquetas"

Tags cloud:
- Background: Gris nieve
- Border: 1px gris niebla
- Padding: 6px 12px
- Border-radius: full
- Color: Gris carbón
- Hover: Border azul eléctrico
- Clickable: Filtra marketplace por ese tag
```

**Columna Lateral (Derecha)**

**Card de Acción (Sticky)**
```
Background: Blanco
Border: 1px gris niebla
Border-radius: 16px
Padding: 24px
Position: Sticky, top: 24px

Contenido:
1. Precio/Condición destacada (H3)
   - Si hay precio: Tamaño grande
   - Si es "A consultar": Texto descriptivo
   
2. Divider (margin: 16px 0)

3. CTA Principal: "Solicitar Licencia"
   - Botón primary, large, full width
   - Si no autenticado: Modal de login
   - Si autenticado: Abre formulario de solicitud
   
4. CTA Secundario: "Contactar Titular"
   - Botón secondary, large, full width
   - Margin-top: 12px
   
5. Información rápida (Caption)
   - "Respuesta promedio: 24hs"
   - Iconos pequeños con datos
   - Margin-top: 16px
```

**Card de Titular (Sticky, debajo de Card de Acción)**
```
Background: Gris nieve
Border-radius: 16px
Padding: 24px
Margin-top: 24px

Contenido:
1. Avatar (64px)
2. Nombre del titular (H4)
3. Badge de rol (si premium)
4. Biografía corta (Body Small, truncate 3 líneas)
5. Estadísticas:
   - Activos publicados: X
   - Licencias otorgadas: X
6. Link: "Ver perfil completo"
```

**Sección: Activos Relacionados**
```
Full width, al final de la página
Padding: 64px 0
Background: Gris nieve

Título (H2): "Activos Similares"
Grid: 4 cards (mismo estilo que marketplace)
```

---

#### **5.1.4 Login**

**Objetivo:** Autenticación rápida, segura, sin fricción.

**Layout:** Centro, card elevado

**Container**
```
Max-width: 480px
Background: Blanco
Border-radius: 16px
Padding: 48px
Shadow: Medium
Centro de viewport

Logo (centro)
Título (H2): "Iniciar Sesión"
Subtítulo (Body): "Accede a tu cuenta de Da Vinci Inventa"
Margin-bottom: 32px
```

**Formulario**
```
Campos:
1. Email
   - Label: "Correo Electrónico"
   - Input: Large, border gris niebla
   - Placeholder: "tu@email.com"
   
2. Contraseña
   - Label: "Contraseña"
   - Input: Large, type password, toggle visibility
   - Link (derecha): "¿Olvidaste tu contraseña?"
   - Margin-top: 16px

Checkbox (opcional):
- "Recordarme"
- Margin-top: 16px

Botón Submit:
- "Iniciar Sesión"
- Primary, large, full width
- Margin-top: 24px
- Loading state: Spinner interno
```

**Divider**
```
Text: "O continúa con"
Line: Gris niebla
Margin: 24px 0
```

**OAuth Buttons**
```
Botones:
1. "Continuar con Google"
   - Icono + texto
   - Ghost, large, full width
   - Border: 1px gris niebla
   
2. "Continuar con GitHub"
   - Icono + texto
   - Ghost, large, full width
   - Border: 1px gris niebla
   - Margin-top: 12px
```

**Footer del Card**
```
Margin-top: 32px
Centro
Body Small: "¿No tienes cuenta?"
Link: "Regístrate aquí"
```

---

#### **5.1.5 Registro**

**Objetivo:** Onboarding rápido con captura de rol (titular vs emprendedor).

**Layout:** Similar a Login, card centro

**Container**
```
Max-width: 520px
Título (H2): "Crear Cuenta"
Subtítulo (Body): "Únete a la comunidad de Da Vinci Inventa"
```

**Paso 1: Información Básica**
```
Campos:
1. Nombre Completo
   - Input: Large
   
2. Email
   - Input: Large, validación en tiempo real
   
3. Contraseña
   - Input: Large, type password
   - Indicador de fortaleza (barra de progreso)
   - Requisitos mostrados inline:
     * Mínimo 8 caracteres
     * Al menos una mayúscula
     * Al menos un número
   
4. Confirmar Contraseña
   - Input: Large
   - Validación de coincidencia
```

**Paso 2: Selección de Rol**
```
Título (H4): "¿Cómo planeas usar Da Vinci Inventa?"

Cards de selección (Radio cards):
1. Titular de Activos
   - Icono: Upload/Publicar
   - Título: "Quiero publicar activos"
   - Descripción: "Monetiza tus creaciones ofreciendo licencias"
   - Hover: Border azul eléctrico
   - Selected: Background azul eléctrico 5%, border bold
   
2. Emprendedor
   - Icono: Search/Explorar
   - Título: "Busco activos para licenciar"
   - Descripción: "Encuentra los recursos perfectos para tu proyecto"
   - Hover: Border azul eléctrico
   - Selected: Background azul eléctrico 5%, border bold
```

**Términos y Condiciones**
```
Checkbox:
"Acepto los Términos y Condiciones y la Política de Privacidad"
Links: Azul eléctrico
Margin-top: 24px
```

**Botón Submit**
```
"Crear Cuenta"
Primary, large, full width
Margin-top: 24px
Disabled hasta que todos los campos sean válidos
```

**OAuth (Alternativa)**
```
Divider: "O regístrate con"
Botones Google / GitHub (igual que Login)
```

**Footer**
```
"¿Ya tienes cuenta?"
Link: "Inicia sesión"
```

---

### 5.2 PANTALLAS PRIVADAS (DASHBOARD)

#### **5.2.1 Dashboard Principal / Overview**

**Objetivo:** Vista rápida del estado de cuenta, acciones rápidas, métricas personales.

**Layout:** Container Wide con Sidebar persistente

**Header de Dashboard**
```
Padding: 32px 0
Border-bottom: 1px gris niebla

Saludo: "Hola, [Nombre]" (H2)
Subtítulo: "Bienvenido a tu dashboard" (Body, Gris pizarra)
Fecha actual (Caption, derecha)
```

**Sección: Estadísticas Rápidas**
```
Layout: Grid 4 columnas (responsive)
Margin-top: 32px

Stat Card:
- Background: Blanco
- Border: 1px gris niebla
- Border-radius: 12px
- Padding: 24px
- Hover: Shadow subtle

Contenido:
- Icono (32px, color temático)
- Valor (Display Medium): Número principal
- Label (Caption): Descripción
- Cambio/Tendencia (opcional): "+15% este mes"
  Color: Verde si positivo, gris si neutral

Stats para Titulares:
1. Activos Publicados
2. Solicitudes Recibidas
3. Licencias Activas
4. Vistas Totales

Stats para Emprendedores:
1. Solicitudes Enviadas
2. Conversaciones Activas
3. Activos Guardados
4. Búsquedas de Dominios
```

**Sección: Acciones Rápidas**
```
Layout: 2 columnas (responsive)
Margin-top: 48px
Padding: 32px 0
Border-bottom: 1px gris niebla

Título (H3): "Acciones Rápidas"

Action Cards:
Para Titulares:
1. "Publicar Nuevo Activo"
   - Icono: Plus
   - Descripción breve
   - CTA: "Comenzar"
   
2. "Revisar Solicitudes"
   - Icono: Mail
   - Badge: Cantidad pendientes
   - CTA: "Ver"

Para Emprendedores:
1. "Explorar Marketplace"
   - Icono: Search
   - CTA: "Explorar"
   
2. "Buscar Dominio"
   - Icono: Globe
   - CTA: "Buscar"
```

**Sección: Actividad Reciente**
```
Layout: Lista, single column
Margin-top: 48px

Título (H3): "Actividad Reciente"

Timeline vertical:
- Cada ítem con icono, timestamp, descripción
- Hover: Background gris nieve
- Padding: 16px
- Border-bottom: 1px gris niebla

Ejemplos:
- "Nueva solicitud para [Nombre Activo]" - hace 2 horas
- "Tu activo [Nombre] alcanzó 100 vistas" - hace 1 día
- "Enviaste una solicitud a [Titular]" - hace 3 días

Max items: 5
Link al final: "Ver todo el historial"
```

**Sección: Recomendaciones (Emprendedores)**
```
Layout: Grid 3 columnas
Margin-top: 48px

Título (H3): "Recomendados para Ti"

Asset Cards: Mismo diseño que marketplace
Algoritmo: Basado en búsquedas previas, categorías de interés
```

---

#### **5.2.2 Mis Activos (Titulares)**

**Objetivo:** Gestión completa de activos publicados, drafts, estadísticas por activo.

**Header**
```
Layout: Flex, space-between
Padding: 32px 0

Izquierda:
- Título (H1): "Mis Activos"
- Subtítulo (Body): "Gestiona tus publicaciones"

Derecha:
- CTA: "Publicar Nuevo Activo"
  Botón primary, large, con icono plus
```

**Tabs de Navegación**
```
Layout: Horizontal tabs
Margin-top: 24px
Border-bottom: 2px gris niebla

Tabs:
1. Publicados (badge con count)
2. Borradores (badge con count)
3. Archivados

Active tab:
- Border-bottom: 3px azul eléctrico
- Color: Azul eléctrico
- Weight: Semibold
```

**Controles de Vista**
```
Layout: Flex, space-between
Margin: 24px 0

Izquierda:
- Búsqueda: Input con icono
- Placeholder: "Buscar en mis activos..."

Derecha:
- Dropdown: Ordenar por (Más reciente, Más vistas, Más solicitudes)
- Toggle: Vista Grid / Lista
```

**Grid de Activos (Vista de Cards)**
```
Layout: Grid 3 columnas
Gap: 24px

Asset Card (versión gestión):
- Background: Blanco
- Border: 1px gris niebla
- Border-radius: 16px
- Padding: 20px

Contenido:
1. Header interno:
   - Badge de estado (Publicado/Draft/Archivado)
   - Menu dropdown (3 dots):
     * Editar
     * Ver estadísticas
     * Archivar/Publicar
     * Eliminar (destructivo)
   
2. Título (H4)
3. Descripción (truncate 2 líneas)
4. Metadata:
   - Vistas: [número] + icono eye
   - Solicitudes: [número] + icono mail
   - Publicado: [fecha]
   
5. Quick actions (bottom):
   - Botón: "Ver Detalle"
   - Botón: "Editar"
```

**Vista de Lista (Alternativa)**
```
Layout: Tabla estilizada
Columns:
- Nombre del Activo (con thumbnail mini)
- Categoría
- Estado
- Vistas
- Solicitudes
- Fecha publicación
- Acciones (iconos)

Row hover: Background gris nieve
```

**Estado Vacío**
```
Si no hay activos:
- Ilustración centrada
- Título (H3): "Aún no has publicado activos"
- Descripción (Body): "Comienza a monetizar tus creaciones"
- CTA: "Publicar mi Primer Activo"
```

---

#### **5.2.3 Publicar/Editar Activo (Formulario Multi-paso)**

**Objetivo:** Captura completa y estructurada de información del activo.

**Layout:** Container Narrow (640px), centrado, multi-step form

**Progress Indicator (Top)**
```
Layout: Horizontal stepper
Margin-bottom: 32px

Steps:
1. Información Básica
2. Detalles de Licencia
3. Recursos (opcional)
4. Vista Previa

Visual:
- Números en círculos
- Línea conectora
- Step actual: Azul eléctrico
- Step completado: Verde + checkmark
- Step pendiente: Gris
```

---

**Paso 1: Información Básica**

```
Título del paso (H3): "Información Básica"
Descripción (Body Small): "Describe tu activo de forma clara"

Campos:
1. Título del Activo*
   - Input: Large
   - Placeholder: "Ej: Sistema de diseño completo para SaaS"
   - Max length: 80 caracteres (contador visible)
   - Helper text: "Sé específico y descriptivo"
   
2. Categoría*
   - Dropdown / Select
   - Options: Software, Diseño, Marca, Modelo de Negocio, etc.
   - Icono por categoría
   
3. Tipo de Activo*
   - Dropdown / Select
   - Options dependen de categoría seleccionada
   - Ejemplo: App móvil, Logo, Patente, etc.
   
4. Descripción Completa*
   - Textarea: Large, min-height 200px
   - Rich text básico (bold, italic, lists)
   - Max length: 2000 caracteres
   - Helper: "Incluye qué hace, qué problema resuelve, qué incluye"
   
5. Tags / Palabras Clave
   - Input con autocompletado
   - Multi-select, chips visuales
   - Max: 10 tags
   - Placeholder: "React, UI/UX, B2B, etc."

Botones:
- "Siguiente" (Primary, derecha)
- "Guardar borrador" (Ghost, izquierda)
```

---

**Paso 2: Detalles de Licencia**

```
Título del paso (H3): "Condiciones de Licencia"
Descripción (Body Small): "Define cómo se puede usar tu activo"

Campos:
1. Tipo de Licencia*
   - Radio cards (visual):
     * Exclusiva: "Un solo licenciatario a la vez"
     * No Exclusiva: "Múltiples licenciatarios simultáneos"
     * Temporal: "Licencia por período específico"
   
2. Duración (si Temporal seleccionado)
   - Input numérico + Dropdown (meses/años)
   - Placeholder: "12 meses"
   
3. Territorio*
   - Dropdown multi-select
   - Options: Global, Regional (Latam, USA, Europa), Por país
   - Defecto: Global
   
4. Uso Permitido*
   - Checkboxes:
     * Uso comercial
     * Reventa
     * Modificación
     * Distribución
   - Descripción corta por cada opción
   
5. Precio o Rango*
   - Radio: 
     * Precio fijo: Input numérico + Currency
     * Rango: Input desde - hasta
     * A consultar: Sin input
   - Helper: "Puedes negociar después"
   
6. Condiciones Adicionales (opcional)
   - Textarea: 500 caracteres
   - Placeholder: "Ej: Se requiere crédito al autor"

Botones:
- "Anterior" (Ghost, izquierda)
- "Siguiente" (Primary, derecha)
- "Guardar borrador" (Ghost, centro)
```

---

**Paso 3: Recursos (Opcional)**

```
Título del paso (H3): "Recursos y Archivos"
Descripción (Body Small): "Adjunta documentación o muestras"

Sección: Upload de archivos
- Drag & drop area
- Background: Gris nieve, border dashed
- Icono: Upload cloud
- Texto: "Arrastra archivos o haz clic para seleccionar"
- Formatos aceptados: PDF, ZIP, PNG, JPG
- Max size: 50MB por archivo
- Max files: 5

Lista de archivos adjuntos:
- Cada archivo con:
  * Icono de tipo
  * Nombre
  * Tamaño
  * Botón eliminar
- Layout: Lista vertical

Nota informativa:
- "Los archivos estarán disponibles solo tras acuerdo de licencia"
- Icono info

Enlaces externos (opcional):
- Input: URL
- Placeholder: "Link a repositorio, demo, portfolio, etc."
- Botón "Agregar otro link" (max 3)

Botones:
- "Anterior" (Ghost, izquierda)
- "Siguiente" (Primary, derecha)
```

---

**Paso 4: Vista Previa**

```
Título del paso (H3): "Vista Previa"
Descripción (Body Small): "Así verán tu activo los emprendedores"

Preview Card (simulación de vista pública):
- Renderiza exactamente como se verá en el marketplace
- Incluye todos los campos completados
- Badge: "VISTA PREVIA" (esquina superior)

Checklist de completitud:
- "Información básica completa" ✓
- "Condiciones de licencia definidas" ✓
- "Al menos 1 tag agregado" ✓
- (Visual: checkmarks verdes)

Acciones:
- Botón: "Editar información básica" (link a paso 1)
- Botón: "Editar licencia" (link a paso 2)

Checkbox final:
- "Confirmo que soy titular legítimo de este activo"
- Required, texto legal breve

Botones:
- "Anterior" (Ghost, izquierda)
- "Publicar Activo" (Primary Success, derecha, large)
- "Guardar como borrador" (Ghost, centro)
```

---

**Confirmación Post-Publicación (Modal)**
```
Modal centrado
Icono: Checkmark verde grande
Título (H3): "¡Activo Publicado!"
Descripción: "Tu activo ya es visible en el marketplace"

Acciones:
- "Ver mi activo" (Primary)
- "Publicar otro" (Secondary)
- "Volver al dashboard" (Ghost)
```

---

#### **5.2.4 Solicitudes / Mensajería**

**Objetivo:** Centralizar todas las comunicaciones entre titulares y emprendedores.

**Layout:** 2 columnas (30/70) - estilo email client

**Columna Izquierda: Lista de Conversaciones**
```
Width: 360px
Height: Full viewport (menos header)
Border-right: 1px gris niebla

Header:
- Título (H4): "Mensajes"
- Dropdown filtro: Todas / Pendientes / Activas / Cerradas

Lista de threads:
- Cada thread:
  * Avatar del otro usuario
  * Nombre
  * Subject: "Solicitud para [Nombre Activo]"
  * Preview del último mensaje (truncate)
  * Timestamp
  * Badge de estado: Pendiente/Activa/Cerrada
  * Badge unread count (si hay no leídos)
  
- Active thread:
  * Background: Gris nieve
  * Border-left: 3px azul eléctrico
  
- Hover: Background gris nieve sutil

- Padding: 16px por item
- Divider entre items
```

**Columna Derecha: Vista de Conversación**
```
Padding: 32px

Header de conversación:
- Avatar + Nombre del otro usuario
- Subject: "Solicitud de licencia para [Activo]"
- Link al activo (inline, azul eléctrico)
- Estado de la solicitud (Badge)
- Dropdown actions (3 dots):
  * Marcar como leído/no leído
  * Archivar
  * Reportar (si abuso)

Área de mensajes:
- Layout: Chat vertical
- Scroll automático al último mensaje
- Padding: 24px

Mensaje:
- Avatar (32px)
- Nombre del emisor + timestamp
- Contenido del mensaje:
  * Background: 
    - Propio: Azul eléctrico 8%
    - Otro: Gris nieve
  * Padding: 12px 16px
  * Border-radius: 16px (más redondeado del lado correcto)
  * Max-width: 70%
  * Line-height: 1.5

Mensaje inicial de solicitud (destacado):
- Background: Azul medianoche 5%
- Border-left: 4px azul eléctrico
- Contenido:
  * "Solicitud de licencia enviada"
  * Detalles de uso propuesto
  * Duración solicitada
  * Presupuesto (si indicado)

Composer (input de mensaje):
- Fixed al bottom
- Textarea: Auto-expand
- Placeholder: "Escribe un mensaje..."
- Botón "Enviar" (Primary, derecha)
- Icono adjuntar archivo (opcional MVP)
- Max characters: 1000

Actions rápidas (para titulares):
- Botones sobre el composer:
  * "Aceptar solicitud" (Success)
  * "Rechazar" (Ghost)
  * "Solicitar más información" (Secondary)
```

**Estado Vacío (sin conversaciones)**
```
Ilustración centrada
Título (H3): "No tienes mensajes"
Descripción: "Las conversaciones aparecerán aquí"
```

---

#### **5.2.5 Configuración / Perfil**

**Objetivo:** Gestión de cuenta, preferencias, perfil público.

**Layout:** Container Standard, Tabs laterales

**Sidebar de Configuración (izquierda)**
```
Width: 240px
Sticky

Tabs:
- Perfil Público
- Cuenta
- Notificaciones
- Seguridad
- (Si titular) Plan y Facturación
- (Admin) Configuración Global

Visual:
- Active tab: Background gris nieve, border-left azul
- Padding: 12px 16px
- Icon + Text
```

**Sección: Perfil Público**
```
Título (H2): "Perfil Público"
Descripción: "Esta información será visible para otros usuarios"

Campos:
1. Avatar
   - Circular, 96px
   - Botón "Cambiar foto"
   - Upload modal con crop
   
2. Nombre de Usuario*
   - Input, validación de unicidad en tiempo real
   - Helper: "Este será tu identificador público"
   
3. Nombre Completo / Empresa*
   - Input
   
4. Biografía
   - Textarea, 300 caracteres
   - Placeholder: "Cuéntanos sobre ti y tus proyectos"
   
5. Website / Portfolio
   - Input URL
   - Validación de formato
   
6. Links sociales (opcional)
   - Inputs para: LinkedIn, Twitter, GitHub
   - Iconos inline
   
7. Ubicación (opcional)
   - Input con autocompletado (ciudades)

Botón: "Guardar Cambios" (Primary)
Toast de confirmación tras guardar
```

**Sección: Cuenta**
```
Título (H2): "Configuración de Cuenta"

Subcampos:
1. Email actual
   - Display only
   - Botón "Cambiar email" → Modal con verificación
   
2. Idioma
   - Dropdown: Español, Inglés
   
3. Zona Horaria
   - Dropdown con autodetección

Sección: Eliminar Cuenta
- Botón destructivo
- Requiere confirmación con password
- Warning claro
```

**Sección: Notificaciones**
```
Título (H2): "Preferencias de Notificaciones"

Toggle switches:
1. Notificaciones Email:
   - Nueva solicitud de licencia
   - Nuevo mensaje en conversación
   - Actualizaciones de activos
   - Newsletter mensual
   
2. Notificaciones Push (si PWA):
   - Mismos items

3. Resumen semanal:
   - Toggle: Recibir resumen de actividad
   - Dropdown: Día de la semana

Layout: Lista vertical, padding generoso
Cada toggle con descripción breve
```

**Sección: Seguridad**
```
Título (H2): "Seguridad"

Opciones:
1. Cambiar Contraseña
   - Botón → Modal:
     * Contraseña actual
     * Nueva contraseña
     * Confirmar nueva
     * Validación de fortaleza
   
2. Autenticación de dos factores (Post-MVP)
   - Toggle
   - Setup wizard si activa
   
3. Sesiones activas
   - Lista de dispositivos/ubicaciones
   - Botón "Cerrar sesión en otros dispositivos"
   
4. Exportar datos
   - Botón: "Descargar mis datos"
   - Genera JSON con toda la información
```

**Sección: Plan y Facturación (Titulares)**
```
Título (H2): "Plan y Facturación"

Card de plan actual:
- Badge: "Plan Gratuito" / "Plan Premium"
- Features incluidas (list con checkmarks)
- Estadísticas de uso:
  * Activos publicados: X / [límite]
  * Solicitudes recibidas: X

Botón: "Actualizar a Premium" (o "Gestionar Plan")

Próximos pagos (si premium):
- Tabla de transacciones
- Descargar facturas

Método de pago (Post-MVP):
- Card on file
- Botón "Actualizar método de pago"
```

---

#### **5.2.6 Dominios (Búsqueda e Integración)**

**Objetivo:** Facilitar búsqueda de dominios disponibles para proyectos, integración con proveedor externo.

**Layout:** Container Standard

**Header**
```
Título (H1): "Buscar Dominios"
Descripción (Body): "Encuentra el dominio perfecto para tu proyecto"
```

**Search Section**
```
Layout: Hero style, padding generoso

Input de búsqueda:
- Extra large (height: 64px)
- Placeholder: "Escribe el nombre de tu proyecto o dominio"
- Icono lupa (left)
- Botón "Buscar" integrado (right, primary)
- Max-width: 600px, centrado
- Focus: Border glow azul eléctrico

Filtros rápidos (debajo del input):
- Chips seleccionables:
  * .com
  * .io
  * .app
  * .tech
  * Todos
- Margin-top: 16px
```

**Resultados de Búsqueda**
```
Layout: Lista vertical
Margin-top: 48px

Loading state:
- Skeleton cards
- Animación sutil

Domain Result Card:
- Layout: Flex, space-between, align-center
- Background: Blanco
- Border: 1px gris niebla
- Border-radius: 12px
- Padding: 20px 24px
- Margin-bottom: 16px

Contenido:
Izquierda:
- Nombre del dominio (H4, monospace font)
- Badge de estado:
  * Verde: "Disponible"
  * Rojo: "No disponible"
  * Amarillo: "Premium"
- Precio (si disponible): Body, gris pizarra

Derecha:
- Si disponible:
  * Botón "Registrar" (Primary)
  * Acción: Redirección a proveedor externo con affiliate link
- Si no disponible:
  * Botón "Sugerir alternativas" (Ghost)
  * Acción: Muestra variaciones disponibles

Hover: Shadow elevate
```

**Sugerencias Alternativas**
```
Si dominio no disponible, mostrar:

Título (H3): "Dominios similares disponibles"
Layout: Grid 3 columnas

Suggestion Card:
- Nombre del dominio
- Extensión destacada
- Precio
- Botón "Registrar"

Algoritmo:
- Variaciones con diferentes TLDs
- Prefijos/sufijos comunes (get, my, try)
- Sinónimos o keywords relacionados
```

**Historial de Búsquedas**
```
Sección inferior
Título (H3): "Búsquedas Recientes"
Layout: Lista compacta

Items:
- Dominio buscado
- Fecha/hora
- Estado (disponible/no disponible)
- Botón: "Buscar nuevamente"

Max items: 10
Ordenado por fecha desc
```

**Información y Ayuda**
```
Sidebar derecha (opcional):

Card informativa:
- Título: "¿Por qué necesitas un dominio?"
- Lista de beneficios
- Link: "Guía completa"

Card de comisión (transparencia):
- "Da Vinci Inventa recibe una comisión por 
   referencias al proveedor de dominios"
- Texto pequeño, transparente
```

---

### 5.3 PANTALLAS ADMINISTRATIVAS

#### **5.3.1 Dashboard Admin**

**Objetivo:** Vista ejecutiva de métricas clave, moderación, gestión de usuarios.

**Layout:** Full width, high density information

**Header**
```
Background: Gradiente azul medianoche
Padding: 32px
Color: Blanco

Título (H1): "Panel de Administración"
Stats rápidas inline:
- Usuarios totales
- Activos publicados
- Solicitudes activas
- Uptime

Botón: "Generar Reporte" (derecha)
```

**Grid de Métricas Clave**
```
Layout: Grid 4 columnas
Margin-top: 32px

Metric Cards (versión admin):
- Background: Blanco
- Border: 1px gris niebla
- Padding: 24px
- Icon + número grande + label + gráfico sparkline

Métricas:
1. Nuevos Usuarios (últimos 7 días)
   - Gráfico lineal pequeño
   
2. Activos Publicados (últimos 30 días)
   - Gráfico de barras pequeño
   
3. Tasa de Conversión (solicitudes → acuerdos)
   - Porcentaje + indicador de cambio
   
4. Ingresos Estimados (si aplica post-MVP)
   - Número + currency
```

**Sección: Moderación Pendiente**
```
Layout: Lista con prioridad alta
Padding: 32px
Background: Ámbar 5% (atención)
Border-left: 4px ámbar

Título (H3): "Requiere Moderación"
Badge: Cantidad pendiente

Lista de items:
- Activo reportado por [razón]
- Usuario nuevo requiere verificación
- Contenido flagged automáticamente

Cada item:
- Descripción breve
- Timestamp
- Quick actions: "Revisar" / "Aprobar" / "Rechazar"
```

**Sección: Actividad en Vivo**
```
Layout: Timeline vertical
Max-height: 400px, scrollable
Auto-refresh cada 30 segundos

Título (H3): "Actividad Reciente"

Stream de eventos:
- Nuevo usuario registrado
- Activo publicado
- Solicitud enviada
- Licencia acordada

Cada evento:
- Timestamp
- Tipo de evento (icono + color)
- Descripción
- Link a detalles
```

**Sección: Top Activos / Top Usuarios**
```
Layout: 2 columnas

Columna 1: Top Activos (por vistas/solicitudes)
- Tabla compacta
- Columnas: Nombre, Vistas, Solicitudes
- Top 5

Columna 2: Top Titulares (por engagement)
- Lista con avatar + nombre + stats
- Top 5
```

---

#### **5.3.2 Moderación de Activos**

**Objetivo:** Revisar activos reportados o flagged, aprobar/rechazar/solicitar cambios.

**Layout:** Container Wide, table view

**Filtros y Búsqueda**
```
Layout: Horizontal, sticky
Padding: 24px
Background: Blanco
Border-bottom: 1px gris niebla

Controles:
- Búsqueda por título/usuario
- Dropdown: Estado (Pendiente / Aprobado / Rechazado / Flagged)
- Dropdown: Categoría
- Dropdown: Fecha
```

**Tabla de Activos**
```
Columns:
1. Preview (thumbnail mini)
2. Título del activo
3. Titular (usuario)
4. Estado
5. Reportes (count)
6. Fecha publicación
7. Acciones

Row hover: Background gris nieve

Acciones (dropdown):
- Ver detalle completo
- Aprobar
- Solicitar cambios → Modal con textarea
- Rechazar → Modal con razón
- Flaggear → Modal con razón

Paginación: Bottom
```

**Modal de Revisión Detallada**
```
Full screen overlay
Layout: 2 columnas

Izquierda (60%):
- Renderizado completo del activo (simulación pública)
- Scroll independiente

Derecha (40%):
- Checklist de revisión:
  * Contenido apropiado
  * Información completa
  * Sin contenido ofensivo
  * Licencia clara
  * Sin spam
  
- Notas del moderador (textarea)
  
- Historial de moderación (si hay)

Actions:
- "Aprobar" (Success)
- "Solicitar Cambios" (Warning)
- "Rechazar" (Destructive)
- "Cancelar" (Ghost)
```

---

#### **5.3.3 Gestión de Usuarios**

**Objetivo:** Buscar usuarios, modificar roles, suspender cuentas, ver estadísticas.

**Layout:** Container Wide, table view

**Búsqueda Avanzada**
```
Input principal: Buscar por nombre, email, ID
Filtros:
- Rol (Admin / Titular / Emprendedor)
- Estado (Activo / Suspendido)
- Fecha de registro
- Actividad (últimos X días)
```

**Tabla de Usuarios**
```
Columns:
1. Avatar + Nombre
2. Email
3. Rol
4. Fecha registro
5. Último acceso
6. Activos (si titular)
7. Solicitudes (ambos)
8. Estado
9. Acciones

Acciones:
- Ver perfil
- Editar rol
- Suspender/Activar
- Ver actividad
- Enviar mensaje
```

**Modal: Editar Usuario**
```
Campos:
- Email (display only)
- Rol (dropdown)
- Estado (toggle)
- Notas internas (textarea)

Sección: Estadísticas de Usuario
- Activos publicados
- Solicitudes enviadas/recibidas
- Mensajes intercambiados
- Fecha de último login

Acciones peligrosas (separadas):
- Suspender cuenta
- Eliminar cuenta (requiere confirmación doble)
```

---

#### **5.3.4 Métricas y Reportes**

**Objetivo:** Dashboard analítico con gráficos, exportación de datos, insights del negocio.

**Layout:** Full width, grid flexible

**Selector de Rango de Fechas**
```
Top right, sticky
Presets: Últimos 7 días / 30 días / 3 meses / Año / Custom
Date picker para rango custom
```

**Gráfico Principal: Usuarios y Activos en el Tiempo**
```
Chart tipo: Line chart (dual axis)
Height: 400px
Línea 1: Usuarios registrados (acumulado)
Línea 2: Activos publicados (acumulado)
Interactivo: Hover para tooltips
Exportable: PNG / CSV
```

**Grid de KPIs**
```
Layout: Grid 3 columnas

Cards:
1. Tasa de Conversión
   - % de usuarios que publican activos
   - % de solicitudes que generan acuerdos
   
2. Engagement
   - Usuarios activos mensuales
   - Promedio de sesiones por usuario
   
3. Crecimiento
   - % crecimiento de usuarios
   - % crecimiento de activos
```

**Gráfico: Distribución por Categorías**
```
Chart tipo: Donut chart
Muestra: % de activos por categoría
Interactivo: Click para filtrar
```

**Gráfico: Embudo de Conversión**
```
Chart tipo: Funnel chart
Pasos:
1. Visitas a marketplace
2. Visitas a detalle de activo
3. Solicitudes enviadas
4. Conversaciones iniciadas
5. Acuerdos cerrados (reportados)

Muestra: Cantidad y % en cada paso
```

**Tabla: Top Performers**
```
Tabs:
- Top Activos (por solicitudes)
- Top Titulares (por acuerdos)
- Top Categorías (por volumen)

Exportable: CSV
```

**Botón: Exportar Reporte Completo**
```
Genera PDF con:
- Resumen ejecutivo
- Todos los gráficos
- Tablas de datos
- Rango de fechas
- Logo y branding
```

---

## 6. Sistema de Componentes

### 6.1 Anatomía de Componentes Clave

#### **Botones**

**Variantes:**
```
Primary:
- Background: Azul Eléctrico (#2563EB)
- Color: Blanco
- Hover: Darken 10%
- Active: Darken 15%
- Disabled: 50% opacity
- Shadow: Subtle on hover
- Border-radius: 8px

Secondary:
- Background: Transparente
- Border: 1px Azul Eléctrico
- Color: Azul Eléctrico
- Hover: Background 8% Azul Eléctrico
- Border-radius: 8px

Success:
- Background: Esmeralda (#059669)
- Color: Blanco
- Uso: Confirmaciones, publicaciones exitosas

Destructive:
- Background: Coral (#DC2626)
- Color: Blanco
- Uso: Eliminar, rechazar, acciones irreversibles

Ghost:
- Background: Transparente
- Color: Gris Carbón
- Hover: Background Gris Nieve
- Uso: Acciones secundarias, cancelar
```

**Tamaños:**
```
Small: 
- Height: 32px
- Padding: 8px 16px
- Font: 14px

Medium (default):
- Height: 40px
- Padding: 10px 20px
- Font: 16px

Large:
- Height: 48px
- Padding: 12px 24px
- Font: 16px
```

**Estados:**
```
Loading:
- Spinner interno (reemplaza texto temporalmente)
- Disabled durante loading

Disabled:
- Opacity: 50%
- Cursor: not-allowed
- No hover effects
```

---

#### **Inputs y Forms**

**Text Input:**
```
Default:
- Height: 40px
- Padding: 10px 16px
- Border: 1px Gris Niebla
- Border-radius: 8px
- Font: 16px
- Placeholder: Gris Pizarra

Focus:
- Border: 2px Azul Eléctrico
- Outline: None
- Shadow: 0 0 0 3px Azul Eléctrico 10%

Error:
- Border: 2px Coral
- Shadow: 0 0 0 3px Coral 10%

Success:
- Border: 2px Esmeralda
- Icon: Checkmark verde (right)

Disabled:
- Background: Gris Nieve
- Cursor: not-allowed
```

**Label:**
```
Font: 14px, Weight: 500
Color: Gris Carbón
Margin-bottom: 6px
Required indicator: Asterisco rojo
```

**Helper Text:**
```
Font: 12px
Color: Gris Pizarra
Margin-top: 4px
Error text: Coral color
```

**Select / Dropdown:**
```
Mismo estilo que Input
Icon: Chevron down (right)
Menu:
- Background: Blanco
- Shadow: Medium
- Border: 1px Gris Niebla
- Border-radius: 8px
- Max-height: 300px, scrollable
- Option hover: Background Gris Nieve
- Option selected: Background Azul 8%, Bold
```

---

#### **Cards**

**Elevated Card:**
```
Background: Blanco
Border: 1px Gris Niebla
Border-radius: 16px
Padding: 24px
Shadow: 0 1px 3px rgba(0,0,0,0.05)

Hover (si clickeable):
- Shadow: 0 4px 12px rgba(0,0,0,0.1)
- Transform: translateY(-2px)
- Transition: 0.2s ease

Componentes internos:
- Card.Header (título + actions)
- Card.Body (contenido principal)
- Card.Footer (acciones, metadata)
```

**Flat Card:**
```
Background: Gris Nieve
No border
Border-radius: 12px
Padding: 20px
Sin shadow
Uso: Información secundaria, estadísticas
```

---

#### **Badges**

```
Base:
- Display: inline-flex
- Padding: 4px 12px
- Border-radius: full (999px)
- Font: 12px, Weight: 500
- Align: center

Variantes por color:
Primary (Azul):
- Background: Azul Eléctrico 10%
- Color: Azul Eléctrico

Success (Verde):
- Background: Esmeralda 10%
- Color: Esmeralda

Warning (Ámbar):
- Background: Ámbar 10%
- Color: Ámbar

Error (Coral):
- Background: Coral 10%
- Color: Coral

Neutral (Gris):
- Background: Gris Niebla
- Color: Gris Carbón

Uso:
- Estados de activos
- Categorías
- Roles de usuario
- Contadores
```

---

#### **Modales**

```
Overlay:
- Background: Negro 60% opacity
- Backdrop-blur: 4px (glassmorphism)
- Z-index: 1000

Modal Container:
- Background: Blanco
- Border-radius: 16px
- Max-width: 600px (default), responsive
- Max-height: 90vh, scrollable
- Shadow: 0 20px 60px rgba(0,0,0,0.3)
- Padding: 32px
- Centro de viewport

Header:
- Título (H3)
- Botón close (top-right, X icon)
- Border-bottom: 1px gris niebla (opcional)

Body:
- Padding: 24px 0
- Contenido flexible

Footer:
- Margin-top: 24px
- Layout: Flex, right aligned
- Botones separados por 12px
- Usual: Cancel (Ghost) + Confirm (Primary)

Animación:
- Entrada: Fade + scale from 95% to 100%
- Duración: 0.2s
- Easing: ease-out

Accesibilidad:
- Focus trap dentro del modal
- Escape key para cerrar
- Click fuera para cerrar (opcional, según contexto)
```

---

#### **Toast Notifications**

```
Container:
- Position: Fixed, top-right
- Z-index: 9999
- Width: 360px
- Stack vertical, gap: 12px

Toast:
- Background: Blanco
- Border: 1px Gris Niebla
- Border-left: 4px [color según tipo]
- Border-radius: 8px
- Padding: 16px
- Shadow: 0 4px 12px rgba(0,0,0,0.15)

Contenido:
- Icon (left): 24px, color según tipo
- Título (Body, Weight: 600)
- Descripción (Body Small, opcional)
- Close button (top-right, small)

Tipos:
- Success: Border verde, icon checkmark
- Error: Border rojo, icon X
- Warning: Border ámbar, icon exclamation
- Info: Border azul, icon info

Comportamiento:
- Auto-dismiss: 5 segundos (configurable)
- Hover: Pausa auto-dismiss
- Animación entrada: Slide from right + fade
- Animación salida: Fade + slide to right
- Max visible: 3 toasts, stack y auto-dismiss más antiguo
```

---

#### **Loading States**

**Spinner:**
```
Circular loader:
- Border: 3px
- Color: Azul Eléctrico
- Animación: Rotate 360deg, 1s linear infinite
- Tamaños: 16px (inline), 24px (button), 48px (page)
```

**Skeleton Screens:**
```
Uso: Carga de listas, cards, contenido
Base:
- Background: Linear gradient (Gris Nieve → Gris Niebla → Gris Nieve)
- Animación: Shimmer effect (translateX)
- Border-radius: Matches content shape
- Duración: 1.5s linear infinite

Variantes:
- Skeleton Text: Rectangle, 100% width, height según font
- Skeleton Avatar: Circle, 40-64px
- Skeleton Card: Full card shape con bloques internos
```

**Progress Bars:**
```
Container:
- Height: 8px
- Background: Gris Niebla
- Border-radius: full

Fill:
- Background: Azul Eléctrico
- Height: 100%
- Border-radius: full
- Transition: width 0.3s ease

Uso: Upload de archivos, forms multi-paso
```

---

## 7. Microinteracciones y Estados

### 7.1 Animaciones Sutiles

**Filosofía:** Las animaciones deben ser **rápidas, sutiles y funcionales**, nunca decorativas sin propósito.

**Hover Effects:**
```
Links:
- Underline slide-in (left to right)
- Duración: 0.2s

Buttons:
- Transform: scale(1.02)
- Shadow elevate
- Duración: 0.15s

Cards:
- Transform: translateY(-4px)
- Shadow elevate
- Duración: 0.2s
```

**Click/Press Effects:**
```
Ripple effect (Material Design style):
- Background: Círculo expandiéndose desde click point
- Color: Blanco 20% opacity
- Duración: 0.6s
- Easing: ease-out
```

**Page Transitions:**
```
Fade between pages:
- Opacity: 0 → 1
- Transform: translateY(10px) → translateY(0)
- Duración: 0.3s
- Easing: ease-out

No transitions complejas (slide, rotate) para mantener performance
```

---

### 7.2 Estados de Feedback

**Success State:**
```
Visual:
- Checkmark verde animado (scale + fade in)
- Background: Verde 5%
- Border: Verde

Ejemplos:
- Form submission exitoso
- Activo publicado
- Cambios guardados
```

**Error State:**
```
Visual:
- X rojo o exclamation icon
- Background: Coral 5%
- Border: Coral
- Shake animation sutil (si crítico)

Ejemplos:
- Validación fallida
- Error de servidor
- Campos incompletos
```

**Loading State:**
```
Visual:
- Spinner o skeleton según contexto
- Disable interactividad
- Opcional: Progress indicator si conocido

Ejemplos:
- Carga de página
- Submit de formulario
- Búsqueda en proceso
```

**Empty State:**
```
Visual:
- Ilustración o icono centrado (128px)
- Título descriptivo (H3)
- Descripción breve
- CTA para acción inicial

Ejemplos:
- Sin activos publicados
- Sin mensajes
- Búsqueda sin resultados
```

---

### 7.3 Interacciones Avanzadas

**Drag and Drop:**
```
Estados:
1. Default: Border dashed, background gris nieve
2. Hover/Dragging: Border azul eléctrico, background azul 5%
3. Dropping: Animación de "aceptación"
4. Error (formato incorrecto): Border coral, shake

Feedback visual:
- Cursor: grab → grabbing
- Elemento siendo arrastrado: Opacity 50%, shadow
```

**Inline Editing:**
```
Flow:
1. Mostrar icono de edit on hover
2. Click: Input reemplaza texto
3. Focus automático en input
4. Enter para guardar, Escape para cancelar
5. Loading spinner durante save
6. Success: Fade in del nuevo valor

Uso:
- Edición de títulos en dashboard
- Modificación rápida de campos
```

**Infinite Scroll:**
```
Implementación:
1. Trigger: 200px antes del final
2. Mostrar skeleton de 3 items al final
3. Append de nuevos items con fade-in
4. Botón "Cargar más" como fallback (accesibilidad)

Nota: No usar en todas las listas, solo apropiado para feeds largos
```

---

## 8. Responsive Design

### 8.1 Breakpoints

```
Mobile: 0 - 639px (sm)
Tablet: 640px - 1023px (md)
Desktop: 1024px - 1279px (lg)
Large Desktop: 1280px+ (xl)
```

### 8.2 Adaptaciones por Dispositivo

**Mobile (< 640px):**
```
Navegación:
- Sidebar → Bottom navigation tabs (5 items max)
- Header → Hamburger menu
- Logo más pequeño

Layout:
- Single column para todo
- Cards full width
- Padding reducido: 16px
- Font sizes: -2px ajuste

Formularios:
- Inputs más grandes (48px height) para touch
- Botones full width
- Labels encima siempre

Tablas:
- Transformar a cards apilables
- Scroll horizontal solo si inevitable

Modales:
- Full screen en móvil
- Slide up animation
```

**Tablet (640px - 1023px):**
```
Layout:
- 2 columnas para grids (marketplace)
- Sidebar colapsable opcional
- Padding: 24px

Formularios:
- 2 columnas para campos cortos
- Inputs estándar (40px)

Dashboard:
- Stats grid: 2 columnas en lugar de 4
- Gráficos apilados verticalmente
```

**Desktop (1024px+):**
```
Layout completo como descrito en secciones anteriores
```

### 8.3 Imágenes Responsivas

```
Srcset para múltiples resoluciones:
- 1x para estándar
- 2x para retina

Loading: lazy (excepto above-the-fold)

Aspect ratios:
- Asset thumbnails: 16:9
- Avatares: 1:1
- Hero images: 21:9

Fallback:
- Background color mientras carga (dominant color)
- Placeholder borroso (blur-up technique)
```

---

## 9. Accesibilidad

### 9.1 Estándares Obligatorios

**WCAG 2.1 Level AA Compliance**

**Contraste de Color:**
```
Texto normal: Mínimo 4.5:1
Texto grande (>18px): Mínimo 3:1
Iconos y gráficos: Mínimo 3:1

Validación:
- Todos los pares color/background testeados
- Herramienta: Color Contrast Analyzer
```

**Navegación por Teclado:**
```
Todo interactuable debe ser accesible vía teclado:
- Tab order lógico
- Focus visible (outline azul eléctrico, 2px)
- Skip to main content link
- Escape para cerrar modales
- Arrow keys en menús/dropdowns
```

**Semántica HTML:**
```
Uso correcto de:
- <header>, <nav>, <main>, <aside>, <footer>
- <h1> a <h6> en jerarquía correcta
- <button> para acciones, <a> para navegación
- <form>, <label>, <input> asociados correctamente
- <table> con <thead>, <tbody>, <th>
```

**ARIA Labels:**
```
Cuando sea necesario:
- aria-label para iconos sin texto
- aria-describedby para helper texts
- aria-live para notificaciones
- aria-expanded para collapsibles
- role="status" para feedback messages
```

---

### 9.2 Inclusión y UX

**Modo de Alto Contraste:**
```
Detección: prefers-contrast: high
Ajustes:
- Borders más gruesos
- Shadows eliminados
- Colores más saturados
```

**Modo Oscuro (Post-MVP):**
```
Detección: prefers-color-scheme: dark
Paleta alternativa:
- Background: #0A0A0A
- Text: #F9FAFB
- Azul más brillante para contraste
- Revisión completa de contrastes
```

**Reducción de Movimiento:**
```
Detección: prefers-reduced-motion: reduce
Ajustes:
- Animaciones deshabilitadas
- Transitions instantáneas (0s)
- Mantener feedback visual sin animación
```

**Tamaños de Fuente:**
```
Respetar configuración del navegador:
- Usar rem en lugar de px
- No fijar tamaños absolutos
- Responsive a zoom hasta 200%
```

---

### 9.3 Testing de Accesibilidad

**Herramientas:**
```
Automatizado:
- axe DevTools
- Lighthouse Accessibility Audit
- WAVE Extension

Manual:
- Navegación solo con teclado
- Screen reader testing (NVDA / VoiceOver)
- Test en diferentes contrastes
- Test con zoom 200%
```

---

## 10. Conclusión

### 10.1 Resumen Ejecutivo

**Da Vinci Inventa** presenta un frontend que equilibra **profesionalismo institucional con accesibilidad humana**, utilizando:

- **Paleta de colores**: Azules profundos con acentos verdes, transmitiendo confianza e innovación sin frialdad
- **Tipografía**: Inter para claridad digital, escala armónica para jerarquía visual
- **Espaciado**: Sistema basado en 4px para consistencia matemática
- **Componentes**: Reutilizables, predecibles, escalables
- **Interacciones**: Rápidas, sutiles, funcionales

### 10.2 Principios de Implementación

**Al desarrollar el frontend:**

1. **Claridad > Creatividad**: Cada decisión de diseño debe servir a la usabilidad
2. **Consistencia > Variedad**: Usar el sistema de design, no inventar para cada caso
3. **Performance > Complejidad**: Priorizar carga rápida sobre efectos elaborados
4. **Accesibilidad = Obligatorio**: No es opcional, es parte del diseño base
5. **Iteración > Perfección**: Lanzar MVP funcional, mejorar con feedback real

### 10.3 Diferenciadores Visuales

**Lo que hace único a este frontend:**

- **No es corporativo frío**: Usa espacios generosos y colores con personalidad
- **No es creativo caótico**: Mantiene estructura clara y navegación predecible
- **No es minimalista estéril**: Incluye detalles humanos (avatares, badges, ilustraciones)
- **No es técnico intimidante**: Lenguaje claro, flujos explicados, estados visibles

### 10.4 Próximos Pasos

**Después del MVP:**

- Modo oscuro completo
- Animaciones micro más elaboradas
- Ilustraciones custom por categoría
- PWA con notificaciones push
- Sistema de favoritos/guardados
- Comparación de activos lado a lado
- Dashboard analytics avanzado para titulares

### 10.5 Mantra de Diseño

> **"Da Vinci Inventa es la plataforma donde la propiedad intelectual se vuelve accesible, clara y humana. El frontend debe sentirse como una herramienta profesional que respeta tu tiempo y tu inteligencia, sin barreras artificiales ni complejidades innecesarias."**

---

## Anexo: Checklist de Implementación

**Antes de lanzar cada pantalla, verificar:**

- [ ] Responsive en 3 breakpoints (mobile, tablet, desktop)
- [ ] Estados de carga, éxito, error implementados
- [ ] Navegación por teclado funcional
- [ ] Contraste de colores validado (WCAG AA)
- [ ] Focus visible en todos los elementos interactivos
- [ ] Formularios con validación y helper texts
- [ ] Mensajes de error humanos, no técnicos
- [ ] Assets (imágenes, iconos) optimizados
- [ ] Performance: Lighthouse score > 90
- [ ] Accesibilidad: Lighthouse score > 90
- [ ] Testing en Chrome, Firefox, Safari
- [ ] Testing con screen reader básico

---

**Documento generado para:** Da Vinci Inventa – Plataforma SaaS de Intermediación de Licencias  
**Versión:** 1.0 – Especificación Frontend Completa  
**Fecha:** Febrero 2026  
**Autor:** Equipo de Producto y Diseño
