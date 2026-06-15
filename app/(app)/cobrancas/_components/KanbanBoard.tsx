'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { formatarMoeda, type Boleto } from '../../../../mocks'
import {
  colunaDoBoleto,
  diasDoBoleto,
  marcoDoBoleto,
  type ColunaKanban,
} from '../../../../lib/kanban'
import { IconChevronLeft, IconChevronRight, IconX } from '../../../../components/icons'
import { KanbanCard } from './KanbanCard'

// largura da coluna (w-80 = 320px) + gap-4 — passo das setas de rolagem
const PASSO_COLUNA = 336

/* Board do Kanban de cobranças. Posicionamento 100% automático: a coluna é
   derivada do marco da régua (lib/kanban) — sem drag and drop, o estágio é
   fato do vencimento, não decisão do usuário. Dentro da coluna, os casos
   mais urgentes primeiro: dias de atraso desc, valor desc. As etapas são
   totalmente configuráveis (limite de 7) na aba "Etapas do Kanban" de
   Réguas e Notificações — inclusive as padrão. */

interface KanbanBoardProps {
  /** títulos em aberto, já passados pelos filtros ativos da tela */
  boletos: Boleto[]
  /** etapas configuradas — vindas do store (useColunasKanban) */
  colunas: ColunaKanban[]
  comunicacoesDoBoleto: (boleto: Boleto) => number
  onAbrir: (boleto: Boleto) => void
  onRegistrarComunicacao?: (boleto: Boleto) => void
  /** remoção de etapas — ausente sem permissão (gestão vive no editor dedicado) */
  onRemoverColuna?: (id: string) => void
}

export function KanbanBoard({
  boletos,
  colunas,
  comunicacoesDoBoleto,
  onAbrir,
  onRegistrarComunicacao,
  onRemoverColuna,
}: KanbanBoardProps) {
  // affordance de overflow: fade nas bordas + setas quando há etapas fora da
  // tela — sem isso o usuário só descobre as demais colunas rolando às cegas
  const scrollRef = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState({ esquerda: false, direita: false })

  function medirOverflow() {
    const el = scrollRef.current
    if (!el) return
    const esquerda = el.scrollLeft > 4
    const direita = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
    setOverflow((prev) =>
      prev.esquerda === esquerda && prev.direita === direita ? prev : { esquerda, direita },
    )
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    // medição inicial em rAF — layout pronto, sem setState direto no effect
    const raf = requestAnimationFrame(medirOverflow)
    el.addEventListener('scroll', medirOverflow, { passive: true })
    const ro = new ResizeObserver(medirOverflow)
    ro.observe(el)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('scroll', medirOverflow)
      ro.disconnect()
    }
    // remede quando o conjunto de colunas muda (criar/remover etapa)
  }, [colunas.length])

  function rolar(direcao: 1 | -1) {
    scrollRef.current?.scrollBy({ left: direcao * PASSO_COLUNA, behavior: 'smooth' })
  }

  const porColuna = useMemo(() => {
    const grupos = new Map<string, Boleto[]>(colunas.map((c) => [c.id, []]))
    for (const b of boletos) {
      const coluna = colunaDoBoleto(b, colunas)
      // sem marco atingido = ainda fora da régua — não aparece no board
      if (coluna) grupos.get(coluna.id)!.push(b)
    }
    for (const grupo of grupos.values()) {
      grupo.sort((a, b) => diasDoBoleto(b) - diasDoBoleto(a) || b.valor - a.valor)
    }
    return grupos
  }, [boletos, colunas])

  return (
    <div className="relative">
      {/* fade + seta à esquerda — há etapas anteriores fora da tela.
          A seta vive numa coluna de altura total e usa sticky: acompanha a
          rolagem vertical da página sem sair dos limites do board */}
      {overflow.esquerda && (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12
              bg-gradient-to-r from-canvas to-transparent"
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-y-2 left-1 z-20">
            <button
              type="button"
              aria-label="Rolar para as etapas anteriores"
              onClick={() => rolar(-1)}
              className="pointer-events-auto sticky top-[45vh] flex h-9 w-9 items-center
                justify-center rounded-full border border-line-strong bg-surface
                text-neutral-700 shadow-md transition-colors duration-100
                hover:bg-neutral-100 hover:text-ink focus-ring"
            >
              <IconChevronLeft size={17} />
            </button>
          </div>
        </>
      )}

      {/* fade + seta à direita — há mais etapas além das visíveis */}
      {overflow.direita && (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12
              bg-gradient-to-l from-canvas to-transparent"
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-y-2 right-1 z-20">
            <button
              type="button"
              aria-label="Rolar para as próximas etapas"
              onClick={() => rolar(1)}
              className="pointer-events-auto sticky top-[45vh] flex h-9 w-9 items-center
                justify-center rounded-full border border-line-strong bg-surface
                text-neutral-700 shadow-md transition-colors duration-100
                hover:bg-neutral-100 hover:text-ink focus-ring"
            >
              <IconChevronRight size={17} />
            </button>
          </div>
        </>
      )}

      <div ref={scrollRef} className="flex items-start gap-4 overflow-x-auto pb-2">
      {colunas.map((coluna) => {
        const itens = porColuna.get(coluna.id) ?? []
        const soma = itens.reduce((s, b) => s + b.valor, 0)
        return (
          <section
            key={coluna.id}
            aria-label={`${coluna.titulo} — ${itens.length} títulos`}
            className="w-80 shrink-0 rounded-lg border border-line bg-neutral-50"
          >
            {/* cabeçalho: nome, marcos agrupados, contagem e soma em aberto */}
            <header className="border-b border-line px-3 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  {coluna.titulo}
                  {onRemoverColuna && (
                    <button
                      type="button"
                      title="Remover etapa"
                      aria-label={`Remover a etapa ${coluna.titulo}`}
                      onClick={() => onRemoverColuna(coluna.id)}
                      className="rounded-sm p-0.5 text-ink-muted transition-colors duration-100
                        hover:text-ink focus-ring"
                    >
                      <IconX size={13} />
                    </button>
                  )}
                </h3>
                <span className="num font-mono text-xs text-ink-muted">{coluna.marcos.join(' · ')}</span>
              </div>
              <div className="num mt-0.5 font-mono text-xs text-ink-muted">
                {itens.length} {itens.length === 1 ? 'título' : 'títulos'} · {formatarMoeda(soma)}
              </div>
            </header>

            <div className="flex flex-col gap-2 p-2">
              {itens.length === 0 ? (
                <p className="rounded-md border border-dashed border-line-strong px-3 py-6 text-center text-xs text-ink-muted">
                  Nenhum título neste estágio.
                </p>
              ) : (
                itens.map((b) => (
                  <KanbanCard
                    key={b.id}
                    boleto={b}
                    marco={marcoDoBoleto(b, colunas)}
                    comunicacoes={comunicacoesDoBoleto(b)}
                    onAbrir={onAbrir}
                    onRegistrarComunicacao={onRegistrarComunicacao}
                  />
                ))
              )}
            </div>
          </section>
        )
      })}
      </div>
    </div>
  )
}
