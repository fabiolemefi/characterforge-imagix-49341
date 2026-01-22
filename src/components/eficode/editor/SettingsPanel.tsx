import React from 'react';
import { useEditor } from '@craftjs/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings } from 'lucide-react';

export const SettingsPanel = () => {
  const { selected, actions } = useEditor((state) => {
    const currentNodeId = state.events.selected.size === 1 
      ? Array.from(state.events.selected)[0] 
      : null;
    
    let selected;
    if (currentNodeId) {
      const node = state.nodes[currentNodeId];
      selected = {
        id: currentNodeId,
        name: node.data.displayName || node.data.name,
        settings: node.related?.settings,
        isDeletable: node.data.custom?.isDeletable !== false && currentNodeId !== 'ROOT',
      };
    }
    
    return { selected };
  });

  // Se um componente está selecionado, mostrar suas configurações
  if (selected) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Propriedades
          </h3>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{selected.name}</span>
                {selected.isDeletable && (
                  <button
                    onClick={() => actions.delete(selected.id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Excluir
                  </button>
                )}
              </div>
              
              {selected.settings && React.createElement(selected.settings)}
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Se nenhum componente está selecionado, mostrar mensagem
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Propriedades
          </h3>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground text-center">
          Selecione um componente para editar suas propriedades
        </p>
      </div>
    </div>
  );
};
