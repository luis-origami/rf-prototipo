'use client'

import { use, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  getClienteById,
  getBoletosDoCliente,
  getComunicacoesDoCliente,
  formatarMoeda,
  formatarData,
  reguas,
  statusEfetivo,
  situacaoEfetiva,
  ORDEM_SEVERIDADE,
  type Boleto,
  type Comunicacao,
  type EstadoProcesso,
} from '../../../../mocks'
import { useReguas } from '../../../../hooks/useReguas'
import { useNegativacoes } from '../../../../hooks/useNegativacoes'
import { getSession, podeAcessar } from '../../../../lib/auth'
import { processarAbonoDaComunicacao } from '../../../../lib/abonos'
import {
  isNegativado,
  getNegativacao,
  negativarCliente,
  reverterNegativacao,
  baixarHistoricoNegativacao,
} from '../../../../lib/negativacao'
import { Button } from '../../../../components/ui/Button'
import { Card } from '../../../../components/ui/Card'
import { Modal } from '../../../../components/ui/Modal'
import { Tabs, type TabItem } from '../../../../components/ui/Tabs'
import { StatusBadge } from '../../../../components/ui/StatusBadge'
import { ProcessBadge } from '../../../../components/ui/ProcessBadge'
import { NegativadoBadge } from '../../../../components/ui/NegativadoBadge'
import { Textarea } from '../../../../components/ui/Textarea'
import { Fact, FactGroup } from '../../../../components/ui/Fact'
import { Money } from '../../../../components/ui/Money'
import { Tag } from '../../../../components/ui/Tag'
import { Select } from '../../../../components/ui/Select'
import { Field } from '../../../../components/ui/Field'
import { DataTable, type Column } from '../../../../components/ui/DataTable'
import { EmptyState } from '../../../../components/ui/EmptyState'
import { useToast } from '../../../../hooks/useToast'
import { IconChevronLeft, IconPause, IconPlay, IconBan, IconPlus, IconDownload, IconEdit } from '../../../../components/icons'
import { ReguaTimeline } from './_components/ReguaTimeline'
import { ComunicacaoItem } from '../../../../components/comunicacoes/ComunicacaoItem'
import { ComunicacaoForm, type ComunicacaoFormValues } from './_components/ComunicacaoForm'

type TabId = 'regua' | 'boletos' | 'comunicacoes'

function gerarId() {
  return 'cm' + Date.now().toString(36)
}

