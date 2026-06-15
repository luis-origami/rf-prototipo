'use client'

import { useLayoutEffect, useRef, useState } from 'react'

/* Posiciona o tooltip dos gráficos: centrado no alvo (fração 0–1 da largura
   do wrapper) e clampado nas bordas com base na largura REAL do tooltip —
   nunca corta no limite do card, em qualquer largura de tela.
   useLayoutEffect roda antes do paint: sem flicker de posição. */

export function useTooltipClamp(targetFrac: number | null, contentKey?: unknown) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const [left, setLeft] = useState(0)

  // contentKey força a remedição quando o conteúdo (e a largura) do tooltip
  // muda sem mudar o alvo — ex.: faixas diferentes do mesmo mês
  useLayoutEffect(() => {
    if (targetFrac == null || !wrapRef.current || !tipRef.current) return
    const larguraWrap = wrapRef.current.clientWidth
    const larguraTip = tipRef.current.offsetWidth
    const centro = targetFrac * larguraWrap
    setLeft(Math.min(Math.max(centro - larguraTip / 2, 0), Math.max(larguraWrap - larguraTip, 0)))
  }, [targetFrac, contentKey])

  return { wrapRef, tipRef, left }
}
