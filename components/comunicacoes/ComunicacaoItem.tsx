'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  getBoletoById,
  type Comunicacao,
  type CanalComunicacao,
  type StatusComunicacao,
} from '../../mocks'
import { Tag } from '../ui/Tag'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { WaPreview } from '../notificacoes/WaPreview'
import { EstadoAbonoBadge } from '../abonos/EstadoAbonoBadge'
import { AbonoBreakdown } from '../abonos/AbonoBreakdown'
import {
  IconMessageSquare,
  IconMail,
  IconPhone,
  IconFileText,
  IconEdit,
  IconTrash2,
  IconEye,
  IconChevronDown,
  IconPercent,
} from '../icons'

const CANAL: Record<CanalComunicacao, { label: string; Icon: typeof IconMail }> = {
  whatsapp: { label: 'WhatsApp', Icon: IconMessageSquare },
  email: { label: 'E-mail', Icon: IconMail },
  telefone: { label: 'Telefone', Icon: IconPhone },
  observacao: { label: 'Observação', Icon: IconFileText },
}

const STATUS_LABEL: Record<StatusComunicacao, string> = {
  agendada: 'Agendada',
  enviada: 'Enviada',
  entregue: 'Entregue',
  lida: 'Lida',
  respondida: 'Respondida',
  registrada: 'Registrada',
  aguardando_retorno: 'Aguardando retorno',
  encerrada: 'Encerrada',
}

const PROMESSA_LABEL = { pendente: 'pendente', cumprida: 'cumprida', quebrada: 'quebrada' } as const
const PROMESSA_CLS = {
  pendente: 'bg-hoje-bg text-hoje-fg border-hoje-border',
  cumprida: 'bg-pago-bg text-pago-fg border-pago-border',
  quebrada: 'bg-atrasado-bg text-atrasado-fg border-atrasado-border',
} as const

function dataHoraLegivel(iso: string) {
  const [data, hora] = iso.split('T')
  const [y, m, d] = data.split('-')
  return `${d}/${m}/${y} ${hora?.slice(0, 5) ?? ''}`
}

interface ComunicacaoItemProps {
  com: Comunicacao
  /** edição/exclusão só para registros manuais e com permissão */
  onEdit?: (com: Comunicacao) => void
  onDelete?: (id: string) => void
}

export function ComunicacaoItem({ com, onEdit, onDelete }: ComunicacaoItemProps) {
  const { label, Icon } = CANAL[com.canal]
  const manual = com.origem === 'manual'
  const [previewAberto, setPreviewAberto] = useState(false)
  const [abonoAberto, setAbonoAberto] = useState(false)

  return (
    <article className="rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-steel-50 text-steel-500">
          <Icon size={15} />
        </span>
        <span className="text-sm font-semibold text-ink">{label}</span>
        <Tag>{manual ? 'Manual' : `Automática · ${com.etapa}`}</Tag>
        {/* indicador de abono — esta comunicação detalhou valores ao cliente */}
        {com.abonoSnapshot && (
          <span
            className="inline-flex items-center gap-1 rounded-sm border border-info-border
              bg-info-bg px-2 py-0.5 font-mono text-xs font-medium text-info-fg"
          >
            <IconPercent size={11} />
            Abono
          </span>
        )}
        <span className="font-mono text-xs text-ink-muted">{STATUS_LABEL[com.status]}</span>
        <span className="num ml-auto font-mono text-xs text-ink-muted">{dataHoraLegivel(com.dataHora)}</span>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-neutral-700">{com.conteudo}</p>

      {/* abono comunicado — snapshot IMUTÁVEL do momento do registro: o que
          foi dito ao cliente é reconstituível mesmo se o abono mudar depois */}
      {com.abonoSnapshot && (
        <div className="mt-2.5 rounded-md border border-line bg-neutral-50 px-3 py-2">
          <button
            type="button"
            aria-expanded={abonoAberto}
            onClick={() => setAbonoAberto((a) => !a)}
            className="flex w-full items-center gap-2 rounded-sm text-left focus-ring"
          >
            <EstadoAbonoBadge estado={com.abonoSnapshot.estado} />
            <span className="text-xs text-ink-muted">valores no momento do registro</span>
            <IconChevronDown
              size={14}
              className={`ml-auto shrink-0 text-ink-muted transition-transform duration-100
                ${abonoAberto ? 'rotate-180' : ''}`}
            />
          </button>
          {abonoAberto && (
            <div className="mt-2.5 max-w-md border-t border-line pt-2.5">
              <AbonoBreakdown valores={com.abonoSnapshot} />
            </div>
          )}
        </div>
      )}

      {/* títulos vinculados — chips em mono; clicar abre o cliente na aba Títulos */}
      {com.boletoIds && com.boletoIds.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="label-mono text-ink-muted">Títulos</span>
          {com.boletoIds.map((bid) => {
            const boleto = getBoletoById(bid)
            if (!boleto) return null
            return (
              <Link
                key={bid}
                href={`/clientes/${boleto.clienteId}?tab=titulos`}
                className="num inline-flex items-center gap-1 rounded-sm border border-steel-200
                  bg-steel-50 px-2 py-0.5 font-mono text-xs font-medium text-steel-600
                  transition-colors duration-100 hover:border-steel-300 hover:text-ink focus-ring"
              >
                {boleto.numero}
              </Link>
            )
          })}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-3">
        {com.promessaPagamento && (
          <span
            className={`num inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-xs
              ${PROMESSA_CLS[com.promessaPagamento.situacao]}`}
          >
            Promessa {PROMESSA_LABEL[com.promessaPagamento.situacao]} ·{' '}
            {com.promessaPagamento.data.split('-').reverse().join('/')}
          </span>
        )}
        {com.proximaAcao && (
          <span className="text-xs text-neutral-700">
            <b className="font-semibold">Próxima ação:</b> {com.proximaAcao}
          </span>
        )}
        {com.criadoPor && <span className="font-mono text-xs text-ink-muted">{com.criadoPor}</span>}
        {!manual && (
          <span className="font-mono text-xs text-ink-muted">Template · {com.templateNome ?? '—'}</span>
        )}

        <span className="ml-auto flex gap-1">
          {!manual && com.canal === 'whatsapp' && (
            <Button variant="ghost" size="sm" onClick={() => setPreviewAberto(true)}>
              <IconEye size={13} />
              Ver mensagem
            </Button>
          )}
          {manual && onEdit && (
            <Button variant="ghost" size="sm" onClick={() => onEdit(com)}>
              <IconEdit size={13} />
              Editar
            </Button>
          )}
          {manual && onDelete && (
            <Button variant="ghost" size="sm" onClick={() => onDelete(com.id)}>
              <IconTrash2 size={13} />
              Excluir
            </Button>
          )}
        </span>
      </div>

      {/* mensagem enviada, como o cliente recebeu */}
      <Modal open={previewAberto} onClose={() => setPreviewAberto(false)}>
        <Modal.Header>Notificação · {com.etapa}</Modal.Header>
        <Modal.Body>
          <WaPreview
            corpo={com.conteudo}
            hora={com.dataHora.split('T')[1]?.slice(0, 5) ?? '09:00'}
            heightClass="h-[480px]"
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setPreviewAberto(false)}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>
    </article>
  )
}
