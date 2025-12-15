import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { Test } from "@/types/test";
import { TestReportModal } from "./TestReportModal";

interface PDFReportGeneratorProps {
  test: Test;
}

export function PDFReportGenerator({ test }: PDFReportGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" size="sm">
        <FileDown className="h-4 w-4 mr-2" />
        Gerar relatório
      </Button>

      <TestReportModal
        open={isOpen}
        onOpenChange={setIsOpen}
        test={test}
      />
    </>
  );
}
