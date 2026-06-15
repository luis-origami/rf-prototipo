'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconChevronDown, IconLogOut, IconCheck } from '../icons'
import {
  logout,
  switchPerfil,
  PERFIL_LABEL,
  type Perfil,
  type Sessao,
} from '../../lib/auth'

const PERFIS: Perfil[] = ['admin', 'financeiro', 'comercial']

interface UserMenuProps {
  sessao: Sessao
}

export function UserMenu({ sessao }: UserMenuProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const iniciais = sessao.nome
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  function trocarPerfil(p: Perfil) {
    switchPerfil(p)
    // notifica o store de sessão (AppShell/Sidebar assinam via subscribeSession)
    window.dispatchEvent(new Event('perfil-changed'))
    setOpen(false)
  }

  function sair() {
    logout()
    router.replace('/login')
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors duration-100
          hover:bg-neutral-100 focus-ring"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-steel-500
          font-mono text-xs font-semibold text-white">
          {iniciais}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-semibold leading-tight text-ink">{sessao.nome}</span>
          <span className="label-mono block text-ink-muted">{PERFIL_LABEL[sessao.perfil]}</span>
        </span>
        <IconChevronDown size={14} className={`text-ink-muted transition-transform duration-100 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-60 rounded-lg border
          border-line-strong bg-surface p-2 shadow-md">
          <div className="px-3 py-2">
            <div className="text-sm font-semibold text-ink">{sessao.nome}</div>
            <div className="font-mono text-xs text-ink-muted">{sessao.email}</div>
          </div>
          <div className="mx-3 my-1 h-px bg-line" />
          <div className="label-mono px-3 py-1.5 text-ink-muted">Ver como · demo</div>
          {PERFIS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => trocarPerfil(p)}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left
                text-sm text-ink hover:bg-neutral-100"
            >
              {PERFIL_LABEL[p]}
              {sessao.perfil === p && <IconCheck size={14} className="text-link" />}
            </button>
          ))}
          <div className="mx-3 my-1 h-px bg-line" />
          <button
            type="button"
            onClick={sair}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm
              text-error-fg hover:bg-error-bg"
          >
            <IconLogOut size={15} />
            Sair
          </button>
        </div>
      )}
    </div>
  )
}
