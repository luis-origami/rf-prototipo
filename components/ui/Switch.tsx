'use client'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  'aria-label'?: string
}

/* Liga/desliga de etapa e integração. Ligado = aço (ação), nunca laranja. */
export function Switch({ checked, onChange, disabled = false, ...aria }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-100 focus-ring
        disabled:cursor-not-allowed disabled:opacity-40
        ${checked ? 'bg-action' : 'bg-neutral-300'}`}
      {...aria}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-xs transition-all duration-100
          ${checked ? 'left-[18px]' : 'left-0.5'}`}
      />
    </button>
  )
}
