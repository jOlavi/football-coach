# Training Groups, PDF & Dark Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add group generator to training session builder, PDF export for sessions, and a dark/light theme toggle in settings.

**Architecture:** Extend `TrainingSession` with `groupSets?: GroupSet[]` and `startTime?`. A new `SessionBuilder` component replaces the existing modal builder with a two-column layout (exercises left, groups right). Dark mode uses Tailwind `darkMode: 'class'` toggled via `document.documentElement.classList`, controlled by `settings.theme` in the existing settings store.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v3, Zustand 5, `window.print()` for PDF

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/types/index.ts` | Add `GroupSet`, update `TrainingSession`, update `AppSettings` |
| Modify | `src/store/useSettingsStore.ts` | Add `theme` field |
| Modify | `tailwind.config.js` | Enable `darkMode: 'class'` |
| Modify | `src/App.tsx` | Theme sync effect, remove team-generator route |
| Modify | `src/utils/teamGenerator.ts` | Add `generateNGroups` |
| Modify | `src/components/ui/Card.tsx` | Dark variants |
| Modify | `src/components/ui/Button.tsx` | Dark variants |
| Modify | `src/components/ui/Badge.tsx` | Dark variants |
| Modify | `src/components/ui/Modal.tsx` | Dark variants + `extraWide` prop |
| Modify | `src/components/ui/Input.tsx` | Dark variants |
| Modify | `src/components/layout/Layout.tsx` | Dark variants, remove team-generator title |
| Modify | `src/components/layout/Sidebar.tsx` | Remove Joukkuegeneraattori nav item |
| Modify | `src/pages/Settings.tsx` | Add theme toggle |
| Modify | `src/pages/Dashboard.tsx` | Dark variants |
| Modify | `src/pages/Players.tsx` | Dark variants |
| Modify | `src/pages/Matches.tsx` | Dark variants |
| Modify | `src/pages/MatchPlanning.tsx` | Dark variants |
| Modify | `src/components/matchplanning/PlayerCard.tsx` | Dark variants |
| Modify | `src/pages/Statistics.tsx` | Dark variants |
| Modify | `src/pages/Communication.tsx` | Dark variants |
| Modify | `src/pages/Reminders.tsx` | Dark variants |
| Modify | `src/pages/Training.tsx` | Use SessionBuilder, show groups in detail, updated PDF |
| Create | `src/components/training/SessionBuilder.tsx` | Two-column session builder with group generator |
| Delete | `src/pages/TeamGenerator.tsx` | Replaced by group generator in session builder |

---

## Dark Mode Class Reference

Apply this mapping consistently across all files:

| Light class | Add dark variant |
|-------------|-----------------|
| `bg-white` | `dark:bg-slate-800` |
| `bg-gray-50` | `dark:bg-slate-900` |
| `bg-gray-100` | `dark:bg-slate-800` |
| `bg-gray-200` | `dark:bg-slate-700` |
| `border-gray-100` | `dark:border-slate-700` |
| `border-gray-200` | `dark:border-slate-700` |
| `border-gray-300` | `dark:border-slate-600` |
| `text-gray-900` | `dark:text-slate-100` |
| `text-gray-800` | `dark:text-slate-200` |
| `text-gray-700` | `dark:text-slate-200` |
| `text-gray-600` | `dark:text-slate-300` |
| `text-gray-500` | `dark:text-slate-400` |
| `text-gray-400` | `dark:text-slate-500` |
| `text-gray-300` | `dark:text-slate-600` |
| `hover:bg-gray-50` | `dark:hover:bg-slate-700` |
| `hover:bg-gray-100` | `dark:hover:bg-slate-700` |
| `shadow-sm` | `dark:shadow-slate-900` |
| `focus:ring-brand-500` | stays the same |

Brand colors (`brand-600`, `brand-700`, etc.) stay unchanged in dark mode.

---

## Task 1: Types and Settings Store

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/store/useSettingsStore.ts`

- [ ] **Step 1: Add `GroupSet` interface and update `TrainingSession` in `src/types/index.ts`**

Add after the `Exercise` interface (around line 56) and update `TrainingSession`:

```typescript
export interface GroupSet {
  id: string;
  label: string;
  playerIds: string[][];
  groupNames?: string[];
}
```

Update `TrainingSession`:
```typescript
export interface TrainingSession {
  id: string;
  date: string;
  startTime?: string;
  title: string;
  duration: number;
  exercises: Exercise[];
  notes: string;
  groupSets?: GroupSet[];
  createdAt: string;
}
```

- [ ] **Step 2: Add `theme` to `AppSettings` in `src/store/useSettingsStore.ts`**

```typescript
export interface AppSettings {
  teamName: string;
  season: string;
  coachName: string;
  showParentInfo: boolean;
  showDateOfBirth: boolean;
  showRegistration: boolean;
  minLineupSize: number;
  defaultTeamFormat: '5v5' | '7v7' | '8v8' | '11v11';
  theme: 'light' | 'dark';
}

const DEFAULTS: AppSettings = {
  teamName: 'Joukkueeni',
  season: '2026',
  coachName: '',
  showParentInfo: true,
  showDateOfBirth: true,
  showRegistration: true,
  minLineupSize: 5,
  defaultTeamFormat: '5v5',
  theme: 'light',
};
```

- [ ] **Step 3: Verify compilation**

