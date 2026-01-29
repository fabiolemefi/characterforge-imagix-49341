import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, Info } from 'lucide-react';
import { useEfiCodeEditorStore } from '@/stores/efiCodeEditorStore';

export const SettingsPanel = () => {
  const { selectedBlockId, blocks } = useEfiCodeEditorStore();
  
  // Get selected block info
  const selectedBlock = selectedBlockId 
    ? blocks.find(b => b.id === selectedBlockId) 
    : null;

  // Se um bloco está selecionado, mostrar suas informações
  if (selectedBlock) {
    // Extract preview text from HTML
    const getPreviewText = (html: string): string => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const text = tempDiv.textContent || tempDiv.innerText || '';
      return text.trim().substring(0, 100) || 'Bloco HTML';
    };

    return (
      <div className="border-t bg-muted/30">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Bloco Selecionado
            </h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <span className="text-xs text-muted-foreground">Posição</span>
              <p className="text-sm font-medium">Bloco {selectedBlock.order + 1} de {blocks.length}</p>
            </div>
            
            <div>
              <span className="text-xs text-muted-foreground">Conteúdo</span>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {getPreviewText(selectedBlock.html)}
              </p>
            </div>
            
            <div className="pt-2 border-t">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <p>
                  Clique duas vezes no bloco para editar o conteúdo diretamente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Se nenhum bloco está selecionado, mostrar mensagem
  return (
    <div className="border-t bg-muted/30">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Propriedades
          </h3>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Selecione um bloco na lista ou no preview para ver suas propriedades.
        </p>
      </div>
    </div>
  );
};
