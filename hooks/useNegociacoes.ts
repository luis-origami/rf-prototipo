'use client'

import { useSyncExternalStore } from 'react'
import {
  getRetornosSnapshot,
  getServerRetornosSnapshot,
  subscribeRetornos,
  type RetornoManualNegociacao,
} from '../lib/negociacoes'

// Histórico de retornos manuais de negociação como external store.
export function useNegociacoes(): RetornoManualNegociacao[] {
  return useSyncExternalStore(subscribeRetornos, getRetornosSnapshot, getServerRetornosSnapshot)
}
