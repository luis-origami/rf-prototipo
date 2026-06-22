'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  formatarData,
  getBoletoById,
  getClienteById,
} from '../../../mocks'
import { abonosDoBoleto, valorFinalDoBoleto } from '../../../lib/abonos'
import { type RetornoManualNegociacao, type SituacaoNegociacao } from '../../../lib/negociacoes'
import { useAbonos } from '../../../hooks/useAbonos'
import { useNegociacoes } from '../../../hooks/useNegociacoes'
import { getSession, getUsuarios, podeAcessar } from '../../../lib/auth'
import { PageHeader } from '../../../components/ui/PageHeader'
import { SearchInput } from '../../../components/ui/SearchInput'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'
import { DataTable, type Column } from '../../../components/ui/DataTable'
import { EmptyState } from '../../../components/ui/EmptyState'
import { SituacaoNegociacaoBadge } from '../../../components/abonos/SituacaoNegociacaoBadge'
import { Money } from '../../../components/ui/Money'
import { MultiSelectDropdown, type DropdownOption } from '../../../components/ui/MultiSelectDropdown'

/* Histórico de negociações — retornos manuais à régua registrados pela
   operação. Supervisão a posteriori do admin. */

function clienteDoRetorno(r: RetornoManualNegociacao) {
  const boleto = getBoletoById(r.boletoId)
  return boleto ? getClienteById(boleto.clienteId) : undefined
}

function nomeDoUsuario(email: string): string {
  return getUsuarios().find((u) => u.email === email)?.nome ?? email
}

const ABONO_OPTIONS: DropdownOption[] = [
  { value: 'com_abono', label: 'Com abono' },
  { value: 'sem_abono', label: 'Sem abono' },
]

// ordenação da coluna Estado: aberta → descumprida → retornada
const ORDEM_SITUACAO: Record<SituacaoNegociacao, number> = {
  aberta: 0,
  descumprida: 1,
  retornada: 2,
}

