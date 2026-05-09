import type { MessageTemplate } from '../types';

export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'match-reminder',
    type: 'match_reminder',
    title: 'Ottelupäivän muistutus',
    content: `Hei {parentName},

Muistutus, että {playerName} pelaa ottelun huomenna!

📅 Päivämäärä: {matchDate}
🕐 Aika: {matchTime}
📍 Kenttä: {venue}
🆚 Vastustaja: {opponent}

Pyydämme paikalle 20 minuuttia ennen ottelun alkua.

Terveisin,
Valmentaja`,
  },
  {
    id: 'tournament-info',
    type: 'tournament_info',
    title: 'Turnausinformaatio',
    content: `Hei {parentName},

Osallistumme turnaukseen ja {playerName} on valittu mukaan!

📅 Päivämäärä: {matchDate}
📍 Kenttä: {venue}
🆚 Turnaus: {opponent}

Pyydämme vahvistamaan osallistumisen vastaamalla tähän viestiin.

Terveisin,
Valmentaja`,
  },
  {
    id: 'training-change',
    type: 'training_change',
    title: 'Harjoitusaikataulun muutos',
    content: `Hei {parentName},

Harjoitusaikataulu on muuttunut:

📅 Uusi päivämäärä: {matchDate}
🕐 Uusi aika: {matchTime}
📍 Paikka: {venue}

Pahoittelemme mahdollisia haittoja. Nähdään siellä!

Terveisin,
Valmentaja`,
  },
];

export function fillTemplate(
  template: string,
  values: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`);
}
