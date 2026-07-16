'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  boletos,
  empresas,
  getClienteById,
  getEmpresa,
  getEmpresaDoBoleto,
  getReguaDoCliente,
  getComunicacoesDoBoleto,
  getFormaPagamento,
  FORMA_PAGAMENTO_LABEL,
  ancoraParaDias,
  calcularEncargos,
  formatarMoeda,
  formatarData,
  statusEfetivo,
  situacaoEfetiva,
  ORDEM_SEVERIDADE,
  MULTA_PCT,
  JUROS_MES_PCT,
  type Boleto,
  type Comunicacao,
  type StatusBoleto,
  type TipoCliente,
  type SituacaoCliente,
  type EstadoProcesso,
  type FormaPagamento,
} from '../../../mocks'
import { abonoAplicadoDoBoleto, abonaJuros, abonaMulta, processarAbonoDaComunicacao } from '../../../lib/abonos'
import { registrarRetornoManual } from '../../../lib/negociacoes'
import { useAbonos } from '../../../hooks/useAbonos'
import { useNegociacoes } from '../../../hooks/useNegociacoes'
import { colunaDoBoleto, marcoDoBoleto, resolverNegociacao } from '../../../lib/kanban'
import { useColunasKanban } from '../../../hooks/useColunasKanban'
import { getSession, podeAcessar } from '../../../lib/auth'
import { PageHeader } from '../../../components/ui/PageHeader'
import { SearchInput } from '../../../components/ui/SearchInput'
import { MultiSelectDropdown, type DropdownOption } from '../../../components/ui/MultiSelectDropdown'
import { DataTable, type Column } from '../../../components/ui/DataTable'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Money } from '../../../components/ui/Money'
import { ProcessBadge } from '../../../components/ui/ProcessBadge'
import { Tag } from '../../../components/ui/Tag'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Field } from '../../../components/ui/Field'
import { Textarea } from '../../../components/ui/Textarea'
import { useToast } from '../../../hooks/useToast'
import { IconKanban, IconTable, IconUsers2, IconSettings } from '../../../components/icons'
import { KanbanBoard } from './_components/KanbanBoard'
import {
  ComunicacaoForm,
  type ComunicacaoFormValues,
} from '../clientes/[id]/_components/ComunicacaoForm'

/* filtro único por status — na ordem da régua de severidade */
const STATUS_OPTIONS: DropdownOption[] = (
  ['avencer', 'hoje', 'atrasado', 'inadimplente', 'pago', 'pago_atraso'] as StatusBoleto[]
).map((s) => ({
  value: s,
  label: {
    avencer: 'A vencer',
    hoje: 'Vence hoje',
    atrasado: 'Atrasado',
    inadimplente: 'Inadimplente',
    pago: 'Pago',
    pago_atraso: 'Pago com atraso',
  }[s],
  render: () => <StatusBadge status={s} />,
}))

/* empresa recebedora — multi-seleção, vazio = todas */
const EMPRESA_OPTIONS: DropdownOption[] = empresas.map((e) => ({
  value: e.id,
  label: e.nome,
  render: () => <Tag variant="source">{e.nome}</Tag>,
}))

/* régua de cobrança — filtro principal do Kanban, vazio = todas */
const REGUA_OPTIONS: DropdownOption[] = [
  { value: 'padrao', label: 'Régua Padrão' },
  { value: 'reincidente', label: 'Régua Reincidente' },
]

/* títulos com abono, por estado — 'ativo' é o uso padrão; expirado/aplicado
   entram por opção. Vazio = sem filtro de abono. */
const ABONO_OPTIONS: DropdownOption[] = [
  { value: 'ativo', label: 'Abono ativo' },
  { value: 'expirado', label: 'Abono expirado' },
  { value: 'aplicado', label: 'Abono aplicado' },
  { value: 'cancelado', label: 'Abono cancelado' },
]

/* segmento do cliente — a antiga tela de Clientes virou este filtro dentro de
   Títulos; o nome do cliente em cada linha leva ao detalhe */
