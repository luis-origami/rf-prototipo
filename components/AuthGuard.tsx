'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import {
  getSessionSnapshot,
  getServerSessionSnapshot,
  subscribeSession,
  registrarAtividade,
  sessaoExpirada,
  expirarSessao,
} from '../lib/auth'

// verificação periódica da expiração — 30s de granularidade é suficiente
// para um timeout de 20 minutos
const CHECK_EXPIRACAO_MS = 30_000

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  // sessão vive no localStorage — external store, não estado React
  const sessao = useSyncExternalStore(subscribeSession, getSessionSnapshot, getServerSessionSnapshot)

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessao) router.replace('/login')
  }, [sessao, router])

  // expiração por inatividade: interação renova a janela de 20 min; um timer
  // encerra a sessão vencida (e o effect acima redireciona ao login)
  useEffect(() => {
    if (!sessao) return
    registrarAtividade()
    const renovar = () => registrarAtividade()
    window.addEventListener('pointerdown', renovar, { passive: true })
    window.addEventListener('keydown', renovar)
    const timer = setInterval(() => {
      if (sessaoExpirada()) expirarSessao()
    }, CHECK_EXPIRACAO_MS)
    return () => {
      window.removeEventListener('pointerdown', renovar)
      window.removeEventListener('keydown', renovar)
      clearInterval(timer)
    }
  }, [sessao])

  if (!sessao) return null
  return <>{children}</>
}
