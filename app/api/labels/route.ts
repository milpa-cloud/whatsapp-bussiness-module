import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from('labels').select('*').order('name')
  if (error) return NextResponse.json({ error: 'Error' }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createServiceClient()

  let body: { name: string; color: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  if (!body.name?.trim() || !body.color) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('labels')
    .insert({ name: body.name.trim(), color: body.color })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Error creando etiqueta' }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
