'use client'

import { useCallback, useRef, useState } from 'react'
import { IconCheck } from '../components/icons'

/* Toast = confirmação efêmera de ação, voz sóbria ("Pagamento registrado.").
   Erro crítico nunca em toast — use <Alert kind="error"> fixo. DS v5 slide 17. */

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const toast = useCallback((message: string) => {
    setMsg(message)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(null), 3200)
  }, [])

  const toastHost = msg ? (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[60] animate-fade-up">
      <div className="flex items-center gap-2.5 rounded-md bg-steel-800 px-4 py-3 text-sm text-white shadow-lg">
        <IconCheck size={16} className="shrink-0 text-pago-border" />
        {msg}
      </div>
    </div>
  ) : null

  return { toast, toastHost }
}
