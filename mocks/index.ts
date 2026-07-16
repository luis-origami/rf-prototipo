// Dados mock · Cobrança RF — Retífica Formiguense
// Todos os IDs, nomes, CNPJs e boletos são fictícios.
// As entidades são referencialmente consistentes entre telas.

import { PARAMETROS_ENCARGOS } from '../lib/parametros'
import { RETORNOS_SEED } from '../lib/negociacoes'

// ── Empresas do grupo ─────────────────────────────────────────────────────
// A RF opera como grupo com múltiplas PJs. Cada cliente fatura contra uma
// empresa recebedora (dado de origem Certtus — read-only). 'grupo' é o
// consolidado, não uma empresa.

export type EmpresaId = 'rf' | 'favarini' | 'refor'
export type EmpresaFiltro = 'grupo' | EmpresaId

export interface Empresa {
  id: EmpresaId
  nome: string
  nomeCurto: string
}

export const empresas: Empresa[] = [
  { id: 'rf',       nome: 'Diesel',      nomeCurto: 'Diesel' },
  { id: 'favarini', nome: 'Favarini',    nomeCurto: 'Favarini' },
  { id: 'refor',    nome: 'Refordiesel', nomeCurto: 'Refordiesel' },
]

export const EMPRESA_FILTRO_LABEL: Record<EmpresaFiltro, string> = {
  grupo: 'Consolidado (Grupo)',
  rf: 'Diesel',
  favarini: 'Favarini',
  refor: 'Refordiesel',
}

export type TipoCliente = 'oficina' | 'transportadora' | 'revenda' | 'frotista' | 'pf' | 'produtor' | 'orgao_publico'
export type TipoClienteFiltro = 'todos' | 'oficina' | 'frotista' | 'transportadora' | 'produtor' | 'pf' | 'orgao_publico'

export const TIPO_CLIENTE_LABEL: Record<TipoClienteFiltro, string> = {
  todos: 'Todos',
  oficina: 'Oficinas mecânicas',
  frotista: 'Frotistas',
  transportadora: 'Transportadoras',
  produtor: 'Produtores rurais',
  pf: 'Consumidor final',
  orgao_publico: 'Órgãos públicos',
}

// rótulo no singular — segmento de um cliente específico (ex.: cabeçalho do detalhe)
export const TIPO_CLIENTE_SINGULAR: Record<TipoCliente, string> = {
  oficina: 'Oficina mecânica',
  transportadora: 'Transportadora',
  revenda: 'Revenda de peças',
  frotista: 'Frotista',
  pf: 'Consumidor final',
  produtor: 'Produtor rural',
  orgao_publico: 'Órgão público',
}

// UF por cidade — dado de origem Certtus. Carteira atual concentrada em Minas Gerais.
const CIDADE_UF: Record<string, string> = {
  'Formiga': 'MG', 'Belo Horizonte': 'MG', 'BH': 'MG', 'Piumhi': 'MG', 'Arcos': 'MG',
  'Lagoa da Prata': 'MG', 'Lavras': 'MG', 'Passos': 'MG', 'Três Pontas': 'MG',
  'Betim': 'MG', 'Oliveira': 'MG', 'Divinópolis': 'MG', 'Itaúna': 'MG',
  'Nova Serrana': 'MG', 'Carmo do Cajuru': 'MG', 'Itapecerica': 'MG',
}

export function ufDaCidade(cidade: string): string {
  return CIDADE_UF[cidade] ?? 'MG'
}
export type SituacaoCliente = 'adimplente' | 'atrasado' | 'inadimplente'
export type StatusBoleto = 'pago' | 'pago_atraso' | 'avencer' | 'hoje' | 'atrasado' | 'inadimplente'
export type StatusNotificacao = 'agendada' | 'enviada' | 'entregue' | 'lida' | 'respondida'
export type EstadoProcesso = 'normal' | 'pausado' | 'aprovacao' | 'excecao'

export interface Cliente {
  id: string
  nome: string
  tipo: TipoCliente
  cidade: string
  cnpjCpf: string      // já formatado
  telefone: string
  email: string
  situacao: SituacaoCliente
  saldoAberto: number   // soma dos boletos não pagos
  estadoProcesso: EstadoProcesso
}

export interface Boleto {
  id: string
  clienteId: string
  numero: string        // nº boleto em mono
  nfNumero: string
  descricao: string
  valor: number
  vencimento: string    // YYYY-MM-DD
  emissao: string       // YYYY-MM-DD
  status: StatusBoleto
  diasAtraso?: number
  dataPagamento?: string
  /** protesto registrado na Certtus (externo, pela equipe) — read-only.
      Título em protesto negativa o cliente automaticamente. */
  emProtesto?: boolean
}

export interface NotificacaoHistorico {
  id: string
  clienteId: string
  clienteNome: string
  boletoId: string
  etapa: string
  templateNome: string
  status: StatusNotificacao
  canal: 'whatsapp'
  dataEnvio: string     // ISO datetime
  preview: string       // primeiras palavras do texto
}

// ── Comunicações (Etapa 3) ──────────────────────────────────────────────
// Unifica histórico automático (WhatsApp) e manual (Email/Telefone/Observação)

export type CanalComunicacao = 'whatsapp' | 'email' | 'telefone' | 'observacao'
export type OrigemComunicacao = 'automatica' | 'manual'
export type StatusComunicacao =
  | 'agendada' | 'enviada' | 'entregue' | 'lida' | 'respondida'  // WhatsApp auto
  | 'registrada' | 'aguardando_retorno' | 'encerrada'             // manual

export interface PromessaPagamento {
  data: string            // YYYY-MM-DD
  situacao: 'pendente' | 'cumprida' | 'quebrada'
}

// ── Abono de encargos · estados e snapshot ────────────────────────────────
// O abono nasce ATIVO (sem aprovação prévia — decisão do PO; a supervisão do
// admin é a posteriori, via trilha). Transições são derivadas dos dados:
// quitação dentro da validade → aplicado; promessa vencida em aberto →
// expirado; revogação manual → cancelado.

export type EstadoAbono = 'ativo' | 'aplicado' | 'expirado' | 'cancelado'

// Snapshot imutável dos valores comunicados ao cliente — congelado no
// registro da comunicação. O que foi dito precisa ser reconstituível na
// auditoria, mesmo que o abono mude de estado depois.
export interface AbonoSnapshot {
  abonoId: string
  estado: EstadoAbono
  valorPrincipal: number   // Certtus na criação do abono — read-only
  jurosCalculado: number
  multaCalculada: number
  jurosAbonado: number
  multaAbonada: number
  valorFinal: number
  dataPromessaPagamento?: string
}

export interface Comunicacao {
  id: string
  clienteId: string
  boletoIds?: string[]    // refs. aos títulos Certtus vinculados — read-only
  etapa: string           // marco da régua ou contexto
  canal: CanalComunicacao
  origem: OrigemComunicacao
  dataHora: string
  conteudo: string
  status: StatusComunicacao
  promessaPagamento?: PromessaPagamento
  proximaAcao?: string
  criadoPor?: string      // e-mail do usuário
  templateNome?: string   // somente para automáticas
  abonoId?: string        // vínculo opcional a um abono de encargos
  abonoSnapshot?: AbonoSnapshot
}

// Flag de cliente estratégico — input manual, sem score automático (fora do MVP)
export type FlagCliente = 'estrategico' | null

export interface Template {
  id: string
  nome: string
  corpo: string
}

// 'handoff' (valor interno mantido pelos dados persistidos) = ação manual:
// sinalização/encaminhamento humano — na interface o termo é sempre
// "Ação Manual"
export type TipoEtapa = 'automatica' | 'handoff'

export interface EtapaRegua {
  id: string
  ancora: string        // D-2, D0, D+1 …
  label: string
  templateId: string
  ativo: boolean
  descricao: string
  tipo: TipoEtapa       // se é automática ou aviso ao financeiro
}

export interface ReguaCobranca {
  id: string
  nome: string
  descricao: string
  perfil: 'padrao' | 'reincidente'
  ativa: boolean
  etapas: EtapaRegua[]
  /** quando presente, é uma régua específica deste cliente — não aparece na
      configuração global de réguas, só no detalhe do cliente vinculado */
  clienteId?: string
}

// ── Clientes ─────────────────────────────────────────────────────────────

