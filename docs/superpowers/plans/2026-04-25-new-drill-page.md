# Uusi Harjoite — Tactical Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full tactical board drill creator at `/training/new-drill`, reachable from the existing "Uusi harjoite" button in Training.tsx, saving drills (with canvas PNG) to localStorage via a Firebase-ready abstraction.

**Architecture:** Objects-in-state canvas pattern — shapes stored as a plain array in `useTacticalBoard`, redrawn on every change via `useEffect`. A thin `drillStorage.ts` async wrapper sits in front of Zustand so the only Firebase migration touchpoint is that one file. NewDrillPage renders inside the existing Layout unchanged.

**Tech Stack:** React 18 + TypeScript, HTML5 Canvas 2D API, Zustand 5 + persist, React Router v7, Tailwind CSS v3, lucide-react icons.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types/index.ts` | Modify | Add `FieldType`, `Drill` types |
| `src/store/useDrillStore.ts` | Create | Zustand store for drills (localStorage) |
| `src/utils/drillStorage.ts` | Create | Async save/delete abstraction (Firebase migration point) |
| `src/hooks/useTacticalBoard.ts` | Create | All canvas state, drawing, pointer events, undo |
| `src/pages/NewDrillPage.tsx` | Create | Full tactical board UI page |
| `src/pages/Training.tsx` | Modify | Swap button onClick + add drill thumbnail grid |
| `src/components/layout/Layout.tsx` | Modify | Add page title for `/training/new-drill` |
| `src/App.tsx` | Modify | Add route for `/training/new-drill` |

---

## Task 1: Add Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add FieldType and Drill to types/index.ts**

Open `src/types/index.ts` and append these two exports at the end of the file:

```ts
export type FieldType =
  | 'football'
  | 'floorball'
  | 'basketball'
  | 'icehockey'
  | 'half'
  | '5v5'
  | 'penalty';

export interface Drill {
  id: string;
  name: string;
  description: string;
  goals: string;
  duration: number;
  repetitions: number;
  fieldType: FieldType;
  canvasDataUrl: string;
  createdAt: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/juhalaitinen/Koodaukset/AI-projects/football-coach
npm run build 2>&1 | tail -5
```

Expected: `✓ built in` with no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add FieldType and Drill types"
```

---

## Task 2: Zustand Store

**Files:**
- Create: `src/store/useDrillStore.ts`

- [ ] **Step 1: Create the store**

Create `src/store/useDrillStore.ts`:

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Drill } from '../types';

interface DrillStore {
  drills: Drill[];
  addDrill: (drill: Drill) => void;
  deleteDrill: (id: string) => void;
}

export const useDrillStore = create<DrillStore>()(
  persist(
    (set) => ({
      drills: [],
      addDrill: (drill) => set((s) => ({ drills: [...s.drills, drill] })),
      deleteDrill: (id) => set((s) => ({ drills: s.drills.filter((d) => d.id !== id) })),
    }),
    { name: 'drill-store' }
  )
);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/store/useDrillStore.ts
git commit -m "feat: add useDrillStore (Zustand + localStorage)"
```

---

## Task 3: Storage Abstraction

**Files:**
- Create: `src/utils/drillStorage.ts`

- [ ] **Step 1: Create drillStorage.ts**

Create `src/utils/drillStorage.ts`:

```ts
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

export async function deleteDrill(id: string): Promise<void> {
  useDrillStore.getState().deleteDrill(id);
}
```

> **Firebase migration note:** When adding Firebase, replace both function bodies — `saveDrill` uploads canvas blob to Storage + writes metadata to Firestore; `deleteDrill` removes both. No component changes needed.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/drillStorage.ts
git commit -m "feat: add drillStorage async abstraction"
```

---

## Task 4: Canvas Hook — useTacticalBoard

**Files:**
- Create: `src/hooks/useTacticalBoard.ts`

- [ ] **Step 1: Create the hook file**

Create `src/hooks/useTacticalBoard.ts` with the full content below. This is the largest task — read it fully before starting.

