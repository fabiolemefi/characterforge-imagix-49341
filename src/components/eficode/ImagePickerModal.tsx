import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEfiImageLibrary, EfiLibraryImage } from '@/hooks/useEfiImageLibrary';
import { useEfiLibraryIcons, EfiLibraryIcon } from '@/hooks/useEfiLibraryIcons';
import { Search, ImageIcon, Check, Shapes } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImagePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectImage: (image: { url: string; name?: string }) => void;
}

export const ImagePickerModal = ({ open, onOpenChange, onSelectImage }: ImagePickerModalProps) => {
  const { categories, images, isLoadingImages } = useEfiImageLibrary();
  const { icons, isLoadingIcons, getGroupedIcons } = useEfiLibraryIcons();
  
  const [activeTab, setActiveTab] = useState<'images' | 'icons'>('images');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedIconGroup, setSelectedIconGroup] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<{ type: 'image' | 'icon'; item: EfiLibraryImage | EfiLibraryIcon } | null>(null);

  // Filter images
  const filteredImages = useMemo(() => {
    return images.filter(img => {
      if (!img.is_active) return false;
      const matchesCategory = !selectedCategory || img.category_id === selectedCategory;
      const matchesSearch = !searchTerm || 
        img.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        img.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [images, selectedCategory, searchTerm]);

  // Group and filter icons
  const groupedIcons = useMemo(() => getGroupedIcons(icons.filter(i => i.is_active)), [icons, getGroupedIcons]);
  
  const filteredIcons = useMemo(() => {
    const activeIcons = icons.filter(i => i.is_active);
    return activeIcons.filter(icon => {
      const matchesGroup = !selectedIconGroup || icon.group_prefix === selectedIconGroup;
      const matchesSearch = !searchTerm || 
        icon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        icon.filename.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesGroup && matchesSearch;
    });
  }, [icons, selectedIconGroup, searchTerm]);

  const iconGroups = Object.keys(groupedIcons);

  const handleSelect = () => {
    if (selectedItem) {
      onSelectImage({ 
        url: selectedItem.item.url, 
        name: selectedItem.item.name 
      });
      handleClose();
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedItem(null);
    setSearchTerm('');
    setSelectedCategory(null);
    setSelectedIconGroup(null);
  };

  const handleItemClick = (type: 'image' | 'icon', item: EfiLibraryImage | EfiLibraryIcon) => {
    setSelectedItem({ type, item });
  };

  const handleItemDoubleClick = (type: 'image' | 'icon', item: EfiLibraryImage | EfiLibraryIcon) => {
    onSelectImage({ url: item.url, name: item.name });
    handleClose();
  };

  // Reset filters when changing tabs
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'images' | 'icons');
    setSelectedItem(null);
    setSearchTerm('');
    setSelectedCategory(null);
    setSelectedIconGroup(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Selecionar da Biblioteca</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="images" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Imagens
            </TabsTrigger>
            <TabsTrigger value="icons" className="flex items-center gap-2">
              <Shapes className="h-4 w-4" />
              Ícones
            </TabsTrigger>
          </TabsList>

          {/* Images Tab */}
          <TabsContent value="images" className="flex-1 flex flex-col overflow-hidden mt-0">
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
                        selectedItem?.type === 'image' && selectedItem.item.id === image.id && "ring-2 ring-primary"
                      )}
                      onClick={() => handleItemClick('image', image)}
                      onDoubleClick={() => handleItemDoubleClick('image', image)}
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
                      
                      {selectedItem?.type === 'image' && selectedItem.item.id === image.id && (
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Icons Tab */}
          <TabsContent value="icons" className="flex-1 flex flex-col overflow-hidden mt-0">
            <div className="flex flex-wrap gap-2 pb-4 border-b">
              <Button
                variant={selectedIconGroup === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedIconGroup(null)}
              >
                Todos
              </Button>
              {iconGroups.map((group) => (
                <Button
                  key={group}
                  variant={selectedIconGroup === group ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedIconGroup(group)}
                  className="capitalize"
                >
                  {group}
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
              {isLoadingIcons ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : filteredIcons.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                  <Shapes className="h-12 w-12" />
                  <span>Nenhum ícone encontrado</span>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                  {filteredIcons.map((icon) => (
                    <div
                      key={icon.id}
                      className={cn(
                        "relative border rounded-lg overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 group",
                        selectedItem?.type === 'icon' && selectedItem.item.id === icon.id && "ring-2 ring-primary"
                      )}
                      onClick={() => handleItemClick('icon', icon)}
                      onDoubleClick={() => handleItemDoubleClick('icon', icon)}
                      title={icon.name}
                    >
                      <div className="aspect-square flex items-center justify-center p-2 bg-secondary/30">
                        <img
                          src={icon.url}
                          alt={icon.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      
                      {selectedItem?.type === 'icon' && selectedItem.item.id === icon.id && (
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-0 left-0 right-0 bg-background/90 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[10px] font-medium truncate text-center">{icon.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSelect} disabled={!selectedItem}>
            Selecionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