export const clientes: Cliente[] = [
  { id: 'c01', nome: 'Auto Center São José',           tipo: 'oficina',        cidade: 'Formiga',     cnpjCpf: '33.456.789/0001-12', telefone: '(37) 99101-2233', email: 'contato@acsaojose.com.br',  situacao: 'adimplente',  saldoAberto: 4_200,   estadoProcesso: 'normal'    },
  { id: 'c02', nome: 'Mecânica do Zé Augusto',         tipo: 'oficina',        cidade: 'Formiga',     cnpjCpf: '12.345.678/0001-99', telefone: '(37) 99232-4455', email: 'zeaugusto@mecanica.com',     situacao: 'atrasado',    saldoAberto: 7_800,   estadoProcesso: 'normal'    },
  { id: 'c03', nome: 'Transportes Minas Gerais Ltda',  tipo: 'transportadora', cidade: 'Belo Horizonte', cnpjCpf: '56.789.012/0001-34', telefone: '(31) 3344-5566', email: 'financeiro@tmg.com.br',    situacao: 'inadimplente', saldoAberto: 23_600,  estadoProcesso: 'normal'    },
  { id: 'c04', nome: 'Funilaria e Pintura Oliveira',   tipo: 'oficina',        cidade: 'Formiga',     cnpjCpf: '78.901.234/0001-56', telefone: '(37) 99345-6677', email: 'funilaria.oliveira@gmail.com', situacao: 'adimplente', saldoAberto: 1_950,   estadoProcesso: 'normal'    },
  { id: 'c05', nome: 'Auto Peças Central',             tipo: 'revenda',        cidade: 'Formiga',     cnpjCpf: '90.123.456/0001-78', telefone: '(37) 3322-1144', email: 'compras@autopecascentral.com', situacao: 'adimplente', saldoAberto: 0,       estadoProcesso: 'normal'    },
  { id: 'c06', nome: 'Frota Municipal de Formiga',     tipo: 'frotista',       cidade: 'Formiga',     cnpjCpf: '17.298.632/0001-07', telefone: '(37) 3322-4000', email: 'compras@formiga.mg.gov.br',   situacao: 'atrasado',    saldoAberto: 11_400,  estadoProcesso: 'aprovacao' },
  { id: 'c07', nome: 'Carlos Roberto da Silva',        tipo: 'pf',             cidade: 'Formiga',     cnpjCpf: '432.567.890-11',     telefone: '(37) 99456-7788', email: 'carlosroberto@gmail.com',    situacao: 'adimplente',  saldoAberto: 3_400,   estadoProcesso: 'normal'    },
  { id: 'c08', nome: 'Mecânica Precisa Ltda',          tipo: 'oficina',        cidade: 'Piumhi',      cnpjCpf: '23.456.789/0001-01', telefone: '(37) 99567-8899', email: 'precisa@mecanica.net',       situacao: 'inadimplente', saldoAberto: 18_700,  estadoProcesso: 'pausado'   },
  { id: 'c09', nome: 'Auto Center Diamante',           tipo: 'oficina',        cidade: 'Arcos',       cnpjCpf: '34.567.890/0001-23', telefone: '(37) 99678-9900', email: 'diamante@autocenter.com',    situacao: 'adimplente',  saldoAberto: 2_700,   estadoProcesso: 'normal'    },
  { id: 'c10', nome: 'Oficina São Lucas',              tipo: 'oficina',        cidade: 'Lagoa da Prata', cnpjCpf: '45.678.901/0001-45', telefone: '(37) 99789-0011', email: 'sao.lucas@oficina.com',   situacao: 'atrasado',    saldoAberto: 5_600,   estadoProcesso: 'normal'    },
  { id: 'c11', nome: 'Transportadora Boa Viagem',      tipo: 'transportadora', cidade: 'BH',          cnpjCpf: '67.890.123/0001-67', telefone: '(31) 99890-1122', email: 'cob@boaviagem.com.br',       situacao: 'inadimplente', saldoAberto: 31_200,  estadoProcesso: 'normal'    },
  { id: 'c12', nome: 'Retífica e Mecânica Teixeira',   tipo: 'oficina',        cidade: 'Formiga',     cnpjCpf: '89.012.345/0001-89', telefone: '(37) 99012-3344', email: 'teixeira@retimica.com',      situacao: 'adimplente',  saldoAberto: 6_500,   estadoProcesso: 'normal'    },
  { id: 'c13', nome: 'Auto Peças e Acessórios Lima',   tipo: 'revenda',        cidade: 'Formiga',     cnpjCpf: '01.234.567/0001-01', telefone: '(37) 99123-4455', email: 'lima@autopecas.com',         situacao: 'adimplente',  saldoAberto: 1_200,   estadoProcesso: 'normal'    },
  { id: 'c14', nome: 'Frotas Rápido Sul Ltda',         tipo: 'frotista',       cidade: 'Lavras',      cnpjCpf: '12.345.678/0002-80', telefone: '(35) 99234-5566', email: 'fin@rapidosul.com.br',       situacao: 'inadimplente', saldoAberto: 14_900,  estadoProcesso: 'excecao'   },
  { id: 'c15', nome: 'José Maria Gonçalves',           tipo: 'pf',             cidade: 'Formiga',     cnpjCpf: '543.678.901-22',     telefone: '(37) 99345-6677', email: 'josemaria@email.com',        situacao: 'atrasado',    saldoAberto: 4_800,   estadoProcesso: 'normal'    },
  { id: 'c16', nome: 'Mecânica Central do Vale',       tipo: 'oficina',        cidade: 'Passos',      cnpjCpf: '23.456.789/0002-62', telefone: '(35) 99456-7788', email: 'mecanica@centralvale.com',   situacao: 'adimplente',  saldoAberto: 3_100,   estadoProcesso: 'normal'    },
  { id: 'c17', nome: 'Auto Center Três Pontas',        tipo: 'oficina',        cidade: 'Três Pontas', cnpjCpf: '34.567.890/0002-44', telefone: '(35) 99567-8899', email: 'ac3pontas@gmail.com',        situacao: 'adimplente',  saldoAberto: 0,       estadoProcesso: 'normal'    },
  { id: 'c18', nome: 'Transportadora Mineira Express', tipo: 'transportadora', cidade: 'Betim',       cnpjCpf: '45.678.901/0002-26', telefone: '(31) 99678-9900', email: 'fin@minexpress.com.br',      situacao: 'inadimplente', saldoAberto: 27_400,  estadoProcesso: 'normal'    },
  { id: 'c19', nome: 'Oficina Santa Maria',            tipo: 'oficina',        cidade: 'Formiga',     cnpjCpf: '56.789.012/0002-08', telefone: '(37) 99789-0011', email: 'stmaria.oficina@gmail.com',  situacao: 'atrasado',    saldoAberto: 6_900,   estadoProcesso: 'normal'    },
  { id: 'c20', nome: 'Luiz Carlos Rodrigues',          tipo: 'pf',             cidade: 'Oliveira',    cnpjCpf: '654.789.012-33',     telefone: '(37) 99890-1122', email: 'luizcarlos@email.com',       situacao: 'adimplente',  saldoAberto: 2_250,   estadoProcesso: 'normal'    },
  { id: 'c21', nome: 'Borracharia do Norte',           tipo: 'oficina',        cidade: 'Formiga',     cnpjCpf: '67.890.123/0002-90', telefone: '(37) 99001-2233', email: 'norte@borracharia.com',      situacao: 'adimplente',  saldoAberto: 1_800,   estadoProcesso: 'normal'    },
  { id: 'c22', nome: 'Frotas Vale Verde Ltda',         tipo: 'frotista',       cidade: 'Divinópolis', cnpjCpf: '78.901.234/0002-72', telefone: '(37) 99112-3344', email: 'fin@valeverde.com',          situacao: 'inadimplente', saldoAberto: 19_800,  estadoProcesso: 'normal'    },
  { id: 'c23', nome: 'Auto Peças Formiga Center',      tipo: 'revenda',        cidade: 'Formiga',     cnpjCpf: '89.012.345/0002-54', telefone: '(37) 99223-4455', email: 'compras@fcenter.com.br',     situacao: 'atrasado',    saldoAberto: 8_300,   estadoProcesso: 'normal'    },
  { id: 'c24', nome: 'Mecânica São Benedito',          tipo: 'oficina',        cidade: 'Itaúna',      cnpjCpf: '90.123.456/0002-36', telefone: '(37) 99334-5566', email: 'sbenedito@mecanica.com',     situacao: 'adimplente',  saldoAberto: 4_600,   estadoProcesso: 'normal'    },
  { id: 'c25', nome: 'Wagner Antônio Pereira',         tipo: 'pf',             cidade: 'Formiga',     cnpjCpf: '765.890.123-44',     telefone: '(37) 99445-6677', email: 'wagner.pereira@email.com',   situacao: 'atrasado',    saldoAberto: 3_700,   estadoProcesso: 'normal'    },
  { id: 'c26', nome: 'Transportes Rio das Pedras',     tipo: 'transportadora', cidade: 'Itapecerica', cnpjCpf: '01.234.567/0002-18', telefone: '(37) 99556-7788', email: 'fin@riopedras.com.br',       situacao: 'inadimplente', saldoAberto: 16_500,  estadoProcesso: 'normal'    },
  { id: 'c27', nome: 'Auto Center Oliveira',           tipo: 'oficina',        cidade: 'Oliveira',    cnpjCpf: '12.345.678/0003-61', telefone: '(37) 99667-8899', email: 'ac.oliveira@gmail.com',      situacao: 'adimplente',  saldoAberto: 2_400,   estadoProcesso: 'normal'    },
  { id: 'c28', nome: 'Indústria de Laticínios Camilo', tipo: 'frotista',       cidade: 'Formiga',     cnpjCpf: '23.456.789/0003-43', telefone: '(37) 99778-9900', email: 'fin@camilo.ind.br',          situacao: 'atrasado',    saldoAberto: 9_100,   estadoProcesso: 'normal'    },
  { id: 'c29', nome: 'Mecânica Novo Horizonte',        tipo: 'oficina',        cidade: 'Nova Serrana', cnpjCpf: '34.567.890/0003-25', telefone: '(37) 99889-0011', email: 'novohorizonte@gmail.com',  situacao: 'adimplente',  saldoAberto: 1_650,   estadoProcesso: 'normal'    },
  { id: 'c30', nome: 'Adriana Silva Mecânica',         tipo: 'pf',             cidade: 'Formiga',     cnpjCpf: '876.901.234-55',     telefone: '(37) 99900-1122', email: 'adrianasilva@email.com',     situacao: 'inadimplente', saldoAberto: 11_200,  estadoProcesso: 'normal'    },
  { id: 'c31', nome: 'Retífica Mineira Ltda',          tipo: 'oficina',        cidade: 'Itaúna',      cnpjCpf: '45.678.901/0003-07', telefone: '(37) 99011-2233', email: 'retifica@mineira.com',       situacao: 'adimplente',  saldoAberto: 5_300,   estadoProcesso: 'normal'    },
  { id: 'c32', nome: 'Posto e Mecânica São João',      tipo: 'oficina',        cidade: 'Formiga',     cnpjCpf: '56.789.012/0003-89', telefone: '(37) 99122-3344', email: 'postojoao@gmail.com',        situacao: 'adimplente',  saldoAberto: 0,       estadoProcesso: 'normal'    },
  { id: 'c33', nome: 'Frota Agropecuária Silveira',    tipo: 'frotista',       cidade: 'Formiga',     cnpjCpf: '67.890.123/0003-71', telefone: '(37) 99233-4455', email: 'fin@silveira.agro.br',       situacao: 'atrasado',    saldoAberto: 7_200,   estadoProcesso: 'normal'    },
  { id: 'c34', nome: 'Auto Peças São Sebastião',       tipo: 'revenda',        cidade: 'Formiga',     cnpjCpf: '78.901.234/0003-53', telefone: '(37) 99344-5566', email: 'ssebastiao@autopecas.com',   situacao: 'adimplente',  saldoAberto: 2_100,   estadoProcesso: 'normal'    },
  { id: 'c35', nome: 'Mecânica e Borracharia Cunha',   tipo: 'oficina',        cidade: 'Divinópolis', cnpjCpf: '89.012.345/0003-35', telefone: '(37) 99455-6677', email: 'cunha@mecanica.com',         situacao: 'inadimplente', saldoAberto: 13_800,  estadoProcesso: 'normal'    },
  { id: 'c36', nome: 'Robson Faria Transporte',        tipo: 'pf',             cidade: 'Carmo do Cajuru', cnpjCpf: '987.012.345-66', telefone: '(37) 99566-7788', email: 'robsonfaria@email.com',    situacao: 'atrasado',    saldoAberto: 5_500,   estadoProcesso: 'normal'    },
  { id: 'c37', nome: 'Auto Elétrica Moreira',          tipo: 'oficina',        cidade: 'Formiga',     cnpjCpf: '90.123.456/0003-17', telefone: '(37) 99677-8899', email: 'moreira@autoeletrica.com',   situacao: 'adimplente',  saldoAberto: 3_900,   estadoProcesso: 'normal'    },
  { id: 'c38', nome: 'Cooperativa Agrícola Formiga',   tipo: 'frotista',       cidade: 'Formiga',     cnpjCpf: '01.234.567/0003-99', telefone: '(37) 3322-8800', email: 'fin@coopaformiga.com.br',     situacao: 'adimplente',  saldoAberto: 4_700,   estadoProcesso: 'normal'    },
  { id: 'c39', nome: 'Oficina dos Irmãos Castro',      tipo: 'oficina',        cidade: 'Formiga',     cnpjCpf: '12.345.678/0004-42', telefone: '(37) 99788-9900', email: 'castro.irmaosofc@gmail.com', situacao: 'atrasado',    saldoAberto: 6_100,   estadoProcesso: 'normal'    },
  { id: 'c40', nome: 'Mecânica Bom Jesus',             tipo: 'oficina',        cidade: 'Arcos',       cnpjCpf: '23.456.789/0004-24', telefone: '(37) 99899-0011', email: 'bomjesus@mecanica.com',      situacao: 'adimplente',  saldoAberto: 1_500,   estadoProcesso: 'normal'    },
]

// ── Boletos ──────────────────────────────────────────────────────────────
// ~100 boletos distribuídos: pago(35) avencer(25) hoje(5) atrasado(22) inadimplente(13)

const svc = [
  'Retífica de motor completo',
  'Usinagem de cabeçote',
  'Montagem de motor',
  'Retífica de virabrequim',
  'Brunimento de cilindro',
  'Troca de bronzina e bucha',
]

function nf(n: number) { return n.toString().padStart(5, '0') }
function bol(n: number) { return `BLT-2026-${n.toString().padStart(5, '0')}` }

