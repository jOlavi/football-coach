import { useState, useEffect, useCallback, useRef } from 'react';
import type { RefObject } from 'react';
import type { FieldType, SizeKey, ToolType, Shape } from '../types';

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

function drawBlank(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#2d7a3a';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  const pad = 20;
  ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
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
    case 'blank':      drawBlank(ctx, w, h);        break;
  }
}

// Cached once at module load — avoids per-frame Path2D allocation
const SHIRT_PATH = new Path2D('M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z');

// ── Shape drawing ──────────────────────────────────────────────────────────

function drawShape(ctx: CanvasRenderingContext2D, shape: Shape, selected: boolean) {
  ctx.save();
  if (selected) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 10; }

  switch (shape.type) {
    case 'player': {
      const r = SIZE_PX[shape.size];
      const cx = shape.x, cy = shape.y;
      const scale = r / 11;
      ctx.save();
      ctx.translate(cx - 12 * scale, cy - 12 * scale);
      ctx.scale(scale, scale);
      ctx.fillStyle = shape.color; ctx.fill(SHIRT_PATH);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5 / scale; ctx.stroke(SHIRT_PATH);
      ctx.restore();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(8, r - 3)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(shape.number), cx, cy + r * 0.36);
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
      const cx = shape.x, cy = shape.y;
      // White base
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill();
      // Clip black patches to ball circle
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2); ctx.clip();
      // Central pentagon
      const pr = r * 0.36;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * 2 * Math.PI / 5) - Math.PI / 2;
        const px = cx + pr * Math.cos(a), py = cy + pr * Math.sin(a);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fillStyle = '#1a1a1a'; ctx.fill();
      // 5 edge patches (one per pentagon vertex direction)
      for (let i = 0; i < 5; i++) {
        const a = (i * 2 * Math.PI / 5) - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(cx + r * 0.72 * Math.cos(a), cy + r * 0.72 * Math.sin(a), r * 0.24, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a1a'; ctx.fill();
      }
      ctx.restore();
      // Outer stroke
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.stroke();
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
    case 'goal': {
      const w = SIZE_PX[shape.size] * 3.5;
      const h = SIZE_PX[shape.size] * 2;
      ctx.translate(shape.x, shape.y);
      ctx.rotate((shape.rotation ?? 0) * Math.PI / 180);
      if (selected) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6);
      }
      ctx.strokeStyle = shape.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-w / 2, h / 2);
      ctx.lineTo(-w / 2, -h / 2);
      ctx.lineTo(w / 2, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.35;
      const cols = 3, rows = 2;
      for (let i = 1; i < cols; i++) {
        const nx = -w / 2 + (w / cols) * i;
        ctx.beginPath(); ctx.moveTo(nx, -h / 2); ctx.lineTo(nx, h / 2); ctx.stroke();
      }
      for (let i = 1; i <= rows; i++) {
        const ny = -h / 2 + (h / (rows + 1)) * i;
        ctx.beginPath(); ctx.moveTo(-w / 2, ny); ctx.lineTo(w / 2, ny); ctx.stroke();
      }
      ctx.globalAlpha = 1;
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
    case 'goal': {
      const rad = -((shape.rotation ?? 0) * Math.PI / 180);
      const dx = x - shape.x, dy = y - shape.y;
      const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
      const hw = SIZE_PX[shape.size] * 3.5 / 2 + 10;
      const hh = SIZE_PX[shape.size] * 2 / 2 + 10;
      return lx >= -hw && lx <= hw && ly >= -hh && ly <= hh;
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
    default:
      return false;
  }
}

// ── Canvas coordinate helper ───────────────────────────────────────────────

