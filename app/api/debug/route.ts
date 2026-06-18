import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('conversations')
      .select('*, contacts(id, phone, name, type, created_at)')
      .eq('status', 'active')
      .order('last_message_at', { ascending: false })

    return NextResponse.json({
      ok: !error,
      count: data?.length ?? 0,
      error: error ?? null,
      env: {
        url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      data,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, caught: String(e) })
  }
}