export const boletos: Boleto[] = [
  // ── PAGOS (35) ──────────────────────────────────────────────────────────
  { id: 'b001', clienteId: 'c01', numero: bol(1001), nfNumero: nf(8241), descricao: svc[0], valor: 4_200,  vencimento: '2026-04-10', emissao: '2026-03-28', status: 'pago',  dataPagamento: '2026-04-09' },
  { id: 'b002', clienteId: 'c05', numero: bol(1002), nfNumero: nf(8242), descricao: svc[2], valor: 6_800,  vencimento: '2026-04-15', emissao: '2026-04-01', status: 'pago',  dataPagamento: '2026-04-15' },
  { id: 'b003', clienteId: 'c09', numero: bol(1003), nfNumero: nf(8243), descricao: svc[1], valor: 2_700,  vencimento: '2026-04-20', emissao: '2026-04-07', status: 'pago',  dataPagamento: '2026-04-18' },
  { id: 'b004', clienteId: 'c17', numero: bol(1004), nfNumero: nf(8244), descricao: svc[3], valor: 3_500,  vencimento: '2026-04-22', emissao: '2026-04-10', status: 'pago',  dataPagamento: '2026-04-22' },
  { id: 'b005', clienteId: 'c32', numero: bol(1005), nfNumero: nf(8245), descricao: svc[4], valor: 1_800,  vencimento: '2026-04-25', emissao: '2026-04-11', status: 'pago',  dataPagamento: '2026-04-25' },
  { id: 'b006', clienteId: 'c12', numero: bol(1006), nfNumero: nf(8246), descricao: svc[5], valor: 2_100,  vencimento: '2026-04-28', emissao: '2026-04-14', status: 'pago_atraso', dataPagamento: '2026-05-06', diasAtraso: 8 },
  { id: 'b007', clienteId: 'c16', numero: bol(1007), nfNumero: nf(8247), descricao: svc[0], valor: 5_400,  vencimento: '2026-05-02', emissao: '2026-04-18', status: 'pago',  dataPagamento: '2026-05-02' },
  { id: 'b008', clienteId: 'c27', numero: bol(1008), nfNumero: nf(8248), descricao: svc[1], valor: 2_400,  vencimento: '2026-05-05', emissao: '2026-04-21', status: 'pago',  dataPagamento: '2026-05-04' },
  { id: 'b009', clienteId: 'c29', numero: bol(1009), nfNumero: nf(8249), descricao: svc[2], valor: 1_650,  vencimento: '2026-05-08', emissao: '2026-04-24', status: 'pago',  dataPagamento: '2026-05-08' },
  { id: 'b010', clienteId: 'c31', numero: bol(1010), nfNumero: nf(8250), descricao: svc[3], valor: 3_200,  vencimento: '2026-05-10', emissao: '2026-04-27', status: 'pago_atraso', dataPagamento: '2026-05-19', diasAtraso: 9 },
  { id: 'b011', clienteId: 'c34', numero: bol(1011), nfNumero: nf(8251), descricao: svc[4], valor: 2_100,  vencimento: '2026-05-12', emissao: '2026-04-28', status: 'pago',  dataPagamento: '2026-05-12' },
  { id: 'b012', clienteId: 'c37', numero: bol(1012), nfNumero: nf(8252), descricao: svc[5], valor: 3_900,  vencimento: '2026-05-14', emissao: '2026-04-30', status: 'pago_atraso', dataPagamento: '2026-05-20', diasAtraso: 6 },
  { id: 'b013', clienteId: 'c40', numero: bol(1013), nfNumero: nf(8253), descricao: svc[0], valor: 1_500,  vencimento: '2026-05-15', emissao: '2026-05-01', status: 'pago',  dataPagamento: '2026-05-15' },
  { id: 'b014', clienteId: 'c20', numero: bol(1014), nfNumero: nf(8254), descricao: svc[1], valor: 2_250,  vencimento: '2026-05-16', emissao: '2026-05-02', status: 'pago',  dataPagamento: '2026-05-16' },
  { id: 'b015', clienteId: 'c13', numero: bol(1015), nfNumero: nf(8255), descricao: svc[2], valor: 1_200,  vencimento: '2026-05-17', emissao: '2026-05-03', status: 'pago',  dataPagamento: '2026-05-17' },
  { id: 'b016', clienteId: 'c38', numero: bol(1016), nfNumero: nf(8256), descricao: svc[3], valor: 4_700,  vencimento: '2026-05-18', emissao: '2026-05-04', status: 'pago',  dataPagamento: '2026-05-18' },
  { id: 'b017', clienteId: 'c24', numero: bol(1017), nfNumero: nf(8257), descricao: svc[4], valor: 4_600,  vencimento: '2026-05-20', emissao: '2026-05-06', status: 'pago',  dataPagamento: '2026-05-20' },
  { id: 'b018', clienteId: 'c21', numero: bol(1018), nfNumero: nf(8258), descricao: svc[5], valor: 1_800,  vencimento: '2026-05-22', emissao: '2026-05-08', status: 'pago',  dataPagamento: '2026-05-22' },
  { id: 'b019', clienteId: 'c07', numero: bol(1019), nfNumero: nf(8259), descricao: svc[0], valor: 3_400,  vencimento: '2026-05-24', emissao: '2026-05-10', status: 'pago_atraso', dataPagamento: '2026-06-01', diasAtraso: 8 },
  { id: 'b020', clienteId: 'c04', numero: bol(1020), nfNumero: nf(8260), descricao: svc[1], valor: 1_950,  vencimento: '2026-05-25', emissao: '2026-05-11', status: 'pago',  dataPagamento: '2026-05-25' },
  { id: 'b021', clienteId: 'c16', numero: bol(1021), nfNumero: nf(8261), descricao: svc[2], valor: 3_100,  vencimento: '2026-05-26', emissao: '2026-05-12', status: 'pago_atraso', dataPagamento: '2026-06-03', diasAtraso: 8 },
  { id: 'b022', clienteId: 'c09', numero: bol(1022), nfNumero: nf(8262), descricao: svc[3], valor: 2_700,  vencimento: '2026-05-27', emissao: '2026-05-13', status: 'pago',  dataPagamento: '2026-05-27' },
  { id: 'b023', clienteId: 'c31', numero: bol(1023), nfNumero: nf(8263), descricao: svc[4], valor: 5_300,  vencimento: '2026-05-28', emissao: '2026-05-14', status: 'pago',  dataPagamento: '2026-05-28' },
  { id: 'b024', clienteId: 'c29', numero: bol(1024), nfNumero: nf(8264), descricao: svc[5], valor: 1_650,  vencimento: '2026-05-29', emissao: '2026-05-15', status: 'pago',  dataPagamento: '2026-05-29' },
  { id: 'b025', clienteId: 'c12', numero: bol(1025), nfNumero: nf(8265), descricao: svc[0], valor: 6_500,  vencimento: '2026-05-30', emissao: '2026-05-16', status: 'pago',  dataPagamento: '2026-05-30' },
  { id: 'b026', clienteId: 'c37', numero: bol(1026), nfNumero: nf(8266), descricao: svc[1], valor: 3_900,  vencimento: '2026-05-31', emissao: '2026-05-17', status: 'pago',  dataPagamento: '2026-05-30' },
  { id: 'b027', clienteId: 'c27', numero: bol(1027), nfNumero: nf(8267), descricao: svc[2], valor: 2_400,  vencimento: '2026-06-01', emissao: '2026-05-18', status: 'pago',  dataPagamento: '2026-06-01' },
  { id: 'b028', clienteId: 'c40', numero: bol(1028), nfNumero: nf(8268), descricao: svc[3], valor: 1_500,  vencimento: '2026-06-02', emissao: '2026-05-19', status: 'pago',  dataPagamento: '2026-06-02' },
  { id: 'b029', clienteId: 'c17', numero: bol(1029), nfNumero: nf(8269), descricao: svc[4], valor: 3_500,  vencimento: '2026-06-03', emissao: '2026-05-20', status: 'pago',  dataPagamento: '2026-06-03' },
  { id: 'b030', clienteId: 'c20', numero: bol(1030), nfNumero: nf(8270), descricao: svc[5], valor: 2_250,  vencimento: '2026-06-04', emissao: '2026-05-21', status: 'pago',  dataPagamento: '2026-06-04' },
  { id: 'b031', clienteId: 'c38', numero: bol(1031), nfNumero: nf(8271), descricao: svc[0], valor: 4_700,  vencimento: '2026-06-04', emissao: '2026-05-21', status: 'pago',  dataPagamento: '2026-06-04' },
  { id: 'b032', clienteId: 'c34', numero: bol(1032), nfNumero: nf(8272), descricao: svc[1], valor: 2_100,  vencimento: '2026-06-03', emissao: '2026-05-20', status: 'pago',  dataPagamento: '2026-06-03' },
  { id: 'b033', clienteId: 'c04', numero: bol(1033), nfNumero: nf(8273), descricao: svc[2], valor: 1_950,  vencimento: '2026-06-02', emissao: '2026-05-19', status: 'pago',  dataPagamento: '2026-06-02' },
  { id: 'b034', clienteId: 'c21', numero: bol(1034), nfNumero: nf(8274), descricao: svc[3], valor: 1_800,  vencimento: '2026-06-01', emissao: '2026-05-18', status: 'pago',  dataPagamento: '2026-06-01' },
  { id: 'b035', clienteId: 'c24', numero: bol(1035), nfNumero: nf(8275), descricao: svc[4], valor: 4_600,  vencimento: '2026-05-30', emissao: '2026-05-16', status: 'pago',  dataPagamento: '2026-05-30' },

  // ── A VENCER (25) ────────────────────────────────────────────────────────
  { id: 'b036', clienteId: 'c01', numero: bol(1036), nfNumero: nf(8276), descricao: svc[0], valor: 4_200,  vencimento: '2026-06-15', emissao: '2026-06-01', status: 'avencer' },
  { id: 'b037', clienteId: 'c07', numero: bol(1037), nfNumero: nf(8277), descricao: svc[2], valor: 3_400,  vencimento: '2026-06-18', emissao: '2026-06-04', status: 'avencer' },
  { id: 'b038', clienteId: 'c09', numero: bol(1038), nfNumero: nf(8278), descricao: svc[1], valor: 2_700,  vencimento: '2026-06-20', emissao: '2026-06-06', status: 'avencer' },
  { id: 'b039', clienteId: 'c12', numero: bol(1039), nfNumero: nf(8279), descricao: svc[5], valor: 6_500,  vencimento: '2026-06-22', emissao: '2026-06-08', status: 'avencer' },
  { id: 'b040', clienteId: 'c13', numero: bol(1040), nfNumero: nf(8280), descricao: svc[3], valor: 1_200,  vencimento: '2026-06-25', emissao: '2026-06-11', status: 'avencer' },
  { id: 'b041', clienteId: 'c16', numero: bol(1041), nfNumero: nf(8281), descricao: svc[4], valor: 3_100,  vencimento: '2026-06-26', emissao: '2026-06-12', status: 'avencer' },
  { id: 'b042', clienteId: 'c20', numero: bol(1042), nfNumero: nf(8282), descricao: svc[0], valor: 2_250,  vencimento: '2026-06-27', emissao: '2026-06-13', status: 'avencer' },
  { id: 'b043', clienteId: 'c21', numero: bol(1043), nfNumero: nf(8283), descricao: svc[1], valor: 1_800,  vencimento: '2026-06-28', emissao: '2026-06-14', status: 'avencer' },
  { id: 'b044', clienteId: 'c24', numero: bol(1044), nfNumero: nf(8284), descricao: svc[2], valor: 4_600,  vencimento: '2026-06-30', emissao: '2026-06-16', status: 'avencer' },
  { id: 'b045', clienteId: 'c27', numero: bol(1045), nfNumero: nf(8285), descricao: svc[3], valor: 2_400,  vencimento: '2026-07-02', emissao: '2026-06-18', status: 'avencer' },
  { id: 'b046', clienteId: 'c29', numero: bol(1046), nfNumero: nf(8286), descricao: svc[4], valor: 1_650,  vencimento: '2026-07-05', emissao: '2026-06-21', status: 'avencer' },
  { id: 'b047', clienteId: 'c31', numero: bol(1047), nfNumero: nf(8287), descricao: svc[5], valor: 5_300,  vencimento: '2026-07-08', emissao: '2026-06-24', status: 'avencer' },
  { id: 'b048', clienteId: 'c34', numero: bol(1048), nfNumero: nf(8288), descricao: svc[0], valor: 2_100,  vencimento: '2026-07-10', emissao: '2026-06-26', status: 'avencer' },
  { id: 'b049', clienteId: 'c37', numero: bol(1049), nfNumero: nf(8289), descricao: svc[1], valor: 3_900,  vencimento: '2026-07-12', emissao: '2026-06-28', status: 'avencer' },
  { id: 'b050', clienteId: 'c38', numero: bol(1050), nfNumero: nf(8290), descricao: svc[2], valor: 4_700,  vencimento: '2026-07-14', emissao: '2026-06-30', status: 'avencer' },
  { id: 'b051', clienteId: 'c40', numero: bol(1051), nfNumero: nf(8291), descricao: svc[3], valor: 1_500,  vencimento: '2026-07-15', emissao: '2026-07-01', status: 'avencer' },
  { id: 'b052', clienteId: 'c04', numero: bol(1052), nfNumero: nf(8292), descricao: svc[4], valor: 1_950,  vencimento: '2026-07-17', emissao: '2026-07-03', status: 'avencer' },
  { id: 'b053', clienteId: 'c17', numero: bol(1053), nfNumero: nf(8293), descricao: svc[5], valor: 3_500,  vencimento: '2026-07-20', emissao: '2026-07-06', status: 'avencer' },
  { id: 'b054', clienteId: 'c06', numero: bol(1054), nfNumero: nf(8294), descricao: svc[0], valor: 11_400, vencimento: '2026-07-22', emissao: '2026-07-08', status: 'avencer' },
  { id: 'b055', clienteId: 'c32', numero: bol(1055), nfNumero: nf(8295), descricao: svc[1], valor: 2_800,  vencimento: '2026-07-25', emissao: '2026-07-11', status: 'avencer' },
  { id: 'b056', clienteId: 'c07', numero: bol(1056), nfNumero: nf(8296), descricao: svc[2], valor: 3_400,  vencimento: '2026-07-28', emissao: '2026-07-14', status: 'avencer' },
  { id: 'b057', clienteId: 'c13', numero: bol(1057), nfNumero: nf(8297), descricao: svc[3], valor: 1_200,  vencimento: '2026-07-30', emissao: '2026-07-16', status: 'avencer' },
  { id: 'b058', clienteId: 'c37', numero: bol(1058), nfNumero: nf(8298), descricao: svc[4], valor: 3_900,  vencimento: '2026-08-02', emissao: '2026-07-19', status: 'avencer' },
  { id: 'b059', clienteId: 'c24', numero: bol(1059), nfNumero: nf(8299), descricao: svc[5], valor: 4_600,  vencimento: '2026-08-05', emissao: '2026-07-22', status: 'avencer' },
  { id: 'b060', clienteId: 'c21', numero: bol(1060), nfNumero: nf(8300), descricao: svc[0], valor: 1_800,  vencimento: '2026-08-08', emissao: '2026-07-25', status: 'avencer' },
  // faixa 61–90 dias da visão prospectiva de recebíveis
  { id: 'b101', clienteId: 'c01', numero: bol(1101), nfNumero: nf(8341), descricao: svc[2], valor: 3_800,  vencimento: '2026-08-12', emissao: '2026-07-29', status: 'avencer' },
  { id: 'b102', clienteId: 'c05', numero: bol(1102), nfNumero: nf(8342), descricao: svc[0], valor: 2_900,  vencimento: '2026-08-18', emissao: '2026-08-04', status: 'avencer' },
  { id: 'b103', clienteId: 'c16', numero: bol(1103), nfNumero: nf(8343), descricao: svc[1], valor: 3_100,  vencimento: '2026-08-22', emissao: '2026-08-08', status: 'avencer' },
  { id: 'b104', clienteId: 'c20', numero: bol(1104), nfNumero: nf(8344), descricao: svc[3], valor: 2_250,  vencimento: '2026-08-26', emissao: '2026-08-12', status: 'avencer' },
  { id: 'b105', clienteId: 'c24', numero: bol(1105), nfNumero: nf(8345), descricao: svc[4], valor: 4_600,  vencimento: '2026-08-29', emissao: '2026-08-15', status: 'avencer' },
  { id: 'b106', clienteId: 'c12', numero: bol(1106), nfNumero: nf(8346), descricao: svc[5], valor: 6_500,  vencimento: '2026-09-01', emissao: '2026-08-18', status: 'avencer' },

  // ── VENCE HOJE (5) ───────────────────────────────────────────────────────
  { id: 'b061', clienteId: 'c04', numero: bol(1061), nfNumero: nf(8301), descricao: svc[1], valor: 1_950,  vencimento: '2026-06-04', emissao: '2026-05-21', status: 'hoje' },
  { id: 'b062', clienteId: 'c07', numero: bol(1062), nfNumero: nf(8302), descricao: svc[3], valor: 3_400,  vencimento: '2026-06-04', emissao: '2026-05-21', status: 'hoje' },
  { id: 'b063', clienteId: 'c12', numero: bol(1063), nfNumero: nf(8303), descricao: svc[0], valor: 6_500,  vencimento: '2026-06-04', emissao: '2026-05-21', status: 'hoje' },
  { id: 'b064', clienteId: 'c16', numero: bol(1064), nfNumero: nf(8304), descricao: svc[2], valor: 3_100,  vencimento: '2026-06-04', emissao: '2026-05-21', status: 'hoje' },
  { id: 'b065', clienteId: 'c27', numero: bol(1065), nfNumero: nf(8305), descricao: svc[4], valor: 2_400,  vencimento: '2026-06-04', emissao: '2026-05-21', status: 'hoje' },

  // ── ATRASADO (22) ────────────────────────────────────────────────────────
  { id: 'b066', clienteId: 'c02', numero: bol(1066), nfNumero: nf(8306), descricao: svc[0], valor: 7_800,  vencimento: '2026-05-28', emissao: '2026-05-14', status: 'atrasado', diasAtraso:  7 },
  { id: 'b067', clienteId: 'c10', numero: bol(1067), nfNumero: nf(8307), descricao: svc[1], valor: 5_600,  vencimento: '2026-05-22', emissao: '2026-05-08', status: 'atrasado', diasAtraso: 13 },
  { id: 'b068', clienteId: 'c15', numero: bol(1068), nfNumero: nf(8308), descricao: svc[2], valor: 4_800,  vencimento: '2026-05-18', emissao: '2026-05-04', status: 'atrasado', diasAtraso: 17 },
  { id: 'b069', clienteId: 'c19', numero: bol(1069), nfNumero: nf(8309), descricao: svc[3], valor: 6_900,  vencimento: '2026-05-14', emissao: '2026-04-30', status: 'atrasado', diasAtraso: 21 },
  { id: 'b070', clienteId: 'c23', numero: bol(1070), nfNumero: nf(8310), descricao: svc[4], valor: 8_300,  vencimento: '2026-05-10', emissao: '2026-04-26', status: 'atrasado', diasAtraso: 25 },
  { id: 'b071', clienteId: 'c25', numero: bol(1071), nfNumero: nf(8311), descricao: svc[5], valor: 3_700,  vencimento: '2026-05-06', emissao: '2026-04-22', status: 'atrasado', diasAtraso: 29 },
  { id: 'b072', clienteId: 'c28', numero: bol(1072), nfNumero: nf(8312), descricao: svc[0], valor: 9_100,  vencimento: '2026-05-02', emissao: '2026-04-18', status: 'atrasado', diasAtraso: 33 },
  { id: 'b073', clienteId: 'c33', numero: bol(1073), nfNumero: nf(8313), descricao: svc[1], valor: 7_200,  vencimento: '2026-04-28', emissao: '2026-04-14', status: 'atrasado', diasAtraso: 37 },
  { id: 'b074', clienteId: 'c36', numero: bol(1074), nfNumero: nf(8314), descricao: svc[2], valor: 5_500,  vencimento: '2026-04-24', emissao: '2026-04-10', status: 'atrasado', diasAtraso: 41 },
  { id: 'b075', clienteId: 'c39', numero: bol(1075), nfNumero: nf(8315), descricao: svc[3], valor: 6_100,  vencimento: '2026-04-20', emissao: '2026-04-06', status: 'atrasado', diasAtraso: 45 },
  { id: 'b076', clienteId: 'c06', numero: bol(1076), nfNumero: nf(8316), descricao: svc[4], valor: 11_400, vencimento: '2026-04-16', emissao: '2026-04-02', status: 'atrasado', diasAtraso: 49 },
  { id: 'b077', clienteId: 'c02', numero: bol(1077), nfNumero: nf(8317), descricao: svc[5], valor: 4_200,  vencimento: '2026-05-20', emissao: '2026-05-06', status: 'atrasado', diasAtraso: 15 },
  { id: 'b078', clienteId: 'c10', numero: bol(1078), nfNumero: nf(8318), descricao: svc[0], valor: 2_800,  vencimento: '2026-05-15', emissao: '2026-05-01', status: 'atrasado', diasAtraso: 20 },
  { id: 'b079', clienteId: 'c15', numero: bol(1079), nfNumero: nf(8319), descricao: svc[1], valor: 4_800,  vencimento: '2026-05-25', emissao: '2026-05-11', status: 'atrasado', diasAtraso:  10},
  { id: 'b080', clienteId: 'c19', numero: bol(1080), nfNumero: nf(8320), descricao: svc[2], valor: 6_900,  vencimento: '2026-05-30', emissao: '2026-05-16', status: 'atrasado', diasAtraso:  5 },
  { id: 'b081', clienteId: 'c23', numero: bol(1081), nfNumero: nf(8321), descricao: svc[3], valor: 4_100,  vencimento: '2026-04-26', emissao: '2026-04-12', status: 'atrasado', diasAtraso: 39 },
  { id: 'b082', clienteId: 'c25', numero: bol(1082), nfNumero: nf(8322), descricao: svc[4], valor: 3_700,  vencimento: '2026-04-14', emissao: '2026-03-31', status: 'atrasado', diasAtraso: 51 },
  { id: 'b083', clienteId: 'c28', numero: bol(1083), nfNumero: nf(8323), descricao: svc[5], valor: 9_100,  vencimento: '2026-05-12', emissao: '2026-04-28', status: 'atrasado', diasAtraso: 23 },
  { id: 'b084', clienteId: 'c33', numero: bol(1084), nfNumero: nf(8324), descricao: svc[0], valor: 7_200,  vencimento: '2026-05-26', emissao: '2026-05-12', status: 'atrasado', diasAtraso:  9 },
  { id: 'b085', clienteId: 'c36', numero: bol(1085), nfNumero: nf(8325), descricao: svc[1], valor: 5_500,  vencimento: '2026-04-30', emissao: '2026-04-16', status: 'atrasado', diasAtraso: 35 },
  { id: 'b086', clienteId: 'c39', numero: bol(1086), nfNumero: nf(8326), descricao: svc[2], valor: 6_100,  vencimento: '2026-05-08', emissao: '2026-04-24', status: 'atrasado', diasAtraso: 27 },
  { id: 'b087', clienteId: 'c06', numero: bol(1087), nfNumero: nf(8327), descricao: svc[3], valor: 4_300,  vencimento: '2026-05-20', emissao: '2026-05-06', status: 'atrasado', diasAtraso: 15 },

  // ── INADIMPLENTE (13) ────────────────────────────────────────────────────
  { id: 'b088', clienteId: 'c03', numero: bol(1088), nfNumero: nf(8328), descricao: svc[0], valor: 12_000, vencimento: '2026-03-10', emissao: '2026-02-24', status: 'inadimplente', diasAtraso: 86 },
  { id: 'b089', clienteId: 'c03', numero: bol(1089), nfNumero: nf(8329), descricao: svc[2], valor: 11_600, vencimento: '2026-02-14', emissao: '2026-01-31', status: 'inadimplente', diasAtraso: 110, emProtesto: true },
  { id: 'b090', clienteId: 'c08', numero: bol(1090), nfNumero: nf(8330), descricao: svc[1], valor: 9_800,  vencimento: '2026-03-05', emissao: '2026-02-19', status: 'inadimplente', diasAtraso: 91, emProtesto: true },
  { id: 'b091', clienteId: 'c08', numero: bol(1091), nfNumero: nf(8331), descricao: svc[3], valor: 8_900,  vencimento: '2026-02-20', emissao: '2026-02-06', status: 'inadimplente', diasAtraso: 104 },
  { id: 'b092', clienteId: 'c11', numero: bol(1092), nfNumero: nf(8332), descricao: svc[0], valor: 12_000, vencimento: '2026-03-01', emissao: '2026-02-15', status: 'inadimplente', diasAtraso: 95 },
  { id: 'b093', clienteId: 'c11', numero: bol(1093), nfNumero: nf(8333), descricao: svc[4], valor: 11_400, vencimento: '2026-02-10', emissao: '2026-01-27', status: 'inadimplente', diasAtraso: 114 },
  { id: 'b094', clienteId: 'c11', numero: bol(1094), nfNumero: nf(8334), descricao: svc[2], valor: 7_800,  vencimento: '2026-01-15', emissao: '2026-01-01', status: 'inadimplente', diasAtraso: 140 },
  { id: 'b095', clienteId: 'c14', numero: bol(1095), nfNumero: nf(8335), descricao: svc[5], valor: 8_200,  vencimento: '2026-03-15', emissao: '2026-03-01', status: 'inadimplente', diasAtraso: 81 },
  { id: 'b096', clienteId: 'c14', numero: bol(1096), nfNumero: nf(8336), descricao: svc[0], valor: 6_700,  vencimento: '2026-02-28', emissao: '2026-02-14', status: 'inadimplente', diasAtraso: 96, emProtesto: true },
  { id: 'b097', clienteId: 'c18', numero: bol(1097), nfNumero: nf(8337), descricao: svc[1], valor: 11_200, vencimento: '2026-03-20', emissao: '2026-03-06', status: 'inadimplente', diasAtraso: 76 },
  { id: 'b098', clienteId: 'c18', numero: bol(1098), nfNumero: nf(8338), descricao: svc[3], valor: 9_400,  vencimento: '2026-02-25', emissao: '2026-02-11', status: 'inadimplente', diasAtraso: 99, emProtesto: true },
  { id: 'b099', clienteId: 'c22', numero: bol(1099), nfNumero: nf(8339), descricao: svc[2], valor: 10_200, vencimento: '2026-03-25', emissao: '2026-03-11', status: 'inadimplente', diasAtraso: 71 },
  { id: 'b100', clienteId: 'c30', numero: bol(1100), nfNumero: nf(8340), descricao: svc[4], valor: 11_200, vencimento: '2026-03-12', emissao: '2026-02-26', status: 'inadimplente', diasAtraso: 84 },
  // perda provável — atraso acima de 180 dias (faixa 180+ do aging)
  { id: 'b107', clienteId: 'c35', numero: bol(1107), nfNumero: nf(8347), descricao: svc[1], valor: 7_300,  vencimento: '2025-11-15', emissao: '2025-11-01', status: 'inadimplente', diasAtraso: 201 },
  { id: 'b108', clienteId: 'c26', numero: bol(1108), nfNumero: nf(8348), descricao: svc[3], valor: 9_000,  vencimento: '2025-10-30', emissao: '2025-10-16', status: 'inadimplente', diasAtraso: 217, emProtesto: true },
]

