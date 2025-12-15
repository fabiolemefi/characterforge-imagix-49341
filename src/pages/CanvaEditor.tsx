import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCanvaEditor } from '@/hooks/useCanvaEditor';
import { KonvaCanvas } from '@/components/canva/editor/KonvaCanvas';
import { EditorSidebar } from '@/components/canva/editor/EditorSidebar';
import { EditorToolbar } from '@/components/canva/editor/EditorToolbar';
import { CanvaObject } from '@/types/canvaEditor';

export default function CanvaEditor() {
  const navigate = useNavigate();
  const stageRef = useRef<any>(null);

  const {
    state,
    selectedObject,
    canUndo,
    canRedo,
    addObject,
    updateObject,
    deleteObject,
    selectObject,
    toggleSelectObject,
    reorderObjects,
    setCanvasSettings,
    undo,
    redo,
    setZoom,
    groupObjects,
    ungroupObject,
  } = useCanvaEditor();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        state.selectedIds.forEach(id => deleteObject(id));
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        }
        if (e.key === 'y') {
          e.preventDefault();
          redo();
        }
        if (e.key === 'g') {
          e.preventDefault();
          if (e.shiftKey) {
            // Ungroup
            if (selectedObject?.type === 'group') {
              ungroupObject(selectedObject.id);
            }
          } else {
            // Group
            if (state.selectedIds.length > 1) {
              groupObjects();
            }
          }
        }
      }

      if (e.key === 'Escape') {
        selectObject(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedIds, selectedObject, deleteObject, undo, redo, selectObject, groupObjects, ungroupObject]);

  const handleZoomIn = () => {
    setZoom(Math.min(state.zoom + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(state.zoom - 0.1, 0.25));
  };

  const handleDelete = () => {
    state.selectedIds.forEach(id => deleteObject(id));
  };

  const handleUpdate = (updates: Partial<CanvaObject>) => {
    state.selectedIds.forEach(id => updateObject(id, updates));
  };

  const handleDuplicate = () => {
    if (selectedObject) {
      const newObject: CanvaObject = {
        ...selectedObject,
        id: `${selectedObject.type}-${Date.now()}`,
        x: selectedObject.x + 20,
        y: selectedObject.y + 20,
        name: `${selectedObject.name || selectedObject.type} (cópia)`,
      };
      addObject(newObject);
    }
  };

  const handleUngroup = () => {
    if (selectedObject?.type === 'group') {
      ungroupObject(selectedObject.id);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-4 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate('/canva/blocos')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Logo" className="h-8" />
          <span className="font-semibold">Editor de Design</span>
        </div>
      </header>

      {/* Toolbar */}
      <EditorToolbar
        selectedObject={selectedObject}
        selectedIds={state.selectedIds}
        zoom={state.zoom}
        canUndo={canUndo}
        canRedo={canRedo}
        stageRef={stageRef}
        onUndo={undo}
        onRedo={redo}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
        onDuplicate={handleDuplicate}
        onGroup={groupObjects}
        onUngroup={handleUngroup}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <EditorSidebar
          objects={state.objects}
          selectedId={state.selectedIds[0] || null}
          canvasSettings={state.canvasSettings}
          onAddObject={addObject}
          onSelectObject={selectObject}
          onUpdateSettings={setCanvasSettings}
          onReorderObjects={reorderObjects}
          onDeleteObject={deleteObject}
          onUpdateObject={updateObject}
        />

        {/* Canvas */}
        <KonvaCanvas
          objects={state.objects}
          selectedIds={state.selectedIds}
          canvasSettings={state.canvasSettings}
          zoom={state.zoom}
          onSelect={selectObject}
          onToggleSelect={toggleSelectObject}
          onUpdate={updateObject}
          onDeleteObject={deleteObject}
          onSetBackgroundImage={(src) => setCanvasSettings({ backgroundImage: src })}
        />
      </div>
    </div>
  );
}
