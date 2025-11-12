import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, File } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Attachment } from "@/types/test";

interface AttachmentsSectionProps {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
  disabled?: boolean;
}

export function AttachmentsSection({
  attachments,
  onChange,
  disabled,
}: AttachmentsSectionProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo: 20MB");
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from("test-attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("test-attachments")
        .getPublicUrl(filePath);

      const newAttachment: Attachment = {
        name: file.name,
        url: publicUrl,
        type: file.type,
        size: file.size,
        uploaded_at: new Date().toISOString(),
      };

      onChange([...attachments, newAttachment]);
      toast.success("Arquivo enviado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao enviar arquivo: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    onChange(newAttachments);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Anexos</label>
        <div className="mt-2">
          <Input
            type="file"
            onChange={handleFileUpload}
            disabled={disabled || uploading}
            className="cursor-pointer"
          />
        </div>
      </div>

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-2">
                <File className="h-4 w-4" />
                <div>
                  <p className="text-sm font-medium">{attachment.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(attachment.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                >
                  <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                    <Upload className="h-4 w-4" />
                  </a>
                </Button>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
