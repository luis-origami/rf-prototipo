// Retornos manuais de negociação — estado de processo do Cobrança RF.
// Registrado quando o operador retorna uma cobrança em negociação à régua
// antes dos 2 dias úteis de carência automática expirarem. A trilha é
// imutável (só appends) e supervisada na tela de Abonos.

export interface RetornoManualNegociacao {
  id: string
  boletoId: string
  /** data da promessa ativa no momento do retorno */
  promessaData: string
  motivoRetorno?: string
  retornadoPor: string
  retornadoEm: string // ISO datetime
}

const LS_KEY = 'rf_negociacoes_retornos'
const LS_VERSION = 'rf_negociacoes_retornos_v1'

function isBrowser() {
  return typeof window !== 'undefined'
}

function lerRetornos(): RetornoManualNegociacao[] {
  if (!isBrowser()) return []
  if (!localStorage.getItem(LS_VERSION)) {
    localStorage.setItem(LS_KEY, JSON.stringify([]))
    localStorage.setItem(LS_VERSION, '1')
  }
  try {
    const raw = localStorage.getItem(LS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function salvar(retornos: RetornoManualNegociacao[]): void {
  if (!isBrowser()) return
  localStorage.setItem(LS_KEY, JSON.stringify(retornos))
  window.dispatchEvent(new Event('negociacoes-retornos-changed'))
}

let _snapshotRaw: string | null = null
let _snapshotVal: RetornoManualNegociacao[] = []

export function getRetornosSnapshot(): RetornoManualNegociacao[] {
  if (!isBrowser()) return []
  lerRetornos() // garante versão/inicialização
  const raw = localStorage.getItem(LS_KEY)
  if (raw !== _snapshotRaw) {
    _snapshotRaw = raw
    _snapshotVal = raw ? JSON.parse(raw) : []
  }
  return _snapshotVal
}

export function getServerRetornosSnapshot(): RetornoManualNegociacao[] {
  return []
}

export function subscribeRetornos(cb: () => void): () => void {
  window.addEventListener('negociacoes-retornos-changed', cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener('negociacoes-retornos-changed', cb)
    window.removeEventListener('storage', cb)
  }
}

export interface RegistrarRetornoParams {
  boletoId: string
  promessaData: string
  motivoRetorno?: string
  retornadoPor: string
}

export function registrarRetornoManual(params: RegistrarRetornoParams): RetornoManualNegociacao {
  const agora = new Date().toISOString()
  const novo: RetornoManualNegociacao = {
    id: 'ret-' + Date.now().toString(36),
    boletoId: params.boletoId,
    promessaData: params.promessaData,
    motivoRetorno: params.motivoRetorno?.trim() || undefined,
    retornadoPor: params.retornadoPor,
    retornadoEm: agora,
  }
  salvar([novo, ...lerRetornos()])
  return novo
}
