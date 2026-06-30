'use client'

import {
  calcularEncargos,
  formatarData,
  formatarMoeda,
  getClienteById,
  getEmpresa,
  getEmpresaDoBoleto,
  getReguaDoCliente,
  statusEfetivo,
  type Boleto,
} from '../../../../mocks'
import { IconAlertTriangle, IconClock, IconRefreshCw } from '../../../../components/icons'
import { abonoAtivoDoBoleto, valorFinalDoBoleto } from '../../../../lib/abonos'
import { useAbonos } from '../../../../hooks/useAbonos'
import { StatusBadge } from '../../../../components/ui/StatusBadge'
import { Tag } from '../../../../components/ui/Tag'
import { EstadoAbonoBadge } from '../../../../components/abonos/EstadoAbonoBadge'
import { IconMessageSquare } from '../../../../components/icons'

/* Card de cobrança do Kanban — todos os dados do título num bloco denso.
   Clicável (abre o detalhe do título); a ação de comunicação é um botão
   próprio com stopPropagation. A posição na coluna é derivada — o card não
   se arrasta. */

/* marco da régua = estado de processo → quadrado + mono (DS v5 slide 14) */
function MarcoBadge({ marco }: { marco: string }) {
  return (
    <span
      className="num inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border
        border-steel-200 bg-steel-50 px-2 py-0.5 font-mono text-xs font-medium text-steel-600"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-[2px] bg-current" />
      {marco}
    </span>
  )
}

interface KanbanCardProps {
  boleto: Boleto
  /** marco atual do título — calculado pelo board com as colunas vigentes */
  marco: string | null
  /** comunicações vinculadas ao título (seeds + registradas na sessão) */
  comunicacoes: number
  onAbrir: (boleto: Boleto) => void
  /** ausente quando o perfil não pode registrar comunicação */
  onRegistrarComunicacao?: (boleto: Boleto) => void
  /** cartão está na coluna Negociações — exibe data da promessa */
  promessaData?: string | null
  /** promessa de pagamento não cumprida — badge de alerta */
  promessaQuebrada?: boolean
  /** promessa expirou mas está dentro dos 2 d.u. de carência */
  periodoGraca?: boolean
  /** retornar cobrança à régua antes da carência esgotar */
  onRetornarRegua?: () => void
  /** renovar a promessa em aberto — registra nova comunicação com nova data */
  onRenovarPromessa?: () => void
}

