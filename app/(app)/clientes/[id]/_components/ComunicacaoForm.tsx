'use client'

import { useMemo, useState } from 'react'
import {
  calcularEncargos,
  formatarData,
  formatarMoeda,
  resolverTemplate,
  templates,
  DATA_BASE,
  type Boleto,
  type Comunicacao,
  type CanalComunicacao,
} from '../../../../../mocks'
import { abonoAtivoDoBoleto } from '../../../../../lib/abonos'
import { useAbonos } from '../../../../../hooks/useAbonos'
import { Field } from '../../../../../components/ui/Field'
import { Select } from '../../../../../components/ui/Select'
import { Input } from '../../../../../components/ui/Input'
import { Textarea } from '../../../../../components/ui/Textarea'
import { Button } from '../../../../../components/ui/Button'
import { Switch } from '../../../../../components/ui/Switch'
import {
  MultiSelectDropdown,
  type DropdownOption,
} from '../../../../../components/ui/MultiSelectDropdown'
import { EstadoAbonoBadge } from '../../../../../components/abonos/EstadoAbonoBadge'
import { AbonoBreakdown } from '../../../../../components/abonos/AbonoBreakdown'

/* Registro manual de contato (WhatsApp, telefone, e-mail, observação).
   O WhatsApp manual é o enviado pela própria operação (ex.: proposta com
   abono) — diferente das notificações automáticas da régua, que continuam
   exclusivas do disparador. A seção opcional "Abono" detalha juros/multa
   abonados DENTRO do registro (nunca o principal): vincula um abono ativo
   existente do título ou cria um novo, direto, sem aprovação. O template é
   apoio — gera texto livremente editável; o que vale é o texto final. */

const CANAIS_MANUAIS: { value: CanalComunicacao; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'email', label: 'E-mail' },
  { value: 'observacao', label: 'Observação' },
]

export interface AbonoFormInput {
  /** abono ativo existente a vincular — exclusivo com os campos de criação */
  existenteId?: string
  /** um abono pode cobrir mais de um título vencido do cliente */
  boletoIds: string[]
  /** tudo-ou-nada por componente: 100% dos juros e/ou 100% da multa */
  abonarJuros: boolean
  abonarMulta: boolean
}

export interface ComunicacaoFormValues {
  canal: CanalComunicacao
  conteudo: string
  promessaData: string
  proximaAcao: string
  boletoIds: string[]
  abono?: AbonoFormInput
}

interface ComunicacaoFormProps {
  /** registro em edição — vazio para criar novo */
  inicial?: Comunicacao
  /** títulos em aberto do cliente, para vínculo (número, vencimento, valor) */
  boletosAbertos: Boleto[]
  /** títulos pré-vinculados ao criar (ex.: vindo do card do Kanban) */
  boletoIdsIniciais?: string[]
  /** nome do cliente — usado na resolução de variáveis do template */
  clienteNome?: string
  /** renovação de negociação: exige uma nova promessa com data futura */
  exigePromessa?: boolean
  onSave: (values: ComunicacaoFormValues) => void
  onCancel: () => void
}

