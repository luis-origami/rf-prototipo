// Autenticação simulada — protótipo visual, sem backend real.
// Estado persiste em localStorage para sobreviver a reload.

export type Perfil = 'admin' | 'financeiro' | 'comercial'

export interface Usuario {
  id: string
  nome: string
  email: string
  senha: string   // plaintext — NUNCA fazer em produção
  perfil: Perfil
  ativo: boolean
  criadoEm: string
}

export interface Sessao {
  email: string
  nome: string
  perfil: Perfil
  perfilOriginal: Perfil  // para o switcher de demo
}

// Permissões por perfil conforme matriz do produto
export const PERMISSOES: Record<Perfil, {
  dashboard: boolean
  cobrancas: boolean
  clientes: boolean
  reguas: boolean         // operar, pausar, aprovar handoff
  templates: boolean      // editar
  comunicacaoManual: boolean  // registrar interação
  abonosRegistrar: boolean    // criar/cancelar abono — direto, sem aprovação
  abonosSupervisao: boolean   // visão consolidada de abonos — controle a posteriori
  configuracoes: boolean
  usuarios: boolean
}> = {
  admin: {
    dashboard: true, cobrancas: true, clientes: true,
    reguas: true, templates: true, comunicacaoManual: true,
    abonosRegistrar: true, abonosSupervisao: true,
    configuracoes: true, usuarios: true,
  },
  financeiro: {
    dashboard: true, cobrancas: true, clientes: true,
    reguas: true, templates: true, comunicacaoManual: true,
    abonosRegistrar: true, abonosSupervisao: true,
    configuracoes: false, usuarios: false,
  },
  comercial: {
    dashboard: true, cobrancas: true, clientes: true,
    reguas: false, templates: false, comunicacaoManual: true,
    abonosRegistrar: false, abonosSupervisao: false,
    configuracoes: false, usuarios: false,
  },
}

const LS_SESSION = 'rf_session'
const LS_USERS   = 'rf_users'
const LS_VERSION = 'rf_data_v3'
const LS_ATIVIDADE = 'rf_last_activity'

// Sessão expira após 20 minutos SEM atividade — qualquer interação renova.
export const SESSAO_TIMEOUT_MIN = 20
const SESSAO_TIMEOUT_MS = SESSAO_TIMEOUT_MIN * 60_000

// Usuários-semente (usados se localStorage estiver vazio)
export const USUARIOS_SEED: Usuario[] = [
  { id: 'u01', nome: 'Usuário Admin',      email: 'admin@retifica.com',      senha: 'admin123', perfil: 'admin',      ativo: true, criadoEm: '2026-01-01' },
  { id: 'u02', nome: 'Usuário Financeiro', email: 'financeiro@retifica.com', senha: 'fin123',   perfil: 'financeiro', ativo: true, criadoEm: '2026-01-01' },
  { id: 'u03', nome: 'Usuário Comercial',  email: 'comercial@retifica.com',  senha: 'com123',   perfil: 'comercial',  ativo: true, criadoEm: '2026-01-01' },
]

function isBrowser() { return typeof window !== 'undefined' }

// Reseta dados quando a versão do seed muda, forçando re-login
function resetIfStale() {
  if (!isBrowser()) return
  if (localStorage.getItem(LS_VERSION)) return
  localStorage.removeItem(LS_SESSION)
  localStorage.setItem(LS_USERS, JSON.stringify(USUARIOS_SEED))
  localStorage.setItem(LS_VERSION, '1')
}

// ── Usuários ──────────────────────────────────────────────────────────────

export function getUsuarios(): Usuario[] {
  if (!isBrowser()) return USUARIOS_SEED
  resetIfStale()
  const raw = localStorage.getItem(LS_USERS)
  if (!raw) {
    localStorage.setItem(LS_USERS, JSON.stringify(USUARIOS_SEED))
    return USUARIOS_SEED
  }
  return JSON.parse(raw)
}

export function saveUsuarios(usuarios: Usuario[]): void {
  if (!isBrowser()) return
  localStorage.setItem(LS_USERS, JSON.stringify(usuarios))
}

// ── Sessão ────────────────────────────────────────────────────────────────