// ── Histórico de notificações ─────────────────────────────────────────────

export const notificacoes: NotificacaoHistorico[] = [
  { id: 'n001', clienteId: 'c03', clienteNome: 'Transportes Minas Gerais Ltda', boletoId: 'b088', etapa: 'D+30', templateNome: 'Lembrete — Boleto em Aberto',   status: 'lida',      canal: 'whatsapp', dataEnvio: '2026-04-09T09:00:00', preview: 'Olá, identificamos um boleto em aberto...' },
  { id: 'n002', clienteId: 'c03', clienteNome: 'Transportes Minas Gerais Ltda', boletoId: 'b089', etapa: 'D+15', templateNome: 'Aviso — Vencimento Ultrapassado', status: 'entregue',  canal: 'whatsapp', dataEnvio: '2026-03-01T09:00:00', preview: 'Olá, seu boleto já está vencido há...' },
  { id: 'n003', clienteId: 'c08', clienteNome: 'Mecânica Precisa Ltda',         boletoId: 'b090', etapa: 'D+7',  templateNome: 'Lembrete — Boleto em Aberto',   status: 'lida',      canal: 'whatsapp', dataEnvio: '2026-03-12T09:15:00', preview: 'Olá, identificamos um boleto em aberto...' },
  { id: 'n004', clienteId: 'c08', clienteNome: 'Mecânica Precisa Ltda',         boletoId: 'b091', etapa: 'D+15', templateNome: 'Aviso — Vencimento Ultrapassado', status: 'respondida',canal: 'whatsapp', dataEnvio: '2026-03-07T09:00:00', preview: 'Olá, seu boleto já está vencido há...' },
  { id: 'n005', clienteId: 'c11', clienteNome: 'Transportadora Boa Viagem',     boletoId: 'b092', etapa: 'D+7',  templateNome: 'Lembrete — Boleto em Aberto',   status: 'lida',      canal: 'whatsapp', dataEnvio: '2026-03-08T09:30:00', preview: 'Olá, identificamos um boleto em aberto...' },
  { id: 'n006', clienteId: 'c11', clienteNome: 'Transportadora Boa Viagem',     boletoId: 'b093', etapa: 'D+30', templateNome: 'Escalamento Interno',           status: 'enviada',   canal: 'whatsapp', dataEnvio: '2026-03-12T10:00:00', preview: 'Identificamos débitos em aberto há mais de...' },
  { id: 'n007', clienteId: 'c02', clienteNome: 'Mecânica do Zé Augusto',        boletoId: 'b066', etapa: 'D+1',  templateNome: 'Aviso Pós-Vencimento',         status: 'entregue',  canal: 'whatsapp', dataEnvio: '2026-05-29T09:00:00', preview: 'Olá, seu boleto venceu ontem. Pode regularizar...' },
  { id: 'n008', clienteId: 'c02', clienteNome: 'Mecânica do Zé Augusto',        boletoId: 'b077', etapa: 'D+3',  templateNome: 'Aviso Pós-Vencimento',         status: 'agendada',  canal: 'whatsapp', dataEnvio: '2026-06-05T09:00:00', preview: 'Olá, identificamos um boleto em aberto...' },
  { id: 'n009', clienteId: 'c10', clienteNome: 'Oficina São Lucas',             boletoId: 'b067', etapa: 'D+3',  templateNome: 'Aviso Pós-Vencimento',         status: 'lida',      canal: 'whatsapp', dataEnvio: '2026-05-25T09:00:00', preview: 'Olá, identificamos um boleto em aberto...' },
  { id: 'n010', clienteId: 'c15', clienteNome: 'José Maria Gonçalves',          boletoId: 'b068', etapa: 'D-3',  templateNome: 'Lembrete Pré-Vencimento',      status: 'lida',      canal: 'whatsapp', dataEnvio: '2026-05-15T09:00:00', preview: 'Olá, seu boleto vence em 3 dias...' },
  { id: 'n011', clienteId: 'c04', clienteNome: 'Funilaria e Pintura Oliveira',  boletoId: 'b061', etapa: 'D0',   templateNome: 'Lembrete — Vence Hoje',        status: 'entregue',  canal: 'whatsapp', dataEnvio: '2026-06-04T08:00:00', preview: 'Olá, seu boleto vence hoje...' },
  { id: 'n012', clienteId: 'c07', clienteNome: 'Carlos Roberto da Silva',       boletoId: 'b062', etapa: 'D0',   templateNome: 'Lembrete — Vence Hoje',        status: 'enviada',   canal: 'whatsapp', dataEnvio: '2026-06-04T08:05:00', preview: 'Olá, seu boleto vence hoje...' },
  { id: 'n013', clienteId: 'c12', clienteNome: 'Retífica e Mecânica Teixeira',  boletoId: 'b063', etapa: 'D0',   templateNome: 'Lembrete — Vence Hoje',        status: 'agendada',  canal: 'whatsapp', dataEnvio: '2026-06-04T08:10:00', preview: 'Olá, seu boleto vence hoje...' },
  { id: 'n014', clienteId: 'c14', clienteNome: 'Frotas Rápido Sul Ltda',        boletoId: 'b095', etapa: 'D+7',  templateNome: 'Lembrete — Boleto em Aberto',   status: 'enviada',   canal: 'whatsapp', dataEnvio: '2026-03-22T09:00:00', preview: 'Olá, identificamos um boleto em aberto...' },
  { id: 'n015', clienteId: 'c18', clienteNome: 'Transportadora Mineira Express', boletoId: 'b097', etapa: 'D+15', templateNome: 'Aviso — Vencimento Ultrapassado', status: 'lida',    canal: 'whatsapp', dataEnvio: '2026-04-04T09:00:00', preview: 'Olá, seu boleto já está vencido há...' },
]

// ── Templates de notificação ──────────────────────────────────────────────

