# Taller — Bandeja WhatsApp compartida para Milpa

## Contexto del proyecto

Taller es la bandeja de WhatsApp compartida de **Milpa Studio**. Reemplaza el WhatsApp personal con una bandeja profesional: multiusuario, con roles, etiquetas, automatizaciones y chatbot de calificación de leads.

**Uso actual:** Milpa Studio — deployment en `chat.milpa.cloud`
**Repositorio:** `github.com/milpa-cloud/whatsapp-bussiness-module`

### Modelo de deployment por cliente

El código es genérico. Cada cliente recibe su propio deployment con sus propias credenciales:

```
milpa-cloud/whatsapp-bussiness-module  → chat.milpa.cloud       (Milpa, interno)
milpa-cloud/huayapam-taller            → chat.huayapam.com      (Huayapam, futuro fork)
```

Para dar a un cliente su propio sistema:
1. Fork este repo → nuevo repo privado
2. Nuevo proyecto Supabase (datos separados)
3. Nuevo número WhatsApp Business en Meta Developer Portal
4. Nuevo proyecto Vercel con sus propias variables de entorno
5. Correr migraciones SQL en el nuevo Supabase

---

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS v3 |
| Backend | API Routes de Next.js |
| Base de datos | Supabase (PostgreSQL + Auth + Realtime) |
| WhatsApp | Meta Cloud API (directo, sin intermediarios) |
| IA / Chatbot | Anthropic API — modelo `claude-sonnet-4-6` |
| Hosting | **Vercel** |

---

## Variables de entorno

```env
# WhatsApp — Meta Cloud API
WHATSAPP_VERIFY_TOKEN=        # token que defines para verificar el webhook
WHATSAPP_ACCESS_TOKEN=        # token de acceso permanente de Meta
WHATSAPP_PHONE_NUMBER_ID=     # ID del número en Meta Developer Portal

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # solo en servidor, NUNCA en cliente

# Anthropic (opcional — si no está, el chatbot se desactiva automáticamente)
ANTHROPIC_API_KEY=

# App
NEXT_PUBLIC_APP_URL=          # URL pública del deployment en Vercel
```

> No se usa NextAuth. La auth es 100% Supabase Auth (email/password).

---

## Arquitectura del sistema

### Flujo de mensaje entrante

```
Cliente escribe por WhatsApp
  → Meta llama POST /api/webhooks/whatsapp
  → Verificar firma HMAC del request
  → Buscar o crear contacto (phone como clave única)
  → Buscar o crear conversación activa para ese contacto
  → Guardar mensaje en messages con wa_message_id (deduplicación)
  → Actualizar last_message_at + last_message_preview + unread_count
  → Supabase Realtime notifica a la interfaz
  → Si mode = 'bot' y ANTHROPIC_API_KEY existe → handleBotTurn()
  → Si mode = 'bot' y sin API key → pasar directo a mode = 'human'
```

### Flujo de mensaje saliente

```
Usuario escribe en la interfaz
  → POST /api/messages/send
  → Verificar auth
  → Llamar Meta Cloud API con el mensaje
  → Guardar en messages con direction: "outbound"
  → Actualizar last_message_at, mode: "human", unread_count: 0
```

### Flujo del chatbot

```
Llega mensaje de número desconocido (contacto nuevo)
  → Conversación inicia con mode: "bot"
  → handleBotTurn() envía historial a Claude API
  → Claude decide: otra pregunta o veredicto
  → Si calificado: notificar al equipo, cambiar mode: "human"
  → Si no calificado: responder amablemente, archivar
```

---

## Schema de base de datos

Las migraciones están en `supabase/migrations/` — correrlas en orden en el SQL Editor de Supabase.

### contacts
```sql
id         uuid pk
phone      text unique    -- formato México: 5219XXXXXXXXXX (52 + 1 + 10 dígitos)
name       text
type       text           -- lead | cliente | proveedor
created_at timestamptz
```

