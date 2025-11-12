import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import jsPDF from "jspdf";
import { Test } from "@/types/test";
import { toast } from "sonner";

interface PDFReportGeneratorProps {
  test: Test;
}

export function PDFReportGenerator({ test }: PDFReportGeneratorProps) {
  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      let yPos = 20;

      // Título
      doc.setFontSize(20);
      doc.text("Relatório de Teste", 20, yPos);
      yPos += 15;

      // Informações do teste
      doc.setFontSize(12);
      doc.text(`Nome: ${test.nome_teste}`, 20, yPos);
      yPos += 10;

      doc.text(`Status: ${test.status}`, 20, yPos);
      yPos += 10;

      doc.text(`Hipótese:`, 20, yPos);
      yPos += 7;
      doc.setFontSize(10);
      const hypothesisLines = doc.splitTextToSize(test.hypothesis, 170);
      doc.text(hypothesisLines, 20, yPos);
      yPos += (hypothesisLines.length * 7) + 5;

      doc.setFontSize(12);
      doc.text(`Tipos de Teste: ${test.test_types.join(", ")}`, 20, yPos);
      yPos += 10;

      doc.text(`Ferramentas: ${test.tools.join(", ")}`, 20, yPos);
      yPos += 10;

      if (test.target_audience) {
        doc.text(`Público-alvo: ${test.target_audience}`, 20, yPos);
        yPos += 10;
      }

      if (test.tested_elements) {
        doc.text(`Elementos testados: ${test.tested_elements}`, 20, yPos);
        yPos += 10;
      }

      if (test.success_metric) {
        doc.text(`Métrica de sucesso: ${test.success_metric}`, 20, yPos);
        yPos += 10;
      }

      if (test.start_date || test.end_date) {
        doc.text(
          `Período: ${test.start_date || "N/A"} até ${test.end_date || "N/A"}`,
          20,
          yPos
        );
        yPos += 15;
      }

      // Anexos
      if (test.attachments.length > 0) {
        doc.text("Anexos:", 20, yPos);
        yPos += 7;
        doc.setFontSize(10);
        test.attachments.forEach((attachment) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`- ${attachment.name}`, 25, yPos);
          yPos += 7;
        });
        yPos += 5;
      }

      // Links
      if (test.links.length > 0) {
        doc.setFontSize(12);
        doc.text("Links Úteis:", 20, yPos);
        yPos += 7;
        doc.setFontSize(10);
        test.links.forEach((link) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`- ${link.title}: ${link.url}`, 25, yPos);
          yPos += 7;
        });
      }

      // Rodapé
      const today = new Date().toLocaleDateString("pt-BR");
      doc.setFontSize(8);
      doc.text(`Gerado em: ${today}`, 20, 285);

      doc.save(`relatorio-${test.nome_teste.replace(/\s+/g, "-")}.pdf`);
      toast.success("Relatório gerado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao gerar relatório: " + error.message);
    }
  };

  return (
    <Button onClick={generatePDF} variant="outline" size="sm">
      <FileDown className="h-4 w-4 mr-2" />
      Gerar relatório
    </Button>
  );
}
