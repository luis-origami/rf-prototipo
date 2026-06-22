import { IconBan } from '../icons'

/* Negativado = estado de processo (marcação visual) → quadrado + mono, no tom
   de inadimplência. Domina os demais estados de processo: ao negativar, a
   régua é pausada e a tratativa vira manual. */

export function NegativadoBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border px-2 py-0.5
        font-mono text-xs font-medium bg-inadimplente-bg text-inadimplente-fg border-inadimplente-border"
    >
      <IconBan size={11} className="shrink-0" />
      Negativado
    </span>
  )
}