### conversations
```sql
id                   uuid pk
contact_id           uuid → contacts
project_id           uuid → projects (nullable)
status               text           -- active | archived
mode                 text           -- bot | human
last_message_at      timestamptz
last_message_preview text
unread_count         int default 0
created_at           timestamptz
```

### messages
```sql
id              uuid pk
conversation_id uuid → conversations
direction       text    -- inbound | outbound
content         text
media_url       text (nullable)
wa_message_id   text unique  -- ID de Meta, para deduplicación
created_at      timestamptz
read_at         timestamptz (nullable)
```

### user_profiles (extiende auth.users)
```sql
id   uuid pk → auth.users
name text
role text    -- owner | admin | taller | atencion
```

### labels
```sql
id         uuid pk
name       text
color      text   -- clave de color: emerald | amber | sky | violet | rose | orange | teal | indigo | stone
created_at timestamptz
```

### conversation_labels (many-to-many)
```sql
conversation_id uuid → conversations
label_id        uuid → labels
PK (conversation_id, label_id)
```

### role_label_access
```sql
role     text   -- taller | atencion (owner y admin ven todo, sin restricciones)
label_id uuid → labels
PK (role, label_id)
```
> Si un rol tiene entradas aquí, solo ve conversaciones con esas etiquetas.
> Si no tiene entradas, ve todas.

### projects
```sql
id                uuid pk
contact_id        uuid → contacts
title             text
description       text
status            text  -- cotizacion | aprobado | produccion | entrega | completado
estimated_delivery date (nullable)
created_at        timestamptz
```

### internal_notes
```sql
id              uuid pk
conversation_id uuid → conversations
user_id         uuid → auth.users
content         text
created_at      timestamptz
```

---

## Roles y permisos

| Rol | Ve en bandeja | Config |
|-----|--------------|--------|
| owner | Todo | Sí (etiquetas + permisos) |
| admin | Todo | Sí (etiquetas + permisos) |
| taller | Solo conversaciones con sus etiquetas asignadas | No |
| atencion | Sin restricciones (por defecto) | No |

El filtrado se hace en `app/(dashboard)/bandeja/layout.tsx` según `user_groups` + `group_label_access`.

**Importante:** `role_label_access` fue reemplazado por el sistema de grupos. No existe en el código — eliminar si aparece en algún fork antiguo.

---

## Gotchas críticos para sesiones futuras

### Supabase client en servidor
`createServiceClient()` en `lib/supabase/server.ts` usa `createClient` de `@supabase/supabase-js` directamente (NO `createServerClient` de `@supabase/ssr`). Si se cambia a `createServerClient`, falla silenciosamente en Vercel al resolver auth con el service role key.

```ts
// CORRECTO
import { createClient } from '@supabase/supabase-js'
export function createServiceClient() {
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}
```

### Caching en Vercel
Todas las páginas del dashboard necesitan:
```ts
export const dynamic = 'force-dynamic'
```
Sin esto, Vercel sirve HTML en caché y los mensajes nuevos no aparecen al recargar.

### Formato de teléfono WhatsApp (México)
El número debe tener el prefijo `1` de México: `5219XXXXXXXXXX` (52 + 1 + 10 dígitos).
La lista de números permitidos en Meta Developer Portal debe usar este mismo formato.

### Chatbot condicional
`handleBotTurn()` solo se llama si `process.env.ANTHROPIC_API_KEY` existe. Sin la variable, las conversaciones nuevas pasan directo a `mode: 'human'`. Esto es intencional para poder deployar sin el chatbot activo.

### Incrementar unread_count
Supabase no permite `unread_count + 1` en `.update()`. La solución es seleccionar el valor actual en la misma query de conversación y pasar `currentUnread + 1`.

### Flujo de invitación de usuarios
Supabase usa **implicit flow** para invitaciones — los tokens llegan en el hash de la URL (`#access_token=...`), no como query params. El hash nunca llega al servidor. El flujo es:
1. `/admin` llama `generateLink({ type: 'invite' })` → muestra el link en pantalla (sin SMTP)
2. El invitado abre el link → Supabase verifica → redirige a `[site_url]#access_token=...`
3. El middleware manda a `/login`, que detecta el hash y redirige a `/auth/callback`
4. `/auth/callback` (client component) lee el hash, llama `setSession()`, redirige a `/update-password`
5. El usuario crea su contraseña y entra a la bandeja

