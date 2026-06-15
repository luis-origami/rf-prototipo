'use client'

import { use, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  getBoletoById,
  getClienteById,
  getEmpresa,
  getEmpresaDoBoleto,
  getComunicacoesDoBoleto,
  getFormaPagamento,
  calcularEncargos,
  formatarData,
  formatarMoeda,
  statusEfetivo,
  FORMA_PAGAMENTO_LABEL,
  MULTA_PCT,
  JUROS_MES_PCT,
} from '../../../../mocks'
import { getSession, podeAcessar } from '../../../../lib/auth'
import {
  criarAbono,
  cancelarAbono,
  abonosDoBoleto,
  abonoAtivoDoBoleto,
  abatimentoAtivo,
} from '../../../../lib/abonos'
import { useAbonos } from '../../../../hooks/useAbonos'
import { Button } from '../../../../components/ui/Button'
import { Card } from '../../../../components/ui/Card'
import { Modal } from '../../../../components/ui/Modal'
import { Field } from '../../../../components/ui/Field'
import { Input } from '../../../../components/ui/Input'
import { Switch } from '../../../../components/ui/Switch'
import { Textarea } from '../../../../components/ui/Textarea'
import { StatusBadge } from '../../../../components/ui/StatusBadge'
import { Tag } from '../../../../components/ui/Tag'
import { EmptyState } from '../../../../components/ui/EmptyState'
import { AbonoItem } from '../../../../components/abonos/AbonoItem'
import { EstadoAbonoBadge } from '../../../../components/abonos/EstadoAbonoBadge'
import { ComunicacaoItem } from '../../../../components/comunicacoes/ComunicacaoItem'
import { useToast } from '../../../../hooks/useToast'
import { IconChevronLeft, IconPercent } from '../../../../components/icons'

/* Detalhe do título — onde os dois mundos ficam lado a lado e separados:
   os fatos do Certtus (read-only, com cadeado) e o estado de processo do
   Cobrança RF (encargos, abonos, comunicações). Encargos integrais sempre
   exibidos por padrão: multa + juros pro rata die (taxas na configuração
   central). Abono é só de juros/multa — nunca do principal — e nasce ativo,
   sem aprovação; a trilha é o controle. */

