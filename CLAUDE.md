# Taller — Módulo de WhatsApp compartido para Milpa

## Contexto del proyecto

Taller es un módulo dentro del ecosistema Milpa (Mini-ERP para PyMEs mexicanas). Su función es reemplazar el WhatsApp personal del dueño de un taller con una bandeja compartida profesional, multiusuario, con automatizaciones y un chatbot de calificación de leads.

**Cliente piloto:** Carpintería Huayapam — manufactura de muebles a medida en México.
**Repositorio:** `github.com/milpa-mx/taller`

---

## El problema que resuelve

- Los talleres manejan proyectos de semanas/meses vía WhatsApp personal del dueño
- Múltiples personas necesitan ver y responder las mismas conversaciones
- No hay distinción estructurada entre clientes y proveedores
- Los leads nuevos requieren calificación manual
- Las conversaciones no están asociadas a proyectos — se pierde el hilo

---

## Stack técnico

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | API Routes de Next.js |
| Base de datos | Supabase (PostgreSQL + Auth + Realtime) |
| WhatsApp | Meta Cloud API (directo, sin intermediarios) |
| IA / Chatbot | Anthropic API — modelo `claude-sonnet-4-6` |
| Hosting | Railway |
| PWA | next-pwa |

---

## Arquitectura del sistema

### Flujo de mensaje entrante

```
Cliente escribe por WhatsApp
  → Meta llama POST /api/webhooks/whatsapp
  → Verificar firma HMAC del request
  → Identificar si el contacto existe en DB
  → Si es nuevo: crear contacto como "lead", activar flujo de chatbot
  → Si existe: guardar mensaje en tabla messages
  → Supabase Realtime notifica a la interfaz web
  → El equipo ve el mensaje en la bandeja en tiempo real
```

### Flujo de mensaje saliente

```
Usuario del taller escribe en la interfaz
  → POST /api/messages/send
  → Llamar a Meta Cloud API con el mensaje
  → Guardar copia en messages con direction: "outbound"
  → Actualizar last_message_at en conversation
```

### Flujo de calificación de lead (chatbot)

```
Llega mensaje de número desconocido
  → Marcar conversación como mode: "bot"
  → Enviar mensaje de bienvenida automático
  → En cada respuesta del lead: enviar historial a Claude API
  → Claude decide: hacer otra pregunta o emitir veredicto
  → Si calificado: notificar al equipo con resumen, cambiar mode: "human"
  → Si no calificado: responder amablemente, archivar conversación
```

---

## Schema de base de datos

### contacts

```sql
id          uuid primary key
phone       text unique not null        -- formato: 521XXXXXXXXXX
name        text
type        text default 'lead'         -- lead | cliente | proveedor
created_at  timestamptz default now()
```

### conversations

```sql
id              uuid primary key
contact_id      uuid references contacts
project_id      uuid references projects nullable
status          text default 'active'   -- active | archived
mode            text default 'bot'      -- bot | human
last_message_at timestamptz
created_at      timestamptz default now()
```

### messages

```sql
id              uuid primary key
conversation_id uuid references conversations
direction       text                    -- inbound | outbound
content         text
media_url       text nullable
wa_message_id   text nullable           -- ID de Meta, para deduplicación
created_at      timestamptz default now()
read_at         timestamptz nullable
```

### internal_notes

```sql
id              uuid primary key
conversation_id uuid references conversations
user_id         uuid references auth.users
content         text
created_at      timestamptz default now()
```

### projects

```sql
id                uuid primary key
contact_id        uuid references contacts
title             text
description       text
status            text default 'cotizacion'
                  -- cotizacion | aprobado | produccion | entrega | completado
estimated_delivery date nullable
created_at        timestamptz default now()
```

### user_profiles (extiende auth.users de Supabase)

```sql
id      uuid references auth.users primary key
name    text
role    text default 'atencion'
        -- owner | admin | taller | atencion
```

---

## Roles y permisos

| Rol | Bandeja clientes | Proyectos | Proveedores | Finanzas | Config |
|-----|-----------------|-----------|-------------|----------|--------|
| owner | ✓ | ✓ | ✓ | ✓ | ✓ |
| admin | ✓ | ✓ | ✓ | ✗ | ✗ |
| taller | Solo asignados | Solo asignados | ✗ | ✗ | ✗ |
| atencion | ✓ | Ver | ✗ | ✗ | ✗ |

