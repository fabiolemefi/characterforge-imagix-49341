import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader, Sparkles, X, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EmailBlock } from "@/hooks/useEmailBlocks";
import { RichTextEditor } from "./RichTextEditor";
import { useEmailDatasets } from "@/hooks/useEmailDatasets";
import { SelectCharacterModal } from "./SelectCharacterModal";

interface CreateWithAIModalProps {
  open: boolean;
  onClose: () => void;
}

interface AIBlock {
  name?: string;
  type?: string;
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

interface CharacterImage {
  id: string;
  image_url: string;
  position: number;
  is_cover: boolean;
}

interface Character {
  id: string;
  name: string;
  general_prompt: string;
  images: CharacterImage[];
  coverImage?: string;
}

interface HeroBlockInfo {
  index: number;
  heroPrompt: string;
}

// Mensagens de progresso baseadas no tempo real
const getProgressMessage = (seconds: number, phase: 'generating' | 'hero'): string => {
  if (phase === 'hero') {
    if (seconds < 5) return "Iniciando geração da imagem...";
    if (seconds < 15) return "Processando com Replicate...";
    if (seconds < 30) return "Criando imagem com persona...";
    if (seconds < 45) return "Finalizando imagem do banner...";
    return "Quase lá... aguarde...";
  }
  
  if (seconds < 5) return "Conectando com a IA...";
  if (seconds < 15) return "Aguardando resposta do Gemini...";
  if (seconds < 30) return "Processando conteúdo (pode levar até 1 minuto)...";
  if (seconds < 45) return "Gerando estrutura do email...";
  return "Finalizando... por favor aguarde...";
};

const TIMEOUT_MS = 60000;

// Estilo "Golden Hour" para hero images - tons quentes e atmosfera cinematográfica com LARANJA VIBRANTE
const HERO_IMAGE_STYLE_SUFFIX = `Cinematic photography with STRONG VIBRANT ORANGE lighting. Deep orange and warm amber color palette dominating the entire scene. Intense golden-orange backlighting creating glowing atmosphere. The entire scene should have a prominent orange and amber color cast. High saturation on warm tones, rich orange highlights and shadows. Dreamy aesthetic with orange-dominated ambiance, high-end editorial style.`;

// Sufixo para imagens com bordas decorativas e ícones 3D em LARANJA VIBRANTE
const HERO_IMAGE_BORDERS_SUFFIX = `The image has slightly rounded corners with MINIMAL white margins (the rounded frame should occupy approximately 95% of the canvas width and 90% of the height). 3D glowing icons in VIBRANT SATURATED ORANGE and RED-ORANGE colors are floating and overlapping the edges of the rounded image frame. The icons MUST be bright, highly saturated, with neon-like orange glow, NOT pale or translucent. The icons are thematic and DIRECTLY RELATED to the scene subject matter, creating depth and dynamism. Icons should have intense orange and red inner glow with soft luminous shadows. Very thin white border around the frame.`;

const applyContentToHtml = (htmlTemplate: string, content: any, blockName?: string): string => {
  if (!content) return htmlTemplate;

  let html = htmlTemplate;

  // Special handling for Welcome block
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

// Function to replace image src in HTML
const replaceImageSrc = (html: string, newImageUrl: string): string => {
  // Replace any img src with the new URL
  return html.replace(
    /<img([^>]*?)src="[^"]*"([^>]*?)>/gi,
    `<img$1src="${newImageUrl}"$2>`
  );
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
  const [progressPhase, setProgressPhase] = useState<'generating' | 'hero'>('generating');
  
  // Hero image generation states
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [heroBlockInfo, setHeroBlockInfo] = useState<HeroBlockInfo | null>(null);
  const [pendingEmailData, setPendingEmailData] = useState<{
    emailStructure: AIResponse;
    selectedBlocks: any[];
  } | null>(null);
  const [generatingHero, setGeneratingHero] = useState(false);
  
  // Error handling states
  const [heroError, setHeroError] = useState<string | null>(null);
  const [lastCharacterSelection, setLastCharacterSelection] = useState<{
    character: Character;
    editedPrompt: string;
    withBorders: boolean;
  } | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  // Elapsed time counter and progress message
  useEffect(() => {
    if (generating || generatingHero) {
      const phase = generatingHero ? 'hero' : 'generating';
      setProgressPhase(phase);
      setProgressMessage(getProgressMessage(0, phase));
      
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => {
          const newTime = prev + 1;
          setProgressMessage(getProgressMessage(newTime, phase));
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
  }, [generating, generatingHero]);

  // Cleanup realtime channel on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const handleCancel = () => {
    setCancelled(true);
    setGenerating(false);
    setGeneratingHero(false);
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
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

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("TIMEOUT"));
        }, TIMEOUT_MS);
      });

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
          const aiBlockName = aiBlock.name || aiBlock.type;
          
          let matchingBlock = allBlocks.find(
            (dbBlock: EmailBlock) => dbBlock.name === aiBlockName
          );

          if (!matchingBlock && aiBlockName) {
            matchingBlock = allBlocks.find(
              (dbBlock: EmailBlock) => dbBlock.name.toLowerCase() === aiBlockName.toLowerCase()
            );
          }

          if (!matchingBlock && aiBlock.category) {
            matchingBlock = allBlocks.find(
              (dbBlock: EmailBlock) => dbBlock.category?.toLowerCase() === aiBlock.category?.toLowerCase()
            );
          }

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
            aiContent: aiBlock.content, // Keep original AI content for hero detection
          };
        })
        .filter(Boolean);

      if (selectedBlocks.length === 0) {
        throw new Error("Não foi possível mapear os blocos gerados");
      }

      // Check for hero image blocks
      const heroBlockIndex = selectedBlocks.findIndex(
        (block: any) => block.aiContent?.isHeroImage === true
      );

      if (heroBlockIndex !== -1) {
        const heroBlock = selectedBlocks[heroBlockIndex];
        const heroPrompt = heroBlock.aiContent?.heroPrompt || `ilustrando: ${emailStructure.category || emailStructure.name}`;
        
        console.log("Hero image block encontrado:", heroPrompt);
        
        // Store pending data and show character selection modal
        setPendingEmailData({ emailStructure, selectedBlocks });
        setHeroBlockInfo({ index: heroBlockIndex, heroPrompt });
        setGenerating(false);
        setShowCharacterModal(true);
        return;
      }

      // No hero image, proceed directly to save
      await saveEmailTemplate(emailStructure, selectedBlocks);
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
      if (!cancelled && !showCharacterModal) {
        setGenerating(false);
      }
    }
  };

  const handleCharacterSelect = async (character: Character, editedPrompt: string, withBorders: boolean) => {
    if (!pendingEmailData || !heroBlockInfo) return;

    // Save selection for retry
    setLastCharacterSelection({ character, editedPrompt, withBorders });
    setHeroError(null);
    setGeneratingHero(true);
    setElapsedTime(0);

    try {
      // Montar prompt com PRIORIDADE para o tema do usuário, depois persona, depois estilo
      let fullPrompt = `SCENE REQUIREMENT (MUST FOLLOW): ${editedPrompt}. ${character.general_prompt ? character.general_prompt + " " : ""}${HERO_IMAGE_STYLE_SUFFIX}`;
      
      // Adicionar sufixo de bordas se ativado
      if (withBorders) {
        fullPrompt += ` ${HERO_IMAGE_BORDERS_SUFFIX}`;
      }
      
      const imageUrls = character.images.map((img) => img.image_url);

      console.log("Gerando hero image com persona:", character.name);
      console.log("Com bordas:", withBorders);
      console.log("Prompt completo:", fullPrompt);

      const { data, error } = await supabase.functions.invoke("generate-character-image", {
        body: {
          imageUrls: imageUrls,
          prompt: fullPrompt,
          generalPrompt: character.general_prompt,
          characterName: character.name,
          characterId: character.id,
          aspectRatio: "16:9", // Banner format
        },
      });

      if (error) throw error;

      if (data?.recordId) {
        console.log("Geração iniciada, aguardando via Realtime:", data.recordId);
        
        // Setup realtime listener for the generated image
        channelRef.current = supabase
          .channel(`hero_image_${data.recordId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'generated_images',
              filter: `id=eq.${data.recordId}`
            },
            async (payload) => {
              const updatedImage = payload.new as any;
              console.log("Realtime update:", updatedImage.status);

              if (updatedImage.status === 'completed') {
                const imageUrl = updatedImage.image_url;
                console.log("Hero image gerada:", imageUrl);
                
                // Update the hero block HTML with the new image
                const updatedBlocks = [...pendingEmailData.selectedBlocks];
                if (updatedBlocks[heroBlockInfo.index]) {
                  updatedBlocks[heroBlockInfo.index].customHtml = replaceImageSrc(
                    updatedBlocks[heroBlockInfo.index].customHtml,
                    imageUrl
                  );
                }

                // Cleanup and save
                supabase.removeChannel(channelRef.current);
                setGeneratingHero(false);
                setShowCharacterModal(false);
                setLastCharacterSelection(null);
                
                await saveEmailTemplate(pendingEmailData.emailStructure, updatedBlocks);
                
                toast({
                  title: "Imagem gerada!",
                  description: `Banner criado com ${character.name}`,
                });
              } else if (updatedImage.status === 'failed') {
                console.error("Erro na geração:", updatedImage.error_message);
                
                supabase.removeChannel(channelRef.current);
                setGeneratingHero(false);
                setHeroError(updatedImage.error_message || "Não foi possível gerar a imagem.");
              }
            }
          )
          .subscribe();
      }
    } catch (error: any) {
      console.error("Erro ao gerar hero image:", error);
      setGeneratingHero(false);
      setHeroError(error.message || "Não foi possível gerar a imagem.");
    }
  };

  const handleRetryHeroImage = () => {
    if (lastCharacterSelection) {
      setHeroError(null);
      handleCharacterSelect(
        lastCharacterSelection.character,
        lastCharacterSelection.editedPrompt,
        lastCharacterSelection.withBorders
      );
    }
  };

  const handleSkipAfterError = async () => {
    if (!pendingEmailData) return;
    
    setHeroError(null);
    setShowCharacterModal(false);
    setLastCharacterSelection(null);
    await saveEmailTemplate(pendingEmailData.emailStructure, pendingEmailData.selectedBlocks);
  };

  const handleSkipHeroImage = async () => {
    if (!pendingEmailData) return;
    
    setHeroError(null);
    setShowCharacterModal(false);
    setLastCharacterSelection(null);
    await saveEmailTemplate(pendingEmailData.emailStructure, pendingEmailData.selectedBlocks);
  };

  const saveEmailTemplate = async (emailStructure: AIResponse, selectedBlocks: any[]) => {
    try {
      // Generate HTML content
      const htmlContent = selectedBlocks.map((block) => block.customHtml || block.html_template).join("\n");

      // Clean up aiContent from blocks before saving
      const blocksToSave = selectedBlocks.map(({ aiContent, ...block }) => block);

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
          blocks_data: blocksToSave,
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
      handleClose();
    } catch (error: any) {
      console.error("Erro ao salvar template:", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar email",
        description: error.message || "Não foi possível salvar o email",
      });
    } finally {
      setGenerating(false);
      setGeneratingHero(false);
      setPendingEmailData(null);
      setHeroBlockInfo(null);
    }
  };

  const handleClose = () => {
    if (!generating && !generatingHero) {
      setDescription("");
      setPendingEmailData(null);
      setHeroBlockInfo(null);
      setShowCharacterModal(false);
      setHeroError(null);
      setLastCharacterSelection(null);
      onClose();
    }
  };

  const isLoading = generating || generatingHero;

  return (
    <>
      <Dialog open={open && !showCharacterModal} onOpenChange={handleClose}>
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
                disabled={isLoading}
              />
            </div>

            {isLoading && (
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
                disabled={isLoading}
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
              {isLoading ? (
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

      <SelectCharacterModal
        open={showCharacterModal && !heroError}
        onClose={handleSkipHeroImage}
        onSelect={handleCharacterSelect}
        heroPrompt={heroBlockInfo?.heroPrompt || ""}
        loading={generatingHero}
      />

      {/* Error Dialog */}
      <AlertDialog open={!!heroError} onOpenChange={() => setHeroError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Erro na geração da imagem
            </AlertDialogTitle>
            <AlertDialogDescription>
              {heroError}
              <br /><br />
              Deseja tentar novamente ou continuar sem a imagem do banner?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSkipAfterError}>
              Continuar sem imagem
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRetryHeroImage} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
