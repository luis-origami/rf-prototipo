import type React from 'react'
import { Sparkline, type SparklineTone } from './Sparkline'

/* KPI: rótulo mono 11px + valor em Plex Serif (peso e autoridade) com
   algarismos lining+tabular. Opcionalmente mostra a variação vs. período
   anterior (▲/▼, verde = melhora, vermelho = piora) e uma sparkline da
   tendência. Variante 'panel' para o bloco principal agrupado (sem chrome
   próprio — herda o fundo do contêiner). */

export type TrendUnit = 'pp' | 'dias'

export interface KpiTrend {
  /** série recente da métrica; termina no valor exibido */
  series: number[]
  /** se subir é bom (recebimento) ou ruim (inadimplência) */
  higherIsBetter: boolean
  unit: TrendUnit
}

interface KpiCardProps {
  label: string
  value: string
  /** metadado abaixo do valor (ex.: "R$ 241.000 vencido há mais de 15 dias") */
  meta?: React.ReactNode
  /** keyline laranja — para o KPI protagonista da tela */
  highlight?: boolean
  /** cor do valor — usar apenas tokens fg da régua de severidade */
  valueClassName?: string
  /** 'light' = card branco isolado · 'panel' = célula de bloco agrupado */
  variant?: 'light' | 'panel'
  /** variação + sparkline com leitura de melhora/piora */
  trend?: KpiTrend
  /** sparkline neutra (sem badge) — para métricas de volume, ex. total a receber */
  sparkline?: number[]
}

// uma casa decimal, vírgula pt-BR, sem zero à direita
function fmtDelta(v: number): string {
  return Math.abs(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

export function KpiCard({
  label,
  value,
  meta,
  highlight = false,
  valueClassName,
  variant = 'light',
  trend,
  sparkline,
}: KpiCardProps) {
  // variação vs. período anterior + tom (melhora/piora)
  let delta: number | null = null
  let tone: SparklineTone = 'neutral'
  if (trend && trend.series.length >= 2) {
    const s = trend.series
    delta = s[s.length - 1] - s[s.length - 2]
    if (delta === 0) tone = 'neutral'
    else tone = delta > 0 === trend.higherIsBetter ? 'good' : 'bad'
  }

  const badgeColor =
    tone === 'good' ? 'text-pago-base' : tone === 'bad' ? 'text-atrasado-base' : 'text-ink-muted'
  const arrow = delta == null || delta === 0 ? '' : delta > 0 ? '▲' : '▼'
  const unitLabel = trend?.unit === 'dias' ? ' d' : ' pp'

  const sparkData = trend?.series ?? sparkline
  const sparkTone: SparklineTone = trend ? tone : 'neutral'

  const container =
    variant === 'panel'
      ? `bg-transparent p-5 ${highlight ? 'border-t-[3px] border-t-accent' : ''}`
      : `rounded-lg border border-line bg-surface p-5 shadow-xs ${
          highlight ? 'border-t-[3px] border-t-accent' : ''
        }`

  return (
    <div className={container}>
      <div className="label-mono text-ink-muted">{label}</div>

      <div className="mt-2 flex items-baseline gap-2">
        <span
          className={`num font-display text-2xl font-bold leading-none lg:text-3xl ${valueClassName ?? 'text-ink'}`}
        >
          {value}
        </span>
        {delta != null && delta !== 0 && (
          <span className={`num label-mono flex items-baseline gap-0.5 ${badgeColor}`}>
            <span aria-hidden="true">{arrow}</span>
            {fmtDelta(delta)}
            {unitLabel}
          </span>
        )}
      </div>

      {sparkData && <Sparkline data={sparkData} tone={sparkTone} className="mt-3 h-7 w-full" />}

      {meta && <div className="num mt-3 font-mono text-xs text-ink-muted">{meta}</div>}
    </div>
  )
}
