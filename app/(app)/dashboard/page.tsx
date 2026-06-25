'use client'

import { useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  computarKpis,
  boletosDaEmpresa,
  getEvolucaoInadimplencia,
  getPrevistoRecebido,
  formatarMoeda,
  formatarData,
  DATA_BASE,
  type EmpresaFiltro,
} from '../../../mocks'
import { PageHeader } from '../../../components/ui/PageHeader'
import { KpiCard } from '../../../components/ui/KpiCard'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { useToast } from '../../../hooks/useToast'
import { IconRefreshCw } from '../../../components/icons'
import { AgingChart, type AgingFaixa } from './_components/AgingChart'
import { EvolucaoInadimplenciaChart } from './_components/EvolucaoInadimplenciaChart'
import { InadimplenciaRecuperadoChart } from './_components/InadimplenciaRecuperadoChart'
import { PrevistoRecebidoChart } from './_components/PrevistoRecebidoChart'
import { RecebiveisCard, FAIXAS_RECEBIVEIS } from './_components/RecebiveisCard'
import { EmpresaSelect } from './_components/EmpresaSelect'
import { RecebimentoTipoChart } from './_components/RecebimentoTipoChart'

export default function Dashboard() {
  const router = useRouter()
  const { toast, toastHost } = useToast()
  const [syncing, setSyncing] = useState(false)
  // filtro de empresa do painel — dropdown no cabeçalho, refiltra KPIs e gráficos
  const [empresa, setEmpresa] = useState<EmpresaFiltro>('grupo')
  // faixas de tempo dos recebíveis — também recortam as formas de pagamento
  const [faixasAtivas, setFaixasAtivas] = useState<Set<string>>(
    () => new Set(FAIXAS_RECEBIVEIS.map((f) => f.id)),
  )

  const kpis = useMemo(() => computarKpis(empresa), [empresa])
  const boletosEmpresa = useMemo(() => boletosDaEmpresa(empresa), [empresa])
  const evolucao = useMemo(() => getEvolucaoInadimplencia(empresa), [empresa])
  const previstoRecebido = useMemo(() => getPrevistoRecebido(empresa), [empresa])

  function alternarFaixa(faixaId: string) {
    setFaixasAtivas((prev) => {
      const next = new Set(prev)
      if (next.has(faixaId)) next.delete(faixaId)
      else next.add(faixaId)
      return next
    })
  }

  /* faixas do aging — cores da régua de severidade; acima do corte de 30 dias
     (CORTE_INADIMPLENCIA_DIAS) tudo é inadimplência, escurecendo com a idade
     da dívida até o quase-preto da perda provável (180+) */
  const agingFaixas: AgingFaixa[] = [
    { label: 'A vencer', valor: kpis.aging.avencer, cls: 'bg-avencer-base' },
    { label: '1–30 dias', valor: kpis.aging.ate30, cls: 'bg-atrasado-base' },
    { label: '31–60 dias', valor: kpis.aging.de31a60, cls: 'bg-inadimplente-base' },
    { label: '61–90 dias', valor: kpis.aging.de61a90, cls: 'bg-inadimplente-fg' },
    { label: '91–180 dias', valor: kpis.aging.de91a180, cls: 'bg-neutral-800' },
    { label: '> 180 dias', valor: kpis.aging.acima180, cls: 'bg-neutral-950' },
  ]

  // mapeamento faixa index → params de cobrancas para o aging da carteira
  const onAgingClick = useCallback((i: number) => {
    const ranges: ([number, number] | [number, null] | null)[] = [
      null,           // A vencer → filtro de status
      [1, 30],
      [31, 60],
      [61, 90],
      [91, 180],
      [181, null],
    ]
    if (i === 0) { router.push('/titulos?venc_de=' + DATA_BASE); return }
    const r = ranges[i]
    if (!r) return
    const params = r[1] != null
      ? `atraso_de=${r[0]}&atraso_ate=${r[1]}`
      : `atraso_de=${r[0]}`
    router.push(`/titulos?${params}`)
  }, [router])

  function sincronizar() {
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      toast('Base sincronizada com o Certtus.')
    }, 1200)
  }

  return (
    <>
      <PageHeader
        eyebrow="Visão geral"
        title="Dashboard"
        description={`Resumo da carteira em ${formatarData(DATA_BASE)} — leitura apresentável à diretoria.`}
        actions={
          <>
            <EmpresaSelect value={empresa} onChange={setEmpresa} />
            <Button variant="secondary" isLoading={syncing} onClick={sincronizar}>
              <IconRefreshCw size={16} />
              Sincronizar agora
            </Button>
          </>
        }
      />

      {/* KPIs — % de inadimplência é a north star: primeira posição + keyline laranja */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="% de inadimplência"
          value={`${kpis.pctInadimplencia}%`}
          meta={`${kpis.clientesInadimplentes} de ${kpis.totalClientes} clientes`}
          highlight
        />
        <KpiCard
          label="Inadimplente"
          value={formatarMoeda(kpis.totalInadimplente)}
          meta={`${kpis.clientesInadimplentes} clientes · ≥ 30 dias de atraso`}
          valueClassName="text-inadimplente-fg"
        />
        <KpiCard
          label="Total em aberto"
          value={formatarMoeda(kpis.totalEmAberto)}
          meta={`${kpis.boletosEmAberto} boletos`}
        />
        <KpiCard
          label="Atraso médio"
          value={`${kpis.diasMediosAtraso} dias`}
          meta="boletos vencidos e não pagos"
        />
      </div>

      {/* o que entra (recebíveis, faixas habilitáveis) e como entra (formas, mesmo recorte) */}
      <div className="mt-6">
        <RecebiveisCard boletos={boletosEmpresa} ativas={faixasAtivas} onToggle={alternarFaixa} />
      </div>

      {/* gráficos analíticos — 2 por linha a partir de 1280px (720p/1080p):
          recebimento na linha de cima, inadimplência (barras vermelhas) embaixo.
          Sem items-start: os cards da mesma linha esticam à mesma altura */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* previsto × recebido — a realização mês a mês */}
        <Card>
          <Card.Header>
            <Card.Title>Previsto × recebido</Card.Title>
          </Card.Header>
          <Card.Body>
            <PrevistoRecebidoChart dados={previstoRecebido} />
          </Card.Body>
        </Card>

        {/* aging da carteira — barra no topo, legenda em coluna preenche a altura */}
        <Card className="flex flex-col">
          <Card.Header>
            <Card.Title>Aging da carteira</Card.Title>
            <span className="label-mono text-ink-muted">Valores em aberto</span>
          </Card.Header>
          <Card.Body className="flex grow flex-col">
            {/* espaço para o tooltip da barra — não corta no limite do card */}
            <div className="flex grow flex-col pt-10">
              <AgingChart faixas={agingFaixas} legendLayout="column" onSegmentoClick={onAgingClick} />
            </div>
          </Card.Body>
        </Card>

        {/* evolução da inadimplência — a carteira está envelhecendo ou sendo recuperada cedo? */}
        <Card>
          <Card.Header>
            <Card.Title>Evolução da inadimplência</Card.Title>
            <span className="label-mono text-ink-muted">por faixa de aging</span>
          </Card.Header>
          <Card.Body>
            <EvolucaoInadimplenciaChart dados={evolucao} />
          </Card.Body>
        </Card>

        {/* Inadimplência X Recuperação — a recuperação acompanha o estoque? */}
        <Card className="flex flex-col">
          <Card.Header>
            <Card.Title>Inadimplência X Recuperação</Card.Title>
          </Card.Header>
          <Card.Body className="flex grow flex-col justify-center">
            <InadimplenciaRecuperadoChart dados={evolucao} />
          </Card.Body>
        </Card>
      </div>

      {/* recebimento por segmento — ocupa linha inteira para os filtros de tipo */}
      <div className="mt-6">
        <Card>
          <Card.Header>
            <Card.Title>Recebimento por segmento de cliente</Card.Title>
            <span className="label-mono text-ink-muted">% realização</span>
          </Card.Header>
          <Card.Body>
            <RecebimentoTipoChart />
          </Card.Body>
        </Card>
      </div>

      {toastHost}
    </>
  )
}
