'use client'

import { useMemo, useState } from 'react'
import type React from 'react'
import { IconLock, IconChevronUp, IconChevronDown, IconChevronsUpDown } from '../icons'

/* A protagonista (DS v5 slide 15).
   · Sem zebra — separação por borda de 1px (zebra + 5 cores de badge = ruído)
   · Números/datas em mono tabular à direita
   · Cadeado no cabeçalho marca coluna de fato Certtus — uma vez por coluna
   · Ordenação: clique no cabeçalho alterna asc/desc; seta + cor de link na
     coluna ativa. Número ordena numérico, texto alfabético (pt-BR)
   · Responsivo por overflow horizontal: dado financeiro não se trunca */

export interface Column<T> {
  key: string
  header: React.ReactNode
  render: (row: T) => React.ReactNode
  /** valor usado na ordenação — presença torna a coluna ordenável */
  sortValue?: (row: T) => string | number
  /** coluna numérica: mono tabular, alinhada à direita */
  numeric?: boolean
  /** coluna centralizada — usada para badges de status */
  center?: boolean
  /** fato vindo do Certtus (read-only) — exibe cadeado no cabeçalho */
  certtus?: boolean
  className?: string
}

interface SortState {
  key: string
  dir: 'asc' | 'desc'
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  dense?: boolean
  /** conteúdo exibido quando rows está vazio */
  empty?: React.ReactNode
}

function comparar(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base', numeric: true })
}

export function DataTable<T>({ columns, rows, rowKey, onRowClick, dense = false, empty }: DataTableProps<T>) {
  const rowH = dense ? 'h-[var(--table-row-h-dense)]' : 'h-[var(--table-row-h)]'
  const [sort, setSort] = useState<SortState | null>(null)

  function alternarSort(key: string) {
    setSort((prev) =>
      prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    )
  }

  const ordenadas = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sortValue) return rows
    const fator = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => comparar(col.sortValue!(a), col.sortValue!(b)) * fator)
  }, [rows, sort, columns])

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((col) => {
              const ativa = sort?.key === col.key
              const conteudo = (
                <>
                  {col.header}
                  {col.certtus && (
                    <IconLock
                      size={11}
                      className="ml-1 inline-block align-[-1px]"
                      aria-label="Fato Certtus · somente leitura"
                    />
                  )}
                </>
              )
              return (
                <th
                  key={col.key}
                  aria-sort={ativa ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={`label-mono h-9 whitespace-nowrap border-b border-line-strong bg-neutral-50
                    px-4 text-ink-muted
                    ${col.numeric ? 'text-right' : col.center ? 'text-center' : 'text-left'}
                    ${col.className ?? ''}`}
                >
                  {col.sortValue ? (
                    <button
                      type="button"
                      onClick={() => alternarSort(col.key)}
                      className={`label-mono inline-flex items-center gap-1 rounded-sm focus-ring
                        ${ativa ? 'text-link' : 'hover:text-ink'}`}
                    >
                      {conteudo}
                      {ativa ? (
                        sort.dir === 'asc' ? (
                          <IconChevronUp size={13} className="shrink-0" />
                        ) : (
                          <IconChevronDown size={13} className="shrink-0" />
                        )
                      ) : (
                        <IconChevronsUpDown size={13} className="shrink-0 text-neutral-400" />
                      )}
                    </button>
                  ) : (
                    conteudo
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {ordenadas.length === 0 && empty != null ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center">
                {empty}
              </td>
            </tr>
          ) : (
            ordenadas.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-line last:border-b-0 hover:bg-neutral-50
                  ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`${rowH} px-4 align-middle
                      ${col.numeric ? 'num whitespace-nowrap text-right font-mono' : ''}
                      ${col.center ? 'text-center' : ''}
                      ${col.className ?? ''}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
