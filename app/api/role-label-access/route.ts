import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function requireAdmin(authClient: Awaited<ReturnType<typeof createClient>>, supabase: ReturnType<typeof createServiceClient>) {
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (!['owner', 'admin'].includes(profile?.role ?? '')) return null
  return user
}

export async function POST(request: NextRequest) {
  const authClient = await createClient()
  const supabase = createServiceClient()
  const user = await requireAdmin(authClient, supabase)
  if (!user) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  let body: { role: string; label_id: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Payload inválido' }, { status: 400 }) }

  const { error } = await supabase
    .from('role_label_access')
    .insert({ role: body.role, label_id: body.label_id })

  if (error) return NextResponse.json({ error: 'Error guardando permiso' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const authClient = await createClient()
  const supabase = createServiceClient()
  const user = await requireAdmin(authClient, supabase)
  if (!user) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  let body: { role: string; label_id: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Payload inválido' }, { status: 400 }) }

  const { error } = await supabase
    .from('role_label_access')
    .delete()
    .eq('role', body.role)
    .eq('label_id', body.label_id)

  if (error) return NextResponse.json({ error: 'Error eliminando permiso' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
