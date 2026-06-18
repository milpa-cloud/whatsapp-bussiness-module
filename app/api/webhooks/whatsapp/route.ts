import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, downloadMediaBuffer } from '@/lib/whatsapp'
import { createServiceClient } from '@/lib/supabase/server'
import { handleBotTurn } from '@/lib/bot/qualify'
import type { WhatsAppWebhookPayload, WhatsAppInboundMessage } from '@/types'

// GET — verificación del webhook con Meta
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

// POST — mensajes entrantes
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256') ?? ''

  if (!verifyWebhookSignature(rawBody, signature)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  let payload: WhatsAppWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new NextResponse('Bad Request', { status: 400 })
  }

  await processIncomingMessages(payload)

  return new NextResponse('OK', { status: 200 })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/aac': 'aac',
  'audio/x-m4a': 'm4a',
  'application/pdf': 'pdf',
}

function mimeToExt(mime: string): string {
  return MIME_TO_EXT[mime] ?? mime.split('/')[1] ?? 'bin'
}

type MediaInfo = { id: string; mimeType: string; caption: string }

function extractMedia(msg: WhatsAppInboundMessage): MediaInfo | null {
  switch (msg.type) {
    case 'image':
      return msg.image ? { id: msg.image.id, mimeType: msg.image.mime_type, caption: msg.image.caption ?? '' } : null
    case 'video':
      return msg.video ? { id: msg.video.id, mimeType: msg.video.mime_type, caption: msg.video.caption ?? '' } : null
    case 'audio':
      return msg.audio ? { id: msg.audio.id, mimeType: msg.audio.mime_type, caption: '' } : null
    case 'document':
      return msg.document ? { id: msg.document.id, mimeType: msg.document.mime_type, caption: msg.document.caption ?? msg.document.filename ?? '' } : null
    case 'sticker':
      return msg.sticker ? { id: msg.sticker.id, mimeType: msg.sticker.mime_type, caption: '' } : null
    default:
      return null
  }
}

function mediaPreview(type: string, caption: string): string {
  if (caption) return caption.length > 60 ? caption.slice(0, 60) + '…' : caption
  const icons: Record<string, string> = {
    image: '📷 Imagen',
    video: '🎥 Video',
    audio: '🎵 Audio',
    document: '📄 Documento',
    sticker: '🎭 Sticker',
  }
  return icons[type] ?? '📎 Archivo'
}

// ─── Procesamiento ────────────────────────────────────────────────────────────

async function processIncomingMessages(payload: WhatsAppWebhookPayload) {
  const supabase = createServiceClient()

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== 'messages') continue

      const { messages, contacts: waContacts } = change.value
      if (!messages?.length) continue

      const waContactName = waContacts?.[0]?.profile?.name ?? null

      for (const waMessage of messages) {
        // Solo tipos que sabemos manejar
        const supportedTypes = ['text', 'image', 'video', 'audio', 'document', 'sticker']
        if (!supportedTypes.includes(waMessage.type)) continue

        // Texto puro requiere contenido
        if (waMessage.type === 'text' && !waMessage.text?.body) continue

        const phone = waMessage.from
        const waMessageId = waMessage.id

        // Deduplicación
        const { data: existing } = await supabase
          .from('messages')
          .select('id')
          .eq('wa_message_id', waMessageId)
          .maybeSingle()

        if (existing) continue

        // 1. Buscar o crear contacto
        let contactId: string
        const { data: contact } = await supabase
          .from('contacts')
          .select('id')
          .eq('phone', phone)
          .maybeSingle()

        if (contact) {
          contactId = contact.id
        } else {
          const { data: newContact, error } = await supabase
            .from('contacts')
            .insert({ phone, name: waContactName, type: 'lead' })
            .select('id')
            .single()

          if (error || !newContact) {
            console.error('Error creando contacto:', error)
            continue
          }
          contactId = newContact.id
        }

        // 2. Buscar o crear conversación activa
        let conversationId: string
        let conversationMode: 'bot' | 'human'

        const { data: conversation } = await supabase
          .from('conversations')
          .select('id, mode, unread_count')
          .eq('contact_id', contactId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        let currentUnread = 0
        if (conversation) {
          conversationId = conversation.id
          conversationMode = conversation.mode as 'bot' | 'human'
          currentUnread = conversation.unread_count ?? 0
        } else {
          const { data: newConversation, error } = await supabase
            .from('conversations')
            .insert({ contact_id: contactId, mode: 'bot', status: 'active' })
            .select('id, mode, unread_count')
            .single()

          if (error || !newConversation) {
            console.error('Error creando conversación:', error)
            continue
          }
          conversationId = newConversation.id
          conversationMode = 'bot'
          currentUnread = 0
        }

        // 3. Contenido y media
        let content = waMessage.type === 'text' ? (waMessage.text?.body ?? '') : ''
        let mediaUrl: string | null = null

        const media = extractMedia(waMessage)
        if (media) {
          content = media.caption
          try {
            const { buffer, mimeType } = await downloadMediaBuffer(media.id)
            const ext = mimeToExt(mimeType)
            const filename = `${waMessageId}.${ext}`

            const { error: uploadError } = await supabase.storage
              .from('media')
              .upload(filename, buffer, { contentType: mimeType, upsert: false })

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('media')
                .getPublicUrl(filename)
              mediaUrl = publicUrl
            } else {
              console.error('Error subiendo media a storage:', uploadError)
            }
          } catch (err) {
            console.error('Error descargando media de Meta:', err)
            // El mensaje se guarda igualmente sin media
          }
        }

        // 4. Guardar mensaje
        const { error: msgError } = await supabase.from('messages').insert({
          conversation_id: conversationId,
          direction: 'inbound',
          content,
          media_url: mediaUrl,
          wa_message_id: waMessageId,
        })

        if (msgError) {
          console.error('Error guardando mensaje:', msgError)
          continue
        }

        // 5. Actualizar conversación
        const preview = waMessage.type === 'text'
          ? (content.length > 60 ? content.slice(0, 60) + '…' : content)
          : mediaPreview(waMessage.type, content)

        await supabase
          .from('conversations')
          .update({
            last_message_at: new Date().toISOString(),
            last_message_preview: preview,
            unread_count: conversationMode === 'human' ? currentUnread + 1 : 0,
          })
          .eq('id', conversationId)

        // 6. Bot (solo para mensajes de texto)
        if (waMessage.type === 'text') {
          if (conversationMode === 'bot' && process.env.ANTHROPIC_API_KEY) {
            try {
              await handleBotTurn(conversationId, phone)
            } catch (botError) {
              console.error('Error en bot turn:', botError)
            }
          } else if (conversationMode === 'bot' && !process.env.ANTHROPIC_API_KEY) {
            await supabase
              .from('conversations')
              .update({ mode: 'human' })
              .eq('id', conversationId)
          }
        }
      }
    }
  }
}