export function ComunicacaoForm({
  inicial,
  boletosAbertos,
  boletoIdsIniciais,
  clienteNome,
  exigePromessa = false,
  onSave,
  onCancel,
}: ComunicacaoFormProps) {
  const abonos = useAbonos()

  const [canal, setCanal] = useState<CanalComunicacao>(inicial?.canal ?? 'whatsapp')
  const [conteudo, setConteudo] = useState(inicial?.conteudo ?? '')
  const [promessaData, setPromessaData] = useState(inicial?.promessaPagamento?.data ?? '')
  const [proximaAcao, setProximaAcao] = useState(inicial?.proximaAcao ?? '')
  const [boletoIds, setBoletoIds] = useState<Set<string>>(
    () => new Set(inicial?.boletoIds ?? boletoIdsIniciais ?? []),
  )
  const [erro, setErro] = useState('')
  const [erroPromessa, setErroPromessa] = useState('')

  // títulos vencidos têm encargos — só eles podem receber abono
  const boletosVencidos = useMemo(
    () => boletosAbertos.filter((b) => calcularEncargos(b) != null),
    [boletosAbertos],
  )

  // seção de abono (opcional) — edição de registro existente não mexe em abono
  const podeAbonar = !inicial && boletosVencidos.length > 0
  const [comAbono, setComAbono] = useState(false)
  // um abono pode cobrir mais de um título vencido do cliente
  const [abonoBoletoIds, setAbonoBoletoIds] = useState<Set<string>>(() => {
    const pre = (boletoIdsIniciais ?? []).filter((id) => boletosVencidos.some((b) => b.id === id))
    if (pre.length > 0) return new Set(pre)
    return new Set(boletosVencidos[0] ? [boletosVencidos[0].id] : [])
  })
  // abono é tudo-ou-nada por componente — sem valores parciais
  const [abonarJuros, setAbonarJuros] = useState(false)
  const [abonarMulta, setAbonarMulta] = useState(false)
  const [erroAbono, setErroAbono] = useState('')

  const boletosDoAbono = boletosVencidos.filter((b) => abonoBoletoIds.has(b.id))
  // encargos agregados de todos os títulos selecionados
  const agregado = boletosDoAbono.reduce(
    (acc, b) => {
      const e = calcularEncargos(b)
      acc.principal += b.valor
      acc.juros += e?.juros ?? 0
      acc.multa += e?.multa ?? 0
      return acc
    },
    { principal: 0, juros: 0, multa: 0 },
  )
  const abonoExistente = [...abonoBoletoIds]
    .map((id) => abonoAtivoDoBoleto(id, abonos))
    .find((a) => a != null)

  const jurosAbonado = abonarJuros ? agregado.juros : 0
  const multaAbonada = abonarMulta ? agregado.multa : 0
  const previewAbono =
    boletosDoAbono.length > 0
      ? {
          valorPrincipal: agregado.principal,
          jurosCalculado: Math.round(agregado.juros * 100) / 100,
          multaCalculada: Math.round(agregado.multa * 100) / 100,
          jurosAbonado: Math.round(jurosAbonado * 100) / 100,
          multaAbonada: Math.round(multaAbonada * 100) / 100,
          valorFinal:
            Math.round(
              (agregado.principal +
                (agregado.juros - jurosAbonado) +
                (agregado.multa - multaAbonada)) * 100,
            ) / 100,
          dataPromessaPagamento: promessaData || undefined,
        }
      : null

  // ── template como apoio — texto gerado é livremente editável ────────────
  const [templateId, setTemplateId] = useState('t11')

  function gerarTexto() {
    const template = templates.find((t) => t.id === templateId)
    if (!template) return
    const boletoCtx = boletosDoAbono[0] ?? boletosAbertos.find((b) => boletoIds.has(b.id)) ?? boletosAbertos[0]
    // com abono multi-título, os valores do texto são os agregados do abono
    const valoresAbono = comAbono ? (abonoExistente ?? previewAbono) : undefined
    setConteudo(
      resolverTemplate(template.corpo, {
        nome: clienteNome,
        numero: boletoCtx?.numero,
        data: boletoCtx?.vencimento,
        valorOriginal: valoresAbono?.valorPrincipal ?? boletoCtx?.valor,
        juros: valoresAbono?.jurosCalculado ?? (boletoCtx ? calcularEncargos(boletoCtx)?.juros : undefined),
        multa: valoresAbono?.multaCalculada ?? (boletoCtx ? calcularEncargos(boletoCtx)?.multa : undefined),
        jurosAbonado: valoresAbono?.jurosAbonado,
        multaAbonada: valoresAbono?.multaAbonada,
        valorFinal: valoresAbono?.valorFinal,
        dataPromessa: promessaData || abonoExistente?.dataPromessaPagamento,
      }),
    )
  }

  const opcoesTitulos: DropdownOption[] = boletosAbertos.map((b) => ({
    value: b.id,
    label: b.numero,
    render: () => (
      <span className="num flex items-baseline gap-3 font-mono text-xs">
        <span className="text-ink">{b.numero}</span>
        <span className="text-ink-muted">{formatarData(b.vencimento)}</span>
        <span className="text-ink">{formatarMoeda(b.valor)}</span>
      </span>
    ),
  }))

  function salvar() {
    if (!conteudo.trim()) {
      setErro('Descreva o contato realizado.')
      return
    }
    // renovação: exige uma promessa com data futura (à frente da data-base)
    if (exigePromessa && (!promessaData || promessaData <= DATA_BASE)) {
      setErroPromessa('Informe uma nova data futura para renovar a promessa.')
      return
    }
    let abono: AbonoFormInput | undefined
    if (comAbono && boletosDoAbono.length > 0) {
      if (abonoExistente) {
        abono = {
          existenteId: abonoExistente.id,
          boletoIds: abonoExistente.boletoIds,
          abonarJuros: abonoExistente.jurosAbonado > 0,
          abonarMulta: abonoExistente.multaAbonada > 0,
        }
      } else {
        if (!abonarJuros && !abonarMulta) {
          setErroAbono('Marque o que será abonado: juros e/ou multa (sempre 100% do componente).')
          return
        }
        abono = { boletoIds: boletosDoAbono.map((b) => b.id), abonarJuros, abonarMulta }
      }
    }
    // os títulos do abono sempre entram nos vínculos da comunicação
    const ids = new Set(boletoIds)
    for (const bid of abono?.boletoIds ?? []) ids.add(bid)
    onSave({
      canal,
      conteudo: conteudo.trim(),
      promessaData,
      proximaAcao: proximaAcao.trim(),
      boletoIds: [...ids],
      abono,
    })
  }

  return (
    <div className="rounded-lg border border-line bg-neutral-50 p-4">
      <div className="label-mono mb-3 text-ink-muted">
        {inicial ? 'Editar contato' : 'Registrar contato'}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Canal">
          <Select value={canal} onChange={(e) => setCanal(e.target.value as CanalComunicacao)}>
            {CANAIS_MANUAIS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={exigePromessa ? 'Nova promessa de pagamento' : 'Promessa de pagamento'}
          error={erroPromessa || undefined}
          helper={
            comAbono && promessaData
              ? `Validade do abono · ${formatarData(promessaData)}`
              : exigePromessa
                ? 'Obrigatório — nova data combinada para renovar a negociação.'
                : 'Opcional — data combinada com o cliente. Com abono, vira a validade dele.'
          }
        >
          <Input
            type="date"
            value={promessaData}
            invalid={!!erroPromessa}
            onChange={(e) => {
              setPromessaData(e.target.value)
              if (erroPromessa) setErroPromessa('')
            }}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field
            label="Títulos relacionados"
            helper="Opcional — vincula o contato aos títulos em aberto tratados na conversa."
          >
            <MultiSelectDropdown
              selected={boletoIds}
              onChange={setBoletoIds}
              options={opcoesTitulos}
              todos="marcar"
              placeholder={boletosAbertos.length === 0 ? 'Sem títulos em aberto' : 'Selecionar títulos'}
            />
          </Field>
        </div>

        {/* seção opcional de abono — juros/multa, nunca o principal */}
        {podeAbonar && (
          <div className="sm:col-span-2">
            <div className="rounded-md border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
                  <Switch checked={comAbono} onChange={setComAbono} aria-label="Incluir abono de encargos" />
                  Abono de encargos
                </label>
                {comAbono && <EstadoAbonoBadge estado={abonoExistente ? abonoExistente.estado : 'ativo'} />}
              </div>

              {comAbono && (
                <div className="mt-4 flex flex-col gap-4">
                  <Field
                    label="Títulos do abono"
                    helper="Um ou mais títulos vencidos — só eles têm encargos a abonar. Os valores abaixo somam todos os selecionados."
                  >
                    <MultiSelectDropdown
                      selected={abonoBoletoIds}
                      onChange={(next) => {
                        setAbonoBoletoIds(next)
                        setErroAbono('')
                      }}
                      todos="marcar"
                      options={boletosVencidos.map((b) => ({
                        value: b.id,
                        label: b.numero,
                        render: () => (
                          <span className="num flex items-baseline gap-3 font-mono text-xs">
                            <span className="text-ink">{b.numero}</span>
                            <span className="text-ink-muted">{formatarData(b.vencimento)}</span>
                            <span className="text-ink">{formatarMoeda(b.valor)}</span>
                          </span>
                        ),
                      }))}
                      placeholder="Selecionar títulos vencidos"
                    />
                  </Field>

                  {boletosDoAbono.length === 0 ? (
                    <p className="text-xs text-ink-muted">
                      Selecione ao menos um título vencido para detalhar o abono.
                    </p>
                  ) : abonoExistente ? (
                    <>
                      <p className="text-xs text-ink-muted">
                        Um dos títulos selecionados já tem um abono ativo — ele será vinculado a
                        este contato com os valores abaixo.
                      </p>
                      <div className="max-w-md">
                        <AbonoBreakdown valores={abonoExistente} />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* tudo-ou-nada por componente: 100% dos juros e/ou 100% da multa */}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-line px-3 py-2.5">
                          <span className="text-sm font-medium text-ink">
                            Abonar juros
                            {previewAbono && (
                              <span className="num ml-2 font-mono text-xs text-ink-muted">
                                100% · {formatarMoeda(previewAbono.jurosCalculado)}
                              </span>
                            )}
                          </span>
                          <Switch
                            checked={abonarJuros}
                            onChange={(v) => {
                              setAbonarJuros(v)
                              if (erroAbono) setErroAbono('')
                            }}
                            aria-label="Abonar 100% dos juros"
                          />
                        </label>
                        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-line px-3 py-2.5">
                          <span className="text-sm font-medium text-ink">
                            Abonar multa
                            {previewAbono && (
                              <span className="num ml-2 font-mono text-xs text-ink-muted">
                                100% · {formatarMoeda(previewAbono.multaCalculada)}
                              </span>
                            )}
                          </span>
                          <Switch
                            checked={abonarMulta}
                            onChange={(v) => {
                              setAbonarMulta(v)
                              if (erroAbono) setErroAbono('')
                            }}
                            aria-label="Abonar 100% da multa"
                          />
                        </label>
                      </div>
                      {previewAbono && (
                        <div className="max-w-md">
                          <AbonoBreakdown valores={previewAbono} />
                        </div>
                      )}
                      {erroAbono && (
                        <span className="text-xs font-medium text-error-fg">{erroAbono}</span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* template = apoio: gera texto editável; o salvo é o editado */}
        <div className="sm:col-span-2">
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Template de apoio" helper="Gera o texto com as variáveis resolvidas — edite à vontade antes de salvar.">
              <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="w-72">
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </Select>
            </Field>
            <Button variant="secondary" size="md" onClick={gerarTexto} className="mb-6">
              Gerar texto a partir de template
            </Button>
          </div>
          <Field label="O que aconteceu" error={erro || undefined}>
            <Textarea
              value={conteudo}
              invalid={!!erro}
              onChange={(e) => {
                setConteudo(e.target.value)
                if (erro) setErro('')
              }}
              placeholder="Ex.: Liguei e falei com o responsável financeiro…"
              className="min-h-32 w-full"
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Próxima ação" helper="Opcional — o que fica combinado para o follow-up.">
            <Input
              value={proximaAcao}
              onChange={(e) => setProximaAcao(e.target.value)}
              placeholder="Ex.: Verificar pagamento no dia 07/06."
              className="w-full"
            />
          </Field>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={salvar}>{inicial ? 'Salvar alterações' : 'Registrar'}</Button>
      </div>
    </div>
  )
}
