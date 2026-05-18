import type { TrainingSession, Drill } from '../../types';

export function serializeSession(s: TrainingSession): { id: string } & Record<string, unknown> {
  const { groupSets, ...rest } = s;
  return {
    ...rest,
    groupSetsJson: groupSets != null ? JSON.stringify(groupSets) : null,
  };
}

export function deserializeSession(data: Record<string, unknown>): TrainingSession {
  const { groupSetsJson, ...rest } = data as { groupSetsJson?: string | null } & Record<string, unknown>;
  return {
    ...rest,
    groupSets: groupSetsJson ? JSON.parse(groupSetsJson) : undefined,
  } as TrainingSession;
}

export function serializeDrill(d: Drill): { id: string } & Record<string, unknown> {
  const { shapes, canvasDataUrl, ...rest } = d;
  return {
    ...rest,
    shapesJson: JSON.stringify(shapes),
  };
}

export function deserializeDrill(data: Record<string, unknown>): Drill {
  const { shapesJson, ...rest } = data as { shapesJson?: string } & Record<string, unknown>;
  return {
    ...rest,
    shapes: shapesJson ? JSON.parse(shapesJson) : [],
    canvasDataUrl: '',
  } as Drill;
}
