import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Test } from "@/types/test";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  FileDown,
  Calendar,
  Users,
  Lightbulb,
  FlaskConical,
  Wrench,
  TrendingUp,
  FileText,
  Paperclip,
  Link2,
  Loader2,
  Image as ImageIcon,
  Share2,
} from "lucide-react";
import { TestStatusBadge } from "./TestStatusBadge";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface TestReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test: Test;
}

export function TestReportModal({ open, onOpenChange, test }: TestReportModalProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const queryClient = useQueryClient();

  const formatDuration = () => {
    if (!test.start_date || !test.end_date) return null;
    const start = new Date(test.start_date);
    const end = new Date(test.end_date);
    const days = differenceInDays(end, start);
    
    if (days < 7) return `${days} dias`;
    if (days < 30) return `${Math.ceil(days / 7)} semanas`;
    return `${Math.ceil(days / 30)} meses`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  const handleExportPDF = async () => {
    const element = reportRef.current;
    if (!element) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight - 20;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight - 20;
      }

      pdf.save(`relatorio-${test.nome_teste.replace(/\s+/g, "-")}.pdf`);
      toast.success("Relatório exportado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao exportar relatório: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJPG = async () => {
    const element = reportRef.current;
    if (!element) return;

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

const generateShareCode = () => {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(36).padStart(2, '0'))
    .join('')
    .substring(0, 12);
};

const handleShare = async () => {
  setIsSharing(true);
  try {
    let code = test.share_code;

    if (!code) {
      code = generateShareCode();
      const { error } = await supabase
        .from("tests")
        .update({ share_code: code } as any)
        .eq("id", test.id);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      queryClient.invalidateQueries({ queryKey: ["test", test.id] });
    }

    const shareUrl = `${window.location.origin}/tests/report?code=${code}`;
    await navigator.clipboard.writeText(shareUrl);

    toast.success("Link copiado para a área de transferência!");
  } catch (error: any) {
    toast.error("Erro ao gerar link: " + error.message);
  } finally {
    setIsSharing(false);
  }
};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between pr-8">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-primary" />
            Relatório de Teste
          </DialogTitle>
          <div className="flex gap-2">
            <Button
              onClick={handleShare}
              disabled={isSharing}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              {isSharing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              Copiar Link
            </Button>
            <Button
              onClick={handleExportPDF}
              disabled={isExporting}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              PDF
            </Button>
            <Button
              onClick={handleExportJPG}
              disabled={isExporting}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
              JPG
            </Button>
          </div>
        </DialogHeader>

        <div ref={reportRef} className="bg-background p-6 space-y-6">
          {/* Header Card */}
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl p-6 border border-primary/20">
            <h1 className="text-2xl font-bold text-foreground mb-3">
              {test.nome_teste}
            </h1>
            <div className="flex items-center gap-3">
              <TestStatusBadge status={test.status} />
              {test.target_audience && (
                <Badge variant="outline" className="bg-background/50">
                  <Users className="h-3 w-3 mr-1" />
                  {test.target_audience}
                </Badge>
              )}
            </div>
          </div>

          {/* Period and Duration */}
          {(test.start_date || test.end_date) && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 border">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Período</span>
                </div>
                <p className="font-semibold">
                  {formatDate(test.start_date)} até {formatDate(test.end_date)}
                </p>
              </div>
              {formatDuration() && (
                <div className="bg-muted/50 rounded-lg p-4 border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Calendar className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Duração</span>
                  </div>
                  <p className="font-semibold">{formatDuration()}</p>
                </div>
              )}
            </div>
          )}

          {/* Hypothesis */}
          <div className="bg-amber-500/5 rounded-lg p-5 border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-600 mb-3">
              <Lightbulb className="h-5 w-5" />
              <h3 className="font-semibold">Hipótese</h3>
            </div>
            <p className="text-foreground leading-relaxed">{test.hypothesis}</p>
          </div>

          {/* Test Types and Tools */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-purple-500/5 rounded-lg p-5 border border-purple-500/20">
              <div className="flex items-center gap-2 text-purple-600 mb-3">
                <FlaskConical className="h-5 w-5" />
                <h3 className="font-semibold">Tipos de Teste</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {test.test_types.map((type, index) => (
                  <Badge key={index} variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="bg-cyan-500/5 rounded-lg p-5 border border-cyan-500/20">
              <div className="flex items-center gap-2 text-cyan-600 mb-3">
                <Wrench className="h-5 w-5" />
                <h3 className="font-semibold">Ferramentas</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {test.tools.map((tool, index) => (
                  <Badge key={index} variant="secondary" className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Tested Elements */}
          {test.tested_elements && (
            <div className="bg-muted/50 rounded-lg p-5 border">
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <FlaskConical className="h-5 w-5 text-indigo-500" />
                <h3 className="font-semibold">Elementos Testados</h3>
              </div>
              <p className="text-foreground">{test.tested_elements}</p>
            </div>
          )}

          {/* Success Metrics */}
          {test.success_metric && test.success_metric.length > 0 && (
            <div className="bg-green-500/5 rounded-lg p-5 border border-green-500/20">
              <div className="flex items-center gap-2 text-green-600 mb-3">
                <TrendingUp className="h-5 w-5" />
                <h3 className="font-semibold">Métricas de Sucesso</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {test.success_metric.map((metric, index) => (
                  <Badge key={index} variant="outline" className="bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
                    ✓ {metric}
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

          {/* Attachments and Links */}
          {(test.attachments.length > 0 || test.links.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              {test.attachments.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-5 border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-3">
                    <Paperclip className="h-5 w-5 text-orange-500" />
                    <h3 className="font-semibold">Anexos</h3>
                  </div>
                  <ul className="space-y-2">
                    {test.attachments.map((attachment, index) => (
                      <li key={index} className="text-sm flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline truncate"
                        >
                          {attachment.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {test.links.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-5 border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-3">
                    <Link2 className="h-5 w-5 text-violet-500" />
                    <h3 className="font-semibold">Links</h3>
                  </div>
                  <ul className="space-y-2">
                    {test.links.map((link, index) => (
                      <li key={index} className="text-sm flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline truncate"
                        >
                          {link.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t text-center text-sm text-muted-foreground">
            Gerado em {format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
