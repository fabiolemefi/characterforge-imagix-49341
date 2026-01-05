import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export interface OperationProgressModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  status: "loading" | "success" | "error";
  details?: string[];
  onClose?: () => void;
}

export function OperationProgressModal({
  isOpen,
  title,
  description,
  status,
  details = [],
  onClose,
}: OperationProgressModalProps) {
  const canClose = status !== "loading";

  const handleOpenChange = (open: boolean) => {
    if (!open && canClose && onClose) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-[400px]"
        onPointerDownOutside={(e) => !canClose && e.preventDefault()}
        onEscapeKeyDown={(e) => !canClose && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center py-6 space-y-4">
          {status === "loading" && (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          )}
          {status === "success" && (
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          )}
          {status === "error" && (
            <XCircle className="h-12 w-12 text-destructive" />
          )}
          
          <p className="text-center text-muted-foreground">{description}</p>
          
          {details.length > 0 && (
            <ul className="w-full space-y-1 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              {details.map((detail, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-muted-foreground/70">•</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {canClose && (
          <div className="flex justify-center">
            <Button onClick={onClose} variant={status === "error" ? "destructive" : "default"}>
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
