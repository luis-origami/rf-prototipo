// Retornos manuais de negociação — estado de processo do Cobrança RF.
// Registrado quando o operador retorna uma cobrança em negociação à régua
// antes dos 2 dias úteis de carência automática expirarem. A trilha é
// imutável (só appends) e supervisada na tela de Abonos.

// Situação da negociação supervisionada:
//  • aberta      — promessa de pagamento ativa, aguardando a data combinada
//  • descumprida — a data passou sem pagamento (promessa quebrada pelo cliente)
//  • retornada   — operador descongelou a cobrança e devolveu à régua
// Ausente = 'retornada' (compatibilidade com registros antigos, que só existiam
// para retornos manuais).
export type SituacaoNegociacao = 'aberta' | 'descumprida' | 'retornada'

export interface RetornoManualNegociacao {
  id: string
  boletoId: string
  /** data da promessa ativa no momento do registro */
  promessaData: string
  situacao?: SituacaoNegociacao
  motivoRetorno?: string
  retornadoPor: string
  retornadoEm: string // ISO datetime
}

const LS_KEY = 'rf_negociacoes_retornos'
// v2: passa a semear negociações de exemplo (3 em aberto + 2 descumpridas)
const LS_VERSION = 'rf_negociacoes_retornos_v2'

// Negociações mock para teste da supervisão — referenciam boletos/clientes reais
// do mock. As 'aberta'/'descumprida' são apenas de exibição: o resolver do
// Kanban as ignora (só 'retornada' encerra negociação), então não interferem na
// coluna Negociações do board.
export const RETORNOS_SEED: RetornoManualNegociacao[] = [
  // ── Em aberto (promessa ativa) ──────────────────────────────────────────
  { id: 'ret-seed-01', boletoId: 'b066', promessaData: '2026-06-07', situacao: 'aberta',      retornadoPor: 'financeiro@retifica.com', retornadoEm: '2026-06-03T14:20:00' },
  { id: 'ret-seed-02', boletoId: 'b095', promessaData: '2026-06-12', situacao: 'aberta',      retornadoPor: 'comercial@retifica.com',  retornadoEm: '2026-06-02T10:05:00' },
  { id: 'ret-seed-03', boletoId: 'b088', promessaData: '2026-06-15', situacao: 'aberta',      retornadoPor: 'financeiro@retifica.com', retornadoEm: '2026-06-03T16:40:00' },
  // ── Descumpridas pelo cliente (promessa quebrada) ───────────────────────
  { id: 'ret-seed-04', boletoId: 'b089', promessaData: '2026-05-20', situacao: 'descumprida', motivoRetorno: 'Cliente não efetuou o pagamento na data combinada.', retornadoPor: 'financeiro@retifica.com', retornadoEm: '2026-05-21T09:15:00' },
  { id: 'ret-seed-05', boletoId: 'b090', promessaData: '2026-05-15', situacao: 'descumprida', motivoRetorno: 'Parcelamento prometido não foi confirmado.',          retornadoPor: 'comercial@retifica.com',  retornadoEm: '2026-05-16T11:30:00' },
]

function isBrowser() {
  return typeof window !== 'undefined'
}

function lerRetornos(): RetornoManualNegociacao[] {
  if (!isBrowser()) return []
  if (!localStorage.getItem(LS_VERSION)) {
    localStorage.setItem(LS_KEY, JSON.stringify(RETORNOS_SEED))
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
  return RETORNOS_SEED
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
    situacao: 'retornada',
    motivoRetorno: params.motivoRetorno?.trim() || undefined,
    retornadoPor: params.retornadoPor,
    retornadoEm: agora,
  }
  salvar([novo, ...lerRetornos()])
  return novo
}
