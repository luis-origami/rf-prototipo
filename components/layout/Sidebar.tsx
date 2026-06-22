'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  IconDashboard,
  IconCreditCard,
  IconUsers2,
  IconMessageSquare,
  IconPercent,
  IconSettings,
  IconUserCog,
} from '../icons'
import { podeAcessar, type Perfil, PERMISSOES } from '../../lib/auth'

interface NavItem {
  href: string
  label: string
  Icon: typeof IconDashboard
  recurso: keyof (typeof PERMISSOES)['admin']
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', Icon: IconDashboard, recurso: 'dashboard' },
  { href: '/cobrancas', label: 'Cobranças', Icon: IconCreditCard, recurso: 'cobrancas' },
  { href: '/clientes', label: 'Clientes', Icon: IconUsers2, recurso: 'clientes' },
  { href: '/notificacoes', label: 'Réguas e Notificações', Icon: IconMessageSquare, recurso: 'reguas' },
  { href: '/abonos', label: 'Negociações', Icon: IconPercent, recurso: 'abonosSupervisao' },
  { href: '/configuracoes', label: 'Configurações', Icon: IconSettings, recurso: 'configuracoes' },
  { href: '/usuarios', label: 'Usuários', Icon: IconUserCog, recurso: 'usuarios' },
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
          const active = pathname === href || pathname.startsWith(href + '/')
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