```bash
cd /Users/juhalaitinen/Koodaukset/AI-projects/football-coach && npm run build
```

Expected: build succeeds (or only errors in files that reference old types — fix those too).

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/store/useSettingsStore.ts
git commit -m "feat: add GroupSet type, startTime/groupSets to TrainingSession, theme to AppSettings"
```

---

## Task 2: `generateNGroups` Utility

**Files:**
- Modify: `src/utils/teamGenerator.ts`

- [ ] **Step 1: Add `generateNGroups` to `src/utils/teamGenerator.ts`**

Add after the existing `generateBalancedTeams` function:

```typescript
export function generateNGroups(
  players: Player[],
  n: number,
  matchCounts: Record<string, number>
): string[][] {
  const sorted = [...players].sort((a, b) => {
    const skillDiff = b.skillLevel - a.skillLevel;
    if (skillDiff !== 0) return skillDiff;
    return (matchCounts[a.id] || 0) - (matchCounts[b.id] || 0);
  });

  const groups: string[][] = Array.from({ length: n }, () => []);
  sorted.forEach((player, i) => {
    groups[i % n].push(player.id);
  });
  return groups;
}
```

Also add `import type { Player } from '../types';` at the top if not already present (it currently imports from `'../types'` — check and add `Player` to the existing import).

The current import is:
```typescript
import type { Player, TeamFormat, GeneratedTeam } from '../types';
```
That already includes `Player`, so no change needed to the import line.

- [ ] **Step 2: Verify compilation**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/utils/teamGenerator.ts
git commit -m "feat: add generateNGroups for N-group balanced splitting"
```

---

## Task 3: Tailwind Dark Mode + Theme Infrastructure

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/App.tsx`
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: Enable `darkMode: 'class'` in `tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Add theme sync to `src/App.tsx`**

Add `useSettingsStore` import and theme sync effect inside `App()`:

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { useSettingsStore } from './store/useSettingsStore';

import { Dashboard } from './pages/Dashboard';
import { Players } from './pages/Players';
import { Matches } from './pages/Matches';
import { MatchPlanning } from './pages/MatchPlanning';
import { Statistics } from './pages/Statistics';
import { Training } from './pages/Training';
import { Communication } from './pages/Communication';
import { Reminders } from './pages/Reminders';
import { Settings } from './pages/Settings';
import { usePlayerStore } from './store/usePlayerStore';
import { useMatchStore } from './store/useMatchStore';
import { SEED_PLAYERS, SEED_MATCHES } from './utils/seedData';

function SeedLoader() {
  useEffect(() => {
    const { players, addPlayer } = usePlayerStore.getState();
    if (players.length === 0) SEED_PLAYERS.forEach(addPlayer);

    const { matches, addMatch } = useMatchStore.getState();
    if (matches.length === 0) SEED_MATCHES.forEach(addMatch);
  }, []);

  return null;
}

