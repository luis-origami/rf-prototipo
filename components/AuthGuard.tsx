'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import {
  getSessionSnapshot,
  getServerSessionSnapshot,
  subscribeSession,
} from '../lib/auth'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  // sessão vive no localStorage — external store, não estado React
  const sessao = useSyncExternalStore(subscribeSession, getSessionSnapshot, getServerSessionSnapshot)

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessao) router.replace('/login')
  }, [sessao, router])

  if (!sessao) return null
  return <>{children}</>
}
