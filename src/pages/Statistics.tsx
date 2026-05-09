import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import { usePlayerStore } from '../store/usePlayerStore';
import { useMatchStore } from '../store/useMatchStore';
import { Card, StatCard } from '../components/ui/Card';
import { Trophy, Target, TrendingUp, Users } from 'lucide-react';
import { getPlayerGoals, getPlayerMatchCount, getTeamRecord, getTopScorers } from '../utils/stats';
import { format } from 'date-fns';

export function Statistics() {
  const players = usePlayerStore((s) => s.players);
  const matches = useMatchStore((s) => s.matches);

  const activePlayers = players.filter((p) => p.active);
  const playedMatches = matches.filter((m) => m.result).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const record = getTeamRecord(matches);
  const topScorers = getTopScorers(activePlayers, matches, 8);

  const goalData = playedMatches.map((m) => ({
    name: format(new Date(m.date), 'dd.MM'),
    For: m.result!.goalsFor,
    Against: m.result!.goalsAgainst,
  }));

  const participationData = activePlayers
    .map((p) => ({
      name: p.name.split(' ')[0],
      games: getPlayerMatchCount(p.id, matches),
      goals: getPlayerGoals(p.id, matches),
    }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 10);

  const resultPie = [
    { name: 'Voitot', value: record.wins },
    { name: 'Tasapelit', value: record.draws },
    { name: 'Häviöt', value: record.losses },
  ].filter((d) => d.value > 0);

  if (playedMatches.length === 0) {
    return (
      <Card>
        <p className="text-center text-gray-400 dark:text-slate-500 py-12">Ei ottelutietoja vielä. Kirjaa tuloksia nähdäksesi tilastot.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pelatut ottelut" value={record.played} icon={<Trophy size={18} />} color="bg-brand-600" />
        <StatCard label="Tehdyt maalit" value={record.goalsFor} icon={<Target size={18} />} color="bg-blue-500" />
        <StatCard label="Voittoprosentti" value={`${record.played ? Math.round((record.wins / record.played) * 100) : 0}%`} icon={<TrendingUp size={18} />} color="bg-amber-500" />
        <StatCard label="Pelaajat" value={activePlayers.length} icon={<Users size={18} />} color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Goals per match */}
        <Card className="lg:col-span-2">
          <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-4">Maalit per ottelu</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={goalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="For" fill="#22c55e" radius={[4, 4, 0, 0]} name="Omat" />
              <Bar dataKey="Against" fill="#ef4444" radius={[4, 4, 0, 0]} name="Vastustaja" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Win/Draw/Loss */}
        <Card>
          <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-4">Tulokset</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={resultPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {resultPie.map((_, i) => <Cell key={i} fill={['#22c55e', '#f59e0b', '#ef4444'][i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 text-xs">
            <span className="text-green-600 font-medium">V: {record.wins}</span>
            <span className="text-amber-600 font-medium">T: {record.draws}</span>
            <span className="text-red-500 font-medium">H: {record.losses}</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Player appearances */}
        <Card>
          <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-4">Pelaajien esiintymiset</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={participationData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={70} />
              <Tooltip />
              <Bar dataKey="games" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Ottelut" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Top scorers */}
        <Card>
          <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-4">Maalitykki-lista</h3>
          {topScorers.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 py-4 text-center">Ei maaleja kirjattu vielä</p>
          ) : (
            <div className="space-y-2">
              {topScorers.map(({ player, goals }, i) => (
                <div key={player.id} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-slate-200' : i === 2 ? 'bg-amber-700 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'}`}>
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium">{player.name}</span>
                  <div className="flex items-center gap-1">
                    <div className="h-2 bg-brand-500 rounded-full" style={{ width: `${(goals / topScorers[0].goals) * 80}px` }} />
                    <span className="text-sm font-bold text-gray-900 dark:text-slate-100 w-6 text-right">{goals}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
