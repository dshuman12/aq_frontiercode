export class GraphError extends Error { constructor(m: string) { super(m); this.name = 'GraphError'; } }
export class NodeNotFoundError extends GraphError { public readonly nodeId: NodeId; constructor(nodeId: any) { super(`Node '${nodeId}' not found`); this.name = 'NodeNotFoundError'; this.nodeId = nodeId; } }
export class EdgeNotFoundError extends GraphError { constructor(s: any, t: any) { super(`Edge '${s}'->'${t}' not found`); this.name = 'EdgeNotFoundError'; } }
export class CycleDetectedError extends GraphError { public readonly cycle: any[]; constructor(cycle: any[]) { super(`Cycle: ${cycle.join('->')}`); this.name = 'CycleDetectedError'; this.cycle = cycle; } }
export class NegativeWeightError extends GraphError { constructor(s: any, t: any, w: number) { super(`Negative weight ${w} on edge '${s}'->'${t}'`); this.name = 'NegativeWeightError'; } }
export class NegativeCycleError extends GraphError { constructor() { super('Negative-weight cycle detected'); this.name = 'NegativeCycleError'; } }
export class DisconnectedGraphError extends GraphError { constructor(op: string) { super(`Graph must be connected for: ${op}`); this.name = 'DisconnectedGraphError'; } }
export class InvalidOperationError extends GraphError { constructor(m: string) { super(m); this.name = 'InvalidOperationError'; } }
export class DuplicateNodeError extends GraphError { constructor(id: any) { super(`Node '${id}' already exists`); this.name = 'DuplicateNodeError'; } }
import { NodeId } from './types';
