'use client'

import Link from 'next/link'
import { PageHeader } from '../../../components/ui/PageHeader'
import { IconUserCog, IconSettings } from '../../../components/icons'

// Hub do Admin — centraliza Gestão de Usuários e Parametrizações (esta já
// reúne parâmetros de encargos, integração Certtus e log de sincronização).
const CARDS = [
  {
    href: '/admin/usuarios',
    titulo: 'Gestão de Usuários',
    descricao: 'Contas de acesso e perfis de permissão da plataforma.',
    Icon: IconUserCog,
  },
  {
    href: '/admin/parametrizacoes',
    titulo: 'Parametrizações',
    descricao: 'Parâmetros de encargos, integração Certtus e log de sincronização.',
    Icon: IconSettings,
  },
]

export default function Admin() {
  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Administração"
        description="Configurações da plataforma e gestão de acesso."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CARDS.map(({ href, titulo, descricao, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-start gap-4 rounded-lg border border-line bg-surface p-5
              transition-colors duration-100 hover:border-line-strong hover:bg-neutral-50 focus-ring"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-steel-500 group-hover:text-ink">
              <Icon size={20} />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-base font-semibold text-ink">{titulo}</span>
              <span className="mt-1 block text-sm text-ink-muted">{descricao}</span>
            </span>
          </Link>
        ))}
      </div>
    </>
  )
}
