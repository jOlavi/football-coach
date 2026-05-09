import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Info, CheckCircle, ChevronRight } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useMatchStore } from '../store/useMatchStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { format } from 'date-fns';

interface Reminder {
  id: string;
  type: 'warning' | 'info' | 'ok';
  title: string;
  detail: string;
  action?: { label: string; path: string };
}

export function Reminders() {
  const navigate = useNavigate();
  const players = usePlayerStore((s) => s.players);
  const matches = useMatchStore((s) => s.matches);

  const activePlayers = players.filter((p) => p.active);
  const upcoming = matches
    .filter((m) => !m.result)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const reminders: Reminder[] = [];

  // Matches without lineups
  upcoming.forEach((m) => {
    if (m.lineup.length < 7) {
      const daysUntil = Math.ceil((new Date(m.date).getTime() - Date.now()) / 86400000);
      reminders.push({
        id: `lineup-${m.id}`,
        type: daysUntil <= 3 ? 'warning' : 'info',
        title: `Puutteellinen kokoonpano: vs ${m.opponent}`,
        detail: `Ottelu ${format(new Date(m.date), 'dd.MM.yyyy')} — vain ${m.lineup.length} pelaajaa valittu. Tarvitaan vähintään 7.`,
        action: { label: 'Suunnittele kokoonpano', path: '/planning' },
      });
    }
  });

  // Matches without availability set
  upcoming.forEach((m) => {
    const daysUntil = Math.ceil((new Date(m.date).getTime() - Date.now()) / 86400000);
    if (daysUntil <= 7 && m.availability.length === 0) {
      reminders.push({
        id: `avail-${m.id}`,
        type: 'info',
        title: `Saatavuus asettamatta: vs ${m.opponent}`,
        detail: `Ottelu ${daysUntil} päivän päästä. Pelaajien saatavuutta ei ole merkitty.`,
        action: { label: 'Aseta saatavuus', path: '/planning' },
      });
    }
  });

  // Missing parent contacts
  const missingContact = activePlayers.filter((p) => !p.parentContact);
  if (missingContact.length > 0) {
    reminders.push({
      id: 'missing-contact',
      type: 'info',
      title: 'Puuttuvat yhteystiedot',
      detail: `${missingContact.map((p) => p.name).join(', ')} — ei yhteystietoja.`,
      action: { label: 'Päivitä pelaajat', path: '/players' },
    });
  }

  // All clear
  if (reminders.length === 0) {
    reminders.push({
      id: 'all-clear',
      type: 'ok',
      title: 'Kaikki kunnossa!',
      detail: 'Ei avoimia muistutuksia. Olet ajantasalla.',
    });
  }

  const warnings = reminders.filter((r) => r.type === 'warning');
  const infos = reminders.filter((r) => r.type === 'info');
  const oks = reminders.filter((r) => r.type === 'ok');

  const ICONS = {
    warning: <AlertTriangle size={18} className="text-yellow-500 shrink-0" />,
    info: <Info size={18} className="text-blue-500 shrink-0" />,
    ok: <CheckCircle size={18} className="text-green-500 shrink-0" />,
  };

  const BG = {
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    ok: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  };

  function ReminderItem({ r }: { r: Reminder }) {
    return (
      <div className={`flex items-start gap-3 p-4 rounded-xl border ${BG[r.type]}`}>
        {ICONS[r.type]}
        <div className="flex-1">
          <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm">{r.title}</p>
          <p className="text-sm text-gray-600 dark:text-slate-300 mt-0.5">{r.detail}</p>
        </div>
        {r.action && (
          <Button
            variant="ghost"
            size="sm"
            icon={<ChevronRight size={14} />}
            onClick={() => navigate(r.action!.path)}
          >
            {r.action.label}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4 text-center">
        <Card>
          <p className="text-2xl font-bold text-yellow-500">{warnings.length}</p>
          <p className="text-sm text-gray-500 dark:text-slate-400">Kiireelliset</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold text-blue-500">{infos.length}</p>
          <p className="text-sm text-gray-500 dark:text-slate-400">Tiedoksi</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold text-green-500">{oks.length > 0 ? '✓' : 0}</p>
          <p className="text-sm text-gray-500 dark:text-slate-400">Kunnossa</p>
        </Card>
      </div>

      <div className="space-y-3">
        {[...warnings, ...infos, ...oks].map((r) => (
          <ReminderItem key={r.id} r={r} />
        ))}
      </div>
    </div>
  );
}
