/* Valor monetário para coluna de tabela: o "R$" fica fixo na borda esquerda
   da célula e os dígitos alinham à direita — o símbolo nunca dança com a
   largura do número (mono + tabular cuidam do alinhamento decimal). */

export function Money({ value }: { value: number }) {
  const numero = value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return (
    <span className="num flex w-full items-baseline justify-between gap-3 whitespace-nowrap font-mono">
      <span className="text-ink-muted">R$</span>
      {numero}
    </span>
  )
}
