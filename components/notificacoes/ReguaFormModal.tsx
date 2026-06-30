'use client'

import { useState } from 'react'
import type { ReguaCobranca } from '../../mocks'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'

/* Criação de régua (geral ou específica de cliente). A régua pode nascer
   vazia (sem nenhum marco, montada do zero) ou a partir de uma base existente
   — neste caso as etapas são copiadas e ajustadas depois. */

export interface ReguaFormValues {
  nome: string
  descricao: string
  baseId: string
}

interface ReguaFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: ReguaFormValues) => void
  /** réguas que podem servir de base (etapas copiadas) — só no modo 'criar' */
  bases: ReguaCobranca[]
  titulo: string
  nomeInicial?: string
  descricaoInicial?: string
  /** 'editar' esconde o "Basear em" e só altera nome/descrição */
  modo?: 'criar' | 'editar'
}

export function ReguaFormModal({ open, onClose, ...form }: ReguaFormModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      {/* o form vive dentro do Modal: fechado ele desmonta, e cada abertura
         remonta com estado limpo — sem reset via effect */}
      <ReguaForm onClose={onClose} {...form} />
    </Modal>
  )
}

type ReguaFormProps = Omit<ReguaFormModalProps, 'open'>

function ReguaForm({
  onClose,
  onSubmit,
  bases,
  titulo,
  nomeInicial = '',
  descricaoInicial = '',
  modo = 'criar',
}: ReguaFormProps) {
  const [nome, setNome] = useState(nomeInicial)
  const [descricao, setDescricao] = useState(descricaoInicial)
  // '' = começar vazia (sem base); a régua nasce sem marcos
  const [baseId, setBaseId] = useState('')
  const [erro, setErro] = useState('')

  const editando = modo === 'editar'

  function salvar() {
    if (!nome.trim()) {
      setErro('Dê um nome à régua.')
      return
    }
    onSubmit({ nome: nome.trim(), descricao: descricao.trim(), baseId })
  }

  const base = bases.find((b) => b.id === baseId)

  return (
    <>
      <Modal.Header>{titulo}</Modal.Header>
      <Modal.Body>
        <div className="flex flex-col gap-4">
          <Field label="Nome" error={erro || undefined}>
            <Input
              value={nome}
              invalid={!!erro}
              onChange={(e) => {
                setNome(e.target.value)
                if (erro) setErro('')
              }}
              placeholder="Ex.: Régua Frotistas"
              className="w-full"
            />
          </Field>
          {!editando && (
            <Field
              label="Basear em"
              helper={
                base
                  ? `${base.etapas.length} marcos copiados — ajuste depois de criar.`
                  : 'A régua nasce vazia — você adiciona os marcos depois.'
              }
            >
              <Select value={baseId} onChange={(e) => setBaseId(e.target.value)} className="w-full">
                <option value="">Começar vazia (sem base)</option>
                {bases.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Descrição" helper="Opcional — quando esta régua deve ser aplicada.">
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Clientes frotistas com faturamento mensal…"
              className="min-h-20 w-full"
            />
          </Field>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={salvar}>{editando ? 'Salvar alterações' : 'Criar régua'}</Button>
      </Modal.Footer>
    </>
  )
}
