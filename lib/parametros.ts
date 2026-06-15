// Parâmetros de cálculo de encargos — configuração central, não hardcoded.
// Tela de Configurações exibe aviso de "pendente de confirmação" enquanto o
// flag `confirmado` for false. Nenhum parâmetro altera dados do Certtus.

export interface ParametroTaxa {
  pct: number
  confirmado: boolean
  descricao: string
  observacao: string
}

export const PARAMETROS_ENCARGOS: { juros: ParametroTaxa; multa: ParametroTaxa } = {
  juros: {
    pct: 0.01,
    confirmado: true,
    descricao: '1% a.m. · pro rata die',
    observacao: 'Confirmado pelo PO.',
  },
  multa: {
    pct: 0.02,
    confirmado: false,
    descricao: '2% sobre o valor original',
    observacao: 'Percentual não fechado — a confirmar com a Fernanda (RF).',
  },
}
