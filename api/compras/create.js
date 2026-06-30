import { createClient } from '@supabase/supabase-js'

function getClients(supabaseAccessToken) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error('Supabase nao configurado no servidor.')
  }

  return {
    auth: createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${supabaseAccessToken}`,
        },
      },
    }),
    admin: createClient(supabaseUrl, serviceRoleKey),
  }
}

function parseNumbers(numeros) {
  if (!Array.isArray(numeros) || numeros.length === 0) {
    throw new Error('Selecione pelo menos um numero.')
  }

  const parsed = numeros.map((numero) => Number.parseInt(numero, 10))

  if (parsed.some((numero) => !Number.isInteger(numero) || numero <= 0)) {
    throw new Error('Numeros invalidos.')
  }

  if (new Set(parsed).size !== parsed.length) {
    throw new Error('Existem numeros repetidos na compra.')
  }

  return parsed.sort((a, b) => a - b)
}

function normalizePaymentMethod(paymentMethod) {
  return paymentMethod === 'pix' ? 'pix' : 'mercado_pago'
}

function buildObservation(externalReference, preferenceId, paymentMethod) {
  return JSON.stringify({
    external_reference: externalReference,
    metodo_pagamento: paymentMethod,
    preference_id: preferenceId,
    origem: 'rifamax',
  })
}

async function insertCompra(admin, payload) {
  const withReference = {
    ...payload.base,
    referencia_externa: payload.externalReference,
    preference_id: payload.preferenceId,
  }

  const firstAttempt = await admin.from('compras').insert(withReference).select('*').single()

  if (!firstAttempt.error) {
    return firstAttempt.data
  }

  if (
    !firstAttempt.error.message?.includes('referencia_externa') &&
    !firstAttempt.error.message?.includes('preference_id')
  ) {
    throw firstAttempt.error
  }

  const fallback = await admin.from('compras').insert(payload.base).select('*').single()

  if (fallback.error) throw fallback.error

  return {
    ...fallback.data,
    referencia_externa: payload.externalReference,
    preference_id: payload.preferenceId,
  }
}

async function releaseReservation(admin, rifaId, numeros, userId, compraId) {
  await admin
    .from('numeros_rifa')
    .update({
      vendido: false,
      comprador_id: null,
      data_venda: null,
    })
    .eq('rifa_id', rifaId)
    .eq('comprador_id', userId)
    .in('numero', numeros)

  if (compraId) {
    await admin.from('compra_numeros').delete().eq('compra_id', compraId)
    await admin.from('compras').delete().eq('id', compraId)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metodo nao permitido.' })
  }

  let compraId = null

  try {
    const {
      externalReference,
      numeros,
      paymentMethod,
      preferenceId,
      rifaId,
      supabaseAccessToken,
      valorTotal,
    } = req.body || {}

    if (!supabaseAccessToken) {
      return res.status(401).json({ error: 'Sessao ausente.' })
    }

    if (!rifaId || !externalReference || !preferenceId) {
      return res.status(400).json({ error: 'Dados da compra incompletos.' })
    }

    const selectedNumbers = parseNumbers(numeros)
    const { auth, admin } = getClients(supabaseAccessToken)
    const {
      data: { user },
      error: userError,
    } = await auth.auth.getUser()

    if (userError || !user) {
      return res.status(401).json({ error: 'Sessao invalida.' })
    }

    const { data: rifa, error: rifaError } = await admin
      .from('rifas')
      .select('id, preco, total_numeros, ativa')
      .eq('id', rifaId)
      .single()

    if (rifaError) throw rifaError
    if (!rifa.ativa) throw new Error('Esta rifa ainda nao esta ativa para compra.')

    const expectedTotal = Number((Number(rifa.preco) * selectedNumbers.length).toFixed(2))
    if (Math.abs(Number(valorTotal) - expectedTotal) > 0.01) {
      throw new Error('Valor total da compra nao confere.')
    }

    const metodoPagamento = normalizePaymentMethod(paymentMethod)

    const { data: numberRows, error: numbersError } = await admin
      .from('numeros_rifa')
      .select('id, numero, vendido, comprador_id')
      .eq('rifa_id', rifaId)
      .in('numero', selectedNumbers)

    if (numbersError) throw numbersError

    if ((numberRows || []).length !== selectedNumbers.length) {
      throw new Error('Um ou mais numeros nao existem nesta rifa.')
    }

    const unavailable = numberRows.filter((row) => row.vendido || row.comprador_id)
    if (unavailable.length > 0) {
      throw new Error(`Numeros indisponiveis: ${unavailable.map((row) => row.numero).join(', ')}.`)
    }

    const { data: reservedRows, error: reserveError } = await admin
      .from('numeros_rifa')
      .update({
        vendido: true,
        comprador_id: user.id,
        data_venda: new Date().toISOString(),
      })
      .eq('rifa_id', rifaId)
      .eq('vendido', false)
      .is('comprador_id', null)
      .in('numero', selectedNumbers)
      .select('numero')

    if (reserveError) throw reserveError

    if ((reservedRows || []).length !== selectedNumbers.length) {
      throw new Error('Um ou mais numeros acabaram de ser reservados.')
    }

    const compra = await insertCompra(admin, {
      base: {
        rifa_id: rifaId,
        comprador_id: user.id,
        valor_total: expectedTotal,
        quantidade_numeros: selectedNumbers.length,
        status_pagamento: 'pendente',
        metodo_pagamento: metodoPagamento,
        observacoes: buildObservation(externalReference, preferenceId, metodoPagamento),
      },
      externalReference,
      preferenceId,
    })

    compraId = compra.id

    const { error: compraNumerosError } = await admin.from('compra_numeros').insert(
      selectedNumbers.map((numero) => ({
        compra_id: compra.id,
        rifa_id: rifaId,
        numero,
      })),
    )

    if (compraNumerosError) throw compraNumerosError

    return res.status(200).json({
      compra: {
        ...compra,
        numeros: selectedNumbers,
      },
    })
  } catch (error) {
    const body = req.body || {}
    if (body.rifaId && Array.isArray(body.numeros) && body.supabaseAccessToken) {
      try {
        const { auth, admin } = getClients(body.supabaseAccessToken)
        const {
          data: { user },
        } = await auth.auth.getUser()
        if (user) {
          await releaseReservation(admin, body.rifaId, parseNumbers(body.numeros), user.id, compraId)
        }
      } catch {
        // A resposta principal ja informa o erro original ao usuario.
      }
    }

    return res.status(400).json({ error: error.message || 'Erro ao criar compra.' })
  }
}
import { createClient } from '@supabase/supabase-js'

function getClients(supabaseAccessToken) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error('Supabase nao configurado no servidor.')
  }

  return {
    auth: createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${supabaseAccessToken}`,
        },
      },
    }),
    admin: createClient(supabaseUrl, serviceRoleKey),
  }
}

