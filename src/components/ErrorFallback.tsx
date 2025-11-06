import { AlertCircle, RefreshCw, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface ErrorFallbackProps {
  title?: string;
  message: string;
  technicalDetails?: string;
  onRetry?: () => void;
  onLogout?: () => void;
  showTechnicalDetails?: boolean;
}

export function ErrorFallback({
  title = "Erro ao carregar dados",
  message,
  technicalDetails,
  onRetry,
  onLogout,
  showTechnicalDetails = import.meta.env.DEV
}: ErrorFallbackProps) {
  return (
    <Card className="p-6 border-destructive/50 bg-destructive/5">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="font-semibold text-foreground mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>

          {showTechnicalDetails && technicalDetails && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground transition-colors">
                Detalhes técnicos
              </summary>
              <pre className="mt-2 p-3 bg-background rounded-md overflow-auto">
                {technicalDetails}
              </pre>
            </details>
          )}

          <div className="flex gap-2">
            {onRetry && (
              <Button
                onClick={onRetry}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Tentar Novamente
              </Button>
            )}
            
            {onLogout && (
              <Button
                onClick={onLogout}
                variant="ghost"
                size="sm"
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sair e Entrar Novamente
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
