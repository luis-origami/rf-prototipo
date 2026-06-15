'use client'

import { useState, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import type React from 'react'
import { Sidebar } from './Sidebar'
import { UserMenu } from './UserMenu'
import { SyncStatus } from '../ui/SyncStatus'
import { IconMenu, IconX } from '../icons'
import {
  getSessionSnapshot,
  getServerSessionSnapshot,
  subscribeSession,
} from '../../lib/auth'

/* Shell do app · desktop-first denso, responsivo deliberado:
   ≥ lg — nav lateral fixa de 232px (--nav-width), como o DS especifica.
   < lg — divergência consciente do DS v5 (slide 07, "sem responsivo"):
   a diretoria lê em notebook estreito/tablet; bloquear seria pior que adaptar.
   A nav vira drawer sobreposto; o conteúdo nunca reflui o dado financeiro. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const sessao = useSyncExternalStore(subscribeSession, getSessionSnapshot, getServerSessionSnapshot)

  // fecha o drawer ao navegar — ajuste de estado durante o render,
  // padrão recomendado em vez de setState dentro de effect
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setDrawerOpen(false)
  }

  const perfil = sessao?.perfil ?? 'comercial'

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* nav fixa — desktop */}
      <div className="hidden shrink-0 lg:block">
        <Sidebar perfil={perfil} />
      </div>

      {/* drawer — telas menores */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <Sidebar perfil={perfil} onNavigate={() => setDrawerOpen(false)} />
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setDrawerOpen(false)}
            className="flex-1 bg-steel-900/45"
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line
          bg-surface px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={drawerOpen ? 'Fechar menu' : 'Abrir menu'}
              onClick={() => setDrawerOpen((o) => !o)}
              className="rounded-md p-1.5 text-ink-muted hover:bg-neutral-100 hover:text-ink
                focus-ring lg:hidden"
            >
              {drawerOpen ? <IconX size={20} /> : <IconMenu size={20} />}
            </button>
            <SyncStatus text="Sincronizado há 12 min" />
          </div>
          {sessao && <UserMenu sessao={sessao} />}
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[87.5rem] p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
