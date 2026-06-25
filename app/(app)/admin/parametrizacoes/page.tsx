'use client'

import { useState } from 'react'
import { PARAMETROS_ENCARGOS } from '../../../../lib/parametros'
import { PageHeader } from '../../../../components/ui/PageHeader'
import { Card } from '../../../../components/ui/Card'
import { Button } from '../../../../components/ui/Button'
import { Alert } from '../../../../components/ui/Alert'
import { Tag } from '../../../../components/ui/Tag'
import { Switch } from '../../../../components/ui/Switch'
import { SyncStatus } from '../../../../components/ui/SyncStatus'
import { DataTable, type Column } from '../../../../components/ui/DataTable'
import { useToast } from '../../../../hooks/useToast'
import { IconRefreshCw, IconDatabase, IconPercent, IconEdit, IconCheck, IconX } from '../../../../components/icons'
import { Input } from '../../../../components/ui/Input'

type LogTipo = 'info' | 'warning' | 'error'

interface LogEntry {
  ts: string
  tipo: LogTipo
  msg: string
}

const LOG_CERTTUS: LogEntry[] = [
  { ts: '2026-06-04 09:48:12', tipo: 'info', msg: 'Sincronização concluída · 3 boletos atualizados, 0 erros' },
  { ts: '2026-06-04 09:36:01', tipo: 'info', msg: 'Sincronização concluída · 0 alterações' },
  { ts: '2026-06-04 09:24:00', tipo: 'info', msg: 'Sincronização concluída · 1 novo boleto' },
  { ts: '2026-06-04 09:12:00', tipo: 'info', msg: 'Sincronização concluída · 0 alterações' },
  { ts: '2026-06-04 09:00:00', tipo: 'warning', msg: 'Tentativa 2/3 — timeout na consulta de cobranças' },
  { ts: '2026-06-04 08:59:01', tipo: 'error', msg: 'Timeout ao consultar cobranças · retry em 60s' },
  { ts: '2026-06-04 08:48:00', tipo: 'info', msg: 'Sincronização concluída · 5 boletos atualizados' },
  { ts: '2026-06-03 17:30:00', tipo: 'info', msg: 'Sincronização concluída · 0 alterações' },
]

interface Mapeamento {
  certtus: string
  interno: string
  campos: string
}

const TABELAS: Mapeamento[] = [
  { certtus: 'CLIENTES', interno: 'clientes', campos: '12 campos mapeados' },
  { certtus: 'COBRANCAS', interno: 'boletos', campos: '8 campos mapeados' },
  { certtus: 'NF_SAIDA', interno: 'boletos.nfNumero', campos: '3 campos mapeados' },
  { certtus: 'SERV_EXEC', interno: 'boletos.descricao', campos: '2 campos mapeados' },
]

const LOG_DOT: Record<LogTipo, string> = {
  info: 'bg-pago-base',
  warning: 'bg-hoje-base',
  error: 'bg-atrasado-base',
}

