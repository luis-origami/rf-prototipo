import {
  templates,
  diasEntre,
  formatarMoeda,
  DATA_BASE,
  type ReguaCobranca,
  type Boleto,
} from '../../../../../mocks'
import { Tag } from '../../../../../components/ui/Tag'

/* Régua como linha do tempo vertical. Cada título em aberto é posicionado na
   etapa correspondente ao seu atraso — um cliente com vários títulos vê todos,
   cada um na sua etapa (não só o de pior atraso). Etapas com títulos ficam em
   laranja; etapas já passadas por todos os títulos, em aço; futuras, em neutro.
   Ação Manual = sinalização humana, nunca botão de execução. */

interface ReguaTimelineProps {
  regua: ReguaCobranca
  /** títulos em aberto do cliente — cada um posicionado na sua etapa */
  boletos: Boleto[]
  pausada: boolean
}

function ancoraParaDias(ancora: string): number {
  // "D-2" → -2 · "D0" → 0 · "D+15" → 15
  return Number(ancora.replace('D', '').replace('+', ''))
}

// posição do título na régua, em dias relativos ao vencimento (atraso).
// a vencer / hoje → valor negativo (dias até vencer)
function posicaoDoTitulo(b: Boleto): number {
  if (b.diasAtraso != null) return b.diasAtraso
  return -diasEntre(DATA_BASE, b.vencimento)
}

function rotuloPosicao(b: Boleto): string {
  return b.diasAtraso != null ? `D+${b.diasAtraso}` : 'A vencer'
}

export function ReguaTimeline({ regua, boletos, pausada }: ReguaTimelineProps) {
  const ativas = regua.etapas.filter((e) => e.ativo)

  // etapa de cada título: última etapa cuja âncora <= posição do título
  function etapaIdxDoTitulo(b: Boleto): number {
    const pos = posicaoDoTitulo(b)
    return ativas.reduce((acc, e, i) => (ancoraParaDias(e.ancora) <= pos ? i : acc), -1)
  }

  // agrupa os títulos por etapa; idx -1 = ainda não entrou na régua
  const porEtapa = new Map<number, Boleto[]>()
  const aguardando: Boleto[] = []
  for (const b of boletos) {
    const idx = etapaIdxDoTitulo(b)
    if (idx < 0) {
      aguardando.push(b)
      continue
    }
    const arr = porEtapa.get(idx) ?? []
    arr.push(b)
    porEtapa.set(idx, arr)
  }
  const ocupados = [...porEtapa.keys()]
  // primeira etapa ocupada — antes dela, todos os títulos já passaram (cumprida)
  const primeiraOcupada = ocupados.length ? Math.min(...ocupados) : ativas.length

  return (
    <>
      <ol className="flex flex-col">
        {ativas.map((etapa, i) => {
          const titulos = porEtapa.get(i) ?? []
          const ocupada = titulos.length > 0
          const done = i < primeiraOcupada
          const template = templates.find((t) => t.id === etapa.templateId)
          const realce = ocupada && !pausada
          return (
            <li key={etapa.id} className="relative flex gap-4 pb-6 last:pb-0">
              {/* trilho */}
              {i < ativas.length - 1 && (
                <span className="absolute left-[11px] top-6 h-full w-px bg-line-strong" aria-hidden="true" />
              )}
              {/* marcador */}
              <span
                className={`z-10 mt-0.5 flex h-[23px] w-[23px] shrink-0 items-center justify-center
                  rounded-full border-2 bg-surface
                  ${realce
                    ? 'border-accent shadow-ring'
                    : done
                      ? 'border-steel-400 bg-steel-400'
                      : 'border-line-strong'}`}
              >
                {done && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                {realce && <span className="h-2 w-2 rounded-full bg-accent" />}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="num font-mono text-xs font-semibold text-link">{etapa.ancora}</span>
                  <span className={`text-sm font-semibold ${done || ocupada ? 'text-ink' : 'text-ink-muted'}`}>
                    {etapa.label}
                  </span>
                  {etapa.tipo === 'handoff' ? <Tag>Ação Manual</Tag> : <Tag>WhatsApp</Tag>}
                  {ocupada && (
                    <span className="label-mono text-link">
                      {titulos.length === 1 ? '1 título aqui' : `${titulos.length} títulos aqui`}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm leading-snug text-ink-muted">{etapa.descricao}</p>
                {template && (
                  <p className="mt-1 font-mono text-xs text-ink-muted">Template · {template.nome}</p>
                )}

                {/* títulos alocados nesta etapa */}
                {ocupada && (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {titulos.map((b) => (
                      <li
                        key={b.id}
                        className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-md border
                          border-primary-200 bg-primary-50 px-2.5 py-1.5"
                      >
                        <span className="num font-mono text-xs font-semibold text-ink">{b.numero}</span>
                        <span className="num font-mono text-xs text-ink-muted">{formatarMoeda(b.valor)}</span>
                        <span className="num label-mono ml-auto text-link">{rotuloPosicao(b)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {/* títulos a vencer que ainda não entraram na régua */}
      {aguardando.length > 0 && (
        <p className="mt-1 border-t border-line pt-3 text-xs text-ink-muted">
          {aguardando.length === 1
            ? '1 título a vencer ainda não entrou na régua.'
            : `${aguardando.length} títulos a vencer ainda não entraram na régua.`}
        </p>
      )}

      {boletos.length === 0 && (
        <p className="text-sm text-ink-muted">Nenhum título em aberto para posicionar na régua.</p>
      )}
    </>
  )
}
