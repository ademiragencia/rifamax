const MP_API_URL = 'https://api.mercadopago.com/checkout/preferences'

function getBaseUrl(req) {
  const configuredUrl = process.env.APP_URL || process.env.VITE_APP_URL

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '')
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  const protocol = req.headers['x-forwarded-proto'] || 'http'
  const host = req.headers.host
  return `${protocol}://${host}`
}

function parseMoney(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : null
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

  const {
    buyerEmail,
    buyerName,
    externalReference,
    numeros,
    paymentMethod,
    premioDescricao,
    rifaId,
    rifaNome,
    unitPrice,
  } = req.body || {}

  if (!rifaId || !rifaNome || !externalReference) {
    return res.status(400).json({ error: 'Dados da rifa incompletos.' })
  }

  if (!Array.isArray(numeros) || numeros.length === 0) {
    return res.status(400).json({ error: 'Selecione pelo menos um numero.' })
  }

  const price = parseMoney(unitPrice)

  if (!price) {
    return res.status(400).json({ error: 'Preco invalido.' })
  }

  const baseUrl = getBaseUrl(req)
  const hasPublicHttpsUrl = baseUrl.startsWith('https://')
  const returnParams = `external_reference=${encodeURIComponent(externalReference)}`
  const notificationUrl = hasPublicHttpsUrl
    ? `${baseUrl}/api/mercadopago/webhook?source_news=webhooks`
    : undefined
  const normalizedPaymentMethod = paymentMethod === 'pix' ? 'pix' : 'mercado_pago'

  const preference = {
    external_reference: externalReference,
    items: [
      {
        id: String(rifaId),
        title: `RifaMax - ${rifaNome}`.slice(0, 256),
        description: `${premioDescricao || 'Rifa online'} | Numeros: ${numeros.join(', ')}`.slice(0, 600),
        quantity: numeros.length,
        unit_price: price,
        currency_id: 'BRL',
      },
    ],
    metadata: {
      external_reference: externalReference,
      numeros: numeros.join(','),
      payment_method: normalizedPaymentMethod,
      rifa_id: String(rifaId),
      rifa_nome: String(rifaNome),
    },
    payer: {
      email: buyerEmail || undefined,
      name: buyerName || undefined,
    },
  }

  if (normalizedPaymentMethod === 'pix') {
    preference.payment_methods = {
      excluded_payment_types: [
        { id: 'credit_card' },
        { id: 'debit_card' },
        { id: 'ticket' },
        { id: 'atm' },
        { id: 'prepaid_card' },
      ],
      installments: 1,
    }
  }

  if (hasPublicHttpsUrl) {
    preference.auto_return = 'approved'
    preference.back_urls = {
      success: `${baseUrl}/?payment=success&${returnParams}`,
      failure: `${baseUrl}/?payment=failure&${returnParams}`,
      pending: `${baseUrl}/?payment=pending&${returnParams}`,
    }
  }

  if (notificationUrl) {
    preference.notification_url = notificationUrl
  }

  const mpResponse = await fetch(MP_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(preference),
  })

  const result = await mpResponse.json()

  if (!mpResponse.ok) {
    return res.status(mpResponse.status).json({
      error: result.message || 'Erro ao criar preferencia no Mercado Pago.',
      details: result,
    })
  }

  return res.status(200).json({
    id: result.id,
    init_point: result.init_point,
    sandbox_init_point: result.sandbox_init_point,
  })
}
const MP_API_URL = 'https://api.mercadopago.com/checkout/preferences'

function getBaseUrl(req) {
  const configuredUrl = process.env.APP_URL || process.env.VITE_APP_URL

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '')
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  const protocol = req.headers['x-forwarded-proto'] || 'http'
  const host = req.headers.host
  return `${protocol}://${host}`
}

function parseMoney(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : null
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

  const {
    buyerEmail,
    buyerName,
    externalReference,
    numeros,
    premioDescricao,
    rifaId,
    rifaNome,
    unitPrice,
  } = req.body || {}

  if (!rifaId || !rifaNome || !externalReference) {
    return res.status(400).json({ error: 'Dados da rifa incompletos.' })
  }

  if (!Array.isArray(numeros) || numeros.length === 0) {
    return res.status(400).json({ error: 'Selecione pelo menos um numero.' })
  }

  const price = parseMoney(unitPrice)

  if (!price) {
    return res.status(400).json({ error: 'Preco invalido.' })
  }

  const baseUrl = getBaseUrl(req)
  const hasPublicHttpsUrl = baseUrl.startsWith('https://')
  const returnParams = `external_reference=${encodeURIComponent(externalReference)}`
  const notificationUrl = hasPublicHttpsUrl
    ? `${baseUrl}/api/mercadopago/webhook?source_news=webhooks`
    : undefined

  const preference = {
    external_reference: externalReference,
    items: [
      {
        id: String(rifaId),
        title: `RifaMax - ${rifaNome}`.slice(0, 256),
        description: `${premioDescricao || 'Rifa online'} | Numeros: ${numeros.join(', ')}`.slice(0, 600),
        quantity: numeros.length,
        unit_price: price,
        currency_id: 'BRL',
      },
    ],
    metadata: {
      external_reference: externalReference,
      numeros: numeros.join(','),
      rifa_id: String(rifaId),
      rifa_nome: String(rifaNome),
    },
    payer: {
      email: buyerEmail || undefined,
      name: buyerName || undefined,
    },
  }

  if (hasPublicHttpsUrl) {
    preference.auto_return = 'approved'
    preference.back_urls = {
      success: `${baseUrl}/?payment=success&${returnParams}`,
      failure: `${baseUrl}/?payment=failure&${returnParams}`,
      pending: `${baseUrl}/?payment=pending&${returnParams}`,
    }
  }

  if (notificationUrl) {
    preference.notification_url = notificationUrl
  }

  const mpResponse = await fetch(MP_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(preference),
  })

  const result = await mpResponse.json()

  if (!mpResponse.ok) {
    return res.status(mpResponse.status).json({
      error: result.message || 'Erro ao criar preferencia no Mercado Pago.',
      details: result,
    })
  }

  return res.status(200).json({
    id: result.id,
    init_point: result.init_point,
    sandbox_init_point: result.sandbox_init_point,
  })
}
