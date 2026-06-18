import { NextRequest, NextResponse } from 'next/server'
import { sendTextMessage } from '@/lib/whatsapp'
import { createClient } from '@/lib/supabase/server'

interface SendMessageBody {
  conversation_id: string
  content: string
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: SendMessageBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const { conversation_id, content } = body
  if (!conversation_id || !content?.trim()) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  // Obtener el teléfono del contacto
  const { data: conversation } = await supabase
    .from('conversations')
    .select('contact_id, contacts(phone)')
    .eq('id', conversation_id)
    .single()

  if (!conversation) {
    return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
  }

  const contacts = conversation.contacts as unknown as { phone: string } | null
  const phone = contacts?.phone
  if (!phone) {
    return NextResponse.json({ error: 'Contacto sin número de teléfono' }, { status: 400 })
  }

  // Enviar por WhatsApp
  await sendTextMessage(phone, content.trim())

  // Guardar en DB
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id,
      direction: 'outbound',
      content: content.trim(),
    })
    .select()
    .single()

  if (error) {
    console.error('Error guardando mensaje saliente:', error)
    return NextResponse.json({ error: 'Error guardando mensaje' }, { status: 500 })
  }

  // Actualizar timestamp de conversación y cambiar a modo humano si era bot
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString(), mode: 'human' })
    .eq('id', conversation_id)

  return NextResponse.json({ message })
}
