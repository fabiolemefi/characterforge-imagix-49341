import { useState, useRef } from 'react';
import { useBrandKit } from '@/hooks/useBrandKit';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Folder, 
  FolderOpen,
  Trash2, 
  Upload, 
  Type,
  Palette,
  Image as ImageIcon,
  Edit2,
  Lock
} from 'lucide-react';
import { CanvaObject } from '@/types/canvaEditor';
import { Typography, TypographyStyle, BrandColor } from '@/types/brandKit';

interface BrandPanelProps {
  onAddObject: (object: CanvaObject) => void;
  onUpdateObject?: (id: string, updates: Partial<CanvaObject>) => void;
  selectedObject?: CanvaObject | null;
}

const FONT_OPTIONS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 
  'Playfair Display', 'Merriweather', 'Source Sans Pro', 'Raleway'
];

const FONT_WEIGHTS = [
  { value: '400', label: 'Normal' },
  { value: '500', label: 'Médio' },
  { value: '600', label: 'Semibold' },
  { value: '700', label: 'Bold' },
];

export function BrandPanel({ onAddObject, onUpdateObject, selectedObject }: BrandPanelProps) {
  const { user } = useAuth();
  const { brandKit, folders, assets, isLoading, updateTypography, updateColorPalette, createFolder, deleteFolder, uploadAsset, deleteAsset } = useBrandKit();
  
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [selectedParentFolder, setSelectedParentFolder] = useState<string | null>(null);
  const [typographyDialogOpen, setTypographyDialogOpen] = useState(false);
  const [editingTypography, setEditingTypography] = useState<Typography | null>(null);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [newColor, setNewColor] = useState({ name: '', hex: '#000000' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFolderId, setUploadFolderId] = useState<string | null>(null);

  // Check if user is admin
  const { data: isAdmin = false } = useQuery({
    queryKey: ['is-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      return data || false;
    },
    enabled: !!user?.id,
  });

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolder.mutate({ name: newFolderName, parentId: selectedParentFolder || undefined });
    setNewFolderName('');
    setNewFolderDialogOpen(false);
    setSelectedParentFolder(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      uploadAsset.mutate({ file, folderId: uploadFolderId || undefined });
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUploadFolderId(null);
  };

  const handleAddAssetToCanvas = (asset: { file_url: string; name: string }) => {
    const newObject: CanvaObject = {
      id: `image-${Date.now()}`,
      type: 'image',
      x: 100,
      y: 100,
      width: 200,
      height: 200,
      src: asset.file_url,
      name: asset.name,
    };
    onAddObject(newObject);
  };

  const handleTypographyClick = (style: TypographyStyle, label: string) => {
    if (selectedObject?.type === 'text' && onUpdateObject) {
      // Apply to existing selected text
      onUpdateObject(selectedObject.id, {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontStyle: style.fontWeight === '700' ? 'bold' : 'normal',
        fill: style.color,
      });
    } else {
      // Add new text with branding style
      const newText: CanvaObject = {
        id: `text-${Date.now()}`,
        type: 'text',
        x: 100,
        y: 100,
        text: label,
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        fontStyle: style.fontWeight === '700' ? 'bold' : 'normal',
        fill: style.color,
        width: 400,
        name: label,
      };
      onAddObject(newText);
    }
  };

  const handleApplyColor = (color: string) => {
    if (selectedObject && onUpdateObject) {
      if (selectedObject.type === 'text') {
        onUpdateObject(selectedObject.id, { fill: color });
      } else {
        onUpdateObject(selectedObject.id, { fill: color });
      }
    }
  };

  const handleSaveTypography = () => {
    if (!editingTypography) return;
    updateTypography.mutate(editingTypography);
    setTypographyDialogOpen(false);
  };

  const handleAddColor = () => {
    if (!newColor.name.trim() || !brandKit) return;
    const updatedPalette = [...brandKit.color_palette, newColor];
    updateColorPalette.mutate(updatedPalette);
    setNewColor({ name: '', hex: '#000000' });
    setColorDialogOpen(false);
  };

  const handleDeleteColor = (index: number) => {
    if (!brandKit) return;
    const updatedPalette = brandKit.color_palette.filter((_, i) => i !== index);
    updateColorPalette.mutate(updatedPalette);
  };

  // Get root folders and subfolders
  const rootFolders = folders.filter(f => !f.parent_id);
  const getSubfolders = (parentId: string) => folders.filter(f => f.parent_id === parentId);
  const getFolderAssets = (folderId: string | null) => assets.filter(a => a.folder_id === folderId);
  const rootAssets = assets.filter(a => !a.folder_id);

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Carregando...</div>;
  }

  if (!brandKit) {
    return <div className="p-4 text-muted-foreground">Kit de marca não encontrado</div>;
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Typography Section */}
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left font-medium hover:text-primary transition-colors">
            <ChevronDown className="h-4 w-4" />
            <Type className="h-4 w-4" />
            Tipografia
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-2">
            {(['title', 'subtitle', 'body'] as const).map((key) => {
              const style = brandKit.typography[key];
              const label = key === 'title' ? 'Título' : key === 'subtitle' ? 'Subtítulo' : 'Corpo';
              return (
                <button
                  key={key}
                  onClick={() => handleTypographyClick(style, label)}
                  className="w-full p-3 rounded-lg border border-border hover:border-primary hover:bg-accent/50 transition-all text-left"
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    {label} {selectedObject?.type !== 'text' && <span className="text-primary">(clique para adicionar)</span>}
                  </div>
                  <div 
                    style={{ 
                      fontFamily: style.fontFamily, 
                      fontWeight: style.fontWeight,
                      color: style.color,
                      fontSize: Math.min(style.fontSize / 2, 20)
                    }}
                  >
                    {style.fontFamily} {style.fontSize}px
                  </div>
                </button>
              );
            })}
            
            {isAdmin && (
              <Dialog open={typographyDialogOpen} onOpenChange={setTypographyDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => setEditingTypography(brandKit.typography)}
                  >
                    <Edit2 className="h-3 w-3 mr-2" />
                    Editar tipografia
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Editar Tipografia</DialogTitle>
                  </DialogHeader>
                  {editingTypography && (
                    <div className="space-y-6">
                      {(['title', 'subtitle', 'body'] as const).map((key) => {
                        const label = key === 'title' ? 'Título' : key === 'subtitle' ? 'Subtítulo' : 'Corpo';
                        const style = editingTypography[key];
                        return (
                          <div key={key} className="space-y-3">
                            <Label className="font-medium">{label}</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <Select
                                value={style.fontFamily}
                                onValueChange={(v) => setEditingTypography({
                                  ...editingTypography,
                                  [key]: { ...style, fontFamily: v }
                                })}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {FONT_OPTIONS.map(f => (
                                    <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={style.fontWeight}
                                onValueChange={(v) => setEditingTypography({
                                  ...editingTypography,
                                  [key]: { ...style, fontWeight: v }
                                })}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {FONT_WEIGHTS.map(w => (
                                    <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Tamanho</Label>
                                <Input
                                  type="number"
                                  value={style.fontSize}
                                  onChange={(e) => setEditingTypography({
                                    ...editingTypography,
                                    [key]: { ...style, fontSize: parseInt(e.target.value) || 16 }
                                  })}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Cor</Label>
                                <div className="flex gap-2">
                                  <input
                                    type="color"
                                    value={style.color}
                                    onChange={(e) => setEditingTypography({
                                      ...editingTypography,
                                      [key]: { ...style, color: e.target.value }
                                    })}
                                    className="w-10 h-9 rounded border cursor-pointer"
                                  />
                                  <Input
                                    value={style.color}
                                    onChange={(e) => setEditingTypography({
                                      ...editingTypography,
                                      [key]: { ...style, color: e.target.value }
                                    })}
                                    className="flex-1"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <Button onClick={handleSaveTypography} className="w-full">
                        Salvar
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Color Palette Section */}
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left font-medium hover:text-primary transition-colors">
            <ChevronDown className="h-4 w-4" />
            <Palette className="h-4 w-4" />
            Paleta de Cores
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="flex flex-wrap gap-2">
              {brandKit.color_palette.map((color, index) => (
                <div key={index} className="group relative">
                  <button
                    onClick={() => handleApplyColor(color.hex)}
                    className="w-10 h-10 rounded-lg border-2 border-border hover:border-primary transition-all hover:scale-110"
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteColor(index)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              ))}
              
              {isAdmin && (
                <Dialog open={colorDialogOpen} onOpenChange={setColorDialogOpen}>
                  <DialogTrigger asChild>
                    <button className="w-10 h-10 rounded-lg border-2 border-dashed border-border hover:border-primary transition-all flex items-center justify-center">
                      <Plus className="h-4 w-4" />
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Cor</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nome</Label>
                        <Input
                          value={newColor.name}
                          onChange={(e) => setNewColor({ ...newColor, name: e.target.value })}
                          placeholder="Ex: Primária"
                        />
                      </div>
                      <div>
                        <Label>Cor</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={newColor.hex}
                            onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })}
                            className="w-12 h-9 rounded border cursor-pointer"
                          />
                          <Input
                            value={newColor.hex}
                            onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })}
                          />
                        </div>
                      </div>
                      <Button onClick={handleAddColor} className="w-full">Adicionar</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            
            {brandKit.color_palette.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">Nenhuma cor cadastrada</p>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Assets Section */}
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left font-medium hover:text-primary transition-colors">
            <ChevronDown className="h-4 w-4" />
            <ImageIcon className="h-4 w-4" />
            Assets
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-2">
            {/* Folders */}
            {rootFolders.map((folder) => (
              <FolderItem
                key={folder.id}
                folder={folder}
                isExpanded={expandedFolders.has(folder.id)}
                onToggle={() => toggleFolder(folder.id)}
                subfolders={getSubfolders(folder.id)}
                assets={getFolderAssets(folder.id)}
                onAddAsset={handleAddAssetToCanvas}
                onDeleteAsset={(a) => deleteAsset.mutate(a)}
                onDeleteFolder={(id) => deleteFolder.mutate(id)}
                onUpload={(folderId) => {
                  setUploadFolderId(folderId);
                  fileInputRef.current?.click();
                }}
                isAdmin={isAdmin}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                getSubfolders={getSubfolders}
                getFolderAssets={getFolderAssets}
              />
            ))}

            {/* Root Assets */}
            {rootAssets.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {rootAssets.map((asset) => (
                  <AssetItem 
                    key={asset.id} 
                    asset={asset} 
                    onAdd={() => handleAddAssetToCanvas(asset)}
                    onDelete={() => deleteAsset.mutate(asset)}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            )}

            {/* Actions */}
            {isAdmin && (
              <div className="flex gap-2 mt-3">
                <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Plus className="h-3 w-3 mr-1" />
                      Pasta
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nova Pasta</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nome da pasta</Label>
                        <Input
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          placeholder="Ex: Logotipos"
                        />
                      </div>
                      <div>
                        <Label>Pasta pai (opcional)</Label>
                        <Select
                          value={selectedParentFolder || '__root__'}
                          onValueChange={(v) => setSelectedParentFolder(v === '__root__' ? null : v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Raiz" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__root__">Raiz</SelectItem>
                            {folders.map(f => (
                              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleCreateFolder} className="w-full">Criar</Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setUploadFolderId(null);
                    fileInputRef.current?.click();
                  }}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Upload
                </Button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />

            {!isAdmin && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                <Lock className="h-3 w-3" />
                Apenas admins podem editar
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </ScrollArea>
  );
}

interface FolderItemProps {
  folder: { id: string; name: string };
  isExpanded: boolean;
  onToggle: () => void;
  subfolders: { id: string; name: string }[];
  assets: { id: string; file_url: string; name: string; file_type: string }[];
  onAddAsset: (asset: { file_url: string; name: string }) => void;
  onDeleteAsset: (asset: any) => void;
  onDeleteFolder: (id: string) => void;
  onUpload: (folderId: string) => void;
  isAdmin: boolean;
  expandedFolders: Set<string>;
  toggleFolder: (id: string) => void;
  getSubfolders: (parentId: string) => { id: string; name: string }[];
  getFolderAssets: (folderId: string) => { id: string; file_url: string; name: string; file_type: string }[];
}

function FolderItem({ 
  folder, 
  isExpanded, 
  onToggle, 
  subfolders, 
  assets, 
  onAddAsset, 
  onDeleteAsset,
  onDeleteFolder,
  onUpload,
  isAdmin,
  expandedFolders,
  toggleFolder,
  getSubfolders,
  getFolderAssets,
}: FolderItemProps) {
  return (
    <div>
      <div className="group flex items-center gap-1 py-1 px-2 rounded hover:bg-accent/50 cursor-pointer">
        <button onClick={onToggle} className="flex items-center gap-1 flex-1 text-left text-sm">
          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {isExpanded ? <FolderOpen className="h-4 w-4 text-primary" /> : <Folder className="h-4 w-4" />}
          <span className="truncate">{folder.name}</span>
        </button>
        {isAdmin && (
          <div className="opacity-0 group-hover:opacity-100 flex gap-1">
            <button onClick={() => onUpload(folder.id)} className="p-1 hover:bg-accent rounded">
              <Upload className="h-3 w-3" />
            </button>
            <button onClick={() => onDeleteFolder(folder.id)} className="p-1 hover:bg-destructive/20 rounded text-destructive">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
      
      {isExpanded && (
        <div className="ml-4 pl-2 border-l border-border">
          {/* Subfolders */}
          {subfolders.map((subfolder) => (
            <FolderItem
              key={subfolder.id}
              folder={subfolder}
              isExpanded={expandedFolders.has(subfolder.id)}
              onToggle={() => toggleFolder(subfolder.id)}
              subfolders={getSubfolders(subfolder.id)}
              assets={getFolderAssets(subfolder.id)}
              onAddAsset={onAddAsset}
              onDeleteAsset={onDeleteAsset}
              onDeleteFolder={onDeleteFolder}
              onUpload={onUpload}
              isAdmin={isAdmin}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              getSubfolders={getSubfolders}
              getFolderAssets={getFolderAssets}
            />
          ))}
          
          {/* Assets in folder */}
          {assets.length > 0 && (
            <div className="grid grid-cols-3 gap-1 mt-1">
              {assets.map((asset) => (
                <AssetItem 
                  key={asset.id} 
                  asset={asset} 
                  onAdd={() => onAddAsset(asset)}
                  onDelete={() => onDeleteAsset(asset)}
                  isAdmin={isAdmin}
                  small
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface AssetItemProps {
  asset: { id: string; file_url: string; name: string; file_type: string };
  onAdd: () => void;
  onDelete: () => void;
  isAdmin: boolean;
  small?: boolean;
}

function AssetItem({ asset, onAdd, onDelete, isAdmin, small }: AssetItemProps) {
  return (
    <div className="group relative">
      <button
        onClick={onAdd}
        className={`w-full aspect-square rounded border border-border hover:border-primary overflow-hidden transition-all ${small ? '' : 'hover:scale-105'}`}
      >
        <img 
          src={asset.file_url} 
          alt={asset.name}
          className="w-full h-full object-cover"
        />
      </button>
      {isAdmin && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}