function ThemeSync() {
  const theme = useSettingsStore((s) => s.settings.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <SeedLoader />
      <ThemeSync />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="players" element={<Players />} />
          <Route path="matches" element={<Matches />} />
          <Route path="planning" element={<MatchPlanning />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="training" element={<Training />} />
          <Route path="communication" element={<Communication />} />
          <Route path="reminders" element={<Reminders />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

Note: `TeamGenerator` import and route are removed here.

- [ ] **Step 3: Add theme toggle to `src/pages/Settings.tsx`**

In the "Pelaajan tietojen näkyvyys" card section, add a new card above it for theme:

```tsx
{/* Teema */}
<Card>
  <h2 className="font-semibold text-gray-900 dark:text-slate-100 mb-1">Teema</h2>
  <Toggle
    label="Tumma teema"
    description="Vaihda sovelluksen värimaailma tummaksi"
    checked={settings.theme === 'dark'}
    onChange={(v) => updateSettings({ theme: v ? 'dark' : 'light' })}
  />
</Card>
```

The `Toggle` component is already defined at the top of `Settings.tsx` — no changes needed to it for this step.

- [ ] **Step 4: Verify compilation and test in browser**

```bash
npm run build && npm run dev
```

Open http://localhost:5173, go to Asetukset, toggle "Tumma teema" on. The page background should turn dark. Toggle off and it returns to light. (Most elements won't have dark variants yet — that comes in later tasks. This just verifies the toggle mechanism works.)

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.js src/App.tsx src/pages/Settings.tsx
git commit -m "feat: add dark mode infrastructure — tailwind class mode, theme toggle in settings"
```

---

## Task 4: Dark Mode — UI Components and Layout

**Files:**
- Modify: `src/components/ui/Card.tsx`
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/components/ui/Badge.tsx`
- Modify: `src/components/ui/Modal.tsx`
- Modify: `src/components/ui/Input.tsx`
- Modify: `src/components/layout/Layout.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Update `src/components/ui/Card.tsx`**

```tsx
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  sub?: string;
}

export function StatCard({ label, value, icon, color = 'bg-brand-500', sub }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className={`${color} text-white rounded-lg p-2.5`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-slate-500">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Update `src/components/ui/Button.tsx`**

```tsx
import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-brand-600 hover:bg-brand-700 text-white border-transparent',
  secondary: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 dark:border-slate-600',
  danger: 'bg-red-500 hover:bg-red-600 text-white border-transparent',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-600 border-transparent dark:hover:bg-slate-700 dark:text-slate-300',
};

const sizeClasses: Record<Size, string> = {
  sm: 'text-xs px-2.5 py-1.5 gap-1',
  md: 'text-sm px-4 py-2 gap-1.5',
  lg: 'text-base px-5 py-2.5 gap-2',
};

export function Button({ variant = 'primary', size = 'md', icon, children, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
```

- [ ] **Step 3: Update `src/components/ui/Badge.tsx`**

```tsx
interface BadgeProps {
  label: string;
  color?: 'green' | 'blue' | 'yellow' | 'red' | 'gray' | 'purple';
}

const colors = {
  green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  gray: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
};

export function Badge({ label, color = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${colors[color]}`}>
      {label}
    </span>
  );
}
```

- [ ] **Step 4: Update `src/components/ui/Modal.tsx`** (also adds `extraWide` prop needed for `SessionBuilder`)

```tsx
import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  extraWide?: boolean;
}

export function Modal({ title, onClose, children, wide = false, extraWide = false }: ModalProps) {
  const widthClass = extraWide ? 'max-w-5xl' : wide ? 'max-w-2xl' : 'max-w-lg';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full ${widthClass} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update `src/components/ui/Input.tsx`**

```tsx
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: React.ReactNode;
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const baseInput = 'w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-slate-500';

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700 dark:text-slate-300">{label}</label>}
      <input className={`${baseInput} ${error ? 'border-red-400' : ''} ${className}`} {...props} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function Select({ label, error, children, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700 dark:text-slate-300">{label}</label>}
      <select className={`${baseInput} ${error ? 'border-red-400' : ''} ${className}`} {...props}>
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700 dark:text-slate-300">{label}</label>}
      <textarea className={`${baseInput} resize-none ${error ? 'border-red-400' : ''} ${className}`} rows={3} {...props} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 6: Update `src/components/layout/Layout.tsx`**

Remove `/team-generator` from PAGE_TITLES and add dark variants:

```tsx
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Etusivu',
  '/players': 'Pelaajahallinta',
  '/matches': 'Otteluhallinta',
  '/planning': 'Ottelusuunnittelu',
  '/statistics': 'Tilastot',
  '/training': 'Harjoitussuunnitelma',
  '/communication': 'Viestintä',
  '/reminders': 'Muistutukset',
};

export function Layout() {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] ?? 'Jalkapallovalmennin';

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
            <span>🟢</span>
            <span>Kausi 2026</span>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Update `src/components/layout/Sidebar.tsx`** — remove Joukkuegeneraattori

```tsx
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, BarChart2,
  MessageSquare, ClipboardList, Dumbbell, Bell, Settings as SettingsIcon,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Etusivu' },
  { to: '/players', icon: Users, label: 'Pelaajat' },
  { to: '/matches', icon: Calendar, label: 'Ottelut' },
  { to: '/planning', icon: ClipboardList, label: 'Ottelusuunnittelu' },
  { to: '/statistics', icon: BarChart2, label: 'Tilastot' },
  { to: '/training', icon: Dumbbell, label: 'Harjoitukset' },
  { to: '/communication', icon: MessageSquare, label: 'Viestintä' },
  { to: '/reminders', icon: Bell, label: 'Muistutukset' },
  { to: '/settings', icon: SettingsIcon, label: 'Asetukset' },
];

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-gray-900 dark:bg-slate-950 min-h-screen flex flex-col">
      <div className="px-4 py-5 border-b border-gray-700 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Jalkapallovalmennin</p>
            <p className="text-gray-400 text-xs">Joukkueen hallinta</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 py-3 px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-colors ${
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-gray-700 dark:border-slate-800">
        <p className="text-gray-500 text-xs">v1.0.0</p>
      </div>
    </aside>
  );
}
```

- [ ] **Step 8: Verify compilation**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/components/ui/Card.tsx src/components/ui/Button.tsx src/components/ui/Badge.tsx src/components/ui/Modal.tsx src/components/ui/Input.tsx src/components/layout/Layout.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: dark mode for UI components and layout"
```

---

## Task 5: Dark Mode — Dashboard, Matches, MatchPlanning, PlayerCard, Settings

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/Matches.tsx`
- Modify: `src/pages/MatchPlanning.tsx`
- Modify: `src/components/matchplanning/PlayerCard.tsx`
- Modify: `src/pages/Settings.tsx`

Apply the dark mode class reference table from the top of this plan to each file. For each file:

1. Read the file
2. For every Tailwind class that appears in the reference table, add its corresponding `dark:` variant
3. Pay special attention to:
   - Inline `className` strings with conditional logic (e.g. `isActive ? 'bg-gray-800' : 'bg-white'`) — add dark variants to both branches
   - Hard-coded `bg-gray-*` on elements that serve as card backgrounds
   - `text-gray-*` on all text elements
   - `border-gray-*` on all dividers and borders
   - `hover:bg-gray-*` on interactive elements

**Dashboard.tsx specific changes:**
- Stats row: `StatCard` already handled by Task 4
- Upcoming matches list: each match row uses `bg-gray-50 hover:bg-gray-100` → add `dark:bg-slate-800 dark:hover:bg-slate-700`
- Section headings: `text-gray-900` → add `dark:text-slate-100`
- Reminder buttons: yellow/blue backgrounds stay, but add `dark:bg-yellow-900/30 dark:text-yellow-300` and `dark:bg-blue-900/30 dark:text-blue-300`
- "Kaikki kunnossa" card: `text-gray-400` → add `dark:text-slate-500`

**Matches.tsx specific changes:**
- Match rows: `bg-gray-50 hover:bg-gray-100` → add dark variants
- Expanded detail: `bg-gray-50 border-gray-100` → add dark variants
- Yellow no-lineup banner: `bg-yellow-50 border-yellow-200 text-yellow-800` → add `dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300`
- Modal form inputs are already handled by Task 4's `Input` component

**MatchPlanning.tsx specific changes:**
- Pool area: `bg-white border-gray-200` → add dark variants
- Lineup drop zone: `bg-gray-100` → add `dark:bg-slate-800`; drag-over: `ring-brand-300` stays
- Section labels: add dark text variants

**PlayerCard.tsx specific changes:**
- Card background: `bg-white border-gray-200` → add `dark:bg-slate-800 dark:border-slate-700`
- Unavailable state: `opacity-40` stays as-is
- Position badge text: `text-gray-500` → add `dark:text-slate-400`
- Availability dot colors stay the same (they use green/red which are fine in both themes)

**Settings.tsx specific changes:**
- All `Card` components already gain dark bg from Task 4
- `Toggle` component inner elements: label `text-gray-800` → add `dark:text-slate-200`; description `text-gray-400` → add `dark:text-slate-500`; border `border-gray-100` → add `dark:border-slate-700`
- The raw `<input type="number">` for minLineupSize: add `dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100`
- Data section: `bg-gray-50 rounded-lg` → add `dark:bg-slate-900`; `bg-red-50 border-red-100` → add `dark:bg-red-900/20 dark:border-red-800`
- Text colors throughout: apply reference table

- [ ] **Step 1: Apply dark mode to Dashboard.tsx** (read file first, then apply changes per the reference table above)

- [ ] **Step 2: Apply dark mode to Matches.tsx** (read file first, then apply changes)

- [ ] **Step 3: Apply dark mode to MatchPlanning.tsx** (read file first, then apply changes)

- [ ] **Step 4: Apply dark mode to PlayerCard.tsx** (read file first, then apply changes)

- [ ] **Step 5: Apply dark mode to Settings.tsx** (read file first, then apply changes; also fix the `Toggle` component's inner classes)

The `Toggle` component in Settings.tsx should be updated to:
```tsx
function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-slate-700 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{label}</p>
        {description && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${
          checked ? 'bg-brand-600' : 'bg-gray-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
```

The section headings in Settings.tsx use `font-semibold text-gray-900` — add `dark:text-slate-100` to each.

- [ ] **Step 6: Verify compilation**

```bash
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/Dashboard.tsx src/pages/Matches.tsx src/pages/MatchPlanning.tsx src/components/matchplanning/PlayerCard.tsx src/pages/Settings.tsx
git commit -m "feat: dark mode for Dashboard, Matches, MatchPlanning, PlayerCard, Settings"
```

---

## Task 6: Dark Mode — Players, Statistics, Communication, Reminders, Training

**Files:**
- Modify: `src/pages/Players.tsx`
- Modify: `src/pages/Statistics.tsx`
- Modify: `src/pages/Communication.tsx`
- Modify: `src/pages/Reminders.tsx`
- Modify: `src/pages/Training.tsx` (dark variants only — the builder will be replaced in Task 8)

For each file, read it first, then apply the dark mode class reference table systematically:

- Every `bg-white` → add `dark:bg-slate-800`
- Every `bg-gray-50` → add `dark:bg-slate-900`
- Every `bg-gray-100` → add `dark:bg-slate-800`
- Every `border-gray-*` → add corresponding `dark:border-slate-*`
- Every `text-gray-*` → add corresponding `dark:text-slate-*`
- Every `hover:bg-gray-*` → add corresponding `dark:hover:bg-slate-*`

**Training.tsx specific (dark variants only for now — builder changes in Task 8):**
- Tab bar: active tab `bg-gray-800 text-white` stays; inactive `bg-white text-gray-600` → add `dark:bg-slate-800 dark:text-slate-300`
- Exercise cards in library: `bg-white rounded-xl border border-gray-200` → add `dark:bg-slate-800 dark:border-slate-700`
- Tag pills: `bg-gray-100 text-gray-500` → add `dark:bg-slate-700 dark:text-slate-300`
- Session rows: `border-gray-100 bg-white` → add dark variants
- Expanded session detail: `bg-gray-50` → add `dark:bg-slate-900`
- Exercise rows inside session: `bg-white border-gray-100` → add dark variants

- [ ] **Step 1: Apply dark mode to Players.tsx** (read file first)

- [ ] **Step 2: Apply dark mode to Statistics.tsx** (read file first)

- [ ] **Step 3: Apply dark mode to Communication.tsx** (read file first)

- [ ] **Step 4: Apply dark mode to Reminders.tsx** (read file first)

- [ ] **Step 5: Apply dark mode to Training.tsx** (read file first, apply dark variants only, do NOT modify the session builder logic — that is Task 8)

- [ ] **Step 6: Verify compilation**

```bash
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/Players.tsx src/pages/Statistics.tsx src/pages/Communication.tsx src/pages/Reminders.tsx src/pages/Training.tsx
git commit -m "feat: dark mode for Players, Statistics, Communication, Reminders, Training"
```

---

## Task 7: Delete TeamGenerator

**Files:**
- Delete: `src/pages/TeamGenerator.tsx`

- [ ] **Step 1: Delete the file**

```bash
rm src/pages/TeamGenerator.tsx
```

- [ ] **Step 2: Verify build (App.tsx and Sidebar.tsx were already updated in Tasks 3 and 4 to remove all references)**

```bash
npm run build
```

Expected: build succeeds with no reference to TeamGenerator.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove TeamGenerator page (functionality moved to session builder)"
```

---

## Task 8: SessionBuilder Component

**Files:**
- Create: `src/components/training/SessionBuilder.tsx`

This component renders as a full-screen overlay (not inside `Modal`). It receives `allExercises` (the combined library), and `onSave`/`onCancel` callbacks. It manages all its own state.

- [ ] **Step 1: Create `src/components/training/SessionBuilder.tsx`**

```tsx
import { useState, useMemo } from 'react';
import { Plus, X, RefreshCw, Trash2, BookOpen } from 'lucide-react';
import type { Exercise, ExerciseCategory, TrainingSession, GroupSet } from '../../types';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useMatchStore } from '../../store/useMatchStore';
import { generateNGroups, getMatchCountsForPlayers } from '../../utils/teamGenerator';
import { Badge } from '../ui/Badge';

const CAT_LABELS: Record<ExerciseCategory, string> = {
  warmup: 'Lämmittely', technical: 'Tekninen', tactical: 'Taktinen', physical: 'Fyysinen', game: 'Peli',
};
const CAT_COLORS: Record<ExerciseCategory, 'yellow' | 'blue' | 'purple' | 'red' | 'green'> = {
  warmup: 'yellow', technical: 'blue', tactical: 'purple', physical: 'red', game: 'green',
};
const CATEGORIES: Array<{ value: ExerciseCategory | 'all'; label: string }> = [
  { value: 'all', label: 'Kaikki' },
  { value: 'warmup', label: 'Lämmittely' },
  { value: 'technical', label: 'Tekninen' },
  { value: 'tactical', label: 'Taktinen' },
  { value: 'physical', label: 'Fyysinen' },
  { value: 'game', label: 'Peli' },
];
const GROUP_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#06b6d4', '#8b5cf6'];

interface GroupSetDraft {
  id: string;
  label: string;
  groupCount: number;
  excludedPlayerIds: Set<string>;
  playerIds: string[][];
  groupNames: string[];
}

interface Props {
  allExercises: Exercise[];
  onSave: (data: Omit<TrainingSession, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

export function SessionBuilder({ allExercises, onSave, onCancel }: Props) {
  const players = usePlayerStore((s) => s.players.filter((p) => p.active));
  const matches = useMatchStore((s) => s.matches);

  const matchCounts = useMemo(
    () => getMatchCountsForPlayers(players.map((p) => p.id), matches.map((m) => m.lineup)),
    [players, matches]
  );

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [groupSets, setGroupSets] = useState<GroupSetDraft[]>([]);
  const [builderCat, setBuilderCat] = useState<ExerciseCategory | 'all'>('all');

  const duration = useMemo(() => exercises.reduce((s, e) => s + e.duration, 0), [exercises]);

  const builderPool = useMemo(
    () => allExercises.filter((e) => builderCat === 'all' || e.category === builderCat),
    [allExercises, builderCat]
  );

  function addExercise(e: Exercise) {
    setExercises((prev) => [...prev, { ...e, id: crypto.randomUUID() }]);
  }

  function removeExercise(id: string) {
    setExercises((prev) => prev.filter((e) => e.id !== id));
  }

  function doGenerate(draft: GroupSetDraft): string[][] {
    const eligible = players.filter((p) => !draft.excludedPlayerIds.has(p.id));
    return generateNGroups(eligible, draft.groupCount, matchCounts);
  }

  function makeDefaultGroupNames(n: number): string[] {
    return Array.from({ length: n }, (_, i) => `Ryhmä ${i + 1}`);
  }

  function addGroupSet() {
    const n = groupSets.length + 1;
    const draft: GroupSetDraft = {
      id: crypto.randomUUID(),
      label: `Ryhmäjako ${n}`,
      groupCount: 2,
      excludedPlayerIds: new Set(),
      playerIds: [],
      groupNames: makeDefaultGroupNames(2),
    };
    draft.playerIds = doGenerate(draft);
    setGroupSets((prev) => [...prev, draft]);
  }

  function reshuffleSet(id: string) {
    setGroupSets((prev) =>
      prev.map((s) => (s.id === id ? { ...s, playerIds: doGenerate(s) } : s))
    );
  }

  function removeGroupSet(id: string) {
    setGroupSets((prev) => prev.filter((s) => s.id !== id));
  }

  function togglePlayerInSet(setId: string, playerId: string) {
    setGroupSets((prev) =>
      prev.map((s) => {
        if (s.id !== setId) return s;
        const excluded = new Set(s.excludedPlayerIds);
        if (excluded.has(playerId)) excluded.delete(playerId);
        else excluded.add(playerId);
        const updated = { ...s, excludedPlayerIds: excluded };
        updated.playerIds = doGenerate(updated);
        return updated;
      })
    );
  }

  function changeGroupCount(setId: string, delta: number) {
    setGroupSets((prev) =>
      prev.map((s) => {
        if (s.id !== setId) return s;
        const newCount = Math.max(2, s.groupCount + delta);
        const updated = { ...s, groupCount: newCount };
        updated.playerIds = doGenerate(updated);
        const newNames = [...s.groupNames];
        while (newNames.length < newCount) newNames.push(`Ryhmä ${newNames.length + 1}`);
        updated.groupNames = newNames.slice(0, newCount);
        return updated;
      })
    );
  }

  function updateSetLabel(setId: string, label: string) {
    setGroupSets((prev) => prev.map((s) => (s.id === setId ? { ...s, label } : s)));
  }

  function updateGroupName(setId: string, groupIdx: number, name: string) {
    setGroupSets((prev) =>
      prev.map((s) => {
        if (s.id !== setId) return s;
        const groupNames = [...s.groupNames];
        groupNames[groupIdx] = name;
        return { ...s, groupNames };
      })
    );
  }

  function handleSave() {
    if (!title.trim() || !date) return;
    const savedGroupSets: GroupSet[] = groupSets.map(({ id, label, playerIds, groupNames }) => ({
      id,
      label,
      playerIds,
      groupNames,
    }));
    onSave({
      title: title.trim(),
      date,
      startTime: startTime || undefined,
      notes,
      exercises,
      duration,
      groupSets: savedGroupSets,
    });
  }

  const canSave = title.trim().length > 0 && date.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-slate-900 overflow-y-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Uusi harjoitussuunnitelma</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Peruuta
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-1.5 text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Tallenna
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        <div className="flex gap-6 items-start">

          {/* LEFT: Info + Exercises */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Compact info row */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Otsikko</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="esim. Tiistain harjoitus"
                  className="border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Päivämäärä</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Alkaa</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-24"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Muistiinpanot</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Lyhyt muistio..."
                  className="border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Exercise picker + selected */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <BookOpen size={13} /> Harjoitteet
              </p>
              {/* Category filter */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setBuilderCat(c.value)}
                    className={`px-2.5 py-0.5 rounded-full text-xs border transition-colors ${
                      builderCat === c.value
                        ? 'bg-gray-800 dark:bg-slate-600 text-white border-gray-800 dark:border-slate-600'
                        : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              {/* Exercise pool */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 mb-4">
                {builderPool.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => addExercise(e)}
                    className="flex items-start gap-2 p-2.5 text-left border border-gray-200 dark:border-slate-600 rounded-lg hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-sm text-gray-900 dark:text-slate-100">{e.name}</span>
                        <Badge label={CAT_LABELS[e.category]} color={CAT_COLORS[e.category]} />
                      </div>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                        {e.duration} min{(e.tags ?? []).length > 0 ? ` · ${(e.tags ?? []).slice(0, 2).join(', ')}` : ''}
                      </p>
                    </div>
                    <Plus size={14} className="text-brand-500 mt-0.5 shrink-0" />
                  </button>
                ))}
              </div>
              {/* Selected exercises */}
              {exercises.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Suunnitelma</p>
                    <span className="text-xs text-brand-600 font-medium">{duration} min yhteensä</span>
                  </div>
                  <div className="space-y-1.5">
                    {exercises.map((e, i) => (
                      <div key={e.id} className="flex items-center gap-2 bg-gray-50 dark:bg-slate-900 rounded-lg px-3 py-2">
                        <span className="text-gray-300 dark:text-slate-600 font-bold text-xs w-4 shrink-0">{i + 1}.</span>
                        <span className="flex-1 text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{e.name}</span>
                        <Badge label={`${e.duration}m`} color="gray" />
                        <button onClick={() => removeExercise(e.id)} className="text-gray-400 hover:text-red-500 shrink-0">
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Groups panel */}
          <div className="w-96 shrink-0">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Ryhmät &amp; Joukkueet</p>
                <button
                  onClick={addGroupSet}
                  className="flex items-center gap-1.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 rounded-lg px-2.5 py-1 text-xs font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors"
                >
                  <Plus size={12} /> Uusi jako
                </button>
              </div>

              {groupSets.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-6">
                  Lisää ryhmäjako esim. harjoitusryhmiä tai loppupelin joukkueita varten.
                </p>
              )}

              <div className="space-y-4">
                {groupSets.map((gs) => (
                  <div key={gs.id} className="bg-gray-50 dark:bg-slate-900 rounded-lg p-3 border border-gray-100 dark:border-slate-700">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        value={gs.label}
                        onChange={(e) => updateSetLabel(gs.id, e.target.value)}
                        className="flex-1 bg-transparent border-b border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 font-semibold text-sm focus:outline-none focus:border-brand-500 pb-0.5"
                      />
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md px-2 py-0.5">
                        <button
                          onClick={() => changeGroupCount(gs.id, -1)}
                          className="text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 text-base leading-none"
                        >−</button>
                        <span className="text-xs font-semibold text-gray-800 dark:text-slate-200 w-4 text-center">{gs.groupCount}</span>
                        <button
                          onClick={() => changeGroupCount(gs.id, 1)}
                          className="text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 text-base leading-none"
                        >＋</button>
                      </div>
                      <button
                        onClick={() => reshuffleSet(gs.id)}
                        className="text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        title="Arvo uudelleen"
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button
                        onClick={() => removeGroupSet(gs.id)}
                        className="text-gray-300 dark:text-slate-600 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Player toggles */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {players.map((p) => {
                        const excluded = gs.excludedPlayerIds.has(p.id);
                        return (
                          <button
                            key={p.id}
                            onClick={() => togglePlayerInSet(gs.id, p.id)}
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                              excluded
                                ? 'border-gray-200 dark:border-slate-700 text-gray-300 dark:text-slate-600 line-through bg-transparent'
                                : 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                            }`}
                          >
                            {p.name.split(' ')[0]} {p.name.split(' ').slice(-1)[0]?.charAt(0)}.
                          </button>
                        );
                      })}
                    </div>

                    {/* Group cards */}
                    <div className={`grid gap-2 ${gs.groupCount <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      {gs.playerIds.map((groupPlayerIds, gi) => {
                        const color = GROUP_COLORS[gi % GROUP_COLORS.length];
                        const name = gs.groupNames[gi] ?? `Ryhmä ${gi + 1}`;
                        return (
                          <div
                            key={gi}
                            className="bg-white dark:bg-slate-800 rounded-lg p-2 border-t-2"
                            style={{ borderTopColor: color }}
                          >
                            <input
                              value={name}
                              onChange={(e) => updateGroupName(gs.id, gi, e.target.value)}
                              className="bg-transparent border-none text-xs font-semibold w-full focus:outline-none mb-1.5"
                              style={{ color }}
                            />
                            <div className="space-y-0.5">
                              {groupPlayerIds.map((pid) => {
                                const player = players.find((p) => p.id === pid);
                                return player ? (
                                  <p key={pid} className="text-xs text-gray-600 dark:text-slate-400">
                                    {player.name}
                                  </p>
                                ) : null;
                              })}
                              {groupPlayerIds.length === 0 && (
                                <p className="text-xs text-gray-300 dark:text-slate-600 italic">Tyhjä</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
npm run build
```

Expected: build succeeds. Fix any TypeScript errors (usually import paths or missing type annotations).

- [ ] **Step 3: Commit**

```bash
git add src/components/training/SessionBuilder.tsx
git commit -m "feat: add SessionBuilder component with two-column layout and group generator"
```

---

## Task 9: Wire SessionBuilder into Training.tsx + Update PDF

**Files:**
- Modify: `src/pages/Training.tsx`

- [ ] **Step 1: Read `src/pages/Training.tsx`** to confirm current state before editing.

- [ ] **Step 2: Replace session builder modal with `SessionBuilder` in `Training.tsx`**

Key changes to `Training.tsx`:

**a) Add import:**
```tsx
import { SessionBuilder } from '../components/training/SessionBuilder';
import { useSettingsStore } from '../store/useSettingsStore';
```

**b) Remove `emptySessionForm`, `sessionForm`, `setSessionForm`, `builderCat`, `setBuilderCat`, and all related state.** The `SessionBuilder` manages its own state.

