'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { login, getSession, USUARIOS_SEED } from '../../lib/auth'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Field } from '../../components/ui/Field'
import { Alert } from '../../components/ui/Alert'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (getSession()) router.replace('/dashboard')
  }, [router])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    // pequena latência simulada — loading obrigatório em ação de rede (DS v5)
    setTimeout(() => {
      const r = login(email.trim(), senha)
      if (r.ok) {
        router.replace('/dashboard')
      } else {
        setErro(r.erro ?? 'Não foi possível entrar.')
        setLoading(false)
      }
    }, 400)
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* painel de marca — capa do DS: aço profundo, serifa que afirma */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-steel-800 p-10 lg:flex
        bg-[radial-gradient(120%_90%_at_85%_10%,rgba(35,50,51,0.4),transparent_60%)]">
        <div className="label-mono text-steel-300">
          <b className="font-semibold text-primary-400">Retífica Formiguense</b> × Origami Lab
        </div>
        <div>
          <div className="label-mono text-primary-300">Plataforma de cobrança</div>
          <h1 className="mt-4 font-display text-5xl font-bold tracking-tight text-white">
            Cobrança<br />
            <em className="not-italic text-primary-500">RF</em>
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-steel-200">
            A visão única e acionável do financeiro: sóbria, precisa, confiável.
          </p>
        </div>
        <div className="flex gap-10 border-t border-white/15 pt-5">
          <div>
            <div className="label-mono text-steel-300">Fonte dos fatos</div>
            <div className="mt-1 text-sm font-semibold text-white">Certtus · somente leitura</div>
          </div>
          <div>
            <div className="label-mono text-steel-300">Dona do processo</div>
            <div className="mt-1 text-sm font-semibold text-white">Régua de cobrança RF</div>
          </div>
        </div>
      </div>

      {/* formulário */}
      <div className="flex items-center justify-center bg-canvas p-6">
        <div className="w-full max-w-sm">
          <Image
            src="/logo_rf_1-sem-bg.png"
            alt="Retífica Formiguense"
            width={132}
            height={44}
            className="mb-8 h-11 w-auto lg:hidden"
            priority
          />
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Entrar</h2>
          <p className="mt-1 text-sm text-ink-muted">Acesse com seu e-mail corporativo.</p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate>
            {erro && <Alert kind="error" title={erro} />}
            <Field label="E-mail" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@retifica.com"
              />
            </Field>
            <Field label="Senha" htmlFor="senha">
              <Input
                id="senha"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            <Button type="submit" size="lg" isLoading={loading} className="mt-1 w-full">
              Entrar
            </Button>
          </form>

          {/* credenciais de demonstração — protótipo, dados fictícios */}
          <div className="mt-8 rounded-lg border border-line bg-surface p-4">
            <div className="label-mono mb-2 text-ink-muted">Acesso de demonstração</div>
            <ul className="flex flex-col gap-1 font-mono text-xs text-neutral-700">
              {USUARIOS_SEED.map((u) => (
                <li key={u.id} className="flex justify-between gap-3">
                  <span>{u.email}</span>
                  <span className="text-ink-muted">{u.senha}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