export default function TituloDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const boleto = getBoletoById(id)

  const sessao = getSession()
  const perfil = sessao?.perfil ?? 'comercial'
  const podeAbonar = podeAcessar(perfil, 'abonosRegistrar')

  const { toast, toastHost } = useToast()
  const abonos = useAbonos()

  const [modalAbono, setModalAbono] = useState(false)
  // abono é tudo-ou-nada por componente — sem valores parciais
  const [abonarJuros, setAbonarJuros] = useState(false)
  const [abonarMulta, setAbonarMulta] = useState(false)
  const [promessaStr, setPromessaStr] = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [erroAbono, setErroAbono] = useState('')

  const abonosDoTitulo = useMemo(
    () =>
      abonosDoBoleto(id, abonos).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
    [abonos, id],
  )

  if (!boleto) {
    return (
      <EmptyState
        title="Título não encontrado"
        description="O registro pode ter sido removido do Certtus."
        action={
          <Link href="/cobrancas">
            <Button variant="secondary">Voltar para cobranças</Button>
          </Link>
        }
      />
    )
  }

  const cliente = getClienteById(boleto.clienteId)
  const empresa = getEmpresa(getEmpresaDoBoleto(boleto))
  const encargos = calcularEncargos(boleto)
  const abonoAtivo = abonoAtivoDoBoleto(boleto.id, abonos)
  // abatimento DESTE título — com abono multi-título, deriva das flags
  const abatimento = abatimentoAtivo(boleto.id, abonos)
  const totalComAbono = encargos ? Math.round((encargos.totalAtualizado - abatimento) * 100) / 100 : null
  const comunicacoesDoTitulo = getComunicacoesDoBoleto(boleto.id)
  const pago = boleto.status === 'pago' || boleto.status === 'pago_atraso'

  function abrirModalAbono() {
    setAbonarJuros(false)
    setAbonarMulta(false)
    setPromessaStr('')
    setJustificativa('')
    setErroAbono('')
    setModalAbono(true)
  }

  function confirmarAbono() {
    if (!encargos || !boleto) return
    if (!abonarJuros && !abonarMulta) {
      setErroAbono('Marque o que será abonado: juros e/ou multa (sempre 100% do componente).')
      return
    }
    criarAbono({
      boletoIds: [boleto.id],
      abonarJuros,
      abonarMulta,
      dataPromessaPagamento: promessaStr || undefined,
      justificativa: justificativa.trim() || undefined,
      criadoPor: sessao?.email ?? 'financeiro@retifica.com',
    })
    setModalAbono(false)
    toast('Abono registrado — ativo, sem necessidade de aprovação.')
  }

  function cancelar(abonoId: string, motivo?: string) {
    cancelarAbono(abonoId, sessao?.email ?? 'financeiro@retifica.com', motivo)
    toast('Abono cancelado. Encargos integrais voltam a valer.')
  }

  return (
    <>
      <Link
        href="/cobrancas"
        className="mb-4 inline-flex items-center gap-1 rounded-sm text-sm font-medium text-link
          hover:underline focus-ring"
      >
        <IconChevronLeft size={15} />
        Cobranças
      </Link>

      {/* cabeçalho da entidade */}
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label-mono text-ink-muted">Título</span>
            <StatusBadge
              status={statusEfetivo(boleto)}
              dias={pago ? undefined : boleto.diasAtraso}
            />
            {abonoAtivo && <EstadoAbonoBadge estado={abonoAtivo.estado} />}
            <Tag variant="source">{empresa.nomeCurto}</Tag>
          </div>
          <h1 className="num mt-2 font-mono text-2xl font-bold tracking-tight text-ink lg:text-3xl">
            {boleto.numero}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {boleto.descricao} ·{' '}
            <Link
              href={`/clientes/${boleto.clienteId}`}
              className="font-medium text-link hover:underline focus-ring rounded-sm"
            >
              {cliente?.nome ?? '—'}
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        {/* fatos do Certtus — uma tag para o card inteiro, linhas compactas */}
        <Card>
          <Card.Header>
            <Card.Title>Dados do título</Card.Title>
            <Tag variant="source">Certtus</Tag>
          </Card.Header>
          <Card.Body>
            <dl className="num flex flex-col gap-2.5 font-mono text-sm">
              {[
                ['Empresa recebedora', empresa.nome],
                ['Nota fiscal', `NF ${boleto.nfNumero}`],
                ['Emissão', formatarData(boleto.emissao)],
                ['Vencimento', formatarData(boleto.vencimento)],
                ['Valor original', formatarMoeda(boleto.valor)],
                ['Forma de pagamento', FORMA_PAGAMENTO_LABEL[getFormaPagamento(boleto)]],
                ...(boleto.dataPagamento ? [['Pagamento', formatarData(boleto.dataPagamento)]] : []),
              ].map(([rotulo, valor]) => (
                <div key={rotulo} className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-muted">{rotulo}</dt>
                  <dd className="text-ink">{valor}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-ink-muted">
              Fatos financeiros lidos do Certtus — somente leitura.
            </p>
          </Card.Body>
        </Card>

        {/* encargos — estado de processo do Cobrança RF */}
        <Card>
          <Card.Header>
            <Card.Title>Encargos do título</Card.Title>
            {encargos && (
              <span className="num label-mono text-ink-muted">
                Data-base · {formatarData(encargos.dataBase)}
              </span>
            )}
          </Card.Header>
          <Card.Body>
            {!encargos ? (
              <p className="text-sm text-ink-muted">
                {pago
                  ? 'Título pago — sem encargos em aberto.'
                  : 'Título não vencido — encargos passam a contar a partir do vencimento.'}
              </p>
            ) : (
              <dl className="num flex flex-col gap-2.5 font-mono text-sm">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="flex items-center gap-2 text-ink-muted">
                    Valor original <Tag variant="source">Certtus</Tag>
                  </dt>
                  <dd className="text-ink">{formatarMoeda(boleto.valor)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-muted">Multa · {MULTA_PCT * 100}%</dt>
                  <dd className="text-ink">{formatarMoeda(encargos.multa)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-muted">
                    Juros · {JUROS_MES_PCT * 100}% a.m. pro rata · {encargos.diasAtraso} dias
                  </dt>
                  <dd className="text-ink">{formatarMoeda(encargos.juros)}</dd>
                </div>
                {abonoAtivo && (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-ink-muted">
                      Abono ativo
                      {abonoAtivo.dataPromessaPagamento
                        ? ` · válido até ${formatarData(abonoAtivo.dataPromessaPagamento)}`
                        : ''}
                    </dt>
                    <dd className="text-success-fg">− {formatarMoeda(abatimento)}</dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-4 border-t border-line pt-2.5">
                  <dt className="font-semibold text-ink">
                    {abonoAtivo ? 'Valor final com abono' : 'Total atualizado'}
                  </dt>
                  <dd className="font-display text-lg font-bold text-ink">
                    {formatarMoeda(totalComAbono ?? encargos.totalAtualizado)}
                  </dd>
                </div>
              </dl>
            )}
            <p className="mt-4 text-xs leading-relaxed text-ink-muted">
              Encargos e abonos são estado de processo do Cobrança RF — o valor do título no
              Certtus permanece somente leitura. O abono é sempre sobre juros/multa, nunca sobre o
              principal.
            </p>
          </Card.Body>
          {encargos && podeAbonar && (
            <Card.Footer>
              {abonoAtivo ? (
                <span className="text-xs text-ink-muted">
                  Já existe um abono ativo — cancele-o na trilha abaixo para registrar outro.
                </span>
              ) : (
                <Button variant="secondary" size="sm" onClick={abrirModalAbono}>
                  <IconPercent size={14} />
                  Registrar abono
                </Button>
              )}
            </Card.Footer>
          )}
        </Card>
      </div>

      {/* trilha de abonos do título — imutável, com transições e cancelamento */}
      <Card className="mt-6">
        <Card.Header>
          <Card.Title>Abonos do título</Card.Title>
          <span className="num label-mono text-ink-muted">
            {abonosDoTitulo.length} {abonosDoTitulo.length === 1 ? 'registro' : 'registros'}
          </span>
        </Card.Header>
        <Card.Body className="flex flex-col gap-3">
          {abonosDoTitulo.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhum abono registrado para este título.</p>
          ) : (
            abonosDoTitulo.map((a) => (
              <AbonoItem key={a.id} abono={a} onCancelar={podeAbonar ? cancelar : undefined} />
            ))
          )}
        </Card.Body>
      </Card>

      {/* comunicações vinculadas a este título (régua + manuais) */}
      <Card className="mt-6">
        <Card.Header>
          <Card.Title>Contatos vinculados</Card.Title>
          <span className="num label-mono text-ink-muted">
            {comunicacoesDoTitulo.length}{' '}
            {comunicacoesDoTitulo.length === 1 ? 'registro' : 'registros'}
          </span>
        </Card.Header>
        <Card.Body className="flex flex-col gap-3">
          {comunicacoesDoTitulo.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Nenhum contato vinculado a este título. Os vínculos são feitos no registro de
              contato, na tela do cliente ou no Kanban.
            </p>
          ) : (
            comunicacoesDoTitulo.map((c) => <ComunicacaoItem key={c.id} com={c} />)
          )}
        </Card.Body>
      </Card>

      {/* registro de abono — direto, estado ativo, sem aprovação */}
      <Modal open={modalAbono} onClose={() => setModalAbono(false)}>
        <Modal.Header>Registrar abono de encargos</Modal.Header>
        <Modal.Body>
          {encargos && (
            <p className="mb-4">
              Encargos calculados: juros <b>{formatarMoeda(encargos.juros)}</b> · multa{' '}
              <b>{formatarMoeda(encargos.multa)}</b>. O abono nasce ativo — a trilha de auditoria
              registra tudo para a supervisão do admin.
            </p>
          )}
          <div className="flex flex-col gap-4">
            {/* tudo-ou-nada por componente: 100% dos juros e/ou 100% da multa */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-line px-3 py-2.5">
                <span className="text-sm font-medium text-ink">
                  Abonar juros
                  {encargos && (
                    <span className="num ml-2 font-mono text-xs text-ink-muted">
                      100% · {formatarMoeda(encargos.juros)}
                    </span>
                  )}
                </span>
                <Switch
                  checked={abonarJuros}
                  onChange={(v) => {
                    setAbonarJuros(v)
                    if (erroAbono) setErroAbono('')
                  }}
                  aria-label="Abonar 100% dos juros"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-line px-3 py-2.5">
                <span className="text-sm font-medium text-ink">
                  Abonar multa
                  {encargos && (
                    <span className="num ml-2 font-mono text-xs text-ink-muted">
                      100% · {formatarMoeda(encargos.multa)}
                    </span>
                  )}
                </span>
                <Switch
                  checked={abonarMulta}
                  onChange={(v) => {
                    setAbonarMulta(v)
                    if (erroAbono) setErroAbono('')
                  }}
                  aria-label="Abonar 100% da multa"
                />
              </label>
            </div>
            <Field
              label="Promessa de pagamento"
              helper="Opcional — define a validade do abono. Vencida sem quitação, o abono expira e os encargos voltam integrais."
            >
              <Input
                type="date"
                value={promessaStr}
                onChange={(e) => setPromessaStr(e.target.value)}
                className="w-44"
              />
            </Field>
            <Field label="Justificativa" helper="Opcional — entra na trilha do abono." error={erroAbono || undefined}>
              <Textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Ex.: Cliente negociou quitação à vista mediante redução dos juros."
                className="w-full"
              />
            </Field>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setModalAbono(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmarAbono}>Registrar abono</Button>
        </Modal.Footer>
      </Modal>

      {toastHost}
    </>
  )
}