function getCanvasPos(
  canvas: HTMLCanvasElement,
  e: React.PointerEvent<HTMLCanvasElement>,
  cachedRect?: DOMRect | null
): [number, number] {
  const rect = cachedRect ?? canvas.getBoundingClientRect();
  return [
    (e.clientX - rect.left) * (canvas.width / rect.width),
    (e.clientY - rect.top) * (canvas.height / rect.height),
  ];
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useTacticalBoard(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const historyRef = useRef<Shape[][]>([]);
  const [activeTool, setTool] = useState<ToolType>('player');
  const [activeColor, setColor] = useState('#ef4444');
  const [activeSize, setSize] = useState<SizeKey>('small');
  const [fieldType, setFieldType] = useState<FieldType>('football');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingTextPos, setPendingTextPos] = useState<{ x: number; y: number } | null>(null);

  const fieldCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rectRef = useRef<DOMRect | null>(null);

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
    historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), s];
  }, []);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    setShapes(prev);
    setSelectedId(null);
  }, []);

  const clearCanvas = useCallback(() => {
    pushHistory(stateRef.current.shapes);
    setShapes([]);
    setSelectedId(null);
  }, [pushHistory]);

  const deleteSelected = useCallback(() => {
    const { selectedId: sid, shapes: ss } = stateRef.current;
    if (!sid) return;
    pushHistory(ss);
    setShapes((prev) => prev.filter((s) => s.id !== sid));
    setSelectedId(null);
  }, [pushHistory]);

  const updateSelectedColor = useCallback((color: string) => {
    const { selectedId: sid, shapes: ss } = stateRef.current;
    if (!sid) return;
    pushHistory(ss);
    setShapes((prev) => prev.map((s) =>
      s.id === sid && 'color' in s ? { ...s, color } as Shape : s
    ));
  }, [pushHistory]);

  const updateSelectedSize = useCallback((size: SizeKey) => {
    const { selectedId: sid, shapes: ss } = stateRef.current;
    if (!sid) return;
    pushHistory(ss);
    setShapes((prev) => prev.map((s) =>
      s.id === sid && 'size' in s ? { ...s, size } as Shape : s
    ));
  }, [pushHistory]);

  const updateSelectedRotation = useCallback((delta: number) => {
    const { selectedId: sid, shapes: ss } = stateRef.current;
    if (!sid) return;
    pushHistory(ss);
    setShapes((prev) => prev.map((s) =>
      s.id === sid && s.type === 'goal'
        ? { ...s, rotation: ((s.rotation ?? 0) + delta + 360) % 360 }
        : s
    ));
  }, [pushHistory]);

  const exportDataUrl = useCallback((): string => {
    return canvasRef.current?.toDataURL('image/png') ?? '';
  }, [canvasRef]);

  const commitText = useCallback((text: string) => {
    const pos = pendingTextPos;
    if (!pos || !text.trim()) { setPendingTextPos(null); return; }
    const { activeColor: color, activeSize: size, shapes: ss } = stateRef.current;
    pushHistory(ss);
    setShapes((prev) => [...prev, { type: 'text', id: crypto.randomUUID(), x: pos.x, y: pos.y, text: text.trim(), color, size }]);
    setPendingTextPos(null);
  }, [pendingTextPos, pushHistory]);

  const cancelText = useCallback(() => setPendingTextPos(null), []);

  const loadShapes = useCallback((newShapes: Shape[], newFieldType: FieldType) => {
    historyRef.current = [];
    drawing.current = { active: false, startX: 0, startY: 0, tempId: '', dragOffX: 0, dragOffY: 0, curvedPoints: [] };
    setSelectedId(null);
    setFieldType(newFieldType);
    setShapes(newShapes);
  }, []);

  // Re-render field to offscreen canvas only when fieldType changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;
    drawField(offCtx, offscreen.width, offscreen.height, fieldType);
    fieldCanvasRef.current = offscreen;
  }, [fieldType, canvasRef]);

  // Redraw on state change — field is a cheap drawImage from the offscreen cache
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (fieldCanvasRef.current) {
      ctx.drawImage(fieldCanvasRef.current, 0, 0);
    } else {
      drawField(ctx, canvas.width, canvas.height, fieldType);
    }
    shapes.forEach((s) => drawShape(ctx, s, s.id === selectedId));
  }, [shapes, fieldType, selectedId, canvasRef]);

  // Cache canvas bounding rect — avoids layout reflow on every pointer event
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    rectRef.current = canvas.getBoundingClientRect();
    const observer = new ResizeObserver(() => {
      rectRef.current = canvas.getBoundingClientRect();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [canvasRef]);

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
    const [x, y] = getCanvasPos(canvasRef.current, e, rectRef.current);
    const { activeTool: tool, activeColor: color, activeSize: size, shapes: ss } = stateRef.current;
    const d = drawing.current;

    if (tool === 'text') {
      setPendingTextPos({ x, y });
      return;
    }

    canvasRef.current.setPointerCapture(e.pointerId);

    if (tool === 'select') {
      const hit = [...ss].reverse().find((s) => hitTest(s, x, y));
      if (hit) {
        setSelectedId(hit.id);
        d.active = true;
        d.tempId = hit.id;
        d.startX = x;
        d.startY = y;
        if ('x' in hit) {
          d.dragOffX = x - (hit as { x: number }).x;
          d.dragOffY = y - (hit as { y: number }).y;
        }
      } else {
        setSelectedId(null);
      }
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
    } else if (tool === 'goal') {
      setShapes((prev) => [...prev, { type: 'goal', id, x, y, color, size, rotation: 0 }]);
    } else if (tool === 'arrow' || tool === 'dashed') {
      setShapes((prev) => [...prev, { type: 'arrow', id, points: [[x, y], [x, y]], dashed: tool === 'dashed', curved: false, color }]);
    } else if (tool === 'curved') {
      d.curvedPoints = [[x, y]];
      setShapes((prev) => [...prev, { type: 'arrow', id, points: [[x, y]], dashed: false, curved: true, color }]);
    } else if (tool === 'zone') {
      setShapes((prev) => [...prev, { type: 'zone', id, x, y, w: 0, h: 0, color }]);
    }
    setSelectedId(id);
  }, [canvasRef, pushHistory]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drawing.current;
    if (!d.active || !canvasRef.current) return;
    const [x, y] = getCanvasPos(canvasRef.current, e, rectRef.current);
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
      const last = d.curvedPoints[d.curvedPoints.length - 1];
      if (!last || Math.hypot(x - last[0], y - last[1]) >= 8) {
        d.curvedPoints = [...d.curvedPoints, [x, y]];
        setShapes((prev) => prev.map((s) =>
          s.id === d.tempId && s.type === 'arrow' ? { ...s, points: [...d.curvedPoints] as [number, number][] } : s
        ));
      }
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
    shapes, activeTool, activeColor, activeSize, fieldType, selectedId, pendingTextPos,
    selectedShape: shapes.find((s) => s.id === selectedId) ?? null,
    setTool, setColor, setSize, setFieldType,
    undo, clearCanvas, deleteSelected, updateSelectedColor, updateSelectedSize, updateSelectedRotation, exportDataUrl, loadShapes,
    commitText, cancelText,
    handlePointerDown, handlePointerMove, handlePointerUp,
  };
}
