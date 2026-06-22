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
  templates,
  ancoraParaDias,
  statusEfetivo,
  situacaoEfetiva,
  ORDEM_SEVERIDADE,
  type Boleto,
  type Comunicacao,
  type EstadoProcesso,
  type ReguaCobranca,
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
  baixarDossieNegativacao,
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
import { ReguaFormModal, type ReguaFormValues } from '../../../../components/notificacoes/ReguaFormModal'
import { ReguaEtapasEditor } from '../../../../components/notificacoes/ReguaEtapasEditor'
import { type EtapaFormValues } from '../../../../components/notificacoes/NovaEtapaModal'
import { DataTable, type Column } from '../../../../components/ui/DataTable'
import { EmptyState } from '../../../../components/ui/EmptyState'
import { useToast } from '../../../../hooks/useToast'
import { IconChevronLeft, IconPause, IconPlay, IconZap, IconBan, IconPlus, IconDownload } from '../../../../components/icons'
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
  const [modalReguaEspecifica, setModalReguaEspecifica] = useState(false)
  // réguas em estado local: permite criar régua específica deste cliente (protótipo)
  // réguas vigentes do store (inclui etapas/réguas criadas em Réguas e
  // Notificações) + réguas específicas deste cliente, locais ao protótipo.
  // Só as específicas ('rc-') são editáveis aqui — as padrão, na config global.
  const reguasVigentes = useReguas()
  const [reguasCliente, setReguasCliente] = useState<ReguaCobranca[]>([])
  const listaReguas = useMemo(
    () => [...reguasVigentes, ...reguasCliente],
    [reguasVigentes, reguasCliente],
  )
  const [reguaId, setReguaId] = useState(reguas[0].id)
  const [reguaPendente, setReguaPendente] = useState(reguas[0].id)

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
          <Link href="/clientes">
            <Button variant="secondary">Voltar para clientes</Button>
          </Link>
        }
      />
    )
  }

  const regua = listaReguas.find((r) => r.id === reguaId) ?? listaReguas[0]
  const reguaEspecifica = regua.id.startsWith('rc-')
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

  function alternarExcecao() {
    const proxima = estadoProcesso === 'excecao' ? 'normal' : 'excecao'
    setEstadoProcesso(proxima)
    toast(proxima === 'excecao' ? 'Exceção manual registrada.' : 'Exceção revertida.')
  }

  function abrirNegativacao() {
    setMotivoNeg('')
    setModalNegativar(true)
  }

  function confirmarNegativacao() {
    const negativadoPor = sessao?.email ?? 'financeiro@retifica.com'
    const motivo = motivoNeg.trim() || undefined
    const registro = negativarCliente({ clienteId: id, negativadoPor, motivo })
    // gera o dossiê com o histórico completo do cliente para instruir a
    // negativação (executada fora do sistema)
    baixarDossieNegativacao(id, {
      negativadoPor: registro.negativadoPor,
      negativadoEm: registro.negativadoEm,
      motivo: registro.motivo,
    })
    setModalNegativar(false)
    toast('Cliente negativado · régua pausada e dossiê gerado.')
  }

  function reverter() {
    reverterNegativacao(id)
    toast('Negativação revertida · régua liberada para automação.')
  }

  function baixarDossie() {
    baixarDossieNegativacao(id, {
      negativadoPor: registroNeg?.negativadoPor,
      negativadoEm: registroNeg?.negativadoEm,
      motivo: registroNeg?.motivo,
    })
    toast('Dossiê de negativação gerado.')
  }

  function confirmarTrocaRegua() {
    setReguaId(reguaPendente)
    setModalRegua(false)
    toast('Régua do cliente atualizada.')
  }

  // edição da régua específica — altera apenas a régua deste cliente
  // (o editor só aparece para réguas 'rc-', que vivem em reguasCliente)
  function atualizarReguaCliente(transform: (r: ReguaCobranca) => ReguaCobranca) {
    setReguasCliente((prev) => prev.map((r) => (r.id === reguaId ? transform(r) : r)))
  }

  function alternarEtapaCliente(etapaId: string, ativo: boolean) {
    atualizarReguaCliente((r) => ({
      ...r,
      etapas: r.etapas.map((e) => (e.id === etapaId ? { ...e, ativo } : e)),
    }))
    toast(ativo ? 'Etapa ativada.' : 'Etapa desativada.')
  }

  function trocarTemplateEtapaCliente(etapaId: string, templateId: string) {
    atualizarReguaCliente((r) => ({
      ...r,
      etapas: r.etapas.map((e) => (e.id === etapaId ? { ...e, templateId } : e)),
    }))
    toast('Template da etapa atualizado.')
  }

  function adicionarEtapaCliente({ ancora, label, templateId, tipo }: EtapaFormValues) {
    const nova = {
      id: 'e-' + Date.now().toString(36),
      ancora,
      label,
      templateId,
      tipo,
      ativo: true,
      descricao:
        tipo === 'handoff' ? 'Aviso ao financeiro: tratamento manual da etapa.' : 'Etapa adicionada manualmente.',
    }
    atualizarReguaCliente((r) => ({
      ...r,
      etapas: [...r.etapas, nova].sort((a, b) => ancoraParaDias(a.ancora) - ancoraParaDias(b.ancora)),
    }))
    toast(`Etapa ${ancora} adicionada à régua do cliente.`)
  }

  function editarEtapaCliente(etapaId: string, { ancora, label, templateId, tipo }: EtapaFormValues) {
    atualizarReguaCliente((r) => ({
      ...r,
      etapas: r.etapas
        .map((e) => (e.id === etapaId ? { ...e, ancora, label, templateId, tipo } : e))
        .sort((a, b) => ancoraParaDias(a.ancora) - ancoraParaDias(b.ancora)),
    }))
    toast('Etapa atualizada.')
  }

  function removerEtapaCliente(etapaId: string) {
    atualizarReguaCliente((r) => ({
      ...r,
      etapas: r.etapas.filter((e) => e.id !== etapaId),
    }))
    toast('Etapa excluída da régua do cliente.')
  }

  function criarReguaEspecifica({ nome, descricao, baseId }: ReguaFormValues) {
    const base = listaReguas.find((r) => r.id === baseId)
    const nova: ReguaCobranca = {
      id: 'rc-' + Date.now().toString(36),
      nome,
      descricao: descricao || `Régua específica de ${cliente?.nome ?? 'cliente'}.`,
      perfil: 'padrao',
      ativa: true,
      etapas: (base?.etapas ?? []).map((e) => ({ ...e, id: `${e.id}-c` })),
    }
    setReguasCliente((prev) => [...prev, nova])
    setReguaId(nova.id)
    setModalReguaEspecifica(false)
    toast('Régua específica criada e aplicada ao cliente.')
  }

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
        href="/clientes"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-link hover:underline focus-ring rounded-sm"
      >
        <IconChevronLeft size={15} />
        Clientes
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
          gerar o dossiê e reverter. */}
      {podeOperarRegua && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-y border-line py-3">
          {negativado ? (
            <>
              <span className="inline-flex items-center gap-1.5 font-mono text-xs text-inadimplente-fg">
                <IconBan size={13} className="shrink-0" />
                Régua pausada por negativação · tratativa manual
              </span>
              <Button variant="secondary" size="sm" onClick={baixarDossie}>
                <IconDownload size={14} />
                Baixar dossiê
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
              <Button variant="secondary" size="sm" onClick={alternarExcecao}>
                <IconZap size={14} />
                {estadoProcesso === 'excecao' ? 'Reverter exceção' : 'Marcar exceção'}
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
                Régua padrão — para ajustar etapas só deste cliente,{' '}
                <button
                  type="button"
                  className="font-medium text-link hover:underline focus-ring rounded-sm"
                  onClick={() => setModalReguaEspecifica(true)}
                >
                  crie uma régua específica
                </button>
                .
              </span>
            </div>
          )}
        </Card>
      )}

      {/* edição da régua específica — etapas, templates e novos marcos, só deste cliente */}
      {tab === 'regua' && reguaEspecifica && (
        <Card className="mt-5">
          <Card.Header>
            <Card.Title>Etapas da régua</Card.Title>
            <span className="label-mono text-ink-muted">Só este cliente</span>
          </Card.Header>
          <ReguaEtapasEditor
            etapas={regua.etapas}
            templates={templates}
            editable={podeOperarRegua}
            reguaNome={regua.nome}
            onToggle={alternarEtapaCliente}
            onChangeTemplate={trocarTemplateEtapaCliente}
            onAddEtapa={adicionarEtapaCliente}
            onEditEtapa={editarEtapaCliente}
            onRemoveEtapa={removerEtapaCliente}
          />
        </Card>
      )}

      {tab === 'boletos' && (
        <div className="mt-5">
          <DataTable
            columns={colunasBoletos}
            rows={boletosCliente}
            rowKey={(b) => b.id}
            onRowClick={(b) => router.push(`/cobrancas/${b.id}`)}
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
            <li>é gerado um <b>dossiê</b> com o histórico completo do cliente para instruir a negativação.</li>
          </ul>
          <div className="mt-4">
            <Field label="Motivo (opcional)">
              <Textarea
                value={motivoNeg}
                onChange={(e) => setMotivoNeg(e.target.value)}
                placeholder="Descreva o motivo da negativação — consta no dossiê…"
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
            Negativar e gerar dossiê
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
                setModalReguaEspecifica(true)
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

      {/* criação de régua específica do cliente */}
      <ReguaFormModal
        open={modalReguaEspecifica}
        onClose={() => setModalReguaEspecifica(false)}
        onSubmit={criarReguaEspecifica}
        bases={listaReguas}
        titulo="Régua específica do cliente"
        nomeInicial={`Régua · ${cliente.nome}`}
      />

      {toastHost}
    </>
  )
}
