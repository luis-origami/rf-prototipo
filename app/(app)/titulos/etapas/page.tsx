'use client'

import Link from 'next/link'
import { getSession, podeAcessar } from '../../../../lib/auth'
import { PageHeader } from '../../../../components/ui/PageHeader'
import { EtapasKanbanEditor } from '../../../../components/notificacoes/EtapasKanbanEditor'
import { useToast } from '../../../../hooks/useToast'
import { IconChevronLeft } from '../../../../components/icons'

/* Tela dedicada de configuração das etapas (colunas) do Kanban de cobrança.
   Acessada pelo botão "Gerenciar etapas" na visão Kanban de Títulos. */

export default function EtapasKanban() {
  const perfil = getSession()?.perfil ?? 'comercial'
  const podeEditar = podeAcessar(perfil, 'reguas')
  const { toast, toastHost } = useToast()

  return (
    <>
      <Link
        href="/titulos"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-link hover:underline focus-ring rounded-sm"
      >
        <IconChevronLeft size={15} />
        Títulos
      </Link>

      <PageHeader
        eyebrow="Kanban"
        title="Etapas do Kanban"
        description="Colunas do board de cobrança: agrupe os marcos da régua em etapas. A posição de cada título é derivada do vencimento — nada se move manualmente."
      />

      <div className="mt-5">
        <EtapasKanbanEditor podeEditar={podeEditar} toast={toast} />
      </div>

      {toastHost}
    </>
  )
}
