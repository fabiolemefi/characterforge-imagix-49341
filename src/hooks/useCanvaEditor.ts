import { useReducer, useCallback } from 'react';
import { EditorState, EditorAction, CanvaObject, CanvasSettings } from '@/types/canvaEditor';

const initialState: EditorState = {
  objects: [],
  selectedId: null,
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
        selectedId: action.payload.id,
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
        selectedId: state.selectedId === action.payload ? null : state.selectedId,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }
    case 'SELECT_OBJECT':
      return { ...state, selectedId: action.payload };
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
          selectedId: null,
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
          selectedId: null,
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
        selectedId: null,
      };
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

  const selectedObject = state.objects.find((obj) => obj.id === state.selectedId) || null;
  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  return {
    state,
    selectedObject,
    canUndo,
    canRedo,
    addObject,
    updateObject,
    deleteObject,
    selectObject,
    reorderObjects,
    setCanvasSettings,
    undo,
    redo,
    setZoom,
    loadState,
  };
}
