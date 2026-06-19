import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: channels } = await supabase
    .from('internal_channels')
    .select('*, internal_channel_members(user_id)')
    .order('created_at', { ascending: true })

  return NextResponse.json(channels ?? [])
}

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { name, memberIds } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: channel, error } = await supabase
    .from('internal_channels')
    .insert({ name: name.trim(), created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Agregar creador + miembros seleccionados
  const allMembers = Array.from(new Set([user.id, ...(memberIds ?? [])]))
  await supabase.from('internal_channel_members').insert(
    allMembers.map((uid: string) => ({ channel_id: channel.id, user_id: uid }))
  )

  return NextResponse.json(channel)
}