// Templates alinhados à régua canônica e ao Script de Cobrança.
// Variáveis: [NOME] [NÚMERO] [VALOR] [DATA]
// Divergências do Script corrigidas: prazos de protesto alinhados ao D+30/D+60 (não D+7/D+15).
export const templates: Template[] = [
  {
    id: 't01',
    nome: 'Lembrete Preventivo (D-2)',
    corpo: `Olá! Passando para lembrar que o título nº [NÚMERO], no valor de R$ [VALOR], vence em [DATA]. Caso já tenha realizado o pagamento, favor desconsiderar. Se precisar de segunda via do boleto, estamos à disposição.\n\nEquipe Retífica Formiguense.`,
  },
  {
    id: 't02',
    nome: 'Lembrete — Vence Hoje (D0)',
    corpo: `Olá! O título nº [NÚMERO], referente aos serviços realizados pela Retífica Formiguense, vence hoje. Caso o pagamento já tenha sido efetuado, basta desconsiderar esta mensagem. Se precisar de segunda via do boleto ou comprovante do serviço, estamos à disposição para enviar de imediato.\n\nAgradecemos pela atenção e confiança.\nEquipe Retífica Formiguense.`,
  },
  {
    id: 't03',
    nome: 'Aviso — Título em Aberto (D+1)',
    corpo: `Olá! Identificamos que o título nº [NÚMERO], com vencimento em [DATA], ainda consta em aberto em nosso sistema. Se o pagamento já tiver sido realizado, pedimos a gentileza de encaminhar o comprovante para fins de baixa e controle interno. Caso esteja pendente, poderia nos informar a previsão de quitação?\n\nEquipe Retífica Formiguense.`,
  },
  {
    id: 't04',
    nome: 'Pedido de Previsão (D+3)',
    corpo: `Olá, [NOME]. O título nº [NÚMERO], no valor de R$ [VALOR], segue em aberto. Poderia nos informar uma previsão de pagamento para regularizarmos no financeiro? Nosso objetivo é buscar a regularização de forma amigável e colaborativa, conforme os princípios da boa-fé e transparência nas relações comerciais.\n\nEquipe Retífica Formiguense.`,
  },
  {
    id: 't05',
    nome: 'Negociação Ativa (D+7)',
    corpo: `Olá, [NOME]. Verificamos que o título nº [NÚMERO], com vencimento em [DATA], ainda consta em aberto. Podemos conversar sobre o motivo do atraso e definir uma data? Se necessário, reenviamos o boleto atualizado.\n\nEstamos à disposição para analisar uma possível renegociação ou quitação imediata, evitando qualquer restrição futura.\n\nEquipe Retífica Formiguense.`,
  },
  {
    id: 't06',
    nome: 'Cobrança Firme (D+15)',
    corpo: `Olá, [NOME]. O débito referente ao título nº [NÚMERO], vencido desde [DATA], precisa ser regularizado. Precisamos de uma posição sobre a regularização ou uma data de pagamento para evitar novas medidas internas de cobrança.\n\nEstamos à disposição para avaliar alternativas.\n\nEquipe Retífica Formiguense — Financeiro.`,
  },
  {
    id: 't07',
    nome: 'Aviso Formal (D+30)',
    corpo: `Olá, [NOME]. Como o débito referente ao título nº [NÚMERO] permanece em aberto, precisamos regularizar a situação. Em conformidade com nossa política de crédito e cobrança e com a legislação aplicável (Código Civil, art. 389 e seguintes, e Lei nº 9.492/1997), informamos que, na ausência de retorno ou negociação, poderemos adotar as medidas previstas, inclusive protesto em cartório.\n\nNosso interesse principal é resolver de forma amigável, evitando restrições ao seu CPF/CNPJ. Podemos conversar?\n\nEquipe Retífica Formiguense — Financeiro.`,
  },
  {
    id: 't08',
    nome: 'Escalamento Interno (D+45)',
    corpo: `[Uso interno — não enviado ao cliente]\n\nTítulo nº [NÚMERO] do cliente [NOME] com débito de R$ [VALOR] permanece em aberto há 45 dias. Encaminhar para responsável financeiro/diretoria. Definir proposta final de negociação ou encaminhamento externo conforme política interna.\n\nAção necessária: ligar formalmente e enviar proposta por escrito (e-mail).`,
  },
  {
    id: 't09',
    nome: 'Encaminhamento Externo (D+60)',
    corpo: `[Uso interno — não enviado ao cliente]\n\nTítulo nº [NÚMERO] do cliente [NOME] — prazo crítico (60 dias). Encaminhar para medida definida pela empresa: protesto em cartório, negativação, cobrador terceirizado ou encaminhamento jurídico. Manter documentação completa de todas as tentativas anteriores de contato e negociação.`,
  },
  {
    id: 't10',
    nome: 'Carteira Especial (D+90)',
    corpo: `[Uso interno — não enviado ao cliente]\n\nTítulo nº [NÚMERO] do cliente [NOME] — prazo de perda provável (90 dias). Tratar em carteira separada com plano específico de recuperação e decisão gerencial. Analisar: provisão contábil, proposta de acordo parcelado, baixa ou outras medidas adequadas ao perfil do cliente.`,
  },
  {
    id: 't11',
    nome: 'Proposta de regularização com abono',
    corpo: `Olá, [NOME]! Sobre o título nº [NÚMERO]: o valor original é de R$ {{valor_original}}, com juros de R$ {{juros}} e multa de R$ {{multa}} acumulados até hoje.\n\nPara facilitar a regularização, propomos um abono de R$ {{juros_abonado}} dos juros e R$ {{multa_abonada}} da multa. Com isso, o valor para quitação fica em R$ {{valor_final}}, válido para pagamento até {{validade_abono}}.\n\nSe preferir, reenviamos o boleto atualizado. Qualquer dúvida, estamos à disposição.\n\nEquipe Retífica Formiguense.`,
  },
]

// ── Variáveis de template ─────────────────────────────────────────────────
// O template é apoio, não imposição: "Gerar texto" resolve as variáveis num
// campo livremente editável — o texto final salvo é o editado pela operação.

export interface ContextoTemplate {
  nome?: string
  numero?: string
  data?: string            // vencimento (YYYY-MM-DD)
  valorOriginal?: number
  juros?: number
  multa?: number
  jurosAbonado?: number
  multaAbonada?: number
  valorFinal?: number
  dataPromessa?: string    // YYYY-MM-DD
}

const moedaSemSimbolo = (v?: number) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function resolverTemplate(corpo: string, ctx: ContextoTemplate): string {
  const data = (iso?: string) => (iso ? formatarData(iso) : '—')
  const pares: [string, string][] = [
    ['[NOME]', ctx.nome ?? '—'],
    ['[NÚMERO]', ctx.numero ?? '—'],
    ['[VALOR]', moedaSemSimbolo(ctx.valorOriginal)],
    ['[DATA]', data(ctx.data)],
    ['{{valor_original}}', moedaSemSimbolo(ctx.valorOriginal)],
    ['{{juros}}', moedaSemSimbolo(ctx.juros)],
    ['{{multa}}', moedaSemSimbolo(ctx.multa)],
    ['{{juros_abonado}}', moedaSemSimbolo(ctx.jurosAbonado)],
    ['{{multa_abonada}}', moedaSemSimbolo(ctx.multaAbonada)],
    ['{{valor_final}}', moedaSemSimbolo(ctx.valorFinal)],
    ['{{data_promessa}}', data(ctx.dataPromessa)],
    // validade do abono = data de promessa de pagamento, quando informada
    ['{{validade_abono}}', data(ctx.dataPromessa)],
  ]
  return pares.reduce((texto, [token, valor]) => texto.split(token).join(valor), corpo)
}

// ── Réguas de cobrança — cadência canônica (Régua de Cobrança RF, §2) ────
// D0 = data de vencimento. Marcos de consequência (D+15+) são avisos ao
// financeiro — NUNCA botões de execução de bloqueio/protesto/negativação.

export const reguas: ReguaCobranca[] = [
  {
    id: 'r01',
    nome: 'Régua Padrão',
    descricao: 'Aplicada a todos os clientes sem histórico de inadimplência recorrente.',
    perfil: 'padrao',
    ativa: true,
    etapas: [
      { id: 'e01', ancora: 'D-2',  tipo: 'automatica', label: 'Lembrete preventivo',         templateId: 't01', ativo: true, descricao: '2 dias antes do vencimento — WhatsApp com boleto' },
      { id: 'e02', ancora: 'D0',   tipo: 'automatica', label: 'Vence hoje',                  templateId: 't02', ativo: true, descricao: 'Dia do vencimento — lembrete cordial, não é atraso' },
      { id: 'e03', ancora: 'D+1',  tipo: 'automatica', label: 'Título em aberto',            templateId: 't03', ativo: true, descricao: '1 dia vencido — aviso simples, tom cordial' },
      { id: 'e04', ancora: 'D+3',  tipo: 'automatica', label: 'Pedido de previsão',          templateId: 't04', ativo: true, descricao: '3 dias vencidos — solicitar data de pagamento' },
      { id: 'e05', ancora: 'D+7',  tipo: 'automatica', label: 'Negociação ativa',            templateId: 't05', ativo: true, descricao: '7 dias — ligação ativa + WhatsApp, negociar data' },
      { id: 'e06', ancora: 'D+15', tipo: 'handoff',    label: 'Cobrança firme',              templateId: 't06', ativo: true, descricao: 'Atraso médio — Ação manual: avaliar bloqueio de vendas a prazo' },
      { id: 'e07', ancora: 'D+30', tipo: 'handoff',    label: 'Aviso formal',                templateId: 't07', ativo: true, descricao: 'Atraso relevante — Ação manual: aprovação para medidas de restrição' },
      { id: 'e08', ancora: 'D+45', tipo: 'handoff',    label: 'Escalamento — Diretoria',     templateId: 't08', ativo: true, descricao: 'Atraso crítico — Ação manual: diretoria, proposta final' },
      { id: 'e09', ancora: 'D+60', tipo: 'handoff',    label: 'Encaminhamento externo',      templateId: 't09', ativo: true, descricao: 'Crítico — Ação manual: protesto / negativação / jurídico (totalmente externo)' },
      { id: 'e10', ancora: 'D+90', tipo: 'handoff',    label: 'Carteira especial',           templateId: 't10', ativo: true, descricao: 'Perda provável — Decisão gerencial, plano de recuperação' },
    ],
  },
  {
    id: 'r02',
    nome: 'Régua Reincidente',
    descricao: 'Clientes com 2+ ocorrências de atraso nos últimos 12 meses — abordagem mais próxima.',
    perfil: 'reincidente',
    ativa: true,
    etapas: [
      { id: 'e11', ancora: 'D-7',  tipo: 'automatica', label: 'Lembrete antecipado',         templateId: 't01', ativo: true, descricao: '7 dias antes do vencimento' },
      { id: 'e12', ancora: 'D-2',  tipo: 'automatica', label: 'Segundo lembrete preventivo', templateId: 't01', ativo: true, descricao: '2 dias antes do vencimento' },
      { id: 'e13', ancora: 'D0',   tipo: 'automatica', label: 'Vence hoje',                  templateId: 't02', ativo: true, descricao: 'Dia do vencimento' },
      { id: 'e14', ancora: 'D+1',  tipo: 'automatica', label: 'Título em aberto',            templateId: 't03', ativo: true, descricao: '1 dia vencido' },
      { id: 'e15', ancora: 'D+3',  tipo: 'automatica', label: 'Pedido de previsão',          templateId: 't04', ativo: true, descricao: '3 dias — WhatsApp + ligação se valor relevante' },
      { id: 'e16', ancora: 'D+7',  tipo: 'automatica', label: 'Negociação ativa',            templateId: 't05', ativo: true, descricao: '7 dias — ligação + reenvio de boleto' },
      { id: 'e17', ancora: 'D+15', tipo: 'handoff',    label: 'Cobrança firme',              templateId: 't06', ativo: true, descricao: 'Ação manual: avaliar bloqueio e negociação formal' },
    ],
  },
]

// ── Comunicações seed ──────────────────────────────────────────────────
// Mistura automáticas (WhatsApp da régua) + manuais (email/telefone/observação)

