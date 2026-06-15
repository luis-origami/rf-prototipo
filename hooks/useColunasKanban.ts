'use client'

import { useSyncExternalStore } from 'react'
import {
  getColunasSnapshot,
  getServerColunasSnapshot,
  subscribeColunas,
  type ColunaKanban,
} from '../lib/kanban'

// Etapas do Kanban como external store — configuráveis pelo usuário
// (limite de 7), compartilhadas entre board e modal de cadastro.
export function useColunasKanban(): ColunaKanban[] {
  return useSyncExternalStore(subscribeColunas, getColunasSnapshot, getServerColunasSnapshot)
}
