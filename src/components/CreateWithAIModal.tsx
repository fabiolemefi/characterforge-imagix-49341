import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EmailBlock } from "@/hooks/useEmailBlocks";
import { RichTextEditor } from "./RichTextEditor";
import { useEmailDatasets } from "@/hooks/useEmailDatasets";
import { cn } from "@/lib/utils";
interface CreateWithAIModalProps {
  open: boolean;
  onClose: () => void;
}

interface AIBlock {
  name?: string;
  type?: string; // fallback if AI uses "type" instead of "name"
  category?: string;
  content?: any;
}

interface AIResponse {
  name: string;
  subject: string;
  preview_text: string;
  category: string;
  blocks: AIBlock[];
}

// Mensagens de progresso baseadas no tempo real
const getProgressMessage = (seconds: number): string => {
  if (seconds < 5) return "Conectando com a IA...";
  if (seconds < 15) return "Aguardando resposta do Gemini...";
  if (seconds < 30) return "Processando conteúdo (pode levar até 1 minuto)...";
  if (seconds < 45) return "Gerando estrutura do email...";
  return "Finalizando... por favor aguarde...";
};

const TIMEOUT_MS = 60000; // 60 segundos

const applyContentToHtml = (htmlTemplate: string, content: any, blockName?: string): string => {
  if (!content) return htmlTemplate;

  let html = htmlTemplate;

  // Special handling for Welcome block - has both greeting (hi) and title
  if (blockName === "Welcome") {
    if (content.hi) {
      html = html.replace(/Olá, Pedro\./gi, content.hi);
    }
    if (content.title) {
      html = html.replace(/\{\{texto\}\}/gi, content.title);
      html = html.replace(/\{\{text\}\}/gi, content.title);
    }
  }
  // Special handling for Signature block
  else if (blockName === "Signature" && content.text) {
    html = html.replace(
      /(<p style="Margin:0;mso-line-height-alt:20px;">)<span[^>]*>Abraços,<\/span>(<\/p>)/gi,
      `$1<span style="font-size:14px;font-family:'Arial',sans-serif;font-weight:400;color:#586476;line-height:143%;mso-line-height-alt:20px;">${content.text.split('<br>')[0]}</span>$2`
    );
    html = html.replace(
      /(<p style="Margin:0;mso-line-height-alt:20px;">)<span[^>]*>Equipe Efí Bank<\/span>(<\/p>)/gi,
      `$1<span style="font-size:14px;font-family:'Arial',sans-serif;font-weight:700;color:#f37021;line-height:143%;mso-line-height-alt:20px;">${content.text.split('<br>')[1] || ''}</span>$2`
    );
  }
  // Regular title placeholders
  else if (content.title) {
    html = html.replace(/\{\{titulo\}\}/gi, content.title);
    html = html.replace(/\{\{title\}\}/gi, content.title);
    html = html.replace(/\{\{texto\}\}/gi, content.title);
    html = html.replace(/\{\{text\}\}/gi, content.title);
  }

  // Replace text content
  if (content.text) {
    html = html.replace(/\{\{texto\}\}/gi, content.text);
    html = html.replace(/\{\{text\}\}/gi, content.text);
    html = html.replace(/\{\{conteudo\}\}/gi, content.text);
    html = html.replace(/\{\{content\}\}/gi, content.text);
  }

  // Replace category
  if (content.category) {
    html = html.replace(/\{\{texto\}\}/gi, content.category);
    html = html.replace(/\{\{text\}\}/gi, content.category);
    html = html.replace(/\{\{category\}\}/gi, content.category);
  }

  // Replace button text and URL
  if (content.button_text) {
    html = html.replace(/\{\{botao\}\}/gi, content.button_text);
    html = html.replace(/\{\{button_text\}\}/gi, content.button_text);
    html = html.replace(/\{\{button\}\}/gi, content.button_text);
    html = html.replace(/(<a[^>]*href[^>]*>)[^<]*(<\/a>)/gi, (match, open, close) => {
      return `${open}${content.button_text}${close}`;
    });
  }

  if (content.url) {
    html = html.replace(/href="#"/gi, `href="${content.url}"`);
    html = html.replace(/href=""/gi, `href="${content.url}"`);
    html = html.replace(/href='#'/gi, `href="${content.url}"`);
    html = html.replace(/href=''/gi, `href="${content.url}"`);
  }

  return html;
};

