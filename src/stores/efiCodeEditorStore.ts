import { create } from 'zustand';

export interface Block {
  id: string;
  html: string;
  order: number;
}

interface EditorState {
  // State
  blocks: Block[];
  selectedBlockId: string | null;
  history: Block[][];
  historyIndex: number;
  isLoading: boolean;
  
  // Actions
  setBlocks: (blocks: Block[]) => void;
  addBlock: (html: string, afterId?: string) => void;
  removeBlock: (id: string) => void;
  duplicateBlock: (id: string) => void;
  updateBlockHtml: (id: string, html: string) => void;
  reorderBlocks: (fromIndex: number, toIndex: number) => void;
  selectBlock: (id: string | null) => void;
  clearSelection: () => void;
  
  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Serialization (compatible with current DB format)
  serialize: () => Record<string, any>;
  deserialize: (content: Record<string, any>) => void;
  
  // Reset
  reset: () => void;
  setLoading: (loading: boolean) => void;
}

const MAX_HISTORY = 50;

const generateBlockId = (): string => {
  return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const useEfiCodeEditorStore = create<EditorState>((set, get) => ({
  // Initial state
  blocks: [],
  selectedBlockId: null,
  history: [[]],
  historyIndex: 0,
  isLoading: false,

  setBlocks: (blocks) => {
    set({ blocks });
    get().pushHistory();
  },

  addBlock: (html, afterId) => {
    const { blocks } = get();
    const newBlock: Block = {
      id: generateBlockId(),
      html,
      order: blocks.length,
    };
    
    let newBlocks: Block[];
    
    if (afterId) {
      const afterIndex = blocks.findIndex(b => b.id === afterId);
      if (afterIndex >= 0) {
        newBlocks = [
          ...blocks.slice(0, afterIndex + 1),
          newBlock,
          ...blocks.slice(afterIndex + 1),
        ].map((b, i) => ({ ...b, order: i }));
      } else {
        newBlocks = [...blocks, newBlock].map((b, i) => ({ ...b, order: i }));
      }
    } else {
      newBlocks = [...blocks, newBlock].map((b, i) => ({ ...b, order: i }));
    }
    
    set({ blocks: newBlocks, selectedBlockId: newBlock.id });
    get().pushHistory();
  },

  removeBlock: (id) => {
    const { blocks, selectedBlockId } = get();
    const newBlocks = blocks.filter(b => b.id !== id).map((b, i) => ({ ...b, order: i }));
    
    set({ 
      blocks: newBlocks,
      selectedBlockId: selectedBlockId === id ? null : selectedBlockId 
    });
    get().pushHistory();
  },

  duplicateBlock: (id) => {
    const { blocks } = get();
    const blockIndex = blocks.findIndex(b => b.id === id);
    if (blockIndex === -1) return;
    
    const originalBlock = blocks[blockIndex];
    const newBlock: Block = {
      id: generateBlockId(),
      html: originalBlock.html,
      order: blockIndex + 1,
    };
    
    const newBlocks = [
      ...blocks.slice(0, blockIndex + 1),
      newBlock,
      ...blocks.slice(blockIndex + 1),
    ].map((b, i) => ({ ...b, order: i }));
    
    set({ blocks: newBlocks, selectedBlockId: newBlock.id });
    get().pushHistory();
  },

  updateBlockHtml: (id, html) => {
    const { blocks } = get();
    const newBlocks = blocks.map(b => 
      b.id === id ? { ...b, html } : b
    );
    set({ blocks: newBlocks });
    get().pushHistory();
  },

  reorderBlocks: (fromIndex, toIndex) => {
    const { blocks } = get();
    if (fromIndex === toIndex) return;
    
    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex, 0, movedBlock);
    
    // Update order property
    const reorderedBlocks = newBlocks.map((b, i) => ({ ...b, order: i }));
    
    set({ blocks: reorderedBlocks });
    get().pushHistory();
  },

  selectBlock: (id) => {
    set({ selectedBlockId: id });
  },

  clearSelection: () => {
    set({ selectedBlockId: null });
  },

  pushHistory: () => {
    const { blocks, history, historyIndex } = get();
    const snapshot = JSON.parse(JSON.stringify(blocks));
    
    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot);
    
    // Limit history size
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }
    
    set({ 
      history: newHistory, 
      historyIndex: newHistory.length - 1 
    });
  },

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      set({ 
        blocks: JSON.parse(JSON.stringify(history[newIndex])),
        historyIndex: newIndex 
      });
    }
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      set({ 
        blocks: JSON.parse(JSON.stringify(history[newIndex])),
        historyIndex: newIndex 
      });
    }
  },

  canUndo: () => {
    const { historyIndex } = get();
    return historyIndex > 0;
  },

  canRedo: () => {
    const { historyIndex, history } = get();
    return historyIndex < history.length - 1;
  },

  // Serialize to database format (compatible with Craft.js format)
  serialize: () => {
    const { blocks } = get();
    
    const nodes: Record<string, any> = {
      ROOT: {
        type: { resolvedName: 'Container' },
        isCanvas: true,
        props: { background: 'transparent', padding: 0, minHeight: 400, alignItems: 'stretch' },
        displayName: 'Container',
        custom: {},
        hidden: false,
        nodes: blocks.map(b => b.id),
        linkedNodes: {},
        parent: null
      }
    };
    
    blocks.forEach(block => {
      nodes[block.id] = {
        type: { resolvedName: 'Bloco HTML' },
        isCanvas: false,
        props: { htmlTemplate: block.html, html: '' },
        displayName: 'Bloco HTML',
        custom: {},
        hidden: false,
        nodes: [],
        linkedNodes: {},
        parent: 'ROOT'
      };
    });
    
    return nodes;
  },

  // Deserialize from database format
  deserialize: (content) => {
    if (!content || typeof content !== 'object') {
      set({ blocks: [], history: [[]], historyIndex: 0 });
      return;
    }
    
    const root = content.ROOT;
    if (!root?.nodes || !Array.isArray(root.nodes)) {
      set({ blocks: [], history: [[]], historyIndex: 0 });
      return;
    }
    
    const blocks: Block[] = root.nodes
      .filter((id: string) => content[id])
      .map((id: string, index: number) => ({
        id,
        html: content[id]?.props?.htmlTemplate || content[id]?.props?.html || '',
        order: index
      }));
    
    set({ 
      blocks, 
      selectedBlockId: null,
      history: [JSON.parse(JSON.stringify(blocks))],
      historyIndex: 0
    });
  },

  reset: () => {
    set({
      blocks: [],
      selectedBlockId: null,
      history: [[]],
      historyIndex: 0,
      isLoading: false,
    });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },
}));
