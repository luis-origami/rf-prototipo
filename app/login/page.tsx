'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { login, getSession, USUARIOS_SEED, type Usuario } from '../../lib/auth'
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

  // clique numa credencial de demo preenche o formulário
  function usarCredencial(u: Usuario) {
    setEmail(u.email)
    setSenha(u.senha)
    setErro('')
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* ── Painel de marca — aço profundo com aurora em deriva lenta ── */}
      <aside className="relative hidden overflow-hidden bg-steel-900 lg:block">
        {/* orbs de luz: deriva lenta, muito desfocadas — profundidade sem ruído */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-28 -top-24 h-[30rem] w-[30rem] rounded-full bg-primary-600/25 blur-3xl animate-aurora" />
          <div className="absolute right-[-12%] top-[18%] h-[28rem] w-[28rem] rounded-full bg-steel-400/30 blur-3xl animate-aurora-slow" />
          <div className="absolute bottom-[-14%] left-[22%] h-[26rem] w-[26rem] rounded-full bg-primary-500/15 blur-3xl animate-float" />
        </div>
        {/* malha de pontos finíssima, esmaecida do topo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18]
            [background-image:radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)]
            [background-size:22px_22px]
            [mask-image:radial-gradient(120%_120%_at_50%_0%,#000_30%,transparent_75%)]"
        />
        {/* vinheta laranja sutil no canto superior */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0
            bg-[radial-gradient(120%_90%_at_85%_8%,rgba(247,108,49,0.12),transparent_55%)]"
        />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-12">
          <div
            className="label-mono text-steel-300 animate-fade-up"
            style={{ animationDelay: '40ms' }}
          >
            <b className="font-semibold text-primary-400">Retífica Formiguense</b> × Origami Lab
          </div>

          <div>
            <div
              className="label-mono text-primary-300 animate-fade-up"
              style={{ animationDelay: '120ms' }}
            >
              Plataforma de cobrança
            </div>
            <h1
              className="mt-4 font-display text-5xl font-bold leading-[1.02] tracking-tight text-white animate-fade-up xl:text-6xl"
              style={{ animationDelay: '200ms' }}
            >
              Cobrança<br />
              <em
                className="not-italic bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    'linear-gradient(92deg, var(--color-primary-300), var(--color-primary-500) 55%, var(--color-primary-400))',
                }}
              >
                RF
              </em>
            </h1>
            <p
              className="mt-6 max-w-md text-lg leading-relaxed text-steel-200 animate-fade-up"
              style={{ animationDelay: '300ms' }}
            >
              A visão única e acionável do financeiro: sóbria, precisa, confiável.
            </p>
          </div>

          <div
            className="flex gap-10 border-t border-white/12 pt-6 animate-fade-up"
            style={{ animationDelay: '400ms' }}
          >
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
      </aside>

      {/* ── Formulário ── */}
      <main className="relative flex items-center justify-center overflow-hidden bg-canvas p-6">
        {/* tint laranja tênue no topo — também ambienta o mobile */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0
            bg-[radial-gradient(90%_55%_at_50%_-10%,rgba(247,108,49,0.06),transparent_60%)]"
        />

        <div className="relative w-full max-w-sm">
          <Image
            src="/logo_rf_1-sem-bg.png"
            alt="Retífica Formiguense"
            width={132}
            height={44}
            className="mb-8 h-11 w-auto animate-fade-up lg:hidden"
            priority
          />
          <h2
            className="font-display text-2xl font-bold tracking-tight text-ink animate-fade-up"
            style={{ animationDelay: '60ms' }}
          >
            Entrar
          </h2>
          <p
            className="mt-1 text-sm text-ink-muted animate-fade-up"
            style={{ animationDelay: '120ms' }}
          >
            Acesse com seu e-mail corporativo.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate>
            {erro && (
              <div className="animate-fade-up">
                <Alert kind="error" title={erro} />
              </div>
            )}
            <div className="animate-fade-up" style={{ animationDelay: '180ms' }}>
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
            </div>
            <div className="animate-fade-up" style={{ animationDelay: '240ms' }}>
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
            </div>
            <div className="animate-fade-up" style={{ animationDelay: '300ms' }}>
              <Button type="submit" size="lg" isLoading={loading} className="mt-1 w-full">
                Entrar
              </Button>
            </div>
          </form>

          {/* credenciais de demonstração — clicáveis para preencher (protótipo) */}
          <div
            className="mt-8 rounded-lg border border-line bg-surface/80 p-4 shadow-xs backdrop-blur animate-fade-up"
            style={{ animationDelay: '380ms' }}
          >
            <div className="label-mono mb-2 text-ink-muted">Acesso de demonstração</div>
            <ul className="flex flex-col gap-0.5 font-mono text-xs">
              {USUARIOS_SEED.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => usarCredencial(u)}
                    className="group flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left
                      text-neutral-700 transition-colors duration-150 hover:bg-neutral-100 focus-ring"
                  >
                    <span className="transition-colors group-hover:text-ink">{u.email}</span>
                    <span className="text-ink-muted">{u.senha}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}
