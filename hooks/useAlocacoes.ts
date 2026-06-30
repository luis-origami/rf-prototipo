'use client'

import { useSyncExternalStore } from 'react'
import {
  getAlocacoesSnapshot,
  getServerAlocacoesSnapshot,
  subscribeAlocacoes,
  type Alocacao,
} from '../lib/alocacaoStore'

// Alocação cliente → régua como external store — a tela de réguas conta os
// clientes por régua e os realoca ao excluir uma régua.
export function useAlocacoes(): Alocacao {
  return useSyncExternalStore(subscribeAlocacoes, getAlocacoesSnapshot, getServerAlocacoesSnapshot)
}
