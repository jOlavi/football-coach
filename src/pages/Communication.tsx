import { useState } from 'react';
import { Copy, Check, MessageSquare } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useMatchStore } from '../store/useMatchStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Input';
import { DEFAULT_TEMPLATES, fillTemplate } from '../utils/messageTemplates';
import { format } from 'date-fns';
import type { MessageTemplate } from '../types';

const TYPE_LABELS: Record<string, string> = {
  match_reminder: 'Ottelumuistutus',
  tournament_info: 'Turnausinfo',
  training_change: 'Harjoitusmuutos',
  custom: 'Muu',
};

const TYPE_COLORS: Record<string, 'blue' | 'yellow' | 'purple' | 'gray'> = {
  match_reminder: 'blue', tournament_info: 'yellow', training_change: 'purple', custom: 'gray',
};

export function Communication() {
  const players = usePlayerStore((s) => s.players);
  const matches = useMatchStore((s) => s.matches);

  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate>(DEFAULT_TEMPLATES[0]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [customTime, setCustomTime] = useState('');
  const [copied, setCopied] = useState(false);

  const activePlayers = players.filter((p) => p.active);
  const upcomingMatches = matches
    .filter((m) => !m.result)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const selectedMatch = matches.find((m) => m.id === selectedMatchId);
  const selectedPlayer = activePlayers.find((p) => p.id === selectedPlayerId);

  const generated = fillTemplate(selectedTemplate.content, {
    parentName: selectedPlayer?.parentName ?? '{parentName}',
    playerName: selectedPlayer?.name ?? '{playerName}',
    matchDate: selectedMatch ? format(new Date(selectedMatch.date), 'dd.MM.yyyy') : '{matchDate}',
    matchTime: selectedMatch ? format(new Date(selectedMatch.date), 'HH:mm') : customTime || '{matchTime}',
    venue: selectedMatch?.venue ?? '{venue}',
    opponent: selectedMatch?.opponent ?? '{opponent}',
  });

  function copyToClipboard() {
    navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Template selector */}
        <div className="space-y-4">
          <Card>
            <h2 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Viestipohjat</h2>
            <div className="space-y-2">
              {DEFAULT_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedTemplate.id === t.id
                      ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-700'
                      : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{t.title}</span>
                    <Badge label={TYPE_LABELS[t.type]} color={TYPE_COLORS[t.type]} />
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Täytä tiedot</h2>
            <div className="space-y-3">
              <Select
                label="Ottelu (valinnainen)"
                value={selectedMatchId}
                onChange={(e) => setSelectedMatchId(e.target.value)}
              >
                <option value="">— Valitse ottelu —</option>
                {upcomingMatches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {format(new Date(m.date), 'dd.MM')} vs {m.opponent}
                  </option>
                ))}
              </Select>
              <Select
                label="Pelaaja / Vanhempi (valinnainen)"
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
              >
                <option value="">— Valitse pelaaja —</option>
                {activePlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.parentName})
                  </option>
                ))}
              </Select>
              {!selectedMatchId && (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-200">Aika (jos ottelua ei valittu)</label>
                  <input
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                  />
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Generated message */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-brand-600" />
              <h2 className="font-semibold text-gray-900 dark:text-slate-100">Generoitu viesti</h2>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
              onClick={copyToClipboard}
            >
              {copied ? 'Kopioitu!' : 'Kopioi'}
            </Button>
          </div>
          <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-slate-200 bg-gray-50 dark:bg-slate-900 rounded-lg p-4 font-sans leading-relaxed min-h-[300px]">
            {generated}
          </pre>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
            Vinkki: kopioi ja liitä WhatsAppiin, tekstiviestiin tai sähköpostiin.
          </p>
        </Card>
      </div>

      {/* All players quick contact */}
      <Card>
        <h2 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Vanhempien yhteystiedot</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {activePlayers.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-slate-900 rounded-lg text-sm">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">{p.parentName}</p>
              </div>
              <p className="text-xs text-gray-600 dark:text-slate-300">{p.parentContact || '—'}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
