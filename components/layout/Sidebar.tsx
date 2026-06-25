'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  IconDashboard,
  IconCreditCard,
  IconMessageSquare,
  IconSettings,
} from '../icons'
import { podeAcessar, type Perfil, PERMISSOES } from '../../lib/auth'

interface NavItem {
  href: string
  label: string
  Icon: typeof IconDashboard
  recurso: keyof (typeof PERMISSOES)['admin']
}

// Títulos absorve a antiga lista de Clientes (agora um filtro). Admin é o hub
// de Gestão de Usuários e Parametrizações.
const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', Icon: IconDashboard, recurso: 'dashboard' },
  { href: '/titulos', label: 'Títulos', Icon: IconCreditCard, recurso: 'cobrancas' },
  { href: '/processo-cobranca', label: 'Processo de Cobrança', Icon: IconMessageSquare, recurso: 'reguas' },
  { href: '/admin', label: 'Admin', Icon: IconSettings, recurso: 'configuracoes' },
]

interface SidebarProps {
  perfil: Perfil
  /** fecha o drawer no mobile após navegar */
  onNavigate?: () => void
}

/* Nav lateral em aço-800. Item ativo: barra laranja 3px + texto branco —
   laranja aponta, não preenche (DS v5 slide 16). */
export function Sidebar({ perfil, onNavigate }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-[var(--nav-width)] flex-col bg-steel-800">
      <div className="flex items-center px-5 pb-4 pt-6">
        <Image
          src="/logo_rf.png"
          alt="Retífica Formiguense"
          width={400}
          height={100}
          className="h-auto w-full mix-blend-screen"
          priority
        />
      </div>

      <div className="label-mono px-5 pb-2 pt-3 text-steel-300">Cobrança RF</div>

      <nav className="flex flex-col gap-0.5 px-3">
        {NAV_ITEMS.map(({ href, label, Icon, recurso }) => {
          if (!podeAcessar(perfil, recurso)) return null
          // Títulos absorve o detalhe de cliente (/clientes/[id]) — acende junto
          const active =
            pathname === href ||
            pathname.startsWith(href + '/') ||
            (href === '/titulos' && pathname.startsWith('/clientes'))
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`relative flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium
                transition-colors duration-100
                ${active ? 'bg-white/10 text-white' : 'text-steel-200 hover:bg-white/5 hover:text-white'}`}
            >
              {active && (
                <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-sm bg-accent" />
              )}
              <Icon size={17} className="shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto px-5 py-4">
        <span className="label-mono text-steel-400">Protótipo · dados fictícios</span>
      </div>
    </aside>
  )
}
