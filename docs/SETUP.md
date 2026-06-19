# Taller — Guía de implementación

Bandeja compartida de WhatsApp para equipos. Cada cliente recibe su propio deployment con sus propias credenciales, datos e infraestructura.

---

## Requisitos previos

- Cuenta de [Vercel](https://vercel.com) (hosting)
- Proyecto de [Supabase](https://supabase.com) (base de datos, auth, realtime)
- Cuenta de [Meta Developer](https://developers.facebook.com) con WhatsApp Business API
- Un número de teléfono dedicado para WhatsApp Business (no puede estar registrado en WhatsApp personal)
- Opcional: clave de [Anthropic](https://console.anthropic.com) para el chatbot de calificación

---

## Paso 1 — Fork del repositorio

```bash
# Fork en GitHub: github.com/milpa-cloud/whatsapp-bussiness-module → nuevo repo privado
# Luego clonar localmente
git clone https://github.com/[org]/[nombre-cliente]-taller
cd [nombre-cliente]-taller
npm install
```

---

## Paso 2 — Crear proyecto Supabase

1. Ir a [supabase.com](https://supabase.com) → New Project
2. Guardar la contraseña del proyecto
3. Ir a **Project Settings → API** y copiar:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

### Correr las migraciones

En **Supabase → SQL Editor**, correr cada archivo de `supabase/migrations/` en orden numérico:

```
001_initial_schema.sql      — tablas base (contacts, conversations, messages, etc.)
002_labels.sql              — sistema de etiquetas
003_user_profiles.sql       — perfiles de usuario y roles
004_projects.sql            — módulo de proyectos (tabla base)
005_internal_notes.sql      — notas internas en conversaciones
006_storage_media.sql       — bucket de Supabase Storage para imágenes
007_groups.sql              — sistema de grupos y permisos
008_internal_chat.sql       — canales de chat interno entre el equipo
009_push_subscriptions.sql  — suscripciones para notificaciones push
```

### Configurar Storage

En **Supabase → Storage**, verificar que existe el bucket `media` (creado por migración 006).

### Configurar URL de la app

En **Supabase → Authentication → URL Configuration**:
- **Site URL:** `https://[dominio-del-cliente]`
- **Redirect URLs:** `https://[dominio-del-cliente]/**`

---

## Paso 3 — Configurar WhatsApp Business API en Meta

### 3.1 Crear la app en Meta

1. Ir a [developers.facebook.com](https://developers.facebook.com) → My Apps → Create App
2. Tipo: **Business**
3. Agregar producto: **WhatsApp**

### 3.2 Registrar el número de WhatsApp

1. En **WhatsApp → Getting Started**, agregar el número de teléfono del cliente
2. El número NO puede estar registrado en WhatsApp personal (si lo está, hay que eliminar la cuenta primero)
3. Verificar con código SMS/llamada
4. Si el registro falla en la UI, usar el **Graph API Explorer**:
   ```
   POST /{phone_number_id}/register
   Body: {"messaging_product": "whatsapp", "pin": "XXXXXX"}
   ```

### 3.3 Generar token de acceso permanente

1. En **Business Settings → System Users** → crear System User (rol: Admin)
2. **Add Assets** → Apps → seleccionar la app → rol: Admin
3. **Generate Token** → seleccionar la app → permisos mínimos:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
4. Copiar el token → `WHATSAPP_ACCESS_TOKEN`

### 3.4 Obtener IDs necesarios

En **WhatsApp → Getting Started**:
- **Phone Number ID** → `WHATSAPP_PHONE_NUMBER_ID`
- **WhatsApp Business Account ID** (para referencia)

### 3.5 Configurar el webhook

En **WhatsApp → Configuration → Webhook**:
- **Callback URL:** `https://[dominio]/api/webhooks/whatsapp`
- **Verify Token:** el valor que pondrás en `WHATSAPP_VERIFY_TOKEN` (puedes inventarlo, ej. `milpa-webhook-2025`)
- **Webhook fields:** suscribir a `messages`

---

## Paso 4 — Variables de entorno

Crear `.env.local` para desarrollo local y agregar las mismas variables en **Vercel → Settings → Environment Variables** para producción:

```env
# WhatsApp — Meta Cloud API
WHATSAPP_VERIFY_TOKEN=        # el token que definiste para el webhook
WHATSAPP_ACCESS_TOKEN=        # token del System User de Meta
WHATSAPP_PHONE_NUMBER_ID=     # ID del número en Meta Developer Portal

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=          # URL pública, ej. https://chat.cliente.com

# Opcional — chatbot de calificación
ANTHROPIC_API_KEY=

# Opcional — notificaciones push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=
```

### Generar claves VAPID (si se activan push notifications)

```bash
npx web-push generate-vapid-keys
```

Copiar `Public Key` → `NEXT_PUBLIC_VAPID_PUBLIC_KEY` y `Private Key` → `VAPID_PRIVATE_KEY`.

---

## Paso 5 — Deploy en Vercel

```bash
# Conectar el repo en vercel.com → New Project → importar el repo
# Configurar las variables de entorno (Paso 4)
# Deploy
```

O desde CLI:
```bash
npm install -g vercel
vercel --prod
```

### Dominio personalizado

En **Vercel → Project → Settings → Domains**, agregar el dominio del cliente (ej. `chat.cliente.com`). Configurar el DNS apuntando a Vercel.

---

## Paso 6 — Primera configuración en la app

1. **Crear el primer usuario (owner):**
   - En **Supabase → Authentication → Users** → Invite User → con tu correo
   - O usar el API de Supabase directamente
   - Luego en SQL Editor:
     ```sql
     INSERT INTO user_profiles (id, name, role)
     SELECT id, email, 'owner'
     FROM auth.users
     WHERE email = 'tu@correo.com';
     ```

2. **Acceder a la app** en `https://[dominio]` → `/login`

3. **Ir a `/admin`** para:
   - Crear etiquetas (colores disponibles: emerald, amber, sky, violet, rose, orange, teal, indigo, stone)
   - Crear grupos de acceso y asignar miembros + etiquetas
   - Invitar al resto del equipo

4. **Configurar SMTP personalizado** (opcional, para quitar límite de 3 emails/hora):
   - **Supabase → Authentication → Emails** → Enable Custom SMTP
   - Zoho: host `smtppro.zoho.com`, puerto `587`, con App Password

---

## Paso 7 — Activar Storage para imágenes (migración 006)

En **Supabase → Storage**, el bucket `media` debe existir y ser público.

Si la migración no lo creó automáticamente:
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true);
```

---

## Estructura de roles

| Rol | Acceso | Puede configurar |
|-----|--------|-----------------|
| `owner` | Todo | Sí (admin completo) |
| `admin` | Todo | Sí (admin completo) |
| `atencion` | Todas las conversaciones | No |
| `taller` | Solo conversaciones con etiquetas de su grupo | No |

Los grupos definen qué etiquetas puede ver cada conjunto de usuarios. Si un usuario no está en ningún grupo, ve todo.

---

## Funciones opcionales

### Chatbot de calificación de leads

Agregar `ANTHROPIC_API_KEY` en las variables de entorno. El chatbot se activa automáticamente para conversaciones nuevas (`mode: 'bot'`). Sin la variable, todas las conversaciones inician en modo humano.

La lógica del chatbot está en `lib/bot/qualify.ts` — personalizar el prompt según el negocio del cliente.

### Notificaciones push

Requiere las variables `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_EMAIL`. Al iniciar sesión en la app, se pide permiso de notificaciones automáticamente. Las notificaciones llegan cuando un cliente envía un mensaje nuevo.

---

## Integración con el ERP de Milpa

Este módulo comparte contactos con el ERP a través de la tabla `contacts` en Supabase. Para integrarlo:

1. El ERP y Taller deben apuntar al mismo proyecto Supabase, o sincronizar contactos vía API
2. La tabla `projects` en Taller puede vincularse con proyectos del ERP usando el `contact_id`
3. Las notas internas (`internal_notes`) son un punto de contexto compartido entre ambos sistemas

**Estado de la integración:** pendiente — actualmente son deployments independientes por cliente.

---

## Para dar Taller a un cliente nuevo

1. Fork del repo → nuevo repo privado `milpa-cloud/[cliente]-taller`
2. Nuevo proyecto Supabase (datos separados)
3. Nuevo número de WhatsApp Business en Meta
4. Nuevo proyecto Vercel con sus variables de entorno
5. Correr migraciones 001 → 009 en el nuevo Supabase
6. Configurar webhook en Meta apuntando al nuevo Vercel URL
