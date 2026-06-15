/* "Sincronizado há X min" — o frescor do dado sustenta a autoridade (DS v5).
   Sempre visível no topo; vira erro quando a conexão com o Certtus cai. */

interface SyncStatusProps {
  /** texto pronto, ex.: "Sincronizado há 12 min" */
  text: string
  error?: boolean
}

export function SyncStatus({ text, error = false }: SyncStatusProps) {
  return (
    <span
      className={`num inline-flex items-center gap-2 whitespace-nowrap font-mono text-xs
        ${error ? 'text-error-fg' : 'text-ink-muted'}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${error ? 'bg-atrasado-base' : 'bg-pago-base'}`}
      />
      {text}
    </span>
  )
}
