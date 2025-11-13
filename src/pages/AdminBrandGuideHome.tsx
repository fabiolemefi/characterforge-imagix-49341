import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminSidebar } from '@/components/AdminSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowLeft, Save, Image, Video, Youtube, Type, AlignLeft, Columns2, Columns3, Layout, Minus, GripVertical } from 'lucide-react';
import { useBrandGuide, BrandGuideBlock } from '@/hooks/useBrandGuide';
import { SingleColumnBlock } from '@/components/brandguide/SingleColumnBlock';
import { TwoColumnBlock } from '@/components/brandguide/TwoColumnBlock';
import { ThreeColumnBlock } from '@/components/brandguide/ThreeColumnBlock';
import { TitleOnlyBlock } from '@/components/brandguide/TitleOnlyBlock';
import { TextOnlyBlock } from '@/components/brandguide/TextOnlyBlock';
import { ImageBlock } from '@/components/brandguide/ImageBlock';
import { VideoBlock } from '@/components/brandguide/VideoBlock';
import { EmbedBlock } from '@/components/brandguide/EmbedBlock';
import { SeparatorBlock } from '@/components/brandguide/SeparatorBlock';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function AdminBrandGuideHome() {
  const navigate = useNavigate();
  const { deleteBlock, updateBlock, uploadAsset } = useBrandGuide();
  const [blocks, setBlocks] = useState<BrandGuideBlock[]>([]);
  const [pendingChanges, setPendingChanges] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Drag only after moving 8px
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadHomeBlocks();
  }, []);

  const loadHomeBlocks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('brand_guide_blocks')
        .select('*')
        .is('page_id', null)
        .is('category_id', null)
        .order('position');

      if (error) throw error;
      setBlocks(data || []);
    } catch (error) {
      console.error('Error loading home blocks:', error);
      toast.error('Erro ao carregar blocos');
    } finally {
      setLoading(false);
    }
  };

  const handleContentChange = (blockId: string, content: any) => {
    setPendingChanges(prev => new Map(prev).set(blockId, content));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((block) => block.id === active.id);
      const newIndex = blocks.findIndex((block) => block.id === over.id);

      const newBlocks = arrayMove(blocks, oldIndex, newIndex);
      
      // Update positions
      const updatedBlocks = newBlocks.map((block, index) => ({
        ...block,
        position: index
      }));
      
      setBlocks(updatedBlocks);

      // Save new positions to database
      try {
        for (const block of updatedBlocks) {
          await supabase
            .from('brand_guide_blocks')
            .update({ position: block.position })
            .eq('id', block.id);
        }
        toast.success('Ordem atualizada!');
      } catch (error) {
        console.error('Error updating positions:', error);
        toast.error('Erro ao atualizar ordem');
      }
    }
  };

  const handleSaveChanges = async () => {
    if (pendingChanges.size === 0) {
      toast.info('Nenhuma alteração para salvar');
      return;
    }

    setSaving(true);
    try {
      for (const [blockId, content] of pendingChanges.entries()) {
        // Upload images if needed (validate File object)
        if (content.imageFile && content.imageFile instanceof File) {
          const url = await uploadAsset(content.imageFile, 'images');
          if (url) {
            content.media_url = url;
            content.image_url = url;
            delete content.imageFile;
          }
        } else {
          delete content.imageFile;
        }

        // Upload videos if needed (validate File object)
        if (content.videoFile && content.videoFile instanceof File) {
          const url = await uploadAsset(content.videoFile, 'videos');
          if (url) {
            content.video_url = url;
            delete content.videoFile;
          }
        } else {
          delete content.videoFile;
        }

        // Upload images in columns if needed (validate File object)
        if (content.columns) {
          for (const column of content.columns) {
            if (column.imageFile && column.imageFile instanceof File) {
              const url = await uploadAsset(column.imageFile, 'images');
              if (url) {
                column.image_url = url;
                delete column.imageFile;
              }
            } else {
              delete column.imageFile;
            }
          }
        }

        await updateBlock(blockId, content);
      }

      setPendingChanges(new Map());
      toast.success('Alterações salvas com sucesso!');
      await loadHomeBlocks();
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlock = async (blockType: 'single_column' | 'two_columns' | 'three_columns' | 'title_only' | 'text_only' | 'image' | 'video' | 'embed' | 'separator') => {
    try {
      const { data: existingBlocks } = await supabase
        .from('brand_guide_blocks')
        .select('position')
        .is('page_id', null)
        .is('category_id', null)
        .order('position', { ascending: false })
        .limit(1);

      const newPosition = existingBlocks && existingBlocks.length > 0 ? existingBlocks[0].position + 1 : 0;

      const defaultContent = blockType === 'single_column' 
        ? { title: '', subtitle: '', media_type: 'image', media_url: '', media_alt: '' }
        : blockType === 'two_columns'
        ? { columns: [
            { image_url: '', title: '', description: '' },
            { image_url: '', title: '', description: '' }
          ]}
        : blockType === 'three_columns'
        ? { columns: [
            { image_url: '', title: '', description: '' },
            { image_url: '', title: '', description: '' },
            { image_url: '', title: '', description: '' }
          ]}
        : blockType === 'title_only'
        ? { title: '' }
        : blockType === 'text_only'
        ? { text: '' }
        : blockType === 'image'
        ? { image_url: '', image_alt: '' }
        : blockType === 'video'
        ? { video_url: '' }
        : blockType === 'separator'
        ? {}
        : { embed_url: '' };

      const { data, error } = await supabase
        .from('brand_guide_blocks')
        .insert({
          page_id: null,
          category_id: null,
          block_type: blockType as any,
          position: newPosition,
          content: defaultContent,
        } as any)
        .select()
        .single();

      if (error) throw error;
      toast.success('Bloco adicionado com sucesso');
      setBlocks([...blocks, data]);
    } catch (error) {
      console.error('Error adding block:', error);
      toast.error('Erro ao adicionar bloco');
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    const success = await deleteBlock(blockId);
    if (success) {
      setBlocks(blocks.filter(b => b.id !== blockId));
    }
  };

  const SortableBlockItem = ({ block }: { block: BrandGuideBlock }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: block.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="relative group bg-white rounded-lg"
      >
        <div className="flex items-start gap-2 mb-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-2 hover:bg-muted rounded flex-shrink-0"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            {renderBlockContent(block)}
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            onClick={() => handleDeleteBlock(block.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderBlockContent = (block: BrandGuideBlock) => {
    switch (block.block_type) {
      case 'single_column':
        return (
          <SingleColumnBlock 
            blockId={block.id} 
            content={block.content} 
            isAdmin={true} 
            onContentChange={(content) => handleContentChange(block.id, content)}
          />
        );
      case 'two_columns':
        return (
          <TwoColumnBlock 
            blockId={block.id} 
            content={block.content} 
            isAdmin={true} 
            onContentChange={(content) => handleContentChange(block.id, content)}
          />
        );
      case 'three_columns':
        return (
          <ThreeColumnBlock 
            blockId={block.id} 
            content={block.content} 
            isAdmin={true} 
            onContentChange={(content) => handleContentChange(block.id, content)}
          />
        );
      case 'title_only':
        return (
          <TitleOnlyBlock 
            blockId={block.id} 
            content={block.content} 
            isAdmin={true} 
            onContentChange={(content) => handleContentChange(block.id, content)}
          />
        );
      case 'text_only':
        return (
          <TextOnlyBlock 
            blockId={block.id} 
            content={block.content} 
            isAdmin={true} 
            onContentChange={(content) => handleContentChange(block.id, content)}
          />
        );
      case 'image':
        return (
          <ImageBlock 
            blockId={block.id} 
            content={block.content} 
            isAdmin={true} 
            onContentChange={(content) => handleContentChange(block.id, content)}
          />
        );
      case 'video':
        return (
          <VideoBlock 
            blockId={block.id} 
            content={block.content} 
            isAdmin={true} 
            onContentChange={(content) => handleContentChange(block.id, content)}
          />
        );
      case 'embed':
        return (
          <EmbedBlock 
            blockId={block.id} 
            content={block.content} 
            isAdmin={true} 
            onContentChange={(content) => handleContentChange(block.id, content)}
          />
        );
      case 'separator':
        return (
          <SeparatorBlock 
            blockId={block.id} 
            content={block.content} 
            isAdmin={true} 
            onContentChange={(content) => handleContentChange(block.id, content)}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar />
          <div className="flex-1 p-8">
            <div>Carregando...</div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <Button
                variant="ghost"
                onClick={() => navigate('/admin/brand-guide')}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <h1 className="text-3xl font-bold">
                Página Home
              </h1>
            </div>
            <Button 
              onClick={handleSaveChanges} 
              disabled={saving || pendingChanges.size === 0}
              size="lg"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : `Salvar${pendingChanges.size > 0 ? ` (${pendingChanges.size})` : ''}`}
            </Button>
          </div>

          <div className="bg-white rounded-lg p-8 space-y-8 mb-8">
            {blocks.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground mb-4">
                  Nenhum bloco adicionado ainda. Clique em "Adicionar Bloco" para começar.
                </p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={blocks.map(b => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-8">
                    {blocks.map((block) => (
                      <SortableBlockItem key={block.id} block={block} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full" size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Adicionar Bloco
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full">
              <DropdownMenuItem onClick={() => handleAddBlock('title_only')}>
                <Type className="h-4 w-4 mr-2" />
                Título
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddBlock('text_only')}>
                <AlignLeft className="h-4 w-4 mr-2" />
                Texto
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddBlock('image')}>
                <Image className="h-4 w-4 mr-2" />
                Imagem
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddBlock('video')}>
                <Video className="h-4 w-4 mr-2" />
                Vídeo MP4
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddBlock('embed')}>
                <Youtube className="h-4 w-4 mr-2" />
                Vídeo YouTube
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddBlock('separator')}>
                <Minus className="h-4 w-4 mr-2" />
                Separador
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddBlock('single_column')}>
                <Layout className="h-4 w-4 mr-2" />
                Título + Subtítulo + Imagem
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddBlock('two_columns')}>
                <Columns2 className="h-4 w-4 mr-2" />
                2 Colunas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddBlock('three_columns')}>
                <Columns3 className="h-4 w-4 mr-2" />
                3 Colunas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </SidebarProvider>
  );
}