const TIPO_CLIENTE_LABEL: Record<TipoCliente, string> = {
  oficina: 'Oficina',
  transportadora: 'Transportadora',
  revenda: 'Revenda',
  frotista: 'Frotista',
  pf: 'Pessoa física',
  produtor: 'Produtor rural',
  orgao_publico: 'Órgão público',
}
const TIPO_CLIENTE_OPTIONS: DropdownOption[] = (Object.keys(TIPO_CLIENTE_LABEL) as TipoCliente[]).map(
  (t) => ({ value: t, label: TIPO_CLIENTE_LABEL[t] }),
)

/* forma de pagamento do título — dado Certtus (read-only), vazio = todas */
const FORMA_PGTO_OPTIONS: DropdownOption[] = (
  Object.keys(FORMA_PAGAMENTO_LABEL) as FormaPagamento[]
).map((f) => ({ value: f, label: FORMA_PAGAMENTO_LABEL[f] }))

/* estado de negociação do título — derivado das comunicações/promessas */
const NEGOCIACAO_OPTIONS: DropdownOption[] = [
  { value: 'em_negociacao', label: 'Em negociação' },
  { value: 'quebrada', label: 'Promessa quebrada' },
]

const ISO_DATA = /^\d{4}-\d{2}-\d{2}$/

type Visao = 'tabela' | 'cliente' | 'kanban'

/* linha consolidada por cliente — uma entrada por cliente com o total em aberto
   dos seus títulos (em vez de repetir o cliente por título) */
interface ClienteAgrupado {
  clienteId: string
  nome: string
  tipo: TipoCliente
  qtde: number
  emAberto: number
  totalAtualizado: number
  estadoProcesso: EstadoProcesso
  situacao: SituacaoCliente
}

