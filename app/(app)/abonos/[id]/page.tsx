'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  calcularEncargos,
  formatarData,
  getBoletoById,
  getClienteById,
  getComunicacoesDoAbono,
  statusEfetivo,
} from '../../../../mocks'
import {
  cancelarAbono,
  validadeDoAbono,
  abonaJuros,
  abonaMulta,
  valorFinalDoBoleto,
  type AbonoEvento,
} from '../../../../lib/abonos'
import { useAbonos } from '../../../../hooks/useAbonos'
import { getSession, podeAcessar } from '../../../../lib/auth'
import { Card } from '../../../../components/ui/Card'
import { Button } from '../../../../components/ui/Button'
import { Modal } from '../../../../components/ui/Modal'
import { Field } from '../../../../components/ui/Field'
import { Textarea } from '../../../../components/ui/Textarea'
import { DataTable, type Column } from '../../../../components/ui/DataTable'
import { StatusBadge } from '../../../../components/ui/StatusBadge'
import { Money } from '../../../../components/ui/Money'
import { EmptyState } from '../../../../components/ui/EmptyState'
import { EstadoAbonoBadge } from '../../../../components/abonos/EstadoAbonoBadge'
import { AbonoBreakdown } from '../../../../components/abonos/AbonoBreakdown'
import { ComunicacaoItem } from '../../../../components/comunicacoes/ComunicacaoItem'
import { useToast } from '../../../../hooks/useToast'
import { IconChevronLeft, IconBan } from '../../../../components/icons'
import type { Boleto } from '../../../../mocks'

/* Detalhamento do abono — todos os dados num lugar: breakdown agregado,
   títulos vinculados (um abono pode cobrir vários), validade, justificativa,
   trilha imutável de transições e as comunicações que o referenciaram. */

