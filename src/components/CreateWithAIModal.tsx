import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EmailBlock } from "@/hooks/useEmailBlocks";
import { RichTextEditor } from "./RichTextEditor";

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

const applyContentToHtml = (htmlTemplate: string, content: any, blockName?: string): string => {
  if (!content) return htmlTemplate;

  let html = htmlTemplate;

  // Special handling for Welcome block - has both greeting (hi) and title
  if (blockName === "Welcome") {
    if (content.hi) {
      // Replace "Olá, Pedro." with the greeting
      html = html.replace(/Olá, Pedro\./gi, content.hi);
    }
    if (content.title) {
      // Replace {{texto}} placeholder with the main title
      html = html.replace(/\{\{texto\}\}/gi, content.title);
      html = html.replace(/\{\{text\}\}/gi, content.title);
    }
  }
  // Special handling for Signature block - replace the full signature text
  else if (blockName === "Signature" && content.text) {
    // Replace the entire signature content (both "Abraços," and "Equipe Efí Bank")
    // Find and replace the two paragraphs
    html = html.replace(
      /(<p style="Margin:0;mso-line-height-alt:20px;">)<span[^>]*>Abraços,<\/span>(<\/p>)/gi,
      `$1<span style="font-size:14px;font-family:'Arial',sans-serif;font-weight:400;color:#586476;line-height:143%;mso-line-height-alt:20px;">${content.text.split('<br>')[0]}</span>$2`
    );
    html = html.replace(
      /(<p style="Margin:0;mso-line-height-alt:20px;">)<span[^>]*>Equipe Efí Bank<\/span>(<\/p>)/gi,
      `$1<span style="font-size:14px;font-family:'Arial',sans-serif;font-weight:700;color:#f37021;line-height:143%;mso-line-height-alt:20px;">${content.text.split('<br>')[1] || ''}</span>$2`
    );
  }
  // Regular title placeholders (for Title blocks)
  else if (content.title) {
    html = html.replace(/\{\{titulo\}\}/gi, content.title);
    html = html.replace(/\{\{title\}\}/gi, content.title);
    html = html.replace(/\{\{texto\}\}/gi, content.title);
    html = html.replace(/\{\{text\}\}/gi, content.title);
  }

  // Replace text content (for Paragrafo blocks)
  if (content.text) {
    html = html.replace(/\{\{texto\}\}/gi, content.text);
    html = html.replace(/\{\{text\}\}/gi, content.text);
    html = html.replace(/\{\{conteudo\}\}/gi, content.text);
    html = html.replace(/\{\{content\}\}/gi, content.text);
  }

  // Replace category (for Header blocks)
  if (content.category) {
    html = html.replace(/\{\{texto\}\}/gi, content.category);
    html = html.replace(/\{\{text\}\}/gi, content.category);
    html = html.replace(/\{\{category\}\}/gi, content.category);
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

      // 3. Map AI blocks to real database blocks and add category to Header
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

          // Special handling for Header: add category from email structure
          let contentToApply = aiBlock.content;
          if (matchingBlock.name === "Header" && emailStructure.category) {
            contentToApply = { category: emailStructure.category };
            console.log(`Aplicando categoria ao Header:`, emailStructure.category);
          }

          // Apply content to the HTML template
          const customHtml = applyContentToHtml(matchingBlock.html_template, contentToApply, matchingBlock.name);

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
            <Label htmlFor="description">Conteúdo do email</Label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Ex: Email sobre Dia dos namorados&#10;&#10;O Efí Bank lança promoção..."
              disabled={generating}
            />
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
