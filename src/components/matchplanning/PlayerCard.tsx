import { AlertTriangle } from 'lucide-react';
import type { Player, Position } from '../../types';
import { Badge } from '../ui/Badge';

const POSITION_LABELS: Record<Position, string> = {
  goalkeeper: 'MV',
  defender: 'PU',
  midfielder: 'KK',
  forward: 'HY',
};

interface PlayerCardProps {
  player: Player;
  gamesPlayedPct: number;
  onTransfer: () => void;
  conflictOpponent?: string;
}

export function PlayerCard({ player, gamesPlayedPct, onTransfer, conflictOpponent }: PlayerCardProps) {
  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData('text/plain', player.id);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${player.name} - klikkaa vaihtaaksesi joukkueeseen`}
      draggable
      onDragStart={handleDragStart}
      onClick={onTransfer}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTransfer();
        }
      }}
      className="border-l-4 border-l-transparent bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm select-none transition-all cursor-pointer hover:shadow-md active:scale-95"
    >
      <div className="flex items-start justify-between mb-1">
        <span className="text-xl font-bold text-gray-700 dark:text-slate-200">#{player.number}</span>
      </div>
      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 leading-tight truncate">{player.name}</p>
      {conflictOpponent && (
        <div className="flex items-center gap-1 mt-1" title={`Varattuna: vs ${conflictOpponent}`}>
          <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />
          <span className="text-xs text-amber-600 dark:text-amber-400 truncate">vs {conflictOpponent}</span>
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        <Badge label={POSITION_LABELS[player.position]} color="gray" />
        <span className="text-xs text-gray-400 dark:text-slate-500">{Math.round(gamesPlayedPct)}%</span>
      </div>
    </div>
  );
}
