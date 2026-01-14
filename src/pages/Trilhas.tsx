import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Search, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CareerGraph } from '@/components/career/CareerGraph';
import { CareerSidebar } from '@/components/career/CareerSidebar';
import { mockCareerData, CareerNode, departmentColors } from '@/data/mockCareerData';

const departments = ['Comercial', 'TI', 'RH', 'Financeiro'];

export default function Trilhas() {
  const [selectedNode, setSelectedNode] = useState<CareerNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<CareerNode | null>(null);
  const [filterDepartment, setFilterDepartment] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [selectedNode]);

  const handleNodeClick = useCallback((node: CareerNode) => {
    setSelectedNode(node);
  }, []);

  const handleNodeHover = useCallback((node: CareerNode | null) => {
    setHoveredNode(node);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleNodeSelectFromSidebar = useCallback((nodeId: string) => {
    const node = mockCareerData.nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
    }
  }, []);

  const handleDepartmentFilter = (department: string | null) => {
    setFilterDepartment(department);
    setSelectedNode(null);
  };

  // Filter nodes by search query
  const filteredNodes = searchQuery
    ? mockCareerData.nodes.filter(node =>
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.department.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : mockCareerData.nodes;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">🎯 Trilha de Carreiras</h1>
              <p className="text-slate-400 text-sm">Explore os caminhos de crescimento profissional</p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Buscar cargo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="border-b border-slate-700 bg-slate-900/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-slate-400 mr-2">Filtrar:</span>
            <Button
              variant={filterDepartment === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleDepartmentFilter(null)}
              className={filterDepartment === null ? 'bg-white text-slate-900' : 'border-slate-600 text-slate-300 hover:bg-slate-800'}
            >
              Todos
            </Button>
            {departments.map(dept => (
              <Button
                key={dept}
                variant={filterDepartment === dept ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDepartmentFilter(dept)}
                className={filterDepartment === dept ? '' : 'border-slate-600 text-slate-300 hover:bg-slate-800'}
                style={filterDepartment === dept ? { backgroundColor: departmentColors[dept] } : {}}
              >
                <div
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: departmentColors[dept] }}
                />
                {dept}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-140px)]">
        {/* Graph Container */}
        <div 
          ref={containerRef}
          className="flex-1 relative"
        >
          {/* Tooltip for hovered node */}
          {hoveredNode && !selectedNode && (
            <div className="absolute top-4 left-4 z-10 bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl max-w-xs">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: departmentColors[hoveredNode.department] }}
                />
                <span className="font-medium text-white">{hoveredNode.name}</span>
              </div>
              <p className="text-xs text-slate-400">{hoveredNode.department} • Nível {hoveredNode.level}</p>
              <p className="text-xs text-slate-500 mt-1">Clique para ver detalhes</p>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 z-10 bg-slate-800/90 border border-slate-700 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-2 font-medium">Legenda</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {Object.entries(departmentColors).map(([dept, color]) => (
                <div key={dept} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-slate-300">{dept}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-700">
              <p className="text-xs text-slate-500">Tamanho = Nível hierárquico</p>
            </div>
          </div>

          {/* Instructions */}
          <div className="absolute top-4 right-4 z-10 bg-slate-800/90 border border-slate-700 rounded-lg p-3 text-xs text-slate-400">
            <p>🖱️ Arraste para mover</p>
            <p>🔍 Scroll para zoom</p>
            <p>👆 Clique para detalhes</p>
          </div>

          {/* Force Graph */}
          <CareerGraph
            nodes={searchQuery ? filteredNodes : mockCareerData.nodes}
            links={mockCareerData.links}
            selectedNodeId={selectedNode?.id || null}
            hoveredNodeId={hoveredNode?.id || null}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            width={dimensions.width - (selectedNode ? 320 : 0)}
            height={dimensions.height}
            filterDepartment={filterDepartment}
          />
        </div>

        {/* Sidebar */}
        {selectedNode && (
          <CareerSidebar
            selectedNode={selectedNode}
            nodes={mockCareerData.nodes}
            links={mockCareerData.links}
            onClose={handleCloseSidebar}
            onNodeSelect={handleNodeSelectFromSidebar}
          />
        )}
      </div>
    </div>
  );
}
