import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface QualificationResult {
  action: 'ask' | 'qualified' | 'not_qualified'
  message: string
  summary?: string
}

export async function qualifyLead(
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<QualificationResult> {
  const tallerName = process.env.TALLER_NAME ?? 'el taller'
  const tallerDescripcion = process.env.TALLER_DESCRIPCION ?? 'un taller de manufactura por encargo'
  const tallerCriterios = process.env.TALLER_CRITERIOS_BOT ??
    '1. ¿Tiene un proyecto concreto?\n2. ¿Conoce su presupuesto aproximado?\n3. ¿Tiene fecha estimada?'

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `Eres el asistente de calificación de leads de ${tallerName}, ${tallerDescripcion}. Tu trabajo es calificar si un cliente potencial tiene un proyecto viable.

Califica basándote en:
${tallerCriterios}

Responde SIEMPRE en JSON con este formato:
{
  "action": "ask" | "qualified" | "not_qualified",
  "message": "mensaje para enviarle al cliente en español informal",
  "summary": "resumen para el equipo (solo si action es qualified)"
}

- "ask": necesitas más información, haz UNA pregunta concreta
- "qualified": el lead tiene proyecto viable, notifica al equipo
- "not_qualified": el proyecto no aplica, responde amablemente`,
    messages: history,
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    return JSON.parse(text) as QualificationResult
  } catch {
    return {
      action: 'ask',
      message: '¡Hola! ¿En qué te podemos ayudar?',
    }
  }
}
