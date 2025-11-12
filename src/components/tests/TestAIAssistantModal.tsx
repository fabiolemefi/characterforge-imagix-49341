import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, CheckCircle, Loader, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useTestAIConversation, ExtractedTestData } from "@/hooks/useTestAIConversation";
import { toast } from "sonner";

interface TestAIAssistantModalProps {
  open: boolean;
  onClose: () => void;
  onFormFill: (data: ExtractedTestData) => void;
}

export function TestAIAssistantModal({ open, onClose, onFormFill }: TestAIAssistantModalProps) {
  const [input, setInput] = useState("");
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState("U");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversationId,
    messages,
    isLoading,
    extractedData,
    isReady,
    checkForDraft,
    startConversation,
    loadConversation,
    sendMessage,
    deleteConversation,
  } = useTestAIConversation();

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.full_name) {
        const names = user.user_metadata.full_name.split(" ");
        const initials = names.length >= 2 
          ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
          : names[0][0].toUpperCase();
        setUserInitials(initials);
      } else if (user?.email) {
        setUserInitials(user.email[0].toUpperCase());
      }
    };
    
    if (open) {
      loadUserData();
    }
  }, [open]);

  // Check for draft when modal opens
  useEffect(() => {
    if (open && !conversationId) {
      checkForDraft().then((id) => {
        if (id) {
          setDraftId(id);
          setShowDraftDialog(true);
        } else {
          startConversation();
        }
      });
    }
  }, [open]);

  // Auto-scroll to bottom when messages change or modal opens
  useEffect(() => {
    if (open && messages.length > 0) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages, isLoading, open]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput("");
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFillForm = () => {
    if (!isReady || !extractedData) return;

    onFormFill(extractedData);
    toast.success("Formulário preenchido! ✨", {
      description: "Revise as informações e clique em criar teste.",
    });
  };

  const handleClose = () => {
    // Just close without showing confirmation
    // The conversation will remain as draft for future resumption
    onClose();
  };

  const handleResumeDraft = async () => {
    if (draftId) {
      await loadConversation(draftId);
    }
    setShowDraftDialog(false);
  };

  const handleStartNew = async () => {
    if (draftId) {
      await deleteConversation(draftId);
    }
    setShowDraftDialog(false);
    await startConversation();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[700px] h-[700px] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-primary" />
              Assistente de Criação de Teste
            </DialogTitle>
          </DialogHeader>

          {/* Chat messages */}
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-4 py-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "assistant" && (
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 max-w-[80%] shadow-sm",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-foreground border border-border/50"
                    )}
                  >
                    <p className="text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <span className="text-xs opacity-60 mt-2 block">
                      {format(new Date(msg.timestamp), "HH:mm")}
                    </span>
                  </div>

                  {msg.role === "user" && (
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-primary/10">
                      <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted/50 rounded-2xl px-4 py-3 border border-border/50 max-w-[70%]">
                    <div className="space-y-2.5">
                      <div className="h-3.5 bg-gradient-to-r from-muted-foreground/10 via-muted-foreground/30 to-muted-foreground/10 rounded w-3/4 animate-shimmer bg-[length:200%_100%]" />
                      <div className="h-3.5 bg-gradient-to-r from-muted-foreground/10 via-muted-foreground/30 to-muted-foreground/10 rounded w-full animate-shimmer bg-[length:200%_100%]" style={{ animationDelay: "0.15s" }} />
                      <div className="h-3.5 bg-gradient-to-r from-muted-foreground/10 via-muted-foreground/30 to-muted-foreground/10 rounded w-5/6 animate-shimmer bg-[length:200%_100%]" style={{ animationDelay: "0.3s" }} />
                    </div>
                  </div>
                </div>
              )}

              {messages.length === 0 && !isLoading && (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  <Loader className="h-5 w-5 animate-spin" />
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="px-6 py-4 border-t bg-background space-y-3">
            {isReady && (
              <Button onClick={handleFillForm} className="w-full shadow-sm" size="lg">
                <CheckCircle className="h-4 w-4 mr-2" />
                Preencher Formulário
              </Button>
            )}

            <div className="flex gap-2">
              <Textarea
                placeholder="Digite sua mensagem..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[60px] max-h-[120px] resize-none"
                disabled={isLoading || isReady}
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim() || isReady}
                size="icon"
                className="shrink-0 h-[60px] w-[60px]"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Draft dialog */}
      <AlertDialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Conversa em Andamento
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você tem uma conversa não concluída. Deseja continuar de onde parou ou começar uma
              nova?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleStartNew}>
              <Trash2 className="h-4 w-4 mr-2" />
              Começar Nova
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleResumeDraft}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}
