export type NodeId = string | number;
export interface NodeData<T = unknown> { id: NodeId; data?: T; label?: string; attributes?: Record<string, unknown>; }
export interface EdgeData<W = number, T = unknown> { id: string; source: NodeId; target: NodeId; weight: W; data?: T; label?: string; directed?: boolean; }
export interface GraphOptions { allowSelfLoops?: boolean; allowMultiEdges?: boolean; }
export interface SearchResult { visited: NodeId[]; order: NodeId[]; parent: Map<NodeId, NodeId | null>; depth: Map<NodeId, number>; discoveryTime: Map<NodeId, number>; finishTime: Map<NodeId, number>; }
export interface ShortestPathResult { distances: Map<NodeId, number>; predecessors: Map<NodeId, NodeId | null>; path: (target: NodeId) => NodeId[]; hasNegativeCycle?: boolean; }
export interface AllPairsResult { distances: Map<NodeId, Map<NodeId, number>>; next: Map<NodeId, Map<NodeId, NodeId | null>>; path: (source: NodeId, target: NodeId) => NodeId[]; hasNegativeCycle: boolean; }
export interface MSTResult { edges: EdgeData[]; totalWeight: number; nodeCount: number; edgeCount: number; }
export interface ComponentResult { components: NodeId[][]; componentOf: Map<NodeId, number>; count: number; largestComponent: NodeId[]; }
export interface ColoringResult { coloring: Map<NodeId, number>; chromaticNumber: number; isValid: boolean; }
export interface SerializedGraph { type: 'graph' | 'digraph'; directed: boolean; nodes: NodeData[]; edges: EdgeData[]; metadata?: Record<string, unknown>; }
export type HeuristicFn = (a: NodeId, b: NodeId) => number;
export type WeightFn = (edge: EdgeData) => number;
export const DEFAULT_WEIGHT: WeightFn = (e) => (typeof e.weight === 'number' ? e.weight : 1);
export const INFINITY = Number.POSITIVE_INFINITY;