**c) Replace the `handleSaveSession` function with a callback:**
```tsx
function handleSaveSession(data: Omit<TrainingSession, 'id' | 'createdAt'>) {
  addSession({
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
  setShowBuilder(false);
}
```

**d) Replace the entire `{showBuilder && <Modal ...>}` block** at the bottom of the JSX with:
```tsx
{showBuilder && (
  <SessionBuilder
    allExercises={allExercises}
    onSave={handleSaveSession}
    onCancel={() => setShowBuilder(false)}
  />
)}
```

**e) Update the session list to show saved groups.** In the expanded session detail (inside `{expanded === s.id && ...}`), add after the exercises list and before the notes:

```tsx
{(s.groupSets ?? []).length > 0 && (
  <div className="mt-3">
    <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Ryhmät</p>
    {(s.groupSets ?? []).map((gs) => (
      <div key={gs.id} className="mb-3">
        <p className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-1.5">{gs.label}</p>
        <div className={`grid gap-2 ${gs.playerIds.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {gs.playerIds.map((groupPlayerIds, gi) => (
            <div key={gi} className="bg-white dark:bg-slate-800 rounded-lg p-2 border border-gray-100 dark:border-slate-700">
              <p className="text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">{gs.groupNames?.[gi] ?? `Ryhmä ${gi + 1}`}</p>
              {groupPlayerIds.map((pid) => {
                const player = players.find((p) => p.id === pid);
                return player ? (
                  <p key={pid} className="text-xs text-gray-500 dark:text-slate-400">{player.name}</p>
                ) : null;
              })}
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
)}
```

You'll need to import `usePlayerStore` at the top of Training.tsx:
```tsx
import { usePlayerStore } from '../store/usePlayerStore';
```
And in the component body:
```tsx
const players = usePlayerStore((s) => s.players);
```

- [ ] **Step 3: Update `printSession` in `Training.tsx` to include groups and image placeholder**

Replace the entire `printSession` function:

```tsx
function printSession(s: TrainingSession) {
  const { settings } = useSettingsStore.getState();
  const win = window.open('', '_blank');
  if (!win) return;

  const groupSetsHtml = (s.groupSets ?? []).map((gs) => `
    <div class="group-set">
      <h3>${gs.label}</h3>
      <div class="groups-row">
        ${gs.playerIds.map((groupPlayerIds, gi) => `
          <div class="group-card">
            <div class="group-heading">${gs.groupNames?.[gi] ?? `Ryhmä ${gi + 1}`}</div>
            ${groupPlayerIds.map((pid) => {
              const player = usePlayerStore.getState().players.find((p) => p.id === pid);
              return player ? `<div class="group-player">${player.name}</div>` : '';
            }).join('')}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  const html = `<!DOCTYPE html><html><head><title>${s.title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 750px; margin: 40px auto; color: #111; }
    h1 { font-size: 22px; border-bottom: 2px solid #16a34a; padding-bottom: 8px; margin-bottom: 4px; }
    .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
    .exercise { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin-bottom: 12px; display: flex; gap: 16px; }
    .ex-content { flex: 1; }
    .ex-image-placeholder { width: 120px; min-width: 120px; height: 90px; border: 2px dashed #d1d5db; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 11px; text-align: center; flex-shrink: 0; }
    .ex-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .ex-name { font-weight: bold; font-size: 15px; }
    .ex-cat { background: #f3f4f6; padding: 2px 8px; border-radius: 20px; font-size: 11px; text-transform: uppercase; }
    .ex-desc { color: #444; font-size: 13px; margin-top: 4px; }
    .ex-goals { color: #16a34a; font-size: 12px; margin-top: 4px; font-style: italic; }
    .ex-dur { color: #16a34a; font-weight: bold; margin-top: 6px; font-size: 12px; }
    .section-title { font-size: 15px; font-weight: bold; margin: 24px 0 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
    .group-set { margin-bottom: 20px; }
    .group-set h3 { font-size: 14px; font-weight: bold; color: #374151; margin-bottom: 8px; }
    .groups-row { display: flex; gap: 12px; flex-wrap: wrap; }
    .group-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; min-width: 120px; }
    .group-heading { font-weight: bold; font-size: 13px; margin-bottom: 6px; color: #6366f1; }
    .group-player { font-size: 12px; color: #374151; padding: 2px 0; }
    .notes { background: #f9fafb; padding: 12px; border-radius: 8px; margin-top: 20px; font-style: italic; color: #555; font-size: 13px; }
    @media print { button { display: none; } body { margin: 20px; } }
  </style></head><body>
  <h1>⚽ ${s.title}</h1>
  <div class="meta">
    📅 ${format(new Date(s.date), 'dd.MM.yyyy')}${s.startTime ? ` klo ${s.startTime}` : ''} &nbsp;·&nbsp;
    ⏱ ${s.duration} min
    ${settings.coachName ? `&nbsp;·&nbsp; 👤 ${settings.coachName}` : ''}
    ${settings.teamName ? `&nbsp;·&nbsp; ${settings.teamName}` : ''}
  </div>

  ${s.exercises.length > 0 ? `<div class="section-title">Harjoitteet</div>` : ''}
  ${s.exercises.map((e, i) => `
    <div class="exercise">
      <div class="ex-content">
        <div class="ex-header">
          <span class="ex-name">${i + 1}. ${e.name}</span>
          <span class="ex-cat">${CAT_LABELS[e.category]}</span>
        </div>
        <div class="ex-desc">${e.description}</div>
        ${e.goals ? `<div class="ex-goals">🎯 ${e.goals}</div>` : ''}
        <div class="ex-dur">⏱ ${e.duration} min${e.playerCount ? ` · 👥 ${e.playerCount} pelaajaa` : ''}</div>
      </div>
      <div class="ex-image-placeholder">Kuva<br>tulossa</div>
    </div>`).join('')}

  ${(s.groupSets ?? []).length > 0 ? `<div class="section-title">Ryhmät &amp; Joukkueet</div>${groupSetsHtml}` : ''}

  ${s.notes ? `<div class="notes">📝 ${s.notes}</div>` : ''}
  <script>window.print();<\/script>
  </body></html>`;

  win.document.write(html);
  win.document.close();
}
```

Note: `printSession` is a regular function, not a hook — calling `useSettingsStore.getState()` and `usePlayerStore.getState()` directly (not as hooks) is fine here since it's called in an event handler.

- [ ] **Step 4: Verify compilation**

```bash
npm run build
```

Fix any TypeScript errors. Common ones:
- `TrainingSession` now has `startTime?` — this is optional so existing code that doesn't set it is fine
- `groupSets?` — also optional, existing sessions without it work fine
- The `printSession` function references `CAT_LABELS` — make sure it's still in scope (it is, defined at top of Training.tsx)

- [ ] **Step 5: Test in browser**

```bash
npm run dev
```

- Navigate to Harjoitukset
- Click "Uusi suunnitelma" — the full-screen `SessionBuilder` should appear
- Fill in title, date, add exercises from the pool
- Add a group set with "＋ Uusi jako" — players appear as toggle chips, groups are generated
- Toggle a player off — groups regenerate excluding them
- Click "↻" — groups reshuffle
- Click "＋" on the group counter — a third group appears
- Click "Tallenna" — builder closes, session appears in the list
- Expand the session — groups are shown
- Click "Tulosta PDF" — PDF opens in new tab with exercises, group sets, and image placeholders

- [ ] **Step 6: Commit**

```bash
git add src/pages/Training.tsx
git commit -m "feat: wire SessionBuilder into Training, update PDF with groups and image placeholders"
```

---

## Done

After all tasks pass, run a final build check:

```bash
npm run build
```

Then verify in browser with dark mode toggled on and off — all pages should be legible in both themes.
