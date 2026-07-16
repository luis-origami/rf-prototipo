'use client'

import { useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  computarKpis,
  boletosDaEmpresa,
  getEvolucaoInadimplencia,
  getPrevistoRecebido,
  getMetricasMensais,
  getTaxasCarteiraSerie,
  getNegociacaoKpi,
  ULTIMO_MES_FECHADO,
  rotuloMesLongo,
  formatarMoeda,
  formatarPct,
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
import { MesSelect } from './_components/MesSelect'
import { RecebimentoTipoChart } from './_components/RecebimentoTipoChart'

export default function Dashboard() {
  const router = useRouter()
  const { toast, toastHost } = useToast()
  const [syncing, setSyncing] = useState(false)
  // filtro de empresa do painel — dropdown no cabeçalho, refiltra KPIs e gráficos
  const [empresa, setEmpresa] = useState<EmpresaFiltro>('grupo')
  // mês de referência dos KPIs "do mês" — padrão: último mês fechado
  const [mesRef, setMesRef] = useState<string>(ULTIMO_MES_FECHADO)
  // faixas de tempo dos recebíveis — também recortam as formas de pagamento
  const [faixasAtivas, setFaixasAtivas] = useState<Set<string>>(
    () => new Set(FAIXAS_RECEBIVEIS.map((f) => f.id)),
  )

  const kpis = useMemo(() => computarKpis(empresa), [empresa])
  const boletosEmpresa = useMemo(() => boletosDaEmpresa(empresa), [empresa])
  const evolucao = useMemo(() => getEvolucaoInadimplencia(empresa), [empresa])
  // inclui os meses à frente — o gráfico permite olhar para trás e para frente
  const previstoRecebido = useMemo(
    () => getPrevistoRecebido(empresa, { incluirFuturo: true }),
    [empresa],
  )
  const metricasMensais = useMemo(() => getMetricasMensais(empresa), [empresa])
  const taxasSerie = useMemo(() => getTaxasCarteiraSerie(empresa), [empresa])
  const negociacao = useMemo(() => getNegociacaoKpi(empresa), [empresa])
  const mes = useMemo(
    () => metricasMensais.find((m) => m.mes === mesRef) ?? metricasMensais[metricasMensais.length - 1],
    [metricasMensais, mesRef],
  )
  // série até o mês selecionado (inclusive) — últimos 6 pontos p/ as sparklines
  // dos KPIs do mês; o delta é o mês selecionado vs. o anterior
  const trilha = useMemo(() => {
    const i = metricasMensais.findIndex((m) => m.mes === mes.mes)
    const ate = metricasMensais.slice(0, i + 1).slice(-6)
    return {
      recebidoNoVencimento: ate.map((m) => m.pctRecebidoNoVencimento),
      recebidoMes: ate.map((m) => m.pctRecebidoMes),
      desempenho: ate.map((m) => m.pctDesempenho),
      diasMedios: ate.map((m) => m.diasMediosAtraso),
    }
  }, [metricasMensais, mes])

  function alternarFaixa(faixaId: string) {
    setFaixasAtivas((prev) => {
      const next = new Set(prev)
      if (next.has(faixaId)) next.delete(faixaId)
      else next.add(faixaId)
      return next
    })
  }

  /* faixas do aging — alinhadas aos MARCOS DA RÉGUA PADRÃO (D+5/D+15/D+30/
     D+60/D+90), nas cores da régua de severidade: escurecem com a idade da
     dívida até o quase-preto da perda provável (+90) */
  const agingFaixas: AgingFaixa[] = [
    { label: 'A vencer', valor: kpis.aging.avencer, cls: 'bg-avencer-base' },
    { label: '1–5 dias', valor: kpis.aging.ate5, cls: 'bg-atrasado-base' },
    { label: '6–15 dias', valor: kpis.aging.de6a15, cls: 'bg-inadimplente-base' },
    { label: '16–30 dias', valor: kpis.aging.de16a30, cls: 'bg-inadimplente-fg' },
    { label: '31–60 dias', valor: kpis.aging.de31a60, cls: 'bg-neutral-700' },
    { label: '61–90 dias', valor: kpis.aging.de61a90, cls: 'bg-neutral-800' },
    { label: '> 90 dias', valor: kpis.aging.acima90, cls: 'bg-neutral-950' },
  ]

  // mapeamento faixa index → params de cobrancas para o aging da carteira
  const onAgingClick = useCallback((i: number) => {
    const ranges: ([number, number] | [number, null] | null)[] = [
      null,           // A vencer → filtro de status
      [1, 5],
      [6, 15],
      [16, 30],
      [31, 60],
      [61, 90],
      [91, null],
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

      {/* Taxas da carteira — foto de hoje, sobre o total a receber. Bloco
          principal agrupado, com leve tom aço para destacar dos cards do mês
          (sem exagero). Inadimplência é a north star (keyline). A variação
          (▲/▼) lê a tendência: subir inadimplência/atraso = piora. */}
      <section className="mt-2">
        <div
          className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line
            bg-line shadow-xs sm:grid-cols-2 xl:grid-cols-4"
        >
          <KpiCard
            variant="panel"
            highlight
            label="Taxa de inadimplência"
            value={formatarPct(kpis.pctInadimplenciaValor)}
            meta={`${formatarMoeda(kpis.valorInadimplente)} vencido há mais de 15 dias`}
            trend={{ series: taxasSerie.inadimplencia, higherIsBetter: false, unit: 'pp' }}
          />
          <KpiCard
            variant="panel"
            label="Taxa em atraso"
            value={formatarPct(kpis.pctAtrasoValor)}
            meta={`${formatarMoeda(kpis.valorEmAtraso)} vencido · inclui ${formatarPct(kpis.pctInadimplenciaValor)} inadimplente`}
            trend={{ series: taxasSerie.atraso, higherIsBetter: false, unit: 'pp' }}
          />
          <KpiCard
            variant="panel"
            label="Taxa em negociação"
            value={formatarPct(negociacao.pct)}
            meta={`${negociacao.count} de ${negociacao.abertos} títulos · ${formatarMoeda(negociacao.valor)} com promessa ativa`}
            sparkline={negociacao.serie}
          />
          <KpiCard
            variant="panel"
            label="Total a receber"
            value={formatarMoeda(kpis.totalAReceber)}
            meta={`posição em ${formatarData(DATA_BASE)} · carteira em aberto`}
            sparkline={taxasSerie.carteira}
          />
        </div>
      </section>

      {/* Resultado do mês — KPIs por mês de vencimento, recortados pelo seletor.
          Sparkline = últimos 6 meses; ▲/▼ = mês selecionado vs. o anterior. */}
      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-base font-semibold text-ink">
            Resultado de {rotuloMesLongo(mes.mes)}
          </h2>
          <MesSelect value={mesRef} onChange={setMesRef} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Recebido na data correta"
            value={formatarPct(mes.pctRecebidoNoVencimento)}
            meta={`${formatarMoeda(mes.recebidoNoVencimento)} pago até o vencimento`}
            trend={{ series: trilha.recebidoNoVencimento, higherIsBetter: true, unit: 'pp' }}
          />
          <KpiCard
            label="Recebido do mês"
            value={formatarPct(mes.pctRecebidoMes)}
            meta={`${formatarMoeda(mes.recebido)} de ${formatarMoeda(mes.previsto)} previsto`}
            trend={{ series: trilha.recebidoMes, higherIsBetter: true, unit: 'pp' }}
          />
          <KpiCard
            label="Inadimplência do mês"
            value={formatarPct(mes.pctDesempenho)}
            meta={`${formatarMoeda(mes.inadimplenteAposCorte)} sem pagar após 15 dias`}
            valueClassName="text-inadimplente-fg"
            trend={{ series: trilha.desempenho, higherIsBetter: false, unit: 'pp' }}
          />
          <KpiCard
            label="Dias médios de atraso"
            value={`${mes.diasMediosAtraso} dias`}
            meta="média dos títulos pagos com atraso"
            trend={{ series: trilha.diasMedios, higherIsBetter: false, unit: 'dias' }}
          />
        </div>
      </section>

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
