import { AlertCircle, Eye, Loader2, RefreshCw } from 'lucide-react'
import { Button, Card } from './ui'

export function QueryError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="p-8 text-center">
      <AlertCircle className="mx-auto mb-3 text-danger" size={28} />
      <p className="font-semibold">Não foi possível carregar os dados</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button className="mt-4" onClick={onRetry}>
          <RefreshCw size={15} /> Tentar novamente
        </Button>
      )}
    </Card>
  )
}

export function LoadingCard({ label = 'Carregando dados...' }: { label?: string }) {
  return (
    <Card className="p-10 text-center text-muted-foreground">
      <Loader2 className="mx-auto mb-3 animate-spin" size={24} />
      <p className="text-sm">{label}</p>
    </Card>
  )
}

export function ReadOnlyBanner({ roleLabel }: { roleLabel: string }) {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-md border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning print:hidden">
      <Eye size={18} className="mt-0.5 shrink-0" />
      <p>
        <span className="font-semibold">Modo somente leitura.</span> Seu perfil ({roleLabel}) pode consultar os dados;
        os módulos operacionais não permitem criar, editar ou excluir registros.
      </p>
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="py-10 text-center text-muted-foreground border border-dashed border-border rounded-md">
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="text-sm mt-1">{description}</p>}
    </div>
  )
}