```ts
import { useState, useEffect, useCallback, useRef } from 'react';
import type { RefObject } from 'react';
import type { FieldType } from '../types';

export type SizeKey = 'small' | 'normal' | 'large';
export type ToolType =
  | 'select' | 'player' | 'opponent' | 'cone' | 'ball'
  | 'arrow' | 'dashed' | 'curved' | 'zone' | 'text';

export type Shape =
  | { type: 'player';   id: string; x: number; y: number; color: string; size: SizeKey; number: number }
  | { type: 'opponent'; id: string; x: number; y: number; color: string; size: SizeKey }
  | { type: 'cone';     id: string; x: number; y: number; color: string; size: SizeKey }
  | { type: 'ball';     id: string; x: number; y: number; size: SizeKey }
  | { type: 'arrow';    id: string; points: [number, number][]; dashed: boolean; curved: boolean; color: string }
  | { type: 'zone';     id: string; x: number; y: number; w: number; h: number; color: string }
  | { type: 'text';     id: string; x: number; y: number; text: string; color: string; size: SizeKey };

const SIZE_PX: Record<SizeKey, number> = { small: 10, normal: 15, large: 21 };
const MAX_HISTORY = 50;
const HIT_RADIUS = 20;

// ── Field helpers ──────────────────────────────────────────────────────────

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawFootball(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#2d7a3a';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  const pad = 20;
  const fw = w - pad * 2;
  const fh = h - pad * 2;

  ctx.strokeRect(pad, pad, fw, fh);

  // Center line
  ctx.beginPath(); ctx.moveTo(w / 2, pad); ctx.lineTo(w / 2, h - pad); ctx.stroke();
  // Center circle + spot
  ctx.beginPath(); ctx.arc(w / 2, h / 2, fh * 0.15, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(w / 2, h / 2, 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill();

  const paW = fw * 0.16; const paH = fh * 0.45;
  const gaW = fw * 0.065; const gaH = fh * 0.27;
  const goalW = fw * 0.02; const goalH = fh * 0.13;

  // Left: penalty area, goal area, goal, spot
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.strokeRect(pad, pad + (fh - paH) / 2, paW, paH);
  ctx.strokeRect(pad, pad + (fh - gaH) / 2, gaW, gaH);
  ctx.strokeRect(pad - goalW, pad + (fh - goalH) / 2, goalW, goalH);
  ctx.beginPath(); ctx.arc(pad + paW * 0.7, h / 2, 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill();

  // Right: penalty area, goal area, goal, spot
  ctx.strokeRect(w - pad - paW, pad + (fh - paH) / 2, paW, paH);
  ctx.strokeRect(w - pad - gaW, pad + (fh - gaH) / 2, gaW, gaH);
  ctx.strokeRect(w - pad, pad + (fh - goalH) / 2, goalW, goalH);
  ctx.beginPath(); ctx.arc(w - pad - paW * 0.7, h / 2, 3, 0, Math.PI * 2);
  ctx.fill();

  // Corner arcs
  const cr = fh * 0.04;
  ctx.beginPath(); ctx.arc(pad, pad, cr, 0, Math.PI / 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(pad, h - pad, cr, -Math.PI / 2, 0); ctx.stroke();
  ctx.beginPath(); ctx.arc(w - pad, pad, cr, Math.PI / 2, Math.PI); ctx.stroke();
  ctx.beginPath(); ctx.arc(w - pad, h - pad, cr, Math.PI, Math.PI * 1.5); ctx.stroke();
}

function drawHalf(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#2d7a3a';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  const pad = 20;
  const fw = w - pad * 2;
  const fh = h - pad * 2;

  ctx.strokeRect(pad, pad, fw, fh);

  const paW = fw * 0.55; const paH = fh * 0.35;
  const gaW = fw * 0.3;  const gaH = fh * 0.14;
  const goalW = fw * 0.18; const goalH = fh * 0.07;
  const spotY = h - pad - paH * 0.65;

  ctx.strokeRect(pad + (fw - paW) / 2, h - pad - paH, paW, paH);
  ctx.strokeRect(pad + (fw - gaW) / 2, h - pad - gaH, gaW, gaH);
  ctx.strokeRect(pad + (fw - goalW) / 2, h - pad, goalW, goalH);

  ctx.beginPath(); ctx.arc(w / 2, spotY, 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill();

  // D arc (only part outside penalty area)
  ctx.beginPath();
  ctx.arc(w / 2, spotY, fh * 0.15, -Math.PI * 0.75, -Math.PI * 0.25);
  ctx.stroke();
}

function draw5v5(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#2d7a3a';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  const pad = 20;
  const fw = w - pad * 2;
  const fh = h - pad * 2;

  ctx.strokeRect(pad, pad, fw, fh);
  ctx.beginPath(); ctx.moveTo(w / 2, pad); ctx.lineTo(w / 2, h - pad); ctx.stroke();
  ctx.beginPath(); ctx.arc(w / 2, h / 2, fh * 0.12, 0, Math.PI * 2); ctx.stroke();

  const goalH = fh * 0.2; const goalD = fw * 0.025;
  ctx.strokeRect(pad - goalD, h / 2 - goalH / 2, goalD, goalH);
  ctx.strokeRect(w - pad, h / 2 - goalH / 2, goalD, goalH);
}

function drawPenalty(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#2d7a3a';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  const pad = 20;
  const fw = w - pad * 2;
  const fh = h - pad * 2;

  ctx.strokeRect(pad, pad, fw, fh);

  const gaW = fw * 0.45; const gaH = fh * 0.2;
  const goalW = fw * 0.3; const goalH = fh * 0.1;
  const spotY = h - pad - fh * 0.45;

  ctx.strokeRect(pad + (fw - gaW) / 2, h - pad - gaH, gaW, gaH);
  ctx.strokeRect(pad + (fw - goalW) / 2, h - pad, goalW, goalH);

  ctx.beginPath(); ctx.arc(w / 2, spotY, 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill();

  ctx.beginPath();
  ctx.arc(w / 2, spotY, fh * 0.2, -Math.PI * 0.75, -Math.PI * 0.25);
  ctx.stroke();
}

function drawFloorball(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, w, h);
  const pad = 20;
  const fw = w - pad * 2; const fh = h - pad * 2;
  const r = Math.min(fw, fh) * 0.08;

  ctx.strokeStyle = '#444';
  ctx.lineWidth = 2;
  roundedRect(ctx, pad, pad, fw, fh, r);
  ctx.stroke();

  ctx.beginPath(); ctx.moveTo(w / 2, pad); ctx.lineTo(w / 2, h - pad); ctx.stroke();
  ctx.beginPath(); ctx.arc(w / 2, h / 2, fh * 0.12, 0, Math.PI * 2); ctx.stroke();

  const creaseR = fh * 0.15;
  ctx.beginPath(); ctx.arc(pad, h / 2, creaseR, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(w - pad, h / 2, creaseR, Math.PI / 2, -Math.PI / 2); ctx.stroke();

  const goalH = fh * 0.18;
  ctx.strokeStyle = '#c00';
  ctx.strokeRect(pad - 8, h / 2 - goalH / 2, 8, goalH);
  ctx.strokeRect(w - pad, h / 2 - goalH / 2, 8, goalH);
}

function drawBasketball(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#c8874a';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  const pad = 20;
  const fw = w - pad * 2; const fh = h - pad * 2;

  ctx.strokeRect(pad, pad, fw, fh);
  ctx.beginPath(); ctx.moveTo(w / 2, pad); ctx.lineTo(w / 2, h - pad); ctx.stroke();
  ctx.beginPath(); ctx.arc(w / 2, h / 2, fh * 0.12, 0, Math.PI * 2); ctx.stroke();

  const paintW = fw * 0.15; const paintH = fh * 0.47;
  const ftY = fh * 0.24;
  const circleR = fh * 0.12;

  // Left key
  ctx.strokeRect(pad, pad + (fh - paintH) / 2, paintW, paintH);
  ctx.beginPath(); ctx.moveTo(pad, pad + (fh - paintH) / 2 + ftY); ctx.lineTo(pad + paintW, pad + (fh - paintH) / 2 + ftY); ctx.stroke();
  ctx.beginPath(); ctx.arc(pad + paintW, h / 2, circleR, -Math.PI / 2, Math.PI / 2); ctx.stroke();

  // Right key
  ctx.strokeRect(w - pad - paintW, pad + (fh - paintH) / 2, paintW, paintH);
  ctx.beginPath(); ctx.moveTo(w - pad, pad + (fh - paintH) / 2 + ftY); ctx.lineTo(w - pad - paintW, pad + (fh - paintH) / 2 + ftY); ctx.stroke();
  ctx.beginPath(); ctx.arc(w - pad - paintW, h / 2, circleR, Math.PI / 2, -Math.PI / 2); ctx.stroke();

  // 3-point arcs
  const threeR = fh * 0.42;
  ctx.beginPath(); ctx.arc(pad, h / 2, threeR, -Math.PI * 0.4, Math.PI * 0.4); ctx.stroke();
  ctx.beginPath(); ctx.arc(w - pad, h / 2, threeR, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
}

function drawIceHockey(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#e8f4f8';
  ctx.fillRect(0, 0, w, h);
  const pad = 20;
  const fw = w - pad * 2; const fh = h - pad * 2;
  const r = Math.min(fw, fh) * 0.1;

  ctx.strokeStyle = '#cc0000';
  ctx.lineWidth = 3;
  roundedRect(ctx, pad, pad, fw, fh, r);
  ctx.stroke();

  // Center red line
  ctx.beginPath(); ctx.moveTo(w / 2, pad); ctx.lineTo(w / 2, h - pad); ctx.stroke();

  // Blue lines
  ctx.strokeStyle = '#0066cc';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(pad + fw * 0.27, pad); ctx.lineTo(pad + fw * 0.27, h - pad); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pad + fw * 0.73, pad); ctx.lineTo(pad + fw * 0.73, h - pad); ctx.stroke();

  // Goal creases
  ctx.strokeStyle = '#0066cc';
  ctx.lineWidth = 2;
  const creaseW = fw * 0.06; const creaseH = fh * 0.22;
  ctx.strokeRect(pad, h / 2 - creaseH / 2, creaseW, creaseH);
  ctx.strokeRect(w - pad - creaseW, h / 2 - creaseH / 2, creaseW, creaseH);

  // Face-off circles (center + 4 zone)
  ctx.strokeStyle = '#cc0000';
  ctx.lineWidth = 2;
  const circleR = fh * 0.15;
  ctx.beginPath(); ctx.arc(w / 2, h / 2, circleR, 0, Math.PI * 2); ctx.stroke();
  [[pad + fw * 0.2, pad + fh * 0.25], [pad + fw * 0.2, pad + fh * 0.75],
   [pad + fw * 0.8, pad + fh * 0.25], [pad + fw * 0.8, pad + fh * 0.75]]
    .forEach(([cx, cy]) => {
      ctx.beginPath(); ctx.arc(cx, cy, circleR, 0, Math.PI * 2); ctx.stroke();
    });

  // Goals
  const goalH = fh * 0.15; const goalD = fw * 0.015;
  ctx.strokeRect(pad, h / 2 - goalH / 2, goalD, goalH);
  ctx.strokeRect(w - pad - goalD, h / 2 - goalH / 2, goalD, goalH);
}

function drawField(ctx: CanvasRenderingContext2D, w: number, h: number, fieldType: FieldType) {
  ctx.clearRect(0, 0, w, h);
  switch (fieldType) {
    case 'football':   drawFootball(ctx, w, h);   break;
    case 'half':       drawHalf(ctx, w, h);        break;
    case '5v5':        draw5v5(ctx, w, h);         break;
    case 'penalty':    drawPenalty(ctx, w, h);     break;
    case 'floorball':  drawFloorball(ctx, w, h);   break;
    case 'basketball': drawBasketball(ctx, w, h);  break;
    case 'icehockey':  drawIceHockey(ctx, w, h);   break;
  }
}

// ── Shape drawing ──────────────────────────────────────────────────────────

function drawShape(ctx: CanvasRenderingContext2D, shape: Shape, selected: boolean) {
  ctx.save();
  if (selected) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 10; }

  switch (shape.type) {
    case 'player': {
      const r = SIZE_PX[shape.size];
      ctx.beginPath(); ctx.arc(shape.x, shape.y, r, 0, Math.PI * 2);
      ctx.fillStyle = shape.color; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(9, r - 2)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(shape.number), shape.x, shape.y);
      break;
    }
    case 'opponent': {
      const s = SIZE_PX[shape.size];
      ctx.strokeStyle = shape.color; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(shape.x - s, shape.y - s); ctx.lineTo(shape.x + s, shape.y + s);
      ctx.moveTo(shape.x + s, shape.y - s); ctx.lineTo(shape.x - s, shape.y + s);
      ctx.stroke();
      break;
    }
    case 'cone': {
      const s = SIZE_PX[shape.size];
      ctx.beginPath();
      ctx.moveTo(shape.x, shape.y - s);
      ctx.lineTo(shape.x + s * 0.8, shape.y + s * 0.7);
      ctx.lineTo(shape.x - s * 0.8, shape.y + s * 0.7);
      ctx.closePath();
      ctx.fillStyle = shape.color; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.stroke();
      break;
    }
    case 'ball': {
      const r = SIZE_PX[shape.size];
      ctx.beginPath(); ctx.arc(shape.x, shape.y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(shape.x, shape.y, r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = '#222'; ctx.fill();
      break;
    }
    case 'arrow': {
      if (shape.points.length < 2) break;
      ctx.strokeStyle = shape.color; ctx.lineWidth = 2.5;
      ctx.setLineDash(shape.dashed ? [8, 5] : []);
      ctx.beginPath();
      if (shape.curved && shape.points.length >= 3) {
        ctx.moveTo(shape.points[0][0], shape.points[0][1]);
        for (let i = 1; i < shape.points.length - 1; i++) {
          const mx = (shape.points[i][0] + shape.points[i + 1][0]) / 2;
          const my = (shape.points[i][1] + shape.points[i + 1][1]) / 2;
          ctx.quadraticCurveTo(shape.points[i][0], shape.points[i][1], mx, my);
        }
        ctx.lineTo(shape.points[shape.points.length - 1][0], shape.points[shape.points.length - 1][1]);
      } else {
        ctx.moveTo(shape.points[0][0], shape.points[0][1]);
        ctx.lineTo(shape.points[shape.points.length - 1][0], shape.points[shape.points.length - 1][1]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      // Arrowhead
      const last = shape.points[shape.points.length - 1];
      const prev = shape.points.length >= 2 ? shape.points[shape.points.length - 2] : shape.points[0];
      const angle = Math.atan2(last[1] - prev[1], last[0] - prev[0]);
      const hl = 12;
      ctx.beginPath();
      ctx.moveTo(last[0], last[1]);
      ctx.lineTo(last[0] - hl * Math.cos(angle - Math.PI / 6), last[1] - hl * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(last[0], last[1]);
      ctx.lineTo(last[0] - hl * Math.cos(angle + Math.PI / 6), last[1] - hl * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
      break;
    }
    case 'zone': {
      ctx.fillStyle = shape.color + '33';
      ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
      ctx.strokeStyle = shape.color; ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
      ctx.setLineDash([]);
      break;
    }
    case 'text': {
      const fs = shape.size === 'small' ? 13 : shape.size === 'large' ? 20 : 16;
      ctx.font = `bold ${fs}px sans-serif`;
      ctx.fillStyle = shape.color; ctx.textBaseline = 'middle';
      ctx.fillText(shape.text, shape.x, shape.y);
      break;
    }
  }
  ctx.restore();
}

// ── Hit testing ────────────────────────────────────────────────────────────

function hitTest(shape: Shape, x: number, y: number): boolean {
  switch (shape.type) {
    case 'player': case 'opponent': case 'cone': case 'ball': {
      const r = SIZE_PX[(shape as { size: SizeKey }).size] + 6;
      return Math.hypot(x - (shape as { x: number }).x, y - (shape as { y: number }).y) <= r;
    }
    case 'zone': {
      const x1 = Math.min(shape.x, shape.x + shape.w);
      const x2 = Math.max(shape.x, shape.x + shape.w);
      const y1 = Math.min(shape.y, shape.y + shape.h);
      const y2 = Math.max(shape.y, shape.y + shape.h);
      return x >= x1 && x <= x2 && y >= y1 && y <= y2;
    }
    case 'arrow': {
      for (let i = 0; i < shape.points.length - 1; i++) {
        const [ax, ay] = shape.points[i];
        const [bx, by] = shape.points[i + 1];
        const dx = bx - ax, dy = by - ay;
        const len2 = dx * dx + dy * dy;
        if (len2 === 0) continue;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
        if (Math.hypot(ax + t * dx - x, ay + t * dy - y) <= HIT_RADIUS) return true;
      }
      return false;
    }
    case 'text':
      return Math.abs(x - shape.x) < 60 && Math.abs(y - shape.y) < 16;
  }
}

// ── Canvas coordinate helper ───────────────────────────────────────────────

function getCanvasPos(
  canvas: HTMLCanvasElement,
  e: React.PointerEvent<HTMLCanvasElement>
): [number, number] {
  const rect = canvas.getBoundingClientRect();
  return [
    (e.clientX - rect.left) * (canvas.width / rect.width),
    (e.clientY - rect.top) * (canvas.height / rect.height),
  ];
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useTacticalBoard(canvasRef: RefObject<HTMLCanvasElement>) {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [history, setHistory] = useState<Shape[][]>([]);
  const [activeTool, setTool] = useState<ToolType>('player');
  const [activeColor, setColor] = useState('#ef4444');
  const [activeSize, setSize] = useState<SizeKey>('normal');
  const [fieldType, setFieldType] = useState<FieldType>('football');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Stable ref to current state — used inside useCallback to avoid stale closures
  const stateRef = useRef({ shapes, activeTool, activeColor, activeSize, selectedId });
  stateRef.current = { shapes, activeTool, activeColor, activeSize, selectedId };

  const drawing = useRef({
    active: false,
    startX: 0,
    startY: 0,
    tempId: '',
    dragOffX: 0,
    dragOffY: 0,
    curvedPoints: [] as [number, number][],
  });

  const pushHistory = useCallback((s: Shape[]) => {
    setHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), s]);
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setShapes(prev);
      setSelectedId(null);
      return h.slice(0, -1);
    });
  }, []);

  const clearCanvas = useCallback(() => {
    pushHistory(stateRef.current.shapes);
    setShapes([]);
    setSelectedId(null);
  }, [pushHistory]);

  const exportDataUrl = useCallback((): string => {
    return canvasRef.current?.toDataURL('image/png') ?? '';
  }, [canvasRef]);

  // Redraw on state change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawField(ctx, canvas.width, canvas.height, fieldType);
    shapes.forEach((s) => drawShape(ctx, s, s.id === selectedId));
  }, [shapes, fieldType, selectedId, canvasRef]);

  // Keyboard delete for selected shape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      const { selectedId: sid, shapes: ss } = stateRef.current;
      if (!sid) return;
      pushHistory(ss);
      setShapes((prev) => prev.filter((s) => s.id !== sid));
      setSelectedId(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pushHistory]);

  function nextPlayerNumber(ss: Shape[]): number {
    const used = new Set(
      ss.filter((s): s is Extract<Shape, { type: 'player' }> => s.type === 'player').map((s) => s.number)
    );
    let n = 1;
    while (used.has(n)) n++;
    return n;
  }

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    canvasRef.current.setPointerCapture(e.pointerId);
    const [x, y] = getCanvasPos(canvasRef.current, e);
    const { activeTool: tool, activeColor: color, activeSize: size, shapes: ss } = stateRef.current;
    const d = drawing.current;

    if (tool === 'select') {
      const hit = [...ss].reverse().find((s) => hitTest(s, x, y));
      if (hit) {
        setSelectedId(hit.id);
        d.active = true;
        d.tempId = hit.id;
        d.startX = x;
        d.startY = y;
        if ('x' in hit && hit.type !== 'arrow') {
          d.dragOffX = x - (hit as { x: number }).x;
          d.dragOffY = y - (hit as { y: number }).y;
        }
      } else {
        setSelectedId(null);
      }
      return;
    }

    if (tool === 'text') {
      const text = window.prompt('Teksti:');
      if (!text?.trim()) return;
      pushHistory(ss);
      setShapes((prev) => [...prev, { type: 'text', id: crypto.randomUUID(), x, y, text: text.trim(), color, size }]);
      return;
    }

    pushHistory(ss);
    d.active = true;
    d.startX = x;
    d.startY = y;
    const id = crypto.randomUUID();
    d.tempId = id;

    if (tool === 'player') {
      setShapes((prev) => [...prev, { type: 'player', id, x, y, color, size, number: nextPlayerNumber(prev) }]);
    } else if (tool === 'opponent') {
      setShapes((prev) => [...prev, { type: 'opponent', id, x, y, color, size }]);
    } else if (tool === 'cone') {
      setShapes((prev) => [...prev, { type: 'cone', id, x, y, color, size }]);
    } else if (tool === 'ball') {
      setShapes((prev) => [...prev, { type: 'ball', id, x, y, size }]);
    } else if (tool === 'arrow' || tool === 'dashed') {
      setShapes((prev) => [...prev, { type: 'arrow', id, points: [[x, y], [x, y]], dashed: tool === 'dashed', curved: false, color }]);
    } else if (tool === 'curved') {
      d.curvedPoints = [[x, y]];
      setShapes((prev) => [...prev, { type: 'arrow', id, points: [[x, y]], dashed: false, curved: true, color }]);
    } else if (tool === 'zone') {
      setShapes((prev) => [...prev, { type: 'zone', id, x, y, w: 0, h: 0, color }]);
    }
  }, [canvasRef, pushHistory]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drawing.current;
    if (!d.active || !canvasRef.current) return;
    const [x, y] = getCanvasPos(canvasRef.current, e);
    const { activeTool: tool } = stateRef.current;

    if (tool === 'select') {
      setShapes((prev) => prev.map((s) => {
        if (s.id !== d.tempId) return s;
        if (s.type === 'arrow') {
          const dx = x - d.startX, dy = y - d.startY;
          d.startX = x; d.startY = y;
          return { ...s, points: s.points.map(([px, py]) => [px + dx, py + dy] as [number, number]) };
        }
        if ('x' in s) return { ...s, x: x - d.dragOffX, y: y - d.dragOffY } as Shape;
        return s;
      }));
      return;
    }

    if (tool === 'arrow' || tool === 'dashed') {
      setShapes((prev) => prev.map((s) =>
        s.id === d.tempId && s.type === 'arrow' ? { ...s, points: [[d.startX, d.startY], [x, y]] } : s
      ));
    } else if (tool === 'curved') {
      d.curvedPoints = [...d.curvedPoints, [x, y]];
      setShapes((prev) => prev.map((s) =>
        s.id === d.tempId && s.type === 'arrow' ? { ...s, points: [...d.curvedPoints] as [number, number][] } : s
      ));
    } else if (tool === 'zone') {
      setShapes((prev) => prev.map((s) =>
        s.id === d.tempId && s.type === 'zone' ? { ...s, w: x - d.startX, h: y - d.startY } : s
      ));
    }
  }, [canvasRef]);

  const handlePointerUp = useCallback(() => {
    drawing.current.active = false;
    drawing.current.curvedPoints = [];
  }, []);

  return {
    shapes, activeTool, activeColor, activeSize, fieldType, selectedId,
    setTool, setColor, setSize, setFieldType,
    undo, clearCanvas, exportDataUrl,
    handlePointerDown, handlePointerMove, handlePointerUp,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | tail -10
```

