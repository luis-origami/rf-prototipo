'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getBoletoById, getClienteById } from '../../mocks'
import type { Abono } from '../../lib/abonos'
import { EstadoAbonoBadge } from './EstadoAbonoBadge'
import { AbonoBreakdown } from './AbonoBreakdown'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Field } from '../ui/Field'
import { Textarea } from '../ui/Textarea'
import { IconBan } from '../icons'

/* Item da trilha de abonos: breakdown completo, quem criou, transições de
   estado (trilha imutável — só recebe appends) e cancelamento manual com
   motivo. Sem aprovação: a supervisão do admin é a posteriori. */

const EVENTO_LABEL: Record<Abono['eventos'][number]['tipo'], string> = {
  criado: 'Criado',
  aplicado: 'Aplicado',
  expirado: 'Expirado',
  cancelado: 'Cancelado',
}

function dataHoraLegivel(iso: string) {
  const [data, hora] = iso.split('T')
  const [y, m, d] = data.split('-')
  return `${d}/${m}/${y} ${hora?.slice(0, 5) ?? ''}`
}

interface AbonoItemProps {
  abono: Abono
  /** exibe chip do título + cliente (visão consolidada do admin) */
  showTitulo?: boolean
  /** habilita o cancelamento — abonos ativos, perfil com permissão */
  onCancelar?: (id: string, motivo?: string) => void
}

export function AbonoItem({ abono, showTitulo = false, onCancelar }: AbonoItemProps) {
  const [modalCancelar, setModalCancelar] = useState(false)
  const [motivo, setMotivo] = useState('')

  // o abono pode cobrir mais de um título do mesmo cliente
  const boletos = abono.boletoIds.map(getBoletoById).filter((b) => b != null)
  const cliente = boletos[0] ? getClienteById(boletos[0].clienteId) : undefined

  function confirmarCancelamento() {
    onCancelar?.(abono.id, motivo.trim() || undefined)
    setModalCancelar(false)
    setMotivo('')
  }

  return (
    <article className="rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <EstadoAbonoBadge estado={abono.estado} />
        {showTitulo && boletos.length > 0 && (
          <>
            {boletos.map((b) => (
              <Link
                key={b.id}
                href={`/titulos/${b.id}`}
                className="num rounded-sm border border-steel-200 bg-steel-50 px-2 py-0.5 font-mono
                  text-xs font-medium text-steel-600 transition-colors duration-100
                  hover:border-steel-300 hover:text-ink focus-ring"
              >
                {b.numero}
              </Link>
            ))}
            <span className="text-sm font-medium text-ink">{cliente?.nome ?? '—'}</span>
          </>
        )}
        <span className="num ml-auto font-mono text-xs text-ink-muted">
          {dataHoraLegivel(abono.criadoEm)}
        </span>
      </div>

      <div className="mt-3 max-w-md">
        <AbonoBreakdown valores={abono} />
      </div>

      {abono.justificativa && (
        <p className="mt-2.5 text-sm leading-relaxed text-neutral-700">
          <b className="font-semibold">Justificativa:</b> {abono.justificativa}
        </p>
      )}

      {/* trilha de transições — imutável, cada mudança vira entrada */}
      <ul className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
        {abono.eventos.map((e, i) => (
          <li key={i} className="num font-mono text-xs text-ink-muted">
            {EVENTO_LABEL[e.tipo]} · {dataHoraLegivel(e.em)}
            {e.por ? ` · ${e.por}` : ' · automático'}
            {e.detalhe ? ` — ${e.detalhe}` : ''}
          </li>
        ))}
      </ul>

      {abono.estado === 'ativo' && onCancelar && (
        <div className="mt-3 flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => setModalCancelar(true)}>
            <IconBan size={13} />
            Cancelar abono
          </Button>
        </div>
      )}

      {/* cancelamento — motivo opcional, registrado na trilha */}
      <Modal open={modalCancelar} onClose={() => setModalCancelar(false)}>
        <Modal.Header>Cancelar abono?</Modal.Header>
        <Modal.Body>
          <p className="mb-4">
            Os encargos integrais voltam a valer sobre o título. O cancelamento fica registrado na
            trilha de auditoria.
          </p>
          <Field label="Motivo" helper="Opcional — entra na trilha do abono.">
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: Cliente desistiu da negociação."
              className="w-full"
            />
          </Field>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setModalCancelar(false)}>
            Voltar
          </Button>
          <Button onClick={confirmarCancelamento}>Cancelar abono</Button>
        </Modal.Footer>
      </Modal>
    </article>
  )
}
