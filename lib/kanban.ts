// Visão Kanban da cobrança — configuração e derivação de estágio.
//
// Cada coluna (etapa) agrupa um ou mais marcos (D+N) das réguas. A posição
// de um título no Kanban é ESTADO DERIVADO (dias até/desde o vencimento →
// marco atual → coluna), nunca estado editável: mover um card manualmente
// criaria divergência entre a visão e os dados. Nada grava no Certtus.
//
// As etapas são TOTALMENTE configuráveis pelo usuário (limite de 7):
// criar, editar (título e marcos) e remover valem para qualquer etapa,
// inclusive as padrão — que servem só de seed e podem ser restauradas.
// Um marco pertence a uma única coluna.

import { ancoraParaDias, diasEntre, DATA_BASE, type Boleto } from '../mocks'
import { lerReguas } from './reguasStore'

export interface ColunaKanban {
  id: string
  titulo: string
  /** marcos da régua agrupados pela coluna */
  marcos: string[]
}

export const MAX_COLUNAS_KANBAN = 7

export const COLUNAS_PADRAO: ColunaKanban[] = [
  { id: 'a_vencer',       titulo: 'A vencer',       marcos: ['D-2', 'D0'] },
  { id: 'atraso_inicial', titulo: 'Atraso inicial', marcos: ['D+1', 'D+3'] },
  { id: 'cobranca_ativa', titulo: 'Cobrança ativa', marcos: ['D+7', 'D+15'] },
  { id: 'atraso_critico', titulo: 'Atraso crítico', marcos: ['D+30', 'D+45'] },
  { id: 'recuperacao',    titulo: 'Recuperação',    marcos: ['D+60', 'D+90'] },
]

/** todos os marcos existentes nas réguas VIGENTES (store, não o seed) —
    universo vinculável às etapas; lido a cada chamada para refletir marcos
    recém-cadastrados na tela de réguas */
export function marcosDasReguas(): string[] {
  return [...new Set(lerReguas().flatMap((r) => r.etapas.map((e) => e.ancora)))].sort(
    (a, b) => ancoraParaDias(a) - ancoraParaDias(b),
  )
}

/** marcos ainda não usados por nenhuma coluna — opções para nova etapa */
export function marcosDisponiveis(colunas: ColunaKanban[]): string[] {
  const usados = new Set(colunas.flatMap((c) => c.marcos))
  return marcosDasReguas().filter((m) => !usados.has(m))
}

// colunas sempre exibidas na ordem da régua (menor marco primeiro)
function ordenar(colunas: ColunaKanban[]): ColunaKanban[] {
  return [...colunas].sort(
    (a, b) =>
      Math.min(...a.marcos.map(ancoraParaDias)) - Math.min(...b.marcos.map(ancoraParaDias)),
  )
}

// ── Store de colunas (useSyncExternalStore + localStorage) ────────────────

const LS_COLUNAS = 'rf_kanban_colunas'
const LS_VERSION = 'rf_kanban_colunas_v1'

function isBrowser() {
  return typeof window !== 'undefined'
}

function normalizar(lista: unknown): ColunaKanban[] {
  // lista vazia é configuração legítima (usuário removeu tudo) — só dado
  // inválido cai de volta no seed padrão
  if (!Array.isArray(lista)) return COLUNAS_PADRAO
  const validas = lista.filter(
    (c): c is ColunaKanban =>
      c != null &&
      typeof c.id === 'string' &&
      typeof c.titulo === 'string' &&
      Array.isArray(c.marcos) &&
      c.marcos.length > 0,
  )
  return ordenar(validas)
}

function lerColunas(): ColunaKanban[] {
  if (!isBrowser()) return COLUNAS_PADRAO
  if (!localStorage.getItem(LS_VERSION)) {
    localStorage.setItem(LS_COLUNAS, JSON.stringify(COLUNAS_PADRAO))
    localStorage.setItem(LS_VERSION, '1')
  }
  try {
    const raw = localStorage.getItem(LS_COLUNAS)
    return normalizar(raw ? JSON.parse(raw) : COLUNAS_PADRAO)
  } catch {
    return COLUNAS_PADRAO
  }
}

