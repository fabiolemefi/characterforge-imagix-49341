export type CanvaObjectType = 'text' | 'rect' | 'circle' | 'image' | 'line' | 'group';

export interface CanvaObject {
  id: string;
  type: CanvaObjectType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  textDecoration?: string;
  align?: 'left' | 'center' | 'right';
  src?: string;
  opacity?: number;
  visible?: boolean;
  locked?: boolean;
  name?: string;
  points?: number[];
  children?: CanvaObject[]; // For groups
}

export interface CanvasSettings {
  width: number;
  height: number;
  backgroundColor: string;
  backgroundImage?: string;
}

export interface EditorState {
  objects: CanvaObject[];
  selectedIds: string[];
  canvasSettings: CanvasSettings;
  history: CanvaObject[][];
  historyIndex: number;
  zoom: number;
}

export type EditorAction =
  | { type: 'ADD_OBJECT'; payload: CanvaObject }
  | { type: 'UPDATE_OBJECT'; payload: { id: string; updates: Partial<CanvaObject> } }
  | { type: 'DELETE_OBJECT'; payload: string }
  | { type: 'SELECT_OBJECT'; payload: string | null }
  | { type: 'SELECT_OBJECTS'; payload: string[] }
  | { type: 'TOGGLE_SELECT_OBJECT'; payload: string }
  | { type: 'REORDER_OBJECTS'; payload: CanvaObject[] }
  | { type: 'SET_CANVAS_SETTINGS'; payload: Partial<CanvasSettings> }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'LOAD_STATE'; payload: { objects: CanvaObject[]; canvasSettings: CanvasSettings } }
  | { type: 'GROUP_OBJECTS' }
  | { type: 'UNGROUP_OBJECT'; payload: string };
