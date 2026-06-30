import { createHmac, timingSafeEqual } from 'node:crypto'

const PAYMENT_API_URL = 'https://api.mercadopago.com/v1/payments'

function parseSignature(signature) {
  return String(signature || '')
    .split(',')
    .reduce((acc, part) => {
      const [key, value] = part.split('=')
      if (key && value) acc[key.trim()] = value.trim()
      return acc
    }, {})
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(left || '', 'hex')
  const rightBuffer = Buffer.from(right || '', 'hex')

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

function validateWebhookSignature(req, dataId) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET

  if (!secret) {
    return { skipped: true }
  }

  const { ts, v1 } = parseSignature(req.headers['x-signature'])
  const requestId = req.headers['x-request-id']

  if (!ts || !v1) {
    return { valid: false, reason: 'Assinatura ausente.' }
  }

  const manifestParts = []

  if (dataId) {
    manifestParts.push(`id:${String(dataId).toLowerCase()}`)
  }

  if (requestId) {
    manifestParts.push(`request-id:${requestId}`)
  }

  manifestParts.push(`ts:${ts}`)

  const manifest = `${manifestParts.join(';')};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')

  return { valid: safeCompare(expected, v1) }
}

async function updateSupabasePurchase(payment) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const externalReference = payment.external_reference

  if (!supabaseUrl || !serviceRoleKey || !externalReference) {
    return { skipped: true }
  }

  const status = payment.status === 'approved' ? 'confirmado' : payment.status || 'pendente'

  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, '')}/rest/v1/compras?referencia_externa=eq.${encodeURIComponent(externalReference)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        status_pagamento: status,
        id_transacao_mp: String(payment.id),
        data_confirmacao: payment.status === 'approved' ? new Date().toISOString() : null,
      }),
    },
  )

  if (!response.ok) {
    return { skipped: false, error: await response.text() }
  }

  return { skipped: false, updated: true }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metodo nao permitido.' })
  }

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN

  if (!accessToken) {
    return res.status(500).json({ error: 'MERCADO_PAGO_ACCESS_TOKEN nao configurado.' })
  }

  const dataId = req.query?.['data.id'] || req.query?.data_id || req.body?.data?.id || req.body?.id
  const eventType = req.query?.type || req.body?.type || req.query?.topic
  const signature = validateWebhookSignature(req, dataId)

  if (signature.valid === false) {
    return res.status(401).json({ error: signature.reason || 'Assinatura invalida.' })
  }

  if (!dataId || (eventType && eventType !== 'payment')) {
    return res.status(200).json({ received: true, ignored: true })
  }

  const paymentResponse = await fetch(`${PAYMENT_API_URL}/${dataId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const payment = await paymentResponse.json()

  if (!paymentResponse.ok) {
    return res.status(paymentResponse.status).json({
      error: payment.message || 'Erro ao consultar pagamento.',
      details: payment,
    })
  }

  const supabase = await updateSupabasePurchase(payment)

  return res.status(200).json({
    received: true,
    payment_id: payment.id,
    payment_status: payment.status,
    external_reference: payment.external_reference,
    signature_skipped: Boolean(signature.skipped),
    supabase,
  })
}
