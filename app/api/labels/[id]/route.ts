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

  let body: { name?: string; color?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Payload inválido' }, { status: 400 }) }

  const updates: Record<string, string> = {}
  if (body.name?.trim()) updates.name = body.name.trim()
  if (body.color) updates.color = body.color

  const { data, error } = await supabase
    .from('labels')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Error actualizando etiqueta' }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createServiceClient()
  const { error } = await supabase.from('labels').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: 'Error eliminando etiqueta' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
