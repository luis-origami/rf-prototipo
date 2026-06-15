'use client'

import { useEffect } from 'react'
import type React from 'react'

/* Modal só para confirmação destrutiva ou foco total (DS v5 slide 16).
   Ação destrutiva nunca é a opção padrão — quem chama ordena os botões. */

interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  /** largura máxima — padrão 28rem (confirmação) */
  size?: 'sm' | 'md' | 'lg'
}

const SIZE = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }

export function Modal({ open, onClose, children, size = 'sm' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-steel-900/45 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* max-h + scroll: conteúdo maior que o viewport (ex.: abono no registro
          de comunicação) rola dentro do painel — botões sempre alcançáveis */}
      <div
        className={`max-h-[calc(100dvh-2rem)] w-full overflow-y-auto ${SIZE[size]}
          animate-fade-up rounded-xl bg-surface shadow-xl`}
      >
        {children}
      </div>
    </div>
  )
}

Modal.Header = function ModalHeader({ children }: { children: React.ReactNode }) {
  return (
    <header className="px-6 pb-2 pt-6">
      <h4 className="font-display text-xl font-bold text-ink">{children}</h4>
    </header>
  )
}

Modal.Body = function ModalBody({ children }: { children: React.ReactNode }) {
  return <div className="px-6 py-2 text-sm leading-relaxed text-neutral-700">{children}</div>
}

Modal.Footer = function ModalFooter({ children }: { children: React.ReactNode }) {
  return <footer className="flex justify-end gap-2 px-6 pb-6 pt-4">{children}</footer>
}
