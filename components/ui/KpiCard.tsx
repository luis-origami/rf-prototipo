import type React from 'react'

/* KPI: rótulo mono 11px + valor em Plex Serif (peso e autoridade) com
   algarismos lining+tabular. Keyline laranja opcional = destaque pontual. */

interface KpiCardProps {
  label: string
  value: string
  /** metadado abaixo do valor (ex.: "13 clientes · 13 boletos") */
  meta?: React.ReactNode
  /** keyline superior laranja — para o KPI protagonista da tela */
  highlight?: boolean
  /** cor do valor — usar apenas tokens fg da régua de severidade */
  valueClassName?: string
}

export function KpiCard({ label, value, meta, highlight = false, valueClassName = 'text-ink' }: KpiCardProps) {
  return (
    <div
      className={`rounded-lg border border-line bg-surface p-5 shadow-xs
        ${highlight ? 'border-t-[3px] border-t-accent' : ''}`}
    >
      <div className="label-mono text-ink-muted">{label}</div>
      <div className={`num mt-2 font-display text-2xl font-bold leading-none lg:text-3xl ${valueClassName}`}>
        {value}
      </div>
      {meta && <div className="num mt-2 font-mono text-xs text-ink-muted">{meta}</div>}
    </div>
  )
}
