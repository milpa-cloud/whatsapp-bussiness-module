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

export async function GET() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createServiceClient()
  const [{ data: groups }, { data: gla }, { data: ug }] = await Promise.all([
    supabase.from('groups').select('*').order('name'),
    supabase.from('group_label_access').select('group_id, label_id'),
    supabase.from('user_groups').select('group_id, user_id'),
  ])

  const result = (groups ?? []).map((g) => ({
    ...g,
    label_ids: (gla ?? []).filter((r) => r.group_id === g.id).map((r) => r.label_id),
    user_ids: (ug ?? []).filter((r) => r.group_id === g.id).map((r) => r.user_id),
  }))

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { name } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  const { data, error } = await supabase.from('groups').insert({ name: name.trim() }).select().single()
  if (error) return NextResponse.json({ error: 'Error creando grupo' }, { status: 500 })
  return NextResponse.json({ ...data, label_ids: [], user_ids: [] })
}
