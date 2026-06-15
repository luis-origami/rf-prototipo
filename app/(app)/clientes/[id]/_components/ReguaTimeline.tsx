import { templates, type ReguaCobranca } from '../../../../../mocks'
import { Tag } from '../../../../../components/ui/Tag'

/* Régua como linha do tempo vertical. O laranja aponta a etapa atual;
   etapas cumpridas em aço, futuras em neutro. Aviso ao financeiro = sinalização humana,
   nunca botão de execução (régua canônica RF). */

interface ReguaTimelineProps {
  regua: ReguaCobranca
  /** dias de atraso do pior boleto em aberto — define a posição na régua */
  diasAtraso: number | null
  pausada: boolean
}

function ancoraParaDias(ancora: string): number {
  // "D-2" → -2 · "D0" → 0 · "D+15" → 15
  return Number(ancora.replace('D', '').replace('+', ''))
}

export function ReguaTimeline({ regua, diasAtraso, pausada }: ReguaTimelineProps) {
  const posicao = diasAtraso ?? Number.NEGATIVE_INFINITY
  const ativas = regua.etapas.filter((e) => e.ativo)
  const atualIdx = ativas.reduce(
    (acc, e, i) => (ancoraParaDias(e.ancora) <= posicao ? i : acc),
    -1,
  )

  return (
    <ol className="flex flex-col">
      {ativas.map((etapa, i) => {
        const done = i < atualIdx
        const atual = i === atualIdx
        const template = templates.find((t) => t.id === etapa.templateId)
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
                ${atual && !pausada
                  ? 'border-accent shadow-ring'
                  : done
                    ? 'border-steel-400 bg-steel-400'
                    : 'border-line-strong'}`}
            >
              {done && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              {atual && !pausada && <span className="h-2 w-2 rounded-full bg-accent" />}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="num font-mono text-xs font-semibold text-link">{etapa.ancora}</span>
                <span className={`text-sm font-semibold ${done || atual ? 'text-ink' : 'text-ink-muted'}`}>
                  {etapa.label}
                </span>
                {etapa.tipo === 'handoff' ? (
                  <Tag>Aviso ao financeiro</Tag>
                ) : (
                  <Tag>WhatsApp</Tag>
                )}
                {atual && !pausada && (
                  <span className="label-mono text-link">Etapa atual</span>
                )}
              </div>
              <p className="mt-0.5 text-sm leading-snug text-ink-muted">{etapa.descricao}</p>
              {template && (
                <p className="mt-1 font-mono text-xs text-ink-muted">Template · {template.nome}</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
