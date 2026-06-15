'use client'

import { useState } from 'react'
import { ancoraParaDias, boletos, formatarMoeda } from '../../mocks'
import {
  adicionarColuna,
  editarColuna,
  removerColuna,
  restaurarPadrao,
  colunaDoBoleto,
  marcosDisponiveis,
  MAX_COLUNAS_KANBAN,
  type ColunaKanban,
} from '../../lib/kanban'
import { useColunasKanban } from '../../hooks/useColunasKanban'
import { useReguas } from '../../hooks/useReguas'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Alert'
import { Field } from '../ui/Field'
import { Input } from '../ui/Input'
import { MultiSelectDropdown, type DropdownOption } from '../ui/MultiSelectDropdown'
import { IconEdit, IconRefreshCw, IconTrash2 } from '../icons'

/* Etapas do Kanban de cobranças — aba de Réguas e Notificações. Todas as
   etapas são manipuláveis (criar, editar e remover, inclusive as padrão);
   o seed padrão pode ser restaurado a qualquer momento. Limite de 7; um
   marco pertence a uma única etapa. A posição dos títulos é derivada do
   vencimento — nada se move manualmente e nada grava no Certtus. */

interface EtapasKanbanEditorProps {
  podeEditar: boolean
  /** toast da tela hospedeira — um host só por página */
  toast: (mensagem: string) => void
}

