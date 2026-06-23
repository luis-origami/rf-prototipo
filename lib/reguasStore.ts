// Réguas de cobrança como external store (useSyncExternalStore + localStorage).
//
// As réguas padrão eram estado local da tela de Réguas e Notificações — etapas
// criadas lá não chegavam ao resto do app (ex.: os marcos novos não apareciam
// no cadastro de etapas do Kanban). Aqui elas viram fonte única: a tela edita,
// o Kanban deriva seus marcos, e tudo persiste entre reloads.
//
// Estado de processo do Cobrança RF — nada grava no Certtus.

import { reguas as REGUAS_SEED, type ReguaCobranca } from '../mocks'

const LS_REGUAS = 'rf_reguas'
// v2: copy "Handoff" → "Aviso ao financeiro" nas descrições do seed
const LS_VERSION = 'rf_reguas_v2'

function isBrowser() {
  return typeof window !== 'undefined'
}

function normalizar(lista: unknown): ReguaCobranca[] {
  if (!Array.isArray(lista) || lista.length === 0) return REGUAS_SEED
  const validas = lista.filter(
    (r): r is ReguaCobranca =>
      r != null && typeof r.id === 'string' && typeof r.nome === 'string' && Array.isArray(r.etapas),
  )
  return validas.length > 0 ? validas : REGUAS_SEED
}

export function lerReguas(): ReguaCobranca[] {
  if (!isBrowser()) return REGUAS_SEED
  if (!localStorage.getItem(LS_VERSION)) {
    localStorage.setItem(LS_REGUAS, JSON.stringify(REGUAS_SEED))
    localStorage.setItem(LS_VERSION, '1')
  }
  try {
    const raw = localStorage.getItem(LS_REGUAS)
    return normalizar(raw ? JSON.parse(raw) : REGUAS_SEED)
  } catch {
    return REGUAS_SEED
  }
}

export function salvarReguas(reguas: ReguaCobranca[]): void {
  if (!isBrowser()) return
  localStorage.setItem(LS_REGUAS, JSON.stringify(reguas))
  window.dispatchEvent(new Event('reguas-changed'))
}

/** acrescenta uma régua ao store (global ou específica de cliente) */
export function adicionarRegua(regua: ReguaCobranca): void {
  salvarReguas([...lerReguas(), regua])
}

/** edita nome e descrição de uma régua já existente */
export function atualizarReguaInfo(id: string, nome: string, descricao: string): void {
  salvarReguas(lerReguas().map((r) => (r.id === id ? { ...r, nome, descricao } : r)))
}

// snapshot cacheado pela string crua — referência estável entre renders
let _snapshotRaw: string | null = null
let _snapshotVal: ReguaCobranca[] = REGUAS_SEED

export function getReguasSnapshot(): ReguaCobranca[] {
  if (!isBrowser()) return REGUAS_SEED
  lerReguas() // garante seed persistido
  const raw = localStorage.getItem(LS_REGUAS)
  if (raw !== _snapshotRaw) {
    _snapshotRaw = raw
    _snapshotVal = lerReguas()
  }
  return _snapshotVal
}

export function getServerReguasSnapshot(): ReguaCobranca[] {
  return REGUAS_SEED
}

export function subscribeReguas(cb: () => void): () => void {
  window.addEventListener('reguas-changed', cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener('reguas-changed', cb)
    window.removeEventListener('storage', cb)
  }
}
