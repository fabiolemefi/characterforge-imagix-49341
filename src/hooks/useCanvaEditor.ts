import { useReducer, useCallback } from 'react';
import { EditorState, EditorAction, CanvaObject, CanvasSettings } from '@/types/canvaEditor';

const initialState: EditorState = {
  objects: [],
  selectedIds: [],
  canvasSettings: {
    width: 600,
    height: 800,
    backgroundColor: '#ffffff',
  },
  history: [[]],
  historyIndex: 0,
  zoom: 1,
};

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'ADD_OBJECT': {
      const newObjects = [...state.objects, action.payload];
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newObjects);
      return {
        ...state,
        objects: newObjects,
        selectedIds: [action.payload.id],
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }
    case 'UPDATE_OBJECT': {
      const newObjects = state.objects.map((obj) =>
        obj.id === action.payload.id ? { ...obj, ...action.payload.updates } : obj
      );
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newObjects);
      return {
        ...state,
        objects: newObjects,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }
    case 'DELETE_OBJECT': {
      const newObjects = state.objects.filter((obj) => obj.id !== action.payload);
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newObjects);
      return {
        ...state,
        objects: newObjects,
        selectedIds: state.selectedIds.filter(id => id !== action.payload),
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }
    case 'SELECT_OBJECT':
      return { ...state, selectedIds: action.payload ? [action.payload] : [] };
    case 'SELECT_OBJECTS':
      return { ...state, selectedIds: action.payload };
    case 'TOGGLE_SELECT_OBJECT': {
      const isSelected = state.selectedIds.includes(action.payload);
      return {
        ...state,
        selectedIds: isSelected
          ? state.selectedIds.filter(id => id !== action.payload)
          : [...state.selectedIds, action.payload],
      };
    }
    case 'REORDER_OBJECTS': {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(action.payload);
      return {
        ...state,
        objects: action.payload,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }
    case 'SET_CANVAS_SETTINGS':
      return {
        ...state,
        canvasSettings: { ...state.canvasSettings, ...action.payload },
      };
    case 'UNDO': {
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1;
        return {
          ...state,
          objects: state.history[newIndex],
          historyIndex: newIndex,
          selectedIds: [],
        };
      }
      return state;
    }
    case 'REDO': {
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1;
        return {
          ...state,
          objects: state.history[newIndex],
          historyIndex: newIndex,
          selectedIds: [],
        };
      }
      return state;
    }
    case 'SET_ZOOM':
      return { ...state, zoom: action.payload };
    case 'LOAD_STATE':
      return {
        ...state,
        objects: action.payload.objects,
        canvasSettings: action.payload.canvasSettings,
        history: [action.payload.objects],
        historyIndex: 0,
        selectedIds: [],
      };
    case 'GROUP_OBJECTS': {
      if (state.selectedIds.length < 2) return state;
      
      const selectedObjects = state.objects.filter(obj => state.selectedIds.includes(obj.id));
      const otherObjects = state.objects.filter(obj => !state.selectedIds.includes(obj.id));
      
      // Calculate bounding box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      selectedObjects.forEach(obj => {
        const x = obj.type === 'circle' ? obj.x - (obj.radius || 50) : obj.x;
        const y = obj.type === 'circle' ? obj.y - (obj.radius || 50) : obj.y;
        const w = obj.width || (obj.type === 'circle' ? (obj.radius || 50) * 2 : 100);
        const h = obj.height || (obj.type === 'circle' ? (obj.radius || 50) * 2 : 100);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
      });
      
      // Adjust children positions relative to group
      const children = selectedObjects.map(obj => ({
        ...obj,
        x: obj.x - minX,
        y: obj.y - minY,
      }));
      
      const groupObj: CanvaObject = {
        id: `group-${Date.now()}`,
        type: 'group',
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        children,
        name: 'Grupo',
      };
      
      const newObjects = [...otherObjects, groupObj];
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newObjects);
      
      return {
        ...state,
        objects: newObjects,
        selectedIds: [groupObj.id],
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }
    case 'UNGROUP_OBJECT': {
      const group = state.objects.find(obj => obj.id === action.payload && obj.type === 'group');
      if (!group || !group.children) return state;
      
      const otherObjects = state.objects.filter(obj => obj.id !== action.payload);
      
      // Restore children positions to absolute
      const restoredChildren = group.children.map(child => ({
        ...child,
        x: child.x + group.x,
        y: child.y + group.y,
      }));
      
      const newObjects = [...otherObjects, ...restoredChildren];
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newObjects);
      
      return {
        ...state,
        objects: newObjects,
        selectedIds: restoredChildren.map(c => c.id),
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }
    default:
      return state;
  }
}

export function useCanvaEditor() {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  const addObject = useCallback((object: CanvaObject) => {
    dispatch({ type: 'ADD_OBJECT', payload: object });
  }, []);

  const updateObject = useCallback((id: string, updates: Partial<CanvaObject>) => {
    dispatch({ type: 'UPDATE_OBJECT', payload: { id, updates } });
  }, []);

  const deleteObject = useCallback((id: string) => {
    dispatch({ type: 'DELETE_OBJECT', payload: id });
  }, []);

  const selectObject = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_OBJECT', payload: id });
  }, []);

  const selectObjects = useCallback((ids: string[]) => {
    dispatch({ type: 'SELECT_OBJECTS', payload: ids });
  }, []);

  const toggleSelectObject = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_SELECT_OBJECT', payload: id });
  }, []);

  const reorderObjects = useCallback((objects: CanvaObject[]) => {
    dispatch({ type: 'REORDER_OBJECTS', payload: objects });
  }, []);

  const setCanvasSettings = useCallback((settings: Partial<CanvasSettings>) => {
    dispatch({ type: 'SET_CANVAS_SETTINGS', payload: settings });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const setZoom = useCallback((zoom: number) => {
    dispatch({ type: 'SET_ZOOM', payload: zoom });
  }, []);

  const loadState = useCallback((objects: CanvaObject[], canvasSettings: CanvasSettings) => {
    dispatch({ type: 'LOAD_STATE', payload: { objects, canvasSettings } });
  }, []);

  const groupObjects = useCallback(() => {
    dispatch({ type: 'GROUP_OBJECTS' });
  }, []);

  const ungroupObject = useCallback((id: string) => {
    dispatch({ type: 'UNGROUP_OBJECT', payload: id });
  }, []);

  const selectedObjects = state.objects.filter((obj) => state.selectedIds.includes(obj.id));
  const selectedObject = selectedObjects.length === 1 ? selectedObjects[0] : null;
  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  return {
    state,
    selectedObject,
    selectedObjects,
    canUndo,
    canRedo,
    addObject,
    updateObject,
    deleteObject,
    selectObject,
    selectObjects,
    toggleSelectObject,
    reorderObjects,
    setCanvasSettings,
    undo,
    redo,
    setZoom,
    loadState,
    groupObjects,
    ungroupObject,
  };
}
