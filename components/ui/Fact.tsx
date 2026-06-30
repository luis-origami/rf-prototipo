import type React from 'react'
import { Tag } from './Tag'

/* Fato Certtus em leitura — padrão display, não input (DS v5 slide 14).
   Não parece formulário porque nunca é editável. Quando vários fatos da
   mesma origem aparecem juntos, a tag vai UMA vez no grupo (FactGroup),
   não em cada fato. */

interface FactProps {
  label: string
  value: string
  /** origem do dado — exibe a tag com cadeado; omitir quando o grupo já a exibe */
  source?: string
}

export function Fact({ label, value, source }: FactProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="label-mono flex items-center gap-2 text-ink-muted">
        {source && <Tag variant="source">{source}</Tag>}
        {label}
      </span>
      <span className="num font-mono text-lg text-ink">{value}</span>
    </div>
  )
}

/* Grupo de fatos da mesma origem — uma tag para todos. */
interface FactGroupProps {
  /** origem do dado — passe null para não exibir a tag */
  source?: string | null
  children: React.ReactNode
}

export function FactGroup({ source = 'Certtus', children }: FactGroupProps) {
  return (
    <div className="flex flex-col items-start gap-2">
      {source && <Tag variant="source">{source}</Tag>}
      <div className="flex flex-wrap gap-x-10 gap-y-4">{children}</div>
    </div>
  )
}