Expected: no errors. If you see a type error about `RefObject<HTMLCanvasElement>` vs `RefObject<HTMLCanvasElement | null>`, change the parameter type to `RefObject<HTMLCanvasElement | null>` and add `if (!canvasRef.current) return;` guards where missing.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTacticalBoard.ts
git commit -m "feat: add useTacticalBoard canvas hook"
```

---

## Task 5: NewDrillPage Component

**Files:**
- Create: `src/pages/NewDrillPage.tsx`

- [ ] **Step 1: Create the page**

Create `src/pages/NewDrillPage.tsx`:

```tsx
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, RotateCcw, Trash2,
  MousePointer, UserRound, X, Triangle, Circle,
  ArrowRight, ArrowRightFromLine, Spline, Square, Type,
} from 'lucide-react';
import { useTacticalBoard } from '../hooks/useTacticalBoard';
import type { ToolType, SizeKey } from '../hooks/useTacticalBoard';
import { saveDrill } from '../utils/drillStorage';
import type { FieldType } from '../types';

const TOOLS: { id: ToolType; icon: React.ReactNode; label: string }[] = [
  { id: 'select',   icon: <MousePointer size={18} />,        label: 'Valitse' },
  { id: 'player',   icon: <UserRound size={18} />,           label: 'Pelaaja' },
  { id: 'opponent', icon: <X size={18} />,                   label: 'Vastustaja' },
  { id: 'cone',     icon: <Triangle size={18} />,            label: 'Kartio' },
  { id: 'ball',     icon: <Circle size={18} />,              label: 'Pallo' },
  { id: 'arrow',    icon: <ArrowRight size={18} />,          label: 'Nuoli' },
  { id: 'dashed',   icon: <ArrowRightFromLine size={18} />,  label: 'Syöttö (katkoviiva)' },
  { id: 'curved',   icon: <Spline size={18} />,              label: 'Juoksurata (käyrä)' },
  { id: 'zone',     icon: <Square size={18} />,              label: 'Alue' },
  { id: 'text',     icon: <Type size={18} />,                label: 'Teksti' },
];