export default function ClienteDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const cliente = getClienteById(id)

  const sessao = getSession()
  const perfil = sessao?.perfil ?? 'comercial'
  const podeOperarRegua = podeAcessar(perfil, 'reguas')
  const podeComunicar = podeAcessar(perfil, 'comunicacaoManual')

  const { toast, toastHost } = useToast()
  const negativacoes = useNegativacoes()
  const negativado = isNegativado(id, negativacoes)
  const registroNeg = getNegativacao(id, negativacoes)
  const [tab, setTab] = useState<TabId>('regua')
  const [estadoProcesso, setEstadoProcesso] = useState<EstadoProcesso>(cliente?.estadoProcesso ?? 'normal')
  const [modalNegativar, setModalNegativar] = useState(false)
  const [motivoNeg, setMotivoNeg] = useState('')
  const [modalRegua, setModalRegua] = useState(false)
  // réguas vigentes do store: config global + específicas de cliente (que
  // persistem com clienteId). As específicas deste cliente são editáveis aqui;
  // as globais, na configuração de Réguas e Notificações.
  const reguasVigentes = useReguas()
  const reguasDoCliente = useMemo(
    () => reguasVigentes.filter((r) => r.clienteId === id),
    [reguasVigentes, id],
  )
  const listaReguas = useMemo(
    () => [...reguasVigentes.filter((r) => !r.clienteId), ...reguasDoCliente],
    [reguasVigentes, reguasDoCliente],
  )
  // ao abrir, prioriza a régua específica mais recente do cliente, se houver
  const [reguaId, setReguaId] = useState(
    () => reguasDoCliente[reguasDoCliente.length - 1]?.id ?? reguas[0].id,
  )
  const [reguaPendente, setReguaPendente] = useState(reguaId)

  const [comunicacoes, setComunicacoes] = useState<Comunicacao[]>(() => getComunicacoesDoCliente(id))
  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState<Comunicacao | null>(null)

  const boletosCliente = useMemo(
    () => getBoletosDoCliente(id).sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
    [id],
  )

  // títulos em aberto — opções de vínculo no registro de comunicação
  const boletosAbertos = useMemo(
    () => boletosCliente.filter((b) => b.status !== 'pago' && b.status !== 'pago_atraso'),
    [boletosCliente],
  )

  if (!cliente) {
    return (
      <EmptyState
        title="Cliente não encontrado"
        description="O registro pode ter sido removido do Certtus."
        action={
          <Link href="/titulos">
            <Button variant="secondary">Voltar para títulos</Button>
          </Link>
        }
      />
    )
  }

  const regua = listaReguas.find((r) => r.id === reguaId) ?? listaReguas[0]
  const reguaEspecifica = !!regua.clienteId
  const piorAtraso = boletosCliente
    .filter((b) => b.status === 'atrasado' || b.status === 'inadimplente')
    .reduce<number | null>((max, b) => Math.max(max ?? 0, b.diasAtraso ?? 0), null)
  // negativação pausa a régua por completo — tratativa passa a ser manual
  const pausada = estadoProcesso === 'pausado' || negativado

  function alternarPausa() {
    const proxima = pausada ? 'normal' : 'pausado'
    setEstadoProcesso(proxima)
    toast(proxima === 'pausado' ? 'Régua pausada.' : 'Régua retomada.')
  }

  function abrirNegativacao() {
    setMotivoNeg('')
    setModalNegativar(true)
  }

  function confirmarNegativacao() {
    const negativadoPor = sessao?.email ?? 'financeiro@retifica.com'
    const motivo = motivoNeg.trim() || undefined
    const registro = negativarCliente({ clienteId: id, negativadoPor, motivo })
    // gera o histórico completo do cliente para instruir a negativação
    // (executada fora do sistema)
    baixarHistoricoNegativacao(id, {
      negativadoPor: registro.negativadoPor,
      negativadoEm: registro.negativadoEm,
      motivo: registro.motivo,
    })
    setModalNegativar(false)
    toast('Cliente negativado · régua pausada e histórico gerado.')
  }

  function reverter() {
    reverterNegativacao(id)
    toast('Negativação revertida · régua liberada para automação.')
  }

  function baixarHistorico() {
    baixarHistoricoNegativacao(id, {
      negativadoPor: registroNeg?.negativadoPor,
      negativadoEm: registroNeg?.negativadoEm,
      motivo: registroNeg?.motivo,
    })
    toast('Histórico de negativação gerado.')
  }

  function confirmarTrocaRegua() {
    setReguaId(reguaPendente)
    setModalRegua(false)
    toast('Régua do cliente atualizada.')
  }

  // a edição dos marcos da régua específica vive em tela dedicada
  // (/clientes/[id]/regua/editar) — nunca no detalhe do cliente

  function salvarComunicacao(values: ComunicacaoFormValues) {
    const promessa = values.promessaData
      ? { data: values.promessaData, situacao: 'pendente' as const }
      : undefined
    if (editando) {
      setComunicacoes((prev) =>
        prev.map((c) =>
          c.id === editando.id
            ? { ...c, canal: values.canal, conteudo: values.conteudo, proximaAcao: values.proximaAcao || undefined, promessaPagamento: promessa, boletoIds: values.boletoIds }
            : c,
        ),
      )
      toast('Registro atualizado.')
    } else {
      // abono opcional: vincula o ativo existente ou cria direto (sem
      // aprovação) e congela o snapshot do que foi comunicado — auditoria
      const abonoVinculo = processarAbonoDaComunicacao(values.abono, {
        dataPromessaPagamento: values.promessaData || undefined,
        criadoPor: sessao?.email ?? 'financeiro@retifica.com',
      })
      setComunicacoes((prev) => [
        {
          id: gerarId(),
          clienteId: id,
          etapa: 'Manual',
          canal: values.canal,
          origem: 'manual',
          dataHora: new Date().toISOString(),
          conteudo: values.conteudo,
          status: 'registrada',
          promessaPagamento: promessa,
          proximaAcao: values.proximaAcao || undefined,
          criadoPor: sessao?.email,
          boletoIds: values.boletoIds,
          abonoId: abonoVinculo?.abonoId,
          abonoSnapshot: abonoVinculo?.abonoSnapshot,
        },
        ...prev,
      ])
      toast(values.abono ? 'Contato registrado com abono vinculado.' : 'Contato registrado.')
    }
    setFormAberto(false)
    setEditando(null)
  }

  function excluirComunicacao(commId: string) {
    setComunicacoes((prev) => prev.filter((c) => c.id !== commId))
    toast('Registro excluído.')
  }

  const colunasBoletos: Column<Boleto>[] = [
    {
      key: 'numero',
      header: 'Boleto',
      certtus: true,
      sortValue: (b) => b.numero,
      render: (b) => <span className="num whitespace-nowrap font-mono text-neutral-700">{b.numero}</span>,
    },
    {
      key: 'desc',
      header: 'Serviço',
      sortValue: (b) => b.descricao,
      render: (b) => <span className="text-neutral-700">{b.descricao}</span>,
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
      key: 'status',
      header: 'Status',
      center: true,
      sortValue: (b) => ORDEM_SEVERIDADE[statusEfetivo(b)] * 1000 + (b.diasAtraso ?? 0),
      render: (b) => <StatusBadge status={statusEfetivo(b)} dias={b.status === 'pago' ? undefined : b.diasAtraso} />,
    },
  ]

  const tabs: TabItem<TabId>[] = [
    { id: 'regua', label: 'Régua de cobrança' },
    { id: 'boletos', label: 'Boletos', count: boletosCliente.length },
    { id: 'comunicacoes', label: 'Contatos', count: comunicacoes.length },
  ]

  const comunicacoesOrdenadas = [...comunicacoes].sort((a, b) => b.dataHora.localeCompare(a.dataHora))

  return (
    <>
      <Link
        href="/titulos"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-link hover:underline focus-ring rounded-sm"
      >
        <IconChevronLeft size={15} />
        Títulos
      </Link>

      {/* cabeçalho da entidade */}
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label-mono text-ink-muted">{cliente.tipo}</span>
            <StatusBadge status={situacaoEfetiva(cliente)} />
            {negativado ? <NegativadoBadge /> : <ProcessBadge estado={estadoProcesso} />}
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink lg:text-3xl">
            {cliente.nome}
          </h1>
          <p className="mt-1 font-mono text-sm text-ink-muted">
            {cliente.cidade} · {cliente.telefone} · {cliente.email}
          </p>
        </div>
        <div className="shrink-0">
          <FactGroup>
            <Fact label="CNPJ / CPF" value={cliente.cnpjCpf} />
            <Fact label="Saldo em aberto" value={formatarMoeda(cliente.saldoAberto)} />
          </FactGroup>
        </div>
      </div>

      {/* ações do processo — destrutiva isolada à direita (DS v5 slide 13).
          Negativado: automação desligada (tratativa 100% humana) — só restam
          gerar o histórico e reverter. */}
      {podeOperarRegua && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-y border-line py-3">
          {negativado ? (
            <>
              <span className="inline-flex items-center gap-1.5 font-mono text-xs text-inadimplente-fg">
                <IconBan size={13} className="shrink-0" />
                Régua pausada por negativação · tratativa manual
              </span>
              <Button variant="secondary" size="sm" onClick={baixarHistorico}>
                <IconDownload size={14} />
                Baixar histórico
              </Button>
              <span className="ml-auto">
                <Button variant="secondary" size="sm" onClick={reverter}>
                  <IconPlay size={14} />
                  Reverter negativação
                </Button>
              </span>
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={alternarPausa}>
                {pausada ? <IconPlay size={14} /> : <IconPause size={14} />}
                {pausada ? 'Retomar régua' : 'Pausar régua'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { setReguaPendente(reguaId); setModalRegua(true) }}>
                Trocar régua
              </Button>
              <span className="ml-auto">
                <Button variant="destructive" size="sm" onClick={abrirNegativacao}>
                  <IconBan size={14} />
                  Negativar
                </Button>
              </span>
            </>
          )}
        </div>
      )}

      <div className="mt-5">
        <Tabs items={tabs} value={tab} onChange={setTab} />
      </div>

      {tab === 'regua' && (
        <Card className="mt-5">
          <Card.Header>
            <span className="flex flex-wrap items-center gap-2">
              <Card.Title>{regua.nome}</Card.Title>
              {reguaEspecifica && <Tag>Específica do cliente</Tag>}
            </span>
            <span className="label-mono text-ink-muted">
              {pausada ? 'Pausada' : piorAtraso != null ? `Posição · D+${piorAtraso}` : 'Sem atraso'}
            </span>
          </Card.Header>
          <Card.Body>
            {negativado && (
              <div className="mb-4 flex items-start gap-2 rounded-md border border-inadimplente-border
                bg-inadimplente-bg px-3 py-2.5 text-sm text-inadimplente-fg">
                <IconBan size={15} className="mt-0.5 shrink-0" />
                <span>
                  Cliente negativado{registroNeg ? ` em ${formatarData(registroNeg.negativadoEm.slice(0, 10))}` : ''}.
                  A régua está pausada e nenhum envio automático ocorre — a cobrança segue por tratativa manual.
                </span>
              </div>
            )}
            <p className="mb-5 max-w-2xl text-sm text-ink-muted">{regua.descricao}</p>
            <ReguaTimeline regua={regua} diasAtraso={piorAtraso} pausada={pausada} />
          </Card.Body>
          {/* régua padrão é editada na configuração global; aqui só a específica */}
          {!reguaEspecifica && podeOperarRegua && (
            <div className="border-t border-line bg-neutral-50 px-5 py-3">
              <span className="text-xs text-ink-muted">
                Régua padrão — para ajustar marcos só deste cliente,{' '}
                <button
                  type="button"
                  className="font-medium text-link hover:underline focus-ring rounded-sm"
                  onClick={() => router.push(`/clientes/${id}/regua/nova`)}
                >
                  crie uma régua específica
                </button>
                .
              </span>
            </div>
          )}
          {/* régua específica: edição dos marcos em tela dedicada */}
          {reguaEspecifica && podeOperarRegua && (
            <div className="border-t border-line bg-neutral-50 px-5 py-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/clientes/${id}/regua/editar?regua=${regua.id}`)}
              >
                <IconEdit size={14} />
                Editar régua
              </Button>
            </div>
          )}
        </Card>
      )}

      {tab === 'boletos' && (
        <div className="mt-5">
          <DataTable
            columns={colunasBoletos}
            rows={boletosCliente}
            rowKey={(b) => b.id}
            onRowClick={(b) => router.push(`/titulos/${b.id}`)}
            empty={<EmptyState title="Nenhum boleto" description="Este cliente não possui títulos no Certtus." />}
          />
        </div>
      )}

      {tab === 'comunicacoes' && (
        <div className="mt-5 flex flex-col gap-3">
          {podeComunicar && !formAberto && (
            <div>
              <Button variant="secondary" size="sm" onClick={() => { setEditando(null); setFormAberto(true) }}>
                <IconPlus size={14} />
                Registrar contato
              </Button>
            </div>
          )}
          {formAberto && (
            <ComunicacaoForm
              inicial={editando ?? undefined}
              boletosAbertos={boletosAbertos}
              clienteNome={cliente.nome}
              onSave={salvarComunicacao}
              onCancel={() => { setFormAberto(false); setEditando(null) }}
            />
          )}
          {comunicacoesOrdenadas.length === 0 ? (
            <EmptyState
              title="Nenhum contato"
              description="Notificações automáticas e contatos manuais aparecem aqui."
            />
          ) : (
            comunicacoesOrdenadas.map((c) => (
              <ComunicacaoItem
                key={c.id}
                com={c}
                onEdit={podeComunicar ? (com) => { setEditando(com); setFormAberto(true) } : undefined}
                onDelete={podeComunicar ? excluirComunicacao : undefined}
              />
            ))
          )}
        </div>
      )}

      {/* negativação — confirmação destrutiva; nunca a opção destacada por padrão */}
      <Modal open={modalNegativar} onClose={() => setModalNegativar(false)}>
        <Modal.Header>Negativar cliente?</Modal.Header>
        <Modal.Body>
          <p className="text-sm text-neutral-700">
            Marca <b>{cliente.nome}</b> como negativado. A marcação é apenas visual — o sistema{' '}
            <b>não</b> aciona órgão de proteção ao crédito. Ao confirmar:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-neutral-700">
            <li>a régua de cobrança é <b>pausada por completo</b> — nenhum envio automático;</li>
            <li>a tratativa passa a ser <b>100% humana</b> (só contatos manuais seguem);</li>
            <li>é gerado um <b>histórico</b> completo do cliente para instruir a negativação.</li>
          </ul>
          <div className="mt-4">
            <Field label="Motivo (opcional)">
              <Textarea
                value={motivoNeg}
                onChange={(e) => setMotivoNeg(e.target.value)}
                placeholder="Descreva o motivo da negativação — consta no histórico…"
                rows={3}
              />
            </Field>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setModalNegativar(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirmarNegativacao}>
            <IconBan size={14} />
            Negativar e gerar histórico
          </Button>
        </Modal.Footer>
      </Modal>

      {/* troca de régua */}
      <Modal open={modalRegua} onClose={() => setModalRegua(false)}>
        <Modal.Header>Trocar régua de cobrança</Modal.Header>
        <Modal.Body>
          <Field label="Régua" helper="A nova régua passa a valer para os próximos marcos.">
            <Select value={reguaPendente} onChange={(e) => setReguaPendente(e.target.value)} className="w-full">
              {listaReguas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </Select>
          </Field>
          <div className="mt-4 border-t border-line pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setModalRegua(false)
                router.push(`/clientes/${id}/regua/nova`)
              }}
            >
              <IconPlus size={14} />
              Criar régua específica para este cliente
            </Button>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setModalRegua(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmarTrocaRegua}>Aplicar régua</Button>
        </Modal.Footer>
      </Modal>

      {toastHost}
    </>
  )
}
