import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/whatsapp'
import { createServiceClient } from '@/lib/supabase/server'
import { handleBotTurn } from '@/lib/bot/qualify'
import type { WhatsAppWebhookPayload } from '@/types'

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

  // Meta permite hasta 20s para responder — procesamos sincrónicamente
  // para evitar problemas con el contexto de process.env en waitUntil
  await processIncomingMessages(payload)

  return new NextResponse('OK', { status: 200 })
}

async function processIncomingMessages(payload: WhatsAppWebhookPayload) {
  const supabase = createServiceClient()

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== 'messages') continue

      const { messages, contacts: waContacts } = change.value
      if (!messages?.length) continue

      const waContactName = waContacts?.[0]?.profile?.name ?? null

      for (const waMessage of messages) {
        // Solo procesamos texto en esta versión
        if (waMessage.type !== 'text' || !waMessage.text?.body) continue

        const phone = waMessage.from
        const content = waMessage.text.body
        const waMessageId = waMessage.id

        // Deduplicación: ignorar si ya guardamos este mensaje
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
          .select('id, mode')
          .eq('contact_id', contactId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (conversation) {
          conversationId = conversation.id
          conversationMode = conversation.mode as 'bot' | 'human'
        } else {
          const { data: newConversation, error } = await supabase
            .from('conversations')
            .insert({ contact_id: contactId, mode: 'bot', status: 'active' })
            .select('id, mode')
            .single()

          if (error || !newConversation) {
            console.error('Error creando conversación:', error)
            continue
          }
          conversationId = newConversation.id
          conversationMode = 'bot'
        }

        // 3. Guardar mensaje
        const { error: msgError } = await supabase.from('messages').insert({
          conversation_id: conversationId,
          direction: 'inbound',
          content,
          wa_message_id: waMessageId,
        })

        if (msgError) {
          console.error('Error guardando mensaje:', msgError)
          continue
        }

        // 4. Actualizar timestamp de conversación
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId)

        // 5. Si el modo es bot y hay API key de Anthropic, activar calificación
        if (conversationMode === 'bot' && process.env.ANTHROPIC_API_KEY) {
          try {
            await handleBotTurn(conversationId, phone)
          } catch (botError) {
            // El bot falla silenciosamente — el mensaje ya fue guardado
            console.error('Error en bot turn (mensaje guardado):', botError)
          }
        } else if (conversationMode === 'bot' && !process.env.ANTHROPIC_API_KEY) {
          // Sin API key del bot, pasar directo a atención humana
          await supabase
            .from('conversations')
            .update({ mode: 'human' })
            .eq('id', conversationId)
        }
      }
    }
  }
}