const EVENTO_LABEL: Record<AbonoEvento['tipo'], string> = {
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

export default function AbonoDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const sessao = getSession()
  const perfil = sessao?.perfil ?? 'comercial'
  const podeCancelar = podeAcessar(perfil, 'abonosRegistrar')

  const { toast, toastHost } = useToast()
  const abonos = useAbonos()
  const abono = abonos.find((a) => a.id === id)

  const [modalCancelar, setModalCancelar] = useState(false)
  const [motivo, setMotivo] = useState('')

  if (!abono) {
    return (
      <EmptyState
        title="Abono não encontrado"
        description="O registro pode ter sido removido."
        action={
          <Link href="/abonos">
            <Button variant="secondary">Voltar para abonos</Button>
          </Link>
        }
      />
    )
  }

  const boletos = abono.boletoIds.map(getBoletoById).filter((b) => b != null)
  const cliente = boletos[0] ? getClienteById(boletos[0].clienteId) : undefined
  const comunicacoes = getComunicacoesDoAbono(abono.id)
  const validade = validadeDoAbono(abono)

  function confirmarCancelamento() {
    cancelarAbono(abono!.id, sessao?.email ?? 'admin@retifica.com', motivo.trim() || undefined)
    setModalCancelar(false)
    setMotivo('')
    toast('Abono cancelado. Encargos integrais voltam a valer.')
  }

  // por título: o que o abono representa em cada um (flags tudo-ou-nada)
  const colunasTitulos: Column<Boleto>[] = [
    {
      key: 'numero',
      header: 'Título',
      certtus: true,
      sortValue: (b) => b.numero,
      render: (b) => <span className="num whitespace-nowrap font-mono text-neutral-700">{b.numero}</span>,
    },
    {
      key: 'venc',
      header: 'Vencimento',
      numeric: true,
      certtus: true,
      sortValue: (b) => b.vencimento,
      render: (b) => formatarData(b.vencimento),
    },
    {
      key: 'valor',
      header: 'Valor',
      numeric: true,
      certtus: true,
      sortValue: (b) => b.valor,
      render: (b) => <Money value={b.valor} />,
    },
    {
      key: 'juros',
      header: 'Juros',
      numeric: true,
      sortValue: (b) => calcularEncargos(b)?.juros ?? 0,
      render: (b) => {
        const j = calcularEncargos(b)?.juros
        if (j == null) return <span className="text-ink-muted">—</span>
        return abonaJuros(abono) ? (
          <span className="text-success-fg">− <Money value={j} /></span>
        ) : (
          <Money value={j} />
        )
      },
    },
    {
      key: 'multa',
      header: 'Multa',
      numeric: true,
      sortValue: (b) => calcularEncargos(b)?.multa ?? 0,
      render: (b) => {
        const m = calcularEncargos(b)?.multa
        if (m == null) return <span className="text-ink-muted">—</span>
        return abonaMulta(abono) ? (
          <span className="text-success-fg">− <Money value={m} /></span>
        ) : (
          <Money value={m} />
        )
      },
    },
    {
      key: 'final',
      header: 'Valor final',
      numeric: true,
      sortValue: (b) => valorFinalDoBoleto(b.id, abono) ?? 0,
      render: (b) => {
        const v = valorFinalDoBoleto(b.id, abono)
        return v == null ? <span className="text-ink-muted">—</span> : <span className="font-semibold"><Money value={v} /></span>
      },
    },
    {
      key: 'status',
      header: 'Status',
      center: true,
      render: (b) => (
        <StatusBadge status={statusEfetivo(b)} dias={b.status === 'pago' ? undefined : b.diasAtraso} />
      ),
    },
  ]

  return (
    <>
      <Link
        href="/abonos"
        className="mb-4 inline-flex items-center gap-1 rounded-sm text-sm font-medium text-link
          hover:underline focus-ring"
      >
        <IconChevronLeft size={15} />
        Abonos
      </Link>

      {/* cabeçalho do abono */}
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label-mono text-ink-muted">Abono</span>
            <EstadoAbonoBadge estado={abono.estado} />
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink lg:text-3xl">
            {cliente?.nome ?? '—'}
          </h1>
          <p className="num mt-1 font-mono text-sm text-ink-muted">
            {abono.boletoIds.length} {abono.boletoIds.length === 1 ? 'título vinculado' : 'títulos vinculados'} ·
            criado em {dataHoraLegivel(abono.criadoEm)} · {abono.criadoPor}
          </p>
        </div>
        {abono.estado === 'ativo' && podeCancelar && (
          <Button variant="secondary" onClick={() => setModalCancelar(true)}>
            <IconBan size={15} />
            Cancelar abono
          </Button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        {/* breakdown agregado — soma de todos os títulos vinculados */}
        <Card>
          <Card.Header>
            <Card.Title>Valores do abono</Card.Title>
            <span className="label-mono text-ink-muted">Soma dos títulos vinculados</span>
          </Card.Header>
          <Card.Body>
            <AbonoBreakdown valores={abono} />
            <p className="mt-4 text-xs leading-relaxed text-ink-muted">
              Abono tudo-ou-nada por componente: {abonaJuros(abono) ? '100% dos juros' : 'juros mantidos'} ·{' '}
              {abonaMulta(abono) ? '100% da multa' : 'multa mantida'}. Nunca sobre o principal; nada
              altera o título no Certtus.
            </p>
          </Card.Body>
        </Card>

        {/* dados gerais + trilha */}
        <Card>
          <Card.Header>
            <Card.Title>Dados e trilha</Card.Title>
            <span className="num label-mono text-ink-muted">
              {abono.eventos.length} {abono.eventos.length === 1 ? 'evento' : 'eventos'}
            </span>
          </Card.Header>
          <Card.Body>
            <dl className="num flex flex-col gap-2.5 font-mono text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-muted">Promessa de pagamento</dt>
                <dd className="text-ink">
                  {abono.dataPromessaPagamento ? formatarData(abono.dataPromessaPagamento) : '—'}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-muted">Validade do abono</dt>
                <dd className="text-ink">{validade ? formatarData(validade) : 'Sem validade definida'}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-muted">Criado por</dt>
                <dd className="text-ink">{abono.criadoPor}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-muted">Criado em</dt>
                <dd className="text-ink">{dataHoraLegivel(abono.criadoEm)}</dd>
              </div>
            </dl>

            {abono.justificativa && (
              <p className="mt-3 border-t border-line pt-3 text-sm leading-relaxed text-neutral-700">
                <b className="font-semibold">Justificativa:</b> {abono.justificativa}
              </p>
            )}

            {/* trilha imutável de transições */}
            <ul className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
              {abono.eventos.map((e, i) => (
                <li key={i} className="num font-mono text-xs text-ink-muted">
                  {EVENTO_LABEL[e.tipo]} · {dataHoraLegivel(e.em)}
                  {e.por ? ` · ${e.por}` : ' · automático'}
                  {e.detalhe ? ` — ${e.detalhe}` : ''}
                </li>
              ))}
            </ul>
          </Card.Body>
        </Card>
      </div>

      {/* títulos vinculados — o efeito do abono em cada um */}
      <Card className="mt-6">
        <Card.Header>
          <Card.Title>Títulos vinculados</Card.Title>
          <span className="num label-mono text-ink-muted">
            {boletos.length} {boletos.length === 1 ? 'título' : 'títulos'}
          </span>
        </Card.Header>
        <div className="[&>div]:rounded-none [&>div]:border-0">
          <DataTable
            dense
            columns={colunasTitulos}
            rows={boletos}
            rowKey={(b) => b.id}
            onRowClick={(b) => router.push(`/cobrancas/${b.id}`)}
          />
        </div>
      </Card>

      {/* comunicações que referenciaram este abono — snapshot de auditoria */}
      <Card className="mt-6">
        <Card.Header>
          <Card.Title>Contatos deste abono</Card.Title>
          <span className="num label-mono text-ink-muted">
            {comunicacoes.length} {comunicacoes.length === 1 ? 'registro' : 'registros'}
          </span>
        </Card.Header>
        <Card.Body className="flex flex-col gap-3">
          {comunicacoes.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Nenhum contato referenciou este abono até agora.
            </p>
          ) : (
            comunicacoes.map((c) => <ComunicacaoItem key={c.id} com={c} />)
          )}
        </Card.Body>
      </Card>

      {/* cancelamento — motivo opcional, registrado na trilha */}
      <Modal open={modalCancelar} onClose={() => setModalCancelar(false)}>
        <Modal.Header>Cancelar abono?</Modal.Header>
        <Modal.Body>
          <p className="mb-4">
            Os encargos integrais voltam a valer sobre {abono.boletoIds.length === 1 ? 'o título vinculado' : 'os títulos vinculados'}.
            O cancelamento fica registrado na trilha de auditoria.
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

      {toastHost}
    </>
  )
}
