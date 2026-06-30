'use client'

import { Suspense, use, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  getClienteById,
  getBoletosDoCliente,
  getComunicacoesDoCliente,
  formatarMoeda,
  formatarData,
  reguas,
  statusEfetivo,
  ORDEM_SEVERIDADE,
  TIPO_CLIENTE_SINGULAR,
  ufDaCidade,
  tituloEmProtesto,
  type Boleto,
  type Comunicacao,
  type EstadoProcesso,
} from '../../../../mocks'
import { useReguas } from '../../../../hooks/useReguas'
import { getSession, podeAcessar } from '../../../../lib/auth'
import { processarAbonoDaComunicacao } from '../../../../lib/abonos'
import { baixarHistoricoNegativacao } from '../../../../lib/negativacao'
import { Button } from '../../../../components/ui/Button'
import { Card } from '../../../../components/ui/Card'
import { Modal } from '../../../../components/ui/Modal'
import { Tabs, type TabItem } from '../../../../components/ui/Tabs'
import { StatusBadge } from '../../../../components/ui/StatusBadge'
import { ProcessBadge } from '../../../../components/ui/ProcessBadge'
import { NegativadoBadge } from '../../../../components/ui/NegativadoBadge'
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

type TabId = 'regua' | 'titulos' | 'comunicacoes'

function gerarId() {
  return 'cm' + Date.now().toString(36)
}

