// Abonos de juros/multa — estado de processo do Cobrança RF.
// NUNCA do principal, NUNCA escrita no Certtus: o valor do título no ERP é
// snapshot read-only aqui. O abono nasce ATIVO, sem aprovação prévia
// (decisão do PO) — o controle é a trilha de auditoria imutável, que o
// perfil admin supervisiona a posteriori.
//
// Ciclo de vida (derivado dos dados, não editável à mão):
//   ativo → aplicado   (título quitado dentro da validade)
//         → expirado   (promessa vencida com título em aberto — encargos
//                       voltam a valer integralmente; o cálculo nunca parou)
//         → cancelado  (revogado manualmente, com motivo)
// Validade = data_promessa_pagamento, quando informada.

import {
  calcularEncargos,
  getBoletoById,
  DATA_BASE,
  type AbonoSnapshot,
  type EstadoAbono,
} from '../mocks'

export interface AbonoEvento {
  tipo: 'criado' | 'aplicado' | 'expirado' | 'cancelado'
  em: string        // ISO datetime
  por?: string      // e-mail — transições automáticas ficam sem autor
  detalhe?: string
}

export interface Abono {
  id: string
  /** títulos vinculados — um abono pode cobrir mais de um título do cliente */
  boletoIds: string[]
  /** soma dos valores dos títulos no Certtus no momento da criação — read-only */
  valorPrincipal: number
  jurosCalculado: number   // soma dos juros calculados dos títulos
  multaCalculada: number   // soma das multas calculadas dos títulos
  jurosAbonado: number     // 0 ou 100% (tudo-ou-nada por componente)
  multaAbonada: number     // 0 ou 100%
  /** principal + juros não abonado + multa não abonada */
  valorFinal: number
  dataPromessaPagamento?: string  // YYYY-MM-DD — validade do abono
  estado: EstadoAbono
  justificativa?: string
  criadoPor: string
  criadoEm: string
  /** trilha imutável de transições — só recebe appends */
  eventos: AbonoEvento[]
}

/** o abono é tudo-ou-nada por componente — as flags derivam dos valores */
export const abonaJuros = (a: Abono) => a.jurosAbonado > 0
export const abonaMulta = (a: Abono) => a.multaAbonada > 0

/** validade do abono — igual à promessa de pagamento, quando informada */
export function validadeDoAbono(a: Abono): string | null {
  return a.dataPromessaPagamento ?? null
}

const LS_ABONOS = 'rf_abonos'
const LS_VERSION = 'rf_abonos_v5'

function arred2(v: number): number {
  return Math.round(v * 100) / 100
}

// Abonos-semente — o protótipo abre com o ciclo de vida demonstrável:
// ab01/ab02 ativos; ab03 expira no load (promessa vencida, título em aberto);
// ab04 vira aplicado no load (título quitado dentro da validade).
export const ABONOS_SEED: Abono[] = [
  {
    id: 'ab01',
    boletoIds: ['b070'],
    valorPrincipal: 8_300,
    jurosCalculado: 69.17,
    multaCalculada: 166,
    jurosAbonado: 69.17,
    multaAbonada: 0,
    valorFinal: 8_466,
    dataPromessaPagamento: '2026-06-10',
    estado: 'ativo',
    justificativa: 'Cliente negociou quitação à vista mediante isenção integral dos juros.',
    criadoPor: 'financeiro@retifica.com',
    criadoEm: '2026-05-28T10:15:00',
    eventos: [{ tipo: 'criado', em: '2026-05-28T10:15:00', por: 'financeiro@retifica.com' }],
  },
  {
    // abono multi-título: cobre as duas pendências da Transportes Minas Gerais
    id: 'ab02',
    boletoIds: ['b088', 'b089'],
    valorPrincipal: 23_600,
    jurosCalculado: 769.33,
    multaCalculada: 472,
    jurosAbonado: 769.33,
    multaAbonada: 0,
    valorFinal: 24_072,
    dataPromessaPagamento: '2026-06-15',
    estado: 'ativo',
    justificativa: 'Transportes Minas Gerais sinalizou quitação total das duas pendências mediante isenção integral dos juros acumulados.',
    criadoPor: 'financeiro@retifica.com',
    criadoEm: '2026-06-03T09:20:00',
    eventos: [{ tipo: 'criado', em: '2026-06-03T09:20:00', por: 'financeiro@retifica.com' }],
  },
  {
    id: 'ab03',
    boletoIds: ['b092'],
    valorPrincipal: 12_000,
    jurosCalculado: 280,
    multaCalculada: 240,
    jurosAbonado: 280,
    multaAbonada: 240,
    valorFinal: 12_000,
    dataPromessaPagamento: '2026-05-25',
    estado: 'ativo', // expira automaticamente no load — promessa vencida
    justificativa: 'Proposta de acordo para encerrar pendência antiga da Boa Viagem.',
    criadoPor: 'financeiro@retifica.com',
    criadoEm: '2026-05-10T11:00:00',
    eventos: [{ tipo: 'criado', em: '2026-05-10T11:00:00', por: 'financeiro@retifica.com' }],
  },
  {
    id: 'ab04',
    boletoIds: ['b019'],
    valorPrincipal: 3_400,
    jurosCalculado: 4.53,
    multaCalculada: 68,
    jurosAbonado: 4.53,
    multaAbonada: 68,
    valorFinal: 3_400,
    dataPromessaPagamento: '2026-06-05',
    estado: 'ativo', // aplica automaticamente no load — pago em 01/06, dentro da validade
    justificativa: 'Pagamento combinado por telefone com desconto dos encargos.',
    criadoPor: 'financeiro@retifica.com',
    criadoEm: '2026-05-28T15:40:00',
    eventos: [{ tipo: 'criado', em: '2026-05-28T15:40:00', por: 'financeiro@retifica.com' }],
  },
]

