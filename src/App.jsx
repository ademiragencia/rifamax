import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  Banknote,
  CalendarDays,
  Check,
  ChevronLeft,
  CircleDollarSign,
  LayoutDashboard,
  LogIn,
  LogOut,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Ticket,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { hasSupabaseConfig, supabase } from './lib/supabaseClient'
import './App.css'

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const demoUsers = [
  {
    id: 'admin-demo',
    nome: 'Admin RifaMax',
    email: 'admin@rifamax.com',
    password: 'admin123',
    id_admin: true,
    data_criacao: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 'cliente-demo',
    nome: 'Cliente Demo',
    email: 'cliente@rifamax.com',
    password: 'cliente123',
    id_admin: false,
    data_criacao: '2026-06-02T10:00:00.000Z',
  },
]

const demoRifas = [
  {
    id: 'rifa-console',
    nome: 'Console gamer completo',
    descricao: 'Console novo com dois controles, assinatura premium e entrega nacional.',
    imagem:
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80',
    preco: 12.5,
    total_numeros: 120,
    premio_descricao: 'Console de ultima geracao com kit de jogos',
    criador_id: 'admin-demo',
    ativa: true,
    status_aprovacao: 'aprovada',
    data_termino: '2026-08-15',
    data_criacao: '2026-06-11T14:00:00.000Z',
  },
  {
    id: 'rifa-smartphone',
    nome: 'Smartphone premium',
    descricao: 'Aparelho lacrado, 256 GB, garantia nacional e capa inclusa.',
    imagem:
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1200&q=80',
    preco: 9,
    total_numeros: 100,
    premio_descricao: 'Smartphone premium 256 GB',
    criador_id: 'admin-demo',
    ativa: true,
    status_aprovacao: 'aprovada',
    data_termino: '2026-07-28',
    data_criacao: '2026-06-10T14:00:00.000Z',
  },
  {
    id: 'rifa-sneaker',
    nome: 'Sneaker colecionavel',
    descricao: 'Modelo exclusivo para quem curte estilo, conforto e sorteio rapido.',
    imagem:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
    preco: 6,
    total_numeros: 80,
    premio_descricao: 'Sneaker original no tamanho escolhido',
    criador_id: 'admin-demo',
    ativa: true,
    status_aprovacao: 'aprovada',
    data_termino: '2026-07-12',
    data_criacao: '2026-06-09T14:00:00.000Z',
  },
]

const demoCompras = [
  {
    id: 'compra-001',
    rifa_id: 'rifa-console',
    comprador_id: 'cliente-demo',
    comprador_nome: 'Cliente Demo',
    numeros: [3, 14, 27, 88],
    valor_total: 50,
    quantidade_numeros: 4,
    status_pagamento: 'confirmado',
    metodo_pagamento: 'simulado',
    data_compra: '2026-06-18T12:20:00.000Z',
  },
  {
    id: 'compra-002',
    rifa_id: 'rifa-smartphone',
    comprador_id: 'cliente-demo',
    comprador_nome: 'Cliente Demo',
    numeros: [6, 19, 41],
    valor_total: 27,
    quantidade_numeros: 3,
    status_pagamento: 'confirmado',
    metodo_pagamento: 'simulado',
    data_compra: '2026-06-19T09:40:00.000Z',
  },
  {
    id: 'compra-003',
    rifa_id: 'rifa-sneaker',
    comprador_id: 'admin-demo',
    comprador_nome: 'Admin RifaMax',
    numeros: [4, 8, 12, 24, 48],
    valor_total: 30,
    quantidade_numeros: 5,
    status_pagamento: 'confirmado',
    metodo_pagamento: 'simulado',
    data_compra: '2026-06-20T16:10:00.000Z',
  },
]

const emptyRifa = {
  nome: '',
  descricao: '',
  imagem: '',
  preco: '',
  total_numeros: '',
  data_termino: '',
  premio_descricao: '',
}

function buildDemoNumerosRifa() {
  const vendidos = new Set(demoCompras.flatMap((compra) => compra.numeros.map((numero) => `${compra.rifa_id}:${numero}`)))

  return demoRifas.flatMap((rifa) =>
    Array.from({ length: rifa.total_numeros }, (_, index) => {
      const numero = index + 1

      return {
        id: `${rifa.id}-${numero}`,
        rifa_id: rifa.id,
        numero,
        vendido: vendidos.has(`${rifa.id}:${numero}`),
      }
    }),
  )
}

function createId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? JSON.parse(saved) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue]
}

function isBlockingPurchase(compra) {
  return !['falha', 'reembolso', 'cancelado'].includes(normalizePaymentStatus(compra.status_pagamento))
}

function getSoldNumbers(compras, rifaId, numerosRifa = []) {
  return new Set(
    [
      ...compras
      .filter((compra) => compra.rifa_id === rifaId && isBlockingPurchase(compra))
      .flatMap((compra) => compra.numeros),
      ...numerosRifa
        .filter((numero) => numero.rifa_id === rifaId && numero.vendido)
        .map((numero) => numero.numero),
    ],
  )
}

function getRifaStats(rifa, compras, numerosRifa = []) {
  const soldNumbers = getSoldNumbers(compras, rifa.id, numerosRifa)
  const vendidos = soldNumbers.size
  const disponiveis = Math.max(rifa.total_numeros - vendidos, 0)
  const percentual = rifa.total_numeros > 0 ? Math.round((vendidos / rifa.total_numeros) * 100) : 0
  const receita = [...soldNumbers].length * rifa.preco

  return { vendidos, disponiveis, percentual, receita }
}

function formatDate(value) {
  if (!value) return 'Sem data'

  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value))
}

function normalizePaymentStatus(status) {
  const value = String(status || '').toLowerCase()

  if (['approved', 'success', 'confirmado'].includes(value)) return 'confirmado'
  if (['pending', 'in_process', 'in_mediation', 'pendente'].includes(value)) return 'pendente'
  if (['rejected', 'cancelled', 'failure', 'falha'].includes(value)) return 'falha'
  return value || 'pendente'
}

function getPaymentStatusLabel(status) {
  const normalized = normalizePaymentStatus(status)

  if (normalized === 'confirmado') return 'Confirmado'
  if (normalized === 'falha') return 'Falhou'
  return 'Pendente'
}

function getRifaApprovalStatus(rifa) {
  return rifa?.status_aprovacao || 'aprovada'
}

function isRifaPublic(rifa) {
  return Boolean(rifa?.ativa) && getRifaApprovalStatus(rifa) === 'aprovada'
}

function getRifaStatusMeta(rifa) {
  const approvalStatus = getRifaApprovalStatus(rifa)

  if (approvalStatus === 'pendente') {
    return { className: 'status-pill pendente', label: 'Pendente' }
  }

  if (approvalStatus === 'reprovada') {
    return { className: 'status-pill falha', label: 'Reprovada' }
  }

  if (!rifa.ativa) {
    return { className: 'status-pill muted-status', label: 'Inativa' }
  }

  return { className: 'status-pill success', label: 'Ativa' }
}

function sortNumbers(numbers) {
  return [...numbers].sort((a, b) => a - b)
}

