import type React from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  isLoading?: boolean
}

/* DS v5 · regra de ouro: ação é aço (executar não é alarmar); laranja nunca
   preenche botão; destrutiva usa o único vermelho da régua. */
const VARIANT: Record<Variant, string> = {
  primary: 'bg-action text-white hover:bg-action-hover active:bg-action-active',
  secondary: 'bg-surface text-ink border-line-strong hover:bg-neutral-100',
  ghost: 'bg-transparent text-link hover:bg-primary-50',
  destructive: 'bg-atrasado-base text-white hover:bg-atrasado-fg',
}

const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
}

const SPINNER: Record<Variant, string> = {
  primary: 'border-white/35 border-t-white',
  secondary: 'border-neutral-300 border-t-neutral-700',
  ghost: 'border-primary-200 border-t-link',
  destructive: 'border-white/35 border-t-white',
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`relative inline-flex items-center justify-center gap-2 rounded-md border border-transparent
        font-semibold leading-none transition-colors duration-100 focus-ring
        disabled:cursor-not-allowed disabled:opacity-40
        ${VARIANT[variant]} ${SIZE[size]} ${isLoading ? 'pointer-events-none' : ''} ${className}`}
      {...rest}
    >
      <span className={`inline-flex items-center gap-2 ${isLoading ? 'invisible' : ''}`}>{children}</span>
      {isLoading && (
        <span
          className={`absolute h-4 w-4 animate-spin rounded-full border-2 ${SPINNER[variant]}`}
          aria-label="Carregando"
        />
      )}
    </button>
  )
}
