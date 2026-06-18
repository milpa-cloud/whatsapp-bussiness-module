const BASE_URL = 'https://graph.facebook.com/v19.0'

export async function sendTextMessage(to: string, text: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    throw new Error('Missing WhatsApp env vars')
  }

  const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: text },
    }),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`)
  }
}

export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const { createHmac, timingSafeEqual } = require('crypto') as typeof import('crypto')
  const secret = process.env.WHATSAPP_APP_SECRET
  if (!secret) return false

  const expected = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`
  const expectedBuf = Buffer.from(expected)
  const signatureBuf = Buffer.from(signature)

  return (
    expectedBuf.length === signatureBuf.length &&
    timingSafeEqual(expectedBuf, signatureBuf)
  )
}
