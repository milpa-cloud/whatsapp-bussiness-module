import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { supabase: null, currentUserId: null }

  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['owner', 'admin'].includes(profile?.role ?? '')) return { supabase: null, currentUserId: null }
  return { supabase, currentUserId: user.id }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase } = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: { role: string; name?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Payload inválido' }, { status: 400 }) }

  const updates: Record<string, string> = {}
  if (body.role) updates.role = body.role
  if (body.name?.trim()) updates.name = body.name.trim()

  const { error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Error actualizando usuario' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, currentUserId } = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  if (params.id === currentUserId) {
    return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })
  }

  const { error } = await supabase.auth.admin.deleteUser(params.id)
  if (error) return NextResponse.json({ error: 'Error eliminando usuario' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
