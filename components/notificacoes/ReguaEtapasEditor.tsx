'use client'

import { useState } from 'react'
import type { EtapaRegua, Template } from '../../mocks'
import { Tag } from '../ui/Tag'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { Switch } from '../ui/Switch'
import { IconEdit, IconPlus, IconTrash2 } from '../icons'
import { NovaEtapaModal, type EtapaFormValues } from './NovaEtapaModal'

/* Editor de etapas de uma régua — usado na configuração global (réguas padrão)
   e no detalhe do cliente (régua específica). Cada etapa envia um único
   template (o mesmo template pode servir a várias etapas). Etapas podem ser
   ativadas/desativadas, editadas (marco, nome, tipo, template) e excluídas. */

interface ReguaEtapasEditorProps {
  etapas: EtapaRegua[]
  templates: Template[]
  /** false = somente leitura (perfil sem permissão de régua) */
  editable: boolean
  /** nome exibido no modal de nova etapa */
  reguaNome: string
  onToggle: (etapaId: string, ativo: boolean) => void
  onChangeTemplate: (etapaId: string, templateId: string) => void
  onAddEtapa: (values: EtapaFormValues) => void
  onEditEtapa: (etapaId: string, values: EtapaFormValues) => void
  onRemoveEtapa: (etapaId: string) => void
}

export function ReguaEtapasEditor({
  etapas,
  templates,
  editable,
  reguaNome,
  onToggle,
  onChangeTemplate,
  onAddEtapa,
  onEditEtapa,
  onRemoveEtapa,
}: ReguaEtapasEditorProps) {
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<EtapaRegua | null>(null)

  return (
    <>
      <ul>
        {etapas.map((e) => (
          <li
            key={e.id}
            className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3
              last:border-b-0 ${e.ativo ? '' : 'opacity-50'}`}
          >
            <span className="num w-12 shrink-0 font-mono text-xs font-semibold text-link">{e.ancora}</span>
            <div className="min-w-0 flex-1 basis-52">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-ink">{e.label}</span>
                <Tag>{e.tipo === 'handoff' ? 'Aviso ao financeiro' : 'WhatsApp'}</Tag>
              </div>
              <p className="mt-0.5 text-xs leading-snug text-ink-muted">{e.descricao}</p>
            </div>
            {editable ? (
              <Select
                value={e.templateId}
                onChange={(ev) => onChangeTemplate(e.id, ev.target.value)}
                className="w-60"
                aria-label={`Template da etapa ${e.ancora}`}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </Select>
            ) : (
              <span className="w-60 truncate font-mono text-xs text-ink-muted">
                {templates.find((t) => t.id === e.templateId)?.nome ?? '—'}
              </span>
            )}
            {editable && (
              <span className="flex gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Editar etapa ${e.ancora}`}
                  onClick={() => {
                    setEditando(e)
                    setModalAberto(true)
                  }}
                >
                  <IconEdit size={13} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Excluir etapa ${e.ancora}`}
                  onClick={() => onRemoveEtapa(e.id)}
                >
                  <IconTrash2 size={13} />
                </Button>
              </span>
            )}
            <Switch
              checked={e.ativo}
              disabled={!editable}
              onChange={(v) => onToggle(e.id, v)}
              aria-label={`${e.ativo ? 'Desativar' : 'Ativar'} etapa ${e.ancora}`}
            />
          </li>
        ))}
      </ul>
      {editable && (
        <div className="border-t border-line bg-neutral-50 px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditando(null)
              setModalAberto(true)
            }}
          >
            <IconPlus size={14} />
            Adicionar etapa
          </Button>
        </div>
      )}

      {/* criação e edição compartilham o mesmo formulário */}
      <NovaEtapaModal
        open={modalAberto}
        onClose={() => {
          setModalAberto(false)
          setEditando(null)
        }}
        onSubmit={(values) => {
          if (editando) onEditEtapa(editando.id, values)
          else onAddEtapa(values)
          setModalAberto(false)
          setEditando(null)
        }}
        templates={templates}
        reguaNome={reguaNome}
        inicial={editando ?? undefined}
      />
    </>
  )
}
