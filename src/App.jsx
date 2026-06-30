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
import { dataMode } from './lib/supabaseClient'
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

function getSoldNumbers(compras, rifaId) {
  return new Set(
    compras
      .filter((compra) => compra.rifa_id === rifaId && compra.status_pagamento === 'confirmado')
      .flatMap((compra) => compra.numeros),
  )
}

function getRifaStats(rifa, compras) {
  const soldNumbers = getSoldNumbers(compras, rifa.id)
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

function sortNumbers(numbers) {
  return [...numbers].sort((a, b) => a - b)
}

export default function App() {
  const [usuarios, setUsuarios] = usePersistentState('rifamax:usuarios', demoUsers)
  const [rifas, setRifas] = usePersistentState('rifamax:rifas', demoRifas)
  const [compras, setCompras] = usePersistentState('rifamax:compras', demoCompras)
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
    const totalNumeros = compras.reduce((sum, compra) => sum + compra.quantidade_numeros, 0)
    const compradores = new Set(compras.map((compra) => compra.comprador_id)).size

    return {
      rifas: rifas.length,
      ativas: rifas.filter((rifa) => rifa.ativa).length,
      totalReceita,
      totalNumeros,
      compradores,
    }
  }, [compras, rifas])

  useEffect(() => {
    if (!message) return undefined

    const timeout = window.setTimeout(() => setMessage(''), 3500)
    return () => window.clearTimeout(timeout)
  }, [message])

  useEffect(() => {
    setSelectedNumbers([])
  }, [selectedRifaId])

  function notify(text) {
    setMessage(text)
  }

  function goTo(nextView) {
    setView(nextView)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function loginAs(email, password) {
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

  function handleLogin(event) {
    event.preventDefault()
    loginAs(loginForm.email, loginForm.password)
  }

  function handleRegistro(event) {
    event.preventDefault()

    const email = normalizeEmail(registroForm.email)
    if (registroForm.password !== registroForm.confirm) {
      notify('As senhas nao coincidem.')
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

  function logout() {
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

    const vendidos = getSoldNumbers(compras, selectedRifa.id)
    if (vendidos.has(numero)) return

    setSelectedNumbers((current) =>
      current.includes(numero)
        ? current.filter((item) => item !== numero)
        : sortNumbers([...current, numero]),
    )
  }

  function confirmarCompra() {
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

    const vendidos = getSoldNumbers(compras, selectedRifa.id)
    const conflitos = selectedNumbers.filter((numero) => vendidos.has(numero))
    if (conflitos.length > 0) {
      setSelectedNumbers((current) => current.filter((numero) => !vendidos.has(numero)))
      notify(`Os numeros ${conflitos.join(', ')} acabaram de ser vendidos.`)
      return
    }

    const numeros = sortNumbers(selectedNumbers)
    const valorTotal = Number((numeros.length * selectedRifa.preco).toFixed(2))
    const novaCompra = {
      id: createId('compra'),
      rifa_id: selectedRifa.id,
      comprador_id: user.id,
      comprador_nome: user.nome,
      numeros,
      valor_total: valorTotal,
      quantidade_numeros: numeros.length,
      status_pagamento: 'confirmado',
      metodo_pagamento: 'simulado',
      data_compra: new Date().toISOString(),
    }

    setCompras((current) => [novaCompra, ...current])
    setSelectedNumbers([])
    goTo('minhas-compras')
    notify('Compra confirmada no modo demonstracao.')
  }

  function handleCriarRifa(event) {
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

    const rifa = {
      id: createId('rifa'),
      nome: novaRifa.nome.trim(),
      descricao: novaRifa.descricao.trim(),
      imagem: novaRifa.imagem.trim(),
      preco,
      total_numeros: totalNumeros,
      premio_descricao: novaRifa.premio_descricao.trim(),
      criador_id: user.id,
      ativa: true,
      data_termino: novaRifa.data_termino,
      data_criacao: new Date().toISOString(),
    }

    setRifas((current) => [rifa, ...current])
    setNovaRifa(emptyRifa)
    goTo('admin')
    notify('Rifa criada com sucesso.')
  }

  function toggleRifaStatus(rifaId) {
    setRifas((current) =>
      current.map((rifa) => (rifa.id === rifaId ? { ...rifa, ativa: !rifa.ativa } : rifa)),
    )
  }

  function resetDemoData() {
    setUsuarios(demoUsers)
    setRifas(demoRifas)
    setCompras(demoCompras)
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
            <small>{dataMode === 'configured' ? 'Supabase preparado' : 'Demo local'}</small>
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
              O fluxo esta pronto para demonstracao: login, cadastro, painel admin, criacao de
              rifas, selecao de numeros e historico de compras.
            </p>
          </div>

          <div className="quick-panel" aria-label="Acessos rapidos">
            <div className="user-chip">
              <Users size={18} aria-hidden="true" />
              {user ? user.nome : 'Visitante'}
            </div>
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
          </div>
        </section>

        <section className="metric-grid" aria-label="Resumo">
          <Metric icon={Ticket} label="Rifas ativas" value={dashboardStats.ativas} />
          <Metric icon={ShoppingCart} label="Numeros vendidos" value={dashboardStats.totalNumeros} />
          <Metric icon={Banknote} label="Faturamento demo" value={currency.format(dashboardStats.totalReceita)} />
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
    const stats = getRifaStats(rifa, compras)

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
            Use os acessos de demonstracao para testar o painel completo sem configurar o Supabase.
          </p>

          <div className="demo-login-row">
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
          </div>
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
                Entrar
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
                Criar conta
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

    const stats = getRifaStats(selectedRifa, compras)
    const vendidos = getSoldNumbers(compras, selectedRifa.id)
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
              disabled={selectedNumbers.length === 0}
            >
              <Check size={17} aria-hidden="true" />
              Confirmar compra
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
                    <span className="status-pill">
                      <BadgeCheck size={15} aria-hidden="true" />
                      {compra.status_pagamento}
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
              Restaurar demo
            </button>
            <button className="primary-button" type="button" onClick={() => goTo('criar-rifa')}>
              <Plus size={17} aria-hidden="true" />
              Nova rifa
            </button>
          </div>
        </div>

        <section className="metric-grid">
          <Metric icon={Ticket} label="Total de rifas" value={dashboardStats.rifas} />
          <Metric icon={CircleDollarSign} label="Receita simulada" value={currency.format(dashboardStats.totalReceita)} />
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
                  const stats = getRifaStats(rifa, compras)

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