`@supabase/ssr` no procesa el hash automáticamente — hay que leerlo manualmente con `URLSearchParams`.

### Evitar conversaciones duplicadas
Al crear una conversación desde la UI (`POST /api/conversations`), usar `.order(...).limit(1).maybeSingle()` para buscar la activa existente. Sin `limit(1)`, si hay múltiples activas `maybeSingle()` devuelve error silencioso y se crea una nueva.

---

## Estructura de carpetas

```
/
├── app/
│   ├── (auth)/login/              -- página de login
│   ├── (dashboard)/
│   │   ├── layout.tsx             -- auth check, header, bottom nav
│   │   ├── bandeja/
│   │   │   ├── layout.tsx         -- fetch conversaciones + etiquetas, filtra por rol
│   │   │   ├── page.tsx           -- empty state
│   │   │   └── [id]/page.tsx      -- vista de conversación (force-dynamic)
│   │   ├── proyectos/page.tsx     -- placeholder
│   │   ├── grupos/page.tsx        -- canales de chat interno (Realtime)
│   │   ├── admin/page.tsx         -- dashboard admin: equipo, grupos, etiquetas
│   │   └── perfil/page.tsx        -- info de usuario + acceso a admin
│   ├── auth/callback/page.tsx     -- procesa token de invitación (implicit flow)
│   ├── update-password/page.tsx   -- crear contraseña tras invitación
│   └── api/
│       ├── webhooks/whatsapp/     -- GET verificación + POST mensajes entrantes + push
│       ├── messages/send/         -- enviar mensaje saliente
│       ├── conversations/         -- POST crear conversación
│       ├── conversations/[id]/    -- PATCH (status/mode/unread) + DELETE
│       ├── conversations/[id]/labels/ -- POST + DELETE etiquetas en conversación
│       ├── labels/                -- GET + POST
│       ├── labels/[id]/           -- PATCH (editar) + DELETE
│       ├── users/                 -- GET lista + POST invitar (genera link)
│       ├── users/[id]/            -- PATCH rol + DELETE usuario
│       ├── groups/                -- GET + POST grupos
│       ├── groups/[id]/           -- PATCH + DELETE
│       ├── groups/[id]/labels/    -- POST + DELETE etiquetas del grupo
│       ├── groups/[id]/members/   -- POST + DELETE miembros del grupo
│       ├── channels/              -- GET + POST canales de chat interno
│       ├── channels/[id]/messages/ -- GET mensajes + POST enviar
│       └── push/subscribe/        -- POST registrar + DELETE desregistrar suscripción push
├── components/
│   ├── inbox/
│   │   ├── BandejaShell.tsx       -- layout mobile: sidebar ↔ conversación
│   │   ├── ConversationList.tsx   -- lista con realtime, búsqueda y filtros por etiqueta
│   │   ├── ConversationItem.tsx   -- swipe left (archivar/eliminar), swipe right (etiquetar)
│   │   └── NewChatModal.tsx
│   ├── conversation/
│   │   ├── ConversationShell.tsx  -- wrapper client con estado de búsqueda
│   │   ├── ConversationHeader.tsx -- header con búsqueda en el chat
│   │   ├── MessageThread.tsx      -- mensajes con highlight de búsqueda + soporte media
│   │   └── MessageInput.tsx
│   ├── chat/
│   │   └── InternalChat.tsx       -- canales de chat interno con Realtime
│   ├── admin/
│   │   ├── UsersManager.tsx       -- CRUD usuarios + invitación por link
│   │   └── GroupsManager.tsx      -- CRUD grupos con etiquetas y miembros
│   └── ui/
│       ├── LogoMark.tsx           -- SVG 3 barras Milpa (viewBox "0 0 18 18")
│       ├── BottomNav.tsx          -- nav mobile
│       ├── TopNav.tsx             -- nav desktop
│       ├── LogoutButton.tsx
│       ├── LabelsManager.tsx      -- CRUD etiquetas con edición inline
│       └── PushSubscriber.tsx     -- registra suscripción push al cargar
├── lib/
│   ├── whatsapp.ts                -- cliente Meta Cloud API + verifyWebhookSignature + downloadMediaBuffer
│   ├── anthropic.ts               -- cliente Anthropic
│   ├── push.ts                    -- sendPushToAll() via web-push
│   ├── avatar-color.ts            -- color determinista por nombre (hash → 8 colores)
│   ├── label-color.ts             -- paleta de 9 colores para etiquetas
│   ├── supabase/
│   │   ├── client.ts              -- createClient() para browser
│   │   └── server.ts              -- createClient() SSR + createServiceClient() service role
│   └── bot/qualify.ts             -- lógica de calificación con Claude
├── supabase/migrations/           -- SQL aplicado en Supabase (en orden numérico, 001→009)
├── docs/SETUP.md                  -- guía de implementación paso a paso
├── types/index.ts                 -- tipos TypeScript del dominio
├── middleware.ts                  -- protege rutas, redirige a /login
└── CLAUDE.md
```

