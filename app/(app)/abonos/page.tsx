'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  formatarData,
  formatarMoeda,
  getBoletoById,
  getClienteById,
  type EstadoAbono,
} from '../../../mocks'
import { type Abono } from '../../../lib/abonos'
import { useAbonos } from '../../../hooks/useAbonos'
import { getSession, podeAcessar } from '../../../lib/auth'
import { PageHeader } from '../../../components/ui/PageHeader'
import { SearchInput } from '../../../components/ui/SearchInput'
import { Input } from '../../../components/ui/Input'
import { Tabs, type TabItem } from '../../../components/ui/Tabs'
import { DataTable, type Column } from '../../../components/ui/DataTable'
import { EmptyState } from '../../../components/ui/EmptyState'
import { EstadoAbonoBadge } from '../../../components/abonos/EstadoAbonoBadge'
import { Money } from '../../../components/ui/Money'

/* Visão consolidada de abonos — supervisão a posteriori do admin (substitui
   a aprovação prévia, que não existe por decisão do PO). Lista filtrável por
   período, cliente e estado; clicar abre o detalhamento completo. */

type TabId = 'ativo' | 'expirado' | 'aplicado' | 'cancelado' | 'todos'

const ORDEM_ESTADO: Record<EstadoAbono, number> = {
  ativo: 0,
  aplicado: 1,
  expirado: 2,
  cancelado: 3,
}

function clienteDoAbono(a: Abono) {
  const boleto = getBoletoById(a.boletoIds[0])
  return boleto ? getClienteById(boleto.clienteId) : undefined
}

export default function Abonos() {
  const router = useRouter()
  const sessao = getSession()
  const perfil = sessao?.perfil ?? 'comercial'
  const podeSupervisao = podeAcessar(perfil, 'abonosSupervisao')

  const abonos = useAbonos()
  const [tab, setTab] = useState<TabId>('todos')
  const [query, setQuery] = useState('')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase()
    return abonos
      .filter((a) => {
        if (tab !== 'todos' && a.estado !== tab) return false
        const dia = a.criadoEm.slice(0, 10)
        if (de && dia < de) return false
        if (ate && dia > ate) return false
        if (!q) return true
        const cliente = clienteDoAbono(a)
        return (
          a.boletoIds.some((id) => getBoletoById(id)?.numero.toLowerCase().includes(q)) ||
          (cliente?.nome.toLowerCase().includes(q) ?? false)
        )
      })
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
  }, [abonos, tab, query, de, ate])

  if (!podeSupervisao) {
    return (
      <EmptyState
        title="Acesso restrito"
        description="A visão consolidada de abonos é do perfil admin — supervisão a posteriori."
      />
    )
  }

  const porEstado = (e: EstadoAbono) => abonos.filter((a) => a.estado === e)

  const tabs: TabItem<TabId>[] = [
    { id: 'todos', label: 'Todos', count: abonos.length },
    { id: 'ativo', label: 'Ativos', count: porEstado('ativo').length },
    { id: 'expirado', label: 'Expirados', count: porEstado('expirado').length },
    { id: 'aplicado', label: 'Aplicados', count: porEstado('aplicado').length },
    { id: 'cancelado', label: 'Cancelados', count: porEstado('cancelado').length },
  ]

  const colunas: Column<Abono>[] = [
    {
      key: 'criado',
      header: 'Criado em',
      numeric: true,
      sortValue: (a) => a.criadoEm,
      render: (a) => formatarData(a.criadoEm.slice(0, 10)),
    },
    {
      key: 'cliente',
      header: 'Cliente',
      sortValue: (a) => clienteDoAbono(a)?.nome ?? '',
      render: (a) => <span className="font-medium text-ink">{clienteDoAbono(a)?.nome ?? '—'}</span>,
    },
    {
      key: 'titulos',
      header: 'Títulos',
      certtus: true,
      sortValue: (a) => a.boletoIds.length,
      render: (a) => {
        const primeiro = getBoletoById(a.boletoIds[0])
        return (
          <span className="num whitespace-nowrap font-mono text-neutral-700">
            {primeiro?.numero ?? '—'}
            {a.boletoIds.length > 1 && (
              <span className="ml-1.5 text-ink-muted">+{a.boletoIds.length - 1}</span>
            )}
          </span>
        )
      },
    },
    {
      key: 'abonado',
      header: 'Abonado',
      numeric: true,
      sortValue: (a) => a.jurosAbonado + a.multaAbonada,
      render: (a) => <Money value={a.jurosAbonado + a.multaAbonada} />,
    },
    {
      key: 'final',
      header: 'Valor final',
      numeric: true,
      sortValue: (a) => a.valorFinal,
      render: (a) => <Money value={a.valorFinal} />,
    },
    {
      key: 'validade',
      header: 'Validade',
      numeric: true,
      sortValue: (a) => a.dataPromessaPagamento ?? '',
      render: (a) =>
        a.dataPromessaPagamento ? (
          formatarData(a.dataPromessaPagamento)
        ) : (
          <span className="text-ink-muted">—</span>
        ),
    },
    {
      key: 'estado',
      header: 'Estado',
      center: true,
      sortValue: (a) => ORDEM_ESTADO[a.estado],
      render: (a) => <EstadoAbonoBadge estado={a.estado} />,
    },
    {
      key: 'por',
      header: 'Criado por',
      sortValue: (a) => a.criadoPor,
      render: (a) => <span className="font-mono text-xs text-ink-muted">{a.criadoPor}</span>,
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Supervisão"
        title="Abonos de encargos"
        description="Todos os abonos concedidos pela operação — criação direta, sem aprovação prévia; o controle é esta trilha. Clique para ver o detalhamento completo."
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Cliente ou título…"
          className="w-full sm:w-72"
        />
        <div className="flex items-center gap-2">
          <label className="label-mono text-ink-muted" htmlFor="abono-de">
            Criado entre
          </label>
          <Input
            id="abono-de"
            type="date"
            aria-label="Criação — data inicial"
            value={de}
            onChange={(e) => setDe(e.target.value)}
            className="w-40"
          />
          <span className="text-sm text-ink-muted">e</span>
          <Input
            type="date"
            aria-label="Criação — data final"
            value={ate}
            onChange={(e) => setAte(e.target.value)}
            className="w-40"
          />
        </div>
        <span className="num ml-auto font-mono text-xs text-ink-muted">
          {filtrados.length} {filtrados.length === 1 ? 'abono' : 'abonos'} ·{' '}
          {formatarMoeda(filtrados.reduce((s, a) => s + a.jurosAbonado + a.multaAbonada, 0))} abonados
        </span>
      </div>

      <div className="mt-4">
        <Tabs items={tabs} value={tab} onChange={setTab} />
      </div>

      <div className="mt-4">
        <DataTable
          columns={colunas}
          rows={filtrados}
          rowKey={(a) => a.id}
          onRowClick={(a) => router.push(`/abonos/${a.id}`)}
          empty={
            <EmptyState
              title="Nenhum abono aqui"
              description="Os abonos concedidos nos títulos e nos contatos aparecem nesta trilha."
            />
          }
        />
      </div>
    </>
  )
}
