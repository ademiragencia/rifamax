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

async function ensureAdmin(admin, userId) {
  const { data, error } = await admin
    .from('usuarios')
    .select('id_admin, ativo')
    .eq('id_usuario', userId)
    .maybeSingle()

  if (error) throw error

  if (!data?.id_admin || data.ativo === false) {
    throw new Error('Apenas administradores podem aprovar rifas.')
  }
}

async function updateRifa(admin, rifaId, ativa) {
  const payloadWithApproval = {
    ativa,
    status_aprovacao: ativa ? 'aprovada' : 'reprovada',
  }

  const firstAttempt = await admin.from('rifas').update(payloadWithApproval).eq('id', rifaId).select('*').single()

  if (!firstAttempt.error) {
    return firstAttempt.data
  }

  if (!firstAttempt.error.message?.includes('status_aprovacao')) {
    throw firstAttempt.error
  }

  const fallback = await admin.from('rifas').update({ ativa }).eq('id', rifaId).select('*').single()

  if (fallback.error) throw fallback.error

  return {
    ...fallback.data,
    status_aprovacao: ativa ? 'aprovada' : 'reprovada',
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metodo nao permitido.' })
  }

  try {
    const { rifaId, ativa, supabaseAccessToken } = req.body || {}

    if (!supabaseAccessToken) {
      return res.status(401).json({ error: 'Sessao ausente.' })
    }

    if (!rifaId) {
      return res.status(400).json({ error: 'Rifa nao informada.' })
    }

    const { auth, admin } = getClients(supabaseAccessToken)
    const {
      data: { user },
      error: userError,
    } = await auth.auth.getUser()

    if (userError || !user) {
      return res.status(401).json({ error: 'Sessao invalida.' })
    }

    await ensureAdmin(admin, user.id)

    const rifa = await updateRifa(admin, rifaId, Boolean(ativa))

    return res.status(200).json({ rifa })
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Erro ao atualizar rifa.' })
  }
}