export function KanbanCard({ boleto, marco, comunicacoes, onAbrir, onRegistrarComunicacao, promessaData, promessaQuebrada, periodoGraca, onRetornarRegua, onRenovarPromessa }: KanbanCardProps) {
  const abonos = useAbonos()
  const cliente = getClienteById(boleto.clienteId)
  const empresa = getEmpresa(getEmpresaDoBoleto(boleto))
  const regua = getReguaDoCliente(boleto.clienteId)
  const encargos = calcularEncargos(boleto)
  const abonoAtivo = abonoAtivoDoBoleto(boleto.id, abonos)

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Abrir título ${boleto.numero} de ${cliente?.nome ?? ''}`}
      onClick={() => onAbrir(boleto)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onAbrir(boleto)
        }
      }}
      className="cursor-pointer rounded-md border border-line bg-surface p-3 shadow-xs outline-none
        transition-shadow duration-100 hover:shadow-sm focus-ring"
    >
      {/* cliente em destaque + ação de comunicação */}
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-semibold text-ink">
          {cliente?.nome ?? '—'}
        </span>
        {onRegistrarComunicacao && (
          <button
            type="button"
            title="Registrar contato"
            aria-label={`Registrar contato sobre o título ${boleto.numero}`}
            onClick={(e) => {
              e.stopPropagation()
              onRegistrarComunicacao(boleto)
            }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border
              border-line-strong bg-surface text-steel-500 transition-colors duration-100
              hover:bg-neutral-100 hover:text-ink focus-ring"
          >
            <IconMessageSquare size={14} />
          </button>
        )}
      </div>

      {/* severidade (pílula, fato financeiro) + marco da régua (quadrado, processo) */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <StatusBadge status={statusEfetivo(boleto)} dias={boleto.diasAtraso} />
        {marco && <MarcoBadge marco={marco} />}
      </div>

      {/* identificadores Certtus — mono, read-only */}
      <div className="num mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-neutral-700">
        <span>{boleto.numero}</span>
        <span className="text-ink-muted">·</span>
        <span>NF {boleto.nfNumero}</span>
        <Tag variant="source">{empresa.nomeCurto}</Tag>
      </div>

      {/* vencimento e valores */}
      <dl className="num mt-2 flex flex-col gap-1 font-mono text-xs">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-muted">Vencimento</dt>
          <dd className="text-ink">{formatarData(boleto.vencimento)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-muted">Valor</dt>
          <dd className="text-ink">{formatarMoeda(boleto.valor)}</dd>
        </div>
        {encargos && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-muted">Atualizado</dt>
            <dd className={abonoAtivo ? 'text-ink' : 'font-semibold text-ink'}>
              {formatarMoeda(encargos.totalAtualizado)}
            </dd>
          </div>
        )}
        {/* abono ativo: valor final DESTE título sob o abono (que pode cobrir
            outros). Expirado/cancelado → a linha some e vale o integral */}
        {abonoAtivo && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-muted">Com abono</dt>
            <dd className="font-semibold text-ink">
              {formatarMoeda(valorFinalDoBoleto(boleto.id, abonoAtivo) ?? boleto.valor)}
            </dd>
          </div>
        )}
      </dl>

      {abonoAtivo && (
        <div className="mt-2">
          <EstadoAbonoBadge estado={abonoAtivo.estado} />
        </div>
      )}

      {/* promessa de pagamento ativa — data esperada pelo cliente */}
      {promessaData && !promessaQuebrada && !periodoGraca && (
        <div className="mt-2 flex items-center gap-1.5 rounded-sm border border-avencer-border bg-avencer-bg px-2 py-1">
          <IconClock size={11} className="shrink-0 text-avencer-fg" />
          <span className="label-mono text-avencer-fg">
            Pagamento prometido: {formatarData(promessaData)}
          </span>
        </div>
      )}

      {/* carência — promessa expirou, aguardando 2 d.u. antes de sair da negociação */}
      {promessaData && periodoGraca && (
        <div className="mt-2 flex items-center gap-1.5 rounded-sm border border-hoje-border bg-hoje-bg px-2 py-1">
          <IconClock size={11} className="shrink-0 text-hoje-fg" />
          <span className="label-mono text-hoje-fg">
            Promessa vencida em {formatarData(promessaData)} — carência 2 d.u.
          </span>
        </div>
      )}

      {/* ações da negociação — renovar a promessa (nova data) ou retornar à
          régua (encerra). Só quando o card está em negociação (promessa em aberto) */}
      {promessaData && !promessaQuebrada && (onRenovarPromessa || onRetornarRegua) && (
        <div className="mt-1.5 flex flex-col gap-1.5">
          {onRenovarPromessa && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRenovarPromessa()
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-sm border
                border-line-strong bg-surface px-2 py-1 text-xs font-medium text-ink
                transition-colors duration-100 hover:bg-neutral-100 focus-ring"
            >
              <IconClock size={11} />
              Renovar promessa
            </button>
          )}
          {onRetornarRegua && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRetornarRegua()
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-sm border
                border-line-strong px-2 py-1 text-xs font-medium text-ink-muted
                transition-colors duration-100 hover:border-line hover:bg-neutral-100
                hover:text-ink focus-ring"
            >
              <IconRefreshCw size={11} />
              Retornar à régua
            </button>
          )}
        </div>
      )}

      {/* promessa não cumprida — negociação mal sucedida */}
      {promessaQuebrada && (
        <div className="mt-2 flex items-center gap-1.5 rounded-sm border border-inadimplente-border bg-inadimplente-bg px-2 py-1">
          <IconAlertTriangle size={11} className="shrink-0 text-inadimplente-fg" />
          <span className="label-mono text-inadimplente-fg">Negociação mal sucedida</span>
        </div>
      )}

      {/* régua aplicada (discreto) + comunicações vinculadas */}
      <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-line pt-2">
        <span className="label-mono truncate text-ink-muted">{regua.nome}</span>
        {comunicacoes > 0 && (
          <span
            className="num flex shrink-0 items-center gap-1 font-mono text-xs text-ink-muted"
            title={`${comunicacoes} ${comunicacoes === 1 ? 'contato vinculado' : 'contatos vinculados'}`}
          >
            <IconMessageSquare size={12} />
            {comunicacoes}
          </span>
        )}
      </div>
    </article>
  )
}
