import type React from 'react'
import { IconCheckCircle, IconInfo, IconAlertTriangle, IconAlertCircle } from '../icons'

/* Alert = estado persistente na tela. Erro crítico nunca vai em toast.
   Um vermelho só — a FORMA (alert fixo) distingue falha de sistema de
   estado financeiro (badge pílula). DS v5 slides 04 e 17. */

type Kind = 'success' | 'info' | 'warning' | 'error'

const KIND: Record<Kind, { cls: string; Icon: typeof IconInfo }> = {
  success: { cls: 'bg-success-bg border-success-border text-success-fg', Icon: IconCheckCircle },
  info: { cls: 'bg-info-bg border-info-border text-info-fg', Icon: IconInfo },
  warning: { cls: 'bg-warning-bg border-warning-border text-warning-fg', Icon: IconAlertTriangle },
  error: { cls: 'bg-error-bg border-error-border text-error-fg', Icon: IconAlertCircle },
}

interface AlertProps {
  kind: Kind
  title: string
  children?: React.ReactNode
  className?: string
}

export function Alert({ kind, title, children, className = '' }: AlertProps) {
  const { cls, Icon } = KIND[kind]
  return (
    <div className={`flex items-start gap-3 rounded-md border p-4 text-sm leading-snug ${cls} ${className}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div>
        <strong className="block font-semibold">{title}</strong>
        {children}
      </div>
    </div>
  )
}
