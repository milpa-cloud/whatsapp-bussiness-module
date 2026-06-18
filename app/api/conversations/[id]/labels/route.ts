import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createServiceClient()

  let body: { label_id: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const { error } = await supabase
    .from('conversation_labels')
    .insert({ conversation_id: params.id, label_id: body.label_id })

  if (error) return NextResponse.json({ error: 'Error agregando etiqueta' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createServiceClient()

  let body: { label_id: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const { error } = await supabase
    .from('conversation_labels')
    .delete()
    .eq('conversation_id', params.id)
    .eq('label_id', body.label_id)

  if (error) return NextResponse.json({ error: 'Error removiendo etiqueta' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