export default function Negociacoes() {
  const router = useRouter()
  const sessao = getSession()
  const perfil = sessao?.perfil ?? 'comercial'
  const podeSupervisao = podeAcessar(perfil, 'abonosSupervisao')

  const abonos = useAbonos()
  const retornos = useNegociacoes()
  const [query, setQuery] = useState('')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [abonoFiltro, setAbonoFiltro] = useState<Set<string>>(new Set())

  const retornosFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...retornos]
      .sort((a, b) => b.retornadoEm.localeCompare(a.retornadoEm))
      .filter((r) => {
        const dia = r.retornadoEm.slice(0, 10)
        if (de && dia < de) return false
        if (ate && dia > ate) return false

        if (q) {
          const cliente = clienteDoRetorno(r)
          const boleto = getBoletoById(r.boletoId)
          const bate =
            (cliente?.nome.toLowerCase().includes(q) ?? false) ||
            (boleto?.numero.toLowerCase().includes(q) ?? false)
          if (!bate) return false
        }

        if (abonoFiltro.size > 0) {
          const temAbono = abonosDoBoleto(r.boletoId, abonos).some(
            (a) => a.jurosAbonado + a.multaAbonada > 0,
          )
          if (abonoFiltro.has('com_abono') && abonoFiltro.has('sem_abono')) return true
          if (abonoFiltro.has('com_abono') && !temAbono) return false
          if (abonoFiltro.has('sem_abono') && temAbono) return false
        }

        return true
      })
  }, [retornos, abonos, query, de, ate, abonoFiltro])

  if (!podeSupervisao) {
    return (
      <EmptyState
        title="Acesso restrito"
        description="A visão de negociações é do perfil admin — supervisão a posteriori."
      />
    )
  }

  const colunas: Column<RetornoManualNegociacao>[] = [
    {
      key: 'criado',
      header: 'Criado em',
      numeric: true,
      sortValue: (r) => r.retornadoEm,
      render: (r) => formatarData(r.retornadoEm.slice(0, 10)),
    },
    {
      key: 'cliente',
      header: 'Cliente',
      sortValue: (r) => clienteDoRetorno(r)?.nome ?? '',
      render: (r) => <span className="font-medium text-ink">{clienteDoRetorno(r)?.nome ?? '—'}</span>,
    },
    {
      key: 'titulos',
      header: 'Títulos',
      certtus: true,
      sortValue: (r) => r.boletoId,
      render: (r) => {
        const b = getBoletoById(r.boletoId)
        return <span className="num whitespace-nowrap font-mono text-neutral-700">{b?.numero ?? r.boletoId}</span>
      },
    },
    {
      key: 'abonado',
      header: 'Abonado',
      numeric: true,
      sortValue: (r) =>
        abonosDoBoleto(r.boletoId, abonos).reduce((s, a) => s + a.jurosAbonado + a.multaAbonada, 0),
      render: (r) => {
        const total = abonosDoBoleto(r.boletoId, abonos).reduce(
          (s, a) => s + a.jurosAbonado + a.multaAbonada,
          0,
        )
        return total > 0 ? <Money value={total} /> : <span className="text-ink-muted">—</span>
      },
    },
    {
      key: 'final',
      header: 'Valor final',
      numeric: true,
      sortValue: (r) => {
        const boleto = getBoletoById(r.boletoId)
        const abono = abonosDoBoleto(r.boletoId, abonos).find((a) => a.estado === 'ativo')
        return abono
          ? (valorFinalDoBoleto(r.boletoId, abono) ?? boleto?.valor ?? 0)
          : (boleto?.valor ?? 0)
      },
      render: (r) => {
        const boleto = getBoletoById(r.boletoId)
        const abono = abonosDoBoleto(r.boletoId, abonos).find((a) => a.estado === 'ativo')
        const valor = abono
          ? (valorFinalDoBoleto(r.boletoId, abono) ?? boleto?.valor)
          : boleto?.valor
        return valor != null ? <Money value={valor} /> : <span className="text-ink-muted">—</span>
      },
    },
    {
      key: 'validade',
      header: 'Validade',
      numeric: true,
      sortValue: (r) => r.promessaData,
      render: (r) => formatarData(r.promessaData),
    },
    {
      key: 'estado',
      header: 'Estado',
      center: true,
      sortValue: (r) => ORDEM_SITUACAO[r.situacao ?? 'retornada'],
      render: (r) => <SituacaoNegociacaoBadge situacao={r.situacao ?? 'retornada'} />,
    },
    {
      key: 'por',
      header: 'Criado por',
      sortValue: (r) => nomeDoUsuario(r.retornadoPor),
      render: (r) => <span className="text-sm text-ink-muted">{nomeDoUsuario(r.retornadoPor)}</span>,
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Supervisão"
        title="Negociações"
        description="Negociações com promessa de pagamento — em aberto, descumpridas pelo cliente e retornos manuais à régua."
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Cliente ou boleto…"
          className="w-full sm:w-64"
        />
        <MultiSelectDropdown
          selected={abonoFiltro}
          onChange={setAbonoFiltro}
          options={ABONO_OPTIONS}
          placeholder="Abono"
        />
        <div className="flex items-center gap-2">
          <label className="label-mono text-ink-muted" htmlFor="neg-de">
            Período
          </label>
          <Input
            id="neg-de"
            type="date"
            aria-label="Período — data inicial"
            value={de}
            onChange={(e) => setDe(e.target.value)}
            className="w-40"
          />
          <span className="text-sm text-ink-muted">a</span>
          <Input
            type="date"
            aria-label="Período — data final"
            value={ate}
            onChange={(e) => setAte(e.target.value)}
            className="w-40"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setDe(''); setAte('') }}
            className={(de || ate) ? '' : 'invisible'}
            aria-hidden={!(de || ate)}
            tabIndex={(de || ate) ? undefined : -1}
          >
            Limpar
          </Button>
        </div>
        <span className="num ml-auto font-mono text-xs text-ink-muted">
          {retornosFiltrados.length}{' '}
          {retornosFiltrados.length === 1 ? 'negociação' : 'negociações'}
        </span>
      </div>

      <div className="mt-4">
        <DataTable
          columns={colunas}
          rows={retornosFiltrados}
          rowKey={(r) => r.id}
          onRowClick={(r) => router.push(`/cobrancas/${r.boletoId}`)}
          empty={
            <EmptyState
              title="Nenhuma negociação registrada"
              description="Os retornos manuais à régua aparecem aqui — use o botão no card do Kanban."
            />
          }
        />
      </div>
    </>
  )
}
