'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  reguas,
  templates,
  notificacoes,
  ancoraParaDias,
  type ReguaCobranca,
  type NotificacaoHistorico,
  type StatusNotificacao,
  type Template,
} from '../../../mocks'
import { lerReguas, salvarReguas, atualizarReguaInfo } from '../../../lib/reguasStore'
import { useReguas } from '../../../hooks/useReguas'
import { getSession, podeAcessar } from '../../../lib/auth'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Tabs, type TabItem } from '../../../components/ui/Tabs'
import { Card } from '../../../components/ui/Card'
import { Tag } from '../../../components/ui/Tag'
import { Button } from '../../../components/ui/Button'
import { Alert } from '../../../components/ui/Alert'
import { Field } from '../../../components/ui/Field'
import { Textarea } from '../../../components/ui/Textarea'
import { DataTable, type Column } from '../../../components/ui/DataTable'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Modal } from '../../../components/ui/Modal'
import { useToast } from '../../../hooks/useToast'
import { IconPlus, IconTrash2, IconEdit } from '../../../components/icons'
import { WaPreview } from '../../../components/notificacoes/WaPreview'
import { ReguaFormModal, type ReguaFormValues } from '../../../components/notificacoes/ReguaFormModal'
import { ReguaEtapasEditor } from '../../../components/notificacoes/ReguaEtapasEditor'
import { type EtapaFormValues } from '../../../components/notificacoes/NovaEtapaModal'
import { NovoTemplateModal, type TemplateFormValues } from './_components/NovoTemplateModal'

type TabId = 'reguas' | 'templates' | 'historico' | 'fila'

const TAB_IDS: TabId[] = ['reguas', 'templates', 'historico', 'fila']

const STATUS_NOTIF: Record<StatusNotificacao, { label: string; dot: string }> = {
  agendada: { label: 'Agendada', dot: 'bg-info' },
  enviada: { label: 'Enviada', dot: 'bg-avencer-base' },
  entregue: { label: 'Entregue', dot: 'bg-steel-400' },
  lida: { label: 'Lida', dot: 'bg-pago-base' },
  respondida: { label: 'Respondida', dot: 'bg-pago-base' },
}