function parseNumbers(numeros) {
  if (!Array.isArray(numeros) || numeros.length === 0) {
    throw new Error('Selecione pelo menos um numero.')
  }

  const parsed = numeros.map((numero) => Number.parseInt(numero, 10))

  if (parsed.some((numero) => !Number.isInteger(numero) || numero <= 0)) {
    throw new Error('Numeros invalidos.')
  }

  if (new Set(parsed).size !== parsed.length) {
    throw new Error('Existem numeros repetidos na compra.')
  }

  return parsed.sort((a, b) => a - b)
}

function buildObservation(externalReference, preferenceId) {
  return JSON.stringify({
    external_reference: externalReference,
    preference_id: preferenceId,
    origem: 'rifamax',
  })
}

async function insertCompra(admin, payload) {
  const withReference = {
    ...payload.base,
    referencia_externa: payload.externalReference,
    preference_id: payload.preferenceId,
  }

  const firstAttempt = await admin.from('compras').insert(withReference).select('*').single()

  if (!firstAttempt.error) {
    return firstAttempt.data
  }

  if (
    !firstAttempt.error.message?.includes('referencia_externa') &&
    !firstAttempt.error.message?.includes('preference_id')
  ) {
    throw firstAttempt.error
  }

  const fallback = await admin.from('compras').insert(payload.base).select('*').single()

  if (fallback.error) throw fallback.error

  return {
    ...fallback.data,
    referencia_externa: payload.externalReference,
    preference_id: payload.preferenceId,
  }
}

