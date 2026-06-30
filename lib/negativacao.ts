// Negativação de cliente — DERIVADA do protesto de título na Certtus.
//
// IMPORTANTE: não há ação manual de negativação na plataforma. O protesto é
// feito na Certtus (externamente); quando um título do cliente está em
// protesto (b.emProtesto), o sistema entende o cliente como negativado:
//   • o cliente recebe o selo "Negativado" (detalhe);
//   • a régua de cobrança é pausada por completo — nenhum envio automático;
//   • a tratativa passa a ser 100% humana (só contatos manuais seguem).
// Este módulo apenas gera um histórico completo do cliente, disponível quando
// há título em protesto. A negativação em órgão de crédito é externa.

import {
  getBoletosDoCliente,
  getComunicacoesDoCliente,
  getClienteById,
  calcularEncargos,
  statusEfetivo,
  formatarData,
  formatarMoeda,
  DATA_BASE,
  type Boleto,
  type Comunicacao,
} from '../mocks'

// ── Histórico de negativação ───────────────────────────────────────────────
// Documento autônomo (HTML imprimível) com o histórico completo do cliente:
// contatos realizados, boletos em atraso, promessas não efetivadas e dados
// pertinentes. Serve de instrução para a negativação, que é externa ao sistema.

/** promessa registrada que não se efetivou: quebrada, ou vencida sem pagamento */
function promessaNaoEfetivada(c: Comunicacao): boolean {
  const p = c.promessaPagamento
  if (!p) return false
  return p.situacao === 'quebrada' || (p.situacao === 'pendente' && p.data < DATA_BASE)
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const CANAL_LABEL: Record<Comunicacao['canal'], string> = {
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  telefone: 'Telefone',
  observacao: 'Observação',
}

function dataHora(iso: string): string {
  const [data, hora] = iso.split('T')
  const hhmm = hora ? ` ${hora.slice(0, 5)}` : ''
  return `${formatarData(data)}${hhmm}`
}

function totalAtualizado(b: Boleto): number {
  return calcularEncargos(b)?.totalAtualizado ?? b.valor
}

export function gerarHistoricoNegativacaoHTML(
  clienteId: string,
  meta?: { negativadoPor?: string; negativadoEm?: string; motivo?: string },
): string {
  const cliente = getClienteById(clienteId)
  if (!cliente) return '<!doctype html><meta charset="utf-8"><title>Cliente não encontrado</title>'

  const boletos = getBoletosDoCliente(clienteId)
  const emAtraso = boletos
    .filter((b) => statusEfetivo(b) === 'atrasado' || statusEfetivo(b) === 'inadimplente')
    .sort((a, b) => (b.diasAtraso ?? 0) - (a.diasAtraso ?? 0))
  const comunicacoes = getComunicacoesDoCliente(clienteId).sort((a, b) =>
    b.dataHora.localeCompare(a.dataHora),
  )
  const promessas = comunicacoes.filter(promessaNaoEfetivada)

  const totalEmAtraso = emAtraso.reduce((s, b) => s + totalAtualizado(b), 0)
  const piorAtraso = emAtraso.reduce((m, b) => Math.max(m, b.diasAtraso ?? 0), 0)
  const emissao = meta?.negativadoEm ?? new Date().toISOString()

  const linhasBoletos = emAtraso
    .map(
      (b) => `<tr>
        <td class="mono">${esc(b.numero)}</td>
        <td>${esc(b.descricao)}</td>
        <td class="num">${formatarData(b.vencimento)}</td>
        <td class="num">${b.diasAtraso ?? 0}</td>
        <td class="num">${formatarMoeda(b.valor)}</td>
        <td class="num strong">${formatarMoeda(totalAtualizado(b))}</td>
      </tr>`,
    )
    .join('')

  const linhasPromessas = promessas.length
    ? promessas
        .map(
          (c) => `<tr>
            <td class="num">${formatarData(c.promessaPagamento!.data)}</td>
            <td>${c.promessaPagamento!.situacao === 'quebrada' ? 'Quebrada' : 'Vencida sem pagamento'}</td>
            <td>${esc(CANAL_LABEL[c.canal])} · ${dataHora(c.dataHora)}</td>
            <td>${esc(c.conteudo)}</td>
          </tr>`,
        )
        .join('')
    : '<tr><td colspan="4" class="empty">Nenhuma promessa de pagamento não efetivada registrada.</td></tr>'

  const linhasContatos = comunicacoes.length
    ? comunicacoes
        .map(
          (c) => `<tr>
            <td class="num">${dataHora(c.dataHora)}</td>
            <td>${esc(CANAL_LABEL[c.canal])}</td>
            <td>${c.origem === 'automatica' ? 'Automático' : 'Manual'}</td>
            <td>${esc(c.conteudo)}${
              c.proximaAcao ? `<br><span class="muted">Próxima ação: ${esc(c.proximaAcao)}</span>` : ''
            }</td>
          </tr>`,
        )
        .join('')
    : '<tr><td colspan="4" class="empty">Nenhum contato registrado.</td></tr>'

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Histórico de Negativação · ${esc(cliente.nome)}</title>
<style>
  :root { --ink:#1a2230; --muted:#5b6677; --line:#d8dee8; --line2:#eef1f6; --red:#b42318; --redbg:#fef3f2; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: var(--ink); margin: 0; padding: 40px; max-width: 920px; margin-inline: auto; line-height: 1.45; }
  h1 { font-size: 22px; margin: 0 0 2px; letter-spacing: -0.01em; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted);
    margin: 32px 0 10px; padding-bottom: 6px; border-bottom: 1px solid var(--line); }
  .mono, .num { font-variant-numeric: tabular-nums; font-family: "SF Mono", ui-monospace, Menlo, Consolas, monospace; }
  .topo { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px;
    border-bottom: 2px solid var(--ink); padding-bottom: 16px; }
  .selo { display: inline-block; background: var(--redbg); color: var(--red); border: 1px solid var(--red);
    border-radius: 4px; padding: 4px 10px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  .eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 0 0 4px; }
  .ident { margin-top: 14px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 32px; }
  .ident div { font-size: 13px; }
  .ident .k { color: var(--muted); }
  .resumo { display: flex; gap: 28px; flex-wrap: wrap; margin-top: 16px; }
  .resumo .item { }
  .resumo .v { font-size: 20px; font-weight: 700; }
  .resumo .l { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th { text-align: left; color: var(--muted); font-weight: 600; font-size: 11px; text-transform: uppercase;
    letter-spacing: 0.03em; padding: 6px 8px; border-bottom: 1px solid var(--line); }
  td { padding: 7px 8px; border-bottom: 1px solid var(--line2); vertical-align: top; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  td.strong { font-weight: 700; }
  td.empty { color: var(--muted); text-align: center; padding: 16px; }
  .muted { color: var(--muted); font-size: 11.5px; }
  .motivo { background: var(--redbg); border: 1px solid var(--line); border-left: 3px solid var(--red);
    padding: 10px 12px; border-radius: 4px; margin-top: 12px; font-size: 13px; }
  footer { margin-top: 40px; padding-top: 14px; border-top: 1px solid var(--line); color: var(--muted); font-size: 11px; }
  @media print { body { padding: 0; } h2 { break-after: avoid; } tr { break-inside: avoid; } }
</style>
</head>
<body>
  <div class="topo">
    <div>
      <p class="eyebrow">Retífica Formiguense · Cobrança RF</p>
      <h1>Histórico de Negativação</h1>
      <p class="muted">Documento de instrução — a negativação é processada fora do sistema.</p>
    </div>
    <span class="selo">Negativado</span>
  </div>

  <div class="ident">
    <div><span class="k">Cliente:</span> <strong>${esc(cliente.nome)}</strong></div>
    <div><span class="k">CNPJ / CPF:</span> <span class="mono">${esc(cliente.cnpjCpf)}</span></div>
    <div><span class="k">Tipo:</span> ${esc(cliente.tipo)}</div>
    <div><span class="k">Cidade:</span> ${esc(cliente.cidade)}</div>
    <div><span class="k">Telefone:</span> ${esc(cliente.telefone)}</div>
    <div><span class="k">E-mail:</span> ${esc(cliente.email)}</div>
  </div>

  ${meta?.motivo ? `<div class="motivo"><strong>Motivo da negativação:</strong> ${esc(meta.motivo)}</div>` : ''}

  <div class="resumo">
    <div class="item"><div class="v">${formatarMoeda(totalEmAtraso)}</div><div class="l">Total em atraso (atualizado)</div></div>
    <div class="item"><div class="v">${emAtraso.length}</div><div class="l">Títulos vencidos</div></div>
    <div class="item"><div class="v">${piorAtraso} dias</div><div class="l">Pior atraso</div></div>
    <div class="item"><div class="v">${promessas.length}</div><div class="l">Promessas não efetivadas</div></div>
  </div>

  <h2>Boletos em atraso</h2>
  <table>
    <thead><tr><th>Boleto</th><th>Serviço</th><th class="num">Vencimento</th><th class="num">Atraso</th><th class="num">Valor</th><th class="num">Total atualizado</th></tr></thead>
    <tbody>${linhasBoletos || '<tr><td colspan="6" class="empty">Nenhum título em atraso.</td></tr>'}</tbody>
  </table>

  <h2>Promessas de pagamento não efetivadas</h2>
  <table>
    <thead><tr><th class="num">Promessa</th><th>Situação</th><th>Origem do contato</th><th>Registro</th></tr></thead>
    <tbody>${linhasPromessas}</tbody>
  </table>

  <h2>Histórico de contatos</h2>
  <table>
    <thead><tr><th class="num">Data</th><th>Canal</th><th>Origem</th><th>Conteúdo</th></tr></thead>
    <tbody>${linhasContatos}</tbody>
  </table>

  <footer>
    Emitido em ${dataHora(emissao)}${meta?.negativadoPor ? ` por ${esc(meta.negativadoPor)}` : ''}.
    Documento gerado pelo Cobrança RF a partir dos dados do Certtus e da trilha de comunicações.
    A negativação em órgão de proteção ao crédito é executada manualmente, fora deste sistema.
  </footer>
</body>
</html>`
}

/** gera o histórico e dispara o download do arquivo HTML (somente no browser) */
export function baixarHistoricoNegativacao(
  clienteId: string,
  meta?: { negativadoPor?: string; negativadoEm?: string; motivo?: string },
): void {
  if (typeof window === 'undefined') return
  const cliente = getClienteById(clienteId)
  const slug = (cliente?.nome ?? clienteId)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const html = gerarHistoricoNegativacaoHTML(clienteId, meta)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `historico-negativacao-${slug}.html`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
