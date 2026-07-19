import { useState, useMemo } from 'react';
import { Check } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTeamStore } from '../../store/useTeamStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface Props {
  initialLineup: string[];
  ownTeamId?: string;
  onSave: (lineup: string[]) => void;
  onClose: () => void;
}

export function TournamentLineupModal({ initialLineup, ownTeamId, onSave, onClose }: Props) {
  const players = usePlayerStore((s) => s.players);
  const teams = useTeamStore((s) => s.teams);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialLineup));

  const team = ownTeamId ? teams.find((t) => t.id === ownTeamId) : null;

  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      if (!p.active) return false;
      if (team?.level === 'taso1') return p.skillLevel === 1 || p.skillLevel === 3;
      if (team?.level === 'taso2') return p.skillLevel === 2 || p.skillLevel === 3;
      return true;
    });
  }, [players, team]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Modal title="Kokoonpano" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-gray-400 dark:text-slate-500">
          Valittu {selected.size} / {filteredPlayers.length} pelaajaa
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {filteredPlayers.map((p) => {
            const isSelected = selected.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                  isSelected
                    ? 'bg-green-50 border-green-400 dark:bg-green-900/20 dark:border-green-600'
                    : 'bg-white border-gray-200 dark:bg-slate-800 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                }`}
              >
                <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {p.number}
                </span>
                <span className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">
                  {p.name}
                </span>
                {isSelected && (
                  <Check size={12} className="absolute top-1.5 right-1.5 text-green-500" />
                )}
              </button>
            );
          })}
        </div>
        {filteredPlayers.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
            Ei pelaajia. Lisää pelaajia ensin Pelaajat-sivulla.
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Peruuta</Button>
          <Button onClick={() => onSave(Array.from(selected))}>
            Tallenna ({selected.size})
          </Button>
        </div>
      </div>
    </Modal>
  );
}
