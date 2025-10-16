import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  imageUrl: string;
  onUpload: (file: File) => void;
  disabled?: boolean;
  className?: string;
  aspectRatio?: string;
}

export const ImageUploader = ({ 
  imageUrl, 
  onUpload, 
  disabled, 
  className,
  aspectRatio = 'aspect-video'
}: ImageUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    onUpload(file);
    
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    setUploading(false);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'relative overflow-hidden rounded-lg cursor-pointer group',
        aspectRatio,
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt="Upload"
            className="w-full h-full object-cover"
          />
          {!disabled && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload className="h-8 w-8 text-white" />
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <div className="text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Clique para fazer upload</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
