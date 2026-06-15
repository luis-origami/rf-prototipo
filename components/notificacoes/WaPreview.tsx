/* Preview da mensagem como o cliente vê no WhatsApp.
   Usado no editor de templates e no detalhe de comunicação enviada.
   Variáveis [NOME] [NÚMERO] [VALOR] [DATA] substituídas por dados de exemplo
   (texto já enviado não tem variáveis — a substituição é no-op). */

const EXEMPLO: Record<string, string> = {
  '[NOME]': 'Auto Center São José',
  '[NÚMERO]': 'BLT-2026-01036',
  '[VALOR]': '4.200,00',
  '[DATA]': '15/06/2026',
}

export function renderPreview(corpo: string): string {
  return Object.entries(EXEMPLO).reduce((txt, [k, v]) => txt.split(k).join(v), corpo)
}

interface WaPreviewProps {
  corpo: string
  /** hora exibida no bubble — padrão 09:00 (horário da régua) */
  hora?: string
  /** classe de altura do frame — padrão proporção de celular */
  heightClass?: string
}

export function WaPreview({ corpo, hora = '09:00', heightClass = 'h-[680px]' }: WaPreviewProps) {
  return (
    /* proporção de celular (~9:19) e altura fixa: o frame não cresce com o
       template — mensagem longa rola dentro da conversa */
    <div className={`mx-auto flex w-full max-w-[340px] flex-col overflow-hidden rounded-xl
      border border-line-strong shadow-md ${heightClass}`}>
      {/* header do app — verde oficial do WhatsApp (#008069): exceção consciente
         aos tokens do DS, pois simula um produto externo, não a nossa UI */}
      <div className="flex shrink-0 items-center gap-2.5 bg-[#008069] px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20
          font-mono text-xs font-semibold text-white">
          RF
        </span>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-white">Retífica Formiguense</div>
          <div className="font-mono text-xs text-white/75">online</div>
        </div>
      </div>
      {/* conversa */}
      <div className="flex-1 overflow-y-auto bg-neutral-100 p-4">
        <div className="relative max-w-[260px] rounded-lg rounded-tl-none bg-surface p-3 shadow-xs">
          <p className="whitespace-pre-line text-sm leading-snug text-ink">{renderPreview(corpo)}</p>
          <span className="num mt-1.5 block text-right font-mono text-[10px] text-ink-muted">{hora}</span>
        </div>
      </div>
    </div>
  )
}
