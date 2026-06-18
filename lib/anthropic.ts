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
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `Eres el asistente de calificación de leads de Carpintería Huayapam,
un taller de muebles a medida en Oaxaca, México. Tu trabajo es calificar si
un cliente potencial tiene un proyecto viable.

Califica basándote en:
1. ¿Tiene un proyecto concreto de muebles a medida?
2. ¿Conoce su presupuesto aproximado? (proyectos desde $5,000 MXN)
3. ¿Tiene fecha estimada de entrega?
4. ¿Es en Oaxaca o puede coordinar envío?

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
      message: 'Hola, ¿en qué te podemos ayudar? ¿Qué tipo de mueble tienes en mente?',
    }
  }
}