export default function App() {
  const isRemoteMode = hasSupabaseConfig && Boolean(supabase)
  const [usuarios, setUsuarios] = usePersistentState('rifamax:usuarios', demoUsers)
  const [rifas, setRifas] = usePersistentState('rifamax:rifas', demoRifas)
  const [compras, setCompras] = usePersistentState('rifamax:compras', demoCompras)
  const [numerosRifa, setNumerosRifa] = usePersistentState('rifamax:numeros', buildDemoNumerosRifa())
  const [currentUserId, setCurrentUserId] = usePersistentState('rifamax:sessao', '')
  const [view, setView] = useState('rifas')
  const [selectedRifaId, setSelectedRifaId] = useState(demoRifas[0].id)
  const [selectedNumbers, setSelectedNumbers] = useState([])
  const [search, setSearch] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registroForm, setRegistroForm] = useState({ nome: '', email: '', password: '', confirm: '' })
  const [novaRifa, setNovaRifa] = useState(emptyRifa)
  const [message, setMessage] = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [remoteLoading, setRemoteLoading] = useState(false)

  const user = useMemo(
    () => usuarios.find((usuario) => usuario.id === currentUserId) || null,
    [currentUserId, usuarios],
  )

  const isAdmin = Boolean(user?.id_admin)
  const selectedRifa = rifas.find((rifa) => rifa.id === selectedRifaId) || rifas[0]

  const visibleRifas = useMemo(() => {
    const term = search.trim().toLowerCase()

    return rifas
      .filter(isRifaPublic)
      .filter((rifa) => {
        if (!term) return true
        return [rifa.nome, rifa.descricao, rifa.premio_descricao].some((value) =>
          value.toLowerCase().includes(term),
        )
      })
  }, [rifas, search])

  const minhasCompras = useMemo(() => {
    if (!user) return []
    return compras
      .filter((compra) => compra.comprador_id === user.id)
      .sort((a, b) => new Date(b.data_compra) - new Date(a.data_compra))
  }, [compras, user])

  const dashboardStats = useMemo(() => {
    const totalReceita = compras.reduce((sum, compra) => sum + compra.valor_total, 0)
    const totalNumeros = rifas.reduce(
      (sum, rifa) => sum + getSoldNumbers(compras, rifa.id, numerosRifa).size,
      0,
    )
    const compradores = new Set(compras.map((compra) => compra.comprador_id)).size

    return {
      rifas: rifas.length,
      ativas: rifas.filter(isRifaPublic).length,
      totalReceita,
      totalNumeros,
      compradores,
    }
  }, [compras, numerosRifa, rifas])

  useEffect(() => {
    if (!message) return undefined

    const timeout = window.setTimeout(() => setMessage(''), 3500)
    return () => window.clearTimeout(timeout)
  }, [message])

  useEffect(() => {
    setSelectedNumbers([])
  }, [selectedRifaId])

  useEffect(() => {
    if (!isRemoteMode) return undefined

    let active = true

    async function bootstrapRemoteData() {
      setRemoteLoading(true)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const profile = session?.user ? await applyRemoteUser(session.user) : null

        if (!session?.user) {
          setUsuarios([])
          setCurrentUserId('')
          setCompras([])
        }

        if (active) {
          await carregarDadosRemotos(profile)
        }
      } catch (error) {
        notify(error.message || 'Erro ao carregar dados do Supabase.')
      } finally {
        if (active) setRemoteLoading(false)
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return

      const profile = session?.user ? await applyRemoteUser(session.user) : null

      if (!session?.user) {
        setUsuarios([])
        setCurrentUserId('')
        setCompras([])
      }

      await carregarDadosRemotos(profile)
    })

    bootstrapRemoteData()

    return () => {
      active = false
      subscription.unsubscribe()
    }
    // Dados remotos devem ser inicializados apenas quando o modo Supabase muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRemoteMode])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const externalReference = params.get('external_reference')
    const rawStatus = params.get('status') || params.get('collection_status') || params.get('payment')
    const paymentId = params.get('payment_id') || params.get('collection_id')

    if (!externalReference || !rawStatus) return

    async function syncPaymentReturn() {
      let nextStatus = normalizePaymentStatus(rawStatus)

      if (isRemoteMode && paymentId) {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.access_token) {
          const response = await fetch('/api/mercadopago/sync-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              externalReference,
              paymentId,
              supabaseAccessToken: session.access_token,
            }),
          })

          const result = await response.json().catch(() => ({}))

          if (response.ok && result.status_pagamento) {
            nextStatus = result.status_pagamento
          }
        }
      }

      setCompras((current) =>
        current.map((compra) =>
          compra.external_reference === externalReference
            ? {
                ...compra,
                id_transacao_mp: paymentId || compra.id_transacao_mp,
                status_pagamento: nextStatus,
              }
            : compra,
        ),
      )

      await carregarDadosRemotos()
      goTo('minhas-compras')
      notify(
        nextStatus === 'confirmado'
          ? 'Pagamento aprovado pelo Mercado Pago.'
          : 'Recebemos o retorno do Mercado Pago. A compra esta pendente ou precisa de revisao.',
      )
      window.history.replaceState({}, '', window.location.pathname)
    }

    syncPaymentReturn().catch((error) => {
      notify(error.message || 'Nao foi possivel sincronizar o pagamento.')
    })
    // Sincronizacao acontece somente quando a URL de retorno muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCompras])

  function notify(text) {
    setMessage(text)
  }

  function goTo(nextView) {
    setView(nextView)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function mapRemoteProfile(row, authUser) {
    return {
      id: authUser.id,
      perfil_id: row?.id,
      id_usuario: authUser.id,
      nome: row?.nome || authUser.user_metadata?.nome || authUser.email,
      email: row?.email || authUser.email,
      id_admin: Boolean(row?.id_admin),
      data_criacao: row?.data_criacao || authUser.created_at,
    }
  }

  function mapRemoteCompra(row) {
    return {
      id: row.id,
      rifa_id: row.rifa_id,
      comprador_id: row.comprador_id,
      comprador_nome: row.usuarios?.nome || row.comprador_nome || 'Cliente',
      numeros: sortNumbers((row.compra_numeros || []).map((item) => item.numero)),
      valor_total: Number(row.valor_total || 0),
      quantidade_numeros: row.quantidade_numeros,
      status_pagamento: row.status_pagamento,
      metodo_pagamento: row.metodo_pagamento,
      external_reference: row.referencia_externa,
      preference_id: row.preference_id,
      id_transacao_mp: row.id_transacao_mp,
      data_compra: row.data_compra,
    }
  }

  async function applyRemoteUser(authUser) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id_usuario', authUser.id)
      .maybeSingle()

    if (error) throw error

    let profile = data

    if (!profile) {
      const { data: inserted, error: insertError } = await supabase
        .from('usuarios')
        .insert({
          id_usuario: authUser.id,
          nome: authUser.user_metadata?.nome || authUser.email,
          email: authUser.email,
        })
        .select('*')
        .single()

      if (insertError) throw insertError
      profile = inserted
    }

    const mappedProfile = mapRemoteProfile(profile, authUser)

    setUsuarios([mappedProfile])
    setCurrentUserId(authUser.id)

    return mappedProfile
  }

  async function carregarDadosRemotos(profile = user) {
    if (!isRemoteMode) return

    const { data: rifasData, error: rifasError } = await supabase
      .from('rifas')
      .select('*')
      .order('data_criacao', { ascending: false })

    if (rifasError) throw rifasError

    const { data: numerosData, error: numerosError } = await supabase
      .from('numeros_rifa')
      .select('id, rifa_id, numero, vendido, comprador_id, data_venda')
      .order('numero', { ascending: true })

    if (numerosError) throw numerosError

    setRifas((rifasData || []).map((rifa) => ({ ...rifa, preco: Number(rifa.preco) })))
    setNumerosRifa(numerosData || [])

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      setCompras([])
      return
    }

    let comprasQuery = supabase
      .from('compras')
      .select('*, compra_numeros(numero)')
      .order('data_compra', { ascending: false })

    if (!profile?.id_admin) {
      comprasQuery = comprasQuery.eq('comprador_id', authUser.id)
    }

    const { data: comprasData, error: comprasError } = await comprasQuery

    if (comprasError) throw comprasError

    setCompras((comprasData || []).map(mapRemoteCompra))
  }

  async function loginAs(email, password) {
    if (isRemoteMode) {
      notify('Os acessos demo ficam desativados no modo publico. Use uma conta real.')
      return false
    }

    const match = usuarios.find(
      (usuario) => usuario.email === normalizeEmail(email) && usuario.password === password,
    )

    if (!match) {
      notify('Email ou senha invalidos.')
      return false
    }

    setCurrentUserId(match.id)
    setLoginForm({ email: '', password: '' })
    goTo('rifas')
    notify(`Bem-vindo, ${match.nome}.`)
    return true
  }

  async function handleLogin(event) {
    event.preventDefault()

    if (!isRemoteMode) {
      await loginAs(loginForm.email, loginForm.password)
      return
    }

    try {
      setRemoteLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizeEmail(loginForm.email),
        password: loginForm.password,
      })

      if (error) throw error

      const profile = await applyRemoteUser(data.user)
      await carregarDadosRemotos(profile)
      setLoginForm({ email: '', password: '' })
      goTo('rifas')
      notify(`Bem-vindo, ${profile.nome}.`)
    } catch (error) {
      const errorMessage = String(error.message || '')
      notify(
        errorMessage.toLowerCase().includes('email not confirmed')
          ? 'Seu email ainda precisa ser confirmado no Supabase antes do login.'
          : error.message || 'Erro ao fazer login.',
      )
    } finally {
      setRemoteLoading(false)
    }
  }

  async function handleRegistro(event) {
    event.preventDefault()

    const email = normalizeEmail(registroForm.email)
    if (registroForm.password !== registroForm.confirm) {
      notify('As senhas nao coincidem.')
      return
    }

    if (isRemoteMode) {
      try {
        setRemoteLoading(true)
        const { data, error } = await supabase.auth.signUp({
          email,
          password: registroForm.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              nome: registroForm.nome.trim(),
            },
          },
        })

        if (error) throw error

        if (data.session?.user) {
          const profile = await applyRemoteUser(data.session.user)
          await carregarDadosRemotos(profile)
          setRegistroForm({ nome: '', email: '', password: '', confirm: '' })
          goTo('rifas')
          notify('Conta criada. Voce ja pode comprar numeros.')
        } else {
          setAuthMode('login')
          setLoginForm((current) => ({ ...current, email }))
          notify('Cadastro criado. Confirme seu email antes de entrar.')
        }
      } catch (error) {
        notify(error.message || 'Erro ao criar conta.')
      } finally {
        setRemoteLoading(false)
      }

      return
    }

    if (usuarios.some((usuario) => usuario.email === email)) {
      notify('Este email ja esta cadastrado.')
      return
    }

    const novoUsuario = {
      id: createId('usuario'),
      nome: registroForm.nome.trim(),
      email,
      password: registroForm.password,
      id_admin: false,
      data_criacao: new Date().toISOString(),
    }

    setUsuarios((current) => [...current, novoUsuario])
    setCurrentUserId(novoUsuario.id)
    setRegistroForm({ nome: '', email: '', password: '', confirm: '' })
    goTo('rifas')
    notify('Conta criada. Voce ja pode comprar numeros.')
  }

  async function logout() {
    if (isRemoteMode) {
      await supabase.auth.signOut()
      setUsuarios([])
      setCompras([])
    }

    setCurrentUserId('')
    goTo('rifas')
    notify('Sessao encerrada.')
  }

  function openCompra(rifaId) {
    if (!user) {
      setAuthMode('login')
      goTo('auth')
      notify('Entre ou crie uma conta para comprar numeros.')
      return
    }

    setSelectedRifaId(rifaId)
    goTo('comprar')
  }

  function toggleNumero(numero) {
    if (!selectedRifa) return

    const vendidos = getSoldNumbers(compras, selectedRifa.id, numerosRifa)
    if (vendidos.has(numero)) return

    setSelectedNumbers((current) =>
      current.includes(numero)
        ? current.filter((item) => item !== numero)
        : sortNumbers([...current, numero]),
    )
  }

  async function confirmarCompra() {
    if (!user) {
      setAuthMode('login')
      goTo('auth')
      notify('Entre para finalizar a compra.')
      return
    }

    if (!selectedRifa || selectedNumbers.length === 0) {
      notify('Selecione pelo menos um numero.')
      return
    }

    const vendidos = getSoldNumbers(compras, selectedRifa.id, numerosRifa)
    const conflitos = selectedNumbers.filter((numero) => vendidos.has(numero))
    if (conflitos.length > 0) {
      setSelectedNumbers((current) => current.filter((numero) => !vendidos.has(numero)))
      notify(`Os numeros ${conflitos.join(', ')} acabaram de ser vendidos.`)
      return
    }

    const numeros = sortNumbers(selectedNumbers)
    const valorTotal = Number((numeros.length * selectedRifa.preco).toFixed(2))
    const externalReference = createId('mp')

    setPaymentLoading(true)

    try {
      const response = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buyerEmail: user.email,
          buyerName: user.nome,
          externalReference,
          numeros,
          premioDescricao: selectedRifa.premio_descricao,
          rifaId: selectedRifa.id,
          rifaNome: selectedRifa.nome,
          unitPrice: selectedRifa.preco,
        }),
      })

      const rawResponse = await response.text()
      let preference = {}

      try {
        preference = rawResponse ? JSON.parse(rawResponse) : {}
      } catch {
        preference = { error: rawResponse || 'Resposta invalida do servidor de pagamento.' }
      }

      if (!response.ok) {
        throw new Error(preference.error || 'Nao foi possivel iniciar o pagamento.')
      }

      if (!preference.init_point) {
        throw new Error('O Mercado Pago nao retornou o link de checkout.')
      }

      const novaCompra = {
        id: createId('compra'),
        rifa_id: selectedRifa.id,
        comprador_id: user.id,
        comprador_nome: user.nome,
        numeros,
        valor_total: valorTotal,
        quantidade_numeros: numeros.length,
        status_pagamento: 'pendente',
        metodo_pagamento: 'mercado_pago',
        external_reference: externalReference,
        preference_id: preference.id,
        data_compra: new Date().toISOString(),
      }

      if (isRemoteMode) {
        const { data: compraCriada, error: compraError } = await supabase.rpc('criar_compra_mercado_pago', {
          p_rifa_id: selectedRifa.id,
          p_numeros: numeros,
          p_valor_total: valorTotal,
          p_referencia_externa: externalReference,
          p_preference_id: preference.id,
        })

        if (compraError) throw compraError

        const compra = Array.isArray(compraCriada) ? compraCriada[0] : compraCriada
        if (!compra?.id) {
          throw new Error('A compra foi reservada, mas o banco nao retornou o comprovante.')
        }

        novaCompra.id = compra.id
      }

      setCompras((current) => [novaCompra, ...current])
      setNumerosRifa((current) =>
        current.map((item) =>
          item.rifa_id === selectedRifa.id && numeros.includes(item.numero)
            ? { ...item, vendido: true, comprador_id: user.id }
            : item,
        ),
      )
      setSelectedNumbers([])
      window.location.href = preference.init_point
    } catch (error) {
      notify(error.message || 'Erro ao iniciar pagamento no Mercado Pago.')
    } finally {
      setPaymentLoading(false)
    }
  }

  async function handleCriarRifa(event) {
    event.preventDefault()

    if (!user) {
      setAuthMode('login')
      goTo('auth')
      notify('Entre para cadastrar uma rifa.')
      return
    }

    const preco = Number(novaRifa.preco)
    const totalNumeros = Number.parseInt(novaRifa.total_numeros, 10)

    if (!Number.isFinite(preco) || preco <= 0) {
      notify('Informe um preco valido.')
      return
    }

    if (!Number.isInteger(totalNumeros) || totalNumeros < 10 || totalNumeros > 500) {
      notify('Use entre 10 e 500 numeros para manter a grade legivel.')
      return
    }

    const rifaPayload = {
      nome: novaRifa.nome.trim(),
      descricao: novaRifa.descricao.trim(),
      imagem: novaRifa.imagem.trim(),
      preco,
      total_numeros: totalNumeros,
      premio_descricao: novaRifa.premio_descricao.trim(),
      criador_id: user.id,
      ativa: !isRemoteMode || isAdmin,
      status_aprovacao: !isRemoteMode || isAdmin ? 'aprovada' : 'pendente',
      data_termino: novaRifa.data_termino,
    }

    try {
      if (isRemoteMode) {
        setRemoteLoading(true)

        const {
          data: { session },
        } = await supabase.auth.getSession()

        const response = await fetch('/api/rifas/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rifa: rifaPayload,
            supabaseAccessToken: session?.access_token,
          }),
        })

        const result = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao criar rifa.')
        }

        await carregarDadosRemotos(user)
      } else {
        const rifa = {
          ...rifaPayload,
          id: createId('rifa'),
          data_criacao: new Date().toISOString(),
        }

        setRifas((current) => [rifa, ...current])
        setNumerosRifa((current) => [
          ...Array.from({ length: totalNumeros }, (_, index) => ({
            id: `${rifa.id}-${index + 1}`,
            rifa_id: rifa.id,
            numero: index + 1,
            vendido: false,
          })),
          ...current,
        ])
      }

      setNovaRifa(emptyRifa)
      goTo(isAdmin ? 'admin' : 'rifas')
      notify(isAdmin ? 'Rifa criada e aprovada.' : 'Rifa enviada para aprovacao do administrador.')
    } catch (error) {
      notify(error.message || 'Erro ao criar rifa.')
    } finally {
      setRemoteLoading(false)
    }
  }

  async function toggleRifaStatus(rifaId) {
    const rifaAtual = rifas.find((rifa) => rifa.id === rifaId)
    if (!rifaAtual) return

    const isPending = getRifaApprovalStatus(rifaAtual) === 'pendente'
    const updatePayload = isPending
      ? { ativa: true, status_aprovacao: 'aprovada' }
      : { ativa: !rifaAtual.ativa }

    if (isRemoteMode) {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const response = await fetch('/api/rifas/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ativa: updatePayload.ativa,
          rifaId,
          supabaseAccessToken: session?.access_token,
        }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        notify(result.error || 'Erro ao atualizar rifa.')
        return
      }

      await carregarDadosRemotos(user)
      notify(isPending ? 'Rifa aprovada e publicada.' : 'Status da rifa atualizado.')
      return
    }

    setRifas((current) =>
      current.map((rifa) => (rifa.id === rifaId ? { ...rifa, ...updatePayload } : rifa)),
    )
    notify(isPending ? 'Rifa aprovada e publicada.' : 'Status da rifa atualizado.')
  }

  function resetDemoData() {
    if (isRemoteMode) {
      carregarDadosRemotos(user)
      notify('Dados recarregados do Supabase.')
      return
    }

    setUsuarios(demoUsers)
    setRifas(demoRifas)
    setCompras(demoCompras)
    setNumerosRifa(buildDemoNumerosRifa())
    setCurrentUserId('')
    setSelectedRifaId(demoRifas[0].id)
    setSelectedNumbers([])
    goTo('rifas')
    notify('Dados de demonstracao restaurados.')
  }

  function Header() {
    return (
      <header className="topbar">
        <button className="brand" type="button" onClick={() => goTo('rifas')}>
          <span className="brand-mark">
            <Ticket size={22} aria-hidden="true" />
          </span>
          <span>
            <strong>RifaMax</strong>
          </span>
        </button>

        <nav className="nav-actions" aria-label="Navegacao principal">
          <button className="ghost-button" type="button" onClick={() => goTo('rifas')}>
            <Ticket size={17} aria-hidden="true" />
            Rifas
          </button>

          {user && (
            <button className="ghost-button" type="button" onClick={() => goTo('minhas-compras')}>
              <ShoppingCart size={17} aria-hidden="true" />
              Compras
            </button>
          )}

          {user && (
            <button className="ghost-button" type="button" onClick={() => goTo('criar-rifa')}>
              <Plus size={17} aria-hidden="true" />
              Criar rifa
            </button>
          )}

          {isAdmin && (
            <button className="ghost-button" type="button" onClick={() => goTo('admin')}>
              <LayoutDashboard size={17} aria-hidden="true" />
              Admin
            </button>
          )}

          {user ? (
            <button className="outline-button" type="button" onClick={logout}>
              <LogOut size={17} aria-hidden="true" />
              Sair
            </button>
          ) : (
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setAuthMode('login')
                goTo('auth')
              }}
            >
              <LogIn size={17} aria-hidden="true" />
              Entrar
            </button>
          )}
        </nav>
      </header>
    )
  }

  function RifasView() {
    return (
      <main className="page">
        <section className="overview-band">
          <div>
            <p className="eyebrow">Rifas online com aprovacao</p>
            <h1>Compre numeros com seguranca ou envie sua propria rifa.</h1>
            <p className="lead">
              {isRemoteMode
                ? 'Aqui o participante escolhe os numeros, paga pelo Mercado Pago e acompanha o status da compra. Quem quiser divulgar um premio tambem pode cadastrar a rifa para analise do administrador.'
                : 'Teste o fluxo completo: entrar, criar conta, cadastrar rifas, escolher numeros, simular compras e acompanhar o painel administrativo.'}
            </p>
          </div>

          <div className="quick-panel" aria-label="Acessos rapidos">
            <div className="user-chip">
              <Users size={18} aria-hidden="true" />
              {user ? user.nome : 'Visitante'}
            </div>
            <p className="muted">
              {user
                ? 'Sua conta esta ativa. Voce pode comprar numeros, acompanhar compras e enviar rifas para aprovacao.'
                : 'Entre ou crie uma conta para comprar numeros, acompanhar pagamentos e enviar uma rifa para aprovacao.'}
            </p>
            {isRemoteMode ? (
              <button className="outline-button" type="button" onClick={() => goTo(user ? 'minhas-compras' : 'auth')}>
                <ShieldCheck size={17} aria-hidden="true" />
                {user ? 'Minha conta' : 'Entrar agora'}
              </button>
            ) : (
              <>
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => loginAs('cliente@rifamax.com', 'cliente123')}
                >
                  <LogIn size={17} aria-hidden="true" />
                  Cliente demo
                </button>
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => loginAs('admin@rifamax.com', 'admin123')}
                >
                  <ShieldCheck size={17} aria-hidden="true" />
                  Admin demo
                </button>
              </>
            )}
          </div>
        </section>

        {user && (
          <section className="metric-grid" aria-label="Resumo">
            <Metric icon={Ticket} label="Rifas ativas" value={dashboardStats.ativas} />
            <Metric icon={ShoppingCart} label="Numeros vendidos" value={dashboardStats.totalNumeros} />
            <Metric icon={Banknote} label={isRemoteMode ? 'Faturamento' : 'Faturamento demo'} value={currency.format(dashboardStats.totalReceita)} />
            <Metric icon={Users} label="Compradores" value={dashboardStats.compradores} />
          </section>
        )}

        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Rifas aprovadas</p>
              <h2>Escolha uma rifa para participar</h2>
              <p className="muted">Somente rifas aprovadas pelo administrador aparecem para compra publica.</p>
            </div>

            <label className="search-box">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar rifa"
              />
            </label>
          </div>

          {visibleRifas.length === 0 ? (
              <EmptyState
                title="Nenhuma rifa publica agora"
                text="Quando uma rifa for aprovada pelo administrador, ela aparece aqui para compra. Usuarios logados tambem podem enviar uma nova rifa para analise."
              />
          ) : (
            <div className="raffle-grid">
              {visibleRifas.map((rifa) => (
                <RifaCard key={rifa.id} rifa={rifa} />
              ))}
            </div>
          )}
        </section>
      </main>
    )
  }

  function Metric({ icon: Icon, label, value }) {
    return (
      <article className="metric-card">
        <Icon size={20} aria-hidden="true" />
        <span>{label}</span>
        <strong>{value}</strong>
      </article>
    )
  }

  function RifaCard({ rifa }) {
    const stats = getRifaStats(rifa, compras, numerosRifa)

    return (
      <article className="raffle-card">
        <img src={rifa.imagem} alt={rifa.nome} />
        <div className="raffle-content">
          <div className="raffle-title-row">
            <h3>{rifa.nome}</h3>
            <span className="price-pill">{currency.format(rifa.preco)}</span>
          </div>
          <p>{rifa.descricao}</p>

          <div className="prize-line">
            <Trophy size={17} aria-hidden="true" />
            <span>{rifa.premio_descricao}</span>
          </div>

          <div className="progress-row">
            <div className="progress-copy">
              <span>{stats.vendidos} vendidos</span>
              <strong>{stats.percentual}%</strong>
            </div>
            <div className="progress-track" aria-hidden="true">
              <span style={{ width: `${stats.percentual}%` }} />
            </div>
          </div>

          <div className="card-footer">
            <span className="date-chip">
              <CalendarDays size={15} aria-hidden="true" />
              {formatDate(rifa.data_termino)}
            </span>
            <button className="primary-button" type="button" onClick={() => openCompra(rifa.id)}>
              <ShoppingCart size={17} aria-hidden="true" />
              Comprar
            </button>
          </div>
        </div>
      </article>
    )
  }

  function AuthView() {
    return (
      <main className="page auth-page">
        <section className="auth-copy">
          <p className="eyebrow">Conta RifaMax</p>
          <h1>{authMode === 'login' ? 'Entre para participar e acompanhar tudo.' : 'Crie sua conta para comprar ou enviar rifas.'}</h1>
          <p className="lead">
            {isRemoteMode
              ? 'Depois do login, voce consegue comprar numeros, ver o historico de pagamentos e cadastrar uma rifa para aprovacao do administrador.'
              : 'Use os acessos de demonstracao para testar compras, cadastros, painel admin e aprovacao de rifas.'}
          </p>

          {!isRemoteMode && <div className="demo-login-row">
            <button
              className="outline-button"
              type="button"
              onClick={() => loginAs('cliente@rifamax.com', 'cliente123')}
            >
              <Users size={17} aria-hidden="true" />
              Cliente demo
            </button>
            <button
              className="outline-button"
              type="button"
              onClick={() => loginAs('admin@rifamax.com', 'admin123')}
            >
              <ShieldCheck size={17} aria-hidden="true" />
              Admin demo
            </button>
          </div>}
        </section>

        <section className="form-panel">
          <div className="segmented">
            <button
              type="button"
              className={authMode === 'login' ? 'active' : ''}
              onClick={() => setAuthMode('login')}
            >
              <LogIn size={16} aria-hidden="true" />
              Entrar
            </button>
            <button
              type="button"
              className={authMode === 'registro' ? 'active' : ''}
              onClick={() => setAuthMode('registro')}
            >
              <UserPlus size={16} aria-hidden="true" />
              Cadastro
            </button>
          </div>

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="form-stack">
              <label>
                Email
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="voce@email.com"
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  required
                />
              </label>
              <button className="primary-button full" type="submit">
                <LogIn size={17} aria-hidden="true" />
                {remoteLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegistro} className="form-stack">
              <label>
                Nome completo
                <input
                  type="text"
                  value={registroForm.nome}
                  onChange={(event) =>
                    setRegistroForm((current) => ({ ...current, nome: event.target.value }))
                  }
                  placeholder="Seu nome"
                  autoComplete="name"
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={registroForm.email}
                  onChange={(event) =>
                    setRegistroForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="voce@email.com"
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  value={registroForm.password}
                  onChange={(event) =>
                    setRegistroForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Minimo recomendado: 6 caracteres"
                  autoComplete="new-password"
                  required
                />
              </label>
              <label>
                Confirmar senha
                <input
                  type="password"
                  value={registroForm.confirm}
                  onChange={(event) =>
                    setRegistroForm((current) => ({ ...current, confirm: event.target.value }))
                  }
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  required
                />
              </label>
              <button className="primary-button full" type="submit">
                <UserPlus size={17} aria-hidden="true" />
                {remoteLoading ? 'Criando...' : 'Criar conta'}
              </button>
            </form>
          )}
        </section>
      </main>
    )
  }

  function ComprarView() {
    if (!selectedRifa) {
      return (
        <main className="page">
          <EmptyState title="Rifa nao encontrada" text="Volte para a lista e escolha uma rifa ativa." />
        </main>
      )
    }

    const stats = getRifaStats(selectedRifa, compras, numerosRifa)
    const vendidos = getSoldNumbers(compras, selectedRifa.id, numerosRifa)
    const total = selectedNumbers.length * selectedRifa.preco

    return (
      <main className="page">
        <button className="back-button" type="button" onClick={() => goTo('rifas')}>
          <ChevronLeft size={17} aria-hidden="true" />
          Voltar para rifas
        </button>

        <section className="purchase-layout">
          <div className="number-panel">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Comprar numeros</p>
                <h1>{selectedRifa.nome}</h1>
                <p className="lead">{selectedRifa.premio_descricao}</p>
              </div>
              <span className="price-pill large">{currency.format(selectedRifa.preco)} cada</span>
            </div>

            <div className="number-legend" aria-label="Legenda">
              <span>
                <i className="legend-free" />
                Disponivel
              </span>
              <span>
                <i className="legend-selected" />
                Selecionado
              </span>
              <span>
                <i className="legend-sold" />
                Vendido
              </span>
            </div>

            <div className="number-grid">
              {Array.from({ length: selectedRifa.total_numeros }, (_, index) => {
                const numero = index + 1
                const isSold = vendidos.has(numero)
                const isSelected = selectedNumbers.includes(numero)

                return (
                  <button
                    key={numero}
                    type="button"
                    className={`number-button ${isSold ? 'sold' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleNumero(numero)}
                    disabled={isSold}
                    title={isSold ? `Numero ${numero} vendido` : `Selecionar numero ${numero}`}
                    aria-pressed={isSelected}
                  >
                    {numero}
                  </button>
                )
              })}
            </div>
          </div>

          <aside className="summary-panel">
            <img src={selectedRifa.imagem} alt="" />
            <h2>Resumo</h2>
            <dl className="summary-list">
              <div>
                <dt>Selecionados</dt>
                <dd>{selectedNumbers.length}</dd>
              </div>
              <div>
                <dt>Disponiveis</dt>
                <dd>{stats.disponiveis}</dd>
              </div>
              <div>
                <dt>Subtotal</dt>
                <dd>{currency.format(total)}</dd>
              </div>
            </dl>

            {selectedNumbers.length > 0 ? (
              <div className="selected-list">{selectedNumbers.map((numero) => `#${numero}`).join(' ')}</div>
            ) : (
              <p className="muted">Escolha um ou mais numeros para liberar a finalizacao.</p>
            )}

            <button
              className="primary-button full"
              type="button"
              onClick={confirmarCompra}
              disabled={selectedNumbers.length === 0 || paymentLoading}
            >
              <CircleDollarSign size={17} aria-hidden="true" />
              {paymentLoading ? 'Criando pagamento...' : 'Pagar com Mercado Pago'}
            </button>
          </aside>
        </section>
      </main>
    )
  }

  function MinhasComprasView() {
    return (
      <main className="page">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Historico</p>
            <h1>Minhas compras</h1>
            <p className="muted">Acompanhe aqui os numeros escolhidos, valores e retorno do pagamento.</p>
          </div>
          <button className="outline-button" type="button" onClick={() => goTo('rifas')}>
            <Ticket size={17} aria-hidden="true" />
            Ver rifas
          </button>
        </div>

        {!user ? (
          <EmptyState title="Voce ainda nao entrou" text="Faca login para consultar suas compras." />
        ) : minhasCompras.length === 0 ? (
          <EmptyState title="Nenhuma compra por enquanto" text="Escolha uma rifa e selecione seus numeros." />
        ) : (
          <div className="purchase-list">
            {minhasCompras.map((compra) => {
              const rifa = rifas.find((item) => item.id === compra.rifa_id)

              return (
                <article className="purchase-card" key={compra.id}>
                  <div>
                    <span className={`status-pill ${normalizePaymentStatus(compra.status_pagamento)}`}>
                      <BadgeCheck size={15} aria-hidden="true" />
                      {getPaymentStatusLabel(compra.status_pagamento)}
                    </span>
                    <h2>{rifa?.nome || 'Rifa removida'}</h2>
                    <p>{formatDate(compra.data_compra)}</p>
                  </div>
                  <div className="selected-list">{compra.numeros.map((numero) => `#${numero}`).join(' ')}</div>
                  <strong>{currency.format(compra.valor_total)}</strong>
                </article>
              )
            })}
          </div>
        )}
      </main>
    )
  }

  function AdminView() {
    if (!isAdmin) {
      return (
        <main className="page">
          <EmptyState title="Acesso restrito" text="Entre com uma conta administradora para acessar o painel." />
        </main>
      )
    }

    return (
      <main className="page">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Area administrativa</p>
            <h1>Aprove rifas e acompanhe a operacao</h1>
            <p className="muted">Rifas enviadas por usuarios entram como pendentes. O admin revisa, aprova e publica para venda.</p>
          </div>
          <div className="button-row">
            <button className="outline-button" type="button" onClick={resetDemoData}>
              <RefreshCcw size={17} aria-hidden="true" />
              {isRemoteMode ? 'Recarregar' : 'Restaurar demo'}
            </button>
            <button className="primary-button" type="button" onClick={() => goTo('criar-rifa')}>
              <Plus size={17} aria-hidden="true" />
              Nova rifa
            </button>
          </div>
        </div>

        <section className="metric-grid">
          <Metric icon={Ticket} label="Total de rifas" value={dashboardStats.rifas} />
          <Metric icon={CircleDollarSign} label={isRemoteMode ? 'Receita' : 'Receita simulada'} value={currency.format(dashboardStats.totalReceita)} />
          <Metric icon={ShoppingCart} label="Numeros vendidos" value={dashboardStats.totalNumeros} />
          <Metric icon={Users} label="Clientes ativos" value={dashboardStats.compradores} />
        </section>

        <section className="table-panel">
          <div className="table-heading">
            <h2>Rifas cadastradas</h2>
            <span>{rifas.length} registros</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rifa</th>
                  <th>Preco</th>
                  <th>Vendidos</th>
                  <th>Receita</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {rifas.map((rifa) => {
                  const stats = getRifaStats(rifa, compras, numerosRifa)
                  const statusMeta = getRifaStatusMeta(rifa)
                  const isPending = getRifaApprovalStatus(rifa) === 'pendente'

                  return (
                    <tr key={rifa.id}>
                      <td>
                        <strong>{rifa.nome}</strong>
                        <span>{rifa.total_numeros} numeros</span>
                      </td>
                      <td>{currency.format(rifa.preco)}</td>
                      <td>
                        {stats.vendidos}/{rifa.total_numeros}
                      </td>
                      <td>{currency.format(stats.receita)}</td>
                      <td>
                        <span className={statusMeta.className}>{statusMeta.label}</span>
                      </td>
                      <td>
                        <button className="outline-button small" type="button" onClick={() => toggleRifaStatus(rifa.id)}>
                          {rifa.ativa && !isPending ? <X size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
                          {isPending ? 'Aprovar' : rifa.ativa ? 'Inativar' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    )
  }

  function CriarRifaView() {
    if (!user) {
      return (
        <main className="page">
          <EmptyState title="Entre para criar rifa" text="Faca login para enviar sua rifa para aprovacao." />
        </main>
      )
    }

    return (
      <main className="page form-page">
        <button className="back-button" type="button" onClick={() => goTo(isAdmin ? 'admin' : 'rifas')}>
          <ChevronLeft size={17} aria-hidden="true" />
          {isAdmin ? 'Voltar ao painel' : 'Voltar para rifas'}
        </button>

        <section className="form-panel wide">
          <p className="eyebrow">{isAdmin ? 'Nova rifa' : 'Enviar rifa'}</p>
          <h1>{isAdmin ? 'Cadastrar rifa oficial' : 'Cadastrar rifa para aprovacao'}</h1>
          <p className="muted">
            {isAdmin
              ? 'Como administrador, a rifa criada ja pode ser publicada para compra.'
              : 'Preencha as informacoes do premio. O administrador revisa antes de liberar a rifa para o publico.'}
          </p>

          <form className="form-grid" onSubmit={handleCriarRifa}>
            <label>
              Nome da rifa
              <input
                type="text"
                value={novaRifa.nome}
                onChange={(event) => setNovaRifa({ ...novaRifa, nome: event.target.value })}
                placeholder="Ex: Smartphone premium"
                required
              />
            </label>

            <label>
              Descricao do premio
              <input
                type="text"
                value={novaRifa.premio_descricao}
                onChange={(event) => setNovaRifa({ ...novaRifa, premio_descricao: event.target.value })}
                placeholder="O que sera sorteado"
                required
              />
            </label>

            <label className="span-2">
              Descricao curta
              <textarea
                value={novaRifa.descricao}
                onChange={(event) => setNovaRifa({ ...novaRifa, descricao: event.target.value })}
                placeholder="Explique regras, estado do premio e entrega"
                required
              />
            </label>

            <label>
              Preco por numero
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={novaRifa.preco}
                onChange={(event) => setNovaRifa({ ...novaRifa, preco: event.target.value })}
                placeholder="10.00"
                required
              />
            </label>

            <label>
              Total de numeros
              <input
                type="number"
                min="10"
                max="500"
                value={novaRifa.total_numeros}
                onChange={(event) => setNovaRifa({ ...novaRifa, total_numeros: event.target.value })}
                placeholder="100"
                required
              />
            </label>

            <label>
              Data de encerramento
              <input
                type="date"
                value={novaRifa.data_termino}
                onChange={(event) => setNovaRifa({ ...novaRifa, data_termino: event.target.value })}
                required
              />
            </label>

            <label>
              URL da imagem
              <input
                type="url"
                value={novaRifa.imagem}
                onChange={(event) => setNovaRifa({ ...novaRifa, imagem: event.target.value })}
                placeholder="https://..."
                required
              />
            </label>

            <div className="form-actions span-2">
              <button className="outline-button" type="button" onClick={() => goTo(isAdmin ? 'admin' : 'rifas')}>
                <X size={17} aria-hidden="true" />
                Cancelar
              </button>
              <button className="primary-button" type="submit">
                <Plus size={17} aria-hidden="true" />
                {isAdmin ? 'Criar rifa' : 'Enviar para aprovacao'}
              </button>
            </div>
          </form>
        </section>
      </main>
    )
  }

  function EmptyState({ title, text }) {
    return (
      <div className="empty-state">
        <Ticket size={28} aria-hidden="true" />
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      {Header()}

      {view === 'rifas' && RifasView()}
      {view === 'auth' && AuthView()}
      {view === 'comprar' && ComprarView()}
      {view === 'minhas-compras' && MinhasComprasView()}
      {view === 'admin' && AdminView()}
      {view === 'criar-rifa' && CriarRifaView()}

      {message && (
        <div className="toast" role="status">
          <BadgeCheck size={17} aria-hidden="true" />
          {message}
        </div>
      )}
    </div>
  )
}
import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  Banknote,
  CalendarDays,
  Check,
  ChevronLeft,
  CircleDollarSign,
  LayoutDashboard,
  LogIn,
  LogOut,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Ticket,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { dataMode, hasSupabaseConfig, supabase } from './lib/supabaseClient'
import './App.css'

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const demoUsers = [
  {
    id: 'admin-demo',
    nome: 'Admin RifaMax',
    email: 'admin@rifamax.com',
    password: 'admin123',
    id_admin: true,
    data_criacao: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 'cliente-demo',
    nome: 'Cliente Demo',
    email: 'cliente@rifamax.com',
    password: 'cliente123',
    id_admin: false,
    data_criacao: '2026-06-02T10:00:00.000Z',
  },
]

const demoRifas = [
  {
    id: 'rifa-console',
    nome: 'Console gamer completo',
    descricao: 'Console novo com dois controles, assinatura premium e entrega nacional.',
    imagem:
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80',
    preco: 12.5,
    total_numeros: 120,
    premio_descricao: 'Console de ultima geracao com kit de jogos',
    criador_id: 'admin-demo',
    ativa: true,
    status_aprovacao: 'aprovada',
    data_termino: '2026-08-15',
    data_criacao: '2026-06-11T14:00:00.000Z',
  },
  {
    id: 'rifa-smartphone',
    nome: 'Smartphone premium',
    descricao: 'Aparelho lacrado, 256 GB, garantia nacional e capa inclusa.',
    imagem:
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1200&q=80',
    preco: 9,
    total_numeros: 100,
    premio_descricao: 'Smartphone premium 256 GB',
    criador_id: 'admin-demo',
    ativa: true,
    status_aprovacao: 'aprovada',
    data_termino: '2026-07-28',
    data_criacao: '2026-06-10T14:00:00.000Z',
  },
  {
    id: 'rifa-sneaker',
    nome: 'Sneaker colecionavel',
    descricao: 'Modelo exclusivo para quem curte estilo, conforto e sorteio rapido.',
    imagem:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
    preco: 6,
    total_numeros: 80,
    premio_descricao: 'Sneaker original no tamanho escolhido',
    criador_id: 'admin-demo',
    ativa: true,
    status_aprovacao: 'aprovada',
    data_termino: '2026-07-12',
    data_criacao: '2026-06-09T14:00:00.000Z',
  },
]

const demoCompras = [
  {
    id: 'compra-001',
    rifa_id: 'rifa-console',
    comprador_id: 'cliente-demo',
    comprador_nome: 'Cliente Demo',
    numeros: [3, 14, 27, 88],
    valor_total: 50,
    quantidade_numeros: 4,
    status_pagamento: 'confirmado',
    metodo_pagamento: 'simulado',
    data_compra: '2026-06-18T12:20:00.000Z',
  },
  {
    id: 'compra-002',
    rifa_id: 'rifa-smartphone',
    comprador_id: 'cliente-demo',
    comprador_nome: 'Cliente Demo',
    numeros: [6, 19, 41],
    valor_total: 27,
    quantidade_numeros: 3,
    status_pagamento: 'confirmado',
    metodo_pagamento: 'simulado',
    data_compra: '2026-06-19T09:40:00.000Z',
  },
  {
    id: 'compra-003',
    rifa_id: 'rifa-sneaker',
    comprador_id: 'admin-demo',
    comprador_nome: 'Admin RifaMax',
    numeros: [4, 8, 12, 24, 48],
    valor_total: 30,
    quantidade_numeros: 5,
    status_pagamento: 'confirmado',
    metodo_pagamento: 'simulado',
    data_compra: '2026-06-20T16:10:00.000Z',
  },
]

const emptyRifa = {
  nome: '',
  descricao: '',
  imagem: '',
  preco: '',
  total_numeros: '',
  data_termino: '',
  premio_descricao: '',
}

function buildDemoNumerosRifa() {
  const vendidos = new Set(demoCompras.flatMap((compra) => compra.numeros.map((numero) => `${compra.rifa_id}:${numero}`)))

  return demoRifas.flatMap((rifa) =>
    Array.from({ length: rifa.total_numeros }, (_, index) => {
      const numero = index + 1

      return {
        id: `${rifa.id}-${numero}`,
        rifa_id: rifa.id,
        numero,
        vendido: vendidos.has(`${rifa.id}:${numero}`),
      }
    }),
  )
}

function createId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? JSON.parse(saved) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue]
}

function isBlockingPurchase(compra) {
  return !['falha', 'reembolso', 'cancelado'].includes(normalizePaymentStatus(compra.status_pagamento))
}

function getSoldNumbers(compras, rifaId, numerosRifa = []) {
  return new Set(
    [
      ...compras
      .filter((compra) => compra.rifa_id === rifaId && isBlockingPurchase(compra))
      .flatMap((compra) => compra.numeros),
      ...numerosRifa
        .filter((numero) => numero.rifa_id === rifaId && numero.vendido)
        .map((numero) => numero.numero),
    ],
  )
}

function getRifaStats(rifa, compras, numerosRifa = []) {
  const soldNumbers = getSoldNumbers(compras, rifa.id, numerosRifa)
  const vendidos = soldNumbers.size
  const disponiveis = Math.max(rifa.total_numeros - vendidos, 0)
  const percentual = rifa.total_numeros > 0 ? Math.round((vendidos / rifa.total_numeros) * 100) : 0
  const receita = [...soldNumbers].length * rifa.preco

  return { vendidos, disponiveis, percentual, receita }
}

function formatDate(value) {
  if (!value) return 'Sem data'

  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value))
}

function normalizePaymentStatus(status) {
  const value = String(status || '').toLowerCase()

  if (['approved', 'success', 'confirmado'].includes(value)) return 'confirmado'
  if (['pending', 'in_process', 'in_mediation', 'pendente'].includes(value)) return 'pendente'
  if (['rejected', 'cancelled', 'failure', 'falha'].includes(value)) return 'falha'
  return value || 'pendente'
}

function getPaymentStatusLabel(status) {
  const normalized = normalizePaymentStatus(status)

  if (normalized === 'confirmado') return 'Confirmado'
  if (normalized === 'falha') return 'Falhou'
  return 'Pendente'
}

function getRifaApprovalStatus(rifa) {
  return rifa?.status_aprovacao || 'aprovada'
}

function isRifaPublic(rifa) {
  return Boolean(rifa?.ativa) && getRifaApprovalStatus(rifa) === 'aprovada'
}

function getRifaStatusMeta(rifa) {
  const approvalStatus = getRifaApprovalStatus(rifa)

  if (approvalStatus === 'pendente') {
    return { className: 'status-pill pendente', label: 'Pendente' }
  }

  if (approvalStatus === 'reprovada') {
    return { className: 'status-pill falha', label: 'Reprovada' }
  }

  if (!rifa.ativa) {
    return { className: 'status-pill muted-status', label: 'Inativa' }
  }

  return { className: 'status-pill success', label: 'Ativa' }
}

function sortNumbers(numbers) {
  return [...numbers].sort((a, b) => a - b)
}

export default function App() {
  const isRemoteMode = hasSupabaseConfig && Boolean(supabase)
  const [usuarios, setUsuarios] = usePersistentState('rifamax:usuarios', demoUsers)
  const [rifas, setRifas] = usePersistentState('rifamax:rifas', demoRifas)
  const [compras, setCompras] = usePersistentState('rifamax:compras', demoCompras)
  const [numerosRifa, setNumerosRifa] = usePersistentState('rifamax:numeros', buildDemoNumerosRifa())
  const [currentUserId, setCurrentUserId] = usePersistentState('rifamax:sessao', '')
  const [view, setView] = useState('rifas')
  const [selectedRifaId, setSelectedRifaId] = useState(demoRifas[0].id)
  const [selectedNumbers, setSelectedNumbers] = useState([])
  const [search, setSearch] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registroForm, setRegistroForm] = useState({ nome: '', email: '', password: '', confirm: '' })
  const [novaRifa, setNovaRifa] = useState(emptyRifa)
  const [message, setMessage] = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [remoteLoading, setRemoteLoading] = useState(false)

  const user = useMemo(
    () => usuarios.find((usuario) => usuario.id === currentUserId) || null,
    [currentUserId, usuarios],
  )

  const isAdmin = Boolean(user?.id_admin)
  const selectedRifa = rifas.find((rifa) => rifa.id === selectedRifaId) || rifas[0]

  const visibleRifas = useMemo(() => {
    const term = search.trim().toLowerCase()

    return rifas
      .filter(isRifaPublic)
      .filter((rifa) => {
        if (!term) return true
        return [rifa.nome, rifa.descricao, rifa.premio_descricao].some((value) =>
          value.toLowerCase().includes(term),
        )
      })
  }, [rifas, search])

  const minhasCompras = useMemo(() => {
    if (!user) return []
    return compras
      .filter((compra) => compra.comprador_id === user.id)
      .sort((a, b) => new Date(b.data_compra) - new Date(a.data_compra))
  }, [compras, user])

  const dashboardStats = useMemo(() => {
    const totalReceita = compras.reduce((sum, compra) => sum + compra.valor_total, 0)
    const totalNumeros = rifas.reduce(
      (sum, rifa) => sum + getSoldNumbers(compras, rifa.id, numerosRifa).size,
      0,
    )
    const compradores = new Set(compras.map((compra) => compra.comprador_id)).size

    return {
      rifas: rifas.length,
      ativas: rifas.filter(isRifaPublic).length,
      totalReceita,
      totalNumeros,
      compradores,
    }
  }, [compras, numerosRifa, rifas])

  useEffect(() => {
    if (!message) return undefined

    const timeout = window.setTimeout(() => setMessage(''), 3500)
    return () => window.clearTimeout(timeout)
  }, [message])

  useEffect(() => {
    setSelectedNumbers([])
  }, [selectedRifaId])

  useEffect(() => {
    if (!isRemoteMode) return undefined

    let active = true

    async function bootstrapRemoteData() {
      setRemoteLoading(true)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const profile = session?.user ? await applyRemoteUser(session.user) : null

        if (!session?.user) {
          setUsuarios([])
          setCurrentUserId('')
          setCompras([])
        }

        if (active) {
          await carregarDadosRemotos(profile)
        }
      } catch (error) {
        notify(error.message || 'Erro ao carregar dados do Supabase.')
      } finally {
        if (active) setRemoteLoading(false)
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return

      const profile = session?.user ? await applyRemoteUser(session.user) : null

      if (!session?.user) {
        setUsuarios([])
        setCurrentUserId('')
        setCompras([])
      }

      await carregarDadosRemotos(profile)
    })

    bootstrapRemoteData()

    return () => {
      active = false
      subscription.unsubscribe()
    }
    // Dados remotos devem ser inicializados apenas quando o modo Supabase muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRemoteMode])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const externalReference = params.get('external_reference')
    const rawStatus = params.get('status') || params.get('collection_status') || params.get('payment')
    const paymentId = params.get('payment_id') || params.get('collection_id')

    if (!externalReference || !rawStatus) return

    async function syncPaymentReturn() {
      let nextStatus = normalizePaymentStatus(rawStatus)

      if (isRemoteMode && paymentId) {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.access_token) {
          const response = await fetch('/api/mercadopago/sync-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              externalReference,
              paymentId,
              supabaseAccessToken: session.access_token,
            }),
          })

          const result = await response.json().catch(() => ({}))

          if (response.ok && result.status_pagamento) {
            nextStatus = result.status_pagamento
          }
        }
      }

      setCompras((current) =>
        current.map((compra) =>
          compra.external_reference === externalReference
            ? {
                ...compra,
                id_transacao_mp: paymentId || compra.id_transacao_mp,
                status_pagamento: nextStatus,
              }
            : compra,
        ),
      )

      await carregarDadosRemotos()
      goTo('minhas-compras')
      notify(
        nextStatus === 'confirmado'
          ? 'Pagamento aprovado pelo Mercado Pago.'
          : 'Recebemos o retorno do Mercado Pago. A compra esta pendente ou precisa de revisao.',
      )
      window.history.replaceState({}, '', window.location.pathname)
    }

    syncPaymentReturn().catch((error) => {
      notify(error.message || 'Nao foi possivel sincronizar o pagamento.')
    })
    // Sincronizacao acontece somente quando a URL de retorno muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCompras])

  function notify(text) {
    setMessage(text)
  }

  function goTo(nextView) {
    setView(nextView)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function mapRemoteProfile(row, authUser) {
    return {
      id: authUser.id,
      perfil_id: row?.id,
      id_usuario: authUser.id,
      nome: row?.nome || authUser.user_metadata?.nome || authUser.email,
      email: row?.email || authUser.email,
      id_admin: Boolean(row?.id_admin),
      data_criacao: row?.data_criacao || authUser.created_at,
    }
  }

  function mapRemoteCompra(row) {
    return {
      id: row.id,
      rifa_id: row.rifa_id,
      comprador_id: row.comprador_id,
      comprador_nome: row.usuarios?.nome || row.comprador_nome || 'Cliente',
      numeros: sortNumbers((row.compra_numeros || []).map((item) => item.numero)),
      valor_total: Number(row.valor_total || 0),
      quantidade_numeros: row.quantidade_numeros,
      status_pagamento: row.status_pagamento,
      metodo_pagamento: row.metodo_pagamento,
      external_reference: row.referencia_externa,
      preference_id: row.preference_id,
      id_transacao_mp: row.id_transacao_mp,
      data_compra: row.data_compra,
    }
  }

  async function applyRemoteUser(authUser) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id_usuario', authUser.id)
      .maybeSingle()

    if (error) throw error

    let profile = data

    if (!profile) {
      const { data: inserted, error: insertError } = await supabase
        .from('usuarios')
        .insert({
          id_usuario: authUser.id,
          nome: authUser.user_metadata?.nome || authUser.email,
          email: authUser.email,
        })
        .select('*')
        .single()

      if (insertError) throw insertError
      profile = inserted
    }

    const mappedProfile = mapRemoteProfile(profile, authUser)

    setUsuarios([mappedProfile])
    setCurrentUserId(authUser.id)

    return mappedProfile
  }

  async function carregarDadosRemotos(profile = user) {
    if (!isRemoteMode) return

    const { data: rifasData, error: rifasError } = await supabase
      .from('rifas')
      .select('*')
      .order('data_criacao', { ascending: false })

    if (rifasError) throw rifasError

    const { data: numerosData, error: numerosError } = await supabase
      .from('numeros_rifa')
      .select('id, rifa_id, numero, vendido, comprador_id, data_venda')
      .order('numero', { ascending: true })

    if (numerosError) throw numerosError

    setRifas((rifasData || []).map((rifa) => ({ ...rifa, preco: Number(rifa.preco) })))
    setNumerosRifa(numerosData || [])

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      setCompras([])
      return
    }

    let comprasQuery = supabase
      .from('compras')
      .select('*, compra_numeros(numero)')
      .order('data_compra', { ascending: false })

    if (!profile?.id_admin) {
      comprasQuery = comprasQuery.eq('comprador_id', authUser.id)
    }

    const { data: comprasData, error: comprasError } = await comprasQuery

    if (comprasError) throw comprasError

    setCompras((comprasData || []).map(mapRemoteCompra))
  }

  async function loginAs(email, password) {
    if (isRemoteMode) {
      notify('Os acessos demo ficam desativados no modo publico. Use uma conta real.')
      return false
    }

    const match = usuarios.find(
      (usuario) => usuario.email === normalizeEmail(email) && usuario.password === password,
    )

    if (!match) {
      notify('Email ou senha invalidos.')
      return false
    }

    setCurrentUserId(match.id)
    setLoginForm({ email: '', password: '' })
    goTo('rifas')
    notify(`Bem-vindo, ${match.nome}.`)
    return true
  }

  async function handleLogin(event) {
    event.preventDefault()

    if (!isRemoteMode) {
      await loginAs(loginForm.email, loginForm.password)
      return
    }

    try {
      setRemoteLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizeEmail(loginForm.email),
        password: loginForm.password,
      })

      if (error) throw error

      const profile = await applyRemoteUser(data.user)
      await carregarDadosRemotos(profile)
      setLoginForm({ email: '', password: '' })
      goTo('rifas')
      notify(`Bem-vindo, ${profile.nome}.`)
    } catch (error) {
      const errorMessage = String(error.message || '')
      notify(
        errorMessage.toLowerCase().includes('email not confirmed')
          ? 'Seu email ainda precisa ser confirmado no Supabase antes do login.'
          : error.message || 'Erro ao fazer login.',
      )
    } finally {
      setRemoteLoading(false)
    }
  }

  async function handleRegistro(event) {
    event.preventDefault()

    const email = normalizeEmail(registroForm.email)
    if (registroForm.password !== registroForm.confirm) {
      notify('As senhas nao coincidem.')
      return
    }

    if (isRemoteMode) {
      try {
        setRemoteLoading(true)
        const { data, error } = await supabase.auth.signUp({
          email,
          password: registroForm.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              nome: registroForm.nome.trim(),
            },
          },
        })

        if (error) throw error

        if (data.session?.user) {
          const profile = await applyRemoteUser(data.session.user)
          await carregarDadosRemotos(profile)
          setRegistroForm({ nome: '', email: '', password: '', confirm: '' })
          goTo('rifas')
          notify('Conta criada. Voce ja pode comprar numeros.')
        } else {
          setAuthMode('login')
          setLoginForm((current) => ({ ...current, email }))
          notify('Cadastro criado. Confirme seu email antes de entrar.')
        }
      } catch (error) {
        notify(error.message || 'Erro ao criar conta.')
      } finally {
        setRemoteLoading(false)
      }

      return
    }

    if (usuarios.some((usuario) => usuario.email === email)) {
      notify('Este email ja esta cadastrado.')
      return
    }

    const novoUsuario = {
      id: createId('usuario'),
      nome: registroForm.nome.trim(),
      email,
      password: registroForm.password,
      id_admin: false,
      data_criacao: new Date().toISOString(),
    }

    setUsuarios((current) => [...current, novoUsuario])
    setCurrentUserId(novoUsuario.id)
    setRegistroForm({ nome: '', email: '', password: '', confirm: '' })
    goTo('rifas')
    notify('Conta criada. Voce ja pode comprar numeros.')
  }

  async function logout() {
    if (isRemoteMode) {
      await supabase.auth.signOut()
      setUsuarios([])
      setCompras([])
    }

    setCurrentUserId('')
    goTo('rifas')
    notify('Sessao encerrada.')
  }

  function openCompra(rifaId) {
    if (!user) {
      setAuthMode('login')
      goTo('auth')
      notify('Entre ou crie uma conta para comprar numeros.')
      return
    }

    setSelectedRifaId(rifaId)
    goTo('comprar')
  }

  function toggleNumero(numero) {
    if (!selectedRifa) return

    const vendidos = getSoldNumbers(compras, selectedRifa.id, numerosRifa)
    if (vendidos.has(numero)) return

    setSelectedNumbers((current) =>
      current.includes(numero)
        ? current.filter((item) => item !== numero)
        : sortNumbers([...current, numero]),
    )
  }

  async function confirmarCompra() {
    if (!user) {
      setAuthMode('login')
      goTo('auth')
      notify('Entre para finalizar a compra.')
      return
    }

    if (!selectedRifa || selectedNumbers.length === 0) {
      notify('Selecione pelo menos um numero.')
      return
    }

    const vendidos = getSoldNumbers(compras, selectedRifa.id, numerosRifa)
    const conflitos = selectedNumbers.filter((numero) => vendidos.has(numero))
    if (conflitos.length > 0) {
      setSelectedNumbers((current) => current.filter((numero) => !vendidos.has(numero)))
      notify(`Os numeros ${conflitos.join(', ')} acabaram de ser vendidos.`)
      return
    }

    const numeros = sortNumbers(selectedNumbers)
    const valorTotal = Number((numeros.length * selectedRifa.preco).toFixed(2))
    const externalReference = createId('mp')

    setPaymentLoading(true)

    try {
      const response = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buyerEmail: user.email,
          buyerName: user.nome,
          externalReference,
          numeros,
          premioDescricao: selectedRifa.premio_descricao,
          rifaId: selectedRifa.id,
          rifaNome: selectedRifa.nome,
          unitPrice: selectedRifa.preco,
        }),
      })

      const rawResponse = await response.text()
      let preference = {}

      try {
        preference = rawResponse ? JSON.parse(rawResponse) : {}
      } catch {
        preference = { error: rawResponse || 'Resposta invalida do servidor de pagamento.' }
      }

      if (!response.ok) {
        throw new Error(preference.error || 'Nao foi possivel iniciar o pagamento.')
      }

      if (!preference.init_point) {
        throw new Error('O Mercado Pago nao retornou o link de checkout.')
      }

      const novaCompra = {
        id: createId('compra'),
        rifa_id: selectedRifa.id,
        comprador_id: user.id,
        comprador_nome: user.nome,
        numeros,
        valor_total: valorTotal,
        quantidade_numeros: numeros.length,
        status_pagamento: 'pendente',
        metodo_pagamento: 'mercado_pago',
        external_reference: externalReference,
        preference_id: preference.id,
        data_compra: new Date().toISOString(),
      }

      if (isRemoteMode) {
        const { data: compraCriada, error: compraError } = await supabase.rpc('criar_compra_mercado_pago', {
          p_rifa_id: selectedRifa.id,
          p_numeros: numeros,
          p_valor_total: valorTotal,
          p_referencia_externa: externalReference,
          p_preference_id: preference.id,
        })

        if (compraError) throw compraError

        const compra = Array.isArray(compraCriada) ? compraCriada[0] : compraCriada
        if (!compra?.id) {
          throw new Error('A compra foi reservada, mas o banco nao retornou o comprovante.')
        }

        novaCompra.id = compra.id
      }

      setCompras((current) => [novaCompra, ...current])
      setNumerosRifa((current) =>
        current.map((item) =>
          item.rifa_id === selectedRifa.id && numeros.includes(item.numero)
            ? { ...item, vendido: true, comprador_id: user.id }
            : item,
        ),
      )
      setSelectedNumbers([])
      window.location.href = preference.init_point
    } catch (error) {
      notify(error.message || 'Erro ao iniciar pagamento no Mercado Pago.')
    } finally {
      setPaymentLoading(false)
    }
  }

  async function handleCriarRifa(event) {
    event.preventDefault()

    if (!user) {
      setAuthMode('login')
      goTo('auth')
      notify('Entre para cadastrar uma rifa.')
      return
    }

    const preco = Number(novaRifa.preco)
    const totalNumeros = Number.parseInt(novaRifa.total_numeros, 10)

    if (!Number.isFinite(preco) || preco <= 0) {
      notify('Informe um preco valido.')
      return
    }

    if (!Number.isInteger(totalNumeros) || totalNumeros < 10 || totalNumeros > 500) {
      notify('Use entre 10 e 500 numeros para manter a grade legivel.')
      return
    }

    const rifaPayload = {
      nome: novaRifa.nome.trim(),
      descricao: novaRifa.descricao.trim(),
      imagem: novaRifa.imagem.trim(),
      preco,
      total_numeros: totalNumeros,
      premio_descricao: novaRifa.premio_descricao.trim(),
      criador_id: user.id,
      ativa: !isRemoteMode || isAdmin,
      status_aprovacao: !isRemoteMode || isAdmin ? 'aprovada' : 'pendente',
      data_termino: novaRifa.data_termino,
    }

    try {
      if (isRemoteMode) {
        setRemoteLoading(true)

        const {
          data: { session },
        } = await supabase.auth.getSession()

        const response = await fetch('/api/rifas/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rifa: rifaPayload,
            supabaseAccessToken: session?.access_token,
          }),
        })

        const result = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao criar rifa.')
        }

        await carregarDadosRemotos(user)
      } else {
        const rifa = {
          ...rifaPayload,
          id: createId('rifa'),
          data_criacao: new Date().toISOString(),
        }

        setRifas((current) => [rifa, ...current])
        setNumerosRifa((current) => [
          ...Array.from({ length: totalNumeros }, (_, index) => ({
            id: `${rifa.id}-${index + 1}`,
            rifa_id: rifa.id,
            numero: index + 1,
            vendido: false,
          })),
          ...current,
        ])
      }

      setNovaRifa(emptyRifa)
      goTo(isAdmin ? 'admin' : 'rifas')
      notify(isAdmin ? 'Rifa criada e aprovada.' : 'Rifa enviada para aprovacao do administrador.')
    } catch (error) {
      notify(error.message || 'Erro ao criar rifa.')
    } finally {
      setRemoteLoading(false)
    }
  }

  async function toggleRifaStatus(rifaId) {
    const rifaAtual = rifas.find((rifa) => rifa.id === rifaId)
    if (!rifaAtual) return

    const isPending = getRifaApprovalStatus(rifaAtual) === 'pendente'
    const updatePayload = isPending
      ? { ativa: true, status_aprovacao: 'aprovada' }
      : { ativa: !rifaAtual.ativa }

    if (isRemoteMode) {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const response = await fetch('/api/rifas/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ativa: updatePayload.ativa,
          rifaId,
          supabaseAccessToken: session?.access_token,
        }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        notify(result.error || 'Erro ao atualizar rifa.')
        return
      }

      await carregarDadosRemotos(user)
      notify(isPending ? 'Rifa aprovada e publicada.' : 'Status da rifa atualizado.')
      return
    }

    setRifas((current) =>
      current.map((rifa) => (rifa.id === rifaId ? { ...rifa, ...updatePayload } : rifa)),
    )
    notify(isPending ? 'Rifa aprovada e publicada.' : 'Status da rifa atualizado.')
  }

  function resetDemoData() {
    if (isRemoteMode) {
      carregarDadosRemotos(user)
      notify('Dados recarregados do Supabase.')
      return
    }

    setUsuarios(demoUsers)
    setRifas(demoRifas)
    setCompras(demoCompras)
    setNumerosRifa(buildDemoNumerosRifa())
    setCurrentUserId('')
    setSelectedRifaId(demoRifas[0].id)
    setSelectedNumbers([])
    goTo('rifas')
    notify('Dados de demonstracao restaurados.')
  }

  function Header() {
    return (
      <header className="topbar">
        <button className="brand" type="button" onClick={() => goTo('rifas')}>
          <span className="brand-mark">
            <Ticket size={22} aria-hidden="true" />
          </span>
          <span>
            <strong>RifaMax</strong>
            <small>{dataMode === 'configured' ? 'Online com Supabase' : 'Demo local'}</small>
          </span>
        </button>

        <nav className="nav-actions" aria-label="Navegacao principal">
          <button className="ghost-button" type="button" onClick={() => goTo('rifas')}>
            <Ticket size={17} aria-hidden="true" />
            Rifas
          </button>

          {user && (
            <button className="ghost-button" type="button" onClick={() => goTo('minhas-compras')}>
              <ShoppingCart size={17} aria-hidden="true" />
              Compras
            </button>
          )}

          {user && (
            <button className="ghost-button" type="button" onClick={() => goTo('criar-rifa')}>
              <Plus size={17} aria-hidden="true" />
              Criar rifa
            </button>
          )}

          {isAdmin && (
            <button className="ghost-button" type="button" onClick={() => goTo('admin')}>
              <LayoutDashboard size={17} aria-hidden="true" />
              Admin
            </button>
          )}

          {user ? (
            <button className="outline-button" type="button" onClick={logout}>
              <LogOut size={17} aria-hidden="true" />
              Sair
            </button>
          ) : (
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setAuthMode('login')
                goTo('auth')
              }}
            >
              <LogIn size={17} aria-hidden="true" />
              Entrar
            </button>
          )}
        </nav>
      </header>
    )
  }

  function RifasView() {
    return (
      <main className="page">
        <section className="overview-band">
          <div>
            <p className="eyebrow">Plataforma de rifas online</p>
            <h1>Escolha seus numeros e acompanhe tudo em tempo real.</h1>
            <p className="lead">
              {isRemoteMode
                ? 'Rifas, usuarios, numeros reservados e compras agora usam o banco real.'
                : 'O fluxo esta pronto para demonstracao: login, cadastro, painel admin, criacao de rifas, selecao de numeros e historico de compras.'}
            </p>
          </div>

          <div className="quick-panel" aria-label="Acessos rapidos">
            <div className="user-chip">
              <Users size={18} aria-hidden="true" />
              {user ? user.nome : 'Visitante'}
            </div>
            {isRemoteMode ? (
              <button className="outline-button" type="button" onClick={() => goTo(user ? 'minhas-compras' : 'auth')}>
                <ShieldCheck size={17} aria-hidden="true" />
                {user ? 'Minha conta' : 'Entrar agora'}
              </button>
            ) : (
              <>
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => loginAs('cliente@rifamax.com', 'cliente123')}
                >
                  <LogIn size={17} aria-hidden="true" />
                  Cliente demo
                </button>
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => loginAs('admin@rifamax.com', 'admin123')}
                >
                  <ShieldCheck size={17} aria-hidden="true" />
                  Admin demo
                </button>
              </>
            )}
          </div>
        </section>

        {user && (
          <section className="metric-grid" aria-label="Resumo">
            <Metric icon={Ticket} label="Rifas ativas" value={dashboardStats.ativas} />
            <Metric icon={ShoppingCart} label="Numeros vendidos" value={dashboardStats.totalNumeros} />
            <Metric icon={Banknote} label={isRemoteMode ? 'Faturamento' : 'Faturamento demo'} value={currency.format(dashboardStats.totalReceita)} />
            <Metric icon={Users} label="Compradores" value={dashboardStats.compradores} />
          </section>
        )}

        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Disponiveis agora</p>
              <h2>Rifas em destaque</h2>
            </div>

            <label className="search-box">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar rifa"
              />
            </label>
          </div>

          {visibleRifas.length === 0 ? (
              <EmptyState
                title="Nenhuma rifa encontrada"
                text="Limpe a busca ou entre para enviar uma rifa para aprovacao."
              />
          ) : (
            <div className="raffle-grid">
              {visibleRifas.map((rifa) => (
                <RifaCard key={rifa.id} rifa={rifa} />
              ))}
            </div>
          )}
        </section>
      </main>
    )
  }

  function Metric({ icon: Icon, label, value }) {
    return (
      <article className="metric-card">
        <Icon size={20} aria-hidden="true" />
        <span>{label}</span>
        <strong>{value}</strong>
      </article>
    )
  }

  function RifaCard({ rifa }) {
    const stats = getRifaStats(rifa, compras, numerosRifa)

    return (
      <article className="raffle-card">
        <img src={rifa.imagem} alt={rifa.nome} />
        <div className="raffle-content">
          <div className="raffle-title-row">
            <h3>{rifa.nome}</h3>
            <span className="price-pill">{currency.format(rifa.preco)}</span>
          </div>
          <p>{rifa.descricao}</p>

          <div className="prize-line">
            <Trophy size={17} aria-hidden="true" />
            <span>{rifa.premio_descricao}</span>
          </div>

          <div className="progress-row">
            <div className="progress-copy">
              <span>{stats.vendidos} vendidos</span>
              <strong>{stats.percentual}%</strong>
            </div>
            <div className="progress-track" aria-hidden="true">
              <span style={{ width: `${stats.percentual}%` }} />
            </div>
          </div>

          <div className="card-footer">
            <span className="date-chip">
              <CalendarDays size={15} aria-hidden="true" />
              {formatDate(rifa.data_termino)}
            </span>
            <button className="primary-button" type="button" onClick={() => openCompra(rifa.id)}>
              <ShoppingCart size={17} aria-hidden="true" />
              Comprar
            </button>
          </div>
        </div>
      </article>
    )
  }

  function AuthView() {
    return (
      <main className="page auth-page">
        <section className="auth-copy">
          <p className="eyebrow">Acesso</p>
          <h1>{authMode === 'login' ? 'Entre para comprar numeros.' : 'Crie sua conta em segundos.'}</h1>
          <p className="lead">
            {isRemoteMode
              ? 'Entre com seu email e senha para comprar numeros e acompanhar pagamentos.'
              : 'Use os acessos de demonstracao para testar o painel completo sem configurar o Supabase.'}
          </p>

          {!isRemoteMode && <div className="demo-login-row">
            <button
              className="outline-button"
              type="button"
              onClick={() => loginAs('cliente@rifamax.com', 'cliente123')}
            >
              <Users size={17} aria-hidden="true" />
              Cliente demo
            </button>
            <button
              className="outline-button"
              type="button"
              onClick={() => loginAs('admin@rifamax.com', 'admin123')}
            >
              <ShieldCheck size={17} aria-hidden="true" />
              Admin demo
            </button>
          </div>}
        </section>

        <section className="form-panel">
          <div className="segmented">
            <button
              type="button"
              className={authMode === 'login' ? 'active' : ''}
              onClick={() => setAuthMode('login')}
            >
              <LogIn size={16} aria-hidden="true" />
              Entrar
            </button>
            <button
              type="button"
              className={authMode === 'registro' ? 'active' : ''}
              onClick={() => setAuthMode('registro')}
            >
              <UserPlus size={16} aria-hidden="true" />
              Cadastro
            </button>
          </div>

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="form-stack">
              <label>
                Email
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="voce@email.com"
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  required
                />
              </label>
              <button className="primary-button full" type="submit">
                <LogIn size={17} aria-hidden="true" />
                {remoteLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegistro} className="form-stack">
              <label>
                Nome completo
                <input
                  type="text"
                  value={registroForm.nome}
                  onChange={(event) =>
                    setRegistroForm((current) => ({ ...current, nome: event.target.value }))
                  }
                  placeholder="Seu nome"
                  autoComplete="name"
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={registroForm.email}
                  onChange={(event) =>
                    setRegistroForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="voce@email.com"
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  value={registroForm.password}
                  onChange={(event) =>
                    setRegistroForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Minimo recomendado: 6 caracteres"
                  autoComplete="new-password"
                  required
                />
              </label>
              <label>
                Confirmar senha
                <input
                  type="password"
                  value={registroForm.confirm}
                  onChange={(event) =>
                    setRegistroForm((current) => ({ ...current, confirm: event.target.value }))
                  }
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  required
                />
              </label>
              <button className="primary-button full" type="submit">
                <UserPlus size={17} aria-hidden="true" />
                {remoteLoading ? 'Criando...' : 'Criar conta'}
              </button>
            </form>
          )}
        </section>
      </main>
    )
  }

  function ComprarView() {
    if (!selectedRifa) {
      return (
        <main className="page">
          <EmptyState title="Rifa nao encontrada" text="Volte para a lista e escolha uma rifa ativa." />
        </main>
      )
    }

    const stats = getRifaStats(selectedRifa, compras, numerosRifa)
    const vendidos = getSoldNumbers(compras, selectedRifa.id, numerosRifa)
    const total = selectedNumbers.length * selectedRifa.preco

    return (
      <main className="page">
        <button className="back-button" type="button" onClick={() => goTo('rifas')}>
          <ChevronLeft size={17} aria-hidden="true" />
          Voltar para rifas
        </button>

        <section className="purchase-layout">
          <div className="number-panel">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Comprar numeros</p>
                <h1>{selectedRifa.nome}</h1>
                <p className="lead">{selectedRifa.premio_descricao}</p>
              </div>
              <span className="price-pill large">{currency.format(selectedRifa.preco)} cada</span>
            </div>

            <div className="number-legend" aria-label="Legenda">
              <span>
                <i className="legend-free" />
                Disponivel
              </span>
              <span>
                <i className="legend-selected" />
                Selecionado
              </span>
              <span>
                <i className="legend-sold" />
                Vendido
              </span>
            </div>

            <div className="number-grid">
              {Array.from({ length: selectedRifa.total_numeros }, (_, index) => {
                const numero = index + 1
                const isSold = vendidos.has(numero)
                const isSelected = selectedNumbers.includes(numero)

                return (
                  <button
                    key={numero}
                    type="button"
                    className={`number-button ${isSold ? 'sold' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleNumero(numero)}
                    disabled={isSold}
                    title={isSold ? `Numero ${numero} vendido` : `Selecionar numero ${numero}`}
                    aria-pressed={isSelected}
                  >
                    {numero}
                  </button>
                )
              })}
            </div>
          </div>

          <aside className="summary-panel">
            <img src={selectedRifa.imagem} alt="" />
            <h2>Resumo</h2>
            <dl className="summary-list">
              <div>
                <dt>Selecionados</dt>
                <dd>{selectedNumbers.length}</dd>
              </div>
              <div>
                <dt>Disponiveis</dt>
                <dd>{stats.disponiveis}</dd>
              </div>
              <div>
                <dt>Subtotal</dt>
                <dd>{currency.format(total)}</dd>
              </div>
            </dl>

            {selectedNumbers.length > 0 ? (
              <div className="selected-list">{selectedNumbers.map((numero) => `#${numero}`).join(' ')}</div>
            ) : (
              <p className="muted">Escolha um ou mais numeros para liberar a finalizacao.</p>
            )}

            <button
              className="primary-button full"
              type="button"
              onClick={confirmarCompra}
              disabled={selectedNumbers.length === 0 || paymentLoading}
            >
              <CircleDollarSign size={17} aria-hidden="true" />
              {paymentLoading ? 'Criando pagamento...' : 'Pagar com Mercado Pago'}
            </button>
          </aside>
        </section>
      </main>
    )
  }

  function MinhasComprasView() {
    return (
      <main className="page">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Historico</p>
            <h1>Minhas compras</h1>
          </div>
          <button className="outline-button" type="button" onClick={() => goTo('rifas')}>
            <Ticket size={17} aria-hidden="true" />
            Ver rifas
          </button>
        </div>

        {!user ? (
          <EmptyState title="Voce ainda nao entrou" text="Faca login para consultar suas compras." />
        ) : minhasCompras.length === 0 ? (
          <EmptyState title="Nenhuma compra por enquanto" text="Escolha uma rifa e selecione seus numeros." />
        ) : (
          <div className="purchase-list">
            {minhasCompras.map((compra) => {
              const rifa = rifas.find((item) => item.id === compra.rifa_id)

              return (
                <article className="purchase-card" key={compra.id}>
                  <div>
                    <span className={`status-pill ${normalizePaymentStatus(compra.status_pagamento)}`}>
                      <BadgeCheck size={15} aria-hidden="true" />
                      {getPaymentStatusLabel(compra.status_pagamento)}
                    </span>
                    <h2>{rifa?.nome || 'Rifa removida'}</h2>
                    <p>{formatDate(compra.data_compra)}</p>
                  </div>
                  <div className="selected-list">{compra.numeros.map((numero) => `#${numero}`).join(' ')}</div>
                  <strong>{currency.format(compra.valor_total)}</strong>
                </article>
              )
            })}
          </div>
        )}
      </main>
    )
  }

  function AdminView() {
    if (!isAdmin) {
      return (
        <main className="page">
          <EmptyState title="Acesso restrito" text="Entre com uma conta administradora para acessar o painel." />
        </main>
      )
    }

    return (
      <main className="page">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Administracao</p>
            <h1>Painel de controle</h1>
          </div>
          <div className="button-row">
            <button className="outline-button" type="button" onClick={resetDemoData}>
              <RefreshCcw size={17} aria-hidden="true" />
              {isRemoteMode ? 'Recarregar' : 'Restaurar demo'}
            </button>
            <button className="primary-button" type="button" onClick={() => goTo('criar-rifa')}>
              <Plus size={17} aria-hidden="true" />
              Nova rifa
            </button>
          </div>
        </div>

        <section className="metric-grid">
          <Metric icon={Ticket} label="Total de rifas" value={dashboardStats.rifas} />
          <Metric icon={CircleDollarSign} label={isRemoteMode ? 'Receita' : 'Receita simulada'} value={currency.format(dashboardStats.totalReceita)} />
          <Metric icon={ShoppingCart} label="Numeros vendidos" value={dashboardStats.totalNumeros} />
          <Metric icon={Users} label="Clientes ativos" value={dashboardStats.compradores} />
        </section>

        <section className="table-panel">
          <div className="table-heading">
            <h2>Rifas cadastradas</h2>
            <span>{rifas.length} registros</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rifa</th>
                  <th>Preco</th>
                  <th>Vendidos</th>
                  <th>Receita</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {rifas.map((rifa) => {
                  const stats = getRifaStats(rifa, compras, numerosRifa)
                  const statusMeta = getRifaStatusMeta(rifa)
                  const isPending = getRifaApprovalStatus(rifa) === 'pendente'

                  return (
                    <tr key={rifa.id}>
                      <td>
                        <strong>{rifa.nome}</strong>
                        <span>{rifa.total_numeros} numeros</span>
                      </td>
                      <td>{currency.format(rifa.preco)}</td>
                      <td>
                        {stats.vendidos}/{rifa.total_numeros}
                      </td>
                      <td>{currency.format(stats.receita)}</td>
                      <td>
                        <span className={statusMeta.className}>{statusMeta.label}</span>
                      </td>
                      <td>
                        <button className="outline-button small" type="button" onClick={() => toggleRifaStatus(rifa.id)}>
                          {rifa.ativa && !isPending ? <X size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
                          {isPending ? 'Aprovar' : rifa.ativa ? 'Inativar' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    )
  }

  function CriarRifaView() {
    if (!user) {
      return (
        <main className="page">
          <EmptyState title="Entre para criar rifa" text="Faca login para enviar sua rifa para aprovacao." />
        </main>
      )
    }

    return (
      <main className="page form-page">
        <button className="back-button" type="button" onClick={() => goTo(isAdmin ? 'admin' : 'rifas')}>
          <ChevronLeft size={17} aria-hidden="true" />
          {isAdmin ? 'Voltar ao painel' : 'Voltar para rifas'}
        </button>

        <section className="form-panel wide">
          <p className="eyebrow">{isAdmin ? 'Nova rifa' : 'Enviar rifa'}</p>
          <h1>{isAdmin ? 'Cadastrar premio' : 'Cadastrar premio para aprovacao'}</h1>

          <form className="form-grid" onSubmit={handleCriarRifa}>
            <label>
              Nome da rifa
              <input
                type="text"
                value={novaRifa.nome}
                onChange={(event) => setNovaRifa({ ...novaRifa, nome: event.target.value })}
                placeholder="Ex: Smartphone premium"
                required
              />
            </label>

            <label>
              Descricao do premio
              <input
                type="text"
                value={novaRifa.premio_descricao}
                onChange={(event) => setNovaRifa({ ...novaRifa, premio_descricao: event.target.value })}
                placeholder="O que sera sorteado"
                required
              />
            </label>

            <label className="span-2">
              Descricao curta
              <textarea
                value={novaRifa.descricao}
                onChange={(event) => setNovaRifa({ ...novaRifa, descricao: event.target.value })}
                placeholder="Explique regras, estado do premio e entrega"
                required
              />
            </label>

            <label>
              Preco por numero
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={novaRifa.preco}
                onChange={(event) => setNovaRifa({ ...novaRifa, preco: event.target.value })}
                placeholder="10.00"
                required
              />
            </label>

            <label>
              Total de numeros
              <input
                type="number"
                min="10"
                max="500"
                value={novaRifa.total_numeros}
                onChange={(event) => setNovaRifa({ ...novaRifa, total_numeros: event.target.value })}
                placeholder="100"
                required
              />
            </label>

            <label>
              Data de encerramento
              <input
                type="date"
                value={novaRifa.data_termino}
                onChange={(event) => setNovaRifa({ ...novaRifa, data_termino: event.target.value })}
                required
              />
            </label>

            <label>
              URL da imagem
              <input
                type="url"
                value={novaRifa.imagem}
                onChange={(event) => setNovaRifa({ ...novaRifa, imagem: event.target.value })}
                placeholder="https://..."
                required
              />
            </label>

            <div className="form-actions span-2">
              <button className="outline-button" type="button" onClick={() => goTo(isAdmin ? 'admin' : 'rifas')}>
                <X size={17} aria-hidden="true" />
                Cancelar
              </button>
              <button className="primary-button" type="submit">
                <Plus size={17} aria-hidden="true" />
                {isAdmin ? 'Criar rifa' : 'Enviar para aprovacao'}
              </button>
            </div>
          </form>
        </section>
      </main>
    )
  }

  function EmptyState({ title, text }) {
    return (
      <div className="empty-state">
        <Ticket size={28} aria-hidden="true" />
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      {Header()}

      {view === 'rifas' && RifasView()}
      {view === 'auth' && AuthView()}
      {view === 'comprar' && ComprarView()}
      {view === 'minhas-compras' && MinhasComprasView()}
      {view === 'admin' && AdminView()}
      {view === 'criar-rifa' && CriarRifaView()}

      {message && (
        <div className="toast" role="status">
          <BadgeCheck size={17} aria-hidden="true" />
          {message}
        </div>
      )}
    </div>
  )
}
import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  Banknote,
  CalendarDays,
  Check,
  ChevronLeft,
  CircleDollarSign,
  LayoutDashboard,
  LogIn,
  LogOut,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Ticket,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { dataMode, hasSupabaseConfig, supabase } from './lib/supabaseClient'
import './App.css'

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const demoUsers = [
  {
    id: 'admin-demo',
    nome: 'Admin RifaMax',
    email: 'admin@rifamax.com',
    password: 'admin123',
    id_admin: true,
    data_criacao: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 'cliente-demo',
    nome: 'Cliente Demo',
    email: 'cliente@rifamax.com',
    password: 'cliente123',
    id_admin: false,
    data_criacao: '2026-06-02T10:00:00.000Z',
  },
]

const demoRifas = [
  {
    id: 'rifa-console',
    nome: 'Console gamer completo',
    descricao: 'Console novo com dois controles, assinatura premium e entrega nacional.',
    imagem:
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80',
    preco: 12.5,
    total_numeros: 120,
    premio_descricao: 'Console de ultima geracao com kit de jogos',
    criador_id: 'admin-demo',
    ativa: true,
    status_aprovacao: 'aprovada',
    data_termino: '2026-08-15',
    data_criacao: '2026-06-11T14:00:00.000Z',
  },
  {
    id: 'rifa-smartphone',
    nome: 'Smartphone premium',
    descricao: 'Aparelho lacrado, 256 GB, garantia nacional e capa inclusa.',
    imagem:
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1200&q=80',
    preco: 9,
    total_numeros: 100,
    premio_descricao: 'Smartphone premium 256 GB',
    criador_id: 'admin-demo',
    ativa: true,
    status_aprovacao: 'aprovada',
    data_termino: '2026-07-28',
    data_criacao: '2026-06-10T14:00:00.000Z',
  },
  {
    id: 'rifa-sneaker',
    nome: 'Sneaker colecionavel',
    descricao: 'Modelo exclusivo para quem curte estilo, conforto e sorteio rapido.',
    imagem:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
    preco: 6,
    total_numeros: 80,
    premio_descricao: 'Sneaker original no tamanho escolhido',
    criador_id: 'admin-demo',
    ativa: true,
    status_aprovacao: 'aprovada',
    data_termino: '2026-07-12',
    data_criacao: '2026-06-09T14:00:00.000Z',
  },
]

const demoCompras = [
  {
    id: 'compra-001',
    rifa_id: 'rifa-console',
    comprador_id: 'cliente-demo',
    comprador_nome: 'Cliente Demo',
    numeros: [3, 14, 27, 88],
    valor_total: 50,
    quantidade_numeros: 4,
    status_pagamento: 'confirmado',
    metodo_pagamento: 'simulado',
    data_compra: '2026-06-18T12:20:00.000Z',
  },
  {
    id: 'compra-002',
    rifa_id: 'rifa-smartphone',
    comprador_id: 'cliente-demo',
    comprador_nome: 'Cliente Demo',
    numeros: [6, 19, 41],
    valor_total: 27,
    quantidade_numeros: 3,
    status_pagamento: 'confirmado',
    metodo_pagamento: 'simulado',
    data_compra: '2026-06-19T09:40:00.000Z',
  },
  {
    id: 'compra-003',
    rifa_id: 'rifa-sneaker',
    comprador_id: 'admin-demo',
    comprador_nome: 'Admin RifaMax',
    numeros: [4, 8, 12, 24, 48],
    valor_total: 30,
    quantidade_numeros: 5,
    status_pagamento: 'confirmado',
    metodo_pagamento: 'simulado',
    data_compra: '2026-06-20T16:10:00.000Z',
  },
]

const emptyRifa = {
  nome: '',
  descricao: '',
  imagem: '',
  preco: '',
  total_numeros: '',
  data_termino: '',
  premio_descricao: '',
}

function buildDemoNumerosRifa() {
  const vendidos = new Set(demoCompras.flatMap((compra) => compra.numeros.map((numero) => `${compra.rifa_id}:${numero}`)))

  return demoRifas.flatMap((rifa) =>
    Array.from({ length: rifa.total_numeros }, (_, index) => {
      const numero = index + 1

      return {
        id: `${rifa.id}-${numero}`,
        rifa_id: rifa.id,
        numero,
        vendido: vendidos.has(`${rifa.id}:${numero}`),
      }
    }),
  )
}

function createId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? JSON.parse(saved) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue]
}

function isBlockingPurchase(compra) {
  return !['falha', 'reembolso', 'cancelado'].includes(normalizePaymentStatus(compra.status_pagamento))
}

function getSoldNumbers(compras, rifaId, numerosRifa = []) {
  return new Set(
    [
      ...compras
      .filter((compra) => compra.rifa_id === rifaId && isBlockingPurchase(compra))
      .flatMap((compra) => compra.numeros),
      ...numerosRifa
        .filter((numero) => numero.rifa_id === rifaId && numero.vendido)
        .map((numero) => numero.numero),
    ],
  )
}

function getRifaStats(rifa, compras, numerosRifa = []) {
  const soldNumbers = getSoldNumbers(compras, rifa.id, numerosRifa)
  const vendidos = soldNumbers.size
  const disponiveis = Math.max(rifa.total_numeros - vendidos, 0)
  const percentual = rifa.total_numeros > 0 ? Math.round((vendidos / rifa.total_numeros) * 100) : 0
  const receita = [...soldNumbers].length * rifa.preco

  return { vendidos, disponiveis, percentual, receita }
}

function formatDate(value) {
  if (!value) return 'Sem data'

  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value))
}

function normalizePaymentStatus(status) {
  const value = String(status || '').toLowerCase()

  if (['approved', 'success', 'confirmado'].includes(value)) return 'confirmado'
  if (['pending', 'in_process', 'in_mediation', 'pendente'].includes(value)) return 'pendente'
  if (['rejected', 'cancelled', 'failure', 'falha'].includes(value)) return 'falha'
  return value || 'pendente'
}

function getPaymentStatusLabel(status) {
  const normalized = normalizePaymentStatus(status)

  if (normalized === 'confirmado') return 'Confirmado'
  if (normalized === 'falha') return 'Falhou'
  return 'Pendente'
}

function getRifaApprovalStatus(rifa) {
  return rifa?.status_aprovacao || 'aprovada'
}

function isRifaPublic(rifa) {
  return Boolean(rifa?.ativa) && getRifaApprovalStatus(rifa) === 'aprovada'
}

function getRifaStatusMeta(rifa) {
  const approvalStatus = getRifaApprovalStatus(rifa)

  if (approvalStatus === 'pendente') {
    return { className: 'status-pill pendente', label: 'Pendente' }
  }

  if (approvalStatus === 'reprovada') {
    return { className: 'status-pill falha', label: 'Reprovada' }
  }

  if (!rifa.ativa) {
    return { className: 'status-pill muted-status', label: 'Inativa' }
  }

  return { className: 'status-pill success', label: 'Ativa' }
}

function sortNumbers(numbers) {
  return [...numbers].sort((a, b) => a - b)
}

export default function App() {
  const isRemoteMode = hasSupabaseConfig && Boolean(supabase)
  const [usuarios, setUsuarios] = usePersistentState('rifamax:usuarios', demoUsers)
  const [rifas, setRifas] = usePersistentState('rifamax:rifas', demoRifas)
  const [compras, setCompras] = usePersistentState('rifamax:compras', demoCompras)
  const [numerosRifa, setNumerosRifa] = usePersistentState('rifamax:numeros', buildDemoNumerosRifa())
  const [currentUserId, setCurrentUserId] = usePersistentState('rifamax:sessao', '')
  const [view, setView] = useState('rifas')
  const [selectedRifaId, setSelectedRifaId] = useState(demoRifas[0].id)
  const [selectedNumbers, setSelectedNumbers] = useState([])
  const [search, setSearch] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registroForm, setRegistroForm] = useState({ nome: '', email: '', password: '', confirm: '' })
  const [novaRifa, setNovaRifa] = useState(emptyRifa)
  const [message, setMessage] = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [remoteLoading, setRemoteLoading] = useState(false)

  const user = useMemo(
    () => usuarios.find((usuario) => usuario.id === currentUserId) || null,
    [currentUserId, usuarios],
  )

  const isAdmin = Boolean(user?.id_admin)
  const selectedRifa = rifas.find((rifa) => rifa.id === selectedRifaId) || rifas[0]

  const visibleRifas = useMemo(() => {
    const term = search.trim().toLowerCase()

    return rifas
      .filter(isRifaPublic)
      .filter((rifa) => {
        if (!term) return true
        return [rifa.nome, rifa.descricao, rifa.premio_descricao].some((value) =>
          value.toLowerCase().includes(term),
        )
      })
  }, [rifas, search])

  const minhasCompras = useMemo(() => {
    if (!user) return []
    return compras
      .filter((compra) => compra.comprador_id === user.id)
      .sort((a, b) => new Date(b.data_compra) - new Date(a.data_compra))
  }, [compras, user])

  const dashboardStats = useMemo(() => {
    const totalReceita = compras.reduce((sum, compra) => sum + compra.valor_total, 0)
    const totalNumeros = rifas.reduce(
      (sum, rifa) => sum + getSoldNumbers(compras, rifa.id, numerosRifa).size,
      0,
    )
    const compradores = new Set(compras.map((compra) => compra.comprador_id)).size

    return {
      rifas: rifas.length,
      ativas: rifas.filter(isRifaPublic).length,
      totalReceita,
      totalNumeros,
      compradores,
    }
  }, [compras, numerosRifa, rifas])

  useEffect(() => {
    if (!message) return undefined

    const timeout = window.setTimeout(() => setMessage(''), 3500)
    return () => window.clearTimeout(timeout)
  }, [message])

  useEffect(() => {
    setSelectedNumbers([])
  }, [selectedRifaId])

  useEffect(() => {
    if (!isRemoteMode) return undefined

    let active = true

    async function bootstrapRemoteData() {
      setRemoteLoading(true)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const profile = session?.user ? await applyRemoteUser(session.user) : null

        if (!session?.user) {
          setUsuarios([])
          setCurrentUserId('')
          setCompras([])
        }

        if (active) {
          await carregarDadosRemotos(profile)
        }
      } catch (error) {
        notify(error.message || 'Erro ao carregar dados do Supabase.')
      } finally {
        if (active) setRemoteLoading(false)
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return

      const profile = session?.user ? await applyRemoteUser(session.user) : null

      if (!session?.user) {
        setUsuarios([])
        setCurrentUserId('')
        setCompras([])
      }

      await carregarDadosRemotos(profile)
    })

    bootstrapRemoteData()

    return () => {
      active = false
      subscription.unsubscribe()
    }
    // Dados remotos devem ser inicializados apenas quando o modo Supabase muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRemoteMode])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const externalReference = params.get('external_reference')
    const rawStatus = params.get('status') || params.get('collection_status') || params.get('payment')
    const paymentId = params.get('payment_id') || params.get('collection_id')

    if (!externalReference || !rawStatus) return

    async function syncPaymentReturn() {
      let nextStatus = normalizePaymentStatus(rawStatus)

      if (isRemoteMode && paymentId) {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.access_token) {
          const response = await fetch('/api/mercadopago/sync-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              externalReference,
              paymentId,
              supabaseAccessToken: session.access_token,
            }),
          })

          const result = await response.json().catch(() => ({}))

          if (response.ok && result.status_pagamento) {
            nextStatus = result.status_pagamento
          }
        }
      }

      setCompras((current) =>
        current.map((compra) =>
          compra.external_reference === externalReference
            ? {
                ...compra,
                id_transacao_mp: paymentId || compra.id_transacao_mp,
                status_pagamento: nextStatus,
              }
            : compra,
        ),
      )

      await carregarDadosRemotos()
      goTo('minhas-compras')
      notify(
        nextStatus === 'confirmado'
          ? 'Pagamento aprovado pelo Mercado Pago.'
          : 'Recebemos o retorno do Mercado Pago. A compra esta pendente ou precisa de revisao.',
      )
      window.history.replaceState({}, '', window.location.pathname)
    }

    syncPaymentReturn().catch((error) => {
      notify(error.message || 'Nao foi possivel sincronizar o pagamento.')
    })
    // Sincronizacao acontece somente quando a URL de retorno muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCompras])

  function notify(text) {
    setMessage(text)
  }

  function goTo(nextView) {
    setView(nextView)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function mapRemoteProfile(row, authUser) {
    return {
      id: authUser.id,
      perfil_id: row?.id,
      id_usuario: authUser.id,
      nome: row?.nome || authUser.user_metadata?.nome || authUser.email,
      email: row?.email || authUser.email,
      id_admin: Boolean(row?.id_admin),
      data_criacao: row?.data_criacao || authUser.created_at,
    }
  }

  function mapRemoteCompra(row) {
    return {
      id: row.id,
      rifa_id: row.rifa_id,
      comprador_id: row.comprador_id,
      comprador_nome: row.usuarios?.nome || row.comprador_nome || 'Cliente',
      numeros: sortNumbers((row.compra_numeros || []).map((item) => item.numero)),
      valor_total: Number(row.valor_total || 0),
      quantidade_numeros: row.quantidade_numeros,
      status_pagamento: row.status_pagamento,
      metodo_pagamento: row.metodo_pagamento,
      external_reference: row.referencia_externa,
      preference_id: row.preference_id,
      id_transacao_mp: row.id_transacao_mp,
      data_compra: row.data_compra,
    }
  }

  async function applyRemoteUser(authUser) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id_usuario', authUser.id)
      .maybeSingle()

    if (error) throw error

    let profile = data

    if (!profile) {
      const { data: inserted, error: insertError } = await supabase
        .from('usuarios')
        .insert({
          id_usuario: authUser.id,
          nome: authUser.user_metadata?.nome || authUser.email,
          email: authUser.email,
        })
        .select('*')
        .single()

      if (insertError) throw insertError
      profile = inserted
    }

    const mappedProfile = mapRemoteProfile(profile, authUser)

    setUsuarios([mappedProfile])
    setCurrentUserId(authUser.id)

    return mappedProfile
  }

  async function carregarDadosRemotos(profile = user) {
    if (!isRemoteMode) return

    const { data: rifasData, error: rifasError } = await supabase
      .from('rifas')
      .select('*')
      .order('data_criacao', { ascending: false })

    if (rifasError) throw rifasError

    const { data: numerosData, error: numerosError } = await supabase
      .from('numeros_rifa')
      .select('id, rifa_id, numero, vendido, comprador_id, data_venda')
      .order('numero', { ascending: true })

    if (numerosError) throw numerosError

    setRifas((rifasData || []).map((rifa) => ({ ...rifa, preco: Number(rifa.preco) })))
    setNumerosRifa(numerosData || [])

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      setCompras([])
      return
    }

    let comprasQuery = supabase
      .from('compras')
      .select('*, compra_numeros(numero)')
      .order('data_compra', { ascending: false })

    if (!profile?.id_admin) {
      comprasQuery = comprasQuery.eq('comprador_id', authUser.id)
    }

    const { data: comprasData, error: comprasError } = await comprasQuery

    if (comprasError) throw comprasError

    setCompras((comprasData || []).map(mapRemoteCompra))
  }

  async function loginAs(email, password) {
    if (isRemoteMode) {
      notify('Os acessos demo ficam desativados no modo publico. Use uma conta real.')
      return false
    }

    const match = usuarios.find(
      (usuario) => usuario.email === normalizeEmail(email) && usuario.password === password,
    )

    if (!match) {
      notify('Email ou senha invalidos.')
      return false
    }

    setCurrentUserId(match.id)
    setLoginForm({ email: '', password: '' })
    goTo('rifas')
    notify(`Bem-vindo, ${match.nome}.`)
    return true
  }

  async function handleLogin(event) {
    event.preventDefault()

    if (!isRemoteMode) {
      await loginAs(loginForm.email, loginForm.password)
      return
    }

    try {
      setRemoteLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizeEmail(loginForm.email),
        password: loginForm.password,
      })

      if (error) throw error

      const profile = await applyRemoteUser(data.user)
      await carregarDadosRemotos(profile)
      setLoginForm({ email: '', password: '' })
      goTo('rifas')
      notify(`Bem-vindo, ${profile.nome}.`)
    } catch (error) {
      const errorMessage = String(error.message || '')
      notify(
        errorMessage.toLowerCase().includes('email not confirmed')
          ? 'Seu email ainda precisa ser confirmado no Supabase antes do login.'
          : error.message || 'Erro ao fazer login.',
      )
    } finally {
      setRemoteLoading(false)
    }
  }

  async function handleRegistro(event) {
    event.preventDefault()

    const email = normalizeEmail(registroForm.email)
    if (registroForm.password !== registroForm.confirm) {
      notify('As senhas nao coincidem.')
      return
    }

    if (isRemoteMode) {
      try {
        setRemoteLoading(true)
        const { data, error } = await supabase.auth.signUp({
          email,
          password: registroForm.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              nome: registroForm.nome.trim(),
            },
          },
        })

        if (error) throw error

        if (data.session?.user) {
          const profile = await applyRemoteUser(data.session.user)
          await carregarDadosRemotos(profile)
          setRegistroForm({ nome: '', email: '', password: '', confirm: '' })
          goTo('rifas')
          notify('Conta criada. Voce ja pode comprar numeros.')
        } else {
          setAuthMode('login')
          setLoginForm((current) => ({ ...current, email }))
          notify('Cadastro criado. Confirme seu email antes de entrar.')
        }
      } catch (error) {
        notify(error.message || 'Erro ao criar conta.')
      } finally {
        setRemoteLoading(false)
      }

      return
    }

    if (usuarios.some((usuario) => usuario.email === email)) {
      notify('Este email ja esta cadastrado.')
      return
    }

    const novoUsuario = {
      id: createId('usuario'),
      nome: registroForm.nome.trim(),
      email,
      password: registroForm.password,
      id_admin: false,
      data_criacao: new Date().toISOString(),
    }

    setUsuarios((current) => [...current, novoUsuario])
    setCurrentUserId(novoUsuario.id)
    setRegistroForm({ nome: '', email: '', password: '', confirm: '' })
    goTo('rifas')
    notify('Conta criada. Voce ja pode comprar numeros.')
  }

  async function logout() {
    if (isRemoteMode) {
      await supabase.auth.signOut()
      setUsuarios([])
      setCompras([])
    }

    setCurrentUserId('')
    goTo('rifas')
    notify('Sessao encerrada.')
  }

  function openCompra(rifaId) {
    if (!user) {
      setAuthMode('login')
      goTo('auth')
      notify('Entre ou crie uma conta para comprar numeros.')
      return
    }

    setSelectedRifaId(rifaId)
    goTo('comprar')
  }

  function toggleNumero(numero) {
    if (!selectedRifa) return

    const vendidos = getSoldNumbers(compras, selectedRifa.id, numerosRifa)
    if (vendidos.has(numero)) return

    setSelectedNumbers((current) =>
      current.includes(numero)
        ? current.filter((item) => item !== numero)
        : sortNumbers([...current, numero]),
    )
  }

  async function confirmarCompra() {
    if (!user) {
      setAuthMode('login')
      goTo('auth')
      notify('Entre para finalizar a compra.')
      return
    }

    if (!selectedRifa || selectedNumbers.length === 0) {
      notify('Selecione pelo menos um numero.')
      return
    }

    const vendidos = getSoldNumbers(compras, selectedRifa.id, numerosRifa)
    const conflitos = selectedNumbers.filter((numero) => vendidos.has(numero))
    if (conflitos.length > 0) {
      setSelectedNumbers((current) => current.filter((numero) => !vendidos.has(numero)))
      notify(`Os numeros ${conflitos.join(', ')} acabaram de ser vendidos.`)
      return
    }

    const numeros = sortNumbers(selectedNumbers)
    const valorTotal = Number((numeros.length * selectedRifa.preco).toFixed(2))
    const externalReference = createId('mp')

    setPaymentLoading(true)

    try {
      const response = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buyerEmail: user.email,
          buyerName: user.nome,
          externalReference,
          numeros,
          premioDescricao: selectedRifa.premio_descricao,
          rifaId: selectedRifa.id,
          rifaNome: selectedRifa.nome,
          unitPrice: selectedRifa.preco,
        }),
      })

      const rawResponse = await response.text()
      let preference = {}

      try {
        preference = rawResponse ? JSON.parse(rawResponse) : {}
      } catch {
        preference = { error: rawResponse || 'Resposta invalida do servidor de pagamento.' }
      }

      if (!response.ok) {
        throw new Error(preference.error || 'Nao foi possivel iniciar o pagamento.')
      }

      if (!preference.init_point) {
        throw new Error('O Mercado Pago nao retornou o link de checkout.')
      }

      const novaCompra = {
        id: createId('compra'),
        rifa_id: selectedRifa.id,
        comprador_id: user.id,
        comprador_nome: user.nome,
        numeros,
        valor_total: valorTotal,
        quantidade_numeros: numeros.length,
        status_pagamento: 'pendente',
        metodo_pagamento: 'mercado_pago',
        external_reference: externalReference,
        preference_id: preference.id,
        data_compra: new Date().toISOString(),
      }

      if (isRemoteMode) {
        const { data: compraCriada, error: compraError } = await supabase.rpc('criar_compra_mercado_pago', {
          p_rifa_id: selectedRifa.id,
          p_numeros: numeros,
          p_valor_total: valorTotal,
          p_referencia_externa: externalReference,
          p_preference_id: preference.id,
        })

        if (compraError) throw compraError

        const compra = Array.isArray(compraCriada) ? compraCriada[0] : compraCriada
        if (!compra?.id) {
          throw new Error('A compra foi reservada, mas o banco nao retornou o comprovante.')
        }

        novaCompra.id = compra.id
      }

      setCompras((current) => [novaCompra, ...current])
      setNumerosRifa((current) =>
        current.map((item) =>
          item.rifa_id === selectedRifa.id && numeros.includes(item.numero)
            ? { ...item, vendido: true, comprador_id: user.id }
            : item,
        ),
      )
      setSelectedNumbers([])
      window.location.href = preference.init_point
    } catch (error) {
      notify(error.message || 'Erro ao iniciar pagamento no Mercado Pago.')
    } finally {
      setPaymentLoading(false)
    }
  }

  async function handleCriarRifa(event) {
    event.preventDefault()

    if (!user) {
      setAuthMode('login')
      goTo('auth')
      notify('Entre para cadastrar uma rifa.')
      return
    }

    const preco = Number(novaRifa.preco)
    const totalNumeros = Number.parseInt(novaRifa.total_numeros, 10)

    if (!Number.isFinite(preco) || preco <= 0) {
      notify('Informe um preco valido.')
      return
    }

    if (!Number.isInteger(totalNumeros) || totalNumeros < 10 || totalNumeros > 500) {
      notify('Use entre 10 e 500 numeros para manter a grade legivel.')
      return
    }

    const rifaPayload = {
      nome: novaRifa.nome.trim(),
      descricao: novaRifa.descricao.trim(),
      imagem: novaRifa.imagem.trim(),
      preco,
      total_numeros: totalNumeros,
      premio_descricao: novaRifa.premio_descricao.trim(),
      criador_id: user.id,
      ativa: !isRemoteMode || isAdmin,
      status_aprovacao: !isRemoteMode || isAdmin ? 'aprovada' : 'pendente',
      data_termino: novaRifa.data_termino,
    }

    try {
      if (isRemoteMode) {
        setRemoteLoading(true)

        const { error } = await supabase.rpc('criar_rifa_publica', {
          p_nome: rifaPayload.nome,
          p_descricao: rifaPayload.descricao,
          p_imagem: rifaPayload.imagem,
          p_preco: preco,
          p_total_numeros: totalNumeros,
          p_premio_descricao: rifaPayload.premio_descricao,
          p_data_termino: rifaPayload.data_termino,
        })

        if (error) {
          const message = String(error.message || '')
          throw new Error(
            message.includes('criar_rifa_publica')
              ? 'Configuracao pendente: execute a migracao publica no Supabase para liberar cadastro de rifas.'
              : error.message,
          )
        }

        await carregarDadosRemotos(user)
      } else {
        const rifa = {
          ...rifaPayload,
          id: createId('rifa'),
          data_criacao: new Date().toISOString(),
        }

        setRifas((current) => [rifa, ...current])
        setNumerosRifa((current) => [
          ...Array.from({ length: totalNumeros }, (_, index) => ({
            id: `${rifa.id}-${index + 1}`,
            rifa_id: rifa.id,
            numero: index + 1,
            vendido: false,
          })),
          ...current,
        ])
      }

      setNovaRifa(emptyRifa)
      goTo(isAdmin ? 'admin' : 'rifas')
      notify(isAdmin ? 'Rifa criada e aprovada.' : 'Rifa enviada para aprovacao do administrador.')
    } catch (error) {
      notify(error.message || 'Erro ao criar rifa.')
    } finally {
      setRemoteLoading(false)
    }
  }

  async function toggleRifaStatus(rifaId) {
    const rifaAtual = rifas.find((rifa) => rifa.id === rifaId)
    if (!rifaAtual) return

    const isPending = getRifaApprovalStatus(rifaAtual) === 'pendente'
    const updatePayload = isPending
      ? { ativa: true, status_aprovacao: 'aprovada' }
      : { ativa: !rifaAtual.ativa }

    if (isRemoteMode) {
      const { error } = await supabase.from('rifas').update(updatePayload).eq('id', rifaId)

      if (error) {
        notify(error.message || 'Erro ao atualizar rifa.')
        return
      }

      await carregarDadosRemotos(user)
      notify(isPending ? 'Rifa aprovada e publicada.' : 'Status da rifa atualizado.')
      return
    }

    setRifas((current) =>
      current.map((rifa) => (rifa.id === rifaId ? { ...rifa, ...updatePayload } : rifa)),
    )
    notify(isPending ? 'Rifa aprovada e publicada.' : 'Status da rifa atualizado.')
  }

  function resetDemoData() {
    if (isRemoteMode) {
      carregarDadosRemotos(user)
      notify('Dados recarregados do Supabase.')
      return
    }

    setUsuarios(demoUsers)
    setRifas(demoRifas)
    setCompras(demoCompras)
    setNumerosRifa(buildDemoNumerosRifa())
    setCurrentUserId('')
    setSelectedRifaId(demoRifas[0].id)
    setSelectedNumbers([])
    goTo('rifas')
    notify('Dados de demonstracao restaurados.')
  }

  function Header() {
    return (
      <header className="topbar">
        <button className="brand" type="button" onClick={() => goTo('rifas')}>
          <span className="brand-mark">
            <Ticket size={22} aria-hidden="true" />
          </span>
          <span>
            <strong>RifaMax</strong>
            <small>{dataMode === 'configured' ? 'Online com Supabase' : 'Demo local'}</small>
          </span>
        </button>

        <nav className="nav-actions" aria-label="Navegacao principal">
          <button className="ghost-button" type="button" onClick={() => goTo('rifas')}>
            <Ticket size={17} aria-hidden="true" />
            Rifas
          </button>

          {user && (
            <button className="ghost-button" type="button" onClick={() => goTo('minhas-compras')}>
              <ShoppingCart size={17} aria-hidden="true" />
              Compras
            </button>
          )}

          {user && (
            <button className="ghost-button" type="button" onClick={() => goTo('criar-rifa')}>
              <Plus size={17} aria-hidden="true" />
              Criar rifa
            </button>
          )}

          {isAdmin && (
            <button className="ghost-button" type="button" onClick={() => goTo('admin')}>
              <LayoutDashboard size={17} aria-hidden="true" />
              Admin
            </button>
          )}

          {user ? (
            <button className="outline-button" type="button" onClick={logout}>
              <LogOut size={17} aria-hidden="true" />
              Sair
            </button>
          ) : (
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setAuthMode('login')
                goTo('auth')
              }}
            >
              <LogIn size={17} aria-hidden="true" />
              Entrar
            </button>
          )}
        </nav>
      </header>
    )
  }

  function RifasView() {
    return (
      <main className="page">
        <section className="overview-band">
          <div>
            <p className="eyebrow">Plataforma de rifas online</p>
            <h1>Escolha seus numeros e acompanhe tudo em tempo real.</h1>
            <p className="lead">
              {isRemoteMode
                ? 'Rifas, usuarios, numeros reservados e compras agora usam o banco real.'
                : 'O fluxo esta pronto para demonstracao: login, cadastro, painel admin, criacao de rifas, selecao de numeros e historico de compras.'}
            </p>
          </div>

          <div className="quick-panel" aria-label="Acessos rapidos">
            <div className="user-chip">
              <Users size={18} aria-hidden="true" />
              {user ? user.nome : 'Visitante'}
            </div>
            {isRemoteMode ? (
              <button className="outline-button" type="button" onClick={() => goTo(user ? 'minhas-compras' : 'auth')}>
                <ShieldCheck size={17} aria-hidden="true" />
                {user ? 'Minha conta' : 'Entrar agora'}
              </button>
            ) : (
              <>
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => loginAs('cliente@rifamax.com', 'cliente123')}
                >
                  <LogIn size={17} aria-hidden="true" />
                  Cliente demo
                </button>
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => loginAs('admin@rifamax.com', 'admin123')}
                >
                  <ShieldCheck size={17} aria-hidden="true" />
                  Admin demo
                </button>
              </>
            )}
          </div>
        </section>

        {user && (
          <section className="metric-grid" aria-label="Resumo">
            <Metric icon={Ticket} label="Rifas ativas" value={dashboardStats.ativas} />
            <Metric icon={ShoppingCart} label="Numeros vendidos" value={dashboardStats.totalNumeros} />
            <Metric icon={Banknote} label={isRemoteMode ? 'Faturamento' : 'Faturamento demo'} value={currency.format(dashboardStats.totalReceita)} />
            <Metric icon={Users} label="Compradores" value={dashboardStats.compradores} />
          </section>
        )}

        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Disponiveis agora</p>
              <h2>Rifas em destaque</h2>
            </div>

            <label className="search-box">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar rifa"
              />
            </label>
          </div>

          {visibleRifas.length === 0 ? (
              <EmptyState
                title="Nenhuma rifa encontrada"
                text="Limpe a busca ou entre para enviar uma rifa para aprovacao."
              />
          ) : (
            <div className="raffle-grid">
              {visibleRifas.map((rifa) => (
                <RifaCard key={rifa.id} rifa={rifa} />
              ))}
            </div>
          )}
        </section>
      </main>
    )
  }

  function Metric({ icon: Icon, label, value }) {
    return (
      <article className="metric-card">
        <Icon size={20} aria-hidden="true" />
        <span>{label}</span>
        <strong>{value}</strong>
      </article>
    )
  }

  function RifaCard({ rifa }) {
    const stats = getRifaStats(rifa, compras, numerosRifa)

    return (
      <article className="raffle-card">
        <img src={rifa.imagem} alt={rifa.nome} />
        <div className="raffle-content">
          <div className="raffle-title-row">
            <h3>{rifa.nome}</h3>
            <span className="price-pill">{currency.format(rifa.preco)}</span>
          </div>
          <p>{rifa.descricao}</p>

          <div className="prize-line">
            <Trophy size={17} aria-hidden="true" />
            <span>{rifa.premio_descricao}</span>
          </div>

          <div className="progress-row">
            <div className="progress-copy">
              <span>{stats.vendidos} vendidos</span>
              <strong>{stats.percentual}%</strong>
            </div>
            <div className="progress-track" aria-hidden="true">
              <span style={{ width: `${stats.percentual}%` }} />
            </div>
          </div>

          <div className="card-footer">
            <span className="date-chip">
              <CalendarDays size={15} aria-hidden="true" />
              {formatDate(rifa.data_termino)}
            </span>
            <button className="primary-button" type="button" onClick={() => openCompra(rifa.id)}>
              <ShoppingCart size={17} aria-hidden="true" />
              Comprar
            </button>
          </div>
        </div>
      </article>
    )
  }

  function AuthView() {
    return (
      <main className="page auth-page">
        <section className="auth-copy">
          <p className="eyebrow">Acesso</p>
          <h1>{authMode === 'login' ? 'Entre para comprar numeros.' : 'Crie sua conta em segundos.'}</h1>
          <p className="lead">
            {isRemoteMode
              ? 'Entre com seu email e senha para comprar numeros e acompanhar pagamentos.'
              : 'Use os acessos de demonstracao para testar o painel completo sem configurar o Supabase.'}
          </p>

          {!isRemoteMode && <div className="demo-login-row">
            <button
              className="outline-button"
              type="button"
              onClick={() => loginAs('cliente@rifamax.com', 'cliente123')}
            >
              <Users size={17} aria-hidden="true" />
              Cliente demo
            </button>
            <button
              className="outline-button"
              type="button"
              onClick={() => loginAs('admin@rifamax.com', 'admin123')}
            >
              <ShieldCheck size={17} aria-hidden="true" />
              Admin demo
            </button>
          </div>}
        </section>

        <section className="form-panel">
          <div className="segmented">
            <button
              type="button"
              className={authMode === 'login' ? 'active' : ''}
              onClick={() => setAuthMode('login')}
            >
              <LogIn size={16} aria-hidden="true" />
              Entrar
            </button>
            <button
              type="button"
              className={authMode === 'registro' ? 'active' : ''}
              onClick={() => setAuthMode('registro')}
            >
              <UserPlus size={16} aria-hidden="true" />
              Cadastro
            </button>
          </div>

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="form-stack">
              <label>
                Email
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="voce@email.com"
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  required
                />
              </label>
              <button className="primary-button full" type="submit">
                <LogIn size={17} aria-hidden="true" />
                {remoteLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegistro} className="form-stack">
              <label>
                Nome completo
                <input
                  type="text"
                  value={registroForm.nome}
                  onChange={(event) =>
                    setRegistroForm((current) => ({ ...current, nome: event.target.value }))
                  }
                  placeholder="Seu nome"
                  autoComplete="name"
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={registroForm.email}
                  onChange={(event) =>
                    setRegistroForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="voce@email.com"
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  value={registroForm.password}
                  onChange={(event) =>
                    setRegistroForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Minimo recomendado: 6 caracteres"
                  autoComplete="new-password"
                  required
                />
              </label>
              <label>
                Confirmar senha
                <input
                  type="password"
                  value={registroForm.confirm}
                  onChange={(event) =>
                    setRegistroForm((current) => ({ ...current, confirm: event.target.value }))
                  }
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  required
                />
              </label>
              <button className="primary-button full" type="submit">
                <UserPlus size={17} aria-hidden="true" />
                {remoteLoading ? 'Criando...' : 'Criar conta'}
              </button>
            </form>
          )}
        </section>
      </main>
    )
  }

  function ComprarView() {
    if (!selectedRifa) {
      return (
        <main className="page">
          <EmptyState title="Rifa nao encontrada" text="Volte para a lista e escolha uma rifa ativa." />
        </main>
      )
    }

    const stats = getRifaStats(selectedRifa, compras, numerosRifa)
    const vendidos = getSoldNumbers(compras, selectedRifa.id, numerosRifa)
    const total = selectedNumbers.length * selectedRifa.preco

    return (
      <main className="page">
        <button className="back-button" type="button" onClick={() => goTo('rifas')}>
          <ChevronLeft size={17} aria-hidden="true" />
          Voltar para rifas
        </button>

        <section className="purchase-layout">
          <div className="number-panel">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Comprar numeros</p>
                <h1>{selectedRifa.nome}</h1>
                <p className="lead">{selectedRifa.premio_descricao}</p>
              </div>
              <span className="price-pill large">{currency.format(selectedRifa.preco)} cada</span>
            </div>

            <div className="number-legend" aria-label="Legenda">
              <span>
                <i className="legend-free" />
                Disponivel
              </span>
              <span>
                <i className="legend-selected" />
                Selecionado
              </span>
              <span>
                <i className="legend-sold" />
                Vendido
              </span>
            </div>

            <div className="number-grid">
              {Array.from({ length: selectedRifa.total_numeros }, (_, index) => {
                const numero = index + 1
                const isSold = vendidos.has(numero)
                const isSelected = selectedNumbers.includes(numero)

                return (
                  <button
                    key={numero}
                    type="button"
                    className={`number-button ${isSold ? 'sold' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleNumero(numero)}
                    disabled={isSold}
                    title={isSold ? `Numero ${numero} vendido` : `Selecionar numero ${numero}`}
                    aria-pressed={isSelected}
                  >
                    {numero}
                  </button>
                )
              })}
            </div>
          </div>

          <aside className="summary-panel">
            <img src={selectedRifa.imagem} alt="" />
            <h2>Resumo</h2>
            <dl className="summary-list">
              <div>
                <dt>Selecionados</dt>
                <dd>{selectedNumbers.length}</dd>
              </div>
              <div>
                <dt>Disponiveis</dt>
                <dd>{stats.disponiveis}</dd>
              </div>
              <div>
                <dt>Subtotal</dt>
                <dd>{currency.format(total)}</dd>
              </div>
            </dl>

            {selectedNumbers.length > 0 ? (
              <div className="selected-list">{selectedNumbers.map((numero) => `#${numero}`).join(' ')}</div>
            ) : (
              <p className="muted">Escolha um ou mais numeros para liberar a finalizacao.</p>
            )}

            <button
              className="primary-button full"
              type="button"
              onClick={confirmarCompra}
              disabled={selectedNumbers.length === 0 || paymentLoading}
            >
              <CircleDollarSign size={17} aria-hidden="true" />
              {paymentLoading ? 'Criando pagamento...' : 'Pagar com Mercado Pago'}
            </button>
          </aside>
        </section>
      </main>
    )
  }

  function MinhasComprasView() {
    return (
      <main className="page">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Historico</p>
            <h1>Minhas compras</h1>
          </div>
          <button className="outline-button" type="button" onClick={() => goTo('rifas')}>
            <Ticket size={17} aria-hidden="true" />
            Ver rifas
          </button>
        </div>

        {!user ? (
          <EmptyState title="Voce ainda nao entrou" text="Faca login para consultar suas compras." />
        ) : minhasCompras.length === 0 ? (
          <EmptyState title="Nenhuma compra por enquanto" text="Escolha uma rifa e selecione seus numeros." />
        ) : (
          <div className="purchase-list">
            {minhasCompras.map((compra) => {
              const rifa = rifas.find((item) => item.id === compra.rifa_id)

              return (
                <article className="purchase-card" key={compra.id}>
                  <div>
                    <span className={`status-pill ${normalizePaymentStatus(compra.status_pagamento)}`}>
                      <BadgeCheck size={15} aria-hidden="true" />
                      {getPaymentStatusLabel(compra.status_pagamento)}
                    </span>
                    <h2>{rifa?.nome || 'Rifa removida'}</h2>
                    <p>{formatDate(compra.data_compra)}</p>
                  </div>
                  <div className="selected-list">{compra.numeros.map((numero) => `#${numero}`).join(' ')}</div>
                  <strong>{currency.format(compra.valor_total)}</strong>
                </article>
              )
            })}
          </div>
        )}
      </main>
    )
  }

  function AdminView() {
    if (!isAdmin) {
      return (
        <main className="page">
          <EmptyState title="Acesso restrito" text="Entre com uma conta administradora para acessar o painel." />
        </main>
      )
    }

    return (
      <main className="page">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Administracao</p>
            <h1>Painel de controle</h1>
          </div>
          <div className="button-row">
            <button className="outline-button" type="button" onClick={resetDemoData}>
              <RefreshCcw size={17} aria-hidden="true" />
              {isRemoteMode ? 'Recarregar' : 'Restaurar demo'}
            </button>
            <button className="primary-button" type="button" onClick={() => goTo('criar-rifa')}>
              <Plus size={17} aria-hidden="true" />
              Nova rifa
            </button>
          </div>
        </div>

        <section className="metric-grid">
          <Metric icon={Ticket} label="Total de rifas" value={dashboardStats.rifas} />
          <Metric icon={CircleDollarSign} label={isRemoteMode ? 'Receita' : 'Receita simulada'} value={currency.format(dashboardStats.totalReceita)} />
          <Metric icon={ShoppingCart} label="Numeros vendidos" value={dashboardStats.totalNumeros} />
          <Metric icon={Users} label="Clientes ativos" value={dashboardStats.compradores} />
        </section>

        <section className="table-panel">
          <div className="table-heading">
            <h2>Rifas cadastradas</h2>
            <span>{rifas.length} registros</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rifa</th>
                  <th>Preco</th>
                  <th>Vendidos</th>
                  <th>Receita</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {rifas.map((rifa) => {
                  const stats = getRifaStats(rifa, compras, numerosRifa)
                  const statusMeta = getRifaStatusMeta(rifa)
                  const isPending = getRifaApprovalStatus(rifa) === 'pendente'

                  return (
                    <tr key={rifa.id}>
                      <td>
                        <strong>{rifa.nome}</strong>
                        <span>{rifa.total_numeros} numeros</span>
                      </td>
                      <td>{currency.format(rifa.preco)}</td>
                      <td>
                        {stats.vendidos}/{rifa.total_numeros}
                      </td>
                      <td>{currency.format(stats.receita)}</td>
                      <td>
                        <span className={statusMeta.className}>{statusMeta.label}</span>
                      </td>
                      <td>
                        <button className="outline-button small" type="button" onClick={() => toggleRifaStatus(rifa.id)}>
                          {rifa.ativa && !isPending ? <X size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
                          {isPending ? 'Aprovar' : rifa.ativa ? 'Inativar' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    )
  }

  function CriarRifaView() {
    if (!user) {
      return (
        <main className="page">
          <EmptyState title="Entre para criar rifa" text="Faca login para enviar sua rifa para aprovacao." />
        </main>
      )
    }

    return (
      <main className="page form-page">
        <button className="back-button" type="button" onClick={() => goTo(isAdmin ? 'admin' : 'rifas')}>
          <ChevronLeft size={17} aria-hidden="true" />
          {isAdmin ? 'Voltar ao painel' : 'Voltar para rifas'}
        </button>

        <section className="form-panel wide">
          <p className="eyebrow">{isAdmin ? 'Nova rifa' : 'Enviar rifa'}</p>
          <h1>{isAdmin ? 'Cadastrar premio' : 'Cadastrar premio para aprovacao'}</h1>

          <form className="form-grid" onSubmit={handleCriarRifa}>
            <label>
              Nome da rifa
              <input
                type="text"
                value={novaRifa.nome}
                onChange={(event) => setNovaRifa({ ...novaRifa, nome: event.target.value })}
                placeholder="Ex: Smartphone premium"
                required
              />
            </label>

            <label>
              Descricao do premio
              <input
                type="text"
                value={novaRifa.premio_descricao}
                onChange={(event) => setNovaRifa({ ...novaRifa, premio_descricao: event.target.value })}
                placeholder="O que sera sorteado"
                required
              />
            </label>

            <label className="span-2">
              Descricao curta
              <textarea
                value={novaRifa.descricao}
                onChange={(event) => setNovaRifa({ ...novaRifa, descricao: event.target.value })}
                placeholder="Explique regras, estado do premio e entrega"
                required
              />
            </label>

            <label>
              Preco por numero
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={novaRifa.preco}
                onChange={(event) => setNovaRifa({ ...novaRifa, preco: event.target.value })}
                placeholder="10.00"
                required
              />
            </label>

            <label>
              Total de numeros
              <input
                type="number"
                min="10"
                max="500"
                value={novaRifa.total_numeros}
                onChange={(event) => setNovaRifa({ ...novaRifa, total_numeros: event.target.value })}
                placeholder="100"
                required
              />
            </label>

            <label>
              Data de encerramento
              <input
                type="date"
                value={novaRifa.data_termino}
                onChange={(event) => setNovaRifa({ ...novaRifa, data_termino: event.target.value })}
                required
              />
            </label>

            <label>
              URL da imagem
              <input
                type="url"
                value={novaRifa.imagem}
                onChange={(event) => setNovaRifa({ ...novaRifa, imagem: event.target.value })}
                placeholder="https://..."
                required
              />
            </label>

            <div className="form-actions span-2">
              <button className="outline-button" type="button" onClick={() => goTo(isAdmin ? 'admin' : 'rifas')}>
                <X size={17} aria-hidden="true" />
                Cancelar
              </button>
              <button className="primary-button" type="submit">
                <Plus size={17} aria-hidden="true" />
                {isAdmin ? 'Criar rifa' : 'Enviar para aprovacao'}
              </button>
            </div>
          </form>
        </section>
      </main>
    )
  }

  function EmptyState({ title, text }) {
    return (
      <div className="empty-state">
        <Ticket size={28} aria-hidden="true" />
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      {Header()}

      {view === 'rifas' && RifasView()}
      {view === 'auth' && AuthView()}
      {view === 'comprar' && ComprarView()}
      {view === 'minhas-compras' && MinhasComprasView()}
      {view === 'admin' && AdminView()}
      {view === 'criar-rifa' && CriarRifaView()}

      {message && (
        <div className="toast" role="status">
          <BadgeCheck size={17} aria-hidden="true" />
          {message}
        </div>
      )}
    </div>
  )
}
import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  Banknote,
  CalendarDays,
  Check,
  ChevronLeft,
  CircleDollarSign,
  LayoutDashboard,
  LogIn,
  LogOut,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Ticket,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { dataMode, hasSupabaseConfig, supabase } from './lib/supabaseClient'
import './App.css'

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const demoUsers = [
  {
    id: 'admin-demo',
    nome: 'Admin RifaMax',
    email: 'admin@rifamax.com',
    password: 'admin123',
    id_admin: true,
    data_criacao: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 'cliente-demo',
    nome: 'Cliente Demo',
    email: 'cliente@rifamax.com',
    password: 'cliente123',
    id_admin: false,
    data_criacao: '2026-06-02T10:00:00.000Z',
  },
]

const demoRifas = [
  {
    id: 'rifa-console',
    nome: 'Console gamer completo',
    descricao: 'Console novo com dois controles, assinatura premium e entrega nacional.',
    imagem:
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80',
    preco: 12.5,
    total_numeros: 120,
    premio_descricao: 'Console de ultima geracao com kit de jogos',
    criador_id: 'admin-demo',
    ativa: true,
    data_termino: '2026-08-15',
    data_criacao: '2026-06-11T14:00:00.000Z',
  },
  {
    id: 'rifa-smartphone',
    nome: 'Smartphone premium',
    descricao: 'Aparelho lacrado, 256 GB, garantia nacional e capa inclusa.',
    imagem:
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1200&q=80',
    preco: 9,
    total_numeros: 100,
    premio_descricao: 'Smartphone premium 256 GB',
    criador_id: 'admin-demo',
    ativa: true,
    data_termino: '2026-07-28',
    data_criacao: '2026-06-10T14:00:00.000Z',
  },
  {
    id: 'rifa-sneaker',
    nome: 'Sneaker colecionavel',
    descricao: 'Modelo exclusivo para quem curte estilo, conforto e sorteio rapido.',
    imagem:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
    preco: 6,
    total_numeros: 80,
    premio_descricao: 'Sneaker original no tamanho escolhido',
    criador_id: 'admin-demo',
    ativa: true,
    data_termino: '2026-07-12',
    data_criacao: '2026-06-09T14:00:00.000Z',
  },
]

const demoCompras = [
  {
    id: 'compra-001',
    rifa_id: 'rifa-console',
    comprador_id: 'cliente-demo',
    comprador_nome: 'Cliente Demo',
    numeros: [3, 14, 27, 88],
    valor_total: 50,
    quantidade_numeros: 4,
    status_pagamento: 'confirmado',
    metodo_pagamento: 'simulado',
    data_compra: '2026-06-18T12:20:00.000Z',
  },
  {
    id: 'compra-002',
    rifa_id: 'rifa-smartphone',
    comprador_id: 'cliente-demo',
    comprador_nome: 'Cliente Demo',
    numeros: [6, 19, 41],
    valor_total: 27,
    quantidade_numeros: 3,
    status_pagamento: 'confirmado',
    metodo_pagamento: 'simulado',
    data_compra: '2026-06-19T09:40:00.000Z',
  },
  {
    id: 'compra-003',
    rifa_id: 'rifa-sneaker',
    comprador_id: 'admin-demo',
    comprador_nome: 'Admin RifaMax',
    numeros: [4, 8, 12, 24, 48],
    valor_total: 30,
    quantidade_numeros: 5,
    status_pagamento: 'confirmado',
    metodo_pagamento: 'simulado',
    data_compra: '2026-06-20T16:10:00.000Z',
  },
]

const emptyRifa = {
  nome: '',
  descricao: '',
  imagem: '',
  preco: '',
  total_numeros: '',
  data_termino: '',
  premio_descricao: '',
}

function buildDemoNumerosRifa() {
  const vendidos = new Set(demoCompras.flatMap((compra) => compra.numeros.map((numero) => `${compra.rifa_id}:${numero}`)))

  return demoRifas.flatMap((rifa) =>
    Array.from({ length: rifa.total_numeros }, (_, index) => {
      const numero = index + 1

      return {
        id: `${rifa.id}-${numero}`,
        rifa_id: rifa.id,
        numero,
        vendido: vendidos.has(`${rifa.id}:${numero}`),
      }
    }),
  )
}

function createId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? JSON.parse(saved) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue]
}

function isBlockingPurchase(compra) {
  return !['falha', 'reembolso', 'cancelado'].includes(normalizePaymentStatus(compra.status_pagamento))
}

function getSoldNumbers(compras, rifaId, numerosRifa = []) {
  return new Set(
    [
      ...compras
      .filter((compra) => compra.rifa_id === rifaId && isBlockingPurchase(compra))
      .flatMap((compra) => compra.numeros),
      ...numerosRifa
        .filter((numero) => numero.rifa_id === rifaId && numero.vendido)
        .map((numero) => numero.numero),
    ],
  )
}

function getRifaStats(rifa, compras, numerosRifa = []) {
  const soldNumbers = getSoldNumbers(compras, rifa.id, numerosRifa)
  const vendidos = soldNumbers.size
  const disponiveis = Math.max(rifa.total_numeros - vendidos, 0)
  const percentual = rifa.total_numeros > 0 ? Math.round((vendidos / rifa.total_numeros) * 100) : 0
  const receita = [...soldNumbers].length * rifa.preco

  return { vendidos, disponiveis, percentual, receita }
}

function formatDate(value) {
  if (!value) return 'Sem data'

  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value))
}

function normalizePaymentStatus(status) {
  const value = String(status || '').toLowerCase()

  if (['approved', 'success', 'confirmado'].includes(value)) return 'confirmado'
  if (['pending', 'in_process', 'in_mediation', 'pendente'].includes(value)) return 'pendente'
  if (['rejected', 'cancelled', 'failure', 'falha'].includes(value)) return 'falha'
  return value || 'pendente'
}

function getPaymentStatusLabel(status) {
  const normalized = normalizePaymentStatus(status)

  if (normalized === 'confirmado') return 'Confirmado'
  if (normalized === 'falha') return 'Falhou'
  return 'Pendente'
}

function sortNumbers(numbers) {
  return [...numbers].sort((a, b) => a - b)
}

export default function App() {
  const isRemoteMode = hasSupabaseConfig && Boolean(supabase)
  const [usuarios, setUsuarios] = usePersistentState('rifamax:usuarios', demoUsers)
  const [rifas, setRifas] = usePersistentState('rifamax:rifas', demoRifas)
  const [compras, setCompras] = usePersistentState('rifamax:compras', demoCompras)
  const [numerosRifa, setNumerosRifa] = usePersistentState('rifamax:numeros', buildDemoNumerosRifa())
  const [currentUserId, setCurrentUserId] = usePersistentState('rifamax:sessao', '')
  const [view, setView] = useState('rifas')
  const [selectedRifaId, setSelectedRifaId] = useState(demoRifas[0].id)
  const [selectedNumbers, setSelectedNumbers] = useState([])
  const [search, setSearch] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registroForm, setRegistroForm] = useState({ nome: '', email: '', password: '', confirm: '' })
  const [novaRifa, setNovaRifa] = useState(emptyRifa)
  const [message, setMessage] = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [remoteLoading, setRemoteLoading] = useState(false)

  const user = useMemo(
    () => usuarios.find((usuario) => usuario.id === currentUserId) || null,
    [currentUserId, usuarios],
  )

  const isAdmin = Boolean(user?.id_admin)
  const selectedRifa = rifas.find((rifa) => rifa.id === selectedRifaId) || rifas[0]

  const visibleRifas = useMemo(() => {
    const term = search.trim().toLowerCase()

    return rifas
      .filter((rifa) => rifa.ativa)
      .filter((rifa) => {
        if (!term) return true
        return [rifa.nome, rifa.descricao, rifa.premio_descricao].some((value) =>
          value.toLowerCase().includes(term),
        )
      })
  }, [rifas, search])

  const minhasCompras = useMemo(() => {
    if (!user) return []
    return compras
      .filter((compra) => compra.comprador_id === user.id)
      .sort((a, b) => new Date(b.data_compra) - new Date(a.data_compra))
  }, [compras, user])

  const dashboardStats = useMemo(() => {
    const totalReceita = compras.reduce((sum, compra) => sum + compra.valor_total, 0)
    const totalNumeros = rifas.reduce(
      (sum, rifa) => sum + getSoldNumbers(compras, rifa.id, numerosRifa).size,
      0,
    )
    const compradores = new Set(compras.map((compra) => compra.comprador_id)).size

    return {
      rifas: rifas.length,
      ativas: rifas.filter((rifa) => rifa.ativa).length,
      totalReceita,
      totalNumeros,
      compradores,
    }
  }, [compras, numerosRifa, rifas])

  useEffect(() => {
    if (!message) return undefined

    const timeout = window.setTimeout(() => setMessage(''), 3500)
    return () => window.clearTimeout(timeout)
  }, [message])

  useEffect(() => {
    setSelectedNumbers([])
  }, [selectedRifaId])

  useEffect(() => {
    if (!isRemoteMode) return undefined

    let active = true

    async function bootstrapRemoteData() {
      setRemoteLoading(true)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const profile = session?.user ? await applyRemoteUser(session.user) : null

        if (!session?.user) {
          setUsuarios([])
          setCurrentUserId('')
          setCompras([])
        }

        if (active) {
          await carregarDadosRemotos(profile)
        }
      } catch (error) {
        notify(error.message || 'Erro ao carregar dados do Supabase.')
      } finally {
        if (active) setRemoteLoading(false)
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return

      const profile = session?.user ? await applyRemoteUser(session.user) : null

      if (!session?.user) {
        setUsuarios([])
        setCurrentUserId('')
        setCompras([])
      }

      await carregarDadosRemotos(profile)
    })

    bootstrapRemoteData()

    return () => {
      active = false
      subscription.unsubscribe()
    }
    // Dados remotos devem ser inicializados apenas quando o modo Supabase muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRemoteMode])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const externalReference = params.get('external_reference')
    const rawStatus = params.get('status') || params.get('collection_status') || params.get('payment')
    const paymentId = params.get('payment_id') || params.get('collection_id')

    if (!externalReference || !rawStatus) return

    async function syncPaymentReturn() {
      let nextStatus = normalizePaymentStatus(rawStatus)

      if (isRemoteMode && paymentId) {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.access_token) {
          const response = await fetch('/api/mercadopago/sync-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              externalReference,
              paymentId,
              supabaseAccessToken: session.access_token,
            }),
          })

          const result = await response.json().catch(() => ({}))

          if (response.ok && result.status_pagamento) {
            nextStatus = result.status_pagamento
          }
        }
      }

      setCompras((current) =>
        current.map((compra) =>
          compra.external_reference === externalReference
            ? {
                ...compra,
                id_transacao_mp: paymentId || compra.id_transacao_mp,
                status_pagamento: nextStatus,
              }
            : compra,
        ),
      )

      await carregarDadosRemotos()
      goTo('minhas-compras')
      notify(
        nextStatus === 'confirmado'
          ? 'Pagamento aprovado pelo Mercado Pago.'
          : 'Recebemos o retorno do Mercado Pago. A compra esta pendente ou precisa de revisao.',
      )
      window.history.replaceState({}, '', window.location.pathname)
    }

    syncPaymentReturn().catch((error) => {
      notify(error.message || 'Nao foi possivel sincronizar o pagamento.')
    })
    // Sincronizacao acontece somente quando a URL de retorno muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCompras])

  function notify(text) {
    setMessage(text)
  }

  function goTo(nextView) {
    setView(nextView)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function mapRemoteProfile(row, authUser) {
    return {
      id: authUser.id,
      perfil_id: row?.id,
      id_usuario: authUser.id,
      nome: row?.nome || authUser.user_metadata?.nome || authUser.email,
      email: row?.email || authUser.email,
      id_admin: Boolean(row?.id_admin),
      data_criacao: row?.data_criacao || authUser.created_at,
    }
  }

  function mapRemoteCompra(row) {
    return {
      id: row.id,
      rifa_id: row.rifa_id,
      comprador_id: row.comprador_id,
      comprador_nome: row.usuarios?.nome || row.comprador_nome || 'Cliente',
      numeros: sortNumbers((row.compra_numeros || []).map((item) => item.numero)),
      valor_total: Number(row.valor_total || 0),
      quantidade_numeros: row.quantidade_numeros,
      status_pagamento: row.status_pagamento,
      metodo_pagamento: row.metodo_pagamento,
      external_reference: row.referencia_externa,
      preference_id: row.preference_id,
      id_transacao_mp: row.id_transacao_mp,
      data_compra: row.data_compra,
    }
  }

  async function applyRemoteUser(authUser) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id_usuario', authUser.id)
      .maybeSingle()

    if (error) throw error

    let profile = data

    if (!profile) {
      const { data: inserted, error: insertError } = await supabase
        .from('usuarios')
        .insert({
          id_usuario: authUser.id,
          nome: authUser.user_metadata?.nome || authUser.email,
          email: authUser.email,
        })
        .select('*')
        .single()

      if (insertError) throw insertError
      profile = inserted
    }

    const mappedProfile = mapRemoteProfile(profile, authUser)

    setUsuarios([mappedProfile])
    setCurrentUserId(authUser.id)

    return mappedProfile
  }

  async function carregarDadosRemotos(profile = user) {
    if (!isRemoteMode) return

    const { data: rifasData, error: rifasError } = await supabase
      .from('rifas')
      .select('*')
      .order('data_criacao', { ascending: false })

    if (rifasError) throw rifasError

    const { data: numerosData, error: numerosError } = await supabase
      .from('numeros_rifa')
      .select('id, rifa_id, numero, vendido, comprador_id, data_venda')
      .order('numero', { ascending: true })

    if (numerosError) throw numerosError

    setRifas((rifasData || []).map((rifa) => ({ ...rifa, preco: Number(rifa.preco) })))
    setNumerosRifa(numerosData || [])

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      setCompras([])
      return
    }

    let comprasQuery = supabase
      .from('compras')
      .select('*, compra_numeros(numero)')
      .order('data_compra', { ascending: false })

    if (!profile?.id_admin) {
      comprasQuery = comprasQuery.eq('comprador_id', authUser.id)
    }

    const { data: comprasData, error: comprasError } = await comprasQuery

    if (comprasError) throw comprasError

    setCompras((comprasData || []).map(mapRemoteCompra))
  }

  async function loginAs(email, password) {
    if (isRemoteMode) {
      notify('Os acessos demo ficam desativados no modo publico. Use uma conta real.')
      return false
    }

    const match = usuarios.find(
      (usuario) => usuario.email === normalizeEmail(email) && usuario.password === password,
    )

    if (!match) {
      notify('Email ou senha invalidos.')
      return false
    }

    setCurrentUserId(match.id)
    setLoginForm({ email: '', password: '' })
    goTo('rifas')
    notify(`Bem-vindo, ${match.nome}.`)
    return true
  }

  async function handleLogin(event) {
    event.preventDefault()

    if (!isRemoteMode) {
      await loginAs(loginForm.email, loginForm.password)
      return
    }

    try {
      setRemoteLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizeEmail(loginForm.email),
        password: loginForm.password,
      })

      if (error) throw error

      const profile = await applyRemoteUser(data.user)
      await carregarDadosRemotos(profile)
      setLoginForm({ email: '', password: '' })
      goTo('rifas')
      notify(`Bem-vindo, ${profile.nome}.`)
    } catch (error) {
      const errorMessage = String(error.message || '')
      notify(
        errorMessage.toLowerCase().includes('email not confirmed')
          ? 'Seu email ainda precisa ser confirmado no Supabase antes do login.'
          : error.message || 'Erro ao fazer login.',
      )
    } finally {
      setRemoteLoading(false)
    }
  }

  async function handleRegistro(event) {
    event.preventDefault()

    const email = normalizeEmail(registroForm.email)
    if (registroForm.password !== registroForm.confirm) {
      notify('As senhas nao coincidem.')
      return
    }

    if (isRemoteMode) {
      try {
        setRemoteLoading(true)
        const { data, error } = await supabase.auth.signUp({
          email,
          password: registroForm.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              nome: registroForm.nome.trim(),
            },
          },
        })

        if (error) throw error

        if (data.session?.user) {
          const profile = await applyRemoteUser(data.session.user)
          await carregarDadosRemotos(profile)
          setRegistroForm({ nome: '', email: '', password: '', confirm: '' })
          goTo('rifas')
          notify('Conta criada. Voce ja pode comprar numeros.')
        } else {
          setAuthMode('login')
          setLoginForm((current) => ({ ...current, email }))
          notify('Cadastro criado. Confirme seu email antes de entrar.')
        }
      } catch (error) {
        notify(error.message || 'Erro ao criar conta.')
      } finally {
        setRemoteLoading(false)
      }

      return
    }

    if (usuarios.some((usuario) => usuario.email === email)) {
      notify('Este email ja esta cadastrado.')
      return
    }

    const novoUsuario = {
      id: createId('usuario'),
      nome: registroForm.nome.trim(),
      email,
      password: registroForm.password,
      id_admin: false,
      data_criacao: new Date().toISOString(),
    }

    setUsuarios((current) => [...current, novoUsuario])
    setCurrentUserId(novoUsuario.id)
    setRegistroForm({ nome: '', email: '', password: '', confirm: '' })
    goTo('rifas')
    notify('Conta criada. Voce ja pode comprar numeros.')
  }

  async function logout() {
    if (isRemoteMode) {
      await supabase.auth.signOut()
      setUsuarios([])
      setCompras([])
    }

    setCurrentUserId('')
    goTo('rifas')
    notify('Sessao encerrada.')
  }

  function openCompra(rifaId) {
    if (!user) {
      setAuthMode('login')
      goTo('auth')
      notify('Entre ou crie uma conta para comprar numeros.')
      return
    }

    setSelectedRifaId(rifaId)
    goTo('comprar')
  }

  function toggleNumero(numero) {
    if (!selectedRifa) return

    const vendidos = getSoldNumbers(compras, selectedRifa.id, numerosRifa)
    if (vendidos.has(numero)) return

    setSelectedNumbers((current) =>
      current.includes(numero)
        ? current.filter((item) => item !== numero)
        : sortNumbers([...current, numero]),
    )
  }

  async function confirmarCompra() {
    if (!user) {
      setAuthMode('login')
      goTo('auth')
      notify('Entre para finalizar a compra.')
      return
    }

    if (!selectedRifa || selectedNumbers.length === 0) {
      notify('Selecione pelo menos um numero.')
      return
    }

    const vendidos = getSoldNumbers(compras, selectedRifa.id, numerosRifa)
    const conflitos = selectedNumbers.filter((numero) => vendidos.has(numero))
    if (conflitos.length > 0) {
      setSelectedNumbers((current) => current.filter((numero) => !vendidos.has(numero)))
      notify(`Os numeros ${conflitos.join(', ')} acabaram de ser vendidos.`)
      return
    }

    const numeros = sortNumbers(selectedNumbers)
    const valorTotal = Number((numeros.length * selectedRifa.preco).toFixed(2))
    const externalReference = createId('mp')

    setPaymentLoading(true)

    try {
      const response = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buyerEmail: user.email,
          buyerName: user.nome,
          externalReference,
          numeros,
          premioDescricao: selectedRifa.premio_descricao,
          rifaId: selectedRifa.id,
          rifaNome: selectedRifa.nome,
          unitPrice: selectedRifa.preco,
        }),
      })

      const rawResponse = await response.text()
      let preference = {}

      try {
        preference = rawResponse ? JSON.parse(rawResponse) : {}
      } catch {
        preference = { error: rawResponse || 'Resposta invalida do servidor de pagamento.' }
      }

      if (!response.ok) {
        throw new Error(preference.error || 'Nao foi possivel iniciar o pagamento.')
      }

      if (!preference.init_point) {
        throw new Error('O Mercado Pago nao retornou o link de checkout.')
      }

      const novaCompra = {
        id: createId('compra'),
        rifa_id: selectedRifa.id,
        comprador_id: user.id,
        comprador_nome: user.nome,
        numeros,
        valor_total: valorTotal,
        quantidade_numeros: numeros.length,
        status_pagamento: 'pendente',
        metodo_pagamento: 'mercado_pago',
        external_reference: externalReference,
        preference_id: preference.id,
        data_compra: new Date().toISOString(),
      }

      if (isRemoteMode) {
        const { data: compraCriada, error: compraError } = await supabase.rpc('criar_compra_mercado_pago', {
          p_rifa_id: selectedRifa.id,
          p_numeros: numeros,
          p_valor_total: valorTotal,
          p_referencia_externa: externalReference,
          p_preference_id: preference.id,
        })

        if (compraError) throw compraError

        const compra = Array.isArray(compraCriada) ? compraCriada[0] : compraCriada
        if (!compra?.id) {
          throw new Error('A compra foi reservada, mas o banco nao retornou o comprovante.')
        }

        novaCompra.id = compra.id
      }

      setCompras((current) => [novaCompra, ...current])
      setNumerosRifa((current) =>
        current.map((item) =>
          item.rifa_id === selectedRifa.id && numeros.includes(item.numero)
            ? { ...item, vendido: true, comprador_id: user.id }
            : item,
        ),
      )
      setSelectedNumbers([])
      window.location.href = preference.init_point
    } catch (error) {
      notify(error.message || 'Erro ao iniciar pagamento no Mercado Pago.')
    } finally {
      setPaymentLoading(false)
    }
  }

  async function handleCriarRifa(event) {
    event.preventDefault()

    if (!isAdmin) {
      notify('Apenas administradores podem criar rifas.')
      return
    }

    const preco = Number(novaRifa.preco)
    const totalNumeros = Number.parseInt(novaRifa.total_numeros, 10)

    if (!Number.isFinite(preco) || preco <= 0) {
      notify('Informe um preco valido.')
      return
    }

    if (!Number.isInteger(totalNumeros) || totalNumeros < 10 || totalNumeros > 500) {
      notify('Use entre 10 e 500 numeros para manter a grade legivel.')
      return
    }

    const rifaPayload = {
      nome: novaRifa.nome.trim(),
      descricao: novaRifa.descricao.trim(),
      imagem: novaRifa.imagem.trim(),
      preco,
      total_numeros: totalNumeros,
      premio_descricao: novaRifa.premio_descricao.trim(),
      criador_id: user.id,
      ativa: true,
      data_termino: novaRifa.data_termino,
    }

    try {
      if (isRemoteMode) {
        setRemoteLoading(true)

        const { data: rifa, error } = await supabase
          .from('rifas')
          .insert(rifaPayload)
          .select('*')
          .single()

        if (error) throw error

        const numeros = Array.from({ length: totalNumeros }, (_, index) => ({
          rifa_id: rifa.id,
          numero: index + 1,
          vendido: false,
        }))

        const { error: numerosError } = await supabase.from('numeros_rifa').insert(numeros)

        if (numerosError) throw numerosError

        await carregarDadosRemotos(user)
      } else {
        const rifa = {
          ...rifaPayload,
          id: createId('rifa'),
          data_criacao: new Date().toISOString(),
        }

        setRifas((current) => [rifa, ...current])
        setNumerosRifa((current) => [
          ...Array.from({ length: totalNumeros }, (_, index) => ({
            id: `${rifa.id}-${index + 1}`,
            rifa_id: rifa.id,
            numero: index + 1,
            vendido: false,
          })),
          ...current,
        ])
      }

      setNovaRifa(emptyRifa)
      goTo('admin')
      notify('Rifa criada com sucesso.')
    } catch (error) {
      notify(error.message || 'Erro ao criar rifa.')
    } finally {
      setRemoteLoading(false)
    }
  }

  async function toggleRifaStatus(rifaId) {
    if (isRemoteMode) {
      const rifaAtual = rifas.find((rifa) => rifa.id === rifaId)
      if (!rifaAtual) return

      const { error } = await supabase.from('rifas').update({ ativa: !rifaAtual.ativa }).eq('id', rifaId)

      if (error) {
        notify(error.message || 'Erro ao atualizar rifa.')
        return
      }

      await carregarDadosRemotos(user)
      return
    }

    setRifas((current) =>
      current.map((rifa) => (rifa.id === rifaId ? { ...rifa, ativa: !rifa.ativa } : rifa)),
    )
  }

  function resetDemoData() {
    if (isRemoteMode) {
      carregarDadosRemotos(user)
      notify('Dados recarregados do Supabase.')
      return
    }

    setUsuarios(demoUsers)
    setRifas(demoRifas)
    setCompras(demoCompras)
    setNumerosRifa(buildDemoNumerosRifa())
    setCurrentUserId('')
    setSelectedRifaId(demoRifas[0].id)
    setSelectedNumbers([])
    goTo('rifas')
    notify('Dados de demonstracao restaurados.')
  }

  function Header() {
    return (
      <header className="topbar">
        <button className="brand" type="button" onClick={() => goTo('rifas')}>
          <span className="brand-mark">
            <Ticket size={22} aria-hidden="true" />
          </span>
          <span>
            <strong>RifaMax</strong>
            <small>{dataMode === 'configured' ? 'Online com Supabase' : 'Demo local'}</small>
          </span>
        </button>

        <nav className="nav-actions" aria-label="Navegacao principal">
          <button className="ghost-button" type="button" onClick={() => goTo('rifas')}>
            <Ticket size={17} aria-hidden="true" />
            Rifas
          </button>

          {user && (
            <button className="ghost-button" type="button" onClick={() => goTo('minhas-compras')}>
              <ShoppingCart size={17} aria-hidden="true" />
              Compras
            </button>
          )}

          {isAdmin && (
            <button className="ghost-button" type="button" onClick={() => goTo('admin')}>
              <LayoutDashboard size={17} aria-hidden="true" />
              Admin
            </button>
          )}

          {user ? (
            <button className="outline-button" type="button" onClick={logout}>
              <LogOut size={17} aria-hidden="true" />
              Sair
            </button>
          ) : (
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setAuthMode('login')
                goTo('auth')
              }}
            >
              <LogIn size={17} aria-hidden="true" />
              Entrar
            </button>
          )}
        </nav>
      </header>
    )
  }

  function RifasView() {
    return (
      <main className="page">
        <section className="overview-band">
          <div>
            <p className="eyebrow">Plataforma de rifas online</p>
            <h1>Escolha seus numeros e acompanhe tudo em tempo real.</h1>
            <p className="lead">
              {isRemoteMode
                ? 'Rifas, usuarios, numeros reservados e compras agora usam o banco real.'
                : 'O fluxo esta pronto para demonstracao: login, cadastro, painel admin, criacao de rifas, selecao de numeros e historico de compras.'}
            </p>
          </div>

          <div className="quick-panel" aria-label="Acessos rapidos">
            <div className="user-chip">
              <Users size={18} aria-hidden="true" />
              {user ? user.nome : 'Visitante'}
            </div>
            {isRemoteMode ? (
              <button className="outline-button" type="button" onClick={() => goTo(user ? 'minhas-compras' : 'auth')}>
                <ShieldCheck size={17} aria-hidden="true" />
                {user ? 'Minha conta' : 'Entrar agora'}
              </button>
            ) : (
              <>
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => loginAs('cliente@rifamax.com', 'cliente123')}
                >
                  <LogIn size={17} aria-hidden="true" />
                  Cliente demo
                </button>
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => loginAs('admin@rifamax.com', 'admin123')}
                >
                  <ShieldCheck size={17} aria-hidden="true" />
                  Admin demo
                </button>
              </>
            )}
          </div>
        </section>

        {user && (
          <section className="metric-grid" aria-label="Resumo">
            <Metric icon={Ticket} label="Rifas ativas" value={dashboardStats.ativas} />
            <Metric icon={ShoppingCart} label="Numeros vendidos" value={dashboardStats.totalNumeros} />
            <Metric icon={Banknote} label={isRemoteMode ? 'Faturamento' : 'Faturamento demo'} value={currency.format(dashboardStats.totalReceita)} />
            <Metric icon={Users} label="Compradores" value={dashboardStats.compradores} />
          </section>
        )}

        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Disponiveis agora</p>
              <h2>Rifas em destaque</h2>
            </div>

            <label className="search-box">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar rifa"
              />
            </label>
          </div>

          {visibleRifas.length === 0 ? (
            <EmptyState
              title="Nenhuma rifa encontrada"
              text="Limpe a busca ou crie uma nova rifa no painel administrativo."
            />
          ) : (
            <div className="raffle-grid">
              {visibleRifas.map((rifa) => (
                <RifaCard key={rifa.id} rifa={rifa} />
              ))}
            </div>
          )}
        </section>
      </main>
    )
  }

  function Metric({ icon: Icon, label, value }) {
    return (
      <article className="metric-card">
        <Icon size={20} aria-hidden="true" />
        <span>{label}</span>
        <strong>{value}</strong>
      </article>
    )
  }

  function RifaCard({ rifa }) {
    const stats = getRifaStats(rifa, compras, numerosRifa)

    return (
      <article className="raffle-card">
        <img src={rifa.imagem} alt={rifa.nome} />
        <div className="raffle-content">
          <div className="raffle-title-row">
            <h3>{rifa.nome}</h3>
            <span className="price-pill">{currency.format(rifa.preco)}</span>
          </div>
          <p>{rifa.descricao}</p>

          <div className="prize-line">
            <Trophy size={17} aria-hidden="true" />
            <span>{rifa.premio_descricao}</span>
          </div>

          <div className="progress-row">
            <div className="progress-copy">
              <span>{stats.vendidos} vendidos</span>
              <strong>{stats.percentual}%</strong>
            </div>
            <div className="progress-track" aria-hidden="true">
              <span style={{ width: `${stats.percentual}%` }} />
            </div>
          </div>

          <div className="card-footer">
            <span className="date-chip">
              <CalendarDays size={15} aria-hidden="true" />
              {formatDate(rifa.data_termino)}
            </span>
            <button className="primary-button" type="button" onClick={() => openCompra(rifa.id)}>
              <ShoppingCart size={17} aria-hidden="true" />
              Comprar
            </button>
          </div>
        </div>
      </article>
    )
  }

  function AuthView() {
    return (
      <main className="page auth-page">
        <section className="auth-copy">
          <p className="eyebrow">Acesso</p>
          <h1>{authMode === 'login' ? 'Entre para comprar numeros.' : 'Crie sua conta em segundos.'}</h1>
          <p className="lead">
            {isRemoteMode
              ? 'Entre com seu email e senha para comprar numeros e acompanhar pagamentos.'
              : 'Use os acessos de demonstracao para testar o painel completo sem configurar o Supabase.'}
          </p>

          {!isRemoteMode && <div className="demo-login-row">
            <button
              className="outline-button"
              type="button"
              onClick={() => loginAs('cliente@rifamax.com', 'cliente123')}
            >
              <Users size={17} aria-hidden="true" />
              Cliente demo
            </button>
            <button
              className="outline-button"
              type="button"
              onClick={() => loginAs('admin@rifamax.com', 'admin123')}
            >
              <ShieldCheck size={17} aria-hidden="true" />
              Admin demo
            </button>
          </div>}
        </section>

        <section className="form-panel">
          <div className="segmented">
            <button
              type="button"
              className={authMode === 'login' ? 'active' : ''}
              onClick={() => setAuthMode('login')}
            >
              <LogIn size={16} aria-hidden="true" />
              Entrar
            </button>
            <button
              type="button"
              className={authMode === 'registro' ? 'active' : ''}
              onClick={() => setAuthMode('registro')}
            >
              <UserPlus size={16} aria-hidden="true" />
              Cadastro
            </button>
          </div>

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="form-stack">
              <label>
                Email
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="voce@email.com"
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  required
                />
              </label>
              <button className="primary-button full" type="submit">
                <LogIn size={17} aria-hidden="true" />
                {remoteLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegistro} className="form-stack">
              <label>
                Nome completo
                <input
                  type="text"
                  value={registroForm.nome}
                  onChange={(event) =>
                    setRegistroForm((current) => ({ ...current, nome: event.target.value }))
                  }
                  placeholder="Seu nome"
                  autoComplete="name"
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={registroForm.email}
                  onChange={(event) =>
                    setRegistroForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="voce@email.com"
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  value={registroForm.password}
                  onChange={(event) =>
                    setRegistroForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Minimo recomendado: 6 caracteres"
                  autoComplete="new-password"
                  required
                />
              </label>
              <label>
                Confirmar senha
                <input
                  type="password"
                  value={registroForm.confirm}
                  onChange={(event) =>
                    setRegistroForm((current) => ({ ...current, confirm: event.target.value }))
                  }
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  required
                />
              </label>
              <button className="primary-button full" type="submit">
                <UserPlus size={17} aria-hidden="true" />
                {remoteLoading ? 'Criando...' : 'Criar conta'}
              </button>
            </form>
          )}
        </section>
      </main>
    )
  }

  function ComprarView() {
    if (!selectedRifa) {
      return (
        <main className="page">
          <EmptyState title="Rifa nao encontrada" text="Volte para a lista e escolha uma rifa ativa." />
        </main>
      )
    }

    const stats = getRifaStats(selectedRifa, compras, numerosRifa)
    const vendidos = getSoldNumbers(compras, selectedRifa.id, numerosRifa)
    const total = selectedNumbers.length * selectedRifa.preco

    return (
      <main className="page">
        <button className="back-button" type="button" onClick={() => goTo('rifas')}>
          <ChevronLeft size={17} aria-hidden="true" />
          Voltar para rifas
        </button>

        <section className="purchase-layout">
          <div className="number-panel">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Comprar numeros</p>
                <h1>{selectedRifa.nome}</h1>
                <p className="lead">{selectedRifa.premio_descricao}</p>
              </div>
              <span className="price-pill large">{currency.format(selectedRifa.preco)} cada</span>
            </div>

            <div className="number-legend" aria-label="Legenda">
              <span>
                <i className="legend-free" />
                Disponivel
              </span>
              <span>
                <i className="legend-selected" />
                Selecionado
              </span>
              <span>
                <i className="legend-sold" />
                Vendido
              </span>
            </div>

            <div className="number-grid">
              {Array.from({ length: selectedRifa.total_numeros }, (_, index) => {
                const numero = index + 1
                const isSold = vendidos.has(numero)
                const isSelected = selectedNumbers.includes(numero)

                return (
                  <button
                    key={numero}
                    type="button"
                    className={`number-button ${isSold ? 'sold' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleNumero(numero)}
                    disabled={isSold}
                    title={isSold ? `Numero ${numero} vendido` : `Selecionar numero ${numero}`}
                    aria-pressed={isSelected}
                  >
                    {numero}
                  </button>
                )
              })}
            </div>
          </div>

          <aside className="summary-panel">
            <img src={selectedRifa.imagem} alt="" />
            <h2>Resumo</h2>
            <dl className="summary-list">
              <div>
                <dt>Selecionados</dt>
                <dd>{selectedNumbers.length}</dd>
              </div>
              <div>
                <dt>Disponiveis</dt>
                <dd>{stats.disponiveis}</dd>
              </div>
              <div>
                <dt>Subtotal</dt>
                <dd>{currency.format(total)}</dd>
              </div>
            </dl>

            {selectedNumbers.length > 0 ? (
              <div className="selected-list">{selectedNumbers.map((numero) => `#${numero}`).join(' ')}</div>
            ) : (
              <p className="muted">Escolha um ou mais numeros para liberar a finalizacao.</p>
            )}

            <button
              className="primary-button full"
              type="button"
              onClick={confirmarCompra}
              disabled={selectedNumbers.length === 0 || paymentLoading}
            >
              <CircleDollarSign size={17} aria-hidden="true" />
              {paymentLoading ? 'Criando pagamento...' : 'Pagar com Mercado Pago'}
            </button>
          </aside>
        </section>
      </main>
    )
  }

  function MinhasComprasView() {
    return (
      <main className="page">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Historico</p>
            <h1>Minhas compras</h1>
          </div>
          <button className="outline-button" type="button" onClick={() => goTo('rifas')}>
            <Ticket size={17} aria-hidden="true" />
            Ver rifas
          </button>
        </div>

        {!user ? (
          <EmptyState title="Voce ainda nao entrou" text="Faca login para consultar suas compras." />
        ) : minhasCompras.length === 0 ? (
          <EmptyState title="Nenhuma compra por enquanto" text="Escolha uma rifa e selecione seus numeros." />
        ) : (
          <div className="purchase-list">
            {minhasCompras.map((compra) => {
              const rifa = rifas.find((item) => item.id === compra.rifa_id)

              return (
                <article className="purchase-card" key={compra.id}>
                  <div>
                    <span className={`status-pill ${normalizePaymentStatus(compra.status_pagamento)}`}>
                      <BadgeCheck size={15} aria-hidden="true" />
                      {getPaymentStatusLabel(compra.status_pagamento)}
                    </span>
                    <h2>{rifa?.nome || 'Rifa removida'}</h2>
                    <p>{formatDate(compra.data_compra)}</p>
                  </div>
                  <div className="selected-list">{compra.numeros.map((numero) => `#${numero}`).join(' ')}</div>
                  <strong>{currency.format(compra.valor_total)}</strong>
                </article>
              )
            })}
          </div>
        )}
      </main>
    )
  }

  function AdminView() {
    if (!isAdmin) {
      return (
        <main className="page">
          <EmptyState title="Acesso restrito" text="Entre com uma conta administradora para acessar o painel." />
        </main>
      )
    }

    return (
      <main className="page">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Administracao</p>
            <h1>Painel de controle</h1>
          </div>
          <div className="button-row">
            <button className="outline-button" type="button" onClick={resetDemoData}>
              <RefreshCcw size={17} aria-hidden="true" />
              {isRemoteMode ? 'Recarregar' : 'Restaurar demo'}
            </button>
            <button className="primary-button" type="button" onClick={() => goTo('criar-rifa')}>
              <Plus size={17} aria-hidden="true" />
              Nova rifa
            </button>
          </div>
        </div>

        <section className="metric-grid">
          <Metric icon={Ticket} label="Total de rifas" value={dashboardStats.rifas} />
          <Metric icon={CircleDollarSign} label={isRemoteMode ? 'Receita' : 'Receita simulada'} value={currency.format(dashboardStats.totalReceita)} />
          <Metric icon={ShoppingCart} label="Numeros vendidos" value={dashboardStats.totalNumeros} />
          <Metric icon={Users} label="Clientes ativos" value={dashboardStats.compradores} />
        </section>

        <section className="table-panel">
          <div className="table-heading">
            <h2>Rifas cadastradas</h2>
            <span>{rifas.length} registros</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rifa</th>
                  <th>Preco</th>
                  <th>Vendidos</th>
                  <th>Receita</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {rifas.map((rifa) => {
                  const stats = getRifaStats(rifa, compras, numerosRifa)

                  return (
                    <tr key={rifa.id}>
                      <td>
                        <strong>{rifa.nome}</strong>
                        <span>{rifa.total_numeros} numeros</span>
                      </td>
                      <td>{currency.format(rifa.preco)}</td>
                      <td>
                        {stats.vendidos}/{rifa.total_numeros}
                      </td>
                      <td>{currency.format(stats.receita)}</td>
                      <td>
                        <span className={rifa.ativa ? 'status-pill success' : 'status-pill muted-status'}>
                          {rifa.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td>
                        <button className="outline-button small" type="button" onClick={() => toggleRifaStatus(rifa.id)}>
                          {rifa.ativa ? <X size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
                          {rifa.ativa ? 'Inativar' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    )
  }

  function CriarRifaView() {
    if (!isAdmin) {
      return (
        <main className="page">
          <EmptyState title="Acesso restrito" text="Entre como administrador para criar rifas." />
        </main>
      )
    }

    return (
      <main className="page form-page">
        <button className="back-button" type="button" onClick={() => goTo('admin')}>
          <ChevronLeft size={17} aria-hidden="true" />
          Voltar ao painel
        </button>

        <section className="form-panel wide">
          <p className="eyebrow">Nova rifa</p>
          <h1>Cadastrar premio</h1>

          <form className="form-grid" onSubmit={handleCriarRifa}>
            <label>
              Nome da rifa
              <input
                type="text"
                value={novaRifa.nome}
                onChange={(event) => setNovaRifa({ ...novaRifa, nome: event.target.value })}
                placeholder="Ex: Smartphone premium"
                required
              />
            </label>

            <label>
              Descricao do premio
              <input
                type="text"
                value={novaRifa.premio_descricao}
                onChange={(event) => setNovaRifa({ ...novaRifa, premio_descricao: event.target.value })}
                placeholder="O que sera sorteado"
                required
              />
            </label>

            <label className="span-2">
              Descricao curta
              <textarea
                value={novaRifa.descricao}
                onChange={(event) => setNovaRifa({ ...novaRifa, descricao: event.target.value })}
                placeholder="Explique regras, estado do premio e entrega"
                required
              />
            </label>

            <label>
              Preco por numero
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={novaRifa.preco}
                onChange={(event) => setNovaRifa({ ...novaRifa, preco: event.target.value })}
                placeholder="10.00"
                required
              />
            </label>

            <label>
              Total de numeros
              <input
                type="number"
                min="10"
                max="500"
                value={novaRifa.total_numeros}
                onChange={(event) => setNovaRifa({ ...novaRifa, total_numeros: event.target.value })}
                placeholder="100"
                required
              />
            </label>

            <label>
              Data de encerramento
              <input
                type="date"
                value={novaRifa.data_termino}
                onChange={(event) => setNovaRifa({ ...novaRifa, data_termino: event.target.value })}
                required
              />
            </label>

            <label>
              URL da imagem
              <input
                type="url"
                value={novaRifa.imagem}
                onChange={(event) => setNovaRifa({ ...novaRifa, imagem: event.target.value })}
                placeholder="https://..."
                required
              />
            </label>

            <div className="form-actions span-2">
              <button className="outline-button" type="button" onClick={() => goTo('admin')}>
                <X size={17} aria-hidden="true" />
                Cancelar
              </button>
              <button className="primary-button" type="submit">
                <Plus size={17} aria-hidden="true" />
                Criar rifa
              </button>
            </div>
          </form>
        </section>
      </main>
    )
  }

  function EmptyState({ title, text }) {
    return (
      <div className="empty-state">
        <Ticket size={28} aria-hidden="true" />
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      {Header()}

      {view === 'rifas' && RifasView()}
      {view === 'auth' && AuthView()}
      {view === 'comprar' && ComprarView()}
      {view === 'minhas-compras' && MinhasComprasView()}
      {view === 'admin' && AdminView()}
      {view === 'criar-rifa' && CriarRifaView()}

      {message && (
        <div className="toast" role="status">
          <BadgeCheck size={17} aria-hidden="true" />
          {message}
        </div>
      )}
    </div>
  )
}
import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  Banknote,
  CalendarDays,
  Check,
  ChevronLeft,
  CircleDollarSign,
  LayoutDashboard,
  LogIn,
  LogOut,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Ticket,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { dataMode, hasSupabaseConfig, supabase } from './lib/supabaseClient'
import './App.css'

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const demoUsers = [
  {
    id: 'admin-demo',
    nome: 'Admin RifaMax',
    email: 'admin@rifamax.com',
    password: 'admin123',
    id_admin: true,
    data_criacao: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 'cliente-demo',
    nome: 'Cliente Demo',
    email: 'cliente@rifamax.com',
    password: 'cliente123',
    id_admin: false,
    data_criacao: '2026-06-02T10:00:00.000Z',
  },
]

const demoRifas = [
  {
    id: 'rifa-console',
    nome: 'Console gamer completo',
    descricao: 'Console novo com dois controles, assinatura premium e entrega nacional.',
    imagem:
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80',
    preco: 12.5,
    total_numeros: 120,
    premio_descricao: 'Console de ultima geracao com kit de jogos',
    criador_id: 'admin-demo',
    ativa: true,
    data_termino: '2026-08-15',
    data_criacao: '2026-06-11T14:00:00.000Z',
  },
  {
    id: 'rifa-smartphone',
    nome: 'Smartphone premium',
    descricao: 'Aparelho lacrado, 256 GB, garantia nacional e capa inclusa.',
    imagem:
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1200&q=80',
    preco: 9,
    total_numeros: 100,
    premio_descricao: 'Smartphone premium 256 GB',
    criador_id: 'admin-demo',
    ativa: true,
    data_termino: '2026-07-28',
    data_criacao: '2026-06-10T14:00:00.000Z',
  },
  {
    id: 'rifa-sneaker',
    nome: 'Sneaker colecionavel',
    descricao: 'Modelo exclusivo para quem curte estilo, conforto e sorteio rapido.',
    imagem:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
    preco: 6,
    total_numeros: 80,
    premio_descricao: 'Sneaker original no tamanho escolhido',
    criador_id: 'admin-demo',
    ativa: true,
    data_termino: '2026-07-12',
    data_criacao: '2026-06-09T14:00:00.000Z',
  },
]

const demoCompras = [
  {
    id: 'compra-001',
    rifa_id: 'rifa-console',
    comprador_id: 'cliente-demo',
    comprador_nome: 'Cliente Demo',
    numeros: [3, 14, 27, 88],
    valor_total: 50,
    quantidade_numeros: 4,
    status_pagamento: 'confirmado',
    metodo_pagamento: 'simulado',
    data_compra: '2026-06-18T12:20:00.000Z',
  },
  {
    id: 'compra-002',
    rifa_id: 'rifa-smartphone',
    comprador_id: 'cliente-demo',
    comprador_nome: 'Cliente Demo',
    numeros: [6, 19, 41],
    valor_total: 27,
    quantidade_numeros: 3,
    status_pagamento: 'confirmado',
    metodo_pagamento: 'simulado',
    data_compra: '2026-06-19T09:40:00.000Z',
  },
  {
    id: 'compra-003',
    rifa_id: 'rifa-sneaker',
    comprador_id: 'admin-demo',
    comprador_nome: 'Admin RifaMax',
    numeros: [4, 8, 12, 24, 48],
    valor_total: 30,
    quantidade_numeros: 5,
    status_pagamento: 'confirmado',
    metodo_pagamento: 'simulado',
    data_compra: '2026-06-20T16:10:00.000Z',
  },
]

const emptyRifa = {
  nome: '',
  descricao: '',
  imagem: '',
  preco: '',
  total_numeros: '',
  data_termino: '',
  premio_descricao: '',
}

function buildDemoNumerosRifa() {
  const vendidos = new Set(demoCompras.flatMap((compra) => compra.numeros.map((numero) => `${compra.rifa_id}:${numero}`)))

  return demoRifas.flatMap((rifa) =>
    Array.from({ length: rifa.total_numeros }, (_, index) => {
      const numero = index + 1

      return {
        id: `${rifa.id}-${numero}`,
        rifa_id: rifa.id,
        numero,
        vendido: vendidos.has(`${rifa.id}:${numero}`),
      }
    }),
  )
}

function createId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? JSON.parse(saved) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue]
}

function isBlockingPurchase(compra) {
  return !['falha', 'reembolso', 'cancelado'].includes(normalizePaymentStatus(compra.status_pagamento))
}

function getSoldNumbers(compras, rifaId, numerosRifa = []) {
  return new Set(
    [
      ...compras
      .filter((compra) => compra.rifa_id === rifaId && isBlockingPurchase(compra))
      .flatMap((compra) => compra.numeros),
      ...numerosRifa
        .filter((numero) => numero.rifa_id === rifaId && numero.vendido)
        .map((numero) => numero.numero),
    ],
  )
}

function getRifaStats(rifa, compras, numerosRifa = []) {
  const soldNumbers = getSoldNumbers(compras, rifa.id, numerosRifa)
  const vendidos = soldNumbers.size
  const disponiveis = Math.max(rifa.total_numeros - vendidos, 0)
  const percentual = rifa.total_numeros > 0 ? Math.round((vendidos / rifa.total_numeros) * 100) : 0
  const receita = [...soldNumbers].length * rifa.preco

  return { vendidos, disponiveis, percentual, receita }
}

function formatDate(value) {
  if (!value) return 'Sem data'

  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value))
}

function normalizePaymentStatus(status) {
  const value = String(status || '').toLowerCase()

  if (['approved', 'success', 'confirmado'].includes(value)) return 'confirmado'
  if (['pending', 'in_process', 'in_mediation', 'pendente'].includes(value)) return 'pendente'
  if (['rejected', 'cancelled', 'failure', 'falha'].includes(value)) return 'falha'
  return value || 'pendente'
}

function getPaymentStatusLabel(status) {
  const normalized = normalizePaymentStatus(status)

  if (normalized === 'confirmado') return 'Confirmado'
  if (normalized === 'falha') return 'Falhou'
  return 'Pendente'
}

function sortNumbers(numbers) {
  return [...numbers].sort((a, b) => a - b)
}

export default function App() {
  const isRemoteMode = hasSupabaseConfig && Boolean(supabase)
  const [usuarios, setUsuarios] = usePersistentState('rifamax:usuarios', demoUsers)
  const [rifas, setRifas] = usePersistentState('rifamax:rifas', demoRifas)
  const [compras, setCompras] = usePersistentState('rifamax:compras', demoCompras)
  const [numerosRifa, setNumerosRifa] = usePersistentState('rifamax:numeros', buildDemoNumerosRifa())
  const [currentUserId, setCurrentUserId] = usePersistentState('rifamax:sessao', '')
  const [view, setView] = useState('rifas')
  const [selectedRifaId, setSelectedRifaId] = useState(demoRifas[0].id)
  const [selectedNumbers, setSelectedNumbers] = useState([])
  const [search, setSearch] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registroForm, setRegistroForm] = useState({ nome: '', email: '', password: '', confirm: '' })
  const [novaRifa, setNovaRifa] = useState(emptyRifa)
  const [message, setMessage] = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [remoteLoading, setRemoteLoading] = useState(false)

  const user = useMemo(
    () => usuarios.find((usuario) => usuario.id === currentUserId) || null,
    [currentUserId, usuarios],
  )

  const isAdmin = Boolean(user?.id_admin)
  const selectedRifa = rifas.find((rifa) => rifa.id === selectedRifaId) || rifas[0]

  const visibleRifas = useMemo(() => {
    const term = search.trim().toLowerCase()

    return rifas
      .filter((rifa) => rifa.ativa)
      .filter((rifa) => {
        if (!term) return true
        return [rifa.nome, rifa.descricao, rifa.premio_descricao].some((value) =>
          value.toLowerCase().includes(term),
        )
      })
  }, [rifas, search])

  const minhasCompras = useMemo(() => {
    if (!user) return []
    return compras
      .filter((compra) => compra.comprador_id === user.id)
      .sort((a, b) => new Date(b.data_compra) - new Date(a.data_compra))
  }, [compras, user])

  const dashboardStats = useMemo(() => {
    const totalReceita = compras.reduce((sum, compra) => sum + compra.valor_total, 0)
    const totalNumeros = rifas.reduce(
      (sum, rifa) => sum + getSoldNumbers(compras, rifa.id, numerosRifa).size,
      0,
    )
    const compradores = new Set(compras.map((compra) => compra.comprador_id)).size

    return {
      rifas: rifas.length,
      ativas: rifas.filter((rifa) => rifa.ativa).length,
      totalReceita,
      totalNumeros,
      compradores,
    }
  }, [compras, numerosRifa, rifas])

  useEffect(() => {
    if (!message) return undefined

    const timeout = window.setTimeout(() => setMessage(''), 3500)
    return () => window.clearTimeout(timeout)
  }, [message])

  useEffect(() => {
    setSelectedNumbers([])
  }, [selectedRifaId])

  useEffect(() => {
    if (!isRemoteMode) return undefined

    let active = true

    async function bootstrapRemoteData() {
      setRemoteLoading(true)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const profile = session?.user ? await applyRemoteUser(session.user) : null

        if (!session?.user) {
          setUsuarios([])
          setCurrentUserId('')
          setCompras([])
        }

        if (active) {
          await carregarDadosRemotos(profile)
        }
      } catch (error) {
        notify(error.message || 'Erro ao carregar dados do Supabase.')
      } finally {
        if (active) setRemoteLoading(false)
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return

      const profile = session?.user ? await applyRemoteUser(session.user) : null

      if (!session?.user) {
        setUsuarios([])
        setCurrentUserId('')
        setCompras([])
      }

      await carregarDadosRemotos(profile)
    })

    bootstrapRemoteData()

    return () => {
      active = false
      subscription.unsubscribe()
    }
    // Dados remotos devem ser inicializados apenas quando o modo Supabase muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRemoteMode])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const externalReference = params.get('external_reference')
    const rawStatus = params.get('status') || params.get('collection_status') || params.get('payment')
    const paymentId = params.get('payment_id') || params.get('collection_id')

    if (!externalReference || !rawStatus) return

    async function syncPaymentReturn() {
      let nextStatus = normalizePaymentStatus(rawStatus)

      if (isRemoteMode && paymentId) {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.access_token) {
          const response = await fetch('/api/mercadopago/sync-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              externalReference,
              paymentId,
              supabaseAccessToken: session.access_token,
            }),
          })

          const result = await response.json().catch(() => ({}))

          if (response.ok && result.status_pagamento) {
            nextStatus = result.status_pagamento
          }
        }
      }

      setCompras((current) =>
        current.map((compra) =>
          compra.external_reference === externalReference
            ? {
                ...compra,
                id_transacao_mp: paymentId || compra.id_transacao_mp,
                status_pagamento: nextStatus,
              }
            : compra,
        ),
      )

      await carregarDadosRemotos()
      goTo('minhas-compras')
      notify(
        nextStatus === 'confirmado'
          ? 'Pagamento aprovado pelo Mercado Pago.'
          : 'Recebemos o retorno do Mercado Pago. A compra esta pendente ou precisa de revisao.',
      )
      window.history.replaceState({}, '', window.location.pathname)
    }

    syncPaymentReturn().catch((error) => {
      notify(error.message || 'Nao foi possivel sincronizar o pagamento.')
    })
    // Sincronizacao acontece somente quando a URL de retorno muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCompras])

  function notify(text) {
    setMessage(text)
  }

  function goTo(nextView) {
    setView(nextView)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function mapRemoteProfile(row, authUser) {
    return {
      id: authUser.id,
      perfil_id: row?.id,
      id_usuario: authUser.id,
      nome: row?.nome || authUser.user_metadata?.nome || authUser.email,
      email: row?.email || authUser.email,
      id_admin: Boolean(row?.id_admin),
      data_criacao: row?.data_criacao || authUser.created_at,
    }
  }

  function mapRemoteCompra(row) {
    return {
      id: row.id,
      rifa_id: row.rifa_id,
      comprador_id: row.comprador_id,
      comprador_nome: row.usuarios?.nome || row.comprador_nome || 'Cliente',
      numeros: sortNumbers((row.compra_numeros || []).map((item) => item.numero)),
      valor_total: Number(row.valor_total || 0),
      quantidade_numeros: row.quantidade_numeros,
      status_pagamento: row.status_pagamento,
      metodo_pagamento: row.metodo_pagamento,
      external_reference: row.referencia_externa,
      preference_id: row.preference_id,
      id_transacao_mp: row.id_transacao_mp,
      data_compra: row.data_compra,
    }
  }

  async function applyRemoteUser(authUser) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id_usuario', authUser.id)
      .maybeSingle()

    if (error) throw error

    let profile = data

    if (!profile) {
      const { data: inserted, error: insertError } = await supabase
        .from('usuarios')
        .insert({
          id_usuario: authUser.id,
          nome: authUser.user_metadata?.nome || authUser.email,
          email: authUser.email,
        })
        .select('*')
        .single()

      if (insertError) throw insertError
      profile = inserted
    }

    const mappedProfile = mapRemoteProfile(profile, authUser)

    setUsuarios([mappedProfile])
    setCurrentUserId(authUser.id)

    return mappedProfile
  }

  async function carregarDadosRemotos(profile = user) {
    if (!isRemoteMode) return

    const { data: rifasData, error: rifasError } = await supabase
      .from('rifas')
      .select('*')
      .order('data_criacao', { ascending: false })

    if (rifasError) throw rifasError

    const { data: numerosData, error: numerosError } = await supabase
      .from('numeros_rifa')
      .select('id, rifa_id, numero, vendido, comprador_id, data_venda')
      .order('numero', { ascending: true })

    if (numerosError) throw numerosError

    setRifas((rifasData || []).map((rifa) => ({ ...rifa, preco: Number(rifa.preco) })))
    setNumerosRifa(numerosData || [])

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      setCompras([])
      return
    }

    let comprasQuery = supabase
      .from('compras')
      .select('*, compra_numeros(numero)')
      .order('data_compra', { ascending: false })

    if (!profile?.id_admin) {
      comprasQuery = comprasQuery.eq('comprador_id', authUser.id)
    }

    const { data: comprasData, error: comprasError } = await comprasQuery

    if (comprasError) throw comprasError

    setCompras((comprasData || []).map(mapRemoteCompra))
  }

  async function loginAs(email, password) {
    if (isRemoteMode) {
      notify('Os acessos demo ficam desativados no modo publico. Use uma conta real.')
      return false
    }

    const match = usuarios.find(
      (usuario) => usuario.email === normalizeEmail(email) && usuario.password === password,
    )

    if (!match) {
      notify('Email ou senha invalidos.')
      return false
    }

    setCurrentUserId(match.id)
    setLoginForm({ email: '', password: '' })
    goTo('rifas')
    notify(`Bem-vindo, ${match.nome}.`)
    return true
  }

  async function handleLogin(event) {
    event.preventDefault()

    if (!isRemoteMode) {
      await loginAs(loginForm.email, loginForm.password)
      return
    }

    try {
      setRemoteLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizeEmail(loginForm.email),
        password: loginForm.password,
      })

      if (error) throw error

      const profile = await applyRemoteUser(data.user)
      await carregarDadosRemotos(profile)
      setLoginForm({ email: '', password: '' })
      goTo('rifas')
      notify(`Bem-vindo, ${profile.nome}.`)
    } catch (error) {
      const errorMessage = String(error.message || '')
      notify(
        errorMessage.toLowerCase().includes('email not confirmed')
          ? 'Seu email ainda precisa ser confirmado no Supabase antes do login.'
          : error.message || 'Erro ao fazer login.',
      )
    } finally {
      setRemoteLoading(false)
    }
  }

  async function handleRegistro(event) {
    event.preventDefault()

    const email = normalizeEmail(registroForm.email)
    if (registroForm.password !== registroForm.confirm) {
      notify('As senhas nao coincidem.')
      return
    }

    if (isRemoteMode) {
      try {
        setRemoteLoading(true)
        const { data, error } = await supabase.auth.signUp({
          email,
          password: registroForm.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              nome: registroForm.nome.trim(),
            },
          },
        })

        if (error) throw error

        if (data.session?.user) {
          const profile = await applyRemoteUser(data.session.user)
          await carregarDadosRemotos(profile)
          setRegistroForm({ nome: '', email: '', password: '', confirm: '' })
          goTo('rifas')
          notify('Conta criada. Voce ja pode comprar numeros.')
        } else {
          setAuthMode('login')
          setLoginForm((current) => ({ ...current, email }))
          notify('Cadastro criado. Confirme seu email antes de entrar.')
        }
      } catch (error) {
        notify(error.message || 'Erro ao criar conta.')
      } finally {
        setRemoteLoading(false)
      }

      return
    }

    if (usuarios.some((usuario) => usuario.email === email)) {
      notify('Este email ja esta cadastrado.')
      return
    }

    const novoUsuario = {
      id: createId('usuario'),
      nome: registroForm.nome.trim(),
      email,
      password: registroForm.password,
      id_admin: false,
      data_criacao: new Date().toISOString(),
    }

    setUsuarios((current) => [...current, novoUsuario])
    setCurrentUserId(novoUsuario.id)
    setRegistroForm({ nome: '', email: '', password: '', confirm: '' })
    goTo('rifas')
    notify('Conta criada. Voce ja pode comprar numeros.')
  }

  async function logout() {
    if (isRemoteMode) {
      await supabase.auth.signOut()
      setUsuarios([])
      setCompras([])
    }

    setCurrentUserId('')
    goTo('rifas')
    notify('Sessao encerrada.')
  }

  function openCompra(rifaId) {
    if (!user) {
      setAuthMode('login')
      goTo('auth')
      notify('Entre ou crie uma conta para comprar numeros.')
      return
    }

    setSelectedRifaId(rifaId)
    goTo('comprar')
  }

  function toggleNumero(numero) {
    if (!selectedRifa) return

    const vendidos = getSoldNumbers(compras, selectedRifa.id, numerosRifa)
    if (vendidos.has(numero)) return

    setSelectedNumbers((current) =>
      current.includes(numero)
        ? current.filter((item) => item !== numero)
        : sortNumbers([...current, numero]),
    )
  }

  async function confirmarCompra() {
    if (!user) {
      setAuthMode('login')
      goTo('auth')
      notify('Entre para finalizar a compra.')
      return
    }

    if (!selectedRifa || selectedNumbers.length === 0) {
      notify('Selecione pelo menos um numero.')
      return
    }

    const vendidos = getSoldNumbers(compras, selectedRifa.id, numerosRifa)
    const conflitos = selectedNumbers.filter((numero) => vendidos.has(numero))
    if (conflitos.length > 0) {
      setSelectedNumbers((current) => current.filter((numero) => !vendidos.has(numero)))
      notify(`Os numeros ${conflitos.join(', ')} acabaram de ser vendidos.`)
      return
    }

    const numeros = sortNumbers(selectedNumbers)
    const valorTotal = Number((numeros.length * selectedRifa.preco).toFixed(2))
    const externalReference = createId('mp')

    setPaymentLoading(true)

    try {
      const response = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buyerEmail: user.email,
          buyerName: user.nome,
          externalReference,
          numeros,
          premioDescricao: selectedRifa.premio_descricao,
          rifaId: selectedRifa.id,
          rifaNome: selectedRifa.nome,
          unitPrice: selectedRifa.preco,
        }),
      })

      const rawResponse = await response.text()
      let preference = {}

      try {
        preference = rawResponse ? JSON.parse(rawResponse) : {}
      } catch {
        preference = { error: rawResponse || 'Resposta invalida do servidor de pagamento.' }
      }

      if (!response.ok) {
        throw new Error(preference.error || 'Nao foi possivel iniciar o pagamento.')
      }

      if (!preference.init_point) {
        throw new Error('O Mercado Pago nao retornou o link de checkout.')
      }

      const novaCompra = {
        id: createId('compra'),
        rifa_id: selectedRifa.id,
        comprador_id: user.id,
        comprador_nome: user.nome,
        numeros,
        valor_total: valorTotal,
        quantidade_numeros: numeros.length,
        status_pagamento: 'pendente',
        metodo_pagamento: 'mercado_pago',
        external_reference: externalReference,
        preference_id: preference.id,
        data_compra: new Date().toISOString(),
      }

      if (isRemoteMode) {
        const { data: compraCriada, error: compraError } = await supabase.rpc('criar_compra_mercado_pago', {
          p_rifa_id: selectedRifa.id,
          p_numeros: numeros,
          p_valor_total: valorTotal,
          p_referencia_externa: externalReference,
          p_preference_id: preference.id,
        })

        if (compraError) throw compraError

        const compra = Array.isArray(compraCriada) ? compraCriada[0] : compraCriada
        if (!compra?.id) {
          throw new Error('A compra foi reservada, mas o banco nao retornou o comprovante.')
        }

        novaCompra.id = compra.id
      }

      setCompras((current) => [novaCompra, ...current])
      setNumerosRifa((current) =>
        current.map((item) =>
          item.rifa_id === selectedRifa.id && numeros.includes(item.numero)
            ? { ...item, vendido: true, comprador_id: user.id }
            : item,
        ),
      )
      setSelectedNumbers([])
      window.location.href = preference.init_point
    } catch (error) {
      notify(error.message || 'Erro ao iniciar pagamento no Mercado Pago.')
    } finally {
      setPaymentLoading(false)
    }
  }

  async function handleCriarRifa(event) {
    event.preventDefault()

    if (!isAdmin) {
      notify('Apenas administradores podem criar rifas.')
      return
    }

    const preco = Number(novaRifa.preco)
    const totalNumeros = Number.parseInt(novaRifa.total_numeros, 10)

    if (!Number.isFinite(preco) || preco <= 0) {
      notify('Informe um preco valido.')
      return
    }

    if (!Number.isInteger(totalNumeros) || totalNumeros < 10 || totalNumeros > 500) {
      notify('Use entre 10 e 500 numeros para manter a grade legivel.')
      return
    }

    const rifaPayload = {
      nome: novaRifa.nome.trim(),
      descricao: novaRifa.descricao.trim(),
      imagem: novaRifa.imagem.trim(),
      preco,
      total_numeros: totalNumeros,
      premio_descricao: novaRifa.premio_descricao.trim(),
      criador_id: user.id,
      ativa: true,
      data_termino: novaRifa.data_termino,
    }

    try {
      if (isRemoteMode) {
        setRemoteLoading(true)

        const { data: rifa, error } = await supabase
          .from('rifas')
          .insert(rifaPayload)
          .select('*')
          .single()

        if (error) throw error

        const numeros = Array.from({ length: totalNumeros }, (_, index) => ({
          rifa_id: rifa.id,
          numero: index + 1,
          vendido: false,
        }))

        const { error: numerosError } = await supabase.from('numeros_rifa').insert(numeros)

        if (numerosError) throw numerosError

        await carregarDadosRemotos(user)
      } else {
        const rifa = {
          ...rifaPayload,
          id: createId('rifa'),
          data_criacao: new Date().toISOString(),
        }

        setRifas((current) => [rifa, ...current])
        setNumerosRifa((current) => [
          ...Array.from({ length: totalNumeros }, (_, index) => ({
            id: `${rifa.id}-${index + 1}`,
            rifa_id: rifa.id,
            numero: index + 1,
            vendido: false,
          })),
          ...current,
        ])
      }

      setNovaRifa(emptyRifa)
      goTo('admin')
      notify('Rifa criada com sucesso.')
    } catch (error) {
      notify(error.message || 'Erro ao criar rifa.')
    } finally {
      setRemoteLoading(false)
    }
  }

  async function toggleRifaStatus(rifaId) {
    if (isRemoteMode) {
      const rifaAtual = rifas.find((rifa) => rifa.id === rifaId)
      if (!rifaAtual) return

      const { error } = await supabase.from('rifas').update({ ativa: !rifaAtual.ativa }).eq('id', rifaId)

      if (error) {
        notify(error.message || 'Erro ao atualizar rifa.')
        return
      }

      await carregarDadosRemotos(user)
      return
    }

    setRifas((current) =>
      current.map((rifa) => (rifa.id === rifaId ? { ...rifa, ativa: !rifa.ativa } : rifa)),
    )
  }

  function resetDemoData() {
    if (isRemoteMode) {
      carregarDadosRemotos(user)
      notify('Dados recarregados do Supabase.')
      return
    }

    setUsuarios(demoUsers)
    setRifas(demoRifas)
    setCompras(demoCompras)
    setNumerosRifa(buildDemoNumerosRifa())
    setCurrentUserId('')
    setSelectedRifaId(demoRifas[0].id)
    setSelectedNumbers([])
    goTo('rifas')
    notify('Dados de demonstracao restaurados.')
  }

  function Header() {
    return (
      <header className="topbar">
        <button className="brand" type="button" onClick={() => goTo('rifas')}>
          <span className="brand-mark">
            <Ticket size={22} aria-hidden="true" />
          </span>
          <span>
            <strong>RifaMax</strong>
            <small>{dataMode === 'configured' ? 'Online com Supabase' : 'Demo local'}</small>
          </span>
        </button>

        <nav className="nav-actions" aria-label="Navegacao principal">
          <button className="ghost-button" type="button" onClick={() => goTo('rifas')}>
            <Ticket size={17} aria-hidden="true" />
            Rifas
          </button>

          {user && (
            <button className="ghost-button" type="button" onClick={() => goTo('minhas-compras')}>
              <ShoppingCart size={17} aria-hidden="true" />
              Compras
            </button>
          )}

          {isAdmin && (
            <button className="ghost-button" type="button" onClick={() => goTo('admin')}>
              <LayoutDashboard size={17} aria-hidden="true" />
              Admin
            </button>
          )}

          {user ? (
            <button className="outline-button" type="button" onClick={logout}>
              <LogOut size={17} aria-hidden="true" />
              Sair
            </button>
          ) : (
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setAuthMode('login')
                goTo('auth')
              }}
            >
              <LogIn size={17} aria-hidden="true" />
              Entrar
            </button>
          )}
        </nav>
      </header>
    )
  }

  function RifasView() {
    return (
      <main className="page">
        <section className="overview-band">
          <div>
            <p className="eyebrow">Plataforma de rifas online</p>
            <h1>Escolha seus numeros e acompanhe tudo em tempo real.</h1>
            <p className="lead">
              {isRemoteMode
                ? 'Rifas, usuarios, numeros reservados e compras agora usam o banco real.'
                : 'O fluxo esta pronto para demonstracao: login, cadastro, painel admin, criacao de rifas, selecao de numeros e historico de compras.'}
            </p>
          </div>

          <div className="quick-panel" aria-label="Acessos rapidos">
            <div className="user-chip">
              <Users size={18} aria-hidden="true" />
              {user ? user.nome : 'Visitante'}
            </div>
            {isRemoteMode ? (
              <button className="outline-button" type="button" onClick={() => goTo(user ? 'minhas-compras' : 'auth')}>
                <ShieldCheck size={17} aria-hidden="true" />
                {user ? 'Minha conta' : 'Entrar agora'}
              </button>
            ) : (
              <>
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => loginAs('cliente@rifamax.com', 'cliente123')}
                >
                  <LogIn size={17} aria-hidden="true" />
                  Cliente demo
                </button>
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => loginAs('admin@rifamax.com', 'admin123')}
                >
                  <ShieldCheck size={17} aria-hidden="true" />
                  Admin demo
                </button>
              </>
            )}
          </div>
        </section>

        <section className="metric-grid" aria-label="Resumo">
          <Metric icon={Ticket} label="Rifas ativas" value={dashboardStats.ativas} />
          <Metric icon={ShoppingCart} label="Numeros vendidos" value={dashboardStats.totalNumeros} />
          <Metric icon={Banknote} label={isRemoteMode ? 'Faturamento' : 'Faturamento demo'} value={currency.format(dashboardStats.totalReceita)} />
          <Metric icon={Users} label="Compradores" value={dashboardStats.compradores} />
        </section>

        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Disponiveis agora</p>
              <h2>Rifas em destaque</h2>
            </div>

            <label className="search-box">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar rifa"
              />
            </label>
          </div>

          {visibleRifas.length === 0 ? (
            <EmptyState
              title="Nenhuma rifa encontrada"
              text="Limpe a busca ou crie uma nova rifa no painel administrativo."
            />
          ) : (
            <div className="raffle-grid">
              {visibleRifas.map((rifa) => (
                <RifaCard key={rifa.id} rifa={rifa} />
              ))}
            </div>
          )}
        </section>
      </main>
    )
  }

  function Metric({ icon: Icon, label, value }) {
    return (
      <article className="metric-card">
        <Icon size={20} aria-hidden="true" />
        <span>{label}</span>
        <strong>{value}</strong>
      </article>
    )
  }

  function RifaCard({ rifa }) {
    const stats = getRifaStats(rifa, compras, numerosRifa)

    return (
      <article className="raffle-card">
        <img src={rifa.imagem} alt={rifa.nome} />
        <div className="raffle-content">
          <div className="raffle-title-row">
            <h3>{rifa.nome}</h3>
            <span className="price-pill">{currency.format(rifa.preco)}</span>
          </div>
          <p>{rifa.descricao}</p>

          <div className="prize-line">
            <Trophy size={17} aria-hidden="true" />
            <span>{rifa.premio_descricao}</span>
          </div>

          <div className="progress-row">
            <div className="progress-copy">
              <span>{stats.vendidos} vendidos</span>
              <strong>{stats.percentual}%</strong>
            </div>
            <div className="progress-track" aria-hidden="true">
              <span style={{ width: `${stats.percentual}%` }} />
            </div>
          </div>

          <div className="card-footer">
            <span className="date-chip">
              <CalendarDays size={15} aria-hidden="true" />
              {formatDate(rifa.data_termino)}
            </span>
            <button className="primary-button" type="button" onClick={() => openCompra(rifa.id)}>
              <ShoppingCart size={17} aria-hidden="true" />
              Comprar
            </button>
          </div>
        </div>
      </article>
    )
  }

  function AuthView() {
    return (
      <main className="page auth-page">
        <section className="auth-copy">
          <p className="eyebrow">Acesso</p>
          <h1>{authMode === 'login' ? 'Entre para comprar numeros.' : 'Crie sua conta em segundos.'}</h1>
          <p className="lead">
            {isRemoteMode
              ? 'Entre com seu email e senha para comprar numeros e acompanhar pagamentos.'
              : 'Use os acessos de demonstracao para testar o painel completo sem configurar o Supabase.'}
          </p>

          {!isRemoteMode && <div className="demo-login-row">
            <button
              className="outline-button"
              type="button"
              onClick={() => loginAs('cliente@rifamax.com', 'cliente123')}
            >
              <Users size={17} aria-hidden="true" />
              Cliente demo
            </button>
            <button
              className="outline-button"
              type="button"
              onClick={() => loginAs('admin@rifamax.com', 'admin123')}
            >
              <ShieldCheck size={17} aria-hidden="true" />
              Admin demo
            </button>
          </div>}
        </section>

        <section className="form-panel">
          <div className="segmented">
            <button
              type="button"
              className={authMode === 'login' ? 'active' : ''}
              onClick={() => setAuthMode('login')}
            >
              <LogIn size={16} aria-hidden="true" />
              Entrar
            </button>
            <button
              type="button"
              className={authMode === 'registro' ? 'active' : ''}
              onClick={() => setAuthMode('registro')}
            >
              <UserPlus size={16} aria-hidden="true" />
              Cadastro
            </button>
          </div>

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="form-stack">
              <label>
                Email
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="voce@email.com"
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  required
                />
              </label>
              <button className="primary-button full" type="submit">
                <LogIn size={17} aria-hidden="true" />
                {remoteLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegistro} className="form-stack">
              <label>
                Nome completo
                <input
                  type="text"
                  value={registroForm.nome}
                  onChange={(event) =>
                    setRegistroForm((current) => ({ ...current, nome: event.target.value }))
                  }
                  placeholder="Seu nome"
                  autoComplete="name"
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={registroForm.email}
                  onChange={(event) =>
                    setRegistroForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="voce@email.com"
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  value={registroForm.password}
                  onChange={(event) =>
                    setRegistroForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Minimo recomendado: 6 caracteres"
                  autoComplete="new-password"
                  required
                />
              </label>
              <label>
                Confirmar senha
                <input
                  type="password"
                  value={registroForm.confirm}
                  onChange={(event) =>
                    setRegistroForm((current) => ({ ...current, confirm: event.target.value }))
                  }
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  required
                />
              </label>
              <button className="primary-button full" type="submit">
                <UserPlus size={17} aria-hidden="true" />
                {remoteLoading ? 'Criando...' : 'Criar conta'}
              </button>
            </form>
          )}
        </section>
      </main>
    )
  }

  function ComprarView() {
    if (!selectedRifa) {
      return (
        <main className="page">
          <EmptyState title="Rifa nao encontrada" text="Volte para a lista e escolha uma rifa ativa." />
        </main>
      )
    }

    const stats = getRifaStats(selectedRifa, compras, numerosRifa)
    const vendidos = getSoldNumbers(compras, selectedRifa.id, numerosRifa)
    const total = selectedNumbers.length * selectedRifa.preco

    return (
      <main className="page">
        <button className="back-button" type="button" onClick={() => goTo('rifas')}>
          <ChevronLeft size={17} aria-hidden="true" />
          Voltar para rifas
        </button>

        <section className="purchase-layout">
          <div className="number-panel">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Comprar numeros</p>
                <h1>{selectedRifa.nome}</h1>
                <p className="lead">{selectedRifa.premio_descricao}</p>
              </div>
              <span className="price-pill large">{currency.format(selectedRifa.preco)} cada</span>
            </div>

            <div className="number-legend" aria-label="Legenda">
              <span>
                <i className="legend-free" />
                Disponivel
              </span>
              <span>
                <i className="legend-selected" />
                Selecionado
              </span>
              <span>
                <i className="legend-sold" />
                Vendido
              </span>
            </div>

            <div className="number-grid">
              {Array.from({ length: selectedRifa.total_numeros }, (_, index) => {
                const numero = index + 1
                const isSold = vendidos.has(numero)
                const isSelected = selectedNumbers.includes(numero)

                return (
                  <button
                    key={numero}
                    type="button"
                    className={`number-button ${isSold ? 'sold' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleNumero(numero)}
                    disabled={isSold}
                    title={isSold ? `Numero ${numero} vendido` : `Selecionar numero ${numero}`}
                    aria-pressed={isSelected}
                  >
                    {numero}
                  </button>
                )
              })}
            </div>
          </div>

          <aside className="summary-panel">
            <img src={selectedRifa.imagem} alt="" />
            <h2>Resumo</h2>
            <dl className="summary-list">
              <div>
                <dt>Selecionados</dt>
                <dd>{selectedNumbers.length}</dd>
              </div>
              <div>
                <dt>Disponiveis</dt>
                <dd>{stats.disponiveis}</dd>
              </div>
              <div>
                <dt>Subtotal</dt>
                <dd>{currency.format(total)}</dd>
              </div>
            </dl>

            {selectedNumbers.length > 0 ? (
              <div className="selected-list">{selectedNumbers.map((numero) => `#${numero}`).join(' ')}</div>
            ) : (
              <p className="muted">Escolha um ou mais numeros para liberar a finalizacao.</p>
            )}

            <button
              className="primary-button full"
              type="button"
              onClick={confirmarCompra}
              disabled={selectedNumbers.length === 0 || paymentLoading}
            >
              <CircleDollarSign size={17} aria-hidden="true" />
              {paymentLoading ? 'Criando pagamento...' : 'Pagar com Mercado Pago'}
            </button>
          </aside>
        </section>
      </main>
    )
  }

  function MinhasComprasView() {
    return (
      <main className="page">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Historico</p>
            <h1>Minhas compras</h1>
          </div>
          <button className="outline-button" type="button" onClick={() => goTo('rifas')}>
            <Ticket size={17} aria-hidden="true" />
            Ver rifas
          </button>
        </div>

        {!user ? (
          <EmptyState title="Voce ainda nao entrou" text="Faca login para consultar suas compras." />
        ) : minhasCompras.length === 0 ? (
          <EmptyState title="Nenhuma compra por enquanto" text="Escolha uma rifa e selecione seus numeros." />
        ) : (
          <div className="purchase-list">
            {minhasCompras.map((compra) => {
              const rifa = rifas.find((item) => item.id === compra.rifa_id)

              return (
                <article className="purchase-card" key={compra.id}>
                  <div>
                    <span className={`status-pill ${normalizePaymentStatus(compra.status_pagamento)}`}>
                      <BadgeCheck size={15} aria-hidden="true" />
                      {getPaymentStatusLabel(compra.status_pagamento)}
                    </span>
                    <h2>{rifa?.nome || 'Rifa removida'}</h2>
                    <p>{formatDate(compra.data_compra)}</p>
                  </div>
                  <div className="selected-list">{compra.numeros.map((numero) => `#${numero}`).join(' ')}</div>
                  <strong>{currency.format(compra.valor_total)}</strong>
                </article>
              )
            })}
          </div>
        )}
      </main>
    )
  }

  function AdminView() {
    if (!isAdmin) {
      return (
        <main className="page">
          <EmptyState title="Acesso restrito" text="Entre com uma conta administradora para acessar o painel." />
        </main>
      )
    }

    return (
      <main className="page">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Administracao</p>
            <h1>Painel de controle</h1>
          </div>
          <div className="button-row">
            <button className="outline-button" type="button" onClick={resetDemoData}>
              <RefreshCcw size={17} aria-hidden="true" />
              {isRemoteMode ? 'Recarregar' : 'Restaurar demo'}
            </button>
            <button className="primary-button" type="button" onClick={() => goTo('criar-rifa')}>
              <Plus size={17} aria-hidden="true" />
              Nova rifa
            </button>
          </div>
        </div>

        <section className="metric-grid">
          <Metric icon={Ticket} label="Total de rifas" value={dashboardStats.rifas} />
          <Metric icon={CircleDollarSign} label={isRemoteMode ? 'Receita' : 'Receita simulada'} value={currency.format(dashboardStats.totalReceita)} />
          <Metric icon={ShoppingCart} label="Numeros vendidos" value={dashboardStats.totalNumeros} />
          <Metric icon={Users} label="Clientes ativos" value={dashboardStats.compradores} />
        </section>

        <section className="table-panel">
          <div className="table-heading">
            <h2>Rifas cadastradas</h2>
            <span>{rifas.length} registros</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rifa</th>
                  <th>Preco</th>
                  <th>Vendidos</th>
                  <th>Receita</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {rifas.map((rifa) => {
                  const stats = getRifaStats(rifa, compras, numerosRifa)

                  return (
                    <tr key={rifa.id}>
                      <td>
                        <strong>{rifa.nome}</strong>
                        <span>{rifa.total_numeros} numeros</span>
                      </td>
                      <td>{currency.format(rifa.preco)}</td>
                      <td>
                        {stats.vendidos}/{rifa.total_numeros}
                      </td>
                      <td>{currency.format(stats.receita)}</td>
                      <td>
                        <span className={rifa.ativa ? 'status-pill success' : 'status-pill muted-status'}>
                          {rifa.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td>
                        <button className="outline-button small" type="button" onClick={() => toggleRifaStatus(rifa.id)}>
                          {rifa.ativa ? <X size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
                          {rifa.ativa ? 'Inativar' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    )
  }

  function CriarRifaView() {
    if (!isAdmin) {
      return (
        <main className="page">
          <EmptyState title="Acesso restrito" text="Entre como administrador para criar rifas." />
        </main>
      )
    }

    return (
      <main className="page form-page">
        <button className="back-button" type="button" onClick={() => goTo('admin')}>
          <ChevronLeft size={17} aria-hidden="true" />
          Voltar ao painel
        </button>

        <section className="form-panel wide">
          <p className="eyebrow">Nova rifa</p>
          <h1>Cadastrar premio</h1>

          <form className="form-grid" onSubmit={handleCriarRifa}>
            <label>
              Nome da rifa
              <input
                type="text"
                value={novaRifa.nome}
                onChange={(event) => setNovaRifa({ ...novaRifa, nome: event.target.value })}
                placeholder="Ex: Smartphone premium"
                required
              />
            </label>

            <label>
              Descricao do premio
              <input
                type="text"
                value={novaRifa.premio_descricao}
                onChange={(event) => setNovaRifa({ ...novaRifa, premio_descricao: event.target.value })}
                placeholder="O que sera sorteado"
                required
              />
            </label>

            <label className="span-2">
              Descricao curta
              <textarea
                value={novaRifa.descricao}
                onChange={(event) => setNovaRifa({ ...novaRifa, descricao: event.target.value })}
                placeholder="Explique regras, estado do premio e entrega"
                required
              />
            </label>

            <label>
              Preco por numero
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={novaRifa.preco}
                onChange={(event) => setNovaRifa({ ...novaRifa, preco: event.target.value })}
                placeholder="10.00"
                required
              />
            </label>

            <label>
              Total de numeros
              <input
                type="number"
                min="10"
                max="500"
                value={novaRifa.total_numeros}
                onChange={(event) => setNovaRifa({ ...novaRifa, total_numeros: event.target.value })}
                placeholder="100"
                required
              />
            </label>

            <label>
              Data de encerramento
              <input
                type="date"
                value={novaRifa.data_termino}
                onChange={(event) => setNovaRifa({ ...novaRifa, data_termino: event.target.value })}
                required
              />
            </label>

            <label>
              URL da imagem
              <input
                type="url"
                value={novaRifa.imagem}
                onChange={(event) => setNovaRifa({ ...novaRifa, imagem: event.target.value })}
                placeholder="https://..."
                required
              />
            </label>

            <div className="form-actions span-2">
              <button className="outline-button" type="button" onClick={() => goTo('admin')}>
                <X size={17} aria-hidden="true" />
                Cancelar
              </button>
              <button className="primary-button" type="submit">
                <Plus size={17} aria-hidden="true" />
                Criar rifa
              </button>
            </div>
          </form>
        </section>
      </main>
    )
  }

  function EmptyState({ title, text }) {
    return (
      <div className="empty-state">
        <Ticket size={28} aria-hidden="true" />
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      {Header()}

      {view === 'rifas' && RifasView()}
      {view === 'auth' && AuthView()}
      {view === 'comprar' && ComprarView()}
      {view === 'minhas-compras' && MinhasComprasView()}
      {view === 'admin' && AdminView()}
      {view === 'criar-rifa' && CriarRifaView()}

      {message && (
        <div className="toast" role="status">
          <BadgeCheck size={17} aria-hidden="true" />
          {message}
        </div>
      )}
    </div>
  )
}
import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  Banknote,
  CalendarDays,
  Check,
  ChevronLeft,
  CircleDollarSign,
  LayoutDashboard,
  LogIn,
  LogOut,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Ticket,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { dataMode, hasSupabaseConfig, supabase } from './lib/supabaseClient'
import './App.css'

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const demoUsers = [
  {
    id: 'admin-demo',
    nome: 'Admin RifaMax',
    email: 'admin@rifamax.com',
    password: 'admin123',
    id_admin: true,
    data_criacao: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 'cliente-demo',
    nome: 'Cliente Demo',
    email: 'cliente@rifamax.com',
    password: 'cliente123',
    id_admin: false,
    data_criacao: '2026-06-02T10:00:00.000Z',
  },
]

const demoRifas = [
  {
    id: 'rifa-console',
    nome: 'Console gamer completo',
    descricao: 'Console novo com dois controles, assinatura premium e entrega nacional.',
    imagem:
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80',
    preco: 12.5,
    total_numeros: 120,
    premio_descricao: 'Console de ultima geracao com kit de jogos',
    criador_id: 'admin-demo',
    ativa: true,
    data_termino: '2026-08-15',
    data_criacao: '2026-06-11T14:00:00.000Z',
  },
  {
    id: 'rifa-smartphone',
    nome: 'Smartphone premium',
    descricao: 'Aparelho lacrado, 256 GB, garantia nacional e capa inclusa.',
    imagem:
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1200&q=80',
    preco: 9,
    total_numeros: 100,
    premio_descricao: 'Smartphone premium 256 GB',
    criador_id: 'admin-demo',
    ativa: true,
    data_termino: '2026-07-28',
    data_criacao: '2026-06-10T14:00:00.000Z',
  },
  {
    id: 'rifa-sneaker',
    nome: 'Sneaker colecionavel',
    descricao: 'Modelo exclusivo para quem curte estilo, conforto e sorteio rapido.',
    imagem:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
    preco: 6,
    total_numeros: 80,
    premio_descricao: 'Sneaker original no tamanho escolhido',
    criador_id: 'admin-demo',
    ativa: true,
    data_termino: '2026-07-12',
    data_criacao: '2026-06-09T14:00:00.000Z',
  },
]

const demoCompras = [
  {
    id: 'compra-001',
    rifa_id: 'rifa-console',
    comprador_id: 'cliente-demo',
    comprador_nome: 'Cliente Demo',
    numeros: [3, 14, 27, 88],
    valor_total: 50,
    quantidade_numeros: 4,
    status_pagamento: 'confirmado',
    metodo_pagamento: 'simulado',
    data_compra: '2026-06-18T12:20:00.000Z',
  },
  {
    id: 'compra-002',
    rifa_id: 'rifa-smartphone',
    comprador_id: 'cliente-demo',
    comprador_nome: 'Cliente Demo',
    numeros: [6, 19, 41],
    valor_total: 27,
    quantidade_numeros: 3,
    status_pagamento: 'confirmado',
    metodo_pagamento: 'simulado',
    data_compra: '2026-06-19T09:40:00.000Z',
  },
  {
    id: 'compra-003',
    rifa_id: 'rifa-sneaker',
    comprador_id: 'admin-demo',
    comprador_nome: 'Admin RifaMax',
    numeros: [4, 8, 12, 24, 48],
    valor_total: 30,
    quantidade_numeros: 5,
    status_pagamento: 'confirmado',
    metodo_pagamento: 'simulado',
    data_compra: '2026-06-20T16:10:00.000Z',
  },
]

const emptyRifa = {
  nome: '',
  descricao: '',
  imagem: '',
  preco: '',
  total_numeros: '',
  data_termino: '',
  premio_descricao: '',
}

function buildDemoNumerosRifa() {
  const vendidos = new Set(demoCompras.flatMap((compra) => compra.numeros.map((numero) => `${compra.rifa_id}:${numero}`)))

  return demoRifas.flatMap((rifa) =>
    Array.from({ length: rifa.total_numeros }, (_, index) => {
      const numero = index + 1

      return {
        id: `${rifa.id}-${numero}`,
        rifa_id: rifa.id,
        numero,
        vendido: vendidos.has(`${rifa.id}:${numero}`),
      }
    }),
  )
}

function createId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? JSON.parse(saved) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue]
}

function isBlockingPurchase(compra) {
  return !['falha', 'reembolso', 'cancelado'].includes(normalizePaymentStatus(compra.status_pagamento))
}

function getSoldNumbers(compras, rifaId, numerosRifa = []) {
  return new Set(
    [
      ...compras
      .filter((compra) => compra.rifa_id === rifaId && isBlockingPurchase(compra))
      .flatMap((compra) => compra.numeros),
      ...numerosRifa
        .filter((numero) => numero.rifa_id === rifaId && numero.vendido)
        .map((numero) => numero.numero),
    ],
  )
}

function getRifaStats(rifa, compras, numerosRifa = []) {
  const soldNumbers = getSoldNumbers(compras, rifa.id, numerosRifa)
  const vendidos = soldNumbers.size
  const disponiveis = Math.max(rifa.total_numeros - vendidos, 0)
  const percentual = rifa.total_numeros > 0 ? Math.round((vendidos / rifa.total_numeros) * 100) : 0
  const receita = [...soldNumbers].length * rifa.preco

  return { vendidos, disponiveis, percentual, receita }
}

function formatDate(value) {
  if (!value) return 'Sem data'

  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value))
}

function normalizePaymentStatus(status) {
  const value = String(status || '').toLowerCase()

  if (['approved', 'success', 'confirmado'].includes(value)) return 'confirmado'
  if (['pending', 'in_process', 'in_mediation', 'pendente'].includes(value)) return 'pendente'
  if (['rejected', 'cancelled', 'failure', 'falha'].includes(value)) return 'falha'
  return value || 'pendente'
}

function getPaymentStatusLabel(status) {
  const normalized = normalizePaymentStatus(status)

  if (normalized === 'confirmado') return 'Confirmado'
  if (normalized === 'falha') return 'Falhou'
  return 'Pendente'
}

function sortNumbers(numbers) {
  return [...numbers].sort((a, b) => a - b)
}

export default function App() {
  const isRemoteMode = hasSupabaseConfig && Boolean(supabase)
  const [usuarios, setUsuarios] = usePersistentState('rifamax:usuarios', demoUsers)
  const [rifas, setRifas] = usePersistentState('rifamax:rifas', demoRifas)
  const [compras, setCompras] = usePersistentState('rifamax:compras', demoCompras)
  const [numerosRifa, setNumerosRifa] = usePersistentState('rifamax:numeros', buildDemoNumerosRifa())
  const [currentUserId, setCurrentUserId] = usePersistentState('rifamax:sessao', '')
  const [view, setView] = useState('rifas')
  const [selectedRifaId, setSelectedRifaId] = useState(demoRifas[0].id)
  const [selectedNumbers, setSelectedNumbers] = useState([])
  const [search, setSearch] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registroForm, setRegistroForm] = useState({ nome: '', email: '', password: '', confirm: '' })
  const [novaRifa, setNovaRifa] = useState(emptyRifa)
  const [message, setMessage] = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [remoteLoading, setRemoteLoading] = useState(false)

  const user = useMemo(
    () => usuarios.find((usuario) => usuario.id === currentUserId) || null,
    [currentUserId, usuarios],
  )

  const isAdmin = Boolean(user?.id_admin)
  const selectedRifa = rifas.find((rifa) => rifa.id === selectedRifaId) || rifas[0]

  const visibleRifas = useMemo(() => {
    const term = search.trim().toLowerCase()

    return rifas
      .filter((rifa) => rifa.ativa)
      .filter((rifa) => {
        if (!term) return true
        return [rifa.nome, rifa.descricao, rifa.premio_descricao].some((value) =>
          value.toLowerCase().includes(term),
        )
      })
  }, [rifas, search])

  const minhasCompras = useMemo(() => {
    if (!user) return []
    return compras
      .filter((compra) => compra.comprador_id === user.id)
      .sort((a, b) => new Date(b.data_compra) - new Date(a.data_compra))
  }, [compras, user])

  const dashboardStats = useMemo(() => {
    const totalReceita = compras.reduce((sum, compra) => sum + compra.valor_total, 0)
    const totalNumeros = rifas.reduce(
      (sum, rifa) => sum + getSoldNumbers(compras, rifa.id, numerosRifa).size,
      0,
    )
    const compradores = new Set(compras.map((compra) => compra.comprador_id)).size

    return {
      rifas: rifas.length,
      ativas: rifas.filter((rifa) => rifa.ativa).length,
      totalReceita,
      totalNumeros,
      compradores,
    }
  }, [compras, numerosRifa, rifas])

  useEffect(() => {
    if (!message) return undefined

    const timeout = window.setTimeout(() => setMessage(''), 3500)
    return () => window.clearTimeout(timeout)
  }, [message])

  useEffect(() => {
    setSelectedNumbers([])
  }, [selectedRifaId])

  useEffect(() => {
    if (!isRemoteMode) return undefined

    let active = true

    async function bootstrapRemoteData() {
      setRemoteLoading(true)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const profile = session?.user ? await applyRemoteUser(session.user) : null

        if (!session?.user) {
          setUsuarios([])
          setCurrentUserId('')
          setCompras([])
        }

        if (active) {
          await carregarDadosRemotos(profile)
        }
      } catch (error) {
        notify(error.message || 'Erro ao carregar dados do Supabase.')
      } finally {
        if (active) setRemoteLoading(false)
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return

      const profile = session?.user ? await applyRemoteUser(session.user) : null

      if (!session?.user) {
        setUsuarios([])
        setCurrentUserId('')
        setCompras([])
      }

      await carregarDadosRemotos(profile)
    })

    bootstrapRemoteData()

    return () => {
      active = false
      subscription.unsubscribe()
    }
    // Dados remotos devem ser inicializados apenas quando o modo Supabase muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRemoteMode])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const externalReference = params.get('external_reference')
    const rawStatus = params.get('status') || params.get('collection_status') || params.get('payment')
    const paymentId = params.get('payment_id') || params.get('collection_id')

    if (!externalReference || !rawStatus) return

    async function syncPaymentReturn() {
      let nextStatus = normalizePaymentStatus(rawStatus)

      if (isRemoteMode && paymentId) {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.access_token) {
          const response = await fetch('/api/mercadopago/sync-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              externalReference,
              paymentId,
              supabaseAccessToken: session.access_token,
            }),
          })

          const result = await response.json().catch(() => ({}))

          if (response.ok && result.status_pagamento) {
            nextStatus = result.status_pagamento
          }
        }
      }

      setCompras((current) =>
        current.map((compra) =>
          compra.external_reference === externalReference
            ? {
                ...compra,
                id_transacao_mp: paymentId || compra.id_transacao_mp,
                status_pagamento: nextStatus,
              }
            : compra,
        ),
      )

      await carregarDadosRemotos()
      goTo('minhas-compras')
      notify(
        nextStatus === 'confirmado'
          ? 'Pagamento aprovado pelo Mercado Pago.'
          : 'Recebemos o retorno do Mercado Pago. A compra esta pendente ou precisa de revisao.',
      )
      window.history.replaceState({}, '', window.location.pathname)
    }

    syncPaymentReturn().catch((error) => {
      notify(error.message || 'Nao foi possivel sincronizar o pagamento.')
    })
    // Sincronizacao acontece somente quando a URL de retorno muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCompras])

  function notify(text) {
    setMessage(text)
  }

  function goTo(nextView) {
    setView(nextView)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function mapRemoteProfile(row, authUser) {
    return {
      id: authUser.id,
      perfil_id: row?.id,
      id_usuario: authUser.id,
      nome: row?.nome || authUser.user_metadata?.nome || authUser.email,
      email: row?.email || authUser.email,
      id_admin: Boolean(row?.id_admin),
      data_criacao: row?.data_criacao || authUser.created_at,
    }
  }

  function mapRemoteCompra(row) {
    return {
      id: row.id,
      rifa_id: row.rifa_id,
      comprador_id: row.comprador_id,
      comprador_nome: row.usuarios?.nome || row.comprador_nome || 'Cliente',
      numeros: sortNumbers((row.compra_numeros || []).map((item) => item.numero)),
      valor_total: Number(row.valor_total || 0),
      quantidade_numeros: row.quantidade_numeros,
      status_pagamento: row.status_pagamento,
      metodo_pagamento: row.metodo_pagamento,
      external_reference: row.referencia_externa,
      preference_id: row.preference_id,
      id_transacao_mp: row.id_transacao_mp,
      data_compra: row.data_compra,
    }
  }

  async function applyRemoteUser(authUser) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id_usuario', authUser.id)
      .maybeSingle()

    if (error) throw error

    let profile = data

    if (!profile) {
      const { data: inserted, error: insertError } = await supabase
        .from('usuarios')
        .insert({
          id_usuario: authUser.id,
          nome: authUser.user_metadata?.nome || authUser.email,
          email: authUser.email,
        })
        .select('*')
        .single()

      if (insertError) throw insertError
      profile = inserted
    }

    const mappedProfile = mapRemoteProfile(profile, authUser)

    setUsuarios([mappedProfile])
    setCurrentUserId(authUser.id)

    return mappedProfile
  }

  async function carregarDadosRemotos(profile = user) {
    if (!isRemoteMode) return

    const { data: rifasData, error: rifasError } = await supabase
      .from('rifas')
      .select('*')
      .order('data_criacao', { ascending: false })

    if (rifasError) throw rifasError

    const { data: numerosData, error: numerosError } = await supabase
      .from('numeros_rifa')
      .select('id, rifa_id, numero, vendido, comprador_id, data_venda')
      .order('numero', { ascending: true })

    if (numerosError) throw numerosError

    setRifas((rifasData || []).map((rifa) => ({ ...rifa, preco: Number(rifa.preco) })))
    setNumerosRifa(numerosData || [])

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      setCompras([])
      return
    }

    let comprasQuery = supabase
      .from('compras')
      .select('*, compra_numeros(numero)')
      .order('data_compra', { ascending: false })

    if (!profile?.id_admin) {
      comprasQuery = comprasQuery.eq('comprador_id', authUser.id)
    }

    const { data: comprasData, error: comprasError } = await comprasQuery

    if (comprasError) throw comprasError

    setCompras((comprasData || []).map(mapRemoteCompra))
  }

  async function loginAs(email, password) {
    if (isRemoteMode) {
      notify('Os acessos demo ficam desativados no modo publico. Use uma conta real.')
      return false
    }

    const match = usuarios.find(
      (usuario) => usuario.email === normalizeEmail(email) && usuario.password === password,
    )

    if (!match) {
      notify('Email ou senha invalidos.')
      return false
    }

    setCurrentUserId(match.id)
    setLoginForm({ email: '', password: '' })
    goTo('rifas')
    notify(`Bem-vindo, ${match.nome}.`)
    return true
  }

  async function handleLogin(event) {
    event.preventDefault()

    if (!isRemoteMode) {
      await loginAs(loginForm.email, loginForm.password)
      return
    }

    try {
      setRemoteLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizeEmail(loginForm.email),
        password: loginForm.password,
      })

      if (error) throw error

      const profile = await applyRemoteUser(data.user)
      await carregarDadosRemotos(profile)
      setLoginForm({ email: '', password: '' })
      goTo('rifas')
      notify(`Bem-vindo, ${profile.nome}.`)
    } catch (error) {
      notify(error.message || 'Erro ao fazer login.')
    } finally {
      setRemoteLoading(false)
    }
  }

  async function handleRegistro(event) {
    event.preventDefault()

    const email = normalizeEmail(registroForm.email)
    if (registroForm.password !== registroForm.confirm) {
      notify('As senhas nao coincidem.')
      return
    }

    if (isRemoteMode) {
      try {
        setRemoteLoading(true)
        const { data, error } = await supabase.auth.signUp({
          email,
          password: registroForm.password,
          options: {
            data: {
              nome: registroForm.nome.trim(),
            },
          },
        })

        if (error) throw error

        if (data.session?.user) {
          const profile = await applyRemoteUser(data.session.user)
          await carregarDadosRemotos(profile)
          setRegistroForm({ nome: '', email: '', password: '', confirm: '' })
          goTo('rifas')
          notify('Conta criada. Voce ja pode comprar numeros.')
        } else {
          setAuthMode('login')
          notify('Cadastro criado. Confira seu email e depois faca login.')
        }
      } catch (error) {
        notify(error.message || 'Erro ao criar conta.')
      } finally {
        setRemoteLoading(false)
      }

      return
    }

    if (usuarios.some((usuario) => usuario.email === email)) {
      notify('Este email ja esta cadastrado.')
      return
    }

    const novoUsuario = {
      id: createId('usuario'),
      nome: registroForm.nome.trim(),
      email,
      password: registroForm.password,
      id_admin: false,
      data_criacao: new Date().toISOString(),
    }

    setUsuarios((current) => [...current, novoUsuario])
    setCurrentUserId(novoUsuario.id)
    setRegistroForm({ nome: '', email: '', password: '', confirm: '' })
    goTo('rifas')
    notify('Conta criada. Voce ja pode comprar numeros.')
  }

  async function logout() {
    if (isRemoteMode) {
      await supabase.auth.signOut()
      setUsuarios([])
      setCompras([])
    }

    setCurrentUserId('')
    goTo('rifas')
    notify('Sessao encerrada.')
  }

  function openCompra(rifaId) {
    if (!user) {
      setAuthMode('login')
      goTo('auth')
      notify('Entre ou crie uma conta para comprar numeros.')
      return
    }

    setSelectedRifaId(rifaId)
    goTo('comprar')
  }

  function toggleNumero(numero) {
    if (!selectedRifa) return

    const vendidos = getSoldNumbers(compras, selectedRifa.id, numerosRifa)
    if (vendidos.has(numero)) return

    setSelectedNumbers((current) =>
      current.includes(numero)
        ? current.filter((item) => item !== numero)
        : sortNumbers([...current, numero]),
    )
  }

  async function confirmarCompra() {
    if (!user) {
      setAuthMode('login')
      goTo('auth')
      notify('Entre para finalizar a compra.')
      return
    }

    if (!selectedRifa || selectedNumbers.length === 0) {
      notify('Selecione pelo menos um numero.')
      return
    }

    const vendidos = getSoldNumbers(compras, selectedRifa.id, numerosRifa)
    const conflitos = selectedNumbers.filter((numero) => vendidos.has(numero))
    if (conflitos.length > 0) {
      setSelectedNumbers((current) => current.filter((numero) => !vendidos.has(numero)))
      notify(`Os numeros ${conflitos.join(', ')} acabaram de ser vendidos.`)
      return
    }

    const numeros = sortNumbers(selectedNumbers)
    const valorTotal = Number((numeros.length * selectedRifa.preco).toFixed(2))
    const externalReference = createId('mp')

    setPaymentLoading(true)

    try {
      const response = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buyerEmail: user.email,
          buyerName: user.nome,
          externalReference,
          numeros,
          premioDescricao: selectedRifa.premio_descricao,
          rifaId: selectedRifa.id,
          rifaNome: selectedRifa.nome,
          unitPrice: selectedRifa.preco,
        }),
      })

      const rawResponse = await response.text()
      let preference = {}

      try {
        preference = rawResponse ? JSON.parse(rawResponse) : {}
      } catch {
        preference = { error: rawResponse || 'Resposta invalida do servidor de pagamento.' }
      }

      if (!response.ok) {
        throw new Error(preference.error || 'Nao foi possivel iniciar o pagamento.')
      }

      if (!preference.init_point) {
        throw new Error('O Mercado Pago nao retornou o link de checkout.')
      }

      const novaCompra = {
        id: createId('compra'),
        rifa_id: selectedRifa.id,
        comprador_id: user.id,
        comprador_nome: user.nome,
        numeros,
        valor_total: valorTotal,
        quantidade_numeros: numeros.length,
        status_pagamento: 'pendente',
        metodo_pagamento: 'mercado_pago',
        external_reference: externalReference,
        preference_id: preference.id,
        data_compra: new Date().toISOString(),
      }

      if (isRemoteMode) {
        const { data: compraCriada, error: compraError } = await supabase.rpc('criar_compra_mercado_pago', {
          p_rifa_id: selectedRifa.id,
          p_numeros: numeros,
          p_valor_total: valorTotal,
          p_referencia_externa: externalReference,
          p_preference_id: preference.id,
        })

        if (compraError) throw compraError

        const compra = Array.isArray(compraCriada) ? compraCriada[0] : compraCriada
        if (!compra?.id) {
          throw new Error('A compra foi reservada, mas o banco nao retornou o comprovante.')
        }

        novaCompra.id = compra.id
      }

      setCompras((current) => [novaCompra, ...current])
      setNumerosRifa((current) =>
        current.map((item) =>
          item.rifa_id === selectedRifa.id && numeros.includes(item.numero)
            ? { ...item, vendido: true, comprador_id: user.id }
            : item,
        ),
      )
      setSelectedNumbers([])
      window.location.href = preference.init_point
    } catch (error) {
      notify(error.message || 'Erro ao iniciar pagamento no Mercado Pago.')
    } finally {
      setPaymentLoading(false)
    }
  }

  async function handleCriarRifa(event) {
    event.preventDefault()

    if (!isAdmin) {
      notify('Apenas administradores podem criar rifas.')
      return
    }

    const preco = Number(novaRifa.preco)
    const totalNumeros = Number.parseInt(novaRifa.total_numeros, 10)

    if (!Number.isFinite(preco) || preco <= 0) {
      notify('Informe um preco valido.')
      return
    }

    if (!Number.isInteger(totalNumeros) || totalNumeros < 10 || totalNumeros > 500) {
      notify('Use entre 10 e 500 numeros para manter a grade legivel.')
      return
    }

    const rifaPayload = {
      nome: novaRifa.nome.trim(),
      descricao: novaRifa.descricao.trim(),
      imagem: novaRifa.imagem.trim(),
      preco,
      total_numeros: totalNumeros,
      premio_descricao: novaRifa.premio_descricao.trim(),
      criador_id: user.id,
      ativa: true,
      data_termino: novaRifa.data_termino,
    }

    try {
      if (isRemoteMode) {
        setRemoteLoading(true)

        const { data: rifa, error } = await supabase
          .from('rifas')
          .insert(rifaPayload)
          .select('*')
          .single()

        if (error) throw error

        const numeros = Array.from({ length: totalNumeros }, (_, index) => ({
          rifa_id: rifa.id,
          numero: index + 1,
          vendido: false,
        }))

        const { error: numerosError } = await supabase.from('numeros_rifa').insert(numeros)

        if (numerosError) throw numerosError

        await carregarDadosRemotos(user)
      } else {
        const rifa = {
          ...rifaPayload,
          id: createId('rifa'),
          data_criacao: new Date().toISOString(),
        }

        setRifas((current) => [rifa, ...current])
        setNumerosRifa((current) => [
          ...Array.from({ length: totalNumeros }, (_, index) => ({
            id: `${rifa.id}-${index + 1}`,
            rifa_id: rifa.id,
            numero: index + 1,
            vendido: false,
          })),
          ...current,
        ])
      }

      setNovaRifa(emptyRifa)
      goTo('admin')
      notify('Rifa criada com sucesso.')
    } catch (error) {
      notify(error.message || 'Erro ao criar rifa.')
    } finally {
      setRemoteLoading(false)
    }
  }

  async function toggleRifaStatus(rifaId) {
    if (isRemoteMode) {
      const rifaAtual = rifas.find((rifa) => rifa.id === rifaId)
      if (!rifaAtual) return

      const { error } = await supabase.from('rifas').update({ ativa: !rifaAtual.ativa }).eq('id', rifaId)

      if (error) {
        notify(error.message || 'Erro ao atualizar rifa.')
        return
      }

      await carregarDadosRemotos(user)
      return
    }

    setRifas((current) =>
      current.map((rifa) => (rifa.id === rifaId ? { ...rifa, ativa: !rifa.ativa } : rifa)),
    )
  }

  function resetDemoData() {
    if (isRemoteMode) {
      carregarDadosRemotos(user)
      notify('Dados recarregados do Supabase.')
      return
    }

    setUsuarios(demoUsers)
    setRifas(demoRifas)
    setCompras(demoCompras)
    setNumerosRifa(buildDemoNumerosRifa())
    setCurrentUserId('')
    setSelectedRifaId(demoRifas[0].id)
    setSelectedNumbers([])
    goTo('rifas')
    notify('Dados de demonstracao restaurados.')
  }

  function Header() {
    return (
      <header className="topbar">
        <button className="brand" type="button" onClick={() => goTo('rifas')}>
          <span className="brand-mark">
            <Ticket size={22} aria-hidden="true" />
          </span>
          <span>
            <strong>RifaMax</strong>
            <small>{dataMode === 'configured' ? 'Online com Supabase' : 'Demo local'}</small>
          </span>
        </button>

        <nav className="nav-actions" aria-label="Navegacao principal">
          <button className="ghost-button" type="button" onClick={() => goTo('rifas')}>
            <Ticket size={17} aria-hidden="true" />
            Rifas
          </button>

          {user && (
            <button className="ghost-button" type="button" onClick={() => goTo('minhas-compras')}>
              <ShoppingCart size={17} aria-hidden="true" />
              Compras
            </button>
          )}

          {isAdmin && (
            <button className="ghost-button" type="button" onClick={() => goTo('admin')}>
              <LayoutDashboard size={17} aria-hidden="true" />
              Admin
            </button>
          )}

          {user ? (
            <button className="outline-button" type="button" onClick={logout}>
              <LogOut size={17} aria-hidden="true" />
              Sair
            </button>
          ) : (
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setAuthMode('login')
                goTo('auth')
              }}
            >
              <LogIn size={17} aria-hidden="true" />
              Entrar
            </button>
          )}
        </nav>
      </header>
    )
  }

  function RifasView() {
    return (
      <main className="page">
        <section className="overview-band">
          <div>
            <p className="eyebrow">Plataforma de rifas online</p>
            <h1>Escolha seus numeros e acompanhe tudo em tempo real.</h1>
            <p className="lead">
              {isRemoteMode
                ? 'Rifas, usuarios, numeros reservados e compras agora usam o banco real.'
                : 'O fluxo esta pronto para demonstracao: login, cadastro, painel admin, criacao de rifas, selecao de numeros e historico de compras.'}
            </p>
          </div>

          <div className="quick-panel" aria-label="Acessos rapidos">
            <div className="user-chip">
              <Users size={18} aria-hidden="true" />
              {user ? user.nome : 'Visitante'}
            </div>
            {isRemoteMode ? (
              <button className="outline-button" type="button" onClick={() => goTo(user ? 'minhas-compras' : 'auth')}>
                <ShieldCheck size={17} aria-hidden="true" />
                {user ? 'Minha conta' : 'Entrar agora'}
              </button>
            ) : (
              <>
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => loginAs('cliente@rifamax.com', 'cliente123')}
                >
                  <LogIn size={17} aria-hidden="true" />
                  Cliente demo
                </button>
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => loginAs('admin@rifamax.com', 'admin123')}
                >
                  <ShieldCheck size={17} aria-hidden="true" />
                  Admin demo
                </button>
              </>
            )}
          </div>
        </section>

        <section className="metric-grid" aria-label="Resumo">
          <Metric icon={Ticket} label="Rifas ativas" value={dashboardStats.ativas} />
          <Metric icon={ShoppingCart} label="Numeros vendidos" value={dashboardStats.totalNumeros} />
          <Metric icon={Banknote} label={isRemoteMode ? 'Faturamento' : 'Faturamento demo'} value={currency.format(dashboardStats.totalReceita)} />
          <Metric icon={Users} label="Compradores" value={dashboardStats.compradores} />
        </section>

        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Disponiveis agora</p>
              <h2>Rifas em destaque</h2>
            </div>

            <label className="search-box">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar rifa"
              />
            </label>
          </div>

          {visibleRifas.length === 0 ? (
            <EmptyState
              title="Nenhuma rifa encontrada"
              text="Limpe a busca ou crie uma nova rifa no painel administrativo."
            />
          ) : (
            <div className="raffle-grid">
              {visibleRifas.map((rifa) => (
                <RifaCard key={rifa.id} rifa={rifa} />
              ))}
            </div>
          )}
        </section>
      </main>
    )
  }

  function Metric({ icon: Icon, label, value }) {
    return (
      <article className="metric-card">
        <Icon size={20} aria-hidden="true" />
        <span>{label}</span>
        <strong>{value}</strong>
      </article>
    )
  }

  function RifaCard({ rifa }) {
    const stats = getRifaStats(rifa, compras, numerosRifa)

    return (
      <article className="raffle-card">
        <img src={rifa.imagem} alt={rifa.nome} />
        <div className="raffle-content">
          <div className="raffle-title-row">
            <h3>{rifa.nome}</h3>
            <span className="price-pill">{currency.format(rifa.preco)}</span>
          </div>
          <p>{rifa.descricao}</p>

          <div className="prize-line">
            <Trophy size={17} aria-hidden="true" />
            <span>{rifa.premio_descricao}</span>
          </div>

          <div className="progress-row">
            <div className="progress-copy">
              <span>{stats.vendidos} vendidos</span>
              <strong>{stats.percentual}%</strong>
            </div>
            <div className="progress-track" aria-hidden="true">
              <span style={{ width: `${stats.percentual}%` }} />
            </div>
          </div>

          <div className="card-footer">
            <span className="date-chip">
              <CalendarDays size={15} aria-hidden="true" />
              {formatDate(rifa.data_termino)}
            </span>
            <button className="primary-button" type="button" onClick={() => openCompra(rifa.id)}>
              <ShoppingCart size={17} aria-hidden="true" />
              Comprar
            </button>
          </div>
        </div>
      </article>
    )
  }

  function AuthView() {
    return (
      <main className="page auth-page">
        <section className="auth-copy">
          <p className="eyebrow">Acesso</p>
          <h1>{authMode === 'login' ? 'Entre para comprar numeros.' : 'Crie sua conta em segundos.'}</h1>
          <p className="lead">
            {isRemoteMode
              ? 'Entre com seu email e senha para comprar numeros e acompanhar pagamentos.'
              : 'Use os acessos de demonstracao para testar o painel completo sem configurar o Supabase.'}
          </p>

          {!isRemoteMode && <div className="demo-login-row">
            <button
              className="outline-button"
              type="button"
              onClick={() => loginAs('cliente@rifamax.com', 'cliente123')}
            >
              <Users size={17} aria-hidden="true" />
              Cliente demo
            </button>
            <button
              className="outline-button"
              type="button"
              onClick={() => loginAs('admin@rifamax.com', 'admin123')}
            >
              <ShieldCheck size={17} aria-hidden="true" />
              Admin demo
            </button>
          </div>}
        </section>

        <section className="form-panel">
          <div className="segmented">
            <button
              type="button"
              className={authMode === 'login' ? 'active' : ''}
              onClick={() => setAuthMode('login')}
            >
              <LogIn size={16} aria-hidden="true" />
              Entrar
            </button>
            <button
              type="button"
              className={authMode === 'registro' ? 'active' : ''}
              onClick={() => setAuthMode('registro')}
            >
              <UserPlus size={16} aria-hidden="true" />
              Cadastro
            </button>
          </div>

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="form-stack">
              <label>
                Email
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                  placeholder="voce@email.com"
                  required
                />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                  placeholder="Sua senha"
                  required
                />
              </label>
              <button className="primary-button full" type="submit">
                <LogIn size={17} aria-hidden="true" />
                {remoteLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegistro} className="form-stack">
              <label>
                Nome completo
                <input
                  type="text"
                  value={registroForm.nome}
                  onChange={(event) => setRegistroForm({ ...registroForm, nome: event.target.value })}
                  placeholder="Seu nome"
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={registroForm.email}
                  onChange={(event) => setRegistroForm({ ...registroForm, email: event.target.value })}
                  placeholder="voce@email.com"
                  required
                />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  value={registroForm.password}
                  onChange={(event) => setRegistroForm({ ...registroForm, password: event.target.value })}
                  placeholder="Minimo recomendado: 6 caracteres"
                  required
                />
              </label>
              <label>
                Confirmar senha
                <input
                  type="password"
                  value={registroForm.confirm}
                  onChange={(event) => setRegistroForm({ ...registroForm, confirm: event.target.value })}
                  placeholder="Repita a senha"
                  required
                />
              </label>
              <button className="primary-button full" type="submit">
                <UserPlus size={17} aria-hidden="true" />
                {remoteLoading ? 'Criando...' : 'Criar conta'}
              </button>
            </form>
          )}
        </section>
      </main>
    )
  }

  function ComprarView() {
    if (!selectedRifa) {
      return (
        <main className="page">
          <EmptyState title="Rifa nao encontrada" text="Volte para a lista e escolha uma rifa ativa." />
        </main>
      )
    }

    const stats = getRifaStats(selectedRifa, compras, numerosRifa)
    const vendidos = getSoldNumbers(compras, selectedRifa.id, numerosRifa)
    const total = selectedNumbers.length * selectedRifa.preco

    return (
      <main className="page">
        <button className="back-button" type="button" onClick={() => goTo('rifas')}>
          <ChevronLeft size={17} aria-hidden="true" />
          Voltar para rifas
        </button>

        <section className="purchase-layout">
          <div className="number-panel">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Comprar numeros</p>
                <h1>{selectedRifa.nome}</h1>
                <p className="lead">{selectedRifa.premio_descricao}</p>
              </div>
              <span className="price-pill large">{currency.format(selectedRifa.preco)} cada</span>
            </div>

            <div className="number-legend" aria-label="Legenda">
              <span>
                <i className="legend-free" />
                Disponivel
              </span>
              <span>
                <i className="legend-selected" />
                Selecionado
              </span>
              <span>
                <i className="legend-sold" />
                Vendido
              </span>
            </div>

            <div className="number-grid">
              {Array.from({ length: selectedRifa.total_numeros }, (_, index) => {
                const numero = index + 1
                const isSold = vendidos.has(numero)
                const isSelected = selectedNumbers.includes(numero)

                return (
                  <button
                    key={numero}
                    type="button"
                    className={`number-button ${isSold ? 'sold' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleNumero(numero)}
                    disabled={isSold}
                    title={isSold ? `Numero ${numero} vendido` : `Selecionar numero ${numero}`}
                    aria-pressed={isSelected}
                  >
                    {numero}
                  </button>
                )
              })}
            </div>
          </div>

          <aside className="summary-panel">
            <img src={selectedRifa.imagem} alt="" />
            <h2>Resumo</h2>
            <dl className="summary-list">
              <div>
                <dt>Selecionados</dt>
                <dd>{selectedNumbers.length}</dd>
              </div>
              <div>
                <dt>Disponiveis</dt>
                <dd>{stats.disponiveis}</dd>
              </div>
              <div>
                <dt>Subtotal</dt>
                <dd>{currency.format(total)}</dd>
              </div>
            </dl>

            {selectedNumbers.length > 0 ? (
              <div className="selected-list">{selectedNumbers.map((numero) => `#${numero}`).join(' ')}</div>
            ) : (
              <p className="muted">Escolha um ou mais numeros para liberar a finalizacao.</p>
            )}

            <button
              className="primary-button full"
              type="button"
              onClick={confirmarCompra}
              disabled={selectedNumbers.length === 0 || paymentLoading}
            >
              <CircleDollarSign size={17} aria-hidden="true" />
              {paymentLoading ? 'Criando pagamento...' : 'Pagar com Mercado Pago'}
            </button>
          </aside>
        </section>
      </main>
    )
  }

  function MinhasComprasView() {
    return (
      <main className="page">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Historico</p>
            <h1>Minhas compras</h1>
          </div>
          <button className="outline-button" type="button" onClick={() => goTo('rifas')}>
            <Ticket size={17} aria-hidden="true" />
            Ver rifas
          </button>
        </div>

        {!user ? (
          <EmptyState title="Voce ainda nao entrou" text="Faca login para consultar suas compras." />
        ) : minhasCompras.length === 0 ? (
          <EmptyState title="Nenhuma compra por enquanto" text="Escolha uma rifa e selecione seus numeros." />
        ) : (
          <div className="purchase-list">
            {minhasCompras.map((compra) => {
              const rifa = rifas.find((item) => item.id === compra.rifa_id)

              return (
                <article className="purchase-card" key={compra.id}>
                  <div>
                    <span className={`status-pill ${normalizePaymentStatus(compra.status_pagamento)}`}>
                      <BadgeCheck size={15} aria-hidden="true" />
                      {getPaymentStatusLabel(compra.status_pagamento)}
                    </span>
                    <h2>{rifa?.nome || 'Rifa removida'}</h2>
                    <p>{formatDate(compra.data_compra)}</p>
                  </div>
                  <div className="selected-list">{compra.numeros.map((numero) => `#${numero}`).join(' ')}</div>
                  <strong>{currency.format(compra.valor_total)}</strong>
                </article>
              )
            })}
          </div>
        )}
      </main>
    )
  }

  function AdminView() {
    if (!isAdmin) {
      return (
        <main className="page">
          <EmptyState title="Acesso restrito" text="Entre com uma conta administradora para acessar o painel." />
        </main>
      )
    }

    return (
      <main className="page">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Administracao</p>
            <h1>Painel de controle</h1>
          </div>
          <div className="button-row">
            <button className="outline-button" type="button" onClick={resetDemoData}>
              <RefreshCcw size={17} aria-hidden="true" />
              {isRemoteMode ? 'Recarregar' : 'Restaurar demo'}
            </button>
            <button className="primary-button" type="button" onClick={() => goTo('criar-rifa')}>
              <Plus size={17} aria-hidden="true" />
              Nova rifa
            </button>
          </div>
        </div>

        <section className="metric-grid">
          <Metric icon={Ticket} label="Total de rifas" value={dashboardStats.rifas} />
          <Metric icon={CircleDollarSign} label={isRemoteMode ? 'Receita' : 'Receita simulada'} value={currency.format(dashboardStats.totalReceita)} />
          <Metric icon={ShoppingCart} label="Numeros vendidos" value={dashboardStats.totalNumeros} />
          <Metric icon={Users} label="Clientes ativos" value={dashboardStats.compradores} />
        </section>

        <section className="table-panel">
          <div className="table-heading">
            <h2>Rifas cadastradas</h2>
            <span>{rifas.length} registros</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rifa</th>
                  <th>Preco</th>
                  <th>Vendidos</th>
                  <th>Receita</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {rifas.map((rifa) => {
                  const stats = getRifaStats(rifa, compras, numerosRifa)

                  return (
                    <tr key={rifa.id}>
                      <td>
                        <strong>{rifa.nome}</strong>
                        <span>{rifa.total_numeros} numeros</span>
                      </td>
                      <td>{currency.format(rifa.preco)}</td>
                      <td>
                        {stats.vendidos}/{rifa.total_numeros}
                      </td>
                      <td>{currency.format(stats.receita)}</td>
                      <td>
                        <span className={rifa.ativa ? 'status-pill success' : 'status-pill muted-status'}>
                          {rifa.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td>
                        <button className="outline-button small" type="button" onClick={() => toggleRifaStatus(rifa.id)}>
                          {rifa.ativa ? <X size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
                          {rifa.ativa ? 'Inativar' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    )
  }

  function CriarRifaView() {
    if (!isAdmin) {
      return (
        <main className="page">
          <EmptyState title="Acesso restrito" text="Entre como administrador para criar rifas." />
        </main>
      )
    }

    return (
      <main className="page form-page">
        <button className="back-button" type="button" onClick={() => goTo('admin')}>
          <ChevronLeft size={17} aria-hidden="true" />
          Voltar ao painel
        </button>

        <section className="form-panel wide">
          <p className="eyebrow">Nova rifa</p>
          <h1>Cadastrar premio</h1>

          <form className="form-grid" onSubmit={handleCriarRifa}>
            <label>
              Nome da rifa
              <input
                type="text"
                value={novaRifa.nome}
                onChange={(event) => setNovaRifa({ ...novaRifa, nome: event.target.value })}
                placeholder="Ex: Smartphone premium"
                required
              />
            </label>

            <label>
              Descricao do premio
              <input
                type="text"
                value={novaRifa.premio_descricao}
                onChange={(event) => setNovaRifa({ ...novaRifa, premio_descricao: event.target.value })}
                placeholder="O que sera sorteado"
                required
              />
            </label>

            <label className="span-2">
              Descricao curta
              <textarea
                value={novaRifa.descricao}
                onChange={(event) => setNovaRifa({ ...novaRifa, descricao: event.target.value })}
                placeholder="Explique regras, estado do premio e entrega"
                required
              />
            </label>

            <label>
              Preco por numero
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={novaRifa.preco}
                onChange={(event) => setNovaRifa({ ...novaRifa, preco: event.target.value })}
                placeholder="10.00"
                required
              />
            </label>

            <label>
              Total de numeros
              <input
                type="number"
                min="10"
                max="500"
                value={novaRifa.total_numeros}
                onChange={(event) => setNovaRifa({ ...novaRifa, total_numeros: event.target.value })}
                placeholder="100"
                required
              />
            </label>

            <label>
              Data de encerramento
              <input
                type="date"
                value={novaRifa.data_termino}
                onChange={(event) => setNovaRifa({ ...novaRifa, data_termino: event.target.value })}
                required
              />
            </label>

            <label>
              URL da imagem
              <input
                type="url"
                value={novaRifa.imagem}
                onChange={(event) => setNovaRifa({ ...novaRifa, imagem: event.target.value })}
                placeholder="https://..."
                required
              />
            </label>

            <div className="form-actions span-2">
              <button className="outline-button" type="button" onClick={() => goTo('admin')}>
                <X size={17} aria-hidden="true" />
                Cancelar
              </button>
              <button className="primary-button" type="submit">
                <Plus size={17} aria-hidden="true" />
                Criar rifa
              </button>
            </div>
          </form>
        </section>
      </main>
    )
  }

  function EmptyState({ title, text }) {
    return (
      <div className="empty-state">
        <Ticket size={28} aria-hidden="true" />
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Header />

      {view === 'rifas' && <RifasView />}
      {view === 'auth' && <AuthView />}
      {view === 'comprar' && <ComprarView />}
      {view === 'minhas-compras' && <MinhasComprasView />}
      {view === 'admin' && <AdminView />}
      {view === 'criar-rifa' && <CriarRifaView />}

      {message && (
        <div className="toast" role="status">
          <BadgeCheck size={17} aria-hidden="true" />
          {message}
        </div>
      )}
    </div>
  )
}
import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  Banknote,
  CalendarDays,
  Check,
  ChevronLeft,
  CircleDollarSign,
  LayoutDashboard,
  LogIn,
  LogOut,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Ticket,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { dataMode, hasSupabaseConfig, supabase } from './lib/supabaseClient'
import './App.css'

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const demoUsers = [
  {
    id: 'admin-demo',
    nome: 'Admin RifaMax',
    email: 'admin@rifamax.com',
    password: 'admin123',
    id_admin: true,
    data_criacao: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 'cliente-demo',
    nome: 'Cliente Demo',
    email: 'cliente@rifamax.com',
    password: 'cliente123',
    id_admin: false,
    data_criacao: '2026-06-02T10:00:00.000Z',
  },
]

const demoRifas = [
  {
    id: 'rifa-console',
    nome: 'Console gamer completo',
    descricao: 'Console novo com dois controles, assinatura premium e entrega nacional.',
    imagem:
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80',
    preco: 12.5,
    total_numeros: 120,
    premio_descricao: 'Console de ultima geracao com kit de jogos',
    criador_id: 'admin-demo',
    ativa: true,
    data_termino: '2026-08-15',
    data_criacao: '2026-06-11T14:00:00.000Z',
  },
  {
    id: 'rifa-smartphone',
    nome: 'Smartphone premium',
    descricao: 'Aparelho lacrado, 256 GB, garantia nacional e capa inclusa.',
    imagem:
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1200&q=80',
    preco: 9,
    total_numeros: 100,
    premio_descricao: 'Smartphone premium 256 GB',
    criador_id: 'admin-demo',
    ativa: true,
    data_termino: '2026-07-28',
    data_criacao: '2026-06-10T14:00:00.000Z',
  },
  {
    id: 'rifa-sneaker',
    nome: 'Sneaker colecionavel',
    descricao: 'Modelo exclusivo para quem curte estilo, conforto e sorteio rapido.',
    imagem:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
    preco: 6,
    total_numeros: 80,
    premio_descricao: 'Sneaker original no tamanho escolhido',
    criador_id: 'admin-demo',
    ativa: true,
    data_termino: '2026-07-12',
    data_criacao: '2026-06-09T14:00:00.000Z',
  },
]

const demoCompras = [
  {
    id: 'compra-001',
    rifa_id: 'rifa-console',
    comprador_id: 'cliente-demo',
    comprador_nome: 'Cliente Demo',
    numeros: [3, 14, 27, 88],
    valor_total: 50,
    quantidade_numeros: 4,
    status_pagamento: 'confirmado',
    metodo_pagamento: 'simulado',
    data_compra: '2026-06-18T12:20:00.000Z',
  },
  {
    id: 'compra-002',
    rifa_id: 'rifa-smartphone',
    comprador_id: 'cliente-demo',
    comprador_nome: 'Cliente Demo',
    numeros: [6, 19, 41],
    valor_total: 27,
    quantidade_numeros: 3,
    status_pagamento: 'confirmado',
    metodo_pagamento: 'simulado',
    data_compra: '2026-06-19T09:40:00.000Z',
  },
  {
    id: 'compra-003',
    rifa_id: 'rifa-sneaker',
    comprador_id: 'admin-demo',
    comprador_nome: 'Admin RifaMax',
    numeros: [4, 8, 12, 24, 48],
    valor_total: 30,
    quantidade_numeros: 5,
    status_pagamento: 'confirmado',
    metodo_pagamento: 'simulado',
    data_compra: '2026-06-20T16:10:00.000Z',
  },
]

const emptyRifa = {
  nome: '',
  descricao: '',
  imagem: '',
  preco: '',
  total_numeros: '',
  data_termino: '',
  premio_descricao: '',
}

function buildDemoNumerosRifa() {
  const vendidos = new Set(demoCompras.flatMap((compra) => compra.numeros.map((numero) => `${compra.rifa_id}:${numero}`)))

  return demoRifas.flatMap((rifa) =>
    Array.from({ length: rifa.total_numeros }, (_, index) => {
      const numero = index + 1

      return {
        id: `${rifa.id}-${numero}`,
        rifa_id: rifa.id,
        numero,
        vendido: vendidos.has(`${rifa.id}:${numero}`),
      }
    }),
  )
}

function createId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? JSON.parse(saved) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue]
}

function isBlockingPurchase(compra) {
  return !['falha', 'reembolso', 'cancelado'].includes(normalizePaymentStatus(compra.status_pagamento))
}

function getSoldNumbers(compras, rifaId, numerosRifa = []) {
  return new Set(
    [
      ...compras
      .filter((compra) => compra.rifa_id === rifaId && isBlockingPurchase(compra))
      .flatMap((compra) => compra.numeros),
      ...numerosRifa
        .filter((numero) => numero.rifa_id === rifaId && numero.vendido)
        .map((numero) => numero.numero),
    ],
  )
}

function getRifaStats(rifa, compras, numerosRifa = []) {
  const soldNumbers = getSoldNumbers(compras, rifa.id, numerosRifa)
  const vendidos = soldNumbers.size
  const disponiveis = Math.max(rifa.total_numeros - vendidos, 0)
  const percentual = rifa.total_numeros > 0 ? Math.round((vendidos / rifa.total_numeros) * 100) : 0
  const receita = [...soldNumbers].length * rifa.preco

  return { vendidos, disponiveis, percentual, receita }
}

function formatDate(value) {
  if (!value) return 'Sem data'

  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value))
}

function normalizePaymentStatus(status) {
  const value = String(status || '').toLowerCase()

  if (['approved', 'success', 'confirmado'].includes(value)) return 'confirmado'
  if (['pending', 'in_process', 'in_mediation', 'pendente'].includes(value)) return 'pendente'
  if (['rejected', 'cancelled', 'failure', 'falha'].includes(value)) return 'falha'
  return value || 'pendente'
}

function getPaymentStatusLabel(status) {
  const normalized = normalizePaymentStatus(status)

  if (normalized === 'confirmado') return 'Confirmado'
  if (normalized === 'falha') return 'Falhou'
  return 'Pendente'
}

function sortNumbers(numbers) {
  return [...numbers].sort((a, b) => a - b)
}

export default function App() {
  const isRemoteMode = hasSupabaseConfig && Boolean(supabase)
  const [usuarios, setUsuarios] = usePersistentState('rifamax:usuarios', demoUsers)
  const [rifas, setRifas] = usePersistentState('rifamax:rifas', demoRifas)
  const [compras, setCompras] = usePersistentState('rifamax:compras', demoCompras)
  const [numerosRifa, setNumerosRifa] = usePersistentState('rifamax:numeros', buildDemoNumerosRifa())
  const [currentUserId, setCurrentUserId] = usePersistentState('rifamax:sessao', '')
  const [view, setView] = useState('rifas')
  const [selectedRifaId, setSelectedRifaId] = useState(demoRifas[0].id)
  const [selectedNumbers, setSelectedNumbers] = useState([])
  const [search, setSearch] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registroForm, setRegistroForm] = useState({ nome: '', email: '', password: '', confirm: '' })
  const [novaRifa, setNovaRifa] = useState(emptyRifa)
  const [message, setMessage] = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [remoteLoading, setRemoteLoading] = useState(false)

  const user = useMemo(
    () => usuarios.find((usuario) => usuario.id === currentUserId) || null,
    [currentUserId, usuarios],
  )

  const isAdmin = Boolean(user?.id_admin)
  const selectedRifa = rifas.find((rifa) => rifa.id === selectedRifaId) || rifas[0]

  const visibleRifas = useMemo(() => {
    const term = search.trim().toLowerCase()

    return rifas
      .filter((rifa) => rifa.ativa)
      .filter((rifa) => {
        if (!term) return true
        return [rifa.nome, rifa.descricao, rifa.premio_descricao].some((value) =>
          value.toLowerCase().includes(term),
        )
      })
  }, [rifas, search])

  const minhasCompras = useMemo(() => {
    if (!user) return []
    return compras
      .filter((compra) => compra.comprador_id === user.id)
      .sort((a, b) => new Date(b.data_compra) - new Date(a.data_compra))
  }, [compras, user])

  const dashboardStats = useMemo(() => {
    const totalReceita = compras.reduce((sum, compra) => sum + compra.valor_total, 0)
    const totalNumeros = rifas.reduce(
      (sum, rifa) => sum + getSoldNumbers(compras, rifa.id, numerosRifa).size,
      0,
    )
    const compradores = new Set(compras.map((compra) => compra.comprador_id)).size

    return {
      rifas: rifas.length,
      ativas: rifas.filter((rifa) => rifa.ativa).length,
      totalReceita,
      totalNumeros,
      compradores,
    }
  }, [compras, numerosRifa, rifas])

  useEffect(() => {
    if (!message) return undefined

    const timeout = window.setTimeout(() => setMessage(''), 3500)
    return () => window.clearTimeout(timeout)
  }, [message])

  useEffect(() => {
    setSelectedNumbers([])
  }, [selectedRifaId])

  useEffect(() => {
    if (!isRemoteMode) return undefined

    let active = true

    async function bootstrapRemoteData() {
      setRemoteLoading(true)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const profile = session?.user ? await applyRemoteUser(session.user) : null

        if (!session?.user) {
          setUsuarios([])
          setCurrentUserId('')
          setCompras([])
        }

        if (active) {
          await carregarDadosRemotos(profile)
        }
      } catch (error) {
        notify(error.message || 'Erro ao carregar dados do Supabase.')
      } finally {
        if (active) setRemoteLoading(false)
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return

      const profile = session?.user ? await applyRemoteUser(session.user) : null

      if (!session?.user) {
        setUsuarios([])
        setCurrentUserId('')
        setCompras([])
      }

      await carregarDadosRemotos(profile)
    })

    bootstrapRemoteData()

    return () => {
      active = false
      subscription.unsubscribe()
    }
    // Dados remotos devem ser inicializados apenas quando o modo Supabase muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRemoteMode])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const externalReference = params.get('external_reference')
    const rawStatus = params.get('status') || params.get('collection_status') || params.get('payment')
    const paymentId = params.get('payment_id') || params.get('collection_id')

    if (!externalReference || !rawStatus) return

    async function syncPaymentReturn() {
      let nextStatus = normalizePaymentStatus(rawStatus)

      if (isRemoteMode && paymentId) {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.access_token) {
          const response = await fetch('/api/mercadopago/sync-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              externalReference,
              paymentId,
              supabaseAccessToken: session.access_token,
            }),
          })

          const result = await response.json().catch(() => ({}))

          if (response.ok && result.status_pagamento) {
            nextStatus = result.status_pagamento
          }
        }
      }

      setCompras((current) =>
        current.map((compra) =>
          compra.external_reference === externalReference
            ? {
                ...compra,
                id_transacao_mp: paymentId || compra.id_transacao_mp,
                status_pagamento: nextStatus,
              }
            : compra,
        ),
      )

      await carregarDadosRemotos()
      goTo('minhas-compras')
      notify(
        nextStatus === 'confirmado'
          ? 'Pagamento aprovado pelo Mercado Pago.'
          : 'Recebemos o retorno do Mercado Pago. A compra esta pendente ou precisa de revisao.',
      )
      window.history.replaceState({}, '', window.location.pathname)
    }

    syncPaymentReturn().catch((error) => {
      notify(error.message || 'Nao foi possivel sincronizar o pagamento.')
    })
    // Sincronizacao acontece somente quando a URL de retorno muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCompras])

  function notify(text) {
    setMessage(text)
  }

  function goTo(nextView) {
    setView(nextView)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function mapRemoteProfile(row, authUser) {
    return {
      id: authUser.id,
      perfil_id: row?.id,
      id_usuario: authUser.id,
      nome: row?.nome || authUser.user_metadata?.nome || authUser.email,
      email: row?.email || authUser.email,
      id_admin: Boolean(row?.id_admin),
      data_criacao: row?.data_criacao || authUser.created_at,
    }
  }

  function mapRemoteCompra(row) {
    return {
      id: row.id,
      rifa_id: row.rifa_id,
      comprador_id: row.comprador_id,
      comprador_nome: row.usuarios?.nome || row.comprador_nome || 'Cliente',
      numeros: sortNumbers((row.compra_numeros || []).map((item) => item.numero)),
      valor_total: Number(row.valor_total || 0),
      quantidade_numeros: row.quantidade_numeros,
      status_pagamento: row.status_pagamento,
      metodo_pagamento: row.metodo_pagamento,
      external_reference: row.referencia_externa,
      preference_id: row.preference_id,
      id_transacao_mp: row.id_transacao_mp,
      data_compra: row.data_compra,
    }
  }

  async function applyRemoteUser(authUser) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id_usuario', authUser.id)
      .maybeSingle()

    if (error) throw error

    let profile = data

    if (!profile) {
      const { data: inserted, error: insertError } = await supabase
        .from('usuarios')
        .insert({
          id_usuario: authUser.id,
          nome: authUser.user_metadata?.nome || authUser.email,
          email: authUser.email,
        })
        .select('*')
        .single()

      if (insertError) throw insertError
      profile = inserted
    }

    const mappedProfile = mapRemoteProfile(profile, authUser)

    setUsuarios([mappedProfile])
    setCurrentUserId(authUser.id)

    return mappedProfile
  }

  async function carregarDadosRemotos(profile = user) {
    if (!isRemoteMode) return

    const { data: rifasData, error: rifasError } = await supabase
      .from('rifas')
      .select('*')
      .order('data_criacao', { ascending: false })

    if (rifasError) throw rifasError

    const { data: numerosData, error: numerosError } = await supabase
      .from('numeros_rifa')
      .select('id, rifa_id, numero, vendido, comprador_id, data_venda')
      .order('numero', { ascending: true })

    if (numerosError) throw numerosError

    setRifas((rifasData || []).map((rifa) => ({ ...rifa, preco: Number(rifa.preco) })))
    setNumerosRifa(numerosData || [])

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      setCompras([])
      return
    }

    let comprasQuery = supabase
      .from('compras')
      .select('*, compra_numeros(numero)')
      .order('data_compra', { ascending: false })

    if (!profile?.id_admin) {
      comprasQuery = comprasQuery.eq('comprador_id', authUser.id)
    }

    const { data: comprasData, error: comprasError } = await comprasQuery

    if (comprasError) throw comprasError

    setCompras((comprasData || []).map(mapRemoteCompra))
  }

  async function loginAs(email, password) {
    if (isRemoteMode) {
      notify('Os acessos demo ficam desativados no modo publico. Use uma conta real.')
      return false
    }

    const match = usuarios.find(
      (usuario) => usuario.email === normalizeEmail(email) && usuario.password === password,
    )

    if (!match) {
      notify('Email ou senha invalidos.')
      return false
    }

    setCurrentUserId(match.id)
    setLoginForm({ email: '', password: '' })
    goTo('rifas')
    notify(`Bem-vindo, ${match.nome}.`)
    return true
  }

  async function handleLogin(event) {
    event.preventDefault()

    if (!isRemoteMode) {
      await loginAs(loginForm.email, loginForm.password)
      return
    }

    try {
      setRemoteLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizeEmail(loginForm.email),
        password: loginForm.password,
      })

      if (error) throw error

      const profile = await applyRemoteUser(data.user)
      await carregarDadosRemotos(profile)
      setLoginForm({ email: '', password: '' })
      goTo('rifas')
      notify(`Bem-vindo, ${profile.nome}.`)
    } catch (error) {
      notify(error.message || 'Erro ao fazer login.')
    } finally {
      setRemoteLoading(false)
    }
  }

  async function handleRegistro(event) {
    event.preventDefault()

    const email = normalizeEmail(registroForm.email)
    if (registroForm.password !== registroForm.confirm) {
      notify('As senhas nao coincidem.')
      return
    }

    if (isRemoteMode) {
      try {
        setRemoteLoading(true)
        const { data, error } = await supabase.auth.signUp({
          email,
          password: registroForm.password,
          options: {
            data: {
              nome: registroForm.nome.trim(),
            },
          },
        })

        if (error) throw error

        if (data.session?.user) {
          const profile = await applyRemoteUser(data.session.user)
          await carregarDadosRemotos(profile)
          setRegistroForm({ nome: '', email: '', password: '', confirm: '' })
          goTo('rifas')
          notify('Conta criada. Voce ja pode comprar numeros.')
        } else {
          setAuthMode('login')
          notify('Cadastro criado. Confira seu email e depois faca login.')
        }
      } catch (error) {
        notify(error.message || 'Erro ao criar conta.')
      } finally {
        setRemoteLoading(false)
      }

      return
    }

    if (usuarios.some((usuario) => usuario.email === email)) {
      notify('Este email ja esta cadastrado.')
      return
    }

    const novoUsuario = {
      id: createId('usuario'),
      nome: registroForm.nome.trim(),
      email,
      password: registroForm.password,
      id_admin: false,
      data_criacao: new Date().toISOString(),
    }

    setUsuarios((current) => [...current, novoUsuario])
    setCurrentUserId(novoUsuario.id)
    setRegistroForm({ nome: '', email: '', password: '', confirm: '' })
    goTo('rifas')
    notify('Conta criada. Voce ja pode comprar numeros.')
  }

  async function logout() {
    if (isRemoteMode) {
      await supabase.auth.signOut()
      setUsuarios([])
      setCompras([])
    }

    setCurrentUserId('')
    goTo('rifas')
    notify('Sessao encerrada.')
  }

  function openCompra(rifaId) {
    if (!user) {
      setAuthMode('login')
      goTo('auth')
      notify('Entre ou crie uma conta para comprar numeros.')
      return
    }

    setSelectedRifaId(rifaId)
    goTo('comprar')
  }

  function toggleNumero(numero) {
    if (!selectedRifa) return

    const vendidos = getSoldNumbers(compras, selectedRifa.id, numerosRifa)
    if (vendidos.has(numero)) return

    setSelectedNumbers((current) =>
      current.includes(numero)
        ? current.filter((item) => item !== numero)
        : sortNumbers([...current, numero]),
    )
  }

  async function confirmarCompra() {
    if (!user) {
      setAuthMode('login')
      goTo('auth')
      notify('Entre para finalizar a compra.')
      return
    }

    if (!selectedRifa || selectedNumbers.length === 0) {
      notify('Selecione pelo menos um numero.')
      return
    }

    const vendidos = getSoldNumbers(compras, selectedRifa.id, numerosRifa)
    const conflitos = selectedNumbers.filter((numero) => vendidos.has(numero))
    if (conflitos.length > 0) {
      setSelectedNumbers((current) => current.filter((numero) => !vendidos.has(numero)))
      notify(`Os numeros ${conflitos.join(', ')} acabaram de ser vendidos.`)
      return
    }

    const numeros = sortNumbers(selectedNumbers)
    const valorTotal = Number((numeros.length * selectedRifa.preco).toFixed(2))
    const externalReference = createId('mp')

    setPaymentLoading(true)

    try {
      const response = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buyerEmail: user.email,
          buyerName: user.nome,
          externalReference,
          numeros,
          premioDescricao: selectedRifa.premio_descricao,
          rifaId: selectedRifa.id,
          rifaNome: selectedRifa.nome,
          unitPrice: selectedRifa.preco,
        }),
      })

      const rawResponse = await response.text()
      let preference = {}

      try {
        preference = rawResponse ? JSON.parse(rawResponse) : {}
      } catch {
        preference = { error: rawResponse || 'Resposta invalida do servidor de pagamento.' }
      }

      if (!response.ok) {
        throw new Error(preference.error || 'Nao foi possivel iniciar o pagamento.')
      }

      if (!preference.init_point) {
        throw new Error('O Mercado Pago nao retornou o link de checkout.')
      }

      const novaCompra = {
        id: createId('compra'),
        rifa_id: selectedRifa.id,
        comprador_id: user.id,
        comprador_nome: user.nome,
        numeros,
        valor_total: valorTotal,
        quantidade_numeros: numeros.length,
        status_pagamento: 'pendente',
        metodo_pagamento: 'mercado_pago',
        external_reference: externalReference,
        preference_id: preference.id,
        data_compra: new Date().toISOString(),
      }

      if (isRemoteMode) {
        const { data: compra, error: compraError } = await supabase
          .from('compras')
          .insert({
            rifa_id: selectedRifa.id,
            comprador_id: user.id,
            valor_total: valorTotal,
            quantidade_numeros: numeros.length,
            status_pagamento: 'pendente',
            metodo_pagamento: 'mercado_pago',
            referencia_externa: externalReference,
          })
          .select('*')
          .single()

        if (compraError) throw compraError

        const { error: numerosCompraError } = await supabase.from('compra_numeros').insert(
          numeros.map((numero) => ({
            compra_id: compra.id,
            rifa_id: selectedRifa.id,
            numero,
          })),
        )

        if (numerosCompraError) throw numerosCompraError

        const { error: reservaError } = await supabase
          .from('numeros_rifa')
          .update({
            vendido: true,
            comprador_id: user.id,
            data_venda: new Date().toISOString(),
          })
          .eq('rifa_id', selectedRifa.id)
          .in('numero', numeros)

        if (reservaError) throw reservaError

        novaCompra.id = compra.id
      }

      setCompras((current) => [novaCompra, ...current])
      setNumerosRifa((current) =>
        current.map((item) =>
          item.rifa_id === selectedRifa.id && numeros.includes(item.numero)
            ? { ...item, vendido: true, comprador_id: user.id }
            : item,
        ),
      )
      setSelectedNumbers([])
      window.location.href = preference.init_point
    } catch (error) {
      notify(error.message || 'Erro ao iniciar pagamento no Mercado Pago.')
    } finally {
      setPaymentLoading(false)
    }
  }

  async function handleCriarRifa(event) {
    event.preventDefault()

    if (!isAdmin) {
      notify('Apenas administradores podem criar rifas.')
      return
    }

    const preco = Number(novaRifa.preco)
    const totalNumeros = Number.parseInt(novaRifa.total_numeros, 10)

    if (!Number.isFinite(preco) || preco <= 0) {
      notify('Informe um preco valido.')
      return
    }

    if (!Number.isInteger(totalNumeros) || totalNumeros < 10 || totalNumeros > 500) {
      notify('Use entre 10 e 500 numeros para manter a grade legivel.')
      return
    }

    const rifaPayload = {
      nome: novaRifa.nome.trim(),
      descricao: novaRifa.descricao.trim(),
      imagem: novaRifa.imagem.trim(),
      preco,
      total_numeros: totalNumeros,
      premio_descricao: novaRifa.premio_descricao.trim(),
      criador_id: user.id,
      ativa: true,
      data_termino: novaRifa.data_termino,
    }

    try {
      if (isRemoteMode) {
        setRemoteLoading(true)

        const { data: rifa, error } = await supabase
          .from('rifas')
          .insert(rifaPayload)
          .select('*')
          .single()

        if (error) throw error

        const numeros = Array.from({ length: totalNumeros }, (_, index) => ({
          rifa_id: rifa.id,
          numero: index + 1,
          vendido: false,
        }))

        const { error: numerosError } = await supabase.from('numeros_rifa').insert(numeros)

        if (numerosError) throw numerosError

        await carregarDadosRemotos(user)
      } else {
        const rifa = {
          ...rifaPayload,
          id: createId('rifa'),
          data_criacao: new Date().toISOString(),
        }

        setRifas((current) => [rifa, ...current])
        setNumerosRifa((current) => [
          ...Array.from({ length: totalNumeros }, (_, index) => ({
            id: `${rifa.id}-${index + 1}`,
            rifa_id: rifa.id,
            numero: index + 1,
            vendido: false,
          })),
          ...current,
        ])
      }

      setNovaRifa(emptyRifa)
      goTo('admin')
      notify('Rifa criada com sucesso.')
    } catch (error) {
      notify(error.message || 'Erro ao criar rifa.')
    } finally {
      setRemoteLoading(false)
    }
  }

  async function toggleRifaStatus(rifaId) {
    if (isRemoteMode) {
      const rifaAtual = rifas.find((rifa) => rifa.id === rifaId)
      if (!rifaAtual) return

      const { error } = await supabase.from('rifas').update({ ativa: !rifaAtual.ativa }).eq('id', rifaId)

      if (error) {
        notify(error.message || 'Erro ao atualizar rifa.')
        return
      }

      await carregarDadosRemotos(user)
      return
    }

    setRifas((current) =>
      current.map((rifa) => (rifa.id === rifaId ? { ...rifa, ativa: !rifa.ativa } : rifa)),
    )
  }

  function resetDemoData() {
    if (isRemoteMode) {
      carregarDadosRemotos(user)
      notify('Dados recarregados do Supabase.')
      return
    }

    setUsuarios(demoUsers)
    setRifas(demoRifas)
    setCompras(demoCompras)
    setNumerosRifa(buildDemoNumerosRifa())
    setCurrentUserId('')
    setSelectedRifaId(demoRifas[0].id)
    setSelectedNumbers([])
    goTo('rifas')
    notify('Dados de demonstracao restaurados.')
  }

  function Header() {
    return (
      <header className="topbar">
        <button className="brand" type="button" onClick={() => goTo('rifas')}>
          <span className="brand-mark">
            <Ticket size={22} aria-hidden="true" />
          </span>
          <span>
            <strong>RifaMax</strong>
            <small>{dataMode === 'configured' ? 'Online com Supabase' : 'Demo local'}</small>
          </span>
        </button>

        <nav className="nav-actions" aria-label="Navegacao principal">
          <button className="ghost-button" type="button" onClick={() => goTo('rifas')}>
            <Ticket size={17} aria-hidden="true" />
            Rifas
          </button>

          {user && (
            <button className="ghost-button" type="button" onClick={() => goTo('minhas-compras')}>
              <ShoppingCart size={17} aria-hidden="true" />
              Compras
            </button>
          )}

          {isAdmin && (
            <button className="ghost-button" type="button" onClick={() => goTo('admin')}>
              <LayoutDashboard size={17} aria-hidden="true" />
              Admin
            </button>
          )}

          {user ? (
            <button className="outline-button" type="button" onClick={logout}>
              <LogOut size={17} aria-hidden="true" />
              Sair
            </button>
          ) : (
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setAuthMode('login')
                goTo('auth')
              }}
            >
              <LogIn size={17} aria-hidden="true" />
              Entrar
            </button>
          )}
        </nav>
      </header>
    )
  }

  function RifasView() {
    return (
      <main className="page">
        <section className="overview-band">
          <div>
            <p className="eyebrow">Plataforma de rifas online</p>
            <h1>Escolha seus numeros e acompanhe tudo em tempo real.</h1>
            <p className="lead">
              {isRemoteMode
                ? 'Rifas, usuarios, numeros reservados e compras agora usam o banco real.'
                : 'O fluxo esta pronto para demonstracao: login, cadastro, painel admin, criacao de rifas, selecao de numeros e historico de compras.'}
            </p>
          </div>

          <div className="quick-panel" aria-label="Acessos rapidos">
            <div className="user-chip">
              <Users size={18} aria-hidden="true" />
              {user ? user.nome : 'Visitante'}
            </div>
            {isRemoteMode ? (
              <button className="outline-button" type="button" onClick={() => goTo(user ? 'minhas-compras' : 'auth')}>
                <ShieldCheck size={17} aria-hidden="true" />
                {user ? 'Minha conta' : 'Entrar agora'}
              </button>
            ) : (
              <>
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => loginAs('cliente@rifamax.com', 'cliente123')}
                >
                  <LogIn size={17} aria-hidden="true" />
                  Cliente demo
                </button>
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => loginAs('admin@rifamax.com', 'admin123')}
                >
                  <ShieldCheck size={17} aria-hidden="true" />
                  Admin demo
                </button>
              </>
            )}
          </div>
        </section>

        <section className="metric-grid" aria-label="Resumo">
          <Metric icon={Ticket} label="Rifas ativas" value={dashboardStats.ativas} />
          <Metric icon={ShoppingCart} label="Numeros vendidos" value={dashboardStats.totalNumeros} />
          <Metric icon={Banknote} label={isRemoteMode ? 'Faturamento' : 'Faturamento demo'} value={currency.format(dashboardStats.totalReceita)} />
          <Metric icon={Users} label="Compradores" value={dashboardStats.compradores} />
        </section>

        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Disponiveis agora</p>
              <h2>Rifas em destaque</h2>
            </div>

            <label className="search-box">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar rifa"
              />
            </label>
          </div>

          {visibleRifas.length === 0 ? (
            <EmptyState
              title="Nenhuma rifa encontrada"
              text="Limpe a busca ou crie uma nova rifa no painel administrativo."
            />
          ) : (
            <div className="raffle-grid">
              {visibleRifas.map((rifa) => (
                <RifaCard key={rifa.id} rifa={rifa} />
              ))}
            </div>
          )}
        </section>
      </main>
    )
  }

  function Metric({ icon: Icon, label, value }) {
    return (
      <article className="metric-card">
        <Icon size={20} aria-hidden="true" />
        <span>{label}</span>
        <strong>{value}</strong>
      </article>
    )
  }

  function RifaCard({ rifa }) {
    const stats = getRifaStats(rifa, compras, numerosRifa)

    return (
      <article className="raffle-card">
        <img src={rifa.imagem} alt={rifa.nome} />
        <div className="raffle-content">
          <div className="raffle-title-row">
            <h3>{rifa.nome}</h3>
            <span className="price-pill">{currency.format(rifa.preco)}</span>
          </div>
          <p>{rifa.descricao}</p>

          <div className="prize-line">
            <Trophy size={17} aria-hidden="true" />
            <span>{rifa.premio_descricao}</span>
          </div>

          <div className="progress-row">
            <div className="progress-copy">
              <span>{stats.vendidos} vendidos</span>
              <strong>{stats.percentual}%</strong>
            </div>
            <div className="progress-track" aria-hidden="true">
              <span style={{ width: `${stats.percentual}%` }} />
            </div>
          </div>

          <div className="card-footer">
            <span className="date-chip">
              <CalendarDays size={15} aria-hidden="true" />
              {formatDate(rifa.data_termino)}
            </span>
            <button className="primary-button" type="button" onClick={() => openCompra(rifa.id)}>
              <ShoppingCart size={17} aria-hidden="true" />
              Comprar
            </button>
          </div>
        </div>
      </article>
    )
  }

  function AuthView() {
    return (
      <main className="page auth-page">
        <section className="auth-copy">
          <p className="eyebrow">Acesso</p>
          <h1>{authMode === 'login' ? 'Entre para comprar numeros.' : 'Crie sua conta em segundos.'}</h1>
          <p className="lead">
            {isRemoteMode
              ? 'Entre com seu email e senha para comprar numeros e acompanhar pagamentos.'
              : 'Use os acessos de demonstracao para testar o painel completo sem configurar o Supabase.'}
          </p>

          {!isRemoteMode && <div className="demo-login-row">
            <button
              className="outline-button"
              type="button"
              onClick={() => loginAs('cliente@rifamax.com', 'cliente123')}
            >
              <Users size={17} aria-hidden="true" />
              Cliente demo
            </button>
            <button
              className="outline-button"
              type="button"
              onClick={() => loginAs('admin@rifamax.com', 'admin123')}
            >
              <ShieldCheck size={17} aria-hidden="true" />
              Admin demo
            </button>
          </div>}
        </section>

        <section className="form-panel">
          <div className="segmented">
            <button
              type="button"
              className={authMode === 'login' ? 'active' : ''}
              onClick={() => setAuthMode('login')}
            >
              <LogIn size={16} aria-hidden="true" />
              Entrar
            </button>
            <button
              type="button"
              className={authMode === 'registro' ? 'active' : ''}
              onClick={() => setAuthMode('registro')}
            >
              <UserPlus size={16} aria-hidden="true" />
              Cadastro
            </button>
          </div>

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="form-stack">
              <label>
                Email
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                  placeholder="voce@email.com"
                  required
                />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                  placeholder="Sua senha"
                  required
                />
              </label>
              <button className="primary-button full" type="submit">
                <LogIn size={17} aria-hidden="true" />
                {remoteLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegistro} className="form-stack">
              <label>
                Nome completo
                <input
                  type="text"
                  value={registroForm.nome}
                  onChange={(event) => setRegistroForm({ ...registroForm, nome: event.target.value })}
                  placeholder="Seu nome"
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={registroForm.email}
                  onChange={(event) => setRegistroForm({ ...registroForm, email: event.target.value })}
                  placeholder="voce@email.com"
                  required
                />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  value={registroForm.password}
                  onChange={(event) => setRegistroForm({ ...registroForm, password: event.target.value })}
                  placeholder="Minimo recomendado: 6 caracteres"
                  required
                />
              </label>
              <label>
                Confirmar senha
                <input
                  type="password"
                  value={registroForm.confirm}
                  onChange={(event) => setRegistroForm({ ...registroForm, confirm: event.target.value })}
                  placeholder="Repita a senha"
                  required
                />
              </label>
              <button className="primary-button full" type="submit">
                <UserPlus size={17} aria-hidden="true" />
                {remoteLoading ? 'Criando...' : 'Criar conta'}
              </button>
            </form>
          )}
        </section>
      </main>
    )
  }

  function ComprarView() {
    if (!selectedRifa) {
      return (
        <main className="page">
          <EmptyState title="Rifa nao encontrada" text="Volte para a lista e escolha uma rifa ativa." />
        </main>
      )
    }

    const stats = getRifaStats(selectedRifa, compras, numerosRifa)
    const vendidos = getSoldNumbers(compras, selectedRifa.id, numerosRifa)
    const total = selectedNumbers.length * selectedRifa.preco

    return (
      <main className="page">
        <button className="back-button" type="button" onClick={() => goTo('rifas')}>
          <ChevronLeft size={17} aria-hidden="true" />
          Voltar para rifas
        </button>

        <section className="purchase-layout">
          <div className="number-panel">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Comprar numeros</p>
                <h1>{selectedRifa.nome}</h1>
                <p className="lead">{selectedRifa.premio_descricao}</p>
              </div>
              <span className="price-pill large">{currency.format(selectedRifa.preco)} cada</span>
            </div>

            <div className="number-legend" aria-label="Legenda">
              <span>
                <i className="legend-free" />
                Disponivel
              </span>
              <span>
                <i className="legend-selected" />
                Selecionado
              </span>
              <span>
                <i className="legend-sold" />
                Vendido
              </span>
            </div>

            <div className="number-grid">
              {Array.from({ length: selectedRifa.total_numeros }, (_, index) => {
                const numero = index + 1
                const isSold = vendidos.has(numero)
                const isSelected = selectedNumbers.includes(numero)

                return (
                  <button
                    key={numero}
                    type="button"
                    className={`number-button ${isSold ? 'sold' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleNumero(numero)}
                    disabled={isSold}
                    title={isSold ? `Numero ${numero} vendido` : `Selecionar numero ${numero}`}
                    aria-pressed={isSelected}
                  >
                    {numero}
                  </button>
                )
              })}
            </div>
          </div>

          <aside className="summary-panel">
            <img src={selectedRifa.imagem} alt="" />
            <h2>Resumo</h2>
            <dl className="summary-list">
              <div>
                <dt>Selecionados</dt>
                <dd>{selectedNumbers.length}</dd>
              </div>
              <div>
                <dt>Disponiveis</dt>
                <dd>{stats.disponiveis}</dd>
              </div>
              <div>
                <dt>Subtotal</dt>
                <dd>{currency.format(total)}</dd>
              </div>
            </dl>

            {selectedNumbers.length > 0 ? (
              <div className="selected-list">{selectedNumbers.map((numero) => `#${numero}`).join(' ')}</div>
            ) : (
              <p className="muted">Escolha um ou mais numeros para liberar a finalizacao.</p>
            )}

            <button
              className="primary-button full"
              type="button"
              onClick={confirmarCompra}
              disabled={selectedNumbers.length === 0 || paymentLoading}
            >
              <CircleDollarSign size={17} aria-hidden="true" />
              {paymentLoading ? 'Criando pagamento...' : 'Pagar com Mercado Pago'}
            </button>
          </aside>
        </section>
      </main>
    )
  }

  function MinhasComprasView() {
    return (
      <main className="page">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Historico</p>
            <h1>Minhas compras</h1>
          </div>
          <button className="outline-button" type="button" onClick={() => goTo('rifas')}>
            <Ticket size={17} aria-hidden="true" />
            Ver rifas
          </button>
        </div>

        {!user ? (
          <EmptyState title="Voce ainda nao entrou" text="Faca login para consultar suas compras." />
        ) : minhasCompras.length === 0 ? (
          <EmptyState title="Nenhuma compra por enquanto" text="Escolha uma rifa e selecione seus numeros." />
        ) : (
          <div className="purchase-list">
            {minhasCompras.map((compra) => {
              const rifa = rifas.find((item) => item.id === compra.rifa_id)

              return (
                <article className="purchase-card" key={compra.id}>
                  <div>
                    <span className={`status-pill ${normalizePaymentStatus(compra.status_pagamento)}`}>
                      <BadgeCheck size={15} aria-hidden="true" />
                      {getPaymentStatusLabel(compra.status_pagamento)}
                    </span>
                    <h2>{rifa?.nome || 'Rifa removida'}</h2>
                    <p>{formatDate(compra.data_compra)}</p>
                  </div>
                  <div className="selected-list">{compra.numeros.map((numero) => `#${numero}`).join(' ')}</div>
                  <strong>{currency.format(compra.valor_total)}</strong>
                </article>
              )
            })}
          </div>
        )}
      </main>
    )
  }

  function AdminView() {
    if (!isAdmin) {
      return (
        <main className="page">
          <EmptyState title="Acesso restrito" text="Entre com uma conta administradora para acessar o painel." />
        </main>
      )
    }

    return (
      <main className="page">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Administracao</p>
            <h1>Painel de controle</h1>
          </div>
          <div className="button-row">
            <button className="outline-button" type="button" onClick={resetDemoData}>
              <RefreshCcw size={17} aria-hidden="true" />
              {isRemoteMode ? 'Recarregar' : 'Restaurar demo'}
            </button>
            <button className="primary-button" type="button" onClick={() => goTo('criar-rifa')}>
              <Plus size={17} aria-hidden="true" />
              Nova rifa
            </button>
          </div>
        </div>

        <section className="metric-grid">
          <Metric icon={Ticket} label="Total de rifas" value={dashboardStats.rifas} />
          <Metric icon={CircleDollarSign} label={isRemoteMode ? 'Receita' : 'Receita simulada'} value={currency.format(dashboardStats.totalReceita)} />
          <Metric icon={ShoppingCart} label="Numeros vendidos" value={dashboardStats.totalNumeros} />
          <Metric icon={Users} label="Clientes ativos" value={dashboardStats.compradores} />
        </section>

        <section className="table-panel">
          <div className="table-heading">
            <h2>Rifas cadastradas</h2>
            <span>{rifas.length} registros</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rifa</th>
                  <th>Preco</th>
                  <th>Vendidos</th>
                  <th>Receita</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {rifas.map((rifa) => {
                  const stats = getRifaStats(rifa, compras, numerosRifa)

                  return (
                    <tr key={rifa.id}>
                      <td>
                        <strong>{rifa.nome}</strong>
                        <span>{rifa.total_numeros} numeros</span>
                      </td>
                      <td>{currency.format(rifa.preco)}</td>
                      <td>
                        {stats.vendidos}/{rifa.total_numeros}
                      </td>
                      <td>{currency.format(stats.receita)}</td>
                      <td>
                        <span className={rifa.ativa ? 'status-pill success' : 'status-pill muted-status'}>
                          {rifa.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td>
                        <button className="outline-button small" type="button" onClick={() => toggleRifaStatus(rifa.id)}>
                          {rifa.ativa ? <X size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
                          {rifa.ativa ? 'Inativar' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    )
  }

  function CriarRifaView() {
    if (!isAdmin) {
      return (
        <main className="page">
          <EmptyState title="Acesso restrito" text="Entre como administrador para criar rifas." />
        </main>
      )
    }

    return (
      <main className="page form-page">
        <button className="back-button" type="button" onClick={() => goTo('admin')}>
          <ChevronLeft size={17} aria-hidden="true" />
          Voltar ao painel
        </button>

        <section className="form-panel wide">
          <p className="eyebrow">Nova rifa</p>
          <h1>Cadastrar premio</h1>

          <form className="form-grid" onSubmit={handleCriarRifa}>
            <label>
              Nome da rifa
              <input
                type="text"
                value={novaRifa.nome}
                onChange={(event) => setNovaRifa({ ...novaRifa, nome: event.target.value })}
                placeholder="Ex: Smartphone premium"
                required
              />
            </label>

            <label>
              Descricao do premio
              <input
                type="text"
                value={novaRifa.premio_descricao}
                onChange={(event) => setNovaRifa({ ...novaRifa, premio_descricao: event.target.value })}
                placeholder="O que sera sorteado"
                required
              />
            </label>

            <label className="span-2">
              Descricao curta
              <textarea
                value={novaRifa.descricao}
                onChange={(event) => setNovaRifa({ ...novaRifa, descricao: event.target.value })}
                placeholder="Explique regras, estado do premio e entrega"
                required
              />
            </label>

            <label>
              Preco por numero
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={novaRifa.preco}
                onChange={(event) => setNovaRifa({ ...novaRifa, preco: event.target.value })}
                placeholder="10.00"
                required
              />
            </label>

            <label>
              Total de numeros
              <input
                type="number"
                min="10"
                max="500"
                value={novaRifa.total_numeros}
                onChange={(event) => setNovaRifa({ ...novaRifa, total_numeros: event.target.value })}
                placeholder="100"
                required
              />
            </label>

            <label>
              Data de encerramento
              <input
                type="date"
                value={novaRifa.data_termino}
                onChange={(event) => setNovaRifa({ ...novaRifa, data_termino: event.target.value })}
                required
              />
            </label>

            <label>
              URL da imagem
              <input
                type="url"
                value={novaRifa.imagem}
                onChange={(event) => setNovaRifa({ ...novaRifa, imagem: event.target.value })}
                placeholder="https://..."
                required
              />
            </label>

            <div className="form-actions span-2">
              <button className="outline-button" type="button" onClick={() => goTo('admin')}>
                <X size={17} aria-hidden="true" />
                Cancelar
              </button>
              <button className="primary-button" type="submit">
                <Plus size={17} aria-hidden="true" />
                Criar rifa
              </button>
            </div>
          </form>
        </section>
      </main>
    )
  }

  function EmptyState({ title, text }) {
    return (
      <div className="empty-state">
        <Ticket size={28} aria-hidden="true" />
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Header />

      {view === 'rifas' && <RifasView />}
      {view === 'auth' && <AuthView />}
      {view === 'comprar' && <ComprarView />}
      {view === 'minhas-compras' && <MinhasComprasView />}
      {view === 'admin' && <AdminView />}
      {view === 'criar-rifa' && <CriarRifaView />}

      {message && (
        <div className="toast" role="status">
          <BadgeCheck size={17} aria-hidden="true" />
          {message}
        </div>
      )}
    </div>
  )
}
