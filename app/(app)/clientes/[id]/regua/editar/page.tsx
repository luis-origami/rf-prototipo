'use client'

import { Suspense, use, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  getClienteById,
  templates as TEMPLATES_SEED,
  ancoraParaDias,
  type ReguaCobranca,
  type Template,
} from '../../../../../../mocks'
import { useReguas } from '../../../../../../hooks/useReguas'
import { lerReguas, salvarReguas } from '../../../../../../lib/reguasStore'
import { getSession, podeAcessar } from '../../../../../../lib/auth'
import { PageHeader } from '../../../../../../components/ui/PageHeader'
import { Card } from '../../../../../../components/ui/Card'
import { Button } from '../../../../../../components/ui/Button'
import { Tag } from '../../../../../../components/ui/Tag'
import { EmptyState } from '../../../../../../components/ui/EmptyState'
import { IconChevronLeft } from '../../../../../../components/icons'
import { ReguaEtapasEditor } from '../../../../../../components/notificacoes/ReguaEtapasEditor'
import { type EtapaFormValues } from '../../../../../../components/notificacoes/NovaEtapaModal'
import { useToast } from '../../../../../../hooks/useToast'

/* Tela dedicada de edição dos marcos da régua específica de um cliente.
   A edição NÃO acontece no detalhe do cliente — só aqui, alcançada pelo botão
   "Editar régua". Persiste no store (sobrevive à navegação e ao reload). */

function EditarReguaClienteContent({ id }: { id: string }) {
  const router = useRouter()
  const cliente = getClienteById(id)
  const perfil = getSession()?.perfil ?? 'comercial'
  const podeOperarRegua = podeAcessar(perfil, 'reguas')
  const { toast, toastHost } = useToast()

  const searchParams = useSearchParams()
  const reguaQuery = searchParams.get('regua')
  // chegada direto da criação — mesma tela, texto orientado a "definir marcos"
  const recemCriada = searchParams.get('nova') === '1'
  const reguasVigentes = useReguas()
  const reguasDoCliente = useMemo(
    () => reguasVigentes.filter((r) => r.clienteId === id),
    [reguasVigentes, id],
  )
  // alvo: a régua do query; senão a específica mais recente do cliente
  const regua =
    reguasDoCliente.find((r) => r.id === reguaQuery) ??
    reguasDoCliente[reguasDoCliente.length - 1]

  const [listaTemplates, setListaTemplates] = useState<Template[]>(TEMPLATES_SEED)

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

  if (!podeOperarRegua) {
    return (
      <EmptyState
        title="Acesso restrito"
        description="O perfil comercial consulta as réguas, mas não as edita."
        action={
          <Link href={`/clientes/${id}`}>
            <Button variant="secondary">Voltar ao cliente</Button>
          </Link>
        }
      />
    )
  }

  if (!regua) {
    return (
      <EmptyState
        title="Sem régua específica"
        description={`${cliente.nome} ainda não tem uma régua específica para editar.`}
        action={
          <Link href={`/clientes/${id}/regua/nova`}>
            <Button>Criar régua específica</Button>
          </Link>
        }
      />
    )
  }

  function atualizar(transform: (r: ReguaCobranca) => ReguaCobranca) {
    salvarReguas(lerReguas().map((r) => (r.id === regua.id ? transform(r) : r)))
  }

  function alternarEtapa(etapaId: string, ativo: boolean) {
    atualizar((r) => ({ ...r, etapas: r.etapas.map((e) => (e.id === etapaId ? { ...e, ativo } : e)) }))
    toast(ativo ? 'Marco ativado.' : 'Marco desativado.')
  }

  function trocarTemplate(etapaId: string, templateId: string) {
    atualizar((r) => ({ ...r, etapas: r.etapas.map((e) => (e.id === etapaId ? { ...e, templateId } : e)) }))
    toast('Template do marco atualizado.')
  }

  function adicionarEtapa({ ancora, label, templateId, tipo }: EtapaFormValues) {
    const nova = {
      id: 'e-' + Date.now().toString(36),
      ancora,
      label,
      templateId,
      tipo,
      ativo: true,
      descricao:
        tipo === 'handoff' ? 'Ação Manual: tratamento do marco pelo time.' : 'Marco adicionado manualmente.',
    }
    atualizar((r) => ({
      ...r,
      etapas: [...r.etapas, nova].sort((a, b) => ancoraParaDias(a.ancora) - ancoraParaDias(b.ancora)),
    }))
    toast(`Marco ${ancora} adicionado à régua.`)
  }

  function editarEtapa(etapaId: string, { ancora, label, templateId, tipo }: EtapaFormValues) {
    atualizar((r) => ({
      ...r,
      etapas: r.etapas
        .map((e) => (e.id === etapaId ? { ...e, ancora, label, templateId, tipo } : e))
        .sort((a, b) => ancoraParaDias(a.ancora) - ancoraParaDias(b.ancora)),
    }))
    toast('Marco atualizado.')
  }

  function removerEtapa(etapaId: string) {
    atualizar((r) => ({ ...r, etapas: r.etapas.filter((e) => e.id !== etapaId) }))
    toast('Marco excluído da régua.')
  }

  // cria um template e o devolve já com id — atalho dentro do modal de marco
  function criarTemplateInline(values: { nome: string; corpo: string }): Template {
    const novo: Template = { id: 't-' + Date.now().toString(36), ...values }
    setListaTemplates((prev) => [...prev, novo])
    toast('Template criado. Aguarda aprovação do canal.')
    return novo
  }

  return (
    <>
      <Link
        href={`/clientes/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-link hover:underline focus-ring rounded-sm"
      >
        <IconChevronLeft size={15} />
        {cliente.nome}
      </Link>

      <PageHeader
        eyebrow="Régua específica do cliente"
        title={recemCriada ? 'Régua criada — defina os marcos' : 'Editar régua'}
        description={
          recemCriada
            ? `Agora inclua/ajuste os marcos da régua de ${cliente.nome} — é aqui que você define quando e como cada aviso acontece.`
            : `Marcos da régua que vale só para ${cliente.nome}. As réguas padrão são editadas em Processo de Cobrança.`
        }
      />

      <Card className="mt-5">
        <Card.Header>
          <span className="flex flex-wrap items-center gap-2">
            <Card.Title>{regua.nome}</Card.Title>
            <Tag>Específica do cliente</Tag>
          </span>
          <span className="label-mono text-ink-muted">Só este cliente</span>
        </Card.Header>
        <ReguaEtapasEditor
          etapas={regua.etapas}
          templates={listaTemplates}
          editable={podeOperarRegua}
          reguaNome={regua.nome}
          onToggle={alternarEtapa}
          onChangeTemplate={trocarTemplate}
          onAddEtapa={adicionarEtapa}
          onEditEtapa={editarEtapa}
          onRemoveEtapa={removerEtapa}
          onCreateTemplate={criarTemplateInline}
        />
      </Card>

      <div className="mt-5">
        <Button
          variant={recemCriada ? 'primary' : 'secondary'}
          onClick={() => router.push(`/clientes/${id}`)}
        >
          {recemCriada ? 'Concluir — voltar ao cliente' : 'Concluir edição'}
        </Button>
      </div>

      {toastHost}
    </>
  )
}

export default function EditarReguaCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <Suspense fallback={null}>
      <EditarReguaClienteContent id={id} />
    </Suspense>
  )
}
