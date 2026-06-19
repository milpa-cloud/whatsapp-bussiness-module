import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null

  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['owner', 'admin'].includes(profile?.role ?? '')) return null
  return supabase
}

export async function GET() {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const [{ data: { users } }, { data: profiles }] = await Promise.all([
    supabase.auth.admin.listUsers(),
    supabase.from('user_profiles').select('id, name, role'),
  ])

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))

  const result = (users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? '',
    name: profileMap[u.id]?.name ?? u.email ?? '',
    role: profileMap[u.id]?.role ?? 'atencion',
    invited_at: u.invited_at ?? null,
    last_sign_in_at: u.last_sign_in_at ?? null,
  }))

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const supabase = await requireAdmin()
  if (!supabase) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: { email: string; name: string; role: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Payload inválido' }, { status: 400 }) }

  const { email, name, role } = body
  if (!email?.trim()) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email: email.trim(),
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
  })
  if (error) {
    console.error('generateLink error:', JSON.stringify(error))
    return NextResponse.json({ error: error.message || JSON.stringify(error) }, { status: 400 })
  }

  await supabase.from('user_profiles').upsert({
    id: data.user.id,
    name: name?.trim() || email.split('@')[0],
    role: role ?? 'atencion',
  })

  return NextResponse.json({ ok: true, id: data.user.id, inviteLink: data.properties.action_link })
}
