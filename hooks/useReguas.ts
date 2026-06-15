'use client'

import { useSyncExternalStore } from 'react'
import {
  getReguasSnapshot,
  getServerReguasSnapshot,
  subscribeReguas,
} from '../lib/reguasStore'
import type { ReguaCobranca } from '../mocks'

// Réguas padrão como external store — a tela de Réguas e Notificações edita,
// o Kanban deriva os marcos, o detalhe do cliente parte delas.
export function useReguas(): ReguaCobranca[] {
  return useSyncExternalStore(subscribeReguas, getReguasSnapshot, getServerReguasSnapshot)
}
