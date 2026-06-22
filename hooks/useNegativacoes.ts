'use client'

import { useSyncExternalStore } from 'react'
import {
  getNegativacoesSnapshot,
  getServerNegativacoesSnapshot,
  subscribeNegativacoes,
  type RegistroNegativacao,
} from '../lib/negativacao'

// Registros de negativação como external store — lista de clientes e detalhe
// leem a mesma fonte; negativar num lugar reflete no outro.
export function useNegativacoes(): RegistroNegativacao[] {
  return useSyncExternalStore(
    subscribeNegativacoes,
    getNegativacoesSnapshot,
    getServerNegativacoesSnapshot,
  )
}
