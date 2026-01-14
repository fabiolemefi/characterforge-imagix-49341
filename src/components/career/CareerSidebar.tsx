import React from 'react';
import { X, ArrowRight, ArrowLeft, Briefcase, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CareerNode, CareerLink, departmentColors } from '@/data/mockCareerData';

interface CareerSidebarProps {
  selectedNode: CareerNode | null;
  nodes: CareerNode[];
  links: CareerLink[];
  onClose: () => void;
  onNodeSelect: (nodeId: string) => void;
}

export const CareerSidebar: React.FC<CareerSidebarProps> = ({
  selectedNode,
  nodes,
  links,
  onClose,
  onNodeSelect,
}) => {
  if (!selectedNode) return null;

  // Find incoming connections (where this node is the target)
  const incomingLinks = links.filter(link => {
    const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
    return targetId === selectedNode.id;
  });

  const incomingNodes = incomingLinks.map(link => {
    const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
    return nodes.find(n => n.id === sourceId);
  }).filter(Boolean) as CareerNode[];

  // Find outgoing connections (where this node is the source)
  const outgoingLinks = links.filter(link => {
    const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
    return sourceId === selectedNode.id;
  });

  const outgoingNodes = outgoingLinks.map(link => {
    const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
    return nodes.find(n => n.id === targetId);
  }).filter(Boolean) as CareerNode[];

  const departmentColor = departmentColors[selectedNode.department] || '#888888';

  return (
    <div className="w-80 bg-card border-l border-border h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: departmentColor }}
              />
              <Badge variant="outline" style={{ borderColor: departmentColor, color: departmentColor }}>
                {selectedNode.department}
              </Badge>
            </div>
            <h2 className="text-lg font-semibold">{selectedNode.name}</h2>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <Briefcase className="h-3 w-3" />
              <span>Nível {selectedNode.level}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-sm font-medium mb-2">Descrição</h3>
            <p className="text-sm text-muted-foreground">{selectedNode.description}</p>
          </div>

          <Separator />

          {/* Requirements */}
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Requisitos
            </h3>
            <ul className="space-y-1">
              {selectedNode.requirements.map((req, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Incoming connections */}
          {incomingNodes.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-green-500" />
                Vem de ({incomingNodes.length})
              </h3>
              <div className="space-y-2">
                {incomingNodes.map(node => (
                  <button
                    key={node.id}
                    onClick={() => onNodeSelect(node.id)}
                    className="w-full text-left p-2 rounded-md border border-border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: departmentColors[node.department] || '#888' }}
                      />
                      <span className="text-sm font-medium">{node.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{node.department} • Nível {node.level}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Outgoing connections */}
          {outgoingNodes.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <ArrowLeft className="h-4 w-4 text-blue-500" />
                Vai para ({outgoingNodes.length})
              </h3>
              <div className="space-y-2">
                {outgoingNodes.map(node => (
                  <button
                    key={node.id}
                    onClick={() => onNodeSelect(node.id)}
                    className="w-full text-left p-2 rounded-md border border-border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: departmentColors[node.department] || '#888' }}
                      />
                      <span className="text-sm font-medium">{node.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{node.department} • Nível {node.level}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {incomingNodes.length === 0 && outgoingNodes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Este cargo não possui conexões com outros cargos.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
