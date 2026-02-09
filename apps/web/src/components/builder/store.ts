import { create } from "zustand";
import type { Edge, Node, NodeChange, EdgeChange, Connection } from "reactflow";
import { applyEdgeChanges, applyNodeChanges, addEdge } from "reactflow";

interface Snapshot {
  nodes: Node[];
  edges: Edge[];
}

interface BuilderState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId?: string;
  dirty: boolean;
  history: Snapshot[];
  future: Snapshot[];
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  selectNode: (id?: string) => void;
  markSaved: () => void;
  snapshot: () => void;
  undo: () => void;
  redo: () => void;
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: undefined,
  dirty: false,
  history: [],
  future: [],
  setNodes: (nodes) => set({ nodes, dirty: true }),
  setEdges: (edges) => set({ edges, dirty: true }),
  onNodesChange: (changes) => {
    const nodes = applyNodeChanges(changes, get().nodes);
    set({ nodes, dirty: true });
  },
  onEdgesChange: (changes) => {
    const edges = applyEdgeChanges(changes, get().edges);
    set({ edges, dirty: true });
  },
  onConnect: (connection) => {
    const edges = addEdge({ ...connection, animated: true }, get().edges);
    set({ edges, dirty: true });
  },
  selectNode: (id) => set({ selectedNodeId: id }),
  markSaved: () => set({ dirty: false }),
  snapshot: () => {
    const { nodes, edges, history } = get();
    set({ history: [...history, { nodes, edges }].slice(-50), future: [] });
  },
  undo: () => {
    const { history, nodes, edges } = get();
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    set({
      nodes: prev.nodes,
      edges: prev.edges,
      history: history.slice(0, -1),
      future: [{ nodes, edges }, ...get().future]
    });
  },
  redo: () => {
    const { future, nodes, edges } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      nodes: next.nodes,
      edges: next.edges,
      future: future.slice(1),
      history: [...get().history, { nodes, edges }]
    });
  }
}));
