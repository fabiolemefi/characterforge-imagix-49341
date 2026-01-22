import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEfiImageLibrary, EfiLibraryImage } from '@/hooks/useEfiImageLibrary';
import { Search, ImageIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImagePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectImage: (image: EfiLibraryImage) => void;
}

export const ImagePickerModal = ({ open, onOpenChange, onSelectImage }: ImagePickerModalProps) => {
  const { categories, images, isLoadingImages } = useEfiImageLibrary();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState<EfiLibraryImage | null>(null);

  const filteredImages = images.filter(img => {
    if (!img.is_active) return false;
    const matchesCategory = !selectedCategory || img.category_id === selectedCategory;
    const matchesSearch = !searchTerm || 
      img.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      img.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleSelect = () => {
    if (selectedImage) {
      onSelectImage(selectedImage);
      onOpenChange(false);
      setSelectedImage(null);
      setSearchTerm('');
      setSelectedCategory(null);
    }
  };

  const handleImageClick = (image: EfiLibraryImage) => {
    setSelectedImage(image);
  };

  const handleImageDoubleClick = (image: EfiLibraryImage) => {
    onSelectImage(image);
    onOpenChange(false);
    setSelectedImage(null);
    setSearchTerm('');
    setSelectedCategory(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Selecionar Imagem</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-wrap gap-2 pb-4 border-b">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            Todas
          </Button>
          {categories.filter(c => c.is_active).map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </Button>
          ))}
          
          <div className="flex-1 min-w-[200px] relative ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="pl-10 h-9"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto py-4">
          {isLoadingImages ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
              <ImageIcon className="h-12 w-12" />
              <span>Nenhuma imagem encontrada</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {filteredImages.map((image) => (
                <div
                  key={image.id}
                  className={cn(
                    "relative border rounded-lg overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary/50",
                    selectedImage?.id === image.id && "ring-2 ring-primary"
                  )}
                  onClick={() => handleImageClick(image)}
                  onDoubleClick={() => handleImageDoubleClick(image)}
                >
                  <div className="aspect-square flex items-center justify-center p-2 bg-secondary/30">
                    <img
                      src={image.url}
                      alt={image.alt_text || image.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  
                  <div className="p-1.5 border-t bg-background">
                    <p className="text-xs font-medium truncate text-center">{image.name}</p>
                  </div>
                  
                  {selectedImage?.id === image.id && (
                    <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSelect} disabled={!selectedImage}>
            Selecionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
