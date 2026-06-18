import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

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
