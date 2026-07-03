'use client'

import { useState } from 'react'
import {
  getUsuarios,
  saveUsuarios,
  PERFIL_LABEL,
  type Usuario,
  type Perfil,
} from '../../../../lib/auth'
import { PageHeader } from '../../../../components/ui/PageHeader'
import { Button } from '../../../../components/ui/Button'
import { Modal } from '../../../../components/ui/Modal'
import { Field } from '../../../../components/ui/Field'
import { Input } from '../../../../components/ui/Input'
import { Select } from '../../../../components/ui/Select'
import { Switch } from '../../../../components/ui/Switch'
import { Tag } from '../../../../components/ui/Tag'
import { DataTable, type Column } from '../../../../components/ui/DataTable'
import { useToast } from '../../../../hooks/useToast'
import { IconPlus, IconEye, IconEyeOff } from '../../../../components/icons'

interface FormState {
  nome: string
  email: string
  senha: string
  perfil: Perfil
}

const FORM_VAZIO: FormState = { nome: '', email: '', senha: '', perfil: 'comercial' }

function gerarId() {
  return 'u' + Date.now().toString(36)
}

export default function Usuarios() {
  const { toast, toastHost } = useToast()
  // lazy init é seguro: a página só renderiza no cliente, atrás do AuthGuard
  const [usuarios, setUsuarios] = useState<Usuario[]>(() => getUsuarios())
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [form, setForm] = useState<FormState>(FORM_VAZIO)
  const [erros, setErros] = useState<Partial<Record<keyof FormState, string>>>({})
  const [mostrarSenha, setMostrarSenha] = useState(false)

  function abrirCriacao() {
    setEditando(null)
    setForm(FORM_VAZIO)
    setErros({})
    setMostrarSenha(false)
    setModalAberto(true)
  }

  function abrirEdicao(u: Usuario) {
    setEditando(u)
    setForm({ nome: u.nome, email: u.email, senha: u.senha, perfil: u.perfil })
    setErros({})
    setMostrarSenha(false)
    setModalAberto(true)
  }

  function validar(): boolean {
    const novos: typeof erros = {}
    if (!form.nome.trim()) novos.nome = 'Informe o nome.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) novos.email = 'Informe um e-mail válido.'
    if (form.senha.length < 6) novos.senha = 'A senha precisa de ao menos 6 caracteres.'
    const emailEmUso = usuarios.some(
      (u) => u.email.toLowerCase() === form.email.toLowerCase() && u.id !== editando?.id,
    )
    if (emailEmUso) novos.email = 'Já existe usuário com este e-mail.'
    setErros(novos)
    return Object.keys(novos).length === 0
  }

  function salvar() {
    if (!validar()) return
    let proximos: Usuario[]
    if (editando) {
      proximos = usuarios.map((u) => (u.id === editando.id ? { ...u, ...form } : u))
      toast('Usuário atualizado.')
    } else {
      proximos = [
        ...usuarios,
        { id: gerarId(), ...form, ativo: true, criadoEm: new Date().toISOString().slice(0, 10) },
      ]
      toast('Usuário criado.')
    }
    setUsuarios(proximos)
    saveUsuarios(proximos)
    setModalAberto(false)
  }

  function alternarAtivo(id: string) {
    const proximos = usuarios.map((u) => (u.id === id ? { ...u, ativo: !u.ativo } : u))
    setUsuarios(proximos)
    saveUsuarios(proximos)
    const u = proximos.find((x) => x.id === id)
    toast(u?.ativo ? 'Usuário reativado.' : 'Usuário desativado.')
  }

  const colunas: Column<Usuario>[] = [
    {
      key: 'nome',
      header: 'Usuário',
      sortValue: (u) => u.nome,
      render: (u) => (
        <span>
          <span className={`block font-medium ${u.ativo ? 'text-ink' : 'text-ink-muted'}`}>{u.nome}</span>
          <span className="block font-mono text-xs text-ink-muted">{u.email}</span>
        </span>
      ),
    },
    {
      key: 'perfil',
      header: 'Perfil',
      sortValue: (u) => PERFIL_LABEL[u.perfil],
      render: (u) => <Tag>{PERFIL_LABEL[u.perfil]}</Tag>,
    },
    {
      key: 'criado',
      header: 'Criado em',
      numeric: true,
      sortValue: (u) => u.criadoEm,
      render: (u) => u.criadoEm.split('-').reverse().join('/'),
    },
    {
      key: 'ativo',
      header: 'Ativo',
      sortValue: (u) => Number(u.ativo),
      render: (u) => (
        <Switch checked={u.ativo} onChange={() => alternarAtivo(u.id)} aria-label={`Ativar/desativar ${u.nome}`} />
      ),
    },
    {
      key: 'acoes',
      header: '',
      numeric: true,
      render: (u) => (
        <Button variant="ghost" size="sm" onClick={() => abrirEdicao(u)}>
          Editar
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Administração"
        title="Usuários"
        description="Contas de acesso e perfis de permissão da plataforma."
        actions={
          <Button onClick={abrirCriacao}>
            <IconPlus size={16} />
            Novo usuário
          </Button>
        }
      />

      <DataTable columns={colunas} rows={usuarios} rowKey={(u) => u.id} />

      <Modal open={modalAberto} onClose={() => setModalAberto(false)}>
        <Modal.Header>{editando ? 'Editar usuário' : 'Novo usuário'}</Modal.Header>
        <Modal.Body>
          <div className="flex flex-col gap-4">
            <Field label="Nome" error={erros.nome}>
              <Input
                value={form.nome}
                invalid={!!erros.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="w-full"
              />
            </Field>
            <Field label="E-mail" error={erros.email}>
              <Input
                type="email"
                value={form.email}
                invalid={!!erros.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full"
              />
            </Field>
            <Field label="Senha" error={erros.senha} helper="Protótipo — não usar senha real.">
              <div className="relative">
                <Input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={form.senha}
                  invalid={!!erros.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={mostrarSenha}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-muted
                    hover:text-ink focus-ring rounded-md"
                >
                  {mostrarSenha ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </Field>
            <Field label="Perfil">
              <Select
                value={form.perfil}
                onChange={(e) => setForm({ ...form, perfil: e.target.value as Perfil })}
                className="w-full"
              >
                {(Object.keys(PERFIL_LABEL) as Perfil[]).map((p) => (
                  <option key={p} value={p}>
                    {PERFIL_LABEL[p]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setModalAberto(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar}>{editando ? 'Salvar alterações' : 'Criar usuário'}</Button>
        </Modal.Footer>
      </Modal>

      {toastHost}
    </>
  )
}
