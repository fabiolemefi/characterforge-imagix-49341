import React, { useCallback, useRef, useEffect } from 'react';
import ForceGraph2D, { ForceGraphMethods, NodeObject, LinkObject } from 'react-force-graph-2d';
import { CareerNode, CareerLink, departmentColors } from '@/data/mockCareerData';

interface GraphNode extends NodeObject {
  id: string;
  name: string;
  department: string;
  level: number;
  description: string;
  requirements: string[];
}

interface CareerGraphProps {
  nodes: CareerNode[];
  links: CareerLink[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  onNodeClick: (node: CareerNode) => void;
  onNodeHover: (node: CareerNode | null) => void;
  width: number;
  height: number;
  filterDepartment: string | null;
}

export const CareerGraph: React.FC<CareerGraphProps> = ({
  nodes,
  links,
  selectedNodeId,
  hoveredNodeId,
  onNodeClick,
  onNodeHover,
  width,
  height,
  filterDepartment,
}) => {
  const graphRef = useRef<ForceGraphMethods>();

  // Filter nodes and links based on department
  const filteredNodes = filterDepartment
    ? nodes.filter(node => node.department === filterDepartment)
    : nodes;

  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  
  const filteredLinks = links.filter(link => {
    const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
    const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
    return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId);
  });

  const graphData = {
    nodes: filteredNodes,
    links: filteredLinks,
  };

  // Center graph on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (graphRef.current) {
        graphRef.current.zoomToFit(400, 50);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [filterDepartment]);

  // Zoom to selected node
  useEffect(() => {
    if (selectedNodeId && graphRef.current) {
      const node = filteredNodes.find(n => n.id === selectedNodeId);
      if (node && (node as any).x !== undefined) {
        graphRef.current.centerAt((node as any).x, (node as any).y, 300);
        graphRef.current.zoom(2, 300);
      }
    }
  }, [selectedNodeId, filteredNodes]);

  const handleNodeClick = useCallback((node: NodeObject) => {
    const careerNode = node as GraphNode;
    onNodeClick({
      id: careerNode.id,
      name: careerNode.name,
      department: careerNode.department,
      level: careerNode.level,
      description: careerNode.description,
      requirements: careerNode.requirements,
    });
  }, [onNodeClick]);

  const handleNodeHover = useCallback((node: NodeObject | null) => {
    if (node) {
      const careerNode = node as GraphNode;
      onNodeHover({
        id: careerNode.id,
        name: careerNode.name,
        department: careerNode.department,
        level: careerNode.level,
        description: careerNode.description,
        requirements: careerNode.requirements,
      });
    } else {
      onNodeHover(null);
    }
  }, [onNodeHover]);

  const nodeCanvasObject = useCallback((node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const graphNode = node as GraphNode;
    const label = graphNode.name;
    const x = node.x || 0;
    const y = node.y || 0;
    
    const baseSize = 8 + graphNode.level * 6;
    const isSelected = selectedNodeId === graphNode.id;
    const isHovered = hoveredNodeId === graphNode.id;
    const size = isSelected || isHovered ? baseSize * 1.2 : baseSize;
    
    const color = departmentColors[graphNode.department] || '#888888';

    // Draw outer ring for selected/hovered
    if (isSelected || isHovered) {
      ctx.beginPath();
      ctx.arc(x, y, size + 4, 0, 2 * Math.PI);
      ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw circle
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();

    // Draw border
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw label
    const fontSize = Math.max(10 / globalScale, 3);
    ctx.font = `${fontSize}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Truncate label if too long
    const maxWidth = size * 1.8;
    let displayLabel = label;
    while (ctx.measureText(displayLabel).width > maxWidth && displayLabel.length > 3) {
      displayLabel = displayLabel.slice(0, -4) + '...';
    }
    
    // Text shadow for readability
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(displayLabel, x + 0.5, y + 0.5);
    
    // Main text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(displayLabel, x, y);

    // Level indicator below
    const levelText = `Nível ${graphNode.level}`;
    const levelFontSize = Math.max(7 / globalScale, 2);
    ctx.font = `${levelFontSize}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(levelText, x, y + size + levelFontSize + 2);
  }, [selectedNodeId, hoveredNodeId]);

  const linkColor = useCallback((link: LinkObject) => {
    const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
    const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
    
    if (selectedNodeId === sourceId || selectedNodeId === targetId) {
      return 'rgba(255,255,255,0.6)';
    }
    return 'rgba(255,255,255,0.15)';
  }, [selectedNodeId]);

  const linkWidth = useCallback((link: LinkObject) => {
    const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
    const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
    
    if (selectedNodeId === sourceId || selectedNodeId === targetId) {
      return 2;
    }
    return 1;
  }, [selectedNodeId]);

  return (
    <ForceGraph2D
      ref={graphRef}
      graphData={graphData}
      width={width}
      height={height}
      nodeLabel={(node) => (node as GraphNode).name}
      nodeCanvasObject={nodeCanvasObject}
      nodePointerAreaPaint={(node, color, ctx) => {
        const graphNode = node as GraphNode;
        const size = 8 + graphNode.level * 6;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x || 0, node.y || 0, size + 5, 0, 2 * Math.PI);
        ctx.fill();
      }}
      linkColor={linkColor}
      linkWidth={linkWidth}
      linkDirectionalArrowLength={6}
      linkDirectionalArrowRelPos={1}
      linkCurvature={0.1}
      onNodeClick={handleNodeClick}
      onNodeHover={handleNodeHover}
      backgroundColor="transparent"
      d3AlphaDecay={0.02}
      d3VelocityDecay={0.3}
      warmupTicks={100}
      cooldownTicks={100}
    />
  );
};