---

## Variables de entorno requeridas

```env
# WhatsApp — Meta Cloud API
WHATSAPP_VERIFY_TOKEN=          # token que tú defines para verificar el webhook
WHATSAPP_ACCESS_TOKEN=          # token de acceso permanente de Meta
WHATSAPP_PHONE_NUMBER_ID=       # ID del número en Meta Developer Portal

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # solo en servidor, nunca en cliente

# Anthropic
ANTHROPIC_API_KEY=              # para el chatbot de calificación

# App
NEXTAUTH_SECRET=                # string aleatorio para sesiones
NEXT_PUBLIC_APP_URL=            # URL pública del deployment
```

---

## Estructura de carpetas

```
/
├── app/
│   ├── (auth)/              -- login, logout
│   ├── (dashboard)/
│   │   ├── bandeja/         -- inbox principal
│   │   ├── proyectos/       -- lista y detalle de proyectos
│   │   └── proveedores/     -- contactos de proveedores
│   └── api/
│       ├── webhooks/
│       │   └── whatsapp/    -- POST handler + GET verificación
│       ├── messages/
│       │   └── send/        -- enviar mensaje saliente
│       └── conversations/   -- CRUD conversaciones
├── components/
│   ├── inbox/               -- componentes de la bandeja
│   ├── conversation/        -- vista de conversación individual
│   └── ui/                  -- componentes base reutilizables
├── lib/
│   ├── whatsapp.ts          -- cliente para Meta Cloud API
│   ├── anthropic.ts         -- cliente para chatbot
│   ├── supabase/
│   │   ├── client.ts        -- cliente browser
│   │   └── server.ts        -- cliente servidor
│   └── bot/
│       └── qualify.ts       -- lógica de calificación de leads
├── types/
│   └── index.ts             -- tipos TypeScript del dominio
└── CLAUDE.md                -- este archivo
```

---

## Convenciones de código

- TypeScript estricto — no usar `any`
- Español para conceptos de dominio: `proyecto`, `taller`, `contacto`, `proveedor`
- Inglés para infraestructura: `webhook`, `handler`, `middleware`, `client`
- Server Components por defecto en Next.js App Router
- Client Components solo cuando se necesita interactividad o Realtime
- Supabase Row Level Security activado en todas las tablas
- Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` en componentes de cliente

---

## Roadmap de construcción

### Semana 1 — Núcleo funcional

- [ ] Inicializar proyecto Next.js 14 + TypeScript + Tailwind
- [ ] Crear schema en Supabase
- [ ] Webhook de WhatsApp (verificación GET + recepción POST)
- [ ] Guardar mensajes entrantes en Supabase
- [ ] Interfaz básica de bandeja (lista de conversaciones + mensajes)
- [ ] Enviar mensajes desde la interfaz

### Semana 2 — Multi-usuario

- [ ] Autenticación con Supabase Auth
- [ ] Roles y permisos (RLS en Supabase)
- [ ] Notas internas en conversaciones
- [ ] Supabase Realtime (mensajes en tiempo real sin refrescar)

### Semana 3 — Proyectos y chatbot

- [ ] Módulo de proyectos (crear, ver estatus, asociar a conversación)
- [ ] Chatbot de calificación de leads con Claude API
- [ ] Notificación al equipo cuando un lead está calificado
- [ ] Módulo básico de proveedores

### Semana 4 — PWA y automatizaciones

- [ ] next-pwa + manifest.json
- [ ] Notificaciones push cuando llega mensaje nuevo
- [ ] Automatización: cambio de estatus en proyecto → WhatsApp al cliente
- [ ] Recordatorio de pago (trigger diario)

---

## Contexto adicional importante

- Los proyectos duran semanas o meses — la conversación con el cliente es continua, no puntual
- El taller tiene 7-10 personas en administración
- WhatsApp es el canal principal tanto con clientes como con proveedores
- La mayoría de los clientes son personas que buscan muebles a medida — no empresas
- Este módulo debe eventualmente integrarse con el resto de Milpa (inventario, cotizaciones, CFDI)
- **Prioridad:** que funcione para Huayapam primero. Generalizar después.
