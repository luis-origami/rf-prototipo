'use client'

import { useState } from 'react'
import type { EtapaRegua, Template, TipoEtapa } from '../../mocks'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'

export interface EtapaFormValues {
  ancora: string
  label: string
  templateId: string
  tipo: TipoEtapa
}

interface NovaEtapaModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: EtapaFormValues) => void
  /** templates disponíveis para vincular à etapa */
  templates: Template[]
  /** nome da régua que recebe a etapa */
  reguaNome: string
  /** etapa em edição — ausente para criar nova */
  inicial?: EtapaRegua
}

export function NovaEtapaModal({ open, onClose, onSubmit, templates, reguaNome, inicial }: NovaEtapaModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      {/* o form vive dentro do Modal: fechado ele desmonta, e cada abertura
         remonta com estado limpo — sem reset via effect */}
      <EtapaForm
        onClose={onClose}
        onSubmit={onSubmit}
        templates={templates}
        reguaNome={reguaNome}
        inicial={inicial}
      />
    </Modal>
  )
}

// 'D-2' → ('-', '2') · 'D0' → ('+', '0') · 'D+7' → ('+', '7')
function decomporAncora(ancora?: string): { sinal: '+' | '-'; dias: string } {
  const m = ancora?.match(/^D([+-]?)(\d+)$/)
  if (!m) return { sinal: '+', dias: '' }
  return { sinal: m[1] === '-' ? '-' : '+', dias: m[2] }
}

function EtapaForm({ onClose, onSubmit, templates, reguaNome, inicial }: Omit<NovaEtapaModalProps, 'open'>) {
  // o "D" é fixo; o usuário escolhe o sinal e digita só o número de dias
  const inicialAncora = decomporAncora(inicial?.ancora)
  const [sinal, setSinal] = useState<'+' | '-'>(inicialAncora.sinal)
  const [dias, setDias] = useState(inicialAncora.dias)
  const [label, setLabel] = useState(inicial?.label ?? '')
  const [templateId, setTemplateId] = useState(inicial?.templateId ?? templates[0]?.id ?? '')
  const [tipo, setTipo] = useState<TipoEtapa>(inicial?.tipo ?? 'automatica')
  const [erros, setErros] = useState<{ ancora?: string; label?: string }>({})

  const editando = inicial != null

  const diasNum = Number(dias)
  const diasValido = dias.trim() !== '' && Number.isInteger(diasNum) && diasNum >= 0
  // 0 dias = dia do vencimento, sem sinal
  const ancora = diasValido ? (diasNum === 0 ? 'D0' : `D${sinal}${diasNum}`) : null

  function salvar() {
    const novos: typeof erros = {}
    if (!ancora) novos.ancora = 'Informe o número de dias (0 = dia do vencimento).'
    if (!label.trim()) novos.label = 'Dê um nome à etapa.'
    setErros(novos)
    if (Object.keys(novos).length > 0 || !ancora) return
    onSubmit({ ancora, label: label.trim(), templateId, tipo })
  }

  return (
    <>
      <Modal.Header>{editando ? 'Editar etapa' : 'Nova etapa'} · {reguaNome}</Modal.Header>
      <Modal.Body>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Marco"
              error={erros.ancora}
              helper={ancora ? `Marco ${ancora}` : '− antes · + depois do vencimento · 0 = no dia.'}
            >
              <div className="flex items-center gap-2">
                {/* o prefixo D é fixo — o usuário só escolhe sinal e dias */}
                <span
                  className="flex h-10 shrink-0 items-center rounded-md border border-line
                    bg-neutral-100 px-3 font-mono text-sm font-semibold text-neutral-700"
                  aria-hidden="true"
                >
                  D
                </span>
                <Select
                  value={sinal}
                  onChange={(e) => setSinal(e.target.value as '+' | '-')}
                  className="w-20 shrink-0"
                  aria-label="Antes ou depois do vencimento"
                >
                  <option value="+">+</option>
                  <option value="-">−</option>
                </Select>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={dias}
                  invalid={!!erros.ancora}
                  onChange={(e) => {
                    setDias(e.target.value)
                    if (erros.ancora) setErros((prev) => ({ ...prev, ancora: undefined }))
                  }}
                  placeholder="5"
                  aria-label="Dias em relação ao vencimento"
                  className="num w-full font-mono"
                />
              </div>
            </Field>
            <Field label="Tipo" helper={tipo === 'handoff' ? 'Aviso interno ao time — nada é enviado ao cliente.' : 'WhatsApp automático.'}>
              <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoEtapa)} className="w-full">
                <option value="automatica">Automática</option>
                <option value="handoff">Aviso ao financeiro</option>
              </Select>
            </Field>
          </div>
          <Field label="Nome da etapa" error={erros.label}>
            <Input
              value={label}
              invalid={!!erros.label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex.: Lembrete intermediário"
              className="w-full"
            />
          </Field>
          <Field label="Template" helper="Cada etapa envia um único template; o mesmo template pode servir a várias etapas.">
            <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="w-full">
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={salvar}>{editando ? 'Salvar etapa' : 'Adicionar etapa'}</Button>
      </Modal.Footer>
    </>
  )
}
