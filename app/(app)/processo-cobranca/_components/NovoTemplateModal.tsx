'use client'

import { useState } from 'react'
import { Modal } from '../../../../components/ui/Modal'
import { Button } from '../../../../components/ui/Button'
import { Field } from '../../../../components/ui/Field'
import { Input } from '../../../../components/ui/Input'
import { Textarea } from '../../../../components/ui/Textarea'

export interface TemplateFormValues {
  nome: string
  corpo: string
}

interface NovoTemplateModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: TemplateFormValues) => void
}

const CORPO_PADRAO =
  'Olá, [NOME]. O título nº [NÚMERO], no valor de R$ [VALOR], vence em [DATA].\n\nEquipe Retífica Formiguense.'

export function NovoTemplateModal({ open, onClose, onSubmit }: NovoTemplateModalProps) {
  return (
    <Modal open={open} onClose={onClose} size="md">
      {/* o form vive dentro do Modal: fechado ele desmonta, e cada abertura
         remonta com estado limpo — sem reset via effect */}
      <TemplateForm onClose={onClose} onSubmit={onSubmit} />
    </Modal>
  )
}

function TemplateForm({ onClose, onSubmit }: Omit<NovoTemplateModalProps, 'open'>) {
  const [nome, setNome] = useState('')
  const [corpo, setCorpo] = useState(CORPO_PADRAO)
  const [erros, setErros] = useState<{ nome?: string; corpo?: string }>({})

  function salvar() {
    const novos: typeof erros = {}
    if (!nome.trim()) novos.nome = 'Dê um nome ao template.'
    if (!corpo.trim()) novos.corpo = 'Escreva o corpo da mensagem.'
    setErros(novos)
    if (Object.keys(novos).length > 0) return
    onSubmit({ nome: nome.trim(), corpo })
  }

  return (
    <>
      <Modal.Header>Novo template</Modal.Header>
      <Modal.Body>
        <div className="flex flex-col gap-4">
          <Field label="Nome" error={erros.nome}>
            <Input
              value={nome}
              invalid={!!erros.nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Lembrete Semanal"
              className="w-full"
            />
          </Field>
          <div>
            <Field
              label="Corpo da mensagem"
              error={erros.corpo}
              helper={
                'Variáveis: [NOME] · [NÚMERO] · [VALOR] · [DATA] · ' +
                'abono: {{valor_original}} · {{juros}} · {{multa}} · {{juros_abonado}} · ' +
                '{{multa_abonada}} · {{valor_final}} · {{data_promessa}} · {{validade_abono}}.'
              }
            >
              <Textarea
                value={corpo}
                invalid={!!erros.corpo}
                onChange={(e) => setCorpo(e.target.value)}
                className="min-h-40 w-full font-mono text-xs leading-relaxed"
              />
            </Field>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={salvar}>Criar template</Button>
      </Modal.Footer>
    </>
  )
}