function NotifStatus({ status }: { status: StatusNotificacao }) {
  const { label, dot } = STATUS_NOTIF[status]
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-neutral-700">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

function dataHoraLegivel(iso: string) {
  const [data, hora] = iso.split('T')
  const [y, m, d] = data.split('-')
  return `${d}/${m}/${y} ${hora?.slice(0, 5) ?? ''}`
}

function gerarId(prefixo: string) {
  return prefixo + Date.now().toString(36)
}

function ReguasENotificacoesContent() {
  const perfil = getSession()?.perfil ?? 'comercial'
  const podeEditarRegua = podeAcessar(perfil, 'reguas')
  const podeEditarTemplate = podeAcessar(perfil, 'templates')
  const { toast, toastHost } = useToast()

  // atalhos de outras telas chegam como ?tab= (ex.: "Gerenciar etapas" do Kanban)
  const tabUrl = useSearchParams().get('tab') as TabId | null
  const [tab, setTab] = useState<TabId>(tabUrl && TAB_IDS.includes(tabUrl) ? tabUrl : 'reguas')

  // réguas no store compartilhado — o Kanban deriva seus marcos daqui e
  // alterações persistem entre telas e reloads (templates seguem locais)
  // só réguas globais nesta tela — as específicas de cliente vivem no detalhe
  const listaReguas = useReguas().filter((r) => !r.clienteId)
  const [reguaSelId, setReguaSelId] = useState(reguas[0].id)
  const [modalNovaRegua, setModalNovaRegua] = useState(false)
  const [modalEditarRegua, setModalEditarRegua] = useState(false)

  function atualizarReguas(transform: (rs: ReguaCobranca[]) => ReguaCobranca[]) {
    salvarReguas(transform(lerReguas()))
  }

  const [listaTemplates, setListaTemplates] = useState<Template[]>(templates)
  const [templateSelId, setTemplateSelId] = useState(templates[0].id)
  const [corpo, setCorpo] = useState(templates[0].corpo)
  const [salvando, setSalvando] = useState(false)
  const [modalNovoTemplate, setModalNovoTemplate] = useState(false)
  const [modalExcluirTemplate, setModalExcluirTemplate] = useState(false)

  const reguaSel = listaReguas.find((r) => r.id === reguaSelId) ?? listaReguas[0]
  const templateSel = listaTemplates.find((t) => t.id === templateSelId) ?? listaTemplates[0]

  const historico = notificacoes.filter((n) => n.status !== 'agendada')
  const fila = notificacoes.filter((n) => n.status === 'agendada')

  function alternarEtapa(etapaId: string, ativo: boolean) {
    atualizarReguas((prev) =>
      prev.map((r) =>
        r.id === reguaSelId
          ? { ...r, etapas: r.etapas.map((e) => (e.id === etapaId ? { ...e, ativo } : e)) }
          : r,
      ),
    )
    toast(ativo ? 'Marco ativado.' : 'Marco desativado.')
  }

  function atualizarTemplateEtapa(etapaId: string, templateId: string) {
    atualizarReguas((prev) =>
      prev.map((r) =>
        r.id === reguaSelId
          ? { ...r, etapas: r.etapas.map((e) => (e.id === etapaId ? { ...e, templateId } : e)) }
          : r,
      ),
    )
    toast('Template do marco atualizado.')
  }

  function adicionarEtapa({ ancora, label, templateId, tipo }: EtapaFormValues) {
    const nova = {
      id: gerarId('e-'),
      ancora,
      label,
      templateId,
      tipo,
      ativo: true,
      descricao:
        tipo === 'handoff' ? 'Aviso ao financeiro: tratamento manual do marco.' : 'Marco adicionado manualmente.',
    }
    atualizarReguas((prev) =>
      prev.map((r) =>
        r.id === reguaSelId
          ? {
              ...r,
              etapas: [...r.etapas, nova].sort(
                (a, b) => ancoraParaDias(a.ancora) - ancoraParaDias(b.ancora),
              ),
            }
          : r,
      ),
    )
    toast(`Marco ${ancora} adicionado à régua.`)
  }

  function editarEtapa(etapaId: string, { ancora, label, templateId, tipo }: EtapaFormValues) {
    atualizarReguas((prev) =>
      prev.map((r) =>
        r.id === reguaSelId
          ? {
              ...r,
              etapas: r.etapas
                .map((e) => (e.id === etapaId ? { ...e, ancora, label, templateId, tipo } : e))
                .sort((a, b) => ancoraParaDias(a.ancora) - ancoraParaDias(b.ancora)),
            }
          : r,
      ),
    )
    toast('Marco atualizado.')
  }

  function removerEtapa(etapaId: string) {
    atualizarReguas((prev) =>
      prev.map((r) =>
        r.id === reguaSelId ? { ...r, etapas: r.etapas.filter((e) => e.id !== etapaId) } : r,
      ),
    )
    toast('Marco excluído da régua.')
  }

  function criarRegua({ nome, descricao, baseId }: ReguaFormValues) {
    const base = listaReguas.find((r) => r.id === baseId)
    const nova: ReguaCobranca = {
      id: gerarId('r-'),
      nome,
      descricao: descricao || 'Régua criada a partir de ' + (base?.nome ?? 'modelo'),
      perfil: 'padrao',
      ativa: true,
      etapas: (base?.etapas ?? []).map((e) => ({ ...e, id: gerarId('e-') + e.ancora })),
    }
    atualizarReguas((prev) => [...prev, nova])
    setReguaSelId(nova.id)
    setModalNovaRegua(false)
    toast('Régua criada.')
  }

  function editarRegua({ nome, descricao }: ReguaFormValues) {
    atualizarReguaInfo(reguaSelId, nome, descricao)
    setModalEditarRegua(false)
    toast('Régua atualizada.')
  }

  // cria um template e o devolve já com id — usado pelo atalho dentro do modal
  // de marco (não troca o template selecionado no editor da aba Templates)
  function criarTemplateInline(values: TemplateFormValues): Template {
    const novo: Template = { id: gerarId('t-'), ...values }
    setListaTemplates((prev) => [...prev, novo])
    toast('Template criado. Aguarda aprovação do canal.')
    return novo
  }

  function selecionarTemplate(t: Template) {
    setTemplateSelId(t.id)
    setCorpo(t.corpo)
  }

  function salvarTemplate() {
    setSalvando(true)
    setTimeout(() => {
      setListaTemplates((prev) => prev.map((t) => (t.id === templateSelId ? { ...t, corpo } : t)))
      setSalvando(false)
      toast('Template salvo. Aguarda aprovação do canal.')
    }, 800)
  }

  function criarTemplate(values: TemplateFormValues) {
    const novo: Template = { id: gerarId('t-'), ...values }
    setListaTemplates((prev) => [...prev, novo])
    setTemplateSelId(novo.id)
    setCorpo(novo.corpo)
    setModalNovoTemplate(false)
    toast('Template criado. Aguarda aprovação do canal.')
  }

  // exclusão bloqueada se alguma etapa de régua usa o template — nenhuma
  // etapa pode ficar sem texto (nada sai sem template aprovado)
  const etapasUsandoTemplate = listaReguas
    .flatMap((r) => r.etapas)
    .filter((e) => e.templateId === templateSel.id).length
  const ultimoTemplate = listaTemplates.length <= 1
  const exclusaoBloqueada = etapasUsandoTemplate > 0 || ultimoTemplate

  function excluirTemplate() {
    const restantes = listaTemplates.filter((t) => t.id !== templateSel.id)
    setListaTemplates(restantes)
    selecionarTemplate(restantes[0])
    setModalExcluirTemplate(false)
    toast('Template excluído.')
  }

  const tabs: TabItem<TabId>[] = [
    { id: 'reguas', label: 'Réguas' },
    { id: 'templates', label: 'Templates' },
    { id: 'historico', label: 'Histórico', count: historico.length },
    { id: 'fila', label: 'Fila', count: fila.length },
  ]

  const colunasHistorico: Column<NotificacaoHistorico>[] = [
    {
      key: 'cliente',
      header: 'Cliente',
      sortValue: (n) => n.clienteNome,
      render: (n) => (
        <Link href={`/clientes/${n.clienteId}`} className="font-medium text-ink hover:text-link hover:underline">
          {n.clienteNome}
        </Link>
      ),
    },
    {
      key: 'etapa',
      header: 'Marco',
      sortValue: (n) => ancoraParaDias(n.etapa),
      render: (n) => <span className="num font-mono text-xs font-semibold text-link">{n.etapa}</span>,
    },
    {
      key: 'template',
      header: 'Template',
      sortValue: (n) => n.templateNome,
      render: (n) => <span className="text-neutral-700">{n.templateNome}</span>,
    },
    { key: 'canal', header: 'Canal', render: () => <Tag>WhatsApp</Tag> },
    {
      key: 'status',
      header: 'Status',
      sortValue: (n) => STATUS_NOTIF[n.status].label,
      render: (n) => <NotifStatus status={n.status} />,
    },
    {
      key: 'data',
      header: 'Envio',
      numeric: true,
      sortValue: (n) => n.dataEnvio,
      render: (n) => dataHoraLegivel(n.dataEnvio),
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Cobrança"
        title="Processo de Cobrança"
        description="A sequência de notificações de cada boleto, os textos enviados e o que já saiu."
      />

      <Tabs items={tabs} value={tab} onChange={setTab} />

      {tab === 'reguas' && (
        <div className="mt-5 grid grid-cols-1 items-start gap-6 lg:grid-cols-[280px_1fr]">
          {/* seletor de régua — só réguas padrão; as específicas de cliente
             vivem (e são editadas) no detalhe de cada cliente */}
          <div className="flex flex-col gap-3">
            <div className="label-mono text-ink-muted">Réguas padrão</div>
            {listaReguas.map((r) => {
              const ativa = r.id === reguaSelId
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setReguaSelId(r.id)}
                  className={`relative rounded-lg border bg-surface p-4 text-left transition-colors
                    duration-100 focus-ring
                    ${ativa ? 'border-line-strong shadow-sm' : 'border-line hover:bg-neutral-50'}`}
                >
                  {ativa && <span className="absolute bottom-3 left-0 top-3 w-[3px] rounded-r-sm bg-accent" />}
                  <div className="font-display text-base font-semibold text-ink">{r.nome}</div>
                  <p className="mt-1 text-xs leading-snug text-ink-muted">{r.descricao}</p>
                  <div className="num mt-2 font-mono text-xs text-ink-muted">
                    {r.etapas.filter((e) => e.ativo).length} marcos ativos
                  </div>
                </button>
              )
            })}
            {podeEditarRegua && (
              <Button variant="secondary" onClick={() => setModalNovaRegua(true)}>
                <IconPlus size={16} />
                Nova régua
              </Button>
            )}
            {!podeEditarRegua && (
              <Alert kind="info" title="Somente leitura.">
                O perfil comercial consulta a régua, mas não a altera.
              </Alert>
            )}
          </div>

          {/* etapas da régua selecionada */}
          <Card>
            <Card.Header>
              <span className="flex min-w-0 items-center gap-2">
                <Card.Title>{reguaSel.nome}</Card.Title>
                {podeEditarRegua && (
                  <Button variant="ghost" size="sm" onClick={() => setModalEditarRegua(true)}>
                    <IconEdit size={13} />
                    Editar régua
                  </Button>
                )}
              </span>
              <span className="label-mono text-ink-muted">D0 = vencimento</span>
            </Card.Header>
            <ReguaEtapasEditor
              etapas={reguaSel.etapas}
              templates={listaTemplates}
              editable={podeEditarRegua}
              reguaNome={reguaSel.nome}
              onToggle={alternarEtapa}
              onChangeTemplate={atualizarTemplateEtapa}
              onAddEtapa={adicionarEtapa}
              onEditEtapa={editarEtapa}
              onRemoveEtapa={removerEtapa}
              onCreateTemplate={podeEditarTemplate ? criarTemplateInline : undefined}
            />
          </Card>
        </div>
      )}

      {tab === 'templates' && (
        <div className="mt-5 grid grid-cols-1 items-start gap-6 xl:grid-cols-[260px_1fr_360px]">
          {/* templates — sem vínculo com marco: o marco da régua é quem
              escolhe o template, não o contrário */}
          <div className="flex flex-col gap-1.5">
            <div className="label-mono mb-1 text-ink-muted">Templates</div>
            {listaTemplates.map((t) => {
              const ativo = t.id === templateSel.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selecionarTemplate(t)}
                  className={`relative flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm
                    transition-colors duration-100 focus-ring
                    ${ativo ? 'bg-surface font-semibold text-ink shadow-xs' : 'text-neutral-700 hover:bg-neutral-100'}`}
                >
                  {ativo && <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-sm bg-accent" />}
                  <span className="truncate">{t.nome}</span>
                </button>
              )
            })}
            {podeEditarTemplate && (
              <Button variant="secondary" className="mt-2" onClick={() => setModalNovoTemplate(true)}>
                <IconPlus size={16} />
                Novo template
              </Button>
            )}
          </div>

          {/* editor */}
          <Card>
            <Card.Header>
              <Card.Title>{templateSel.nome}</Card.Title>
            </Card.Header>
            <Card.Body className="flex flex-col gap-4">
              {!podeEditarTemplate && (
                <Alert kind="info" title="Somente leitura." />
              )}
              <Field
                label="Corpo da mensagem"
                helper="Variáveis: [NOME] · [NÚMERO] · [VALOR] · [DATA]. Nenhuma mensagem sai sem template aprovado."
              >
                <Textarea
                  value={corpo}
                  onChange={(e) => setCorpo(e.target.value)}
                  disabled={!podeEditarTemplate}
                  className="min-h-56 w-full font-mono text-xs leading-relaxed"
                />
              </Field>
              {templateSel.corpo.startsWith('[Uso interno') && (
                <Alert kind="warning" title="Template de uso interno.">
                  Este marco é um aviso ao financeiro — o texto orienta o time e não é enviado ao cliente.
                </Alert>
              )}
            </Card.Body>
            {podeEditarTemplate && (
              <Card.Footer>
                {/* destrutiva isolada das demais (DS v5 slide 13) */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="mr-auto"
                  onClick={() => setModalExcluirTemplate(true)}
                >
                  <IconTrash2 size={13} />
                  Excluir template
                </Button>
                <Button variant="secondary" onClick={() => setCorpo(templateSel.corpo)}>
                  Descartar
                </Button>
                <Button isLoading={salvando} onClick={salvarTemplate}>
                  Salvar template
                </Button>
              </Card.Footer>
            )}
          </Card>

          {/* preview */}
          <div>
            <div className="label-mono mb-2 text-ink-muted">Preview · WhatsApp</div>
            <WaPreview corpo={corpo} />
          </div>
        </div>
      )}


      {tab === 'historico' && (
        <div className="mt-5">
          <DataTable
            columns={colunasHistorico}
            rows={historico}
            rowKey={(n) => n.id}
            empty={<EmptyState title="Nenhuma notificação enviada" />}
          />
        </div>
      )}

      {tab === 'fila' && (
        <div className="mt-5">
          <DataTable
            columns={colunasHistorico}
            rows={fila}
            rowKey={(n) => n.id}
            empty={
              <EmptyState
                title="Fila vazia"
                description="Nenhuma notificação agendada para os próximos marcos."
              />
            }
          />
        </div>
      )}

      <ReguaFormModal
        open={modalNovaRegua}
        onClose={() => setModalNovaRegua(false)}
        onSubmit={criarRegua}
        bases={listaReguas}
        titulo="Nova régua de cobrança"
      />

      {/* edição de nome e descrição da régua selecionada */}
      <ReguaFormModal
        open={modalEditarRegua}
        onClose={() => setModalEditarRegua(false)}
        onSubmit={editarRegua}
        bases={listaReguas}
        titulo={`Editar régua · ${reguaSel.nome}`}
        nomeInicial={reguaSel.nome}
        descricaoInicial={reguaSel.descricao}
        modo="editar"
      />

      <NovoTemplateModal
        open={modalNovoTemplate}
        onClose={() => setModalNovoTemplate(false)}
        onSubmit={criarTemplate}
      />

      {/* exclusão de template — bloqueada enquanto alguma etapa o usa */}
      <Modal open={modalExcluirTemplate} onClose={() => setModalExcluirTemplate(false)}>
        <Modal.Header>Excluir template?</Modal.Header>
        <Modal.Body>
          {etapasUsandoTemplate > 0 ? (
            <>
              <b>{templateSel.nome}</b> está em uso por{' '}
              <b>
                {etapasUsandoTemplate} {etapasUsandoTemplate === 1 ? 'marco' : 'marcos'}
              </b>{' '}
              de régua. Troque o template desses marcos antes de excluir — nenhuma notificação
              sai sem template aprovado.
            </>
          ) : ultimoTemplate ? (
            <>É o último template — os marcos da régua precisam de ao menos um para existir.</>
          ) : (
            <>
              <b>{templateSel.nome}</b> será removido da lista. Nenhum marco de régua o utiliza,
              então nada deixa de ser enviado.
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          {exclusaoBloqueada ? (
            <Button variant="secondary" onClick={() => setModalExcluirTemplate(false)}>
              Entendi
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setModalExcluirTemplate(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={excluirTemplate}>
                Excluir template
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>

      {toastHost}
    </>
  )
}

// useSearchParams exige boundary de Suspense no App Router
export default function ReguasENotificacoes() {
  return (
    <Suspense fallback={null}>
      <ReguasENotificacoesContent />
    </Suspense>
  )
}