function salvar(colunas: ColunaKanban[]): void {
  if (!isBrowser()) return
  localStorage.setItem(LS_COLUNAS, JSON.stringify(ordenar(colunas)))
  window.dispatchEvent(new Event('kanban-colunas-changed'))
}

let _snapshotRaw: string | null = null
let _snapshotVal: ColunaKanban[] = COLUNAS_PADRAO

export function getColunasSnapshot(): ColunaKanban[] {
  if (!isBrowser()) return COLUNAS_PADRAO
  lerColunas() // garante seed/normalização persistida
  const raw = localStorage.getItem(LS_COLUNAS)
  if (raw !== _snapshotRaw) {
    _snapshotRaw = raw
    _snapshotVal = lerColunas()
  }
  return _snapshotVal
}

export function getServerColunasSnapshot(): ColunaKanban[] {
  return COLUNAS_PADRAO
}

export function subscribeColunas(cb: () => void): () => void {
  window.addEventListener('kanban-colunas-changed', cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener('kanban-colunas-changed', cb)
    window.removeEventListener('storage', cb)
  }
}

/** cadastra nova etapa — respeita o limite e marcos já usados */
export function adicionarColuna(titulo: string, marcos: string[]): boolean {
  const atuais = lerColunas()
  if (atuais.length >= MAX_COLUNAS_KANBAN) return false
  const livres = new Set(marcosDisponiveis(atuais))
  const validos = marcos.filter((m) => livres.has(m))
  if (validos.length === 0 || !titulo.trim()) return false
  salvar([...atuais, { id: 'col-' + Date.now().toString(36), titulo: titulo.trim(), marcos: validos }])
  return true
}

/** remove qualquer etapa (inclusive as padrão) — os marcos ficam livres */
export function removerColuna(id: string): void {
  salvar(lerColunas().filter((c) => c.id !== id))
}

/** edita título e marcos de qualquer etapa — vale o conjunto livres + os dela */
export function editarColuna(id: string, titulo: string, marcos: string[]): boolean {
  const atuais = lerColunas()
  const alvo = atuais.find((c) => c.id === id)
  if (!alvo || !titulo.trim()) return false
  const permitidos = new Set([...marcosDisponiveis(atuais), ...alvo.marcos])
  const validos = marcos.filter((m) => permitidos.has(m))
  if (validos.length === 0) return false
  salvar(
    atuais.map((c) => (c.id === id ? { ...c, titulo: titulo.trim(), marcos: validos } : c)),
  )
  return true
}

/** volta ao seed padrão — escape para quem desmontou o board */
export function restaurarPadrao(): void {
  salvar(COLUNAS_PADRAO)
}

// ── Derivação de estágio ──────────────────────────────────────────────────

/** dias relativos ao vencimento na data-base — negativo = ainda a vencer */
export function diasDoBoleto(b: Boleto): number {
  return diasEntre(b.vencimento, DATA_BASE)
}

/**
 * Marco atual do título: o último marco configurado nas colunas que já foi
 * atingido. Título que ainda não atingiu nenhum marco (vencimento distante)
 * não está na régua — retorna null e fica fora do Kanban. Título além do
 * último marco permanece nele.
 */
export function marcoDoBoleto(b: Boleto, colunas: ColunaKanban[]): string | null {
  if (b.status === 'pago' || b.status === 'pago_atraso') return null
  const dias = diasDoBoleto(b)
  const marcos = colunas
    .flatMap((c) => c.marcos)
    .sort((a, z) => ancoraParaDias(a) - ancoraParaDias(z))
  let atual: string | null = null
  for (const marco of marcos) {
    if (ancoraParaDias(marco) <= dias) atual = marco
    else break
  }
  return atual
}

/** coluna do Kanban cujo conjunto de marcos contém o marco atual do título */
export function colunaDoBoleto(b: Boleto, colunas: ColunaKanban[]): ColunaKanban | null {
  const marco = marcoDoBoleto(b, colunas)
  if (!marco) return null
  return colunas.find((c) => c.marcos.includes(marco)) ?? null
}
