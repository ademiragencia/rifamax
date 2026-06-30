import { createClient } from '@supabase/supabase-js'

function getConfig() {
  return {
    adminEmail: process.env.ADMIN_EMAIL,
    adminName: process.env.ADMIN_NAME || 'Administrador RifaMax',
    adminPassword: process.env.ADMIN_PASSWORD,
    setupToken: process.env.ADMIN_SETUP_TOKEN,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  }
}

async function findUserByEmail(supabase, email) {
  let page = 1

  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })

    if (error) throw error

    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    if (match) return match
    if (data.users.length < 100) return null

    page += 1
  }

  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metodo nao permitido.' })
  }

  const config = getConfig()
  const requestToken = req.headers['x-admin-setup-token'] || req.body?.setupToken

  if (!config.setupToken || requestToken !== config.setupToken) {
    return res.status(401).json({ error: 'Token de setup invalido.' })
  }

  if (!config.supabaseUrl || !config.serviceRoleKey || !config.adminEmail || !config.adminPassword) {
    return res.status(500).json({ error: 'Variaveis de admin incompletas.' })
  }

  const supabase = createClient(config.supabaseUrl, config.serviceRoleKey)
  const existingUser = await findUserByEmail(supabase, config.adminEmail)

  let authUser = existingUser

  if (!authUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: config.adminEmail,
      password: config.adminPassword,
      email_confirm: true,
      user_metadata: {
        nome: config.adminName,
      },
    })

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    authUser = data.user
  } else {
    const { data, error } = await supabase.auth.admin.updateUserById(authUser.id, {
      email_confirm: true,
      password: config.adminPassword,
      user_metadata: {
        ...(authUser.user_metadata || {}),
        nome: config.adminName,
      },
    })

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    authUser = data.user
  }

  const { error: profileError } = await supabase.from('usuarios').upsert(
    {
      id_usuario: authUser.id,
      nome: config.adminName,
      email: config.adminEmail,
      id_admin: true,
      ativo: true,
    },
    { onConflict: 'id_usuario' },
  )

  if (profileError) {
    return res.status(400).json({ error: profileError.message })
  }

  return res.status(200).json({
    ok: true,
    admin_email: config.adminEmail,
  })
}