function ClienteDetalheContent({ id }: { id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const cliente = getClienteById(id)

  const sessao = getSession()
  const perfil = sessao?.perfil ?? 'comercial'
  const podeOperarRegua = podeAcessar(perfil, 'reguas')
  const podeComunicar = podeAcessar(perfil, 'comunicacaoManual')
  // comercial vê apenas os dados principais do cliente — só a aba Títulos
  // (sem Régua nem Contatos)
  const ehComercial = perfil === 'comercial'

  const { toast, toastHost } = useToast()
  // aba inicial: comercial só tem Títulos; demais respeitam ?tab= (ex.: vindo de
  // Títulos), senão abrem na Régua
  const tabParam = searchParams.get('tab')
  const tabInicial: TabId = ehComercial
    ? 'titulos'
    : tabParam === 'titulos'
      ? 'titulos'
      : tabParam === 'comunicacoes'
        ? 'comunicacoes'
        : 'regua'
  const [tab, setTab] = useState<TabId>(tabInicial)
  const [estadoProcesso, setEstadoProcesso] = useState<EstadoProcesso>(cliente?.estadoProcesso ?? 'normal')
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

  // negativação é DERIVADA: cliente com título em protesto (Certtus) está
  // negativado — não há ação manual na plataforma
  const titulosEmProtesto = useMemo(
    () => boletosCliente.filter(tituloEmProtesto),
    [boletosCliente],
  )
  const negativado = titulosEmProtesto.length > 0

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
  // título em protesto (= negativado) pausa a régua por completo — tratativa
  // passa a ser manual
  const pausada = estadoProcesso === 'pausado' || negativado

  function alternarPausa() {
    const proxima = pausada ? 'normal' : 'pausado'
    setEstadoProcesso(proxima)
    toast(proxima === 'pausado' ? 'Régua pausada.' : 'Régua retomada.')
  }

  function baixarHistorico() {
    const numeros = titulosEmProtesto.map((b) => b.numero).join(', ')
    baixarHistoricoNegativacao(id, {
      motivo: numeros ? `Título(s) em protesto na Certtus: ${numeros}.` : undefined,
    })
    toast('Histórico do cliente gerado.')
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
      render: (b) => (
        <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
          <StatusBadge status={statusEfetivo(b)} dias={b.status === 'pago' ? undefined : b.diasAtraso} />
          {tituloEmProtesto(b) && (
            <span className="inline-flex items-center rounded-sm border border-inadimplente-border
              bg-inadimplente-bg px-2 py-0.5 font-mono text-xs font-medium text-inadimplente-fg">
              Em protesto
            </span>
          )}
        </span>
      ),
    },
  ]

  const tabs: TabItem<TabId>[] = [
    ...(ehComercial ? [] : [{ id: 'regua' as TabId, label: 'Régua de cobrança' }]),
    { id: 'titulos', label: 'Títulos', count: boletosCliente.length },
    ...(ehComercial ? [] : [{ id: 'comunicacoes' as TabId, label: 'Contatos', count: comunicacoes.length }]),
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
          {(negativado || estadoProcesso !== 'normal') && (
            <div className="flex flex-wrap items-center gap-2">
              {negativado ? <NegativadoBadge /> : <ProcessBadge estado={estadoProcesso} />}
            </div>
          )}
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink lg:text-3xl">
            {cliente.nome}
          </h1>
          <p className="mt-1 font-mono text-sm text-ink-muted">
            {TIPO_CLIENTE_SINGULAR[cliente.tipo]} · {cliente.cidade}/{ufDaCidade(cliente.cidade)} · {cliente.telefone} · {cliente.email}
          </p>
        </div>
        <div className="shrink-0">
          <FactGroup source={null}>
            <Fact label="CNPJ / CPF" value={cliente.cnpjCpf} />
            <Fact label="Saldo em aberto" value={formatarMoeda(cliente.saldoAberto)} />
          </FactGroup>
        </div>
      </div>

      {/* ações do processo. Negativado (= título em protesto na Certtus):
          automação desligada (tratativa 100% humana) — resta gerar o histórico.
          A negativação não é manual: vem do protesto, feito na Certtus. */}
      {podeOperarRegua && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-y border-line py-3">
          {negativado ? (
            <>
              <span className="inline-flex items-center gap-1.5 font-mono text-xs text-inadimplente-fg">
                <IconBan size={13} className="shrink-0" />
                Cliente negativado por protesto · régua pausada · tratativa manual
              </span>
              <span className="ml-auto">
                <Button variant="secondary" size="sm" onClick={baixarHistorico}>
                  <IconDownload size={14} />
                  Gerar histórico
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
            </>
          )}
        </div>
      )}

      <div className="mt-5">
        <Tabs items={tabs} value={tab} onChange={setTab} />
      </div>

      {!ehComercial && tab === 'regua' && (
        <Card className="mt-5">
          <Card.Header>
            <span className="flex flex-wrap items-center gap-2">
              <Card.Title>{regua.nome}</Card.Title>
              {reguaEspecifica && <Tag>Específica do cliente</Tag>}
            </span>
            <span className="label-mono text-ink-muted">
              {pausada
                ? 'Pausada'
                : boletosAbertos.length === 0
                  ? 'Sem títulos em aberto'
                  : `${boletosAbertos.length} ${boletosAbertos.length === 1 ? 'título' : 'títulos'} em aberto`}
            </span>
          </Card.Header>
          <Card.Body>
            {negativado && (
              <div className="mb-4 flex items-start gap-2 rounded-md border border-inadimplente-border
                bg-inadimplente-bg px-3 py-2.5 text-sm text-inadimplente-fg">
                <IconBan size={15} className="mt-0.5 shrink-0" />
                <span>
                  Cliente negativado por título em protesto na Certtus
                  {titulosEmProtesto.length > 0 ? ` (${titulosEmProtesto.map((b) => b.numero).join(', ')})` : ''}.
                  A régua está pausada e nenhum envio automático ocorre — a cobrança segue por tratativa manual.
                </span>
              </div>
            )}
            <p className="mb-5 max-w-2xl text-sm text-ink-muted">{regua.descricao}</p>
            <ReguaTimeline regua={regua} boletos={boletosAbertos} pausada={pausada} />
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

      {tab === 'titulos' && (
        <div className="mt-5">
          <DataTable
            columns={colunasBoletos}
            rows={boletosCliente}
            rowKey={(b) => b.id}
            empty={<EmptyState title="Nenhum título" description="Este cliente não possui títulos no Certtus." />}
          />
        </div>
      )}

      {!ehComercial && tab === 'comunicacoes' && (
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

// useSearchParams (?tab=) exige boundary de Suspense no App Router
export default function ClienteDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <Suspense fallback={null}>
      <ClienteDetalheContent id={id} />
    </Suspense>
  )
}
