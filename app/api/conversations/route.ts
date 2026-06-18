import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createServiceClient()

  let body: { phone: string; name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const { phone, name } = body
  if (!phone?.trim()) {
    return NextResponse.json({ error: 'El número de teléfono es requerido' }, { status: 400 })
  }

  // Buscar o crear contacto
  let contactId: string
  const { data: existing } = await supabase
    .from('contacts')
    .select('id')
    .eq('phone', phone.trim())
    .maybeSingle()

  if (existing) {
    contactId = existing.id
    if (name) {
      await supabase.from('contacts').update({ name }).eq('id', contactId)
    }
  } else {
    const { data: newContact, error } = await supabase
      .from('contacts')
      .insert({ phone: phone.trim(), name: name ?? null, type: 'lead' })
      .select('id')
      .single()

    if (error || !newContact) {
      return NextResponse.json({ error: 'Error creando contacto' }, { status: 500 })
    }
    contactId = newContact.id
  }

  // Buscar conversación activa existente (limit(1) evita error si hay duplicados)
  const { data: existingConv } = await supabase
    .from('conversations')
    .select('id')
    .eq('contact_id', contactId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingConv) {
    return NextResponse.json({ conversationId: existingConv.id })
  }

  // Crear nueva conversación
  const { data: conversation, error } = await supabase
    .from('conversations')
    .insert({ contact_id: contactId, mode: 'human', status: 'active' })
    .select('id')
    .single()

  if (error || !conversation) {
    return NextResponse.json({ error: 'Error creando conversación' }, { status: 500 })
  }

  return NextResponse.json({ conversationId: conversation.id })
}
