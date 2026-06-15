'use client'

export interface TabItem<T extends string = string> {
  id: T
  label: string
  count?: number
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (id: T) => void
}

/* Tab ativa: texto ink + barra laranja embaixo — laranja aponta, não preenche. */
export function Tabs<T extends string>({ items, value, onChange }: TabsProps<T>) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line">
      {items.map(({ id, label, count }) => {
        const active = id === value
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={`relative -mb-px flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2.5
              text-sm transition-colors duration-100 focus-ring
              ${active ? 'font-semibold text-ink' : 'font-medium text-ink-muted hover:text-ink'}`}
          >
            {label}
            {count != null && (
              <span
                className={`num rounded-full px-1.5 py-px font-mono text-xs
                  ${active ? 'bg-primary-100 text-primary-800' : 'bg-neutral-100 text-ink-muted'}`}
              >
                {count}
              </span>
            )}
            {active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" />}
          </button>
        )
      })}
    </div>
  )
}
