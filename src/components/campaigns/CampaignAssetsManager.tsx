import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Eye, EyeOff, GripVertical } from "lucide-react";
import {
  ImageCampaignAsset,
  useCampaignAssets,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
  useUploadCampaignImage,
} from "@/hooks/useImageCampaigns";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface CampaignAssetsManagerProps {
  campaignId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SortableAssetItemProps {
  asset: ImageCampaignAsset;
  onToggleVisibility: (id: string, isVisible: boolean) => void;
  onDelete: (id: string) => void;
  isUpdating: boolean;
}

function SortableAssetItem({
  asset,
  onToggleVisibility,
  onDelete,
  isUpdating,
}: SortableAssetItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: asset.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-card border rounded-lg"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      <img
        src={asset.image_url}
        alt={asset.name}
        className="w-16 h-16 object-cover rounded"
      />

      <div className="flex-1">
        <p className="font-medium text-sm">{asset.name}</p>
        <p className="text-xs text-muted-foreground">
          {asset.is_visible ? "Visível para usuários" : "Oculta (enviada automaticamente)"}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          {asset.is_visible ? (
            <Eye className="h-4 w-4 text-muted-foreground" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          )}
          <Switch
            checked={asset.is_visible}
            onCheckedChange={(checked) => onToggleVisibility(asset.id, checked)}
            disabled={isUpdating}
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(asset.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function CampaignAssetsManager({
  campaignId,
  open,
  onOpenChange,
}: CampaignAssetsManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newAssetName, setNewAssetName] = useState("");
  const [isVisible, setIsVisible] = useState(true);

  const { data: assets = [], isLoading } = useCampaignAssets(campaignId);
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();
  const uploadImage = useUploadCampaignImage();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    for (const file of Array.from(files)) {
      try {
        const url = await uploadImage.mutateAsync({ file, folder: "assets" });
        const name = newAssetName || file.name.replace(/\.[^/.]+$/, "");
        
        await createAsset.mutateAsync({
          campaign_id: campaignId,
          image_url: url,
          name,
          is_visible: isVisible,
          position: assets.length,
        });
      } catch (error) {
        console.error("Error uploading asset:", error);
      }
    }

    setNewAssetName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleToggleVisibility = async (id: string, is_visible: boolean) => {
    await updateAsset.mutateAsync({ id, is_visible });
  };

  const handleDelete = async (id: string) => {
    await deleteAsset.mutateAsync({ id, campaignId });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = assets.findIndex((a) => a.id === active.id);
      const newIndex = assets.findIndex((a) => a.id === over.id);
      const reorderedAssets = arrayMove(assets, oldIndex, newIndex);

      // Update positions
      for (let i = 0; i < reorderedAssets.length; i++) {
        if (reorderedAssets[i].position !== i) {
          await updateAsset.mutateAsync({
            id: reorderedAssets[i].id,
            position: i,
          });
        }
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Assets</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adicionar Assets</CardTitle>
              <CardDescription>
                Adicione imagens de selos que serão usadas na campanha
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Asset (opcional)</Label>
                  <Input
                    placeholder="Selo 1"
                    value={newAssetName}
                    onChange={(e) => setNewAssetName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Visibilidade</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Switch
                      checked={isVisible}
                      onCheckedChange={setIsVisible}
                    />
                    <span className="text-sm">
                      {isVisible ? "Visível" : "Oculta"}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadImage.isPending || createAsset.isPending}
              >
                {(uploadImage.isPending || createAsset.isPending) ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Selecionar Imagens
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </CardContent>
          </Card>

          {/* Assets List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assets da Campanha</CardTitle>
              <CardDescription>
                Arraste para reordenar. Assets ocultos são enviados automaticamente na requisição.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : assets.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum asset adicionado ainda
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={assets.map((a) => a.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {assets.map((asset) => (
                        <SortableAssetItem
                          key={asset.id}
                          asset={asset}
                          onToggleVisibility={handleToggleVisibility}
                          onDelete={handleDelete}
                          isUpdating={updateAsset.isPending}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
