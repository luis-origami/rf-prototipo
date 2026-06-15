import type React from 'react'

interface PageHeaderProps {
  /** eyebrow mono acima do título (ex.: "Visão geral") */
  eyebrow?: string
  title: string
  description?: string
  /** ações alinhadas à direita — um único botão primário por tela */
  actions?: React.ReactNode
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="label-mono mb-1 text-link">{eyebrow}</div>}
        <h1 className="font-display text-xl font-bold tracking-tight text-ink lg:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
