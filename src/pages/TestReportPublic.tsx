import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Test } from "@/types/test";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileDown, Image as ImageIcon, Calendar, Clock, Target, Users, Lightbulb, FileText, Link as LinkIcon, Paperclip, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

const statusConfig = {
  planejamento: { label: "Planejamento", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  execucao: { label: "Execução", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  analise: { label: "Análise", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  documentacao: { label: "Documentação", color: "bg-green-500/10 text-green-600 border-green-500/20" },
};

export default function TestReportPublic() {
  const [searchParams] = useSearchParams();
  const shareCode = searchParams.get("code");
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data: test, isLoading, error } = useQuery({
    queryKey: ["test-public", shareCode],
    queryFn: async () => {
      if (!shareCode) return null;
      const { data, error } = await supabase
        .from("tests")
        .select("*")
        .eq("share_code", shareCode)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Test;
    },
    enabled: !!shareCode,
  });

  const handleExportPDF = async () => {
    const element = reportRef.current;
    if (!element || !test) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;

      let heightLeft = imgHeight * ratio;
      let position = 0;

      pdf.addImage(imgData, "PNG", imgX, position, imgWidth * ratio, imgHeight * ratio);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight * ratio;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", imgX, position, imgWidth * ratio, imgHeight * ratio);
        heightLeft -= pdfHeight;
      }

      pdf.save(`relatorio-${test.nome_teste.replace(/\s+/g, "-")}.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao exportar PDF: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJPG = async () => {
    const element = reportRef.current;
    if (!element || !test) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const link = document.createElement("a");
      link.download = `relatorio-${test.nome_teste.replace(/\s+/g, "-")}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();

      toast.success("Imagem exportada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao exportar imagem: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  if (!shareCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Link inválido</h1>
          <p className="text-muted-foreground">O código de compartilhamento não foi fornecido.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Relatório não encontrado</h1>
          <p className="text-muted-foreground">O relatório solicitado não existe ou não está mais disponível.</p>
        </div>
      </div>
    );
  }

  const status = statusConfig[test.status];
  const duration = test.start_date && test.end_date
    ? differenceInDays(new Date(test.end_date), new Date(test.start_date))
    : null;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Header com botões de export */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <h1 className="text-xl font-semibold text-foreground">Relatório de Teste</h1>
          <div className="flex gap-2">
            <Button onClick={handleExportPDF} disabled={isExporting} size="sm" variant="outline" className="gap-2">
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              PDF
            </Button>
            <Button onClick={handleExportJPG} disabled={isExporting} size="sm" variant="outline" className="gap-2">
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              JPG
            </Button>
          </div>
        </div>

        {/* Conteúdo do Relatório */}
        <div ref={reportRef} className="bg-card rounded-lg border p-8 space-y-6">
          {/* Cabeçalho */}
          <div className="border-b pb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">{test.nome_teste}</h2>
                <Badge variant="outline" className={status.color}>
                  {status.label}
                </Badge>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>Relatório gerado em</p>
                <p className="font-medium">{format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
              </div>
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Período</p>
                <p className="font-medium text-foreground">
                  {test.start_date ? format(new Date(test.start_date), "dd/MM/yyyy") : "Não definido"}
                  {" - "}
                  {test.end_date ? format(new Date(test.end_date), "dd/MM/yyyy") : "Não definido"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Duração</p>
                <p className="font-medium text-foreground">
                  {duration !== null ? `${duration} dias` : "Não calculada"}
                </p>
              </div>
            </div>
          </div>

          {/* Hipótese */}
          <div className="bg-primary/5 rounded-lg p-5 border border-primary/20">
            <div className="flex items-center gap-2 text-primary mb-3">
              <Lightbulb className="h-5 w-5" />
              <h3 className="font-semibold">Hipótese</h3>
            </div>
            <p className="text-foreground leading-relaxed">{test.hypothesis}</p>
          </div>

          {/* Tipos e Ferramentas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                Tipos de Teste
              </h3>
              <div className="flex flex-wrap gap-2">
                {test.test_types.map((type) => (
                  <Badge key={type} variant="secondary">{type}</Badge>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-3">Ferramentas</h3>
              <div className="flex flex-wrap gap-2">
                {test.tools.map((tool) => (
                  <Badge key={tool} variant="outline">{tool}</Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Público e Elementos */}
          {(test.target_audience || test.tested_elements) && (
            <div className="grid grid-cols-2 gap-4">
              {test.target_audience && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-foreground">Público-alvo</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{test.target_audience}</p>
                </div>
              )}
              {test.tested_elements && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">Elementos Testados</h3>
                  <p className="text-sm text-muted-foreground">{test.tested_elements}</p>
                </div>
              )}
            </div>
          )}

          {/* Métricas de Sucesso */}
          {test.success_metric && test.success_metric.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-3">Métricas de Sucesso</h3>
              <div className="flex flex-wrap gap-2">
                {test.success_metric.map((metric) => (
                  <Badge key={metric} variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                    {metric}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Insights */}
          {test.insights && (
            <div className="bg-blue-500/5 rounded-lg p-5 border border-blue-500/20">
              <div className="flex items-center gap-2 text-blue-600 mb-3">
                <FileText className="h-5 w-5" />
                <h3 className="font-semibold">Insights / Dados Coletados</h3>
              </div>
              <div 
                className="text-foreground prose prose-sm max-w-none leading-relaxed"
                dangerouslySetInnerHTML={{ __html: test.insights }}
              />
            </div>
          )}

          {/* Criativos / Imagens */}
          {(test as any).test_images && (test as any).test_images.length > 0 && (
            <div className="bg-indigo-500/5 rounded-lg p-5 border border-indigo-500/20">
              <div className="flex items-center gap-2 text-indigo-600 mb-4">
                <ImageIcon className="h-5 w-5" />
                <h3 className="font-semibold">Criativos ({(test as any).test_images.length})</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {(test as any).test_images.map((image: any, index: number) => (
                  <div key={index} className="space-y-2">
                    <img 
                      src={image.url} 
                      alt={image.caption || `Criativo ${index + 1}`}
                      className="w-full rounded-lg border object-cover"
                    />
                    {image.caption && (
                      <p className="text-center text-sm font-medium text-foreground">
                        {image.caption}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Anexos */}
          {test.attachments && test.attachments.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                Anexos ({test.attachments.length})
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {test.attachments.map((attachment, index) => (
                  <a
                    key={index}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground truncate">{attachment.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {test.links && test.links.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                Links ({test.links.length})
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {test.links.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground truncate">{link.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
