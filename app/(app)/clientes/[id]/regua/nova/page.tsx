'use client'

import { use, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getClienteById, reguas, type ReguaCobranca } from '../../../../../../mocks'
import { useReguas } from '../../../../../../hooks/useReguas'
import { adicionarRegua } from '../../../../../../lib/reguasStore'
import { getSession, podeAcessar } from '../../../../../../lib/auth'
import { PageHeader } from '../../../../../../components/ui/PageHeader'
import { Card } from '../../../../../../components/ui/Card'
import { Field } from '../../../../../../components/ui/Field'
import { Input } from '../../../../../../components/ui/Input'
import { Select } from '../../../../../../components/ui/Select'
import { Textarea } from '../../../../../../components/ui/Textarea'
import { Button } from '../../../../../../components/ui/Button'
import { EmptyState } from '../../../../../../components/ui/EmptyState'
import { IconChevronLeft } from '../../../../../../components/icons'

/* Tela de criação de régua específica de um cliente. Diferente da régua global
   (editada em Réguas e Notificações), a régua específica nasce de uma base,
   carrega o clienteId e passa a ser editável no detalhe do cliente. Persiste
   no store — sobrevive à navegação e ao reload. */

export default function NovaReguaCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const cliente = getClienteById(id)

  const perfil = getSession()?.perfil ?? 'comercial'
  const podeOperarRegua = podeAcessar(perfil, 'reguas')

  // só réguas globais servem de base — não outras específicas de cliente
  const bases = useReguas().filter((r) => !r.clienteId)

  const [nome, setNome] = useState(`Régua · ${cliente?.nome ?? 'cliente'}`)
  const [descricao, setDescricao] = useState('')
  const [baseId, setBaseId] = useState(bases[0]?.id ?? reguas[0].id)
  const [erro, setErro] = useState('')

  const base = useMemo(() => bases.find((b) => b.id === baseId), [bases, baseId])

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

  if (!podeOperarRegua) {
    return (
      <EmptyState
        title="Acesso restrito"
        description="O perfil comercial consulta as réguas, mas não as cria."
        action={
          <Link href={`/clientes/${id}`}>
            <Button variant="secondary">Voltar ao cliente</Button>
          </Link>
        }
      />
    )
  }

  function criar() {
    if (!nome.trim()) {
      setErro('Dê um nome à régua.')
      return
    }
    const novaId = 'rc-' + Date.now().toString(36)
    const nova: ReguaCobranca = {
      id: novaId,
      nome: nome.trim(),
      descricao: descricao.trim() || `Régua específica de ${cliente!.nome}.`,
      perfil: 'padrao',
      ativa: true,
      clienteId: id,
      etapas: (base?.etapas ?? []).map((e, i) => ({ ...e, id: `${e.id}-c${i}` })),
    }
    adicionarRegua(nova)
    // volta ao detalhe; a régua recém-criada é a específica mais recente e
    // já entra selecionada
    router.push(`/clientes/${id}`)
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
        title="Nova régua"
        description={`A régua nasce de uma base e passa a valer só para ${cliente.nome}. Ajuste os marcos depois de criar, no detalhe do cliente.`}
      />

      <Card className="mt-5 max-w-2xl">
        <Card.Body className="flex flex-col gap-4">
          <Field label="Nome" error={erro || undefined}>
            <Input
              value={nome}
              invalid={!!erro}
              onChange={(e) => {
                setNome(e.target.value)
                if (erro) setErro('')
              }}
              placeholder="Ex.: Régua Frotistas"
              className="w-full"
            />
          </Field>
          <Field
            label="Basear em"
            helper={
              base
                ? `${base.etapas.length} marcos copiados — ajuste depois de criar.`
                : 'Os marcos da régua base são copiados.'
            }
          >
            <Select value={baseId} onChange={(e) => setBaseId(e.target.value)} className="w-full">
              {bases.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Descrição" helper="Opcional — quando esta régua deve ser aplicada.">
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Cliente com acordo de parcelamento…"
              className="min-h-20 w-full"
            />
          </Field>
        </Card.Body>
        <Card.Footer>
          <Button variant="secondary" onClick={() => router.push(`/clientes/${id}`)}>
            Cancelar
          </Button>
          <Button onClick={criar}>Criar régua</Button>
        </Card.Footer>
      </Card>
    </>
  )
}
