import { useDrillStore } from '../store/useDrillStore';
import type { Drill } from '../types';

export async function saveDrill(data: Omit<Drill, 'id' | 'createdAt'>): Promise<Drill> {
  const drill: Drill = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  useDrillStore.getState().addDrill(drill);
  return drill;
}

export async function updateDrill(
  id: string,
  data: Partial<Omit<Drill, 'id' | 'createdAt'>>
): Promise<void> {
  useDrillStore.getState().updateDrill(id, data);
}

export async function getDrills(): Promise<Drill[]> {
  return useDrillStore.getState().drills;
}

export async function deleteDrill(id: string): Promise<void> {
  useDrillStore.getState().deleteDrill(id);
}