function isBrowser() {
  return typeof window !== 'undefined'
}

// ── Transições automáticas (verificação no carregamento da visão) ─────────
// O "job diário" do produto final vira checagem no load do protótipo:
// quitado dentro da validade → aplicado; promessa vencida em aberto →
// expirado. Cada transição gera entrada na trilha.

function transicionar(abonos: Abono[]): { lista: Abono[]; mudou: boolean } {
  let mudou = false
  const lista = abonos.map((a) => {
    if (a.estado !== 'ativo') return a
    const boletos = a.boletoIds.map(getBoletoById).filter((b) => b != null)
    if (boletos.length === 0) return a
    // multi-título: aplicado só quando TODOS os títulos vinculados quitam
    const todosPagos = boletos.every((b) => b.status === 'pago' || b.status === 'pago_atraso')
    const validade = validadeDoAbono(a)

    if (todosPagos) {
      const ultimaQuitacao = boletos
        .map((b) => b.dataPagamento ?? DATA_BASE)
        .sort()
        .at(-1)!
      const dentro = !validade || ultimaQuitacao <= validade
      mudou = true
      return dentro
        ? {
            ...a,
            estado: 'aplicado' as const,
            eventos: [...a.eventos, {
              tipo: 'aplicado' as const,
              em: DATA_BASE + 'T00:00:00',
              detalhe: 'Título quitado dentro da validade — abono aplicado.',
            }],
          }
        : {
            ...a,
            estado: 'expirado' as const,
            eventos: [...a.eventos, {
              tipo: 'expirado' as const,
              em: DATA_BASE + 'T00:00:00',
              detalhe: 'Título quitado após a validade — abono não aplicado.',
            }],
          }
    }

    if (validade && validade < DATA_BASE) {
      mudou = true
      return {
        ...a,
        estado: 'expirado' as const,
        eventos: [...a.eventos, {
          tipo: 'expirado' as const,
          em: DATA_BASE + 'T00:00:00',
          detalhe: 'Promessa de pagamento vencida sem quitação — encargos voltam a valer integralmente.',
        }],
      }
    }
    return a
  })
  return { lista, mudou }
}

// Normaliza registros vindos do localStorage — abas/sessões antigas podem ter
// gravado o formato legado (boletoId singular) ou registros corrompidos.
// Migra o que dá, descarta o resto; nunca deixa um shape inválido chegar à UI.
function normalizar(lista: unknown): Abono[] {
  if (!Array.isArray(lista)) return ABONOS_SEED
  return lista.flatMap((raw): Abono[] => {
    const a = raw as Partial<Abono> & { boletoId?: string }
    if (!a || typeof a.id !== 'string') return []
    const boletoIds = Array.isArray(a.boletoIds)
      ? a.boletoIds
      : typeof a.boletoId === 'string'
        ? [a.boletoId]
        : null
    if (!boletoIds || boletoIds.length === 0) return []
    return [{ ...(a as Abono), boletoIds, eventos: Array.isArray(a.eventos) ? a.eventos : [] }]
  })
}

