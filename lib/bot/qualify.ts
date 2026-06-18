import { qualifyLead } from '@/lib/anthropic'
import { createServiceClient } from '@/lib/supabase/server'
import { sendTextMessage } from '@/lib/whatsapp'

export async function handleBotTurn(conversationId: string, contactPhone: string): Promise<void> {
  const supabase = createServiceClient()

  const { data: messages } = await supabase
    .from('messages')
    .select('direction, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (!messages) return

  const history = messages.map((m) => ({
    role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.content,
  }))

  const result = await qualifyLead(history)

  await sendTextMessage(contactPhone, result.message)

  await supabase.from('messages').insert({
    conversation_id: conversationId,
    direction: 'outbound',
    content: result.message,
  })

  if (result.action === 'qualified' || result.action === 'not_qualified') {
    await supabase
      .from('conversations')
      .update({ mode: 'human', status: result.action === 'not_qualified' ? 'archived' : 'active' })
      .eq('id', conversationId)
  }
}
