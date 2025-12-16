import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send, Bot, Check } from "lucide-react";
import { useTestAIConversation, ExtractedTestData } from "@/hooks/useTestAIConversation";
import { CollectionProgress } from "@/components/ai-assistant/CollectionProgress";
import { supabase } from "@/integrations/supabase/client";

interface BriefingAIAssistantModalProps {
  open: boolean;
  onClose: () => void;
  onFormFill: (data: ExtractedTestData) => void;
  checkForDrafts?: boolean;
  assistantSlug?: string;
}

export function BriefingAIAssistantModal({
  open,
  onClose,
  onFormFill,
  checkForDrafts = true,
  assistantSlug = "briefing-assistent",
}: BriefingAIAssistantModalProps) {
  const [inputValue, setInputValue] = useState("");
  const [loadingTime, setLoadingTime] = useState(0);
  const [userInitials, setUserInitials] = useState("U");
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    conversationId,
    messages,
    isLoading,
    extractedData,
    isReady,
    fieldsSchema,
    assistantAvatarUrl,
    startConversation,
    sendMessage,
    checkForDraft,
    resetConversation,
    cancelLoading,
  } = useTestAIConversation(assistantSlug);

  // Reset conversation when modal closes
  useEffect(() => {
    if (!open) {
      resetConversation();
    }
  }, [open]);

  // Track loading time for progressive feedback + safety timeout
  useEffect(() => {
    let safetyTimeoutId: NodeJS.Timeout | null = null;
    
    if (isLoading) {
      setLoadingTime(0);
      loadingTimerRef.current = setInterval(() => {
        setLoadingTime(prev => prev + 1);
      }, 1000);

      // Safety timeout - força reset após 90 segundos
      safetyTimeoutId = setTimeout(() => {
        console.warn("⚠️ [BriefingModal] Safety timeout ativado após 90 segundos");
        cancelLoading();
      }, 90000);
    } else {
      setLoadingTime(0);
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    }

    return () => {
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
      }
      if (safetyTimeoutId) {
        clearTimeout(safetyTimeoutId);
      }
    };
  }, [isLoading, cancelLoading]);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();

        setUserAvatarUrl(profile?.avatar_url || null);

        if (user.user_metadata?.full_name) {
          const names = user.user_metadata.full_name.split(" ");
          const initials = names.length >= 2
            ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
            : names[0][0].toUpperCase();
          setUserInitials(initials);
        } else if (user.email) {
          setUserInitials(user.email[0].toUpperCase());
        }
      }
    };

    if (open) {
      loadUserData();
    }
  }, [open]);

  // Start or resume conversation when modal opens
  useEffect(() => {
    if (open && !conversationId) {
      if (checkForDrafts) {
        checkForDraft().then((hasDraft) => {
          if (!hasDraft) {
            startConversation();
          }
        });
      } else {
        startConversation();
      }
    }
  }, [open, conversationId, checkForDrafts]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (open && !isLoading) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("📤 [BriefingModal] handleSubmit chamado:", { 
      inputValue: inputValue.trim().substring(0, 50), 
      isLoading,
      conversationId 
    });
    
    if (!inputValue.trim() || isLoading) {
      console.warn("⚠️ [BriefingModal] Submit bloqueado:", { 
        emptyInput: !inputValue.trim(), 
        isLoading 
      });
      return;
    }

    const message = inputValue.trim();
    setInputValue("");
    await sendMessage(message);
  };

  const handleConfirmData = () => {
    if (extractedData) {
      onFormFill(extractedData);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px] h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b space-y-3">
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Assistente de Briefing
          </DialogTitle>
          {fieldsSchema.length > 0 && (
            <CollectionProgress
              extractedData={extractedData}
              fieldsSchema={fieldsSchema}
            />
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 py-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-8 w-8">
                    {assistantAvatarUrl && (
                      <AvatarImage src={assistantAvatarUrl} alt="Assistant avatar" />
                    )}
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-[#dae6ef]"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === "user" && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userAvatarUrl || undefined} alt="User avatar" />
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  {assistantAvatarUrl && (
                    <AvatarImage src={assistantAvatarUrl} alt="Assistant avatar" />
                  )}
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-[#dae6ef] rounded-lg px-4 py-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      {loadingTime > 15 
                        ? "Processando dados extensos..." 
                        : loadingTime > 5 
                          ? "Analisando informações..." 
                          : "Pensando..."}
                    </span>
                  </div>
                  {loadingTime > 10 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={cancelLoading}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-6 pt-0 space-y-4">
          {isReady && extractedData && (
            <Button
              onClick={handleConfirmData}
              className="w-full"
              variant="default"
            >
              <Check className="h-4 w-4 mr-2" />
              Usar dados no formulário
            </Button>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Digite sua mensagem..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={isLoading || !inputValue.trim()}
              className={isLoading ? "opacity-50" : ""}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