function lerAbonos(): Abono[] {
  if (!isBrowser()) return ABONOS_SEED
  if (!localStorage.getItem(LS_VERSION)) {
    localStorage.setItem(LS_ABONOS, JSON.stringify(ABONOS_SEED))
    localStorage.setItem(LS_VERSION, '1')
  }
  const raw = localStorage.getItem(LS_ABONOS)
  let lidos: Abono[]
  try {
    lidos = normalizar(raw ? JSON.parse(raw) : ABONOS_SEED)
  } catch {
    lidos = ABONOS_SEED
  }
  const { lista, mudou } = transicionar(lidos)
  // persiste transições E migrações sem disparar evento — quem chamou já
  // recebe a lista atual; os demais ouvintes leem o mesmo localStorage
  const serializado = JSON.stringify(lista)
  if (mudou || serializado !== raw) localStorage.setItem(LS_ABONOS, serializado)
  return lista
}

function salvar(abonos: Abono[]): void {
  if (!isBrowser()) return
  localStorage.setItem(LS_ABONOS, JSON.stringify(abonos))
  window.dispatchEvent(new Event('abonos-changed'))
}

// ── External store (useSyncExternalStore) ─────────────────────────────────
// Snapshot cacheado pela string crua — referência estável entre renders.

let _snapshotRaw: string | null = null
let _snapshotVal: Abono[] = ABONOS_SEED

export function getAbonosSnapshot(): Abono[] {
  if (!isBrowser()) return ABONOS_SEED
  lerAbonos() // aplica transições pendentes antes de ler
  const raw = localStorage.getItem(LS_ABONOS)
  if (raw !== _snapshotRaw) {
    _snapshotRaw = raw
    _snapshotVal = raw ? JSON.parse(raw) : ABONOS_SEED
  }
  return _snapshotVal
}

export function getServerAbonosSnapshot(): Abono[] {
  return ABONOS_SEED
}

export function subscribeAbonos(cb: () => void): () => void {
  window.addEventListener('abonos-changed', cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener('abonos-changed', cb)
    window.removeEventListener('storage', cb)
  }
}

// ── Ações ─────────────────────────────────────────────────────────────────

export interface CriarAbonoParams {
  /** títulos vinculados — um ou mais títulos vencidos do cliente */
  boletoIds: string[]
  /** abono é tudo-ou-nada por componente: 100% dos juros e/ou 100% da multa */
  abonarJuros: boolean
  abonarMulta: boolean
  dataPromessaPagamento?: string
  justificativa?: string
  criadoPor: string
}

/** cria o abono direto em estado ATIVO — sem etapa de aprovação */
export function criarAbono(params: CriarAbonoParams): Abono {
  // agrega os encargos de todos os títulos vinculados
  let valorPrincipal = 0
  let jurosCalculado = 0
  let multaCalculada = 0
  for (const id of params.boletoIds) {
    const boleto = getBoletoById(id)
    if (!boleto) continue
    const encargos = calcularEncargos(boleto)
    valorPrincipal += boleto.valor
    jurosCalculado += encargos?.juros ?? 0
    multaCalculada += encargos?.multa ?? 0
  }
  jurosCalculado = arred2(jurosCalculado)
  multaCalculada = arred2(multaCalculada)
  // sem valores parciais: ou remove 100% do componente, ou não remove
  const jurosAbonado = params.abonarJuros ? jurosCalculado : 0
  const multaAbonada = params.abonarMulta ? multaCalculada : 0
  const agora = new Date().toISOString()

  const novo: Abono = {
    id: 'ab-' + Date.now().toString(36),
    boletoIds: params.boletoIds,
    valorPrincipal,
    jurosCalculado,
    multaCalculada,
    jurosAbonado,
    multaAbonada,
    valorFinal: arred2(
      valorPrincipal + (jurosCalculado - jurosAbonado) + (multaCalculada - multaAbonada),
    ),
    dataPromessaPagamento: params.dataPromessaPagamento || undefined,
    estado: 'ativo',
    justificativa: params.justificativa?.trim() || undefined,
    criadoPor: params.criadoPor,
    criadoEm: agora,
    eventos: [{ tipo: 'criado', em: agora, por: params.criadoPor }],
  }
  salvar([novo, ...lerAbonos()])
  return novo
}