export const comunicacoes: Comunicacao[] = [
  // ── Automáticas (origem da régua) ─────────────────────────────────────
  { id: 'cm001', clienteId: 'c03', boletoIds: ['b088'], etapa: 'D+30', canal: 'whatsapp', origem: 'automatica', dataHora: '2026-04-09T09:00:00', status: 'lida',      templateNome: 'Aviso Formal (D+30)',     conteudo: 'Olá, Transportes Minas Gerais Ltda. Como o débito referente ao título nº BLT-2026-01088 permanece em aberto...' },
  { id: 'cm002', clienteId: 'c03', boletoIds: ['b089'], etapa: 'D+15', canal: 'whatsapp', origem: 'automatica', dataHora: '2026-03-01T09:00:00', status: 'entregue',  templateNome: 'Cobrança Firme (D+15)',   conteudo: 'Olá, Transportes Minas Gerais Ltda. O débito referente ao título nº BLT-2026-01089 precisa ser regularizado...' },
  { id: 'cm003', clienteId: 'c08', boletoIds: ['b090'], etapa: 'D+7',  canal: 'whatsapp', origem: 'automatica', dataHora: '2026-03-12T09:15:00', status: 'lida',      templateNome: 'Negociação Ativa (D+7)',  conteudo: 'Olá, Mecânica Precisa Ltda. Verificamos que o título nº BLT-2026-01090 ainda consta em aberto...' },
  { id: 'cm004', clienteId: 'c08', boletoIds: ['b091'], etapa: 'D+15', canal: 'whatsapp', origem: 'automatica', dataHora: '2026-03-07T09:00:00', status: 'respondida', templateNome: 'Cobrança Firme (D+15)',  conteudo: 'Olá, Mecânica Precisa Ltda. O débito referente ao título nº BLT-2026-01091 precisa ser regularizado...' },
  { id: 'cm005', clienteId: 'c11', boletoIds: ['b092'], etapa: 'D+7',  canal: 'whatsapp', origem: 'automatica', dataHora: '2026-03-08T09:30:00', status: 'lida',      templateNome: 'Negociação Ativa (D+7)',  conteudo: 'Olá, Transportadora Boa Viagem. Verificamos que o título nº BLT-2026-01092 ainda consta em aberto...' },
  { id: 'cm006', clienteId: 'c11', boletoIds: ['b093'], etapa: 'D+30', canal: 'whatsapp', origem: 'automatica', dataHora: '2026-03-12T10:00:00', status: 'enviada',   templateNome: 'Aviso Formal (D+30)',     conteudo: 'Olá, Transportadora Boa Viagem. Como o débito referente ao título nº BLT-2026-01093 permanece em aberto...' },
  { id: 'cm007', clienteId: 'c02', boletoIds: ['b066'], etapa: 'D+1',  canal: 'whatsapp', origem: 'automatica', dataHora: '2026-05-29T09:00:00', status: 'entregue',  templateNome: 'Título em Aberto (D+1)',  conteudo: 'Olá! Identificamos que o título nº BLT-2026-01066, com vencimento em 28/05/2026, ainda consta em aberto...' },
  { id: 'cm008', clienteId: 'c02', boletoIds: ['b077'], etapa: 'D+3',  canal: 'whatsapp', origem: 'automatica', dataHora: '2026-06-05T09:00:00', status: 'agendada',  templateNome: 'Pedido de Previsão (D+3)', conteudo: 'Olá, Mecânica do Zé Augusto. O título nº BLT-2026-01077 segue em aberto...' },
  { id: 'cm009', clienteId: 'c04', boletoIds: ['b061'], etapa: 'D0',   canal: 'whatsapp', origem: 'automatica', dataHora: '2026-06-04T08:00:00', status: 'entregue',  templateNome: 'Vence Hoje (D0)',         conteudo: 'Olá! O título nº BLT-2026-01061 vence hoje...' },
  { id: 'cm010', clienteId: 'c07', boletoIds: ['b062'], etapa: 'D0',   canal: 'whatsapp', origem: 'automatica', dataHora: '2026-06-04T08:05:00', status: 'enviada',   templateNome: 'Vence Hoje (D0)',         conteudo: 'Olá! O título nº BLT-2026-01062 vence hoje...' },
  // ── Manuais (registradas pelo financeiro/comercial) ────────────────────
  { id: 'cm011', clienteId: 'c03', boletoIds: ['b088', 'b089'], etapa: 'D+45', canal: 'telefone', origem: 'manual',     dataHora: '2026-04-20T10:30:00', status: 'encerrada', criadoPor: 'financeiro@retifica.com', conteudo: 'Liguei para Transportes Minas Gerais. Falei com João Silva (financeiro). Alega dificuldades de caixa e prometeu pagamento até 30/04/2026.', promessaPagamento: { data: '2026-04-30', situacao: 'quebrada' }, proximaAcao: 'Ligar novamente em 01/05 — promessa não cumprida.' },
  { id: 'cm012', clienteId: 'c03', boletoIds: ['b088', 'b089'], etapa: 'D+60', canal: 'email',    origem: 'manual',     dataHora: '2026-05-10T14:00:00', status: 'aguardando_retorno', criadoPor: 'financeiro@retifica.com', conteudo: 'Enviei e-mail formal para diretoria da Transportes MG solicitando regularização ou proposta de negociação. Sem retorno até o momento.', proximaAcao: 'Aguardar resposta até 15/05. Sem retorno, encaminhar para medidas externas.' },
  { id: 'cm013', clienteId: 'c08', boletoIds: ['b090'], etapa: 'D+15', canal: 'telefone', origem: 'manual',     dataHora: '2026-03-20T11:00:00', status: 'encerrada', criadoPor: 'financeiro@retifica.com', conteudo: 'Contato com proprietário da Mecânica Precisa. Solicitou parcelamento em 3x. Proposta enviada por e-mail para aprovação interna.', promessaPagamento: { data: '2026-04-05', situacao: 'pendente' }, proximaAcao: 'Aguardar confirmação da proposta de parcelamento.' },
  { id: 'cm014', clienteId: 'c11', boletoIds: ['b092', 'b093', 'b094'], etapa: 'D+45', canal: 'telefone', origem: 'manual',     dataHora: '2026-03-01T09:00:00', status: 'encerrada', criadoPor: 'financeiro@retifica.com', conteudo: 'Ligação não atendida. Deixei recado via WhatsApp solicitando retorno urgente — débito acumulado de R$ 31.200,00.', proximaAcao: 'Tentar contato novamente amanhã.' },
  { id: 'cm015', clienteId: 'c14', boletoIds: ['b095'], etapa: 'D+7',  canal: 'email',    origem: 'manual',     dataHora: '2026-03-22T09:00:00', status: 'aguardando_retorno', criadoPor: 'comercial@retifica.com', conteudo: 'Enviei e-mail de acompanhamento para Frotas Rápido Sul. Responsável pelo financeiro está em viagem — retorno previsto para semana que vem.', proximaAcao: 'Retomar contato em 29/03.' },
  { id: 'cm016', clienteId: 'c02', boletoIds: ['b066', 'b077'], etapa: 'D+7',  canal: 'observacao', origem: 'manual',   dataHora: '2026-06-04T16:00:00', status: 'registrada', criadoPor: 'financeiro@retifica.com', conteudo: 'Cliente visitou a oficina hoje e informou que vai realizar o pagamento na sexta-feira (07/06). Não quis receber nova notificação.', promessaPagamento: { data: '2026-06-07', situacao: 'pendente' }, proximaAcao: 'Verificar pagamento no dia 07/06.' },
  // comunicação com abono vinculado — snapshot imutável dos valores comunicados
  { id: 'cm017', clienteId: 'c03', boletoIds: ['b088'], etapa: 'D+86', canal: 'telefone', origem: 'manual', dataHora: '2026-06-03T10:05:00', status: 'aguardando_retorno', criadoPor: 'financeiro@retifica.com', conteudo: 'Liguei para o financeiro da Transportes Minas Gerais e propus a quitação do título BLT-2026-01088 com abono integral dos juros (R$ 344,00): valor final de R$ 12.240,00, válido para pagamento até 15/06/2026. Ficaram de confirmar até sexta.', promessaPagamento: { data: '2026-06-15', situacao: 'pendente' }, proximaAcao: 'Cobrar resposta na sexta (12/06).', abonoId: 'ab02', abonoSnapshot: { abonoId: 'ab02', estado: 'ativo', valorPrincipal: 12_000, jurosCalculado: 344, multaCalculada: 240, jurosAbonado: 344, multaAbonada: 0, valorFinal: 12_240, dataPromessaPagamento: '2026-06-15' } },
]

// ── Corte de inadimplência ────────────────────────────────────────────────
// Régua de Cobrança (confirmado com a RF, jun/2026): título vencido há MAIS
// DE 15 dias = inadimplente; entre 1 e 15 dias é apenas "em atraso". O corte
// vive aqui, num lugar só, e vale para TODO o app. Todas as telas derivam o
// status com statusEfetivo/situacaoEfetiva; o campo `status` estático do mock
// nunca é exibido diretamente para boletos vencidos.

export const CORTE_INADIMPLENCIA_DIAS = 15

export function statusEfetivo(b: Boleto): StatusBoleto {
  if (b.status === 'atrasado' || b.status === 'inadimplente') {
    return (b.diasAtraso ?? 0) > CORTE_INADIMPLENCIA_DIAS ? 'inadimplente' : 'atrasado'
  }
  return b.status
}

export function situacaoEfetiva(c: Cliente): SituacaoCliente {
  const efetivos = boletos.filter(b => b.clienteId === c.id).map(statusEfetivo)
  if (efetivos.includes('inadimplente')) return 'inadimplente'
  if (efetivos.includes('atrasado')) return 'atrasado'
  return 'adimplente'
}

// ── Empresa recebedora ────────────────────────────────────────────────────
// Dado de origem Certtus (read-only): cada cliente fatura contra uma das PJs
// do grupo. Distribuição desigual e realista — Diesel concentra a maior parte.

const EMPRESA_POR_CLIENTE: Record<string, EmpresaId> = {
  // Favarini (10 clientes)
  c05: 'favarini', c09: 'favarini', c13: 'favarini', c14: 'favarini', c16: 'favarini',
  c22: 'favarini', c23: 'favarini', c29: 'favarini', c31: 'favarini', c34: 'favarini',
  // Refordiesel (6 clientes)
  c17: 'refor', c20: 'refor', c25: 'refor', c26: 'refor', c36: 'refor', c40: 'refor',
  // demais (24) → 'rf' (Diesel), via fallback de getEmpresaDoCliente
}

export function getEmpresaDoCliente(clienteId: string): EmpresaId {
  return EMPRESA_POR_CLIENTE[clienteId] ?? 'rf'
}

export function getEmpresaDoBoleto(b: Boleto): EmpresaId {
  return getEmpresaDoCliente(b.clienteId)
}

export function getEmpresa(id: EmpresaId): Empresa {
  return empresas.find((e) => e.id === id)!
}

export function clientesDaEmpresa(filtro: EmpresaFiltro): Cliente[] {
  return filtro === 'grupo' ? clientes : clientes.filter((c) => getEmpresaDoCliente(c.id) === filtro)
}

export function boletosDaEmpresa(filtro: EmpresaFiltro): Boleto[] {
  return filtro === 'grupo' ? boletos : boletos.filter((b) => getEmpresaDoBoleto(b) === filtro)
}

// ── Data-base do protótipo ────────────────────────────────────────────────
// "Hoje" congelado dos dados mockados — os boletos com status 'hoje' vencem
// nesta data. Toda conta de dias/encargos usa esta âncora, não o relógio.

export const DATA_BASE = '2026-06-04'