const COLORS = [
  '#22c55e', '#ef4444', '#3b82f6', '#eab308',
  '#f97316', '#a855f7', '#ffffff', '#1f2937',
];

const FIELD_LABELS: Record<FieldType, string> = {
  football:   'Jalkapallokenttä',
  floorball:  'Salibandykaukalo',
  basketball: 'Koripallokenttä',
  icehockey:  'Jääkiekkokaukalo',
  half:       'Puolikenttä',
  '5v5':      'Pienkenttä 5v5',
  penalty:    'Rangaistusalue',
};

export function NewDrillPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const board = useTacticalBoard(canvasRef);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goals, setGoals] = useState('');
  const [duration, setDuration] = useState(15);
  const [repetitions, setRepetitions] = useState(1);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim() || !canvasRef.current) return;
    setSaving(true);
    try {
      await saveDrill({
        name: name.trim(),
        description,
        goals,
        duration,
        repetitions,
        fieldType: board.fieldType,
        canvasDataUrl: board.exportDataUrl(),
      });
      navigate('/training');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/training')}
          className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft size={16} /> Takaisin
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={14} /> {saving ? 'Tallennetaan…' : 'Tallenna harjoite'}
        </button>
      </div>

      {/* Main three-column layout */}
      <div className="flex gap-4 items-start">

        {/* Left toolbar */}
        <div className="w-14 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 flex flex-col items-center py-3 gap-1 shrink-0">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => board.setTool(t.id)}
              title={t.label}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                board.activeTool === t.id
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {t.icon}
            </button>
          ))}

          <div className="w-8 border-t border-gray-200 dark:border-slate-700 my-1" />

          {/* Color swatches — 2 columns */}
          <div className="grid grid-cols-2 gap-1 px-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => board.setColor(c)}
                title={c}
                className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                  board.activeColor === c
                    ? 'border-brand-500 scale-110'
                    : 'border-gray-300 dark:border-slate-600'
                }`}
                style={{ background: c }}
              />
            ))}
          </div>

          <div className="w-8 border-t border-gray-200 dark:border-slate-700 my-1" />

          {/* Size buttons */}
          {(['small', 'normal', 'large'] as SizeKey[]).map((s) => (
            <button
              key={s}
              onClick={() => board.setSize(s)}
              title={s === 'small' ? 'Pieni' : s === 'normal' ? 'Normaali' : 'Suuri'}
              className={`w-10 h-7 rounded text-xs font-bold transition-colors ${
                board.activeSize === s
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {s === 'small' ? 'S' : s === 'normal' ? 'M' : 'L'}
            </button>
          ))}

          <div className="w-8 border-t border-gray-200 dark:border-slate-700 my-1" />

          <button
            onClick={board.undo}
            title="Kumoa"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={board.clearCanvas}
            title="Tyhjennä kenttä"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Canvas area */}
        <div className="flex-1 flex flex-col items-center gap-3 min-w-0">
          {/* Field type selector */}
          <div className="flex flex-wrap gap-1.5 justify-center w-full">
            {(Object.keys(FIELD_LABELS) as FieldType[]).map((f) => (
              <button
                key={f}
                onClick={() => board.setFieldType(f)}
                className={`px-2.5 py-0.5 rounded-full text-xs border transition-colors ${
                  board.fieldType === f
                    ? 'bg-gray-800 dark:bg-slate-600 text-white border-gray-800 dark:border-slate-600'
                    : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500'
                }`}
              >
                {FIELD_LABELS[f]}
              </button>
            ))}
          </div>

          <canvas
            ref={canvasRef}
            width={800}
            height={560}
            onPointerDown={board.handlePointerDown}
            onPointerMove={board.handlePointerMove}
            onPointerUp={board.handlePointerUp}
            className="w-full rounded-xl shadow-lg cursor-crosshair touch-none"
            style={{ aspectRatio: '800/560' }}
          />
        </div>

        {/* Right panel — metadata form */}
        <div className="w-72 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 flex flex-col gap-4 shrink-0">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide block mb-1">
              Nimi <span className="text-red-400">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="esim. 2v1 hyökkäys"
              className="w-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Kuvaus</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Lyhyt kuvaus harjoitteesta..."
              className="w-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Valmennuspisteet</label>
            <textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              rows={3}
              placeholder="Mitä harjoitteella tavoitellaan..."
              className="w-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Kesto (min)</label>
              <input
                type="number"
                min={1}
                max={120}
                value={duration}
                onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))}
                className="w-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Toistot</label>
              <input
                type="number"
                min={1}
                max={20}
                value={repetitions}
                onChange={(e) => setRepetitions(Math.max(1, Number(e.target.value)))}
                className="w-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="mt-auto pt-3 border-t border-gray-100 dark:border-slate-700">
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={15} /> {saving ? 'Tallennetaan…' : 'Tallenna harjoite'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/NewDrillPage.tsx
git commit -m "feat: add NewDrillPage tactical board component"
```

---

## Task 6: Wire Up Routing

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Layout.tsx`

- [ ] **Step 1: Add route to App.tsx**

In `src/App.tsx`, add the import at the top with the other page imports:

```tsx
import { NewDrillPage } from './pages/NewDrillPage';
```

Then add the route inside the `<Route path="/" element={<Layout />}>` block, after the existing `training/:id/edit` route:

```tsx
<Route path="training/new-drill" element={<NewDrillPage />} />
```

The routes block should look like:

```tsx
<Route path="/" element={<Layout />}>
  <Route index element={<Dashboard />} />
  <Route path="players" element={<Players />} />
  <Route path="matches" element={<Matches />} />
  <Route path="planning" element={<MatchPlanning />} />
  <Route path="statistics" element={<Statistics />} />
  <Route path="training" element={<Training />} />
  <Route path="training/new" element={<TrainingBuilder />} />
  <Route path="training/:id/edit" element={<TrainingBuilder />} />
  <Route path="training/new-drill" element={<NewDrillPage />} />
  <Route path="communication" element={<Communication />} />
  <Route path="reminders" element={<Reminders />} />
  <Route path="settings" element={<Settings />} />
</Route>
```

- [ ] **Step 2: Add page title to Layout.tsx**

In `src/components/layout/Layout.tsx`, add an entry to `PAGE_TITLES`:

```ts
const PAGE_TITLES: Record<string, string> = {
  '/': 'Etusivu',
  '/players': 'Pelaajahallinta',
  '/matches': 'Otteluhallinta',
  '/planning': 'Ottelusuunnittelu',
  '/statistics': 'Tilastot',
  '/training': 'Harjoitussuunnitelma',
  '/training/new': 'Uusi harjoitussuunnitelma',
  '/training/new-drill': 'Uusi harjoite',       // ← add this line
  '/training/edit': 'Muokkaa harjoitussuunnitelmaa',
  '/communication': 'Viestintä',
  '/reminders': 'Muistutukset',
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/layout/Layout.tsx
git commit -m "feat: add /training/new-drill route and page title"
```

---

## Task 7: Training.tsx — Button Swap + Drill Thumbnails

**Files:**
- Modify: `src/pages/Training.tsx`

- [ ] **Step 1: Add imports**

At the top of `src/pages/Training.tsx`, add these two imports alongside the existing ones:

```tsx
import { useDrillStore } from '../store/useDrillStore';
import { deleteDrill } from '../utils/drillStorage';
```

- [ ] **Step 2: Read the drill store in the component**

Inside the `Training` function body, add after the existing store hooks (around line 63):

```tsx
const drills = useDrillStore((s) => s.drills);
```

- [ ] **Step 3: Swap the "Uusi harjoite" button**

Find this line (around line 243):

```tsx
{view === 'library' && (
  <Button icon={<Plus size={15} />} onClick={openCreateEx}>Uusi harjoite</Button>
)}
```

Change `onClick={openCreateEx}` to `onClick={() => navigate('/training/new-drill')}`:

```tsx
{view === 'library' && (
  <Button icon={<Plus size={15} />} onClick={() => navigate('/training/new-drill')}>Uusi harjoite</Button>
)}
```

- [ ] **Step 4: Add drill thumbnail grid to the library view**

In the library view section (inside `{view === 'library' && ...}`), add the drill thumbnails block **above** the existing category filter div. Insert this block right after the `<div className="space-y-4">` opening tag:

```tsx
{drills.length > 0 && (
  <div>
    <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">
      Tallennetut harjoitteet
    </p>
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 mb-2">
      {drills.map((d) => (
        <div
          key={d.id}
          className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:border-brand-300 hover:shadow-sm transition-all"
        >
          <img
            src={d.canvasDataUrl}
            alt={d.name}
            className="w-full aspect-video object-cover"
          />
          <div className="p-2">
            <p className="font-medium text-sm text-gray-900 dark:text-slate-100 truncate">{d.name}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-400 dark:text-slate-500">{d.duration} min</span>
              <button
                onClick={() => deleteDrill(d.id)}
                className="text-gray-400 dark:text-slate-500 hover:text-red-500 transition-colors"
                title="Poista harjoite"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Training.tsx
git commit -m "feat: wire Uusi harjoite button to new-drill route, add drill thumbnails"
```

---

## Task 8: Manual Verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Open `http://localhost:5173` in a browser.

- [ ] **Step 2: Verify navigation**

1. Go to Training → Harjoitekirjasto tab
2. Click "Uusi harjoite" button
3. Confirm page navigates to `/training/new-drill` with the header showing "Uusi harjoite"
4. Confirm "← Takaisin" returns to Training page

- [ ] **Step 3: Verify field templates**

On the new drill page, click each of the 7 field type pills and confirm the canvas redraws with the correct field type:
- Jalkapallokenttä → green pitch with center circle, penalty areas, goals
- Puolikenttä → green half-pitch with penalty area D
- Pienkenttä 5v5 → small green pitch with center line
- Rangaistusalue → penalty box with D arc and goal
- Salibandykaukalo → light grey rink with rounded corners, goal creases
- Koripallokenttä → orange/brown court with keys and 3-point arcs
- Jääkiekkokaukalo → light blue rink with blue lines, face-off circles

- [ ] **Step 4: Verify canvas tools**

Test each tool:
- **Pelaaja**: click canvas → numbered red circle appears, auto-increments
- **Vastustaja**: click → X shape appears
- **Kartio**: click → orange triangle appears
- **Pallo**: click → white circle with black dot
- **Nuoli**: click-drag → straight arrow with arrowhead
- **Syöttö**: click-drag → dashed arrow with arrowhead
- **Juoksu**: click-drag → curved freehand arrow
- **Alue**: click-drag → semi-transparent rectangle
- **Teksti**: click → prompt appears, text placed on canvas
- **Valitse**: click a shape → highlight; drag to move; Delete key removes

- [ ] **Step 5: Verify undo and clear**

1. Draw 3 shapes. Click Kumoa (undo) three times → canvas returns to field only.
2. Draw 3 more. Click Tyhjennä → canvas clears immediately.

- [ ] **Step 6: Verify colors and sizes**

1. Select Pelaaja tool, click a green color swatch, place a player → green circle
2. Select size L, place a player → larger circle than default

- [ ] **Step 7: Verify save and thumbnail**

1. Draw a drill, enter a name "Testi 2v1", set duration 10 min
2. Click "Tallenna harjoite"
3. Confirm redirect to Training → Harjoitekirjasto tab
4. Confirm thumbnail card appears showing the canvas image, name "Testi 2v1", "10 min"
5. Click the trash icon → card disappears

- [ ] **Step 8: Verify persistence**

1. Save a drill, reload the page
2. Navigate to Training → Harjoitekirjasto
3. Confirm the drill thumbnail is still present (stored in localStorage)

- [ ] **Step 9: Final commit**

```bash
git add .
git commit -m "feat: complete Uusi Harjoite tactical board feature"
```

---

## Notes for Firebase Migration (future)

When adding Firebase, the only file to modify is `src/utils/drillStorage.ts`. Replace both function bodies:

```ts
// saveDrill: upload canvasDataUrl as blob to Firebase Storage, get URL,
// write { ...data, canvasUrl, id, createdAt } to Firestore 'drills' collection
// Also swap Drill.canvasDataUrl → canvasUrl in types/index.ts
// and update any <img src={d.canvasDataUrl}> to <img src={d.canvasUrl}>

// deleteDrill: delete Firestore doc + corresponding Storage file
```

No hook, page, or store changes are needed.
