// Alocação de clientes a réguas — override (localStorage) sobre a alocação
// estática do seed (getReguaDoCliente: r01 padrão / r02 reincidente). Usado para
// mover clientes de uma régua para outra, ex.: ao excluir uma régua que tem
// clientes alocados, o sistema realoca esses clientes para a régua escolhida.

import { clientes, getReguaDoCliente, type Cliente } from '../mocks'

export type Alocacao = Record<string, string> // clienteId -> reguaId

const LS = 'rf_alocacao_regua'

function isBrowser() {
  return typeof window !== 'undefined'
}

function ler(): Alocacao {
  if (!isBrowser()) return {}
  try {
    const raw = localStorage.getItem(LS)
    const p = raw ? JSON.parse(raw) : {}
    return p && typeof p === 'object' ? (p as Alocacao) : {}
  } catch {
    return {}
  }
}

function salvar(a: Alocacao): void {
  if (!isBrowser()) return
  localStorage.setItem(LS, JSON.stringify(a))
  window.dispatchEvent(new Event('alocacao-changed'))
}

// régua atual de um cliente: override do store > alocação do seed
export function getReguaIdDoCliente(clienteId: string, aloc: Alocacao): string {
  return aloc[clienteId] ?? getReguaDoCliente(clienteId).id
}

export function getClientesDaRegua(reguaId: string, aloc: Alocacao): Cliente[] {
  return clientes.filter((c) => getReguaIdDoCliente(c.id, aloc) === reguaId)
}

/** move todos os clientes da régua de origem para a régua de destino */
export function realocarClientes(deReguaId: string, paraReguaId: string): void {
  const atual = ler()
  for (const c of clientes) {
    if (getReguaIdDoCliente(c.id, atual) === deReguaId) atual[c.id] = paraReguaId
  }
  salvar(atual)
}

// ── snapshot / subscribe (external store) ──
let _raw: string | null = null
let _val: Alocacao = {}

export function getAlocacoesSnapshot(): Alocacao {
  if (!isBrowser()) return {}
  const raw = localStorage.getItem(LS)
  if (raw !== _raw) {
    _raw = raw
    _val = ler()
  }
  return _val
}

export function getServerAlocacoesSnapshot(): Alocacao {
  return {}
}

export function subscribeAlocacoes(cb: () => void): () => void {
  window.addEventListener('alocacao-changed', cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener('alocacao-changed', cb)
    window.removeEventListener('storage', cb)
  }
}
