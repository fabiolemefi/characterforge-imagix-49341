import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EmailBlock } from "@/hooks/useEmailBlocks";

interface CreateWithAIModalProps {
  open: boolean;
  onClose: () => void;
}

interface AIBlock {
  name: string;
  category: string;
  content?: any;
}

interface AIResponse {
  subject: string;
  preview_text: string;
  category: string;
  blocks: AIBlock[];
}

const applyContentToHtml = (htmlTemplate: string, content: any): string => {
  if (!content) return htmlTemplate;

  let html = htmlTemplate;

  // Replace title placeholders (for Welcome and Title blocks)
  if (content.title) {
    html = html.replace(/\{\{titulo\}\}/gi, content.title);
    html = html.replace(/\{\{title\}\}/gi, content.title);
    html = html.replace(/\{\{texto\}\}/gi, content.title);
    html = html.replace(/\{\{text\}\}/gi, content.title);
  }

  // Replace text content (for Paragrafo blocks)
  if (content.text) {
    // Replace text placeholders - try multiple variations
    html = html.replace(/\{\{texto\}\}/gi, content.text);
    html = html.replace(/\{\{text\}\}/gi, content.text);
    html = html.replace(/\{\{conteudo\}\}/gi, content.text);
    html = html.replace(/\{\{content\}\}/gi, content.text);

    // Replace content between tags that should contain text
    // Look for spans or divs that contain only placeholder text
    html = html.replace(/(<[^>]+>)\{\{[^}]+\}\}<\/[^>]+>/g, (match, openTag) => {
      // Extract tag name to ensure it's a text container
      const tagMatch = openTag.match(/<(\w+)/);
      if (tagMatch && ["span", "div", "p", "td", "font"].includes(tagMatch[1])) {
        const closeTag = match.match(/<\/([^>]+)>$/);
        if (closeTag && closeTag[1] === tagMatch[1]) {
          return `${openTag}${content.text}</${tagMatch[1]}>`;
        }
      }
      return match;
    });

    // Fallback: replace any remaining {{content}} patterns
    html = html.replace(/\{\{[^}]+\}\}/g, content.text);
  }

  // Replace button text and URL (ONLY for button blocks)
  if (content.button_text) {
    html = html.replace(/\{\{botao\}\}/gi, content.button_text);
    html = html.replace(/\{\{button_text\}\}/gi, content.button_text);
    html = html.replace(/\{\{button\}\}/gi, content.button_text);

    // Replace text inside <a> tags (for buttons)
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
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);

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

    try {
      // 1. Call edge function to generate structure
      console.log("Chamando edge function com descrição:", description);

      const { data: aiData, error: aiError } = await supabase.functions.invoke("generate-email-ai", {
        body: { description },
      });

      if (aiError) throw aiError;
      if (!aiData) throw new Error("Nenhuma resposta da IA");

      console.log("Resposta da IA:", aiData);

      const emailStructure: AIResponse = aiData;

      // 2. Fetch all available blocks from database
      const { data: allBlocks, error: blocksError } = await supabase
        .from("email_blocks")
        .select("*")
        .eq("is_active", true);

      if (blocksError) throw blocksError;
      if (!allBlocks || allBlocks.length === 0) {
        throw new Error("Nenhum bloco disponível no banco de dados");
      }

      console.log("Blocos disponíveis:", allBlocks.length);

      // 3. Map AI blocks to real database blocks
      const selectedBlocks = emailStructure.blocks
        .map((aiBlock, index) => {
          console.log(`Mapeando bloco ${index}:`, aiBlock.name, aiBlock.category);

          // Find a matching block by exact name first, then by category
          let matchingBlock = allBlocks.find((dbBlock: EmailBlock) => dbBlock.name === aiBlock.name);

          // Fallback: try to find by category if name doesn't match
          if (!matchingBlock) {
            matchingBlock = allBlocks.find(
              (dbBlock: EmailBlock) => dbBlock.category.toLowerCase() === aiBlock.category.toLowerCase(),
            );
          }

          if (!matchingBlock) {
            console.warn(`Nenhum bloco encontrado para: ${aiBlock.name} (${aiBlock.category})`);
            return null;
          }

          console.log(`Bloco encontrado: ${matchingBlock.name}, aplicando conteúdo:`, aiBlock.content);

          // Apply content to the HTML template
          const customHtml = applyContentToHtml(matchingBlock.html_template, aiBlock.content);

          console.log(`HTML customizado (primeiros 200 chars):`, customHtml.substring(0, 200));

          return {
            ...matchingBlock,
            instanceId: `${matchingBlock.id}-${Date.now()}-${index}`,
            customHtml,
          };
        })
        .filter(Boolean); // Remove nulls

      console.log("Blocos selecionados:", selectedBlocks.length);

      if (selectedBlocks.length === 0) {
        throw new Error("Não foi possível mapear os blocos gerados");
      }

      // 4. Generate HTML content
      const htmlContent = selectedBlocks.map((block) => block.customHtml || block.html_template).join("\n");

      // 5. Create the template
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Usuário não autenticado");

      const { data: template, error: saveError } = await supabase
        .from("email_templates")
        .insert({
          name: `IA: ${description.substring(0, 50)}${description.length > 50 ? "..." : ""}`,
          subject: emailStructure.subject,
          preview_text: emailStructure.preview_text || emailStructure.subject,
          description: `Gerado por IA: ${description}`,
          html_content: htmlContent,
          blocks_data: selectedBlocks,
          created_by: user.user.id,
          updated_by: user.user.id,
        })
        .select()
        .single();

      // Save category if available (using description field for now since category column doesn't exist yet)
      if (emailStructure.category && template?.id) {
        await supabase
          .from("email_templates")
          .update({ description: `Gerado por IA (${emailStructure.category}): ${description}` })
          .eq("id", template.id);
      }

      if (saveError) throw saveError;
      if (!template) throw new Error("Erro ao criar template");

      console.log("Template criado:", template.id);

      toast({
        title: "Email gerado com sucesso! ✨",
        description: "Seu email foi criado com IA. Agora você pode editá-lo.",
      });

      // 6. Navigate to the email builder
      navigate(`/email-builder/${template.id}`);
      onClose();
    } catch (error: any) {
      console.error("Erro ao gerar email com IA:", error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar email",
        description: error.message || "Não foi possível gerar o email com IA",
      });
    } finally {
      setGenerating(false);
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
            <Label htmlFor="description">Descreva o email que você quer criar</Label>
            <Textarea
              id="description"
              placeholder="Ex: Comunicado de férias com 2 histórias do papai noel e um botão para ver mais histórias..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px] resize-none"
              disabled={generating}
            />
            <p className="text-xs text-muted-foreground">
              Seja específico sobre o conteúdo, estrutura e elementos que deseja no email.
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <p className="text-sm font-medium">💡 Dicas:</p>
            <ul className="text-xs text-muted-foreground space-y-1 pl-4">
              <li>• Mencione quantas seções ou histórias você quer</li>
              <li>• Descreva se precisa de botões de ação (CTAs)</li>
              <li>• Indique o tom: profissional, casual, festivo, etc.</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={generating}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={generating || !description.trim()}>
            {generating ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar Email
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
