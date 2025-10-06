import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus } from 'lucide-react';
import { EmailBlock } from '@/hooks/useEmailBlocks';

interface BlocksLibraryProps {
  blocks: EmailBlock[];
  onAddBlock: (block: EmailBlock) => void;
}

const categoryLabels: Record<string, string> = {
  header: 'Cabeçalhos',
  hero: 'Banners',
  text: 'Texto e Imagem',
  list: 'Listas',
  footer: 'Rodapés',
};

const categoryColors: Record<string, string> = {
  header: 'bg-blue-100 text-blue-800',
  hero: 'bg-purple-100 text-purple-800',
  text: 'bg-green-100 text-green-800',
  list: 'bg-yellow-100 text-yellow-800',
  footer: 'bg-gray-100 text-gray-800',
};

export const BlocksLibrary = ({ blocks, onAddBlock }: BlocksLibraryProps) => {
  const groupedBlocks = blocks.reduce((acc, block) => {
    if (!acc[block.category]) {
      acc[block.category] = [];
    }
    acc[block.category].push(block);
    return acc;
  }, {} as Record<string, EmailBlock[]>);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-lg">Biblioteca de Blocos</h3>
        <p className="text-sm text-muted-foreground">
          Clique para adicionar ao email
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {Object.entries(groupedBlocks).map(([category, categoryBlocks]) => (
            <div key={category}>
              <div className="mb-3">
                <Badge className={categoryColors[category] || 'bg-gray-100 text-gray-800'}>
                  {categoryLabels[category] || category}
                </Badge>
              </div>
              <div className="space-y-2">
                {categoryBlocks.map((block) => (
                  <Card
                    key={block.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onAddBlock(block)}
                  >
                    <CardHeader className="p-3">
                      {block.thumbnail_url && (
                        <div className="mb-3">
                          <img 
                            src={block.thumbnail_url} 
                            alt={block.name}
                            className="w-full h-24 object-cover rounded border"
                          />
                        </div>
                      )}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-sm">{block.name}</CardTitle>
                          {block.description && (
                            <CardDescription className="text-xs mt-1">
                              {block.description}
                            </CardDescription>
                          )}
                        </div>
                        <Plus className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
