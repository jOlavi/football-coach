import { AlertTriangle } from 'lucide-react';
import type { Player, AvailabilityStatus, Position } from '../../types';
import { Badge } from '../ui/Badge';

const POSITION_LABELS: Record<Position, string> = {
  goalkeeper: 'MV',
  defender: 'PU',
  midfielder: 'KK',
  forward: 'HY',
};

const AVAILABILITY_NEXT: Record<AvailabilityStatus, AvailabilityStatus> = {
  available: 'unavailable',
  unavailable: 'available',
  unknown: 'available', // first click on unset player marks them available
};

const BORDER_COLOR: Record<AvailabilityStatus, string> = {
  available: 'border-l-green-400',
  unavailable: 'border-l-red-400',
  unknown: 'border-l-transparent',
};

const DOT_COLOR: Record<AvailabilityStatus, string> = {
  available: 'bg-green-500',
  unavailable: 'bg-red-500',
  unknown: 'bg-gray-200 dark:bg-slate-600',
};

interface PlayerCardProps {
  player: Player;
  gamesPlayedPct: number;
  availability: AvailabilityStatus;
  onAvailabilityChange: (status: AvailabilityStatus) => void;
  onTransfer: () => void;
  conflictOpponent?: string;
}

export function PlayerCard({
  player,
  gamesPlayedPct,
  availability,
  onAvailabilityChange,
  onTransfer,
  conflictOpponent,
}: PlayerCardProps) {
  const unavailable = availability === 'unavailable';

  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData('text/plain', player.id);
  }

  return (
    <div
      role="button"
      tabIndex={unavailable ? -1 : 0}
      aria-label={`${player.name}${unavailable ? ' (ei saatavilla)' : ' - klikkaa vaihtaaksesi joukkueeseen'}`}
      draggable={!unavailable}
      onDragStart={handleDragStart}
      onClick={unavailable ? undefined : onTransfer}
      onKeyDown={(e) => {
        if (!unavailable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onTransfer();
        }
      }}
      className={`border-l-4 ${BORDER_COLOR[availability]} bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm select-none transition-all ${
        unavailable
          ? 'opacity-40 cursor-not-allowed'
          : 'cursor-pointer hover:shadow-md active:scale-95'
      }`}
    >
      <div className="flex items-start justify-between mb-1">
        <span className="text-xl font-bold text-gray-700 dark:text-slate-200">#{player.number}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAvailabilityChange(AVAILABILITY_NEXT[availability]);
          }}
          aria-label="Vaihda saatavuus"
          className={`w-7 h-7 rounded-full mt-1 flex-shrink-0 flex items-center justify-center ${DOT_COLOR[availability]}`}
        >
          <span className="w-2 h-2 rounded-full bg-white" />
        </button>
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
