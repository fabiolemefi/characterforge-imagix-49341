import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  const handleGenerate = async () => {
    if (!reportData.trim()) {
      toast({
        title: "Dados obrigatórios",
        description: "Por favor, cole os dados do relatório antes de gerar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

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

      if (data?.imageUrl) {
        console.log("[EfiReport] Image generated successfully:", data.imageUrl);
        setGeneratedImage(data.imageUrl);
        setModalOpen(false);
        toast({
          title: "Infográfico gerado!",
          description: "Seu relatório visual está pronto.",
        });
      } else {
        throw new Error("Nenhuma imagem foi gerada");
      }
    } catch (error: any) {
      console.error("[EfiReport] Error:", error);
      toast({
        title: "Erro ao gerar relatório",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setGeneratedImage(null);
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
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
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
                className="w-full bg-[#f37021] hover:bg-[#d4611d] text-white font-semibold py-6 text-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Gerando infográfico... (pode levar até 60s)
                  </>
                ) : (
                  "Gerar relatório lindão"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Resultado */}
        {generatedImage && !modalOpen && (
          <div className="flex flex-col items-center justify-center gap-6">
            <h1 className="text-2xl font-bold text-foreground">Seu infográfico está pronto!</h1>
            
            <div className="relative max-w-2xl w-full shadow-2xl rounded-lg overflow-hidden border border-border">
              <img
                src={generatedImage}
                alt="Infográfico gerado"
                className="w-full h-auto"
              />
            </div>

            <div className="flex gap-4">
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
            </div>
          </div>
        )}

        {/* Estado vazio quando modal fechado sem imagem */}
        {!generatedImage && !modalOpen && (
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
