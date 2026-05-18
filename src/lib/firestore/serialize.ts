import type { TrainingSession, Drill } from '../../types';

export function serializeSession(s: TrainingSession): { id: string } & Record<string, unknown> {
  const { groupSets, ...rest } = s;
  const exercises = s.exercises?.map(({ canvasDataUrl: _canvas, ...ex }) => ex) ?? [];
  return {
    ...rest,
    exercises,
    groupSetsJson: groupSets != null ? JSON.stringify(groupSets) : null,
  };
}

export function deserializeSession(data: Record<string, unknown>): TrainingSession {
  const { groupSetsJson, ...rest } = data as { groupSetsJson?: string | null } & Record<string, unknown>;
  let groupSets: unknown;
  if (groupSetsJson) {
    try { groupSets = JSON.parse(groupSetsJson); } catch { groupSets = undefined; }
  }
  return { ...rest, groupSets } as TrainingSession;
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
  let shapes: unknown[] = [];
  if (shapesJson) {
    try { shapes = JSON.parse(shapesJson); } catch { shapes = []; }
  }
  return { ...rest, shapes, canvasDataUrl: '' } as Drill;
}
