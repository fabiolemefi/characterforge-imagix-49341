import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Download, Check } from "lucide-react";
import { toast } from "sonner";

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  linkName?: string;
}

export function QRCodeModal({ open, onOpenChange, url, linkName }: QRCodeModalProps) {
  const [svgContent, setSvgContent] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const svgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && url) {
      generateQRCode();
    }
  }, [open, url]);

  const generateQRCode = async () => {
    try {
      const svg = await QRCode.toString(url, {
        type: "svg",
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
      setSvgContent(svg);
    } catch (error) {
      console.error("Erro ao gerar QR Code:", error);
      toast.error("Erro ao gerar QR Code");
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("URL copiada!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Erro ao copiar URL");
    }
  };

  const handleDownloadSVG = () => {
    if (!svgContent) return;

    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `qrcode-${linkName || "efilink"}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
    toast.success("QR Code baixado!");
  };

  const handleDownloadPNG = async () => {
    if (!url) return;

    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 512,
        margin: 2,
      });
      
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `qrcode-${linkName || "efilink"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("QR Code PNG baixado!");
    } catch (error) {
      toast.error("Erro ao baixar PNG");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {/* QR Code */}
          <div
            ref={svgRef}
            className="bg-white p-4 rounded-lg"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />

          {/* URL */}
          <div className="w-full p-3 bg-muted rounded-lg text-sm break-all text-center">
            {url}
          </div>

          {/* Ações */}
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCopyUrl}
            >
              {copied ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Copiar URL
            </Button>

            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDownloadSVG}
            >
              <Download className="h-4 w-4 mr-2" />
              SVG
            </Button>

            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDownloadPNG}
            >
              <Download className="h-4 w-4 mr-2" />
              PNG
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
