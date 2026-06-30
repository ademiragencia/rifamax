import { createClient } from '@supabase/supabase-js'

const PAYMENT_API_URL = 'https://api.mercadopago.com/v1/payments'

function normalizePaymentStatus(status) {
  if (status === 'approved') return 'confirmado'
  if (['cancelled', 'rejected', 'refunded', 'charged_back'].includes(status)) return 'falha'
  return status || 'pendente'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metodo nao permitido.' })
  }

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!accessToken || !supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Variaveis de ambiente incompletas.' })
  }

  const { externalReference, paymentId, supabaseAccessToken } = req.body || {}

  if (!externalReference || !paymentId || !supabaseAccessToken) {
    return res.status(400).json({ error: 'Dados de sincronizacao incompletos.' })
  }

  const paymentResponse = await fetch(`${PAYMENT_API_URL}/${paymentId}`, {
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

  if (payment.external_reference !== externalReference) {
    return res.status(409).json({ error: 'Referencia do pagamento nao confere.' })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${supabaseAccessToken}`,
      },
    },
  })

  const status = normalizePaymentStatus(payment.status)
  const { data: compra, error } = await supabase
    .from('compras')
    .update({
      status_pagamento: status,
      id_transacao_mp: String(payment.id),
      data_confirmacao: payment.status === 'approved' ? new Date().toISOString() : null,
    })
    .eq('referencia_externa', externalReference)
    .select('id, rifa_id, comprador_id, compra_numeros(numero)')
    .single()

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  const numeros = (compra.compra_numeros || []).map((item) => item.numero)

  if (numeros.length > 0 && status === 'falha') {
    const { error: releaseError } = await supabase
      .from('numeros_rifa')
      .update({
        vendido: false,
        comprador_id: null,
        data_venda: null,
      })
      .eq('rifa_id', compra.rifa_id)
      .in('numero', numeros)

    if (releaseError) {
      return res.status(400).json({ error: releaseError.message })
    }
  }

  return res.status(200).json({
    ok: true,
    payment_status: payment.status,
    status_pagamento: status,
  })
}
