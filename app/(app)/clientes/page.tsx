'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  clientes,
  empresas,
  getEmpresaDoCliente,
  situacaoEfetiva,
  ORDEM_SEVERIDADE,
  type Cliente,
  type SituacaoCliente,
  type TipoCliente,
} from '../../../mocks'
import { Tag } from '../../../components/ui/Tag'
import { PageHeader } from '../../../components/ui/PageHeader'
import { SearchInput } from '../../../components/ui/SearchInput'
import { MultiSelectDropdown, type DropdownOption } from '../../../components/ui/MultiSelectDropdown'
import { DataTable, type Column } from '../../../components/ui/DataTable'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Money } from '../../../components/ui/Money'
import { ProcessBadge } from '../../../components/ui/ProcessBadge'
import { EmptyState } from '../../../components/ui/EmptyState'

const TIPO_LABEL: Record<TipoCliente, string> = {
  oficina: 'Oficina',
  transportadora: 'Transportadora',
  revenda: 'Revenda',
  frotista: 'Frotista',
  pf: 'Pessoa física',
  produtor: 'Produtor rural',
  orgao_publico: 'Órgão público',
}

const SIT_OPTIONS: DropdownOption[] = (['adimplente', 'atrasado', 'inadimplente'] as SituacaoCliente[]).map(
  (s) => ({
    value: s,
    label: { adimplente: 'Em dia', atrasado: 'Atrasado', inadimplente: 'Inadimplente' }[s],
    render: () => <StatusBadge status={s} />,
  }),
)

const TIPO_OPTIONS: DropdownOption[] = (Object.keys(TIPO_LABEL) as TipoCliente[]).map((t) => ({
  value: t,
  label: TIPO_LABEL[t],
}))

/* empresa recebedora — multi-seleção, vazio = todas */
const EMPRESA_OPTIONS: DropdownOption[] = empresas.map((e) => ({
  value: e.id,
  label: e.nome,
  render: () => <Tag variant="source">{e.nome}</Tag>,
}))

export default function Clientes() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState<Set<string>>(new Set())
  const [filtroSit, setFiltroSit] = useState<Set<string>>(new Set())
  const [filtroTipo, setFiltroTipo] = useState<Set<string>>(new Set())

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase()
    return clientes
      .filter((c) => {
        if (filtroEmpresa.size > 0 && !filtroEmpresa.has(getEmpresaDoCliente(c.id))) return false
        if (filtroSit.size > 0 && !filtroSit.has(situacaoEfetiva(c))) return false
        if (filtroTipo.size > 0 && !filtroTipo.has(c.tipo)) return false
        if (!q) return true
        return (
          c.nome.toLowerCase().includes(q) ||
          c.cidade.toLowerCase().includes(q) ||
          c.cnpjCpf.includes(q)
        )
      })
      // quem deve mais aparece primeiro — a lista já é priorização
      .sort((a, b) => b.saldoAberto - a.saldoAberto)
  }, [query, filtroEmpresa, filtroSit, filtroTipo])

  const colunas: Column<Cliente>[] = [
    {
      key: 'nome',
      header: 'Cliente',
      sortValue: (c) => c.nome,
      render: (c) => <span className="font-medium text-ink">{c.nome}</span>,
    },
    {
      key: 'tipo',
      header: 'Tipo',
      sortValue: (c) => TIPO_LABEL[c.tipo],
      render: (c) => <span className="text-neutral-700">{TIPO_LABEL[c.tipo]}</span>,
    },
    {
      key: 'doc',
      header: 'CNPJ / CPF',
      certtus: true,
      sortValue: (c) => c.cnpjCpf,
      render: (c) => <span className="num whitespace-nowrap font-mono text-neutral-700">{c.cnpjCpf}</span>,
    },
    {
      key: 'saldo',
      header: 'Em aberto',
      numeric: true,
      certtus: true,
      sortValue: (c) => c.saldoAberto,
      render: (c) => <Money value={c.saldoAberto} />,
    },
    {
      key: 'sit',
      header: 'Situação',
      center: true,
      sortValue: (c) => ORDEM_SEVERIDADE[situacaoEfetiva(c)],
      render: (c) => <StatusBadge status={situacaoEfetiva(c)} />,
    },
    {
      key: 'proc',
      header: 'Processo',
      sortValue: (c) => c.estadoProcesso,
      render: (c) =>
        c.estadoProcesso === 'normal' ? (
          <span className="text-ink-muted">—</span>
        ) : (
          <ProcessBadge estado={c.estadoProcesso} />
        ),
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Carteira"
        title="Clientes"
        description="Cadastro lido do Certtus, ordenado pelo maior saldo em aberto."
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Nome, cidade ou CNPJ…"
          className="w-full sm:w-72"
        />
        <MultiSelectDropdown
          selected={filtroEmpresa}
          onChange={setFiltroEmpresa}
          options={EMPRESA_OPTIONS}
          placeholder="Empresa"
        />
        <MultiSelectDropdown
          selected={filtroSit}
          onChange={setFiltroSit}
          options={SIT_OPTIONS}
          placeholder="Situação"
        />
        <MultiSelectDropdown
          selected={filtroTipo}
          onChange={setFiltroTipo}
          options={TIPO_OPTIONS}
          placeholder="Tipo"
        />
        <span className="num ml-auto font-mono text-xs text-ink-muted">{filtrados.length} clientes</span>
      </div>

      <div className="mt-4">
        <DataTable
          columns={colunas}
          rows={filtrados}
          rowKey={(c) => c.id}
          onRowClick={(c) => router.push(`/clientes/${c.id}`)}
          empty={
            <EmptyState title="Nenhum cliente encontrado" description="Ajuste a busca ou os filtros." />
          }
        />
      </div>
    </>
  )
}
