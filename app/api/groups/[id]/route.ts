import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null
  const supabase = createServiceClient()
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (!['owner', 'admin'].includes(profile?.role ?? '')) return null
  return supabase
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { name } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  const { data, error } = await supabase.from('groups').update({ name: name.trim() }).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: 'Error actualizando grupo' }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { error } = await supabase.from('groups').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: 'Error eliminando grupo' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
