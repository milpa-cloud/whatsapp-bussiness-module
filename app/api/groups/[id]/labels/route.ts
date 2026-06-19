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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { label_id } = await request.json()
  await supabase.from('group_label_access').insert({ group_id: params.id, label_id })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { label_id } = await request.json()
  await supabase.from('group_label_access').delete().eq('group_id', params.id).eq('label_id', label_id)
  return NextResponse.json({ ok: true })
}
