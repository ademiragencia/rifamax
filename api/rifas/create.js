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

function normalizeRifaPayload(body) {
  const preco = Number(body.preco)
  const totalNumeros = Number.parseInt(body.total_numeros, 10)

  if (!body.nome?.trim()) throw new Error('Informe o nome da rifa.')
  if (!body.premio_descricao?.trim()) throw new Error('Informe a descricao do premio.')
  if (!Number.isFinite(preco) || preco <= 0) throw new Error('Informe um preco valido.')
  if (!Number.isInteger(totalNumeros) || totalNumeros < 10 || totalNumeros > 500) {
    throw new Error('Use entre 10 e 500 numeros.')
  }

  return {
    descricao: body.descricao?.trim() || '',
    imagem: body.imagem?.trim() || '',
    nome: body.nome.trim(),
    preco,
    premio_descricao: body.premio_descricao.trim(),
    total_numeros: totalNumeros,
    data_termino: body.data_termino || null,
  }
}

async function getProfile(admin, userId) {
  const { data, error } = await admin
    .from('usuarios')
    .select('id_admin, ativo')
    .eq('id_usuario', userId)
    .maybeSingle()

  if (error) throw error

  return data
}

async function insertRifa(admin, payload, userId, isAdmin) {
  const baseRow = {
    ...payload,
    ativa: isAdmin,
    criador_id: userId,
  }

  const approvalStatus = isAdmin ? 'aprovada' : 'pendente'
  const withApproval = {
    ...baseRow,
    status_aprovacao: approvalStatus,
  }

  const firstAttempt = await admin.from('rifas').insert(withApproval).select('*').single()

  if (!firstAttempt.error) {
    return firstAttempt.data
  }

  if (!firstAttempt.error.message?.includes('status_aprovacao')) {
    throw firstAttempt.error
  }

  const fallback = await admin.from('rifas').insert(baseRow).select('*').single()

  if (fallback.error) throw fallback.error

  return {
    ...fallback.data,
    status_aprovacao: approvalStatus,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metodo nao permitido.' })
  }

  try {
    const { supabaseAccessToken, rifa } = req.body || {}

    if (!supabaseAccessToken) {
      return res.status(401).json({ error: 'Sessao ausente.' })
    }

    const { auth, admin } = getClients(supabaseAccessToken)
    const {
      data: { user },
      error: userError,
    } = await auth.auth.getUser()

    if (userError || !user) {
      return res.status(401).json({ error: 'Sessao invalida.' })
    }

    const profile = await getProfile(admin, user.id)
    const isAdmin = Boolean(profile?.id_admin && profile?.ativo !== false)
    const payload = normalizeRifaPayload(rifa || {})
    const createdRifa = await insertRifa(admin, payload, user.id, isAdmin)
    const numeros = Array.from({ length: payload.total_numeros }, (_, index) => ({
      rifa_id: createdRifa.id,
      numero: index + 1,
      vendido: false,
    }))

    const { error: numerosError } = await admin.from('numeros_rifa').insert(numeros)

    if (numerosError) {
      await admin.from('rifas').delete().eq('id', createdRifa.id)
      throw numerosError
    }

    return res.status(200).json({
      rifa: createdRifa,
      status_aprovacao: createdRifa.status_aprovacao,
    })
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Erro ao criar rifa.' })
  }
}
