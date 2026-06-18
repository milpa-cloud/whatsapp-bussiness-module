import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createServiceClient()

  let body: { status?: string; mode?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const updates: Record<string, string> = {}
  if (body.status) updates.status = body.status
  if (body.mode) updates.mode = body.mode

  const { error } = await supabase
    .from('conversations')
    .update(updates)
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Error actualizando conversación' }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Error eliminando conversación' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
