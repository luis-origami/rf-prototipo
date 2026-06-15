'use client'

import { useSyncExternalStore } from 'react'
import {
  getAbonosSnapshot,
  getServerAbonosSnapshot,
  subscribeAbonos,
  type Abono,
} from '../lib/abonos'

// Trilha de abonos como external store — detalhe do título e lista de
// cobranças leem a mesma fonte; registrar em uma tela reflete na outra.
export function useAbonos(): Abono[] {
  return useSyncExternalStore(subscribeAbonos, getAbonosSnapshot, getServerAbonosSnapshot)
}