export default function Configuracoes() {
  const { toast, toastHost } = useToast()
  const [simErro, setSimErro] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncText, setSyncText] = useState('Sincronizado há 12 min')
  const [editando, setEditando] = useState<'juros' | 'multa' | null>(null)
  const [valorJuros, setValorJuros] = useState(String(PARAMETROS_ENCARGOS.juros.pct * 100))
  const [valorMulta, setValorMulta] = useState(String(PARAMETROS_ENCARGOS.multa.pct * 100))

  const descJuros = `${valorJuros}% a.m. · pro rata die`
  const descMulta = `${valorMulta}% sobre o valor original`

  function salvar(campo: 'juros' | 'multa') {
    setEditando(null)
    toast(campo === 'juros' ? 'Juros de mora atualizados.' : 'Multa atualizada.')
  }

  function sincronizar() {
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      if (simErro) {
        toast('Falha na sincronização. Veja o log.')
      } else {
        setSyncText('Sincronizado agora')
        toast('Base sincronizada com o Certtus.')
      }
    }, 1400)
  }

  const colunasMapa: Column<Mapeamento>[] = [
    {
      key: 'certtus',
      header: 'Tabela Certtus',
      certtus: true,
      sortValue: (m) => m.certtus,
      render: (m) => <span className="num font-mono text-neutral-700">{m.certtus}</span>,
    },
    {
      key: 'interno',
      header: 'Entidade interna',
      sortValue: (m) => m.interno,
      render: (m) => <span className="num font-mono text-ink">{m.interno}</span>,
    },
    {
      key: 'campos',
      header: 'Mapeamento',
      sortValue: (m) => m.campos,
      render: (m) => <span className="text-ink-muted">{m.campos}</span>,
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Parametrizações"
        description="Parâmetros de encargos e integração com o ERP Certtus — fonte dos fatos financeiros, acesso estritamente de leitura."
      />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <div className="flex flex-col gap-6">
          {/* status da integração */}
          <Card>
            <Card.Header>
              <Card.Title>Integração Certtus</Card.Title>
              <Tag variant="source">read-only</Tag>
            </Card.Header>
            <Card.Body className="flex flex-col gap-4">
              {simErro ? (
                <Alert kind="error" title="Não foi possível sincronizar com o Certtus.">
                  Cobranças pausadas até a reconexão. Nenhuma notificação sai com dado defasado.
                </Alert>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-neutral-50 px-4 py-3">
                  <span className="flex items-center gap-2.5 text-sm font-medium text-ink">
                    <IconDatabase size={16} className="text-steel-400" />
                    PostgreSQL 9.2 · ERP Certtus
                  </span>
                  <SyncStatus text={syncText} />
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <Button variant="secondary" isLoading={syncing} onClick={sincronizar}>
                  <IconRefreshCw size={16} />
                  Sincronizar agora
                </Button>
                <label className="flex items-center gap-2 text-xs text-ink-muted">
                  Simular falha de conexão
                  <Switch checked={simErro} onChange={setSimErro} aria-label="Simular falha de conexão" />
                </label>
              </div>
            </Card.Body>
          </Card>

          {/* parâmetros de encargos — configuração central, não hardcoded.
              Os cálculos de juros/multa de todas as telas leem daqui */}
          <Card>
            <Card.Header>
              <Card.Title>Parâmetros de encargos</Card.Title>
              <span className="label-mono text-ink-muted">Estado de processo</span>
            </Card.Header>
            <Card.Body>
              <dl className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <dt className="flex items-center gap-2.5 text-sm font-medium text-ink">
                    <IconPercent size={15} className="text-steel-400" />
                    Juros de mora
                  </dt>
                  {editando === 'juros' ? (
                    <dd className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={valorJuros}
                          onChange={(e) => setValorJuros(e.target.value)}
                          className="w-20"
                          autoFocus
                        />
                        <span className="text-sm text-ink-muted">% a.m.</span>
                      </div>
                      <button type="button" onClick={() => salvar('juros')} className="rounded p-1 text-success-fg hover:bg-success-bg" aria-label="Confirmar">
                        <IconCheck size={15} />
                      </button>
                      <button type="button" onClick={() => setEditando(null)} className="rounded p-1 text-ink-muted hover:bg-neutral-100" aria-label="Cancelar">
                        <IconX size={15} />
                      </button>
                    </dd>
                  ) : (
                    <dd className="num flex items-center gap-3 font-mono text-sm text-ink">
                      {descJuros}
                      <button type="button" onClick={() => setEditando('juros')} className="rounded p-1 text-ink-muted hover:bg-neutral-100 hover:text-ink" aria-label="Editar juros de mora">
                        <IconEdit size={14} />
                      </button>
                    </dd>
                  )}
                </div>

                <div className="flex items-center justify-between gap-4">
                  <dt className="flex items-center gap-2.5 text-sm font-medium text-ink">
                    <IconPercent size={15} className="text-steel-400" />
                    Multa
                  </dt>
                  {editando === 'multa' ? (
                    <dd className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={valorMulta}
                          onChange={(e) => setValorMulta(e.target.value)}
                          className="w-20"
                          autoFocus
                        />
                        <span className="text-sm text-ink-muted">% s/ original</span>
                      </div>
                      <button type="button" onClick={() => salvar('multa')} className="rounded p-1 text-success-fg hover:bg-success-bg" aria-label="Confirmar">
                        <IconCheck size={15} />
                      </button>
                      <button type="button" onClick={() => setEditando(null)} className="rounded p-1 text-ink-muted hover:bg-neutral-100" aria-label="Cancelar">
                        <IconX size={15} />
                      </button>
                    </dd>
                  ) : (
                    <dd className="num flex items-center gap-3 font-mono text-sm text-ink">
                      {descMulta}
                      <button type="button" onClick={() => setEditando('multa')} className="rounded p-1 text-ink-muted hover:bg-neutral-100 hover:text-ink" aria-label="Editar multa">
                        <IconEdit size={14} />
                      </button>
                    </dd>
                  )}
                </div>
              </dl>
            </Card.Body>
          </Card>

          {/* mapeamento de tabelas */}
          <Card>
            <Card.Header>
              <Card.Title>Mapeamento de tabelas</Card.Title>
              <span className="label-mono text-ink-muted">Consulta, nunca escrita</span>
            </Card.Header>
            <div className="[&>div]:rounded-none [&>div]:border-0">
              <DataTable dense columns={colunasMapa} rows={TABELAS} rowKey={(m) => m.certtus} />
            </div>
          </Card>
        </div>

        {/* log de sincronização — sem dado pessoal, conforme LGPD */}
        <Card>
          <Card.Header>
            <Card.Title>Log de sincronização</Card.Title>
            <span className="label-mono text-ink-muted">Últimas 24 h</span>
          </Card.Header>
          <ul>
            {LOG_CERTTUS.map((l) => (
              <li key={l.ts} className="flex items-start gap-3 border-b border-line px-5 py-3 last:border-b-0">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${LOG_DOT[l.tipo]}`} />
                <div className="min-w-0">
                  <span className="num block font-mono text-xs text-ink-muted">{l.ts}</span>
                  <span className={`text-sm ${l.tipo === 'error' ? 'font-medium text-error-fg' : 'text-neutral-700'}`}>
                    {l.msg}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {toastHost}
    </>
  )
}