function isoLocal(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dia}`
}

export function addDias(iso: string, dias: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + dias)
  return isoLocal(d)
}

export function diasEntre(deIso: string, ateIso: string): number {
  const de = new Date(deIso + 'T00:00:00').getTime()
  const ate = new Date(ateIso + 'T00:00:00').getTime()
  return Math.round((ate - de) / 86_400_000)
}

// ── Funções auxiliares ────────────────────────────────────────────────────

// "D-2" → -2 · "D0" → 0 · "D+15" → 15 — posição numérica de um marco da régua
export function ancoraParaDias(ancora: string): number {
  return Number(ancora.replace('D', '').replace('+', ''))
}

// Posição na régua de severidade — usada para ordenar colunas de status
export const ORDEM_SEVERIDADE: Record<StatusBoleto | SituacaoCliente, number> = {
  pago: 0,
  pago_atraso: 1,
  adimplente: 0,
  avencer: 2,
  hoje: 3,
  atrasado: 4,
  inadimplente: 5,
}

export function getClienteById(id: string): Cliente | undefined {
  return clientes.find(c => c.id === id)
}

export function getBoletosDoCliente(clienteId: string): Boleto[] {
  return boletos.filter(b => b.clienteId === clienteId)
}

// ── Protesto e negativação ────────────────────────────────────────────────
// O protesto do título é feito na Certtus, externamente (pela equipe). O
// Cobrança RF apenas LÊ esse estado (b.emProtesto, read-only). Um cliente é
// considerado negativado quando tem ao menos um título EM ABERTO em protesto —
// não há ação manual de negativação na plataforma.

export function tituloEmProtesto(b: Boleto): boolean {
  return !!b.emProtesto && b.status !== 'pago' && b.status !== 'pago_atraso'
}

export function getTitulosEmProtesto(clienteId: string): Boleto[] {
  return getBoletosDoCliente(clienteId).filter(tituloEmProtesto)
}

export function clienteEmProtesto(clienteId: string): boolean {
  return getTitulosEmProtesto(clienteId).length > 0
}

export function getNotificacoesDoCliente(clienteId: string): NotificacaoHistorico[] {
  return notificacoes.filter(n => n.clienteId === clienteId)
}

export function getComunicacoesDoCliente(clienteId: string): Comunicacao[] {
  return comunicacoes.filter(c => c.clienteId === clienteId)
}

export function getBoletoById(id: string): Boleto | undefined {
  return boletos.find(b => b.id === id)
}

// ── Régua aplicada por cliente ───────────────────────────────────────────
// Reincidente = 2+ ocorrências de atraso nos últimos 12 meses (critério da
// própria régua r02). Os demais seguem a Régua Padrão.

const REGUA_POR_CLIENTE: Record<string, string> = {
  c02: 'r02', c08: 'r02', c11: 'r02', c14: 'r02',
  c22: 'r02', c25: 'r02', c36: 'r02', c39: 'r02',
}

export function getReguaDoCliente(clienteId: string): ReguaCobranca {
  const id = REGUA_POR_CLIENTE[clienteId] ?? 'r01'
  return reguas.find(r => r.id === id) ?? reguas[0]
}

// histórico de comunicações vinculadas a um título específico
export function getComunicacoesDoBoleto(boletoId: string): Comunicacao[] {
  return comunicacoes.filter(c => c.boletoIds?.includes(boletoId))
}

// comunicações que referenciaram um abono — parte da trilha de auditoria
export function getComunicacoesDoAbono(abonoId: string): Comunicacao[] {
  return comunicacoes.filter(c => c.abonoId === abonoId)
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatarData(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// KPIs do dashboard — todos derivados do corte efetivo, nunca do rótulo
// estático do mock (uma régua só em todas as telas). Recebem o filtro global
// de empresa: 'grupo' consolida, uma EmpresaId restringe à PJ.
export function computarKpis(empresa: EmpresaFiltro = 'grupo') {
  const bs = boletosDaEmpresa(empresa)
  const cs = clientesDaEmpresa(empresa)
  const vencidos = bs.filter(b => b.status === 'atrasado' || b.status === 'inadimplente')
  const inadimplentes = cs.filter(c => situacaoEfetiva(c) === 'inadimplente')

  // base monetária das taxas: tudo que a RF tem a receber (carteira em aberto)
  const totalAReceber = bs
    .filter(b => b.status !== 'pago' && b.status !== 'pago_atraso')
    .reduce((s, b) => s + b.valor, 0)

  // vencido há mais de 15 dias (inadimplente) ⊆ qualquer vencido (em atraso)
  const valorInadimplente = vencidos
    .filter(b => statusEfetivo(b) === 'inadimplente')
    .reduce((s, b) => s + b.valor, 0)
  const valorEmAtraso = vencidos.reduce((s, b) => s + b.valor, 0)

  return {
    totalEmAberto: totalAReceber,
    totalAReceber,

    boletosEmAberto: bs.filter(b => b.status !== 'pago' && b.status !== 'pago_atraso').length,

    // ── taxas monetárias (R$) — north star do painel ──
    valorInadimplente,
    valorEmAtraso,
    // (1) inadimplência: vencido > 15d sobre o total a receber
    pctInadimplenciaValor: totalAReceber === 0 ? 0 : arred1((valorInadimplente / totalAReceber) * 100),
    // (2) em atraso: qualquer vencido (≥ 1 dia) sobre o total a receber
    pctAtrasoValor: totalAReceber === 0 ? 0 : arred1((valorEmAtraso / totalAReceber) * 100),

    totalInadimplente: valorInadimplente,

    clientesInadimplentes: inadimplentes.length,

    totalClientes: cs.length,

    pctInadimplencia: cs.length === 0 ? 0 : Math.round((inadimplentes.length / cs.length) * 100),

    diasMediosAtraso: Math.round(
      vencidos.reduce((s, b, _, arr) => s + (b.diasAtraso ?? 0) / arr.length, 0)
    ),

    // Aging: soma dos valores em aberto por faixa de dias de atraso —
    // faixas alinhadas aos marcos da régua padrão (D+5/D+15/D+30/D+60/D+90)
    aging: {
      avencer:  bs.filter(b => b.status === 'avencer' || b.status === 'hoje').reduce((s,b) => s+b.valor,0),
      ate5:     vencidos.filter(b => (b.diasAtraso??0) <= 5).reduce((s,b) => s+b.valor,0),
      de6a15:   vencidos.filter(b => (b.diasAtraso??0) > 5 && (b.diasAtraso??0) <= 15).reduce((s,b) => s+b.valor,0),
      de16a30:  vencidos.filter(b => (b.diasAtraso??0) > 15 && (b.diasAtraso??0) <= 30).reduce((s,b) => s+b.valor,0),
      de31a60:  vencidos.filter(b => (b.diasAtraso??0) > 30 && (b.diasAtraso??0) <= 60).reduce((s,b) => s+b.valor,0),
      de61a90:  vencidos.filter(b => (b.diasAtraso??0) > 60 && (b.diasAtraso??0) <= 90).reduce((s,b) => s+b.valor,0),
      acima90:  vencidos.filter(b => (b.diasAtraso??0) > 90).reduce((s,b) => s+b.valor,0),
    },

    topInadimplentes: inadimplentes
      .sort((a, b) => b.saldoAberto - a.saldoAberto)
      .slice(0, 5),
  }
}

export const kpis = computarKpis('grupo')

// ── Evolução da inadimplência por faixa de aging ─────────────────────────
// Série mensal (12 meses) do valor inadimplente por faixa de envelhecimento.
// Os 11 meses históricos são mockados por empresa; o mês corrente é derivado
// dos boletos — consistente com a tela de cobranças. Faixas mais antigas
// crescendo = carteira envelhecendo (menor probabilidade de recuperação).

// Faixas alinhadas aos MARCOS DA RÉGUA PADRÃO (D+1 · D+5 · D+15 · D+30 ·
// D+60 · D+90): cada faixa é o intervalo entre dois marcos consecutivos.
export const FAIXAS_AGING = [
  'Atraso operacional · 1–5 dias',
  'Alerta de risco · 6–15 dias',
  'Inadimplência geral · 16–30 dias',
  'Inadimplência crítica · 31–60 dias',
  'Pré-jurídico · 61–90 dias',
  'Perda provável · +90 dias',
] as const

// dias de atraso [min, max|null] por índice de faixa — null = sem limite superior
export const FAIXAS_AGING_DIAS: [number, number | null][] = [
  [1, 5],
  [6, 15],
  [16, 30],
  [31, 60],
  [61, 90],
  [91, null],
]

export type FaixasAging = [number, number, number, number, number, number]

export interface EvolucaoMes {
  mes: string          // YYYY-MM
  faixas: FaixasAging  // 1–5 · 6–15 · 16–30 · 31–60 · 61–90 · +90
  recuperado: number   // valor inadimplente recuperado no mês
}

const MESES_HIST = [
  '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12',
  '2026-01', '2026-02', '2026-03', '2026-04', '2026-05',
]

// valores por mês × faixa (1–5 · 6–15 · 16–30 · 30+) — a tendência conta a
// história: RF com a faixa 30+ crescendo desde fev/2026; Refor recuperando
// cedo (sem faixas velhas). A faixa 30+ é desdobrada em 31–60/61–90/+90 na
// leitura (SPLIT_30_MAIS).
const HIST_INADIMPLENCIA: Record<EmpresaId, [number, number, number, number][]> = {
  rf: [
    [58_000, 24_000, 14_000, 18_000],
    [52_000, 27_000, 16_000, 17_000],
    [61_000, 22_000, 18_000, 19_000],
    [55_000, 29_000, 15_000, 22_000],
    [60_000, 25_000, 19_000, 24_000],
    [48_000, 31_000, 22_000, 27_000],
    [64_000, 28_000, 24_000, 32_000],
    [59_000, 33_000, 27_000, 41_000],
    [66_000, 30_000, 29_000, 49_000],
    [62_000, 35_000, 31_000, 58_000],
    [68_000, 32_000, 33_000, 65_000],
  ],
  favarini: [
    [9_000, 4_000, 2_000, 1_500],
    [8_000, 5_000, 2_500, 2_000],
    [10_000, 3_500, 3_000, 2_000],
    [9_500, 6_000, 3_500, 2_500],
    [8_500, 5_500, 4_000, 3_000],
    [7_000, 7_000, 5_000, 3_500],
    [11_000, 6_500, 6_000, 4_000],
    [9_000, 8_000, 8_500, 4_500],
    [10_500, 7_500, 12_000, 5_000],
    [9_800, 6_000, 15_000, 5_500],
    [8_900, 5_000, 17_000, 6_200],
  ],
  refor: [
    [4_500, 2_000, 1_000, 0],
    [5_000, 2_500, 800, 0],
    [4_000, 3_000, 500, 800],
    [5_500, 3_500, 1_200, 0],
    [4_800, 4_000, 900, 0],
    [3_500, 5_000, 1_500, 600],
    [6_000, 6_500, 800, 0],
    [5_200, 8_000, 1_100, 0],
    [4_600, 10_000, 700, 0],
    [5_100, 12_000, 400, 0],
    [4_200, 13_500, 0, 0],
  ],
}

// valor inadimplente recuperado por mês (12 meses, jul/25 → jun/26) — mês
// corrente parcial. Comparado às faixas, mostra se a recuperação acompanha
// o estoque de inadimplência.
const HIST_RECUPERADO: Record<EmpresaId, number[]> = {
  rf:       [12_000, 9_500, 14_000, 11_000, 13_500, 9_000, 15_000, 12_500, 17_000, 14_500, 18_500, 6_800],
  favarini: [2_500, 3_000, 2_000, 3_500, 2_800, 4_000, 3_200, 4_500, 3_800, 5_000, 4_200, 1_500],
  refor:    [1_200, 1_500, 2_000, 1_000, 1_800, 2_200, 1_500, 2_500, 3_000, 2_000, 3_500, 900],
}

// o histórico é armazenado em 4 colunas (1–5 · 6–15 · 16–30 · 30+); a última é
// desdobrada nas faixas dos marcos D+30/D+60/D+90 por proporção fixa
const SPLIT_30_MAIS = [0.5, 0.3, 0.2] as const // 31–60 · 61–90 · +90

export function getEvolucaoInadimplencia(empresa: EmpresaFiltro = 'grupo'): EvolucaoMes[] {
  const ids: EmpresaId[] = empresa === 'grupo' ? empresas.map(e => e.id) : [empresa]
  const recuperadoDoMes = (i: number) => ids.reduce((s, id) => s + HIST_RECUPERADO[id][i], 0)

  const historico: EvolucaoMes[] = MESES_HIST.map((mes, i) => {
    const faixas: FaixasAging = [0, 0, 0, 0, 0, 0]
    for (const id of ids) {
      const f = HIST_INADIMPLENCIA[id][i]
      faixas[0] += f[0]; faixas[1] += f[1]; faixas[2] += f[2]
      faixas[3] += Math.round(f[3] * SPLIT_30_MAIS[0])
      faixas[4] += Math.round(f[3] * SPLIT_30_MAIS[1])
      faixas[5] += Math.round(f[3] * SPLIT_30_MAIS[2])
    }
    return { mes, faixas, recuperado: recuperadoDoMes(i) }
  })

  // mês corrente — derivado dos boletos vencidos (mesma fonte das demais telas)
  const atual: FaixasAging = [0, 0, 0, 0, 0, 0]
  for (const b of boletosDaEmpresa(empresa)) {
    if (b.status !== 'atrasado' && b.status !== 'inadimplente') continue
    const d = b.diasAtraso ?? 0
    const idx = d <= 5 ? 0 : d <= 15 ? 1 : d <= 30 ? 2 : d <= 60 ? 3 : d <= 90 ? 4 : 5
    atual[idx] += b.valor
  }
  return [
    ...historico,
    { mes: DATA_BASE.slice(0, 7), faixas: atual, recuperado: recuperadoDoMes(MESES_HIST.length) },
  ]
}

// ── Previsto × recebido ───────────────────────────────────────────────────
// Comparativo mensal: valor faturado com vencimento no mês (previsto) vs.
// efetivamente recebido. A realização caindo conta a mesma história do
// envelhecimento da carteira.

export interface PrevistoRecebidoMes {
  mes: string       // YYYY-MM
  previsto: number
  recebido: number
  /** mês à frente da data-base — previsão de faturamento, sem recebimentos */
  futuro?: boolean
}

const HIST_PREVISTO_RECEBIDO: Record<EmpresaId, [number, number][]> = {
  rf: [
    [118_000, 109_000], [124_000, 112_000], [131_000, 121_000], [127_000, 114_000],
    [138_000, 123_000], [145_000, 126_000], [122_000, 107_000], [129_000, 111_000],
    [136_000, 115_000], [141_000, 118_000], [133_000, 110_000], [126_000, 104_000],
  ],
  favarini: [
    [34_000, 32_000], [36_000, 33_500], [39_000, 35_500], [37_000, 33_000],
    [41_000, 36_500], [43_000, 38_000], [36_000, 31_500], [38_000, 33_000],
    [40_000, 34_000], [42_000, 35_500], [39_000, 32_500], [37_000, 30_500],
  ],
  refor: [
    [16_000, 15_200], [17_000, 16_000], [18_500, 17_300], [17_500, 16_200],
    [19_000, 17_500], [20_000, 18_200], [17_000, 15_300], [18_000, 16_100],
    [19_500, 17_200], [20_500, 17_900], [18_500, 16_000], [17_500, 15_000],
  ],
}

// meses à frente da data-base — previsto = faturamento projetado com
// vencimento no mês (carteira emitida + recorrência); sem recebimentos ainda
export const MESES_FUTUROS = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12']

const PREVISTO_FUTURO: Record<EmpresaId, number[]> = {
  rf:       [128_000, 134_000, 140_000, 137_000, 131_000, 125_000],
  favarini: [38_000, 40_000, 41_500, 39_500, 38_500, 36_500],
  refor:    [18_000, 19_000, 19_500, 18_500, 18_000, 17_500],
}

export function getPrevistoRecebido(
  empresa: EmpresaFiltro = 'grupo',
  opts: { incluirFuturo?: boolean } = {},
): PrevistoRecebidoMes[] {
  const ids: EmpresaId[] = empresa === 'grupo' ? empresas.map(e => e.id) : [empresa]
  const meses = [...MESES_HIST, DATA_BASE.slice(0, 7)]
  const serie: PrevistoRecebidoMes[] = meses.map((mes, i) => ({
    mes,
    previsto: ids.reduce((s, id) => s + HIST_PREVISTO_RECEBIDO[id][i][0], 0),
    recebido: ids.reduce((s, id) => s + HIST_PREVISTO_RECEBIDO[id][i][1], 0),
  }))
  if (opts.incluirFuturo) {
    for (let i = 0; i < MESES_FUTUROS.length; i++) {
      serie.push({
        mes: MESES_FUTUROS[i],
        previsto: ids.reduce((s, id) => s + PREVISTO_FUTURO[id][i], 0),
        recebido: 0,
        futuro: true,
      })
    }
  }
  return serie
}

// ── Métricas mensais de cobrança ──────────────────────────────────────────
// Série de 12 meses (jul/25 → jun/26) que alimenta os KPIs "do mês" do painel
// e o gráfico de inadimplência mês a mês. Tudo derivado da mesma fonte das
// demais telas: previsto/recebido vêm de HIST_PREVISTO_RECEBIDO, o estoque
// inadimplente vem de getEvolucaoInadimplencia (faixas > 15 dias). As colunas
// abaixo são os dados que não derivam dessas séries.

// série completa de meses (11 históricos + mês corrente, parcial)
export const MESES_SERIE = [...MESES_HIST, DATA_BASE.slice(0, 7)]
// último mês fechado — referência padrão dos KPIs do mês (jun/26 é parcial)
export const ULTIMO_MES_FECHADO = MESES_HIST[MESES_HIST.length - 1]

const MES_LONGO = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

// "2026-05" → "Maio/2026"
export function rotuloMesLongo(mes: string): string {
  const [ano, m] = mes.split('-')
  return `${MES_LONGO[Number(m) - 1]}/${ano}`
}

// [recebidoNoVencimento, inadimplenteAposCorte, diasMediosAtraso, carteiraFimMes]
// por mês (12), por empresa. recebidoNoVencimento ≤ recebido (subconjunto pago
// até o dia do vencimento). inadimplenteAposCorte = R$ que venciam no mês e
// seguiam sem pagar após o corte de 15 dias. carteiraFimMes = total a receber
// em aberto no último dia do mês (denominador da "foto" de inadimplência).
const HIST_METRICAS_MES: Record<EmpresaId, [number, number, number, number][]> = {
  rf: [
    [87_000, 12_000,  9, 290_000], [90_000, 16_000, 10, 300_000],
    [97_000, 13_000,  9, 310_000], [91_000, 17_000, 11, 330_000],
    [98_000, 20_000, 12, 350_000], [101_000, 25_000, 13, 380_000],
    [86_000, 20_000, 11, 400_000], [89_000, 24_000, 13, 430_000],
    [92_000, 28_000, 15, 450_000], [94_000, 30_000, 16, 470_000],
    [88_000, 30_000, 18, 490_000], [83_000, 29_000, 12, 480_000],
  ],
  favarini: [
    [25_500, 3_000,  7, 60_000], [26_500, 3_000,  8, 64_000],
    [28_500, 4_500,  7, 68_000], [26_500, 5_000,  9, 72_000],
    [29_000, 6_000,  8, 80_000], [30_500, 6_500, 10, 90_000],
    [25_000, 6_000,  9, 95_000], [26_500, 6_500, 11, 110_000],
    [27_000, 8_000, 12, 130_000], [28_500, 8_500, 13, 150_000],
    [26_000, 8_500, 14, 170_000], [24_500, 8_500, 10, 165_000],
  ],
  refor: [
    [12_500, 1_000, 4, 30_000], [13_000, 1_200, 5, 31_000],
    [14_000, 1_500, 4, 30_000], [13_000, 1_500, 6, 32_000],
    [14_000, 1_800, 5, 31_000], [14_500, 2_200, 6, 33_000],
    [12_000, 2_000, 5, 32_000], [13_000, 2_300, 7, 34_000],
    [13_500, 2_800, 6, 33_000], [14_000, 3_000, 7, 35_000],
    [12_500, 3_000, 8, 34_000], [12_000, 3_000, 5, 33_000],
  ],
}

export interface MetricaMes {
  mes: string                      // YYYY-MM
  previsto: number                 // faturado com vencimento no mês
  recebido: number                 // entrou (em qualquer prazo)
  recebidoNoVencimento: number     // pago até o dia do vencimento
  inadimplenteAposCorte: number    // venceu no mês e seguiu sem pagar após 15d
  diasMediosAtraso: number         // média dos pagos com atraso (em dias)
  inadimplenteFimMes: number       // estoque inadimplente no fim do mês
  carteiraFimMes: number           // total a receber em aberto no fim do mês
  pctRecebidoMes: number           // (6) recebido / previsto
  pctRecebidoNoVencimento: number  // (4) recebido na data correta / previsto
  pctDesempenho: number            // (3b) inadimplente após corte / previsto
  pctFoto: number                  // (3a) inadimplente / carteira no fim do mês
}

// Série mensal consolidada das métricas de cobrança, no filtro de empresa.
export function getMetricasMensais(empresa: EmpresaFiltro = 'grupo'): MetricaMes[] {
  const ids: EmpresaId[] = empresa === 'grupo' ? empresas.map(e => e.id) : [empresa]
  const pr = getPrevistoRecebido(empresa)         // mesmo filtro, 12 meses
  const evo = getEvolucaoInadimplencia(empresa)   // mesmo filtro, 12 meses

  return MESES_SERIE.map((mes, i) => {
    const { previsto, recebido } = pr[i]
    const recebidoNoVencimento = ids.reduce((s, id) => s + HIST_METRICAS_MES[id][i][0], 0)
    const inadimplenteAposCorte = ids.reduce((s, id) => s + HIST_METRICAS_MES[id][i][1], 0)
    const carteiraFimMes = ids.reduce((s, id) => s + HIST_METRICAS_MES[id][i][3], 0)
    // inadimplente = faixas > 15 dias (16–30 em diante) — coerente com o corte
    const inadimplenteFimMes = evo[i].faixas.slice(2).reduce((s, v) => s + v, 0)
    // dias médios do grupo: média ponderada pelo recebido de cada empresa
    const diasNum = ids.reduce((s, id) => s + HIST_METRICAS_MES[id][i][2] * HIST_PREVISTO_RECEBIDO[id][i][1], 0)
    const diasDen = ids.reduce((s, id) => s + HIST_PREVISTO_RECEBIDO[id][i][1], 0)

    return {
      mes,
      previsto,
      recebido,
      recebidoNoVencimento,
      inadimplenteAposCorte,
      diasMediosAtraso: diasDen === 0 ? 0 : Math.round(diasNum / diasDen),
      inadimplenteFimMes,
      carteiraFimMes,
      pctRecebidoMes: previsto === 0 ? 0 : arred1((recebido / previsto) * 100),
      pctRecebidoNoVencimento: previsto === 0 ? 0 : arred1((recebidoNoVencimento / previsto) * 100),
      pctDesempenho: previsto === 0 ? 0 : arred1((inadimplenteAposCorte / previsto) * 100),
      pctFoto: carteiraFimMes === 0 ? 0 : arred1((inadimplenteFimMes / carteiraFimMes) * 100),
    }
  })
}

export function getMetricaMes(empresa: EmpresaFiltro, mes: string): MetricaMes | undefined {
  return getMetricasMensais(empresa).find(m => m.mes === mes)
}

// percentual no padrão pt-BR (vírgula), 1 casa, sem zero à direita
export function formatarPct(v: number, casas = 1): string {
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: casas })}%`
}