export function EtapasKanbanEditor({ podeEditar, toast }: EtapasKanbanEditorProps) {
  const colunas = useColunasKanban()
  // assina o store de réguas — marcos recém-cadastrados lá aparecem aqui na hora
  useReguas()

  // criação
  const [titulo, setTitulo] = useState('')
  const [marcos, setMarcos] = useState<Set<string>>(new Set())
  const [erro, setErro] = useState('')

  // edição inline — uma etapa por vez
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editTitulo, setEditTitulo] = useState('')
  const [editMarcos, setEditMarcos] = useState<Set<string>>(new Set())
  const [editErro, setEditErro] = useState('')

  const marcosLivres = marcosDisponiveis(colunas)
  const noLimite = colunas.length >= MAX_COLUNAS_KANBAN

  const opcoesMarcos: DropdownOption[] = marcosLivres.map((m) => ({ value: m, label: m }))

  // fotografia de hoje por etapa — quantos títulos em aberto caem em cada coluna
  const porColuna = colunas.map((coluna) => {
    const itens = boletos.filter((b) => colunaDoBoleto(b, colunas)?.id === coluna.id)
    return {
      ...coluna,
      qtd: itens.length,
      soma: itens.reduce((s, b) => s + b.valor, 0),
    }
  })

  function adicionar() {
    if (!titulo.trim()) {
      setErro('Informe o nome da etapa.')
      return
    }
    if (marcos.size === 0) {
      setErro('Selecione ao menos um marco da régua.')
      return
    }
    if (!adicionarColuna(titulo, [...marcos])) {
      setErro('Não foi possível adicionar — verifique o limite de etapas e os marcos livres.')
      return
    }
    setTitulo('')
    setMarcos(new Set())
    setErro('')
    toast('Etapa adicionada ao Kanban.')
  }

  function iniciarEdicao(coluna: ColunaKanban) {
    setEditandoId(coluna.id)
    setEditTitulo(coluna.titulo)
    setEditMarcos(new Set(coluna.marcos))
    setEditErro('')
  }

  function salvarEdicao() {
    if (!editandoId) return
    if (!editTitulo.trim()) {
      setEditErro('Informe o nome da etapa.')
      return
    }
    if (editMarcos.size === 0) {
      setEditErro('Selecione ao menos um marco da régua.')
      return
    }
    if (!editarColuna(editandoId, editTitulo, [...editMarcos])) {
      setEditErro('Não foi possível salvar — verifique os marcos selecionados.')
      return
    }
    setEditandoId(null)
    toast('Etapa atualizada.')
  }

  function remover(id: string) {
    if (editandoId === id) setEditandoId(null)
    removerColuna(id)
    toast('Etapa removida — os marcos voltaram a ficar disponíveis.')
  }

  function restaurar() {
    setEditandoId(null)
    restaurarPadrao()
    toast('Etapas padrão restauradas.')
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_360px]">
      {/* etapas vigentes — na ordem da régua (menor marco primeiro) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <span className="label-mono text-ink-muted">Etapas vigentes</span>
          <span className="num font-mono text-xs text-ink-muted">
            {colunas.length}/{MAX_COLUNAS_KANBAN}
          </span>
        </div>

        {porColuna.length === 0 && (
          <div className="rounded-lg border border-dashed border-line-strong bg-neutral-50 p-6
            text-center text-sm text-ink-muted">
            Nenhuma etapa configurada — o Kanban fica vazio. Crie uma etapa ao lado ou restaure
            as padrão.
          </div>
        )}

        {porColuna.map((coluna) => {
          const emEdicao = editandoId === coluna.id
          // na edição, os marcos da própria etapa continuam selecionáveis
          const opcoesEdicao: DropdownOption[] = [...new Set([...marcosLivres, ...coluna.marcos])]
            .sort((a, b) => ancoraParaDias(a) - ancoraParaDias(b))
            .map((m) => ({ value: m, label: m }))

          return (
            <div key={coluna.id} className="rounded-lg border border-line bg-surface p-4">
              {emEdicao ? (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Nome da etapa" error={editErro || undefined}>
                      <Input
                        value={editTitulo}
                        invalid={!!editErro}
                        onChange={(e) => {
                          setEditTitulo(e.target.value)
                          if (editErro) setEditErro('')
                        }}
                        className="w-full"
                      />
                    </Field>
                    <Field label="Marcos da régua">
                      <MultiSelectDropdown
                        selected={editMarcos}
                        onChange={(next) => {
                          setEditMarcos(next)
                          if (editErro) setEditErro('')
                        }}
                        options={opcoesEdicao}
                        placeholder="Selecionar marcos"
                        todos="marcar"
                        className="w-full"
                      />
                    </Field>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditandoId(null)}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={salvarEdicao}>
                      Salvar etapa
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="font-display text-base font-semibold text-ink">
                      {coluna.titulo}
                    </span>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {coluna.marcos.map((m) => (
                        <span
                          key={m}
                          className="num rounded-sm border border-steel-200 bg-steel-50 px-2 py-0.5
                            font-mono text-xs font-medium text-steel-600"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="num whitespace-nowrap font-mono text-xs text-ink-muted">
                    {coluna.qtd} {coluna.qtd === 1 ? 'título' : 'títulos'} hoje · {formatarMoeda(coluna.soma)}
                  </span>
                  {podeEditar && (
                    <span className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => iniciarEdicao(coluna)}>
                        <IconEdit size={13} />
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remover(coluna.id)}>
                        <IconTrash2 size={13} />
                        Remover
                      </Button>
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs leading-relaxed text-ink-muted">
            Ao remover ou editar uma etapa, os marcos liberados ficam disponíveis para as demais.
            A posição dos títulos no board é derivada do vencimento — nada grava no Certtus.
          </p>
          {podeEditar && (
            <Button variant="ghost" size="sm" onClick={restaurar}>
              <IconRefreshCw size={13} />
              Restaurar etapas padrão
            </Button>
          )}
        </div>
      </div>

      {/* nova etapa — formulário na própria tela; overflow visível para o
          dropdown de marcos não ser cortado pelo card */}
      <Card overflowVisible>
        <Card.Header>
          <Card.Title>Nova etapa</Card.Title>
          <span className="label-mono text-ink-muted">Limite de {MAX_COLUNAS_KANBAN}</span>
        </Card.Header>
        <Card.Body className="flex flex-col gap-4">
          {!podeEditar ? (
            <Alert kind="info" title="Somente leitura.">
              O perfil comercial consulta as etapas, mas não as altera.
            </Alert>
          ) : noLimite ? (
            <Alert kind="info" title={`Limite de ${MAX_COLUNAS_KANBAN} etapas atingido.`}>
              Remova uma etapa para criar outra.
            </Alert>
          ) : (
            <>
              <Field label="Nome da etapa" error={erro || undefined}>
                <Input
                  value={titulo}
                  invalid={!!erro}
                  onChange={(e) => {
                    setTitulo(e.target.value)
                    if (erro) setErro('')
                  }}
                  placeholder="Ex.: Pré-jurídico"
                  className="w-full"
                />
              </Field>
              <Field
                label="Marcos da régua"
                helper="Um marco pertence a uma única etapa — só os livres aparecem aqui."
              >
                {marcosLivres.length === 0 ? (
                  <p className="text-sm text-ink-muted">
                    Todos os marcos já estão vinculados a etapas existentes — edite ou remova uma
                    etapa para liberar marcos.
                  </p>
                ) : (
                  <MultiSelectDropdown
                    selected={marcos}
                    onChange={(next) => {
                      setMarcos(next)
                      if (erro) setErro('')
                    }}
                    options={opcoesMarcos}
                    placeholder="Selecionar marcos"
                    todos="marcar"
                    className="w-full"
                  />
                )}
              </Field>
            </>
          )}
        </Card.Body>
        {podeEditar && !noLimite && (
          <Card.Footer>
            <Button onClick={adicionar}>Adicionar etapa</Button>
          </Card.Footer>
        )}
      </Card>
    </div>
  )
}