export function cancelarAbono(id: string, por: string, motivo?: string): void {
  const agora = new Date().toISOString()
  salvar(
    lerAbonos().map((a) =>
      a.id === id && a.estado === 'ativo'
        ? {
            ...a,
            estado: 'cancelado' as const,
            eventos: [...a.eventos, { tipo: 'cancelado' as const, em: agora, por, detalhe: motivo?.trim() || undefined }],
          }
        : a,
    ),
  )
}

// ── Consultas ─────────────────────────────────────────────────────────────
// Abatimento POR TÍTULO: como o abono é tudo-ou-nada por componente, o que
// vale para um título vinculado é derivável das flags — juros abonados ⇒
// 100% dos juros daquele título; idem multa.

export function abonoAtivoDoBoleto(boletoId: string, abonos: Abono[]): Abono | undefined {
  return abonos.find((a) => a.estado === 'ativo' && a.boletoIds.includes(boletoId))
}

export function abonoAplicadoDoBoleto(boletoId: string, abonos: Abono[]): Abono | undefined {
  return abonos.find((a) => a.estado === 'aplicado' && a.boletoIds.includes(boletoId))
}

export function abonosDoBoleto(boletoId: string, abonos: Abono[]): Abono[] {
  return abonos.filter((a) => a.boletoIds.includes(boletoId))
}

/** abatimento vigente sobre os encargos atuais de UM título (abono ativo) */
export function abatimentoAtivo(boletoId: string, abonos: Abono[]): number {
  const ativo = abonoAtivoDoBoleto(boletoId, abonos)
  if (!ativo) return 0
  const boleto = getBoletoById(boletoId)
  const encargos = boleto ? calcularEncargos(boleto) : null
  if (!encargos) return 0
  return arred2(
    (abonaJuros(ativo) ? encargos.juros : 0) + (abonaMulta(ativo) ? encargos.multa : 0),
  )
}

/** valor final de UM título sob um abono — principal + componentes não abonados */
export function valorFinalDoBoleto(boletoId: string, a: Abono): number | null {
  const boleto = getBoletoById(boletoId)
  if (!boleto) return null
  const encargos = calcularEncargos(boleto)
  if (!encargos) return boleto.valor
  return arred2(
    boleto.valor +
      (abonaJuros(a) ? 0 : encargos.juros) +
      (abonaMulta(a) ? 0 : encargos.multa),
  )
}

/**
 * Materializa o abono de um registro de comunicação: vincula o ativo
 * existente ou cria um novo (direto, estado ativo). Retorna o vínculo +
 * snapshot imutável que congela no registro o que foi comunicado ao cliente.
 */
export function processarAbonoDaComunicacao(
  input: { existenteId?: string; boletoIds: string[]; abonarJuros: boolean; abonarMulta: boolean } | undefined,
  opts: { dataPromessaPagamento?: string; criadoPor: string },
): { abonoId: string; abonoSnapshot: AbonoSnapshot } | undefined {
  if (!input) return undefined
  if (input.existenteId) {
    const existente = lerAbonos().find((a) => a.id === input.existenteId)
    if (!existente) return undefined
    return { abonoId: existente.id, abonoSnapshot: snapshotDoAbono(existente) }
  }
  const novo = criarAbono({
    boletoIds: input.boletoIds,
    abonarJuros: input.abonarJuros,
    abonarMulta: input.abonarMulta,
    dataPromessaPagamento: opts.dataPromessaPagamento,
    criadoPor: opts.criadoPor,
  })
  return { abonoId: novo.id, abonoSnapshot: snapshotDoAbono(novo) }
}

/** snapshot imutável dos valores — congelado no registro da comunicação */
export function snapshotDoAbono(a: Abono): AbonoSnapshot {
  return {
    abonoId: a.id,
    estado: a.estado,
    valorPrincipal: a.valorPrincipal,
    jurosCalculado: a.jurosCalculado,
    multaCalculada: a.multaCalculada,
    jurosAbonado: a.jurosAbonado,
    multaAbonada: a.multaAbonada,
    valorFinal: a.valorFinal,
    dataPromessaPagamento: a.dataPromessaPagamento,
  }
}
