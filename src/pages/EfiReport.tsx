import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Download, Loader2, FileText } from "lucide-react";
import { Helmet } from "react-helmet";

export default function EfiReport() {
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(true);
  const [reportData, setReportData] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [activePredictionId, setActivePredictionId] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const errorCountRef = useRef<number>(0);

  // Reset all loading states
  const resetLoadingState = useCallback(() => {
    setLoading(false);
    setActivePredictionId(null);
    setStatusMessage("");
    errorCountRef.current = 0;
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Global timeout: 3 minutes max for any prediction
  useEffect(() => {
    if (loading && activePredictionId) {
      timeoutRef.current = setTimeout(() => {
        console.warn("[EfiReport] Global timeout reached (3 minutes)");
        resetLoadingState();
        toast({
          title: "Tempo esgotado",
          description: "A geração demorou mais do que o esperado. Tente novamente.",
          variant: "destructive",
        });
      }, 180000); // 3 minutes

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    }
  }, [loading, activePredictionId, resetLoadingState, toast]);

  const checkPredictionStatus = useCallback(async (predictionId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-efi-report", {
        body: { predictionId },
      });

      if (error) {
        console.error("[EfiReport] Status check error:", error);
        errorCountRef.current++;
        
        // After 5 consecutive errors, stop polling
        if (errorCountRef.current >= 5) {
          console.error("[EfiReport] Too many consecutive errors, stopping polling");
          resetLoadingState();
          toast({
            title: "Erro de comunicação",
            description: "Falha ao verificar o status. Tente gerar novamente.",
            variant: "destructive",
          });
          return true; // Stop polling
        }
        return false;
      }

      // Reset error count on successful response
      errorCountRef.current = 0;

      console.log("[EfiReport] Status:", data?.status);

      if (data?.status === "succeeded" && data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        setModalOpen(false);
        resetLoadingState();
        toast({
          title: "Infográfico gerado!",
          description: "Seu relatório visual está pronto.",
        });
        return true;
      } else if (data?.status === "failed") {
        resetLoadingState();
        toast({
          title: "Erro na geração",
          description: data?.error || "Falha ao gerar o infográfico.",
          variant: "destructive",
        });
        return true;
      } else if (data?.status === "canceled") {
        resetLoadingState();
        toast({
          title: "Geração cancelada",
          description: "A geração foi cancelada.",
          variant: "destructive",
        });
        return true;
      }

      // Still processing
      setStatusMessage(`Status: ${data?.status || 'processando'}...`);
      return false;
    } catch (error) {
      console.error("[EfiReport] Polling error:", error);
      errorCountRef.current++;
      
      if (errorCountRef.current >= 5) {
        console.error("[EfiReport] Too many consecutive errors, stopping polling");
        resetLoadingState();
        toast({
          title: "Erro de comunicação",
          description: "Falha ao verificar o status. Tente gerar novamente.",
          variant: "destructive",
        });
        return true;
      }
      return false;
    }
  }, [toast, resetLoadingState]);

  const handleGenerate = async () => {
    if (!reportData.trim()) {
      toast({
        title: "Dados obrigatórios",
        description: "Por favor, cole os dados do relatório antes de gerar.",
        variant: "destructive",
      });
      return;
    }

    // Reset any previous state
    resetLoadingState();
    setLoading(true);
    setStatusMessage("Analisando dados...");
    errorCountRef.current = 0;

    try {
      console.log("[EfiReport] Starting report generation...");
      
      const { data, error } = await supabase.functions.invoke("generate-efi-report", {
        body: { reportData },
      });

      if (error) {
        console.error("[EfiReport] Function error:", error);
        throw error;
      }

      if (data?.error) {
        console.error("[EfiReport] Data error:", data.error);
        throw new Error(data.error);
      }

      if (data?.predictionId) {
        console.log("[EfiReport] Prediction started:", data.predictionId);
        setActivePredictionId(data.predictionId);
        setStatusMessage("Gerando infográfico...");
        
        // Store recommendations from initial response
        if (data?.recommendations) {
          setRecommendations(data.recommendations);
        }
        
        // Start polling
        let attempts = 0;
        const maxAttempts = 90; // 3 minutes max (90 * 2s = 180s)
        
        pollingRef.current = setInterval(async () => {
          attempts++;
          
          if (attempts > maxAttempts) {
            console.warn("[EfiReport] Max polling attempts reached");
            resetLoadingState();
            toast({
              title: "Tempo esgotado",
              description: "A geração demorou mais do que o esperado. Tente novamente.",
              variant: "destructive",
            });
            return;
          }

          const completed = await checkPredictionStatus(data.predictionId);
          if (completed && pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }, 2000); // Check every 2 seconds
      } else {
        throw new Error("Nenhum ID de predição retornado");
      }
    } catch (error: any) {
      console.error("[EfiReport] Error:", error);
      resetLoadingState();
      toast({
        title: "Erro ao gerar relatório",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = () => {
    resetLoadingState();
    setGeneratedImage(null);
    setRecommendations(null);
    setModalOpen(true);
  };

  const handleDownload = async () => {
    if (!generatedImage) return;

    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `efi-report-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download iniciado",
        description: "O infográfico está sendo baixado.",
      });
    } catch (error) {
      console.error("[EfiReport] Download error:", error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar a imagem.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Efí Report | Martech Efi</title>
        <meta name="description" content="Gere infográficos profissionais a partir de dados de relatórios" />
      </Helmet>

      <div className="min-h-[calc(100vh-80px)] p-8">
        {/* Modal de entrada */}
        <Dialog open={modalOpen} onOpenChange={(open) => !loading && setModalOpen(open)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5 text-primary" />
                Efí Report
              </DialogTitle>
              <DialogDescription>
                Cole os dados do seu relatório e gere um infográfico profissional automaticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <Textarea
                placeholder="Cole aqui os dados do seu relatório (métricas, resultados, análises, etc.)..."
                value={reportData}
                onChange={(e) => setReportData(e.target.value)}
                className="min-h-[250px] resize-none"
                disabled={loading}
              />

              <Button
                onClick={handleGenerate}
                disabled={loading || !reportData.trim()}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {!activePredictionId ? "Analisando dados..." : (statusMessage || "Gerando infográfico...")}
                  </>
                ) : (
                  "Gerar relatório lindão"
                )}
              </Button>

              {loading && (
                <p className="text-sm text-muted-foreground text-center">
                  Isso pode levar até 2 minutos. Não feche esta janela.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Resultado */}
        {generatedImage && !modalOpen && (
          <div className="flex flex-col items-center justify-center gap-6">
            <h1 className="text-2xl font-bold text-foreground">Seu infográfico está pronto!</h1>
            
            {/* Recommendations Accordion - Closed by default, above image */}
            {recommendations && (
              <Accordion type="single" collapsible className="max-w-2xl w-full">
                <AccordionItem value="recommendations" className="border border-border rounded-lg bg-card">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <span className="flex items-center gap-2 text-base font-semibold">
                      <FileText className="h-5 w-5 text-primary" />
                      Recomendações e Insights
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {recommendations.split('\n').map((line, index) => {
                        if (!line.trim()) return <br key={index} />;
                        if (line.startsWith('# ')) return <h2 key={index} className="text-lg font-bold mt-4 mb-2">{line.slice(2)}</h2>;
                        if (line.startsWith('## ')) return <h3 key={index} className="text-md font-semibold mt-3 mb-2">{line.slice(3)}</h3>;
                        if (line.startsWith('### ')) return <h4 key={index} className="text-sm font-semibold mt-2 mb-1">{line.slice(4)}</h4>;
                        if (line.startsWith('- ') || line.startsWith('* ')) {
                          return (
                            <div key={index} className="flex items-start gap-2 my-1">
                              <span className="text-primary mt-1">•</span>
                              <span>{line.slice(2)}</span>
                            </div>
                          );
                        }
                        if (line.match(/^\d+\. /)) {
                          return (
                            <div key={index} className="flex items-start gap-2 my-1">
                              <span className="text-primary font-medium">{line.match(/^\d+/)?.[0]}.</span>
                              <span>{line.replace(/^\d+\. /, '')}</span>
                            </div>
                          );
                        }
                        // Bold text
                        const boldProcessed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                        return <p key={index} className="my-2" dangerouslySetInnerHTML={{ __html: boldProcessed }} />;
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            <div className="relative max-w-2xl w-full shadow-2xl rounded-lg overflow-hidden border border-border">
              <img
                src={generatedImage}
                alt="Infográfico gerado"
                className="w-full h-auto"
              />
            </div>

            <div className="flex gap-4 mt-4">
              <Button
                variant="outline"
                onClick={handleRefresh}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refazer
              </Button>
              
              <Button
                onClick={handleDownload}
                className="flex items-center gap-2 bg-[#f37021] hover:bg-[#d4611d]"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>

              <Button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90"
              >
                <FileText className="h-4 w-4" />
                Criar novo relatório
              </Button>
            </div>
          </div>
        )}

        {/* Estado vazio quando modal fechado sem imagem */}
        {!generatedImage && !modalOpen && !loading && (
          <div className="flex flex-col items-center justify-center gap-4 min-h-[400px]">
            <FileText className="h-16 w-16 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum infográfico gerado ainda.</p>
            <Button onClick={() => setModalOpen(true)}>
              Criar novo infográfico
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