export interface TaxasCarteiraSerie {
  inadimplencia: number[]  // 12 meses; termina no valor de hoje
  atraso: number[]
  carteira: number[]       // total a receber no fim do mês (R$) — tendência
}

// Série de tendência das taxas da carteira para o card principal. Reescala a
// evolução mensal real (pctFoto) para terminar no valor de HOJE — dá uma curva
// coerente sem inventar uma série nova, e respeita o filtro de empresa.
export function getTaxasCarteiraSerie(empresa: EmpresaFiltro = 'grupo'): TaxasCarteiraSerie {
  const serie = getMetricasMensais(empresa)
  const foto = serie.map(m => m.pctFoto)
  const ultimaFoto = foto[foto.length - 1] || 1
  const k = computarKpis(empresa)
  const escala = (alvo: number) => foto.map(v => arred1((v / ultimaFoto) * alvo))
  return {
    inadimplencia: escala(k.pctInadimplenciaValor),
    atraso: escala(k.pctAtrasoValor),
    carteira: serie.map(m => m.carteiraFimMes),
  }
}

export interface NegociacaoKpi {
  count: number    // títulos com promessa de pagamento ativa
  abertos: number  // total de títulos em aberto (denominador da taxa)
  valor: number    // R$ sob promessa ativa
  pct: number      // count / abertos × 100 — taxa por nº de títulos
  serie: number[]  // tendência p/ a sparkline
}

// Taxa em negociação — fatia da carteira em aberto sob promessa de pagamento
// ativa (negociação 'aberta'). Deriva dos retornos manuais semeados, resolvendo
// cada boletoId e respeitando o filtro de empresa. A série reescala a curva
// mensal real (pctFoto) para terminar na taxa de hoje — curva coerente sem
// inventar dado novo, igual a getTaxasCarteiraSerie.
export function getNegociacaoKpi(empresa: EmpresaFiltro = 'grupo'): NegociacaoKpi {
  const ativos = RETORNOS_SEED
    .filter(r => (r.situacao ?? 'retornada') === 'aberta')
    .map(r => getBoletoById(r.boletoId))
    .filter((b): b is Boleto => !!b && (empresa === 'grupo' || getEmpresaDoBoleto(b) === empresa))

  const count = ativos.length
  const valor = ativos.reduce((s, b) => s + b.valor, 0)
  const abertos = computarKpis(empresa).boletosEmAberto
  const pct = abertos === 0 ? 0 : arred1((count / abertos) * 100)

  const foto = getMetricasMensais(empresa).map(m => m.pctFoto)
  const ultimaFoto = foto[foto.length - 1] || 1
  const serie = foto.map(v => arred1((v / ultimaFoto) * pct))

  return { count, abertos, valor, pct, serie }
}

// ── Forma de pagamento ────────────────────────────────────────────────────
// Dado de origem Certtus (read-only). Atribuição determinística pelo nº do
// título — o mesmo título tem sempre a mesma forma em todas as telas.

export type FormaPagamento = 'boleto' | 'cartao' | 'duplicata' | 'protesto' | 'pix' | 'dinheiro'

export const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  boleto: 'Boleto',
  cartao: 'Cartão',
  duplicata: 'Duplicata',
  protesto: 'Protesto',
  pix: 'PIX',
  dinheiro: 'Dinheiro',
}

// sequência ponderada — boleto domina, como na operação real
const SEQ_FORMA: FormaPagamento[] = [
  'boleto', 'pix', 'boleto', 'duplicata', 'cartao', 'boleto', 'pix', 'boleto', 'dinheiro', 'duplicata',
  'boleto', 'cartao', 'boleto', 'pix', 'boleto', 'duplicata', 'boleto', 'pix', 'boleto', 'dinheiro',
]

export function getFormaPagamento(b: Boleto): FormaPagamento {
  const n = Number(b.id.replace(/\D/g, ''))
  // título em protesto na Certtus aparece como forma "Protesto"
  if (tituloEmProtesto(b)) return 'protesto'
  return SEQ_FORMA[n % SEQ_FORMA.length]
}

// ── Encargos de título vencido ────────────────────────────────────────────
// Multa + juros pro rata die a partir do vencimento, com taxas vindas da
// configuração central (lib/parametros — multa ainda A CONFIRMAR). Estado de
// processo do Cobrança RF — NUNCA altera o valor do título no Certtus.

export const MULTA_PCT = PARAMETROS_ENCARGOS.multa.pct
export const JUROS_MES_PCT = PARAMETROS_ENCARGOS.juros.pct

export interface Encargos {
  diasAtraso: number
  multa: number
  juros: number
  totalAtualizado: number  // valor original + multa + juros (sem abonos)
  dataBase: string         // data-base do cálculo
}

function arred2(v: number): number {
  return Math.round(v * 100) / 100
}

// uma casa decimal — precisão das taxas (%) sem ruído visual no painel
function arred1(v: number): number {
  return Math.round(v * 10) / 10
}

export function calcularEncargos(b: Boleto, dataBase: string = DATA_BASE): Encargos | null {
  if (b.status === 'pago' || b.status === 'pago_atraso') return null
  const dias = diasEntre(b.vencimento, dataBase)
  if (dias <= 0) return null
  const multa = arred2(b.valor * MULTA_PCT)
  const juros = arred2(b.valor * JUROS_MES_PCT * (dias / 30))
  return { diasAtraso: dias, multa, juros, totalAtualizado: arred2(b.valor + multa + juros), dataBase }
}

// ── Recebimento por segmento de cliente ──────────────────────────────────
// Visão do % de realização mês a mês por tipo de cliente. Dado derivado do
// ERP (read-only) — protótipo usa séries pré-geradas por segmento.

export interface RecebimentoTipoMes {
  mes: string
  aReceber: number   // total faturado no mês
  recebido: number   // confirmado recebido
  pendente: number   // aReceber - recebido
  pctRealizacao: number // recebido / aReceber * 100
}

// [aReceber, recebido] por mês (jul/25 → jun/26)
const HIST_RECEBIMENTO_TIPO: Record<Exclude<TipoClienteFiltro, 'todos'>, [number, number][]> = {
  oficina: [
    [228_000, 191_500], [241_000, 205_000], [235_000, 196_000], [252_000, 211_000],
    [247_000, 204_000], [261_000, 218_500], [255_000, 209_000], [243_000, 198_000],
    [258_000, 213_000], [249_000, 207_500], [264_000, 220_000], [42_000, 34_500],
  ],
  frotista: [
    [88_000, 67_500],  [92_000, 69_000],  [95_000, 71_500],  [89_000, 65_500],
    [97_000, 73_000],  [101_000, 77_500], [86_000, 62_000],  [93_000, 70_000],
    [99_000, 75_500],  [96_000, 72_000],  [103_000, 79_500], [17_000, 12_500],
  ],
  transportadora: [
    [68_000, 41_500],  [72_000, 44_000],  [74_000, 46_500],  [69_000, 42_000],
    [76_000, 47_000],  [79_000, 50_500],  [65_000, 39_000],  [71_000, 43_500],
    [77_000, 48_500],  [74_000, 46_000],  [80_000, 51_000],  [13_000, 8_000],
  ],
  produtor: [
    [32_000, 22_000],  [28_000, 19_000],  [35_000, 24_500],  [38_000, 27_500],
    [41_000, 29_500],  [37_000, 26_000],  [29_000, 19_500],  [34_000, 23_500],
    [39_000, 27_000],  [43_000, 31_000],  [36_000, 25_500],  [7_000, 4_500],
  ],
  pf: [
    [17_000, 15_300],  [18_000, 16_200],  [17_500, 15_600],  [19_000, 17_100],
    [18_500, 16_700],  [20_000, 18_200],  [17_000, 15_100],  [18_500, 16_500],
    [19_500, 17_600],  [20_500, 18_500],  [19_000, 17_100],  [3_500, 3_100],
  ],
  orgao_publico: [
    [29_000, 14_000],  [31_000, 15_500],  [28_000, 13_000],  [33_000, 16_000],
    [30_000, 14_500],  [34_000, 17_000],  [27_000, 12_500],  [32_000, 15_000],
    [35_000, 17_500],  [31_000, 14_500],  [36_000, 18_000],  [6_000, 2_500],
  ],
}

const TIPOS_CLIENTE_FILTRO: Exclude<TipoClienteFiltro, 'todos'>[] = [
  'oficina', 'frotista', 'transportadora', 'produtor', 'pf', 'orgao_publico',
]

export function getRecebimentosPorTipo(tipo: TipoClienteFiltro): RecebimentoTipoMes[] {
  const meses = [...MESES_HIST, DATA_BASE.slice(0, 7)]
  const tipos = tipo === 'todos' ? TIPOS_CLIENTE_FILTRO : [tipo]
  return meses.map((mes, i) => {
    const aReceber = tipos.reduce((s, t) => s + HIST_RECEBIMENTO_TIPO[t][i][0], 0)
    const recebido = tipos.reduce((s, t) => s + HIST_RECEBIMENTO_TIPO[t][i][1], 0)
    const pendente = aReceber - recebido
    const pctRealizacao = aReceber > 0 ? Math.round((recebido / aReceber) * 100) : 0
    return { mes, aReceber, recebido, pendente, pctRealizacao }
  })
}
