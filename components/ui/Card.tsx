import type React from 'react'

/* Compound component — composição em vez de props excessivas.
   Card agrupa dados de uma entidade; nunca é botão inteiro clicável (DS v5). */

interface SectionProps {
  children: React.ReactNode
  className?: string
}

interface CardProps extends SectionProps {
  /** desliga o clipping — necessário quando o card contém dropdowns/popovers */
  overflowVisible?: boolean
}

export function Card({ children, className = '', overflowVisible = false }: CardProps) {
  return (
    <section
      className={`${overflowVisible ? '' : 'overflow-hidden'} rounded-lg border border-line
        bg-surface shadow-xs ${className}`}
    >
      {children}
    </section>
  )
}

Card.Header = function CardHeader({ children, className = '' }: SectionProps) {
  return (
    <header className={`flex items-center justify-between gap-3 border-b border-line px-5 py-4 ${className}`}>
      {children}
    </header>
  )
}

Card.Title = function CardTitle({ children, className = '' }: SectionProps) {
  return <h3 className={`font-display text-lg font-semibold text-ink ${className}`}>{children}</h3>
}

Card.Body = function CardBody({ children, className = '' }: SectionProps) {
  return <div className={`p-5 ${className}`}>{children}</div>
}

Card.Footer = function CardFooter({ children, className = '' }: SectionProps) {
  return (
    // cantos inferiores acompanham o raio do card — o bg não vaza quando o
    // card está com overflow visível (dropdowns)
    <footer
      className={`flex justify-end gap-2 rounded-b-[calc(var(--radius-lg)-1px)] border-t
        border-line bg-neutral-50 px-5 py-4 ${className}`}
    >
      {children}
    </footer>
  )
}