async function releaseReservation(admin, rifaId, numeros, userId, compraId) {
  await admin
    .from('numeros_rifa')
    .update({
      vendido: false,
      comprador_id: null,
      data_venda: null,
    })
    .eq('rifa_id', rifaId)
    .eq('comprador_id', userId)
    .in('numero', numeros)

  if (compraId) {
    await admin.from('compra_numeros').delete().eq('compra_id', compraId)
    await admin.from('compras').delete().eq('id', compraId)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metodo nao permitido.' })
  }

  let compraId = null

  try {
    const {
      externalReference,
      numeros,
      preferenceId,
      rifaId,
      supabaseAccessToken,
      valorTotal,
    } = req.body || {}

    if (!supabaseAccessToken) {
      return res.status(401).json({ error: 'Sessao ausente.' })
    }

    if (!rifaId || !externalReference || !preferenceId) {
      return res.status(400).json({ error: 'Dados da compra incompletos.' })
    }

    const selectedNumbers = parseNumbers(numeros)
    const { auth, admin } = getClients(supabaseAccessToken)
    const {
      data: { user },
      error: userError,
    } = await auth.auth.getUser()

    if (userError || !user) {
      return res.status(401).json({ error: 'Sessao invalida.' })
    }

    const { data: rifa, error: rifaError } = await admin
      .from('rifas')
      .select('id, preco, total_numeros, ativa')
      .eq('id', rifaId)
      .single()

    if (rifaError) throw rifaError
    if (!rifa.ativa) throw new Error('Esta rifa ainda nao esta ativa para compra.')

    const expectedTotal = Number((Number(rifa.preco) * selectedNumbers.length).toFixed(2))
    if (Math.abs(Number(valorTotal) - expectedTotal) > 0.01) {
      throw new Error('Valor total da compra nao confere.')
    }

    const { data: numberRows, error: numbersError } = await admin
      .from('numeros_rifa')
      .select('id, numero, vendido, comprador_id')
      .eq('rifa_id', rifaId)
      .in('numero', selectedNumbers)

    if (numbersError) throw numbersError

    if ((numberRows || []).length !== selectedNumbers.length) {
      throw new Error('Um ou mais numeros nao existem nesta rifa.')
    }

    const unavailable = numberRows.filter((row) => row.vendido || row.comprador_id)
    if (unavailable.length > 0) {
      throw new Error(`Numeros indisponiveis: ${unavailable.map((row) => row.numero).join(', ')}.`)
    }

    const { data: reservedRows, error: reserveError } = await admin
      .from('numeros_rifa')
      .update({
        vendido: true,
        comprador_id: user.id,
        data_venda: new Date().toISOString(),
      })
      .eq('rifa_id', rifaId)
      .eq('vendido', false)
      .is('comprador_id', null)
      .in('numero', selectedNumbers)
      .select('numero')

    if (reserveError) throw reserveError

    if ((reservedRows || []).length !== selectedNumbers.length) {
      throw new Error('Um ou mais numeros acabaram de ser reservados.')
    }

    const compra = await insertCompra(admin, {
      base: {
        rifa_id: rifaId,
        comprador_id: user.id,
        valor_total: expectedTotal,
        quantidade_numeros: selectedNumbers.length,
        status_pagamento: 'pendente',
        metodo_pagamento: 'mercado_pago',
        observacoes: buildObservation(externalReference, preferenceId),
      },
      externalReference,
      preferenceId,
    })

    compraId = compra.id

    const { error: compraNumerosError } = await admin.from('compra_numeros').insert(
      selectedNumbers.map((numero) => ({
        compra_id: compra.id,
        rifa_id: rifaId,
        numero,
      })),
    )

    if (compraNumerosError) throw compraNumerosError

    return res.status(200).json({
      compra: {
        ...compra,
        numeros: selectedNumbers,
      },
    })
  } catch (error) {
    const body = req.body || {}
    if (body.rifaId && Array.isArray(body.numeros) && body.supabaseAccessToken) {
      try {
        const { auth, admin } = getClients(body.supabaseAccessToken)
        const {
          data: { user },
        } = await auth.auth.getUser()
        if (user) {
          await releaseReservation(admin, body.rifaId, parseNumbers(body.numeros), user.id, compraId)
        }
      } catch {
        // A resposta principal ja informa o erro original ao usuario.
      }
    }

    return res.status(400).json({ error: error.message || 'Erro ao criar compra.' })
  }
}
