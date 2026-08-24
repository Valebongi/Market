# Flujos Principales del Sistema

## 1. Registro de usuario

```
Browser          Gateway          auth-service       users-service
   │                │                  │                   │
   │─POST /register─►                  │                   │
   │                │──────────────────►                   │
   │                │                  │ hash password      │
   │                │                  │ create User        │
   │                │                  │ create UserProfile │
   │                │                  │                   │
   │                │                  │──POST /users/profiles (fire & forget)──►
   │                │                  │                   │ create UserProfile
   │                │                  │                   │ create NotificationSettings
   │                │                  │                   ◄──────────────────────────
   │                │                  │ generate JWT       │
   │                ◄──────────────────│                   │
   │◄───────────────│                  │                   │
   │  {accessToken, user}              │                   │
```

## 2. Login y flujo autenticado

```
Browser          Gateway                    auth-service
   │                │                           │
   │─POST /login────►                           │
   │                │───────────────────────────►
   │                │                           │ verify password
   │                │                           │ generate JWT
   │                ◄───────────────────────────│
   │◄───────────────│  {accessToken, user}       │

   │  [JWT stored in localStorage]

   │─GET /assets (con Authorization: Bearer JWT)─►
   │                │ verify JWT                │
   │                │ inject x-user-id          │
   │                │ inject x-user-email       │
   │                │ inject x-user-role        │
   │                │──────────────►assets-service
   │                │              │
   │◄───────────────◄──────────────│ {data, total, ...}
```

## 3. Recuperación de contraseña

```
Browser          Gateway          auth-service
   │                │                  │
   │─POST /forgot-password─────────────►
   │                │                  │ find user by email
   │                │                  │ generate 32-byte random token
   │                │                  │ save token + expiry (1h) to DB
   │                │                  │ [prod: send email with reset link]
   │                │                  │ [dev: return token in response]
   │◄───────────────◄──────────────────│ {message, devToken?}

   │ [user clicks link /reset-password?token=...]

   │─POST /reset-password (token + newPassword)──►
   │                │                  │ find user by token
   │                │                  │ verify token not expired
   │                │                  │ hash new password
   │                │                  │ save new passwordHash
   │                │                  │ clear resetToken + resetTokenExpiry
   │◄───────────────◄──────────────────│ {message: "Contraseña actualizada"}
```

## 4. Publicación de un activo

```
Browser          Gateway          assets-service     users-service
   │                │                  │                   │
   │─POST /assets───►                  │                   │
   │                │ inject x-user-id─►                   │
   │                │                  │ validate ownerId  │
   │                │                  │ generate slug      │
   │                │                  │ create Asset       │
   │                │                  │ create AssetTags   │
   │                │                  │ create AssetLinks  │
   │◄───────────────◄──────────────────│ {asset}           │

   │─POST /upload-image (multipart)─────►              │
   │                │ pipe stream──────────────────────►│
   │                │                  │ multer saves file │
   │                │                  │ return URL        │
   │◄───────────────◄──────────────────│ {url}            │

   │─PATCH /assets/:id/publish──────────►              │
   │                │                  │ status = published│
   │                │                  │──PATCH /asset-count (fire & forget)──►
   │◄───────────────◄──────────────────│               │  increment assetCount
```

## 5. Solicitud de licencia

```
Browser (requester)  Gateway    messaging-service    users-service (notify)
   │                    │              │                     │
   │─POST /requests─────►             │                     │
   │                    │─────────────►                     │
   │                    │             │ create LicenseRequest│
   │                    │             │ create Notification─►│ (new_request para owner)
   │                    │             │──PATCH /assets/:id/request-count (assets-service)
   │◄───────────────────◄─────────────│ {request}           │

   │─POST /requests/:id/messages──────►                     │
   │                    │             │ save Message         │
   │                    │             │ create Notification─►│ (new_message para otra parte)
   │◄───────────────────◄─────────────│ {message}           │

Browser (owner)
   │─PATCH /requests/:id/status (accepted)───────────────────►
   │                    │             │ update status         │
   │                    │             │ create Notification──►│ (request_accepted para requester)
   │◄───────────────────◄─────────────│ {request}            │
```

## 6. Ciclo de vida de notificaciones

```
NotificationsProvider (frontend, polling 30s)
   │
   │─GET /requests/notifications────────────────► messaging-service
   │                              {data: [{id, type, title, body, link, read}]}
   │◄───────────────────────────────────────────
   │
   │ [usuario hace clic en notificación]
   │
   │─PATCH /requests/notifications/:id/read────► messaging-service
   │◄───────────────────────────────────────────
```

## 7. Ciclo de vida completo del activo

```
draft ──► published ──► archived
  │                         │
  │     (admin puede         │
  └─────► archivar ──────────┘
          directamente

Estados:
- draft:     recién creado, no visible en marketplace público
- published: visible en marketplace, recibe vistas y solicitudes
- archived:  oculto del marketplace, no recibe nuevas solicitudes
```

## 8. Panel de administración — moderación

```
Admin (browser)    Gateway    assets-service    users-service    admin-service
   │                 │              │                 │               │
   │─GET /assets─────►             │                 │               │
   │  (sin filtro status = todos)  │                 │               │
   │◄────────────────◄─────────────│                 │               │
   │
   │─PATCH /assets/:id/archive─────►                │               │
   │◄────────────────◄─────────────│                │               │
   │
   │─PATCH /users/:id/status───────►─────────────────►              │
   │◄────────────────◄─────────────────────────────────             │
   │
   │─POST /admin/metrics/snapshot──►───────────────────────────────►│
   │  (captura contadores actuales)                                  │ upsert MetricSnapshot
   │◄────────────────◄───────────────────────────────────────────────│
```