export const CreateWithAIModal = ({ open, onClose }: CreateWithAIModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { dataset, loading: datasetLoading } = useEmailDatasets();
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [cancelled, setCancelled] = useState(false);
  const [useDataset, setUseDataset] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Elapsed time counter and progress message based on time
  useEffect(() => {
    if (generating) {
      setProgressMessage(getProgressMessage(0));
      
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => {
          const newTime = prev + 1;
          setProgressMessage(getProgressMessage(newTime));
          return newTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsedTime(0);
      setProgressMessage("");
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [generating]);

  const handleCancel = () => {
    setCancelled(true);
    setGenerating(false);
    toast({
      title: "Geração cancelada",
      description: "A geração do email foi interrompida.",
    });
  };

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast({
        variant: "destructive",
        title: "Descrição obrigatória",
        description: "Por favor, descreva o email que deseja criar",
      });
      return;
    }

    setGenerating(true);
    setCancelled(false);

    try {
      console.log("Chamando edge function com descrição:", description.substring(0, 100) + "...");

      // Promise de timeout real
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("TIMEOUT"));
        }, TIMEOUT_MS);
      });

      // Race entre a chamada e o timeout
      const result = await Promise.race([
        supabase.functions.invoke("generate-email-ai", {
          body: { 
            description,
            datasetContent: useDataset && dataset?.content ? dataset.content : null
          },
        }),
        timeoutPromise,
      ]);

      const { data: aiData, error: aiError } = result as { data: any; error: any };

      if (aiError) throw aiError;
      if (!aiData) throw new Error("Nenhuma resposta da IA");

      console.log("Resposta da IA:", aiData);

      const emailStructure: AIResponse = aiData;

      // Fetch all available blocks
      const { data: allBlocks, error: blocksError } = await supabase
        .from("email_blocks")
        .select("*")
        .eq("is_active", true);

      if (blocksError) throw blocksError;
      if (!allBlocks || allBlocks.length === 0) {
        throw new Error("Nenhum bloco disponível no banco de dados");
      }

      // Map AI blocks to real database blocks
      const selectedBlocks = emailStructure.blocks
        .map((aiBlock, index) => {
          // Use "name" if present, fallback to "type"
          const aiBlockName = aiBlock.name || aiBlock.type;
          
          // Try exact name match first
          let matchingBlock = allBlocks.find(
            (dbBlock: EmailBlock) => dbBlock.name === aiBlockName
          );

          // Try case-insensitive name match
          if (!matchingBlock && aiBlockName) {
            matchingBlock = allBlocks.find(
              (dbBlock: EmailBlock) => dbBlock.name.toLowerCase() === aiBlockName.toLowerCase()
            );
          }

          // Try category match (with null safety)
          if (!matchingBlock && aiBlock.category) {
            matchingBlock = allBlocks.find(
              (dbBlock: EmailBlock) => dbBlock.category?.toLowerCase() === aiBlock.category?.toLowerCase()
            );
          }

          // Try partial name match as last resort
          if (!matchingBlock && aiBlockName) {
            matchingBlock = allBlocks.find(
              (dbBlock: EmailBlock) => 
                dbBlock.name.toLowerCase().includes(aiBlockName.toLowerCase()) ||
                aiBlockName.toLowerCase().includes(dbBlock.name.toLowerCase())
            );
          }

          if (!matchingBlock) {
            console.warn(`Nenhum bloco encontrado para: ${aiBlockName} (${aiBlock.category || 'sem categoria'})`);
            return null;
          }

          let contentToApply = aiBlock.content;
          if (matchingBlock.name === "Header" && emailStructure.category) {
            contentToApply = { category: emailStructure.category };
          }

          const customHtml = applyContentToHtml(matchingBlock.html_template, contentToApply, matchingBlock.name);

          return {
            ...matchingBlock,
            instanceId: `${matchingBlock.id}-${Date.now()}-${index}`,
            customHtml,
          };
        })
        .filter(Boolean);

      if (selectedBlocks.length === 0) {
        throw new Error("Não foi possível mapear os blocos gerados");
      }

      // Generate HTML content
      const htmlContent = selectedBlocks.map((block) => block.customHtml || block.html_template).join("\n");

      // Create the template
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Usuário não autenticado");

      const { data: template, error: saveError } = await supabase
        .from("email_templates")
        .insert({
          name: emailStructure.name,
          subject: emailStructure.subject,
          preview_text: emailStructure.preview_text,
          description: emailStructure.category || null,
          html_content: htmlContent,
          blocks_data: selectedBlocks,
          created_by: user.user.id,
          updated_by: user.user.id,
        })
        .select()
        .single();

      if (saveError) throw saveError;
      if (!template) throw new Error("Erro ao criar template");

      toast({
        title: "Email gerado com sucesso! ✨",
        description: "Seu email foi criado com IA. Agora você pode editá-lo.",
      });

      navigate(`/email-builder/${template.id}`);
      onClose();
    } catch (error: any) {
      if (cancelled) return;
      
      if (error.message === "TIMEOUT") {
        toast({
          variant: "destructive",
          title: "Tempo esgotado (60s)",
          description: "A geração demorou mais que o esperado. Tente novamente com uma descrição mais curta.",
        });
      } else {
        console.error("Erro ao gerar email com IA:", error);
        toast({
          variant: "destructive",
          title: "Erro ao gerar email",
          description: error.message || "Não foi possível gerar o email com IA",
        });
      }
    } finally {
      if (!cancelled) {
        setGenerating(false);
      }
    }
  };

  const handleClose = () => {
    if (!generating) {
      setDescription("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Criar Email com IA
          </DialogTitle>
          <DialogDescription>
            Descreva o email que você quer criar e a IA montará a estrutura para você usando os blocos disponíveis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">Conteúdo do email</Label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Ex: Email sobre Dia dos namorados&#10;&#10;O Efí Bank lança promoção..."
              disabled={generating}
            />
          </div>

          {generating && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader className="h-4 w-4 animate-spin" />
                <span>{progressMessage}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Tempo: {elapsedTime}s
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="use-dataset"
              checked={useDataset}
              onCheckedChange={setUseDataset}
              disabled={generating}
            />
            <Label 
              htmlFor="use-dataset" 
              className="text-sm cursor-pointer"
            >
              Usar dataset de conteúdo
              {datasetLoading && <span className="text-muted-foreground"> (carregando...)</span>}
              {!datasetLoading && !dataset?.content && <span className="text-muted-foreground"> (vazio)</span>}
            </Label>
          </div>
          
          <div className="flex gap-2">
            {generating ? (
              <Button variant="destructive" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            ) : (
              <Button onClick={handleGenerate} disabled={!description.trim()}>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar Email
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
