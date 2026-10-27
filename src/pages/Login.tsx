import { useState, type FormEvent } from 'react'
import { AppWindow, Loader2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { Button, Card, Field, cn, inputCls } from '../components/ui'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar. Verifique e-mail e senha.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-full grid lg:grid-cols-[1.1fr_1fr] bg-background text-foreground">
      <div className="hidden lg:flex flex-col justify-between bg-primary text-primary-foreground p-12">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center h-10 w-10 rounded-lg bg-white/15">
            <AppWindow size={22} />
          </span>
          <div>
            <p className="font-bold text-lg leading-tight">Esquadra</p>
            <p className="text-xs uppercase tracking-wider opacity-70">Precificação & Gestão</p>
          </div>
        </div>
        <div className="max-w-lg">
          <p className="text-sm font-semibold uppercase tracking-widest opacity-70">Ambiente operacional</p>
          <h1 className="text-4xl font-bold tracking-tight mt-3 leading-tight">
            Orçamentos, projetos e financeiro em um só lugar.
          </h1>
          <p className="mt-5 text-sm leading-relaxed opacity-80">
            Acesse o workspace da Vidraçaria Modelo para acompanhar a operação com dados centralizados e seguros.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs opacity-70">
          <ShieldCheck size={16} /> Autenticação e dados protegidos por RLS no Supabase
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md p-7 sm:p-9">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <span className="grid place-items-center h-9 w-9 rounded-md bg-primary text-primary-foreground">
              <AppWindow size={19} />
            </span>
            <div>
              <p className="font-bold leading-tight">Esquadra</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Precificação & Gestão</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">Entrar no workspace</h2>
          <p className="text-sm text-muted-foreground mt-1">Use o usuário administrador criado no Supabase.</p>

          <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
            <Field label="E-mail">
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  required
                  autoFocus
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@empresa.com.br"
                  className={cn(inputCls, 'pl-9')}
                />
              </div>
            </Field>

            <Field label="Senha">
              <div className="relative">
                <LockKeyhole size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Sua senha"
                  className={cn(inputCls, 'pl-9')}
                />
              </div>
            </Field>

            {error && (
              <p role="alert" className="rounded-md bg-danger-soft text-danger px-3 py-2 text-xs">
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <LockKeyhole size={16} />}
              {submitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-6 text-[11px] text-muted-foreground leading-relaxed">
            Cadastro público desabilitado. Se você não tem acesso, solicite a criação do usuário ao administrador.
          </p>
        </Card>
      </div>
    </div>
  )
}