function CobrancasContent() {
  const router = useRouter()
  // drilldown do dashboard chega como intervalo de vencimento na URL
  const searchParams = useSearchParams()
  const deUrl = searchParams.get('venc_de') ?? ''
  const ateUrl = searchParams.get('venc_ate') ?? ''
  const atrasoDeUrl = searchParams.get('atraso_de') ?? ''
  const atrasoAteUrl = searchParams.get('atraso_ate') ?? ''

  const abonos = useAbonos()
  const retornosManual = useNegociacoes()
  const colunasKanban = useColunasKanban()
  const { toast, toastHost } = useToast()
  const sessao = getSession()
  const perfil = sessao?.perfil ?? 'comercial'
  const podeComunicar = podeAcessar(perfil, 'comunicacaoManual')
  const podeOperarRegua = podeAcessar(perfil, 'reguas')
  // comercial só enxerga o agrupamento por cliente — sem Tabela/Kanban
  const soAgrupado = perfil === 'comercial'

  // alternar a visão preserva todos os filtros — o estado é o mesmo
  const [visao, setVisao] = useState<Visao>(soAgrupado ? 'cliente' : 'tabela')
  const [query, setQuery] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<Set<string>>(new Set())
  const [empresaFiltro, setEmpresaFiltro] = useState<Set<string>>(new Set())
  const [reguaFiltro, setReguaFiltro] = useState<Set<string>>(new Set())
  const [abonoFiltro, setAbonoFiltro] = useState<Set<string>>(new Set())
  const [tipoFiltro, setTipoFiltro] = useState<Set<string>>(new Set())
  const [formaFiltro, setFormaFiltro] = useState<Set<string>>(new Set())
  const [negociacaoFiltro, setNegociacaoFiltro] = useState<Set<string>>(new Set())
  const [vencDe, setVencDe] = useState(ISO_DATA.test(deUrl) ? deUrl : '')
  const [vencAte, setVencAte] = useState(ISO_DATA.test(ateUrl) ? ateUrl : '')
  const [atrasoDe, setAtrasoDe] = useState<number | null>(atrasoDeUrl ? Number(atrasoDeUrl) : null)
  const [atrasoAte, setAtrasoAte] = useState<number | null>(atrasoAteUrl ? Number(atrasoAteUrl) : null)

  // comunicações registradas nesta sessão a partir do Kanban — atualizam o
  // indicador dos cards (estado de processo, nada grava no Certtus)
  const [comunicacoesExtras, setComunicacoesExtras] = useState<Comunicacao[]>([])
  const [comBoleto, setComBoleto] = useState<Boleto | null>(null)
  // renovação de promessa: abre o registro de contato exigindo nova data futura
  const [renovando, setRenovando] = useState(false)

  // retorno manual à régua — confirmação antes de encerrar a negociação
  const [retornoTarget, setRetornoTarget] = useState<{ boleto: Boleto; promessaData: string } | null>(null)
  const [retornoMotivo, setRetornoMotivo] = useState('')

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase()
    return boletos
      .filter((b) => {
        if (empresaFiltro.size > 0 && !empresaFiltro.has(getEmpresaDoBoleto(b))) return false
        if (statusFiltro.size > 0 && !statusFiltro.has(statusEfetivo(b))) return false
        if (tipoFiltro.size > 0 && !tipoFiltro.has(getClienteById(b.clienteId)?.tipo ?? '')) return false
        if (formaFiltro.size > 0 && !formaFiltro.has(getFormaPagamento(b))) return false
        if (
          abonoFiltro.size > 0 &&
          !abonos.some((a) => a.boletoIds.includes(b.id) && abonoFiltro.has(a.estado))
        )
          return false
        if (vencDe && b.vencimento < vencDe) return false
        if (vencAte && b.vencimento > vencAte) return false
        if (atrasoDe != null) {
          const dias = b.diasAtraso ?? 0
          if (dias < atrasoDe) return false
          if (atrasoAte != null && dias > atrasoAte) return false
        }
        if (negociacaoFiltro.size > 0) {
          const coms = [
            ...getComunicacoesDoBoleto(b.id),
            ...comunicacoesExtras.filter((c) => c.boletoIds?.includes(b.id)),
          ]
          const neg = resolverNegociacao(b.id, coms, retornosManual)
          const querEm = negociacaoFiltro.has('em_negociacao')
          const querQuebrada = negociacaoFiltro.has('quebrada')
          if (querEm && querQuebrada) {
            if (!neg.emNegociacao && !neg.promessaQuebrada) return false
          } else if (querEm && !neg.emNegociacao) return false
          else if (querQuebrada && !neg.promessaQuebrada) return false
        }
        if (!q) return true
        const cliente = getClienteById(b.clienteId)
        return (
          b.numero.toLowerCase().includes(q) ||
          b.nfNumero.includes(q) ||
          (cliente?.nome.toLowerCase().includes(q) ?? false)
        )
      })
      // mais urgente primeiro: em aberto antes de pago, depois vencimento ascendente
      .sort((a, b) => {
        const pagoA = a.status === 'pago' || a.status === 'pago_atraso' ? 1 : 0
        const pagoB = b.status === 'pago' || b.status === 'pago_atraso' ? 1 : 0
        return pagoA - pagoB || a.vencimento.localeCompare(b.vencimento)
      })
  }, [query, statusFiltro, empresaFiltro, tipoFiltro, formaFiltro, abonoFiltro, abonos, negociacaoFiltro, comunicacoesExtras, retornosManual, vencDe, vencAte, atrasoDe, atrasoAte])

  // consolidação por cliente — uma linha por cliente, somando o valor em aberto
  const porCliente = useMemo<ClienteAgrupado[]>(() => {
    const map = new Map<string, ClienteAgrupado>()
    for (const b of filtradas) {
      const c = getClienteById(b.clienteId)
      if (!c) continue
      let row = map.get(c.id)
      if (!row) {
        row = {
          clienteId: c.id,
          nome: c.nome,
          tipo: c.tipo,
          qtde: 0,
          emAberto: 0,
          totalAtualizado: 0,
          estadoProcesso: c.estadoProcesso,
          situacao: situacaoEfetiva(c),
        }
        map.set(c.id, row)
      }
      row.qtde += 1
      if (b.status !== 'pago' && b.status !== 'pago_atraso') {
        row.emAberto += b.valor
        row.totalAtualizado += calcularEncargos(b)?.totalAtualizado ?? b.valor
      }
    }
    return [...map.values()].sort((a, b) => b.emAberto - a.emAberto)
  }, [filtradas])

  // Kanban: só títulos em aberto, dentro da régua (com marco atingido — senão
  // o contador divergiria do board) + filtro de régua
  const boletosKanban = useMemo(
    () =>
      filtradas.filter((b) => {
        if (b.status === 'pago' || b.status === 'pago_atraso') return false
        if (reguaFiltro.size > 0 && !reguaFiltro.has(getReguaDoCliente(b.clienteId).perfil)) return false
        if (colunaDoBoleto(b, colunasKanban) == null) return false
        return true
      }),
    [filtradas, reguaFiltro, colunasKanban],
  )

  // todas as comunicações (seed + sessão) dos boletos do kanban — usadas para
  // derivar o estado de negociação (promessa ativa vs. quebrada)
  const todasComunicacoesKanban = useMemo(
    () => [
      ...boletosKanban.flatMap((b) => getComunicacoesDoBoleto(b.id)),
      ...comunicacoesExtras,
    ],
    [boletosKanban, comunicacoesExtras],
  )

  function contarComunicacoes(b: Boleto): number {
    return (
      getComunicacoesDoBoleto(b.id).length +
      comunicacoesExtras.filter((c) => c.boletoIds?.includes(b.id)).length
    )
  }

  function salvarComunicacao(values: ComunicacaoFormValues) {
    if (!comBoleto) return
    // a negociação é renovada quando o título já estava em negociação (ou foi
    // aberto via "Renovar promessa") e a nova comunicação traz nova promessa
    const comsDoBoleto = [
      ...getComunicacoesDoBoleto(comBoleto.id),
      ...comunicacoesExtras.filter((c) => c.boletoIds?.includes(comBoleto.id)),
    ]
    const eraEmNegociacao = resolverNegociacao(comBoleto.id, comsDoBoleto, retornosManual).emNegociacao
    const renovou = !!values.promessaData && (renovando || eraEmNegociacao)
    const promessa = values.promessaData
      ? { data: values.promessaData, situacao: 'pendente' as const }
      : undefined
    // abono opcional: vincula o ativo existente ou cria direto (sem
    // aprovação) e congela o snapshot do que foi comunicado — auditoria
    const abonoVinculo = processarAbonoDaComunicacao(values.abono, {
      dataPromessaPagamento: values.promessaData || undefined,
      criadoPor: sessao?.email ?? 'financeiro@retifica.com',
    })
    setComunicacoesExtras((prev) => [
      {
        id: 'cm-' + Date.now().toString(36),
        clienteId: comBoleto.clienteId,
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
    setComBoleto(null)
    setRenovando(false)
    toast(
      renovou
        ? `Negociação renovada — nova promessa para ${formatarData(values.promessaData)}.`
        : values.abono
          ? 'Contato registrado com abono vinculado.'
          : 'Contato registrado.',
    )
  }

  function handleRetornarRegua(boleto: Boleto, promessaData: string) {
    setRetornoTarget({ boleto, promessaData })
    setRetornoMotivo('')
  }

  function confirmarRetorno() {
    if (!retornoTarget) return
    registrarRetornoManual({
      boletoId: retornoTarget.boleto.id,
      promessaData: retornoTarget.promessaData,
      motivoRetorno: retornoMotivo || undefined,
      retornadoPor: sessao?.email ?? 'financeiro@retifica.com',
    })
    setRetornoTarget(null)
    setRetornoMotivo('')
    toast('Cobrança retornada à régua. Envios automáticos reativados.')
  }

  const clienteCom = comBoleto ? getClienteById(comBoleto.clienteId) : null
  const boletosAbertosDoCliente = comBoleto
    ? boletos.filter(
        (b) =>
          b.clienteId === comBoleto.clienteId &&
          b.status !== 'pago' &&
          b.status !== 'pago_atraso',
      )
    : []

  // total atualizado = valor + multa + juros; valor cobrado só existe quando a
  // conta foi paga — encargos até a data do pagamento, menos abonos.
  // Encargos são estado de processo (sem cadeado) — só o valor original é Certtus.
  function totalAtualizado(b: Boleto): number | null {
    return calcularEncargos(b)?.totalAtualizado ?? null
  }

  function valorCobrado(b: Boleto): number | null {
    if (b.status === 'pago') return b.valor
    if (b.status === 'pago_atraso') {
      const dias = b.diasAtraso ?? 0
      const multa = b.valor * MULTA_PCT
      const juros = b.valor * JUROS_MES_PCT * (dias / 30)
      // abono aplicado é tudo-ou-nada por componente — zera o que foi abonado
      const aplicado = abonoAplicadoDoBoleto(b.id, abonos)
      const total =
        b.valor +
        (aplicado && abonaMulta(aplicado) ? 0 : multa) +
        (aplicado && abonaJuros(aplicado) ? 0 : juros)
      return Math.round(total * 100) / 100
    }
    return null
  }

  const colunas: Column<Boleto>[] = [
    {
      key: 'cliente',
      header: 'Cliente',
      sortValue: (b) => getClienteById(b.clienteId)?.nome ?? '',
      render: (b) => {
        const c = getClienteById(b.clienteId)
        if (!c) return <span className="font-medium text-ink">—</span>
        // nome leva ao detalhe do cliente; stopPropagation evita abrir o título
        return (
          <Link
            href={`/clientes/${c.id}?tab=titulos`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-ink hover:text-link hover:underline focus-ring rounded-sm"
          >
            {c.nome}
          </Link>
        )
      },
    },
    {
      key: 'boleto',
      header: 'Boleto',
      certtus: true,
      sortValue: (b) => b.numero,
      render: (b) => <span className="num whitespace-nowrap font-mono text-neutral-700">{b.numero}</span>,
    },
    {
      key: 'empresa',
      header: 'Empresa',
      certtus: true,
      sortValue: (b) => getEmpresa(getEmpresaDoBoleto(b)).nomeCurto,
      render: (b) => <Tag variant="source">{getEmpresa(getEmpresaDoBoleto(b)).nomeCurto}</Tag>,
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
      key: 'total',
      header: 'Total atualizado',
      numeric: true,
      sortValue: (b) => totalAtualizado(b) ?? 0,
      render: (b) => {
        const total = totalAtualizado(b)
        return total == null ? <span className="text-ink-muted">—</span> : <Money value={total} />
      },
    },
    {
      key: 'cobrado',
      header: 'Valor cobrado',
      numeric: true,
      sortValue: (b) => valorCobrado(b) ?? 0,
      render: (b) => {
        const cobrado = valorCobrado(b)
        if (cobrado == null) return <span className="text-ink-muted">—</span>
        const comAbono = abonoAplicadoDoBoleto(b.id, abonos) != null
        return (
          <span className={comAbono ? 'font-semibold' : undefined}>
            <Money value={cobrado} />
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      center: true,
      // ordena pela régua de severidade; dias de atraso desempatam dentro do status
      sortValue: (b) => ORDEM_SEVERIDADE[statusEfetivo(b)] * 1000 + (b.diasAtraso ?? 0),
      render: (b) => <StatusBadge status={statusEfetivo(b)} dias={b.status === 'pago' ? undefined : b.diasAtraso} />,
    },
    {
      key: 'etapa',
      header: 'Etapa',
      // etapa (coluna do Kanban) derivada do marco da régua — pago/fora da régua = "—"
      sortValue: (b) => {
        const marco = marcoDoBoleto(b, colunasKanban)
        return marco ? ancoraParaDias(marco) : -999
      },
      render: (b) => {
        const etapa = colunaDoBoleto(b, colunasKanban)
        if (!etapa) return <span className="text-ink-muted">—</span>
        return <span className="whitespace-nowrap text-neutral-700">{etapa.titulo}</span>
      },
    },
    {
      key: 'regua',
      header: 'Régua',
      sortValue: (b) => getClienteById(b.clienteId)?.estadoProcesso ?? '',
      render: (b) => {
        const c = getClienteById(b.clienteId)
        // "—" para régua sem ocorrência — célula nunca fica vazia (DS v5)
        if (!c || c.estadoProcesso === 'normal') return <span className="text-ink-muted">—</span>
        return <ProcessBadge estado={c.estadoProcesso} />
      },
    },
  ]

  const colunasCliente: Column<ClienteAgrupado>[] = [
    {
      key: 'cliente',
      header: 'Cliente',
      sortValue: (c) => c.nome,
      render: (c) => (
        <Link
          href={`/clientes/${c.clienteId}?tab=titulos`}
          onClick={(e) => e.stopPropagation()}
          className="font-medium text-ink hover:text-link hover:underline focus-ring rounded-sm"
        >
          {c.nome}
        </Link>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      sortValue: (c) => TIPO_CLIENTE_LABEL[c.tipo],
      render: (c) => <span className="text-neutral-700">{TIPO_CLIENTE_LABEL[c.tipo]}</span>,
    },
    {
      key: 'qtde',
      header: 'Títulos',
      numeric: true,
      sortValue: (c) => c.qtde,
      render: (c) => <span className="num font-mono text-neutral-700">{c.qtde}</span>,
    },
    {
      key: 'aberto',
      header: 'Em aberto',
      numeric: true,
      certtus: true,
      sortValue: (c) => c.emAberto,
      render: (c) =>
        c.emAberto > 0 ? <Money value={c.emAberto} /> : <span className="text-ink-muted">—</span>,
    },
    {
      key: 'total',
      header: 'Total atualizado',
      numeric: true,
      sortValue: (c) => c.totalAtualizado,
      render: (c) =>
        c.totalAtualizado > 0 ? <Money value={c.totalAtualizado} /> : <span className="text-ink-muted">—</span>,
    },
    {
      key: 'sit',
      header: 'Situação',
      center: true,
      sortValue: (c) => ORDEM_SEVERIDADE[c.situacao],
      render: (c) => <StatusBadge status={c.situacao} />,
    },
    {
      key: 'proc',
      header: 'Régua',
      sortValue: (c) => c.estadoProcesso,
      render: (c) =>
        c.estadoProcesso === 'normal' ? (
          <span className="text-ink-muted">—</span>
        ) : (
          <ProcessBadge estado={c.estadoProcesso} />
        ),
    },
  ]

  const visiveis = visao === 'kanban' ? boletosKanban : filtradas
  const totalFiltrado = visiveis.reduce((s, b) => s + b.valor, 0)
  const totalEmAberto = porCliente.reduce((s, c) => s + c.emAberto, 0)
  const intervaloAtivo = Boolean(vencDe || vencAte)

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Títulos"
        description={
          visao === 'kanban'
            ? 'Títulos em aberto organizados por estágio de cobrança — a coluna é derivada do marco da régua.'
            : visao === 'cliente'
              ? 'Títulos consolidados por cliente — uma linha por cliente com o total em aberto.'
              : 'Todos os boletos lidos do Certtus, ordenados do mais urgente para o mais distante.'
        }
      />

      <div className="flex flex-col gap-3">
        {/* linha 1 — busca à esquerda; contagem + alternador de visão à direita */}
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Cliente, boleto ou NF…"
            className="w-full sm:w-72"
          />

          <div className="ml-auto flex items-center gap-3">
            <span className="num font-mono text-xs text-ink-muted">
              {visao === 'cliente'
                ? `${porCliente.length} clientes · ${formatarMoeda(totalEmAberto)}`
                : `${visiveis.length} boletos · ${formatarMoeda(totalFiltrado)}`}
            </span>

            {/* alternador de visão — oculto para o comercial (só Por cliente) */}
            {!soAgrupado && (
              <div className="flex rounded-md border border-line-strong bg-neutral-100 p-0.5" role="tablist" aria-label="Visão da lista">
                {(
                  [
                    { id: 'tabela' as Visao, label: 'Tabela', Icon: IconTable },
                    { id: 'cliente' as Visao, label: 'Por cliente', Icon: IconUsers2 },
                    { id: 'kanban' as Visao, label: 'Kanban', Icon: IconKanban },
                  ]
                ).map(({ id, label, Icon }) => {
                  const ativa = visao === id
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={ativa}
                      onClick={() => setVisao(id)}
                      className={`flex items-center gap-1.5 rounded-[5px] px-3 py-1.5 text-xs font-semibold
                        transition-colors duration-100 focus-ring
                        ${ativa ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'}`}
                    >
                      <Icon size={13} />
                      {label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* linha 2 — filtros em ordem: empresa, status, tipo, abono, negociação,
            [régua, só no Kanban] e o intervalo de vencimento por último */}
        <div className="flex flex-wrap items-center gap-2">
          <MultiSelectDropdown
            selected={empresaFiltro}
            onChange={setEmpresaFiltro}
            options={EMPRESA_OPTIONS}
            placeholder="Empresa"
          />
          <MultiSelectDropdown
            selected={statusFiltro}
            onChange={setStatusFiltro}
            options={STATUS_OPTIONS}
            placeholder="Status"
          />
          <MultiSelectDropdown
            selected={tipoFiltro}
            onChange={setTipoFiltro}
            options={TIPO_CLIENTE_OPTIONS}
            placeholder="Tipo de cliente"
          />
          <MultiSelectDropdown
            selected={formaFiltro}
            onChange={setFormaFiltro}
            options={FORMA_PGTO_OPTIONS}
            placeholder="Forma de pgto."
          />
          <MultiSelectDropdown
            selected={abonoFiltro}
            onChange={setAbonoFiltro}
            options={ABONO_OPTIONS}
            placeholder="Com abono"
          />
          <MultiSelectDropdown
            selected={negociacaoFiltro}
            onChange={setNegociacaoFiltro}
            options={NEGOCIACAO_OPTIONS}
            placeholder="Negociação"
          />
          {visao === 'kanban' && (
            <MultiSelectDropdown
              selected={reguaFiltro}
              onChange={setReguaFiltro}
              options={REGUA_OPTIONS}
              placeholder="Régua"
            />
          )}

          {/* divisor sutil antes do intervalo de datas */}
          <div className="mx-1 hidden h-6 w-px bg-line lg:block" />

          {/* intervalo de vencimento */}
          <div className="flex items-center gap-2">
            <label className="label-mono text-ink-muted" htmlFor="venc-de">
              Vencimento
            </label>
            <Input
              id="venc-de"
              type="date"
              aria-label="Vencimento — data inicial"
              value={vencDe}
              onChange={(e) => setVencDe(e.target.value)}
              className="w-40"
            />
            <span className="text-sm text-ink-muted">a</span>
            <Input
              type="date"
              aria-label="Vencimento — data final"
              value={vencAte}
              onChange={(e) => setVencAte(e.target.value)}
              className="w-40"
            />
            {/* sempre renderizado — o espaço fica reservado e a linha não reflui */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setVencDe(''); setVencAte('') }}
              className={intervaloAtivo ? '' : 'invisible'}
              aria-hidden={!intervaloAtivo}
              tabIndex={intervaloAtivo ? undefined : -1}
            >
              Limpar datas
            </Button>
          </div>

          {/* atalho para etapas do Kanban — à direita, na linha dos filtros */}
          {visao === 'kanban' && podeOperarRegua && (
            <Link
              href="/titulos/etapas"
              className="ml-auto inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-link hover:underline focus-ring"
            >
              <IconSettings size={14} />
              Gerenciar etapas
            </Link>
          )}
        </div>
      </div>

      <div className="mt-4">
        {visao === 'tabela' && (
          <DataTable
            columns={colunas}
            rows={filtradas}
            rowKey={(b) => b.id}
            onRowClick={(b) => router.push(`/clientes/${b.clienteId}?tab=titulos`)}
            empty={
              <EmptyState
                title="Nenhuma cobrança encontrada"
                description="Ajuste a busca, os filtros ou o intervalo de vencimento."
              />
            }
          />
        )}
        {visao === 'cliente' && (
          <DataTable
            columns={colunasCliente}
            rows={porCliente}
            rowKey={(c) => c.clienteId}
            onRowClick={(c) => router.push(`/clientes/${c.clienteId}?tab=titulos`)}
            empty={
              <EmptyState
                title="Nenhum cliente encontrado"
                description="Ajuste a busca ou os filtros."
              />
            }
          />
        )}
        {visao === 'kanban' && (
          <KanbanBoard
            boletos={boletosKanban}
            colunas={colunasKanban}
            comunicacoesDoBoleto={contarComunicacoes}
            todasComunicacoes={todasComunicacoesKanban}
            retornosManual={retornosManual}
            onAbrir={(b) => router.push(`/clientes/${b.clienteId}?tab=titulos`)}
            onRegistrarComunicacao={podeComunicar ? (b) => { setRenovando(false); setComBoleto(b) } : undefined}
            onRetornarRegua={podeComunicar ? handleRetornarRegua : undefined}
            onRenovarPromessa={podeComunicar ? (b) => { setRenovando(true); setComBoleto(b) } : undefined}
          />
        )}
      </div>

      {/* registrar comunicação a partir do card — cliente pré-selecionado e
          título de origem já vinculado; outros títulos do cliente opcionais */}
      <Modal open={comBoleto != null} onClose={() => { setComBoleto(null); setRenovando(false) }} size="lg">
        <Modal.Header>
          {renovando ? 'Renovar promessa' : 'Registrar contato'} · {clienteCom?.nome ?? ''}
        </Modal.Header>
        <Modal.Body>
          {comBoleto && (
            <ComunicacaoForm
              boletosAbertos={boletosAbertosDoCliente}
              boletoIdsIniciais={[comBoleto.id]}
              clienteNome={clienteCom?.nome}
              exigePromessa={renovando}
              onSave={salvarComunicacao}
              onCancel={() => { setComBoleto(null); setRenovando(false) }}
            />
          )}
        </Modal.Body>
      </Modal>

      {/* confirmação de retorno manual à régua */}
      <Modal open={retornoTarget != null} onClose={() => setRetornoTarget(null)}>
        <Modal.Header>Retornar à régua</Modal.Header>
        <Modal.Body>
          {retornoTarget && (() => {
            const cliente = getClienteById(retornoTarget.boleto.clienteId)
            const boleto = retornoTarget.boleto
            return (
              <>
                <p className="text-sm text-neutral-700">
                  Os envios automáticos da cobrança de{' '}
                  <span className="font-semibold text-ink">{cliente?.nome ?? '—'}</span>{' '}
                  (boleto <span className="num font-mono">{boleto.numero}</span>) serão reativados
                  imediatamente. A promessa de pagamento de{' '}
                  <span className="num font-mono">{retornoTarget.promessaData}</span> será encerrada.
                </p>
                <div className="mt-4">
                  <Field label="Motivo (opcional)">
                    <Textarea
                      value={retornoMotivo}
                      onChange={(e) => setRetornoMotivo(e.target.value)}
                      placeholder="Descreva o motivo do retorno antecipado…"
                      rows={3}
                    />
                  </Field>
                </div>
              </>
            )
          })()}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onClick={() => setRetornoTarget(null)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={confirmarRetorno}>
            Confirmar retorno
          </Button>
        </Modal.Footer>
      </Modal>

      {toastHost}
    </>
  )
}

// useSearchParams exige boundary de Suspense no App Router
export default function Cobrancas() {
  return (
    <Suspense fallback={null}>
      <CobrancasContent />
    </Suspense>
  )
}