---

## Convenciones de código

- TypeScript estricto — no usar `any`
- Español para dominio: `conversación`, `bandeja`, `contacto`, `etiqueta`
- Inglés para infraestructura: `webhook`, `handler`, `middleware`, `client`
- Server Components por defecto; Client Components solo para interactividad o Realtime
- `createServiceClient()` para todas las operaciones de DB en API routes
- `await createClient()` para verificar auth del usuario en API routes
- RLS activado en todas las tablas — el service role lo bypasa en el servidor

---

## Estado actual (junio 2026)

### ✅ Funciona en producción (chat.milpa.cloud)
- Recepción y envío de mensajes WhatsApp ↔ UI en tiempo real (Supabase Realtime)
- Soporte de imágenes y media (Supabase Storage bucket `media`)
- Autenticación con Supabase Auth (email/password)
- Flujo de invitación de usuarios por link (sin depender de SMTP)
- Dashboard de administración `/admin`: equipo, grupos, etiquetas
- Sistema de grupos: filtrado de conversaciones por etiquetas por grupo de usuarios
- Bandeja multiusuario: búsqueda, filtros por etiqueta, archivados
- Swipe gestures en mobile (archivar/eliminar/etiquetar)
- Búsqueda dentro de cada conversación con highlight
- Canales de chat interno entre el equipo (`/grupos`)
- Notificaciones push (PWA, service worker, VAPID)
- Avatares con color determinista
- Badges de no leídos + preview + etiquetas en lista
- Archivar / eliminar conversaciones
- PWA completa (manifest, apple-touch-icon, favicon emerald)

### 🔲 Pendiente
- Notas internas en conversaciones (tabla `internal_notes` ya existe en DB)
- Módulo de proyectos (tabla `projects` ya existe en DB)
- Chatbot de calificación (código en `lib/bot/qualify.ts`, activar con `ANTHROPIC_API_KEY`)
- Nombre del agente en mensajes salientes (quién del equipo respondió)
- Automatizaciones (cambio de estatus → WhatsApp al cliente)
- Integración con ERP Milpa (contactos compartidos vía Supabase)

### ⚠️ Limitaciones conocidas de WhatsApp Business API
- No se pueden crear grupos con clientes externos
- Iniciar conversaciones con números nuevos requiere templates aprobados por Meta (costo por mensaje)
- Todos los mensajes salen del mismo número de empresa, sin identidad de agente visible para el cliente
- Ideal para negocios que reciben muchos mensajes entrantes, no para outreach masivo

---

## Contexto adicional

- Este módulo es de Milpa Studio internamente — no es de Huayapam
- Para dar Taller a un cliente: fork del repo + nuevo Supabase + nuevo número WhatsApp + nuevo Vercel
- Ver `docs/SETUP.md` para instrucciones paso a paso de implementación
- La integración con el ERP de Milpa es futura — actualmente son deployments independientes