/** marca atividade do usuário — renova a janela de 20 min da sessão */
export function registrarAtividade(): void {
  if (!isBrowser()) return
  if (localStorage.getItem(LS_SESSION)) {
    localStorage.setItem(LS_ATIVIDADE, String(Date.now()))
  }
}

/** true quando há sessão mas a última atividade passou do timeout */
export function sessaoExpirada(): boolean {
  if (!isBrowser()) return false
  if (!localStorage.getItem(LS_SESSION)) return false
  const ultima = Number(localStorage.getItem(LS_ATIVIDADE) ?? 0)
  // sessões antigas sem marca de atividade ganham a marca agora (migração)
  if (!ultima) {
    localStorage.setItem(LS_ATIVIDADE, String(Date.now()))
    return false
  }
  return Date.now() - ultima > SESSAO_TIMEOUT_MS
}

/** encerra a sessão expirada e notifica os stores (AuthGuard redireciona) */
export function expirarSessao(): void {
  if (!isBrowser()) return
  localStorage.removeItem(LS_SESSION)
  localStorage.removeItem(LS_ATIVIDADE)
  window.dispatchEvent(new Event('perfil-changed'))
}

export function getSession(): Sessao | null {
  if (!isBrowser()) return null
  resetIfStale()
  if (sessaoExpirada()) {
    expirarSessao()
    return null
  }
  const raw = localStorage.getItem(LS_SESSION)
  return raw ? JSON.parse(raw) : null
}

export function login(email: string, senha: string): { ok: boolean; erro?: string } {
  const usuarios = getUsuarios()
  const u = usuarios.find(x => x.email.toLowerCase() === email.toLowerCase() && x.senha === senha)
  if (!u) return { ok: false, erro: 'E-mail ou senha incorretos.' }
  if (!u.ativo) return { ok: false, erro: 'Usuário inativo. Contate o administrador.' }
  const sessao: Sessao = { email: u.email, nome: u.nome, perfil: u.perfil, perfilOriginal: u.perfil }
  localStorage.setItem(LS_SESSION, JSON.stringify(sessao))
  localStorage.setItem(LS_ATIVIDADE, String(Date.now()))
  return { ok: true }
}

export function logout(): void {
  if (!isBrowser()) return
  localStorage.removeItem(LS_SESSION)
  localStorage.removeItem(LS_ATIVIDADE)
}

// Switcher de perfil para demo — troca o usuário ativo pelo do perfil selecionado
export function switchPerfil(perfil: Perfil): void {
  const s = getSession()
  if (!s) return
  const u = getUsuarios().find(x => x.perfil === perfil)
  localStorage.setItem(LS_SESSION, JSON.stringify({
    ...s,
    perfil,
    nome:  u?.nome  ?? PERFIL_LABEL[perfil],
    email: u?.email ?? s.email,
  }))
}

// ── Sessão como external store (useSyncExternalStore) ────────────────────
// Snapshot cacheado pela string crua do localStorage — referência estável
// entre renders, exigência do useSyncExternalStore.

let _snapshotRaw: string | null = null
let _snapshotVal: Sessao | null = null

export function getSessionSnapshot(): Sessao | null {
  if (!isBrowser()) return null
  // sessão vencida por inatividade não existe para a UI — a limpeza efetiva
  // (side effect) fica com o AuthGuard, snapshot é só leitura
  if (sessaoExpirada()) return null
  const raw = localStorage.getItem(LS_SESSION)
  if (raw !== _snapshotRaw) {
    _snapshotRaw = raw
    _snapshotVal = raw ? JSON.parse(raw) : null
  }
  return _snapshotVal
}

export function getServerSessionSnapshot(): Sessao | null {
  return null
}

export function subscribeSession(cb: () => void): () => void {
  window.addEventListener('perfil-changed', cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener('perfil-changed', cb)
    window.removeEventListener('storage', cb)
  }
}

export function podeAcessar(perfil: Perfil, recurso: keyof typeof PERMISSOES['admin']): boolean {
  return PERMISSOES[perfil][recurso] ?? false
}

export const PERFIL_LABEL: Record<Perfil, string> = {
  admin:      'Admin',
  financeiro: 'Financeiro',
  comercial:  'Comercial',
}
