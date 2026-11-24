import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { clonePose, type GameRole, type StageObject3D } from '@opencraft/shared';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bot,
  Box,
  Camera,
  CheckCircle2,
  Coins,
  Crosshair,
  Download,
  Flag,
  Gamepad2,
  Heart,
  Layers,
  Maximize2,
  Move,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Sliders,
  Sparkles,
  Square,
  Sun,
  Trash2,
  Trophy,
  User,
  Wand2,
  Zap,
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

type CameraViewMode = 'tps' | 'topdown' | 'fps';
type SkyThemeId = 'cyber' | 'sunset' | 'neon' | 'sky';
type GizmoMode = 'translate' | 'rotate' | 'scale';

interface GameRulesConfig {
  doubleJump: boolean;
  dashEnabled: boolean;
  shooterEnabled: boolean;
  requireAllCoins: boolean;
  gravity: number;
}

const SKY_THEMES: Record<
  SkyThemeId,
  { label: string; bg: string; fog: string; ambient: string; dir: string; grid1: number; grid2: number }
> = {
  cyber: {
    label: 'Siber Gece',
    bg: '#090d16',
    fog: '#090d16',
    ambient: '#dbeafe',
    dir: '#fff7ed',
    grid1: 0x334155,
    grid2: 0x1e293b,
  },
  sunset: {
    label: 'Gün Batımı',
    bg: '#2a1225',
    fog: '#3b182e',
    ambient: '#fed7aa',
    dir: '#fb923c',
    grid1: 0x9d174d,
    grid2: 0x500724,
  },
  neon: {
    label: 'Neon Arena',
    bg: '#050816',
    fog: '#0a0f2c',
    ambient: '#a5f3fc',
    dir: '#e879f9',
    grid1: 0x0ea5e9,
    grid2: 0x1e1b4b,
  },
  sky: {
    label: 'Açık Gökyüzü',
    bg: '#0c4a6e',
    fog: '#0369a1',
    ambient: '#f0f9ff',
    dir: '#fef08a',
    grid1: 0x38bdf8,
    grid2: 0x075985,
  },
};

const ROLE_META: Record<
  GameRole,
  { label: string; badge: string; ringColor: string; defaultColor: string }
> = {
  player: {
    label: 'Oyuncu',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-400/40',
    ringColor: '#38bdf8',
    defaultColor: '#38bdf8',
  },
  solid: {
    label: 'Sabit Platform',
    badge: 'bg-slate-500/20 text-slate-200 border-slate-400/30',
    ringColor: '#94a3b8',
    defaultColor: '#334155',
  },
  moving: {
    label: 'Hareketli Platform',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
    ringColor: '#06b6d4',
    defaultColor: '#0e7490',
  },
  bounce: {
    label: 'Trambolin / Zıplatıcı',
    badge: 'bg-lime-500/20 text-lime-300 border-lime-400/40',
    ringColor: '#84cc16',
    defaultColor: '#65a30d',
  },
  collectible: {
    label: 'Altın / Ödül',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
    ringColor: '#fbbf24',
    defaultColor: '#f59e0b',
  },
  hazard: {
    label: 'Tehlike / Tuzak',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-400/40',
    ringColor: '#f43f5e',
    defaultColor: '#ef4444',
  },
  checkpoint: {
    label: 'Checkpoint',
    badge: 'bg-teal-500/20 text-teal-300 border-teal-400/40',
    ringColor: '#2dd4bf',
    defaultColor: '#0d9488',
  },
  goal: {
    label: 'Bitiş Portalı',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
    ringColor: '#10b981',
    defaultColor: '#10b981',
  },
  npc: {
    label: 'Devriye NPC',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
    ringColor: '#a855f7',
    defaultColor: '#a855f7',
  },
  decor: {
    label: 'Dekor',
    badge: 'bg-zinc-500/20 text-zinc-300 border-zinc-400/30',
    ringColor: '#71717a',
    defaultColor: '#64748b',
  },
};

function inferRole(obj: StageObject3D): GameRole {
  if (obj.gameRole) return obj.gameRole;
  if (obj.kind === 'mannequin') return 'player';
  if (obj.kind === 'torus') return 'collectible';
  return 'solid';
}

function playSynthTone(type: 'jump' | 'coin' | 'hit' | 'win' | 'bounce' | 'shoot' | 'dash' | 'checkpoint') {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const triggerNote = (
      freqStart: number,
      freqEnd: number,
      duration: number,
      delay = 0,
      wave: OscillatorType = 'sine',
      gainPeak = 0.14,
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freqStart, now + delay);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + delay + duration);
      gain.gain.setValueAtTime(gainPeak, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + duration + 0.02);
    };

    switch (type) {
      case 'jump':
        triggerNote(240, 520, 0.14, 0, 'triangle', 0.12);
        break;
      case 'bounce':
        triggerNote(220, 960, 0.24, 0, 'sine', 0.15);
        break;
      case 'dash':
        triggerNote(520, 180, 0.12, 0, 'sawtooth', 0.09);
        break;
      case 'shoot':
        triggerNote(880, 220, 0.11, 0, 'square', 0.08);
        break;
      case 'coin':
        triggerNote(880, 1320, 0.1, 0, 'sine', 0.15);
        triggerNote(1320, 1760, 0.12, 0.07, 'sine', 0.12);
        break;
      case 'checkpoint':
        triggerNote(587.33, 880, 0.16, 0, 'triangle', 0.13);
        triggerNote(880, 1174.66, 0.18, 0.1, 'triangle', 0.13);
        break;
      case 'hit':
        triggerNote(180, 65, 0.22, 0, 'sawtooth', 0.15);
        break;
      case 'win':
        triggerNote(523.25, 523.25, 0.14, 0, 'triangle', 0.15);
        triggerNote(659.25, 659.25, 0.14, 0.11, 'triangle', 0.15);
        triggerNote(783.99, 1046.5, 0.28, 0.22, 'triangle', 0.16);
        break;
    }

    window.setTimeout(() => {
      void ctx.close();
    }, 900);
  } catch {
    // Ignore autoplay/WebAudio restrictions
  }
}

function makeObj(
  name: string,
  objKind: StageObject3D['kind'],
  gameRole: GameRole,
  position: { x: number; y: number; z: number },
  scale: { x: number; y: number; z: number },
  color: string,
  extra: Partial<StageObject3D> = {},
): StageObject3D {
  return {
    id: `gm_${Math.random().toString(36).slice(2, 8)}`,
    name,
    kind: objKind,
    visible: true,
    position,
    rotation: { x: 0, y: 0, z: 0 },
    scale,
    color,
    roughness: 0.42,
    metalness: gameRole === 'collectible' || gameRole === 'goal' ? 0.5 : 0.14,
    emissiveIntensity:
      gameRole === 'goal' || gameRole === 'hazard' || gameRole === 'bounce' || gameRole === 'checkpoint'
        ? 0.35
        : 0,
    gameRole,
    ...extra,
  };
}

function makeTemplate(kind: 'platformer' | 'arena' | 'tower'): StageObject3D[] {
  if (kind === 'platformer') {
    return [
      makeObj('Kahraman Oyuncu', 'mannequin', 'player', { x: 0, y: 1.6, z: 7 }, { x: 1, y: 1, z: 1 }, '#38bdf8', {
        pose: clonePose(),
        moveSpeed: 7.8,
        jumpForce: 10.6,
      }),
      makeObj('Başlangıç Zemini', 'box', 'solid', { x: 0, y: -0.5, z: 6.5 }, { x: 7, y: 1, z: 7 }, '#1e293b'),
      makeObj('Basamak 1', 'box', 'solid', { x: 0, y: 0.6, z: 1.2 }, { x: 4.5, y: 0.7, z: 3.2 }, '#334155'),
      makeObj('Trambolin Pad', 'cylinder', 'bounce', { x: 0, y: 1.1, z: 0.2 }, { x: 1.6, y: 0.35, z: 1.6 }, '#84cc16', {
        bounceForce: 17.5,
      }),
      makeObj('Hareketli Köprü', 'box', 'moving', { x: 0, y: 2.3, z: -4.2 }, { x: 4.2, y: 0.65, z: 3 }, '#06b6d4', {
        moveSpeed: 2.2,
        patrolRange: 3.4,
        patrolAxis: 'x',
      }),
      makeObj('Orta Ada & Checkpoint', 'box', 'solid', { x: 0, y: 2.5, z: -9.5 }, { x: 6, y: 0.8, z: 4.8 }, '#334155'),
      makeObj('Ara Kayıt Bayrağı', 'cylinder', 'checkpoint', { x: -1.8, y: 3.8, z: -9.5 }, { x: 0.9, y: 1.8, z: 0.9 }, '#2dd4bf'),
      makeObj('Bitiş Kalesi', 'box', 'solid', { x: 0, y: 3.4, z: -15.5 }, { x: 7, y: 0.9, z: 6 }, '#1e293b'),
      makeObj('Altın #1', 'torus', 'collectible', { x: 0, y: 1.8, z: 1.5 }, { x: 0.7, y: 0.7, z: 0.7 }, '#fbbf24'),
      makeObj('Altın #2 (Hava)', 'torus', 'collectible', { x: 0, y: 4.8, z: -2.2 }, { x: 0.75, y: 0.75, z: 0.75 }, '#fbbf24'),
      makeObj('Altın #3', 'torus', 'collectible', { x: 1.4, y: 4.6, z: -14.2 }, { x: 0.7, y: 0.7, z: 0.7 }, '#fbbf24'),
      makeObj('Lazer Engeli', 'box', 'hazard', { x: -1.4, y: 4.2, z: -14.5 }, { x: 1.4, y: 0.8, z: 1.2 }, '#f43f5e'),
      makeObj('Devriye Bot', 'cone', 'npc', { x: 0, y: 3.6, z: -9.5 }, { x: 0.9, y: 1.3, z: 0.9 }, '#a855f7', {
        moveSpeed: 2.6,
        patrolRange: 2.3,
      }),
      makeObj('Zafer Portalı', 'cylinder', 'goal', { x: 0, y: 5, z: -16.8 }, { x: 1.6, y: 2.3, z: 1.6 }, '#10b981'),
    ];
  }

  if (kind === 'tower') {
    return [
      makeObj('Kule Tırmanıcısı', 'mannequin', 'player', { x: 0, y: 1.4, z: 5.5 }, { x: 1, y: 1, z: 1 }, '#38bdf8', {
        pose: clonePose(),
        moveSpeed: 8.0,
        jumpForce: 11.2,
      }),
      makeObj('Kule Tabanı', 'box', 'solid', { x: 0, y: -0.5, z: 0 }, { x: 14, y: 1, z: 14 }, '#1e293b'),
      makeObj('Kat 1 Trambolin', 'cylinder', 'bounce', { x: 3.8, y: 0.25, z: 2.8 }, { x: 1.8, y: 0.4, z: 1.8 }, '#84cc16', {
        bounceForce: 19,
      }),
      makeObj('Kat 2 Balkonu', 'box', 'solid', { x: 3.8, y: 4.2, z: -2.2 }, { x: 4.6, y: 0.7, z: 4.6 }, '#334155'),
      makeObj('Kat 2 Checkpoint', 'cylinder', 'checkpoint', { x: 4.6, y: 5.4, z: -2.2 }, { x: 0.85, y: 1.7, z: 0.85 }, '#2dd4bf'),
      makeObj('Asansör Platform', 'box', 'moving', { x: -1.5, y: 5.8, z: -2.2 }, { x: 3.8, y: 0.6, z: 3.8 }, '#06b6d4', {
        moveSpeed: 2.0,
        patrolRange: 2.8,
        patrolAxis: 'y',
      }),
      makeObj('Zirve Terası', 'box', 'solid', { x: -5, y: 8.6, z: -2.2 }, { x: 5.5, y: 0.8, z: 5.5 }, '#475569'),
      makeObj('Kule Altını 1', 'torus', 'collectible', { x: 3.8, y: 5.4, z: -1.6 }, { x: 0.75, y: 0.75, z: 0.75 }, '#fbbf24'),
      makeObj('Kule Altını 2', 'torus', 'collectible', { x: -1.5, y: 8.4, z: -2.2 }, { x: 0.75, y: 0.75, z: 0.75 }, '#fbbf24'),
      makeObj('Zirve Nöbetçisi', 'cone', 'npc', { x: -5, y: 9.7, z: -1.4 }, { x: 0.95, y: 1.4, z: 0.95 }, '#a855f7', {
        moveSpeed: 2.8,
        patrolRange: 2.0,
      }),
      makeObj('Zirve Portalı', 'cylinder', 'goal', { x: -5, y: 10.2, z: -3.8 }, { x: 1.6, y: 2.3, z: 1.6 }, '#10b981'),
    ];
  }

  // Arena / Shooter
  return [
    makeObj('Arena Savaşçısı', 'mannequin', 'player', { x: 0, y: 1.4, z: 7.5 }, { x: 1, y: 1, z: 1 }, '#38bdf8', {
      pose: clonePose(),
      moveSpeed: 8.8,
      jumpForce: 10.0,
    }),
    makeObj('Savaş Arenası', 'box', 'solid', { x: 0, y: -0.5, z: 0 }, { x: 22, y: 1, z: 22 }, '#1e293b'),
    makeObj('Merkez Platform', 'box', 'solid', { x: 0, y: 1.4, z: 0 }, { x: 4, y: 2.8, z: 4 }, '#475569'),
    makeObj('Arena Trambolin', 'cylinder', 'bounce', { x: -5.5, y: 0.25, z: 4.5 }, { x: 1.7, y: 0.35, z: 1.7 }, '#84cc16', {
      bounceForce: 18,
    }),
    makeObj('Altın Kuzey', 'torus', 'collectible', { x: 0, y: 1.1, z: -7 }, { x: 0.75, y: 0.75, z: 0.75 }, '#fbbf24'),
    makeObj('Altın Doğu', 'torus', 'collectible', { x: 7, y: 1.1, z: 0 }, { x: 0.75, y: 0.75, z: 0.75 }, '#fbbf24'),
    makeObj('Altın Batı', 'torus', 'collectible', { x: -7, y: 1.1, z: 0 }, { x: 0.75, y: 0.75, z: 0.75 }, '#fbbf24'),
    makeObj('Merkez Ödül', 'torus', 'collectible', { x: 0, y: 3.8, z: 0 }, { x: 0.85, y: 0.85, z: 0.85 }, '#fbbf24'),
    makeObj('Lazer Kapanı', 'cone', 'hazard', { x: 4.5, y: 0.8, z: 4.5 }, { x: 1.1, y: 1.6, z: 1.1 }, '#f43f5e'),
    makeObj('Devriye Bot #1', 'cone', 'npc', { x: -4.2, y: 0.9, z: -2.8 }, { x: 1.1, y: 1.4, z: 1.1 }, '#a855f7', {
      moveSpeed: 3.1,
      patrolRange: 4.5,
    }),
    makeObj('Devriye Bot #2', 'sphere', 'npc', { x: 4.2, y: 0.9, z: -5.5 }, { x: 1.15, y: 1.15, z: 1.15 }, '#c084fc', {
      moveSpeed: 3.6,
      patrolRange: 4.2,
    }),
    makeObj('Arena Çıkışı', 'cylinder', 'goal', { x: 0, y: 1.5, z: -9.2 }, { x: 1.6, y: 2.4, z: 1.6 }, '#10b981'),
  ];
}

function generateLevelFromPrompt(prompt: string): {
  objects: StageObject3D[];
  skyTheme?: SkyThemeId;
  summary: string;
} {
  const lower = prompt.toLowerCase();
  const numMatch = lower.match(/(\d+)\s*(altın|coin|bot|npc|düşman|engel|tuzak|platform)/i);
  const coinMatch = lower.match(/(\d+)\s*(altın|coin)/i);
  const botMatch = lower.match(/(\d+)\s*(bot|npc|düşman)/i);
  const hazardMatch = lower.match(/(\d+)\s*(engel|tuzak|lazer|lav)/i);

  const coinsCount = Math.min(10, Math.max(2, Number(coinMatch?.[1] ?? (numMatch?.[2]?.includes('altın') ? numMatch[1] : 4))));
  const botsCount = Math.min(6, Math.max(1, Number(botMatch?.[1] ?? (lower.includes('bot') || lower.includes('npc') || lower.includes('düşman') ? 2 : 1))));
  const hazardCount = Math.min(6, Math.max(1, Number(hazardMatch?.[1] ?? (lower.includes('lav') || lower.includes('tuzak') || lower.includes('engel') ? 2 : 1))));
  const hasBounce = /trambolin|zıpla|bounce|yay/.test(lower) || !lower.trim();
  const hasMoving = /hareketli|asansör|köprü|moving/.test(lower) || !lower.trim();
  const isTower = /kule|dikey|tower|yukarı/.test(lower);

  let skyTheme: SkyThemeId | undefined;
  if (/neon|siber/.test(lower)) skyTheme = 'neon';
  else if (/gün\s*batım|sunset|lav/.test(lower)) skyTheme = 'sunset';
  else if (/gökyüzü|bulut|mavi|sky/.test(lower)) skyTheme = 'sky';

  const objects: StageObject3D[] = [
    makeObj('AI Kahraman', 'mannequin', 'player', { x: 0, y: 1.6, z: 7 }, { x: 1, y: 1, z: 1 }, '#38bdf8', {
      pose: clonePose(),
      moveSpeed: 8.2,
      jumpForce: 10.8,
    }),
    makeObj('Başlangıç Alanı', 'box', 'solid', { x: 0, y: -0.5, z: 6.5 }, { x: 7.5, y: 1, z: 6.5 }, '#1e293b'),
  ];

  const steps = Math.max(4, coinsCount + 1);
  let curY = 0.5;
  let curZ = 1.5;
  let curX = 0;

  for (let i = 0; i < steps; i++) {
    curZ -= isTower ? 3.2 : 4.6;
    curY += isTower ? 1.8 : i % 2 === 0 ? 0.8 : 0.4;
    curX = i % 2 === 0 ? 1.8 : -1.8;

    const isMovingStep = hasMoving && i === Math.floor(steps / 2);
    objects.push(
      makeObj(
        isMovingStep ? `Hareketli Platform #${i + 1}` : `Platform #${i + 1}`,
        'box',
        isMovingStep ? 'moving' : 'solid',
        { x: isMovingStep ? 0 : curX, y: curY, z: curZ },
        { x: 4.5, y: 0.7, z: 3.4 },
        isMovingStep ? '#06b6d4' : '#334155',
        isMovingStep ? { moveSpeed: 2.3, patrolRange: 3.2, patrolAxis: 'x' } : {},
      ),
    );

    if (i < coinsCount) {
      objects.push(
        makeObj(
          `AI Altın #${i + 1}`,
          'torus',
          'collectible',
          { x: isMovingStep ? 0 : curX, y: curY + 1.25, z: curZ },
          { x: 0.72, y: 0.72, z: 0.72 },
          '#fbbf24',
        ),
      );
    }

    if (hasBounce && i === 1) {
      objects.push(
        makeObj(
          'AI Trambolin',
          'cylinder',
          'bounce',
          { x: curX, y: curY + 0.5, z: curZ + 0.7 },
          { x: 1.6, y: 0.35, z: 1.6 },
          '#84cc16',
          { bounceForce: 18 },
        ),
      );
    }

    if (i === Math.floor(steps / 2) + 1) {
      objects.push(
        makeObj(
          'AI Checkpoint',
          'cylinder',
          'checkpoint',
          { x: curX - 1.2, y: curY + 1.2, z: curZ },
          { x: 0.85, y: 1.7, z: 0.85 },
          '#2dd4bf',
        ),
      );
    }
  }

  // Final platform + bots + hazards + goal
  const endZ = curZ - 5.2;
  const endY = curY + 0.6;
  objects.push(
    makeObj('Final Arenası', 'box', 'solid', { x: 0, y: endY, z: endZ }, { x: 9, y: 0.9, z: 7 }, '#1e293b'),
  );

  for (let b = 0; b < botsCount; b++) {
    objects.push(
      makeObj(
        `AI Devriye Bot #${b + 1}`,
        'cone',
        'npc',
        { x: (b % 2 === 0 ? -1 : 1) * 1.5, y: endY + 1.15, z: endZ + 1.4 - b * 1.3 },
        { x: 0.95, y: 1.4, z: 0.95 },
        '#a855f7',
        { moveSpeed: 2.5 + b * 0.4, patrolRange: 2.8 },
      ),
    );
  }

  for (let h = 0; h < hazardCount; h++) {
    objects.push(
      makeObj(
        `AI Engel #${h + 1}`,
        'box',
        'hazard',
        { x: -2.4 + h * 2.2, y: endY + 0.85, z: endZ + 2.2 },
        { x: 1.1, y: 0.85, z: 1.1 },
        '#f43f5e',
      ),
    );
  }

  objects.push(
    makeObj('Zafer Portalı', 'cylinder', 'goal', { x: 0, y: endY + 1.6, z: endZ - 2 }, { x: 1.7, y: 2.4, z: 1.7 }, '#10b981'),
  );

  return {
    objects,
    skyTheme,
    summary: `Prompt üretildi: ${coinsCount} altın, ${botsCount} devriye bot, ${hazardCount} engel${hasBounce ? ', trambolin' : ''}${hasMoving ? ', hareketli platform' : ''}.`,
  };
}

function buildMeshForObject(obj: StageObject3D): THREE.Group {
  const group = new THREE.Group();
  group.userData.objectId = obj.id;
  const role = inferRole(obj);

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(obj.color || ROLE_META[role].defaultColor),
    roughness: obj.roughness ?? 0.42,
    metalness: obj.metalness ?? 0.16,
    emissive: new THREE.Color(
      role === 'goal' || role === 'hazard' || role === 'bounce' || role === 'checkpoint'
        ? obj.color
        : '#000000',
    ),
    emissiveIntensity:
      role === 'goal'
        ? 0.4
        : role === 'bounce' || role === 'checkpoint'
          ? 0.35
          : role === 'hazard'
            ? 0.25
            : obj.emissiveIntensity ?? 0,
  });

  if (obj.kind === 'mannequin' || role === 'player') {
    const bodyGroup = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.68, 6, 12), material);
    torso.position.y = 0.72;
    torso.castShadow = true;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 12),
      new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.3 }),
    );
    head.position.y = 1.44;
    head.castShadow = true;
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.1, 0.16),
      new THREE.MeshStandardMaterial({ color: '#0284c7', emissive: '#38bdf8', emissiveIntensity: 0.8 }),
    );
    visor.position.set(0, 1.46, -0.18);
    bodyGroup.add(torso, head, visor);
    group.add(bodyGroup);
  } else {
    let geom: THREE.BufferGeometry;
    switch (obj.kind) {
      case 'sphere':
        geom = new THREE.SphereGeometry(0.5, 20, 16);
        break;
      case 'cylinder':
        geom = new THREE.CylinderGeometry(0.5, 0.5, 1, 20);
        break;
      case 'cone':
        geom = new THREE.ConeGeometry(0.5, 1, 18);
        break;
      case 'torus':
        geom = new THREE.TorusGeometry(0.42, 0.16, 12, 24);
        break;
      default:
        geom = new THREE.BoxGeometry(1, 1, 1);
        break;
    }
    const mesh = new THREE.Mesh(geom, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  if (role !== 'solid' && role !== 'decor') {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.76, 28),
      new THREE.MeshBasicMaterial({
        color: ROLE_META[role].ringColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.78,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = role === 'player' ? 0.04 : -0.46;
    ring.name = 'role-ring';
    group.add(ring);
  }

  group.position.set(obj.position.x, obj.position.y, obj.position.z);
  group.rotation.set(
    THREE.MathUtils.degToRad(obj.rotation.x),
    THREE.MathUtils.degToRad(obj.rotation.y),
    THREE.MathUtils.degToRad(obj.rotation.z),
  );
  group.scale.set(obj.scale.x, obj.scale.y, obj.scale.z);
  return group;
}

function buildStandaloneHtmlGame(
  projectName: string,
  objects: StageObject3D[],
  cameraMode: CameraViewMode,
  skyTheme: SkyThemeId,
  rules: GameRulesConfig,
): string {
  const sky = SKY_THEMES[skyTheme];
  const payload = JSON.stringify(
    objects.map((o) => ({
      id: o.id,
      name: o.name,
      kind: o.kind,
      role: inferRole(o),
      position: o.position,
      rotation: o.rotation,
      scale: o.scale,
      color: o.color,
      moveSpeed: o.moveSpeed ?? 7.8,
      jumpForce: o.jumpForce ?? 10.6,
      patrolRange: o.patrolRange ?? 3,
      patrolAxis: o.patrolAxis ?? 'x',
      bounceForce: o.bounceForce ?? 18,
    })),
  );
  const cfgJson = JSON.stringify({ cameraMode, sky, rules });

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>${projectName.replace(/</g, '&lt;')} — Alpemox Game Engine v2 Export</title>
<style>
  html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:${sky.bg};font-family:system-ui,-apple-system,sans-serif;color:#f8fafc}
  #hud{position:fixed;top:16px;left:16px;display:flex;gap:14px;background:rgba(15,23,42,.8);backdrop-filter:blur(8px);padding:10px 18px;border-radius:12px;border:1px solid rgba(255,255,255,.14);font-size:14px;z-index:10}
  #banner{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(2,6,23,.76);z-index:20;flex-direction:column;gap:14px}
  #banner.show{display:flex}
  button{background:#38bdf8;color:#020617;border:0;padding:10px 20px;border-radius:10px;font-weight:700;cursor:pointer}
  #hint{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,.74);padding:8px 16px;border-radius:999px;font-size:12px;color:#cbd5e1;border:1px solid rgba(255,255,255,.12)}
</style>
</head>
<body>
<div id="hud"><span>Skor: <b id="score">0</b></span><span>Altın: <b id="coins">0</b></span><span>Can: <b id="hp">3</b></span></div>
<div id="banner"><h1 id="statusText">Oyun Bitti</h1><button onclick="location.reload()">Tekrar Oyna</button></div>
<div id="hint">WASD/Ok: Hareket • Space: Zıpla (2x) • Shift: Dash • F: Ateş • Alpemox Game Engine v2</div>
<script type="module">
import * as THREE from 'https://unpkg.com/three@0.171.0/build/three.module.js';
const LEVEL = ${payload};
const CFG = ${cfgJson};
const scene = new THREE.Scene();
scene.background = new THREE.Color(CFG.sky.bg);
scene.fog = new THREE.Fog(CFG.sky.fog, 22, 68);
const camera = new THREE.PerspectiveCamera(56, innerWidth / innerHeight, 0.1, 180);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
scene.add(new THREE.AmbientLight(CFG.sky.ambient, 0.7));
const dir = new THREE.DirectionalLight(CFG.sky.dir, 1.45);
dir.position.set(12, 22, 10);
dir.castShadow = true;
scene.add(dir);
const grid = new THREE.GridHelper(64, 64, CFG.sky.grid1, CFG.sky.grid2);
grid.position.y = -1;
scene.add(grid);

const solids = [], movings = [], bounces = [], coins = [], hazards = [], npcs = [], checkpoints = [], goals = [];
const particles = [], shots = [];
let playerMesh = null, playerCfg = { moveSpeed: 7.8, jumpForce: 10.6 }, spawnPos = new THREE.Vector3(0, 2, 5);
let yaw = 0;

function spawnBurst(pos, colorHex, count = 12) {
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.14, 0.14),
      new THREE.MeshBasicMaterial({ color: colorHex })
    );
    m.position.copy(pos);
    scene.add(m);
    particles.push({
      mesh: m,
      vel: new THREE.Vector3((Math.random() - 0.5) * 7, Math.random() * 6 + 2, (Math.random() - 0.5) * 7),
      life: 0.55
    });
  }
}

for (const o of LEVEL) {
  const mat = new THREE.MeshStandardMaterial({
    color: o.color || '#38bdf8',
    roughness: 0.42,
    metalness: 0.2,
    emissive: (o.role === 'goal' || o.role === 'bounce' || o.role === 'checkpoint' || o.role === 'hazard') ? o.color : '#000000',
    emissiveIntensity: o.role === 'goal' || o.role === 'bounce' ? 0.35 : 0.15
  });
  let geom;
  if (o.kind === 'sphere') geom = new THREE.SphereGeometry(0.5, 18, 14);
  else if (o.kind === 'cylinder') geom = new THREE.CylinderGeometry(0.5, 0.5, 1, 18);
  else if (o.kind === 'cone') geom = new THREE.ConeGeometry(0.5, 1, 16);
  else if (o.kind === 'torus') geom = new THREE.TorusGeometry(0.42, 0.16, 12, 24);
  else if (o.kind === 'mannequin' || o.role === 'player') geom = new THREE.CapsuleGeometry(0.34, 0.85, 6, 12);
  else geom = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(o.position.x, o.position.y, o.position.z);
  mesh.rotation.set(o.rotation.x * Math.PI / 180, o.rotation.y * Math.PI / 180, o.rotation.z * Math.PI / 180);
  mesh.scale.set(o.scale.x, o.scale.y, o.scale.z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);
  if (o.role === 'player' && !playerMesh) {
    playerMesh = mesh; playerCfg = o; spawnPos.copy(mesh.position);
    if (CFG.cameraMode === 'fps') playerMesh.visible = false;
  } else if (o.role === 'solid') solids.push({ mesh, scale: o.scale });
  else if (o.role === 'moving') movings.push({ mesh, scale: o.scale, base: { ...o.position }, prev: new THREE.Vector3(o.position.x, o.position.y, o.position.z), speed: o.moveSpeed || 2.2, range: o.patrolRange || 3, axis: o.patrolAxis || 'x' });
  else if (o.role === 'bounce') bounces.push({ mesh, force: o.bounceForce || 18, radius: Math.max(o.scale.x, o.scale.z) * 0.55 });
  else if (o.role === 'collectible') coins.push({ mesh, collected: false });
  else if (o.role === 'hazard') hazards.push({ mesh, radius: Math.max(o.scale.x, o.scale.z) * 0.55 });
  else if (o.role === 'checkpoint') checkpoints.push({ mesh, active: false });
  else if (o.role === 'npc') npcs.push({ mesh, baseX: o.position.x, speed: o.moveSpeed || 2.5, range: o.patrolRange || 3, alive: true });
  else if (o.role === 'goal') goals.push({ mesh });
}
if (!playerMesh) {
  playerMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.8, 6, 12), new THREE.MeshStandardMaterial({ color: '#38bdf8' }));
  playerMesh.position.copy(spawnPos);
  scene.add(playerMesh);
}
const keys = {};
let jumpQueued = false, dashTimer = 0, dashCd = 0, shootCd = 0;
addEventListener('keydown', (e) => {
  if ((e.code === 'Space') && !keys['Space']) jumpQueued = true;
  keys[e.code] = true;
  if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && CFG.rules.dashEnabled && dashCd <= 0) {
    dashTimer = 0.18; dashCd = 1.0; spawnBurst(playerMesh.position, '#38bdf8', 8);
  }
  if (e.code === 'KeyF' && CFG.rules.shooterEnabled && shootCd <= 0) {
    shootCd = 0.25;
    const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), new THREE.MeshBasicMaterial({ color: '#38bdf8' }));
    bolt.position.set(playerMesh.position.x, playerMesh.position.y + 0.9, playerMesh.position.z);
    scene.add(bolt);
    shots.push({ mesh: bolt, dir: new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), life: 1.5 });
  }
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

let vy = 0, grounded = false, jumpsUsed = 0, score = 0, collectedCount = 0, hp = 3, over = false, invuln = 0, elapsed = 0;
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  elapsed += dt;
  for (const c of coins) if (!c.collected) c.mesh.rotation.y += dt * 2.6;
  for (const g of goals) g.mesh.rotation.y += dt * 1.2;
  for (const m of movings) {
    m.prev.copy(m.mesh.position);
    const offset = Math.sin(elapsed * m.speed * 0.8) * m.range;
    m.mesh.position.x = m.base.x + (m.axis === 'x' ? offset : 0);
    m.mesh.position.y = m.base.y + (m.axis === 'y' ? offset : 0);
    m.mesh.position.z = m.base.z + (m.axis === 'z' ? offset : 0);
  }
  for (const n of npcs) if (n.alive) n.mesh.position.x = n.baseX + Math.sin(elapsed * n.speed * 0.7) * n.range;

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.life -= dt;
    p.vel.y -= 14 * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.scale.setScalar(Math.max(0.01, p.life * 1.8));
    if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); }
  }
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i]; s.life -= dt;
    s.mesh.position.addScaledVector(s.dir, 22 * dt);
    let hit = false;
    for (const n of npcs) {
      if (n.alive && s.mesh.position.distanceTo(n.mesh.position) < 1.1) {
        n.alive = false; n.mesh.visible = false; hit = true; score += 150; spawnBurst(n.mesh.position, '#a855f7', 16);
      }
    }
    if (hit || s.life <= 0) { scene.remove(s.mesh); shots.splice(i, 1); }
  }

  if (!over) {
    if (dashTimer > 0) dashTimer -= dt;
    if (dashCd > 0) dashCd -= dt;
    if (shootCd > 0) shootCd -= dt;
    let dx = (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) - (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);
    let dz = (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0) - (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0);
    if (dx || dz) {
      const len = Math.hypot(dx, dz);
      const spd = (playerCfg.moveSpeed || 7.8) * (dashTimer > 0 ? 2.4 : 1);
      playerMesh.position.x += (dx / len) * spd * dt;
      playerMesh.position.z += (dz / len) * spd * dt;
      yaw = Math.atan2(-dx, -dz);
      playerMesh.rotation.y = yaw;
    }
    if (jumpQueued) {
      const maxJumps = CFG.rules.doubleJump ? 2 : 1;
      if (grounded || jumpsUsed < maxJumps) {
        vy = playerCfg.jumpForce || 10.6; grounded = false; jumpsUsed++;
        spawnBurst(playerMesh.position, '#38bdf8', 7);
      }
      jumpQueued = false;
    }
    vy -= (CFG.rules.gravity || 22) * dt;
    playerMesh.position.y += vy * dt;
    grounded = false;

    for (const s of [...solids, ...movings]) {
      const hx = s.scale.x * 0.5 + 0.35, hz = s.scale.z * 0.5 + 0.35, top = s.mesh.position.y + s.scale.y * 0.5;
      if (Math.abs(playerMesh.position.x - s.mesh.position.x) < hx && Math.abs(playerMesh.position.z - s.mesh.position.z) < hz) {
        if (playerMesh.position.y <= top + 0.25 && playerMesh.position.y >= top - 1.2 && vy <= 0) {
          playerMesh.position.y = top; vy = 0; grounded = true; jumpsUsed = 0;
          if (s.prev) playerMesh.position.add(new THREE.Vector3().subVectors(s.mesh.position, s.prev));
        }
      }
    }
    for (const b of bounces) {
      if (playerMesh.position.distanceTo(b.mesh.position) < b.radius + 0.5) {
        vy = b.force; grounded = false; jumpsUsed = 1; spawnBurst(b.mesh.position, '#84cc16', 10);
      }
    }
    if (playerMesh.position.y < -12) { hp--; playerMesh.position.copy(spawnPos); vy = 0; }
    for (const c of coins) {
      if (!c.collected && playerMesh.position.distanceTo(c.mesh.position) < 1.35) {
        c.collected = true; c.mesh.visible = false; collectedCount++; score += 100; spawnBurst(c.mesh.position, '#fbbf24', 12);
      }
    }
    for (const cp of checkpoints) {
      if (!cp.active && playerMesh.position.distanceTo(cp.mesh.position) < 1.55) {
        cp.active = true; spawnPos.set(cp.mesh.position.x, cp.mesh.position.y + 0.8, cp.mesh.position.z);
        cp.mesh.material.color.set('#10b981'); spawnBurst(cp.mesh.position, '#10b981', 12);
      }
    }
    if (invuln > 0) invuln -= dt;
    for (const h of hazards) if (invuln <= 0 && playerMesh.position.distanceTo(h.mesh.position) < h.radius + 0.45) { hp--; invuln = 1.1; vy = 6; spawnBurst(playerMesh.position, '#f43f5e', 10); }
    for (const n of npcs) if (n.alive && invuln <= 0 && playerMesh.position.distanceTo(n.mesh.position) < 1.05) { hp--; invuln = 1.1; vy = 6; spawnBurst(playerMesh.position, '#f43f5e', 10); }
    for (const g of goals) {
      if (playerMesh.position.distanceTo(g.mesh.position) < 1.65) {
        if (!CFG.rules.requireAllCoins || collectedCount >= coins.length) {
          over = true;
          document.getElementById('statusText').textContent = 'Bölüm Tamamlandı! Skor: ' + (score + 500);
          document.getElementById('banner').classList.add('show');
        }
      }
    }
    if (hp <= 0 && !over) {
      over = true;
      document.getElementById('statusText').textContent = 'Oyun Bitti! Skor: ' + score;
      document.getElementById('banner').classList.add('show');
    }
    document.getElementById('score').textContent = String(score);
    document.getElementById('coins').textContent = collectedCount + '/' + coins.length;
    document.getElementById('hp').textContent = String(Math.max(0, hp));
  }

  if (CFG.cameraMode === 'fps') {
    camera.position.set(playerMesh.position.x, playerMesh.position.y + 1.35, playerMesh.position.z);
    camera.lookAt(playerMesh.position.x - Math.sin(yaw) * 8, playerMesh.position.y + 1.1, playerMesh.position.z - Math.cos(yaw) * 8);
  } else if (CFG.cameraMode === 'topdown') {
    camera.position.lerp(new THREE.Vector3(playerMesh.position.x, playerMesh.position.y + 15, playerMesh.position.z + 6), 0.1);
    camera.lookAt(playerMesh.position.x, playerMesh.position.y, playerMesh.position.z);
  } else {
    camera.position.lerp(new THREE.Vector3(playerMesh.position.x, playerMesh.position.y + 5.2, playerMesh.position.z + 8.8), 0.09);
    camera.lookAt(playerMesh.position.x, playerMesh.position.y + 0.9, playerMesh.position.z);
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);
</script>
</body>
</html>`;
}

export const GameEngineEditor: React.FC = () => {
  const {
    project,
    selectedObject3DId,
    setSelectedObject3DId,
    add3DObject,
    update3DObject,
    delete3DObject,
    replace3DObjects,
    setViewportMode,
  } = useStudioStore();

  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const transformRef = useRef<TransformControls | null>(null);
  const boxHelperRef = useRef<THREE.BoxHelper | null>(null);
  const lightsRef = useRef<{ ambient: THREE.AmbientLight; dir: THREE.DirectionalLight; grid: THREE.GridHelper } | null>(null);
  const isGizmoDraggingRef = useRef(false);

  const meshMapRef = useRef<Map<string, THREE.Group>>(new Map());
  const keysRef = useRef<Record<string, boolean>>({});
  const particlesRef = useRef<Array<{ mesh: THREE.Mesh; vel: THREE.Vector3; life: number }>>([]);
  const projectilesRef = useRef<Array<{ mesh: THREE.Mesh; dir: THREE.Vector3; life: number }>>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [gizmoMode, setGizmoMode] = useState<GizmoMode>('translate');
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('tps');
  const [skyTheme, setSkyTheme] = useState<SkyThemeId>('cyber');
  const [rightTab, setRightTab] = useState<'entities' | 'rules'>('entities');
  const [aiPrompt, setAiPrompt] = useState('5 altın, hareketli platform, trambolin ve 2 devriye botlu neon parkur');
  const [rules, setRules] = useState<GameRulesConfig>({
    doubleJump: true,
    dashEnabled: true,
    shooterEnabled: true,
    requireAllCoins: false,
    gravity: 22,
  });

  const cameraModeRef = useRef<CameraViewMode>(cameraMode);
  cameraModeRef.current = cameraMode;
  const rulesRef = useRef<GameRulesConfig>(rules);
  rulesRef.current = rules;

  const playStateRef = useRef({
    playing: false,
    score: 0,
    coins: 0,
    totalCoins: 0,
    hp: 3,
    elapsed: 0,
    outcome: 'idle' as 'idle' | 'playing' | 'won' | 'lost',
    vy: 0,
    grounded: false,
    jumpsUsed: 0,
    jumpQueued: false,
    dashTimer: 0,
    dashCd: 0,
    shootCd: 0,
    yaw: 0,
    invuln: 0,
    collectedIds: new Set<string>(),
    defeatedNpcIds: new Set<string>(),
    checkpointIds: new Set<string>(),
    playerId: '' as string,
    playerPos: new THREE.Vector3(0, 1.5, 5),
    spawnPos: new THREE.Vector3(0, 1.5, 5),
    movingPrevPos: new Map<string, THREE.Vector3>(),
  });

  const [hud, setHud] = useState({
    score: 0,
    coins: 0,
    totalCoins: 0,
    hp: 3,
    elapsed: 0,
    outcome: 'idle' as 'idle' | 'playing' | 'won' | 'lost',
  });
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const objects3d = project.objects3d;
  const objectsRef = useRef<StageObject3D[]>(objects3d);
  objectsRef.current = objects3d;

  const selectedObj = useMemo(
    () => objects3d.find((o) => o.id === selectedObject3DId) ?? objects3d[0] ?? null,
    [objects3d, selectedObject3DId],
  );

  const spawnParticleBurst = useCallback((pos: THREE.Vector3, colorHex: string, count = 10) => {
    const scene = sceneRef.current;
    if (!scene) return;
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.14, 0.14),
        new THREE.MeshBasicMaterial({ color: colorHex }),
      );
      m.position.copy(pos);
      scene.add(m);
      particlesRef.current.push({
        mesh: m,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 7.5,
          Math.random() * 6 + 2,
          (Math.random() - 0.5) * 7.5,
        ),
        life: 0.55,
      });
    }
  }, []);

  const fireProjectile = useCallback(() => {
    const ps = playStateRef.current;
    const scene = sceneRef.current;
    if (!ps.playing || ps.outcome !== 'playing' || !scene || !rulesRef.current.shooterEnabled || ps.shootCd > 0) {
      return;
    }
    ps.shootCd = 0.25;
    const bolt = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 10),
      new THREE.MeshBasicMaterial({ color: '#38bdf8' }),
    );
    bolt.position.set(ps.playerPos.x, ps.playerPos.y + 0.95, ps.playerPos.z);
    scene.add(bolt);
    projectilesRef.current.push({
      mesh: bolt,
      dir: new THREE.Vector3(-Math.sin(ps.yaw), 0, -Math.cos(ps.yaw)).normalize(),
      life: 1.4,
    });
    playSynthTone('shoot');
  }, []);

  const triggerDash = useCallback(() => {
    const ps = playStateRef.current;
    if (!ps.playing || ps.outcome !== 'playing' || !rulesRef.current.dashEnabled || ps.dashCd > 0) {
      return;
    }
    ps.dashTimer = 0.18;
    ps.dashCd = 0.95;
    spawnParticleBurst(ps.playerPos, '#38bdf8', 9);
    playSynthTone('dash');
  }, [spawnParticleBurst]);

  const rebuildSceneObjects = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    transformRef.current?.detach();
    if (boxHelperRef.current) {
      scene.remove(boxHelperRef.current);
      boxHelperRef.current = null;
    }

    for (const p of particlesRef.current) scene.remove(p.mesh);
    particlesRef.current = [];
    for (const s of projectilesRef.current) scene.remove(s.mesh);
    projectilesRef.current = [];

    meshMapRef.current.forEach((grp) => {
      scene.remove(grp);
    });
    meshMapRef.current.clear();

    for (const obj of objectsRef.current) {
      if (!obj.visible) continue;
      const grp = buildMeshForObject(obj);
      scene.add(grp);
      meshMapRef.current.set(obj.id, grp);
    }
  }, []);

  // Sync Sky Theme
  useEffect(() => {
    const scene = sceneRef.current;
    const lights = lightsRef.current;
    if (!scene || !lights) return;
    const sky = SKY_THEMES[skyTheme];
    scene.background = new THREE.Color(sky.bg);
    scene.fog = new THREE.Fog(sky.fog, 24, 72);
    lights.ambient.color.set(sky.ambient);
    lights.dir.color.set(sky.dir);
  }, [skyTheme]);

  // Sync TransformControls gizmo attachment & BoxHelper in edit mode
  useEffect(() => {
    const scene = sceneRef.current;
    const tControls = transformRef.current;
    if (!scene || !tControls) return;

    if (boxHelperRef.current) {
      scene.remove(boxHelperRef.current);
      boxHelperRef.current = null;
    }

    if (isPlaying || !selectedObj) {
      tControls.detach();
      return;
    }

    const mesh = meshMapRef.current.get(selectedObj.id);
    if (mesh) {
      tControls.setMode(gizmoMode);
      tControls.attach(mesh);
      const helper = new THREE.BoxHelper(mesh, 0x38bdf8);
      scene.add(helper);
      boxHelperRef.current = helper;
    } else {
      tControls.detach();
    }
  }, [selectedObj, gizmoMode, isPlaying, objects3d]);

  // Initialize Three.js viewport + TransformControls
  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    const sky = SKY_THEMES[skyTheme];
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(sky.bg);
    scene.fog = new THREE.Fog(sky.fog, 24, 72);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      52,
      Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight),
      0.1,
      220,
    );
    camera.position.set(11, 8.5, 15);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.shadowMap.enabled = true;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1.5, -2);
    controlsRef.current = controls;

    // Three.js TransformControls Gizmo (from PlayCanvas/Three.js Editor pattern)
    const tControls = new TransformControls(camera, renderer.domElement);
    tControls.setSize(1.05);
    tControls.addEventListener('dragging-changed', (ev) => {
      const dragging = Boolean(ev.value);
      isGizmoDraggingRef.current = dragging;
      controls.enabled = !dragging;
      if (!dragging) {
        const attached = tControls.object;
        const objId = attached?.userData?.objectId as string | undefined;
        if (attached && objId) {
          update3DObject(objId, {
            position: {
              x: +attached.position.x.toFixed(2),
              y: +attached.position.y.toFixed(2),
              z: +attached.position.z.toFixed(2),
            },
            rotation: {
              x: +THREE.MathUtils.radToDeg(attached.rotation.x).toFixed(1),
              y: +THREE.MathUtils.radToDeg(attached.rotation.y).toFixed(1),
              z: +THREE.MathUtils.radToDeg(attached.rotation.z).toFixed(1),
            },
            scale: {
              x: +Math.max(0.15, attached.scale.x).toFixed(2),
              y: +Math.max(0.15, attached.scale.y).toFixed(2),
              z: +Math.max(0.15, attached.scale.z).toFixed(2),
            },
          });
        }
      }
    });
    tControls.addEventListener('objectChange', () => {
      boxHelperRef.current?.update();
    });
    scene.add(tControls.getHelper());
    transformRef.current = tControls;

    const ambient = new THREE.AmbientLight(sky.ambient, 0.72);
    const dirLight = new THREE.DirectionalLight(sky.dir, 1.45);
    dirLight.position.set(12, 22, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(ambient, dirLight);

    const grid = new THREE.GridHelper(64, 64, sky.grid1, sky.grid2);
    grid.position.y = -1;
    scene.add(grid);
    lightsRef.current = { ambient, dir: dirLight, grid };

    // Raycast click-to-select in Edit Mode (respecting gizmo drag)
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    const onPointerDown = (ev: PointerEvent) => {
      downX = ev.clientX;
      downY = ev.clientY;
    };
    const onPointerUp = (ev: PointerEvent) => {
      if (playStateRef.current.playing) return;
      if (isGizmoDraggingRef.current || tControls.axis !== null) return;
      if (Math.hypot(ev.clientX - downX, ev.clientY - downY) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const roots = Array.from(meshMapRef.current.values());
      const hits = raycaster.intersectObjects(roots, true);
      if (hits.length > 0) {
        let cur: THREE.Object3D | null = hits[0].object;
        while (cur && !cur.userData.objectId) cur = cur.parent;
        if (cur?.userData.objectId) {
          setSelectedObject3DId(cur.userData.objectId as string);
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    rebuildSceneObjects();

    const resizeObserver = new ResizeObserver(() => {
      if (!host) return;
      const w = Math.max(1, host.clientWidth);
      const h = Math.max(1, host.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(host);

    let rafId = 0;
    let lastTime = performance.now();
    let lastHudSync = 0;

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const ps = playStateRef.current;
      const list = objectsRef.current;
      const curRules = rulesRef.current;

      // Update 3D particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.life -= dt;
        p.vel.y -= 15 * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.scale.setScalar(Math.max(0.01, p.life * 1.8));
        if (p.life <= 0) {
          scene.remove(p.mesh);
          particlesRef.current.splice(i, 1);
        }
      }

      // Spin coins & portals gently
      for (const obj of list) {
        const grp = meshMapRef.current.get(obj.id);
        if (!grp) continue;
        const role = inferRole(obj);
        if (role === 'collectible') grp.rotation.y += dt * 2.5;
        else if (role === 'goal' || role === 'checkpoint') grp.rotation.y += dt * 1.2;
      }

      if (ps.playing && ps.outcome === 'playing') {
        ps.elapsed += dt;
        if (ps.dashTimer > 0) ps.dashTimer -= dt;
        if (ps.dashCd > 0) ps.dashCd -= dt;
        if (ps.shootCd > 0) ps.shootCd -= dt;

        // Moving platforms update + store previous position for rider delta
        for (const obj of list) {
          if (inferRole(obj) !== 'moving') continue;
          const grp = meshMapRef.current.get(obj.id);
          if (!grp) continue;
          ps.movingPrevPos.set(obj.id, grp.position.clone());
          const speed = obj.moveSpeed ?? 2.2;
          const range = obj.patrolRange ?? 3.2;
          const axis = obj.patrolAxis ?? 'x';
          const offset = Math.sin(ps.elapsed * speed * 0.85) * range;
          grp.position.x = obj.position.x + (axis === 'x' ? offset : 0);
          grp.position.y = obj.position.y + (axis === 'y' ? offset : 0);
          grp.position.z = obj.position.z + (axis === 'z' ? offset : 0);
        }

        // NPC patrol movement
        for (const obj of list) {
          if (inferRole(obj) !== 'npc' || ps.defeatedNpcIds.has(obj.id)) continue;
          const grp = meshMapRef.current.get(obj.id);
          if (!grp) continue;
          const range = obj.patrolRange ?? 2.8;
          const speed = obj.moveSpeed ?? 2.6;
          grp.position.x = obj.position.x + Math.sin(ps.elapsed * speed * 0.7) * range;
        }

        // Player energy projectiles vs NPCs
        for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
          const proj = projectilesRef.current[i];
          proj.life -= dt;
          proj.mesh.position.addScaledVector(proj.dir, 22 * dt);
          let hit = false;
          for (const obj of list) {
            if (inferRole(obj) !== 'npc' || ps.defeatedNpcIds.has(obj.id)) continue;
            const grp = meshMapRef.current.get(obj.id);
            if (!grp) continue;
            if (proj.mesh.position.distanceTo(grp.position) < 1.15) {
              ps.defeatedNpcIds.add(obj.id);
              grp.visible = false;
              ps.score += 150;
              hit = true;
              spawnParticleBurst(grp.position, '#a855f7', 16);
              playSynthTone('coin');
              break;
            }
          }
          if (hit || proj.life <= 0) {
            scene.remove(proj.mesh);
            projectilesRef.current.splice(i, 1);
          }
        }

        const playerCfg = list.find((o) => o.id === ps.playerId);
        const playerGrp = meshMapRef.current.get(ps.playerId);
        if (playerGrp) {
          playerGrp.visible = cameraModeRef.current !== 'fps';

          const k = keysRef.current;
          const dx =
            (k['KeyD'] || k['ArrowRight'] || k['PadRight'] ? 1 : 0) -
            (k['KeyA'] || k['ArrowLeft'] || k['PadLeft'] ? 1 : 0);
          const dz =
            (k['KeyS'] || k['ArrowDown'] || k['PadDown'] ? 1 : 0) -
            (k['KeyW'] || k['ArrowUp'] || k['PadUp'] ? 1 : 0);

          const baseSpeed = playerCfg?.moveSpeed ?? 7.8;
          const moveSpeed = baseSpeed * (ps.dashTimer > 0 ? 2.4 : 1);
          const jumpForce = playerCfg?.jumpForce ?? 10.6;

          if (dx !== 0 || dz !== 0) {
            const len = Math.hypot(dx, dz);
            ps.playerPos.x += (dx / len) * moveSpeed * dt;
            ps.playerPos.z += (dz / len) * moveSpeed * dt;
            ps.yaw = Math.atan2(-dx, -dz);
            playerGrp.rotation.y = ps.yaw;
          }

          if (ps.jumpQueued || k['PadJump']) {
            const maxJumps = curRules.doubleJump ? 2 : 1;
            if (ps.grounded || ps.jumpsUsed < maxJumps) {
              ps.vy = jumpForce;
              ps.grounded = false;
              ps.jumpsUsed += 1;
              spawnParticleBurst(ps.playerPos, '#38bdf8', 7);
              playSynthTone('jump');
            }
            ps.jumpQueued = false;
            k['PadJump'] = false;
          }

          ps.vy -= curRules.gravity * dt;
          ps.playerPos.y += ps.vy * dt;
          ps.grounded = false;

          // Solid & Moving platform AABB landing
          for (const obj of list) {
            if (!obj.visible) continue;
            const role = inferRole(obj);
            if (role !== 'solid' && role !== 'moving') continue;
            const grp = meshMapRef.current.get(obj.id);
            const px = grp ? grp.position.x : obj.position.x;
            const py = grp ? grp.position.y : obj.position.y;
            const pz = grp ? grp.position.z : obj.position.z;
            const hx = Math.abs(obj.scale.x) * 0.5 + 0.36;
            const hz = Math.abs(obj.scale.z) * 0.5 + 0.36;
            const top = py + Math.abs(obj.scale.y) * 0.5;
            if (Math.abs(ps.playerPos.x - px) < hx && Math.abs(ps.playerPos.z - pz) < hz) {
              if (ps.playerPos.y <= top + 0.28 && ps.playerPos.y >= top - 1.25 && ps.vy <= 0) {
                ps.playerPos.y = top;
                ps.vy = 0;
                ps.grounded = true;
                ps.jumpsUsed = 0;
                if (role === 'moving' && grp) {
                  const prev = ps.movingPrevPos.get(obj.id);
                  if (prev) {
                    ps.playerPos.add(new THREE.Vector3().subVectors(grp.position, prev));
                  }
                }
              }
            }
          }

          // Bounce pads
          for (const obj of list) {
            if (!obj.visible || inferRole(obj) !== 'bounce') continue;
            const grp = meshMapRef.current.get(obj.id);
            if (!grp) continue;
            const hitDist = Math.max(Math.abs(obj.scale.x), Math.abs(obj.scale.z)) * 0.5 + 0.45;
            if (ps.playerPos.distanceTo(grp.position) < hitDist) {
              ps.vy = obj.bounceForce ?? 18;
              ps.grounded = false;
              ps.jumpsUsed = 1;
              spawnParticleBurst(grp.position, '#84cc16', 12);
              playSynthTone('bounce');
            }
          }

          // Out of bounds respawn to last checkpoint
          if (ps.playerPos.y < -12) {
            ps.hp -= 1;
            ps.playerPos.copy(ps.spawnPos);
            ps.vy = 0;
            playSynthTone('hit');
          }

          // Collectibles
          for (const obj of list) {
            if (!obj.visible || inferRole(obj) !== 'collectible') continue;
            if (ps.collectedIds.has(obj.id)) continue;
            const grp = meshMapRef.current.get(obj.id);
            if (!grp) continue;
            if (ps.playerPos.distanceTo(grp.position) < 1.35) {
              ps.collectedIds.add(obj.id);
              grp.visible = false;
              ps.coins += 1;
              ps.score += 100;
              spawnParticleBurst(grp.position, '#fbbf24', 12);
              playSynthTone('coin');
            }
          }

          // Checkpoints
          for (const obj of list) {
            if (!obj.visible || inferRole(obj) !== 'checkpoint') continue;
            if (ps.checkpointIds.has(obj.id)) continue;
            const grp = meshMapRef.current.get(obj.id);
            if (!grp) continue;
            if (ps.playerPos.distanceTo(grp.position) < 1.55) {
              ps.checkpointIds.add(obj.id);
              ps.spawnPos.set(grp.position.x, grp.position.y + 0.9, grp.position.z);
              spawnParticleBurst(grp.position, '#2dd4bf', 14);
              playSynthTone('checkpoint');
            }
          }

          // Hazards & NPCs
          if (ps.invuln > 0) ps.invuln -= dt;
          for (const obj of list) {
            if (!obj.visible) continue;
            const role = inferRole(obj);
            if (role === 'npc' && ps.defeatedNpcIds.has(obj.id)) continue;
            if (role !== 'hazard' && role !== 'npc') continue;
            const grp = meshMapRef.current.get(obj.id);
            if (!grp) continue;
            const hitRadius = Math.max(Math.abs(obj.scale.x), Math.abs(obj.scale.z)) * 0.5 + 0.4;
            if (ps.invuln <= 0 && ps.playerPos.distanceTo(grp.position) < hitRadius) {
              ps.hp -= 1;
              ps.invuln = 1.1;
              ps.vy = 6.2;
              spawnParticleBurst(ps.playerPos, '#f43f5e', 10);
              playSynthTone('hit');
            }
          }

          // Goal portal check (optionally requires all coins)
          for (const obj of list) {
            if (!obj.visible || inferRole(obj) !== 'goal') continue;
            const grp = meshMapRef.current.get(obj.id);
            if (!grp) continue;
            if (ps.playerPos.distanceTo(grp.position) < 1.65) {
              if (!curRules.requireAllCoins || ps.coins >= ps.totalCoins) {
                ps.outcome = 'won';
                ps.score += 500;
                spawnParticleBurst(grp.position, '#10b981', 22);
                playSynthTone('win');
              }
            }
          }

          if (ps.hp <= 0 && ps.outcome === 'playing') {
            ps.hp = 0;
            ps.outcome = 'lost';
          }

          playerGrp.position.copy(ps.playerPos);

          // Camera Modes: TPS / Top-Down / FPS
          const camMode = cameraModeRef.current;
          if (camMode === 'fps') {
            camera.position.set(ps.playerPos.x, ps.playerPos.y + 1.38, ps.playerPos.z);
            controls.target.set(
              ps.playerPos.x - Math.sin(ps.yaw) * 8,
              ps.playerPos.y + 1.2,
              ps.playerPos.z - Math.cos(ps.yaw) * 8,
            );
            controls.update();
          } else if (camMode === 'topdown') {
            camera.position.lerp(
              new THREE.Vector3(ps.playerPos.x, ps.playerPos.y + 15.5, ps.playerPos.z + 6),
              0.12,
            );
            controls.target.lerp(new THREE.Vector3(ps.playerPos.x, ps.playerPos.y, ps.playerPos.z), 0.16);
            controls.update();
          } else {
            const desiredCam = new THREE.Vector3(ps.playerPos.x, ps.playerPos.y + 5.2, ps.playerPos.z + 8.8);
            camera.position.lerp(desiredCam, 0.1);
            controls.target.lerp(new THREE.Vector3(ps.playerPos.x, ps.playerPos.y + 1, ps.playerPos.z), 0.14);
            controls.update();
          }
        }

        if (now - lastHudSync > 80) {
          lastHudSync = now;
          setHud({
            score: ps.score,
            coins: ps.coins,
            totalCoins: ps.totalCoins,
            hp: ps.hp,
            elapsed: ps.elapsed,
            outcome: ps.outcome,
          });
        }
      } else {
        controls.update();
      }

      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      tControls.dispose();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
      meshMapRef.current.clear();
      sceneRef.current = null;
      transformRef.current = null;
    };
  }, [rebuildSceneObjects, setSelectedObject3DId, skyTheme, spawnParticleBurst, update3DObject]);

  // Rebuild meshes when store objects change in edit mode
  useEffect(() => {
    if (!isPlaying) {
      rebuildSceneObjects();
    }
  }, [objects3d, isPlaying, rebuildSceneObjects]);

  // Keyboard listeners: Edit shortcuts (W/E/R gizmo) + Playtest movement/Dash/Shoot
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      if (!playStateRef.current.playing) {
        if (e.code === 'KeyT') setGizmoMode('translate');
        else if (e.code === 'KeyR') setGizmoMode('rotate');
        else if (e.code === 'KeyS' && e.shiftKey) setGizmoMode('scale');
        return;
      }

      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'Space' && !keysRef.current['Space']) {
        playStateRef.current.jumpQueued = true;
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        triggerDash();
      }
      if (e.code === 'KeyF') {
        fireProjectile();
      }
      keysRef.current[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [fireProjectile, triggerDash]);

  const stopPlaytest = useCallback(() => {
    playStateRef.current.playing = false;
    playStateRef.current.outcome = 'idle';
    keysRef.current = {};
    setIsPlaying(false);
    setHud((prev) => ({ ...prev, outcome: 'idle' }));
    rebuildSceneObjects();
  }, [rebuildSceneObjects]);

  const startPlaytest = useCallback(() => {
    const list = objectsRef.current;
    const playerObj = list.find((o) => inferRole(o) === 'player');
    if (!playerObj) {
      add3DObject('mannequin', {
        name: 'Oyuncu',
        gameRole: 'player',
        position: { x: 0, y: 1.5, z: 5 },
        color: '#38bdf8',
        pose: clonePose(),
        moveSpeed: 7.8,
        jumpForce: 10.6,
      });
      setStatusNotice('Sahnede oyuncu olmadığı için otomatik Oyuncu eklendi — tekrar Oynat’a basın.');
      return;
    }

    rebuildSceneObjects();
    transformRef.current?.detach();
    if (boxHelperRef.current && sceneRef.current) {
      sceneRef.current.remove(boxHelperRef.current);
      boxHelperRef.current = null;
    }

    const totalCoins = list.filter((o) => o.visible && inferRole(o) === 'collectible').length;
    const spawn = new THREE.Vector3(playerObj.position.x, playerObj.position.y, playerObj.position.z);

    playStateRef.current = {
      playing: true,
      score: 0,
      coins: 0,
      totalCoins,
      hp: 3,
      elapsed: 0,
      outcome: 'playing',
      vy: 0,
      grounded: false,
      jumpsUsed: 0,
      jumpQueued: false,
      dashTimer: 0,
      dashCd: 0,
      shootCd: 0,
      yaw: 0,
      invuln: 0,
      collectedIds: new Set<string>(),
      defeatedNpcIds: new Set<string>(),
      checkpointIds: new Set<string>(),
      playerId: playerObj.id,
      playerPos: spawn.clone(),
      spawnPos: spawn,
      movingPrevPos: new Map<string, THREE.Vector3>(),
    };

    setHud({
      score: 0,
      coins: 0,
      totalCoins,
      hp: 3,
      elapsed: 0,
      outcome: 'playing',
    });
    setIsPlaying(true);
    setStatusNotice(null);
  }, [add3DObject, rebuildSceneObjects]);

  const handleLoadTemplate = (kind: 'platformer' | 'arena' | 'tower') => {
    if (isPlaying) stopPlaytest();
    const items = makeTemplate(kind);
    replace3DObjects(items);
    setSelectedObject3DId(items[0]?.id ?? null);
    setStatusNotice(
      kind === 'platformer'
        ? 'Obby Parkur (Hareketli Köprü + Trambolin + Checkpoint) yüklendi!'
        : kind === 'tower'
          ? 'Dikey Kule şablonu yüklendi. Trambolin ve asansör ile zirveye tırmanın!'
          : 'Savaş Arenası yüklendi. F tuşu ile NPC’leri vurun, altınları toplayın!',
    );
  };

  const handleAiGenerateLevel = () => {
    if (isPlaying) stopPlaytest();
    const result = generateLevelFromPrompt(aiPrompt);
    replace3DObjects(result.objects);
    setSelectedObject3DId(result.objects[0]?.id ?? null);
    if (result.skyTheme) setSkyTheme(result.skyTheme);
    setStatusNotice(result.summary);
  };

  const handleQuickAdd = (role: GameRole) => {
    if (isPlaying) stopPlaytest();
    const offset = ((objects3d.length % 5) - 2) * 1.4;
    if (role === 'player') {
      add3DObject('mannequin', {
        name: 'Yeni Oyuncu',
        gameRole: 'player',
        position: { x: offset, y: 1.5, z: 4 },
        color: '#38bdf8',
        pose: clonePose(),
        moveSpeed: 7.8,
        jumpForce: 10.6,
      });
    } else if (role === 'moving') {
      add3DObject('box', {
        name: `Hareketli Platform ${objects3d.length + 1}`,
        gameRole: 'moving',
        position: { x: offset, y: 1.2, z: -2 },
        scale: { x: 4, y: 0.65, z: 3 },
        color: '#06b6d4',
        moveSpeed: 2.2,
        patrolRange: 3.2,
        patrolAxis: 'x',
      });
    } else if (role === 'bounce') {
      add3DObject('cylinder', {
        name: `Trambolin ${objects3d.length + 1}`,
        gameRole: 'bounce',
        position: { x: offset, y: 0.5, z: 1 },
        scale: { x: 1.6, y: 0.35, z: 1.6 },
        color: '#84cc16',
        bounceForce: 18,
      });
    } else if (role === 'checkpoint') {
      add3DObject('cylinder', {
        name: `Checkpoint ${objects3d.length + 1}`,
        gameRole: 'checkpoint',
        position: { x: offset, y: 1.4, z: -3 },
        scale: { x: 0.85, y: 1.7, z: 0.85 },
        color: '#2dd4bf',
      });
    } else if (role === 'solid') {
      add3DObject('box', {
        name: `Platform ${objects3d.length + 1}`,
        gameRole: 'solid',
        position: { x: offset, y: 0.4, z: 0 },
        scale: { x: 4, y: 0.7, z: 3 },
        color: '#334155',
      });
    } else if (role === 'collectible') {
      add3DObject('torus', {
        name: `Altın ${objects3d.length + 1}`,
        gameRole: 'collectible',
        position: { x: offset, y: 1.6, z: 0 },
        scale: { x: 0.7, y: 0.7, z: 0.7 },
        color: '#fbbf24',
      });
    } else if (role === 'hazard') {
      add3DObject('cone', {
        name: `Engel ${objects3d.length + 1}`,
        gameRole: 'hazard',
        position: { x: offset, y: 0.9, z: -2 },
        scale: { x: 1, y: 1.4, z: 1 },
        color: '#f43f5e',
      });
    } else if (role === 'npc') {
      add3DObject('cone', {
        name: `Devriye NPC ${objects3d.length + 1}`,
        gameRole: 'npc',
        position: { x: offset, y: 1, z: -3 },
        scale: { x: 0.9, y: 1.3, z: 0.9 },
        color: '#a855f7',
        moveSpeed: 2.6,
        patrolRange: 2.5,
      });
    } else if (role === 'goal') {
      add3DObject('cylinder', {
        name: 'Bitiş Portalı',
        gameRole: 'goal',
        position: { x: offset, y: 1.6, z: -6 },
        scale: { x: 1.5, y: 2.2, z: 1.5 },
        color: '#10b981',
      });
    }
  };

  const handleExportHtml = () => {
    const html = buildStandaloneHtmlGame(
      project.name || 'Alpemox Oyunum',
      objects3d,
      cameraMode,
      skyTheme,
      rules,
    );
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const slug = (project.name || 'alpemox-game')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    a.href = url;
    a.download = `${slug || 'alpemox-game'}-playable.html`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusNotice('Tek dosya oynanabilir 3D Web Oyunu (.HTML) indirildi! (Tüm kurallar & kamera dahil)');
  };

  const setVirtualPadKey = (code: string, active: boolean) => {
    keysRef.current[code] = active;
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-[#080b12] text-slate-100 select-none">
      {/* Row 1: Primary Engine Controls, Gizmo Tools, Camera & Sky, Export */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#0d121d] px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
            <Gamepad2 className="h-4 w-4" />
            <span>Alpemox Game v2 ★</span>
          </div>

          {!isPlaying ? (
            <button
              type="button"
              onClick={startPlaytest}
              data-testid="game-play-btn"
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Oynat (Playtest)
            </button>
          ) : (
            <button
              type="button"
              onClick={stopPlaytest}
              data-testid="game-stop-btn"
              className="flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-rose-500/20 hover:bg-rose-400 transition"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              Durdur
            </button>
          )}

          <button
            type="button"
            onClick={() => (isPlaying ? startPlaytest() : rebuildSceneObjects())}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Sıfırla
          </button>

          {/* Transform Gizmo Mode Switcher (PlayCanvas / Godot style) */}
          <div className="flex items-center rounded-lg border border-white/10 bg-slate-900/90 p-0.5">
            {(
              [
                ['translate', 'Taşı', Move],
                ['rotate', 'Döndür', RotateCw],
                ['scale', 'Ölçek', Maximize2],
              ] as const
            ).map(([modeId, label, Icon]) => (
              <button
                key={modeId}
                type="button"
                data-testid={`gizmo-${modeId}-btn`}
                onClick={() => setGizmoMode(modeId)}
                disabled={isPlaying}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition ${
                  gizmoMode === modeId && !isPlaying
                    ? 'bg-sky-500/25 text-sky-300'
                    : 'text-slate-400 hover:text-slate-200 disabled:opacity-40'
                }`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Camera Perspective Selector */}
          <label className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-300">
            <Camera className="h-3.5 w-3.5 text-sky-400" />
            <select
              data-testid="camera-mode-select"
              value={cameraMode}
              onChange={(e) => setCameraMode(e.target.value as CameraViewMode)}
              className="bg-transparent text-xs text-slate-100 focus:outline-none"
            >
              <option value="tps" className="bg-slate-900">
                3. Şahıs (TPS)
              </option>
              <option value="topdown" className="bg-slate-900">
                Kuşbakışı (Top-Down)
              </option>
              <option value="fps" className="bg-slate-900">
                Birinci Şahıs (FPS)
              </option>
            </select>
          </label>

          {/* Sky / Lighting Selector */}
          <label className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-300">
            <Sun className="h-3.5 w-3.5 text-amber-400" />
            <select
              data-testid="sky-theme-select"
              value={skyTheme}
              onChange={(e) => setSkyTheme(e.target.value as SkyThemeId)}
              className="bg-transparent text-xs text-slate-100 focus:outline-none"
            >
              {Object.entries(SKY_THEMES).map(([id, cfg]) => (
                <option key={id} value={id} className="bg-slate-900">
                  {cfg.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleLoadTemplate('platformer')}
            data-testid="template-platformer-btn"
            className="flex items-center gap-1 rounded-lg border border-sky-400/30 bg-sky-500/10 px-2.5 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-500/20"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Obby Parkur
          </button>
          <button
            type="button"
            onClick={() => handleLoadTemplate('arena')}
            data-testid="template-arena-btn"
            className="flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/20"
          >
            <Trophy className="h-3.5 w-3.5" />
            Savaş Arenası
          </button>
          <button
            type="button"
            onClick={() => handleLoadTemplate('tower')}
            data-testid="template-tower-btn"
            className="flex items-center gap-1 rounded-lg border border-lime-400/30 bg-lime-500/10 px-2.5 py-1.5 text-xs font-medium text-lime-200 hover:bg-lime-500/20"
          >
            <Zap className="h-3.5 w-3.5" />
            Dikey Kule
          </button>

          <button
            type="button"
            onClick={() => setViewportMode('3d')}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10"
          >
            <Layers className="h-3.5 w-3.5" />
            3D Stage
          </button>

          <button
            type="button"
            onClick={handleExportHtml}
            data-testid="export-html-game-btn"
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow hover:brightness-110 transition"
          >
            <Download className="h-3.5 w-3.5" />
            Oyunu İndir (.HTML)
          </button>
        </div>
      </div>

      {/* Row 2: Prompt-to-3D-Game Generator + Quick Entity Palette */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#0a0e17] px-3 py-2">
        <div className="flex flex-1 min-w-[280px] max-w-2xl items-center gap-1.5">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-purple-400/30 bg-slate-900/90 px-2.5 py-1">
            <Wand2 className="h-3.5 w-3.5 shrink-0 text-purple-400" />
            <input
              type="text"
              data-testid="ai-level-prompt-input"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAiGenerateLevel();
              }}
              placeholder="Örn: 6 altın, trambolin, hareketli platform ve 2 devriye botlu kule..."
              className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            data-testid="ai-generate-level-btn"
            onClick={handleAiGenerateLevel}
            className="shrink-0 rounded-lg bg-purple-500/20 border border-purple-400/40 px-3 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-500/30 transition"
          >
            Prompt’tan 3D Seviye Üret
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <button type="button" onClick={() => handleQuickAdd('player')} className="flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px] hover:bg-white/10">
            <User className="h-3 w-3 text-sky-400" /> +Oyuncu
          </button>
          <button type="button" onClick={() => handleQuickAdd('solid')} className="flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px] hover:bg-white/10">
            <Box className="h-3 w-3 text-slate-300" /> +Platform
          </button>
          <button type="button" onClick={() => handleQuickAdd('moving')} className="flex items-center gap-1 rounded border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-200 hover:bg-cyan-500/20">
            <Move className="h-3 w-3" /> +Hareketli
          </button>
          <button type="button" onClick={() => handleQuickAdd('bounce')} className="flex items-center gap-1 rounded border border-lime-400/30 bg-lime-500/10 px-2 py-1 text-[11px] text-lime-200 hover:bg-lime-500/20">
            <Zap className="h-3 w-3" /> +Trambolin
          </button>
          <button type="button" onClick={() => handleQuickAdd('collectible')} className="flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px] hover:bg-white/10">
            <Coins className="h-3 w-3 text-amber-400" /> +Altın
          </button>
          <button type="button" onClick={() => handleQuickAdd('checkpoint')} className="flex items-center gap-1 rounded border border-teal-400/30 bg-teal-500/10 px-2 py-1 text-[11px] text-teal-200 hover:bg-teal-500/20">
            <CheckCircle2 className="h-3 w-3" /> +Kayıt
          </button>
          <button type="button" onClick={() => handleQuickAdd('hazard')} className="flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px] hover:bg-white/10">
            <AlertTriangle className="h-3 w-3 text-rose-400" /> +Engel
          </button>
          <button type="button" onClick={() => handleQuickAdd('npc')} className="flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px] hover:bg-white/10">
            <Bot className="h-3 w-3 text-purple-400" /> +NPC
          </button>
          <button type="button" onClick={() => handleQuickAdd('goal')} className="flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px] hover:bg-white/10">
            <Flag className="h-3 w-3 text-emerald-400" /> +Portal
          </button>
        </div>
      </div>

      {/* Main Split: 3D Engine Viewport + Right Entities/Rules Sidebar */}
      <div className="flex flex-1 min-h-0">
        <div className="relative flex-1 min-w-0 bg-[#070a10]">
          <div ref={canvasHostRef} className="h-full w-full" />

          {/* Live Game HUD */}
          <div
            data-testid="game-hud"
            className="pointer-events-none absolute top-4 left-4 flex flex-wrap items-center gap-3 rounded-xl border border-white/15 bg-slate-950/80 px-4 py-2 text-xs backdrop-blur-md shadow-xl"
          >
            <div className="flex items-center gap-1.5 text-sky-300 font-semibold">
              <Trophy className="h-3.5 w-3.5" />
              <span>Skor:</span>
              <span className="font-mono text-sm text-white" data-testid="hud-score">
                {hud.score}
              </span>
            </div>
            <div className="h-3.5 w-px bg-white/15" />
            <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
              <Coins className="h-3.5 w-3.5" />
              <span>Altın:</span>
              <span className="font-mono text-sm text-white" data-testid="hud-coins">
                {hud.coins}/{hud.totalCoins}
              </span>
            </div>
            <div className="h-3.5 w-px bg-white/15" />
            <div className="flex items-center gap-1.5 text-rose-300 font-semibold">
              <Heart className="h-3.5 w-3.5 fill-rose-400/50" />
              <span>Can:</span>
              <span className="font-mono text-sm text-white" data-testid="hud-hp">
                {hud.hp}
              </span>
            </div>
            <div className="h-3.5 w-px bg-white/15" />
            <div className="text-slate-300 font-mono" data-testid="hud-time">
              {hud.elapsed.toFixed(1)}s
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                isPlaying
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                  : 'bg-slate-700/60 text-slate-300'
              }`}
            >
              {isPlaying ? 'PLAYTEST AKTİF' : `EDİTÖR · ${gizmoMode.toUpperCase()}`}
            </span>
          </div>

          {statusNotice && (
            <div className="pointer-events-none absolute top-4 right-4 max-w-sm rounded-xl border border-sky-400/30 bg-slate-900/90 px-3.5 py-2 text-xs text-sky-200 shadow-lg backdrop-blur">
              {statusNotice}
            </div>
          )}

          {isPlaying && (
            <div className="pointer-events-none absolute top-14 left-4 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-1 text-[10px] text-slate-300 backdrop-blur">
              WASD/Ok: Yürü • Space: 2x Zıpla • Shift: Dash • F: Ateş Et
            </div>
          )}

          {/* On-Screen Controls during Playtest (D-Pad + Jump + Dash + Shoot) */}
          {isPlaying && hud.outcome === 'playing' && (
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-2 pointer-events-none">
              <div className="pointer-events-auto grid grid-cols-3 gap-1 rounded-2xl border border-white/15 bg-slate-950/75 p-1.5 backdrop-blur">
                <div />
                <button
                  type="button"
                  data-testid="dpad-up"
                  onMouseDown={() => setVirtualPadKey('PadUp', true)}
                  onMouseUp={() => setVirtualPadKey('PadUp', false)}
                  onMouseLeave={() => setVirtualPadKey('PadUp', false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-sky-500/30 active:bg-sky-500/50"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <div />
                <button
                  type="button"
                  data-testid="dpad-left"
                  onMouseDown={() => setVirtualPadKey('PadLeft', true)}
                  onMouseUp={() => setVirtualPadKey('PadLeft', false)}
                  onMouseLeave={() => setVirtualPadKey('PadLeft', false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-sky-500/30 active:bg-sky-500/50"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  data-testid="dpad-down"
                  onMouseDown={() => setVirtualPadKey('PadDown', true)}
                  onMouseUp={() => setVirtualPadKey('PadDown', false)}
                  onMouseLeave={() => setVirtualPadKey('PadDown', false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-sky-500/30 active:bg-sky-500/50"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  data-testid="dpad-right"
                  onMouseDown={() => setVirtualPadKey('PadRight', true)}
                  onMouseUp={() => setVirtualPadKey('PadRight', false)}
                  onMouseLeave={() => setVirtualPadKey('PadRight', false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-sky-500/30 active:bg-sky-500/50"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="pointer-events-auto flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-testid="dpad-jump"
                  onMouseDown={() => {
                    playStateRef.current.jumpQueued = true;
                  }}
                  className="flex h-11 px-3.5 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/20 text-[11px] font-bold text-emerald-200 backdrop-blur hover:bg-emerald-500/35"
                >
                  ZIPLA (SPACE)
                </button>

                {rules.dashEnabled && (
                  <button
                    type="button"
                    data-testid="dpad-dash"
                    onClick={triggerDash}
                    className="flex h-11 px-3 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-500/20 text-[11px] font-bold text-amber-200 backdrop-blur hover:bg-amber-500/35"
                  >
                    <Zap className="mr-1 h-3.5 w-3.5" /> DASH
                  </button>
                )}

                {rules.shooterEnabled && (
                  <button
                    type="button"
                    data-testid="dpad-shoot"
                    onClick={fireProjectile}
                    className="flex h-11 px-3.5 items-center justify-center rounded-xl border border-sky-400/40 bg-sky-500/20 text-[11px] font-bold text-sky-200 backdrop-blur hover:bg-sky-500/35"
                  >
                    <Crosshair className="mr-1 h-3.5 w-3.5" /> ATEŞ (F)
                  </button>
                )}
              </div>
            </div>
          )}

          {!isPlaying && (
            <div className="pointer-events-none absolute bottom-4 right-4 rounded-lg border border-white/10 bg-slate-950/75 px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur">
              Tıkla: Seç • Gizmo Okları: Taşı (T) / Döndür (R) / Ölçek (Shift+S)
            </div>
          )}

          {isPlaying && (hud.outcome === 'won' || hud.outcome === 'lost') && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/15 bg-[#0f172a] p-7 text-center shadow-2xl">
                <Trophy
                  className={`h-11 w-11 ${
                    hud.outcome === 'won' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                />
                <h3 className="text-xl font-bold text-white">
                  {hud.outcome === 'won' ? 'Bölüm Tamamlandı!' : 'Oyun Bitti'}
                </h3>
                <p className="text-sm text-slate-300">
                  Skor: <span className="font-bold text-sky-300">{hud.score}</span> • Altın:{' '}
                  <span className="font-bold text-amber-300">
                    {hud.coins}/{hud.totalCoins}
                  </span>{' '}
                  • Süre: <span className="font-mono">{hud.elapsed.toFixed(1)}s</span>
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={startPlaytest}
                    className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                  >
                    Tekrar Oyna
                  </button>
                  <button
                    type="button"
                    onClick={stopPlaytest}
                    className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-white/10"
                  >
                    Editöre Dön
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Tabbed Entities + Visual Event Rules Inspector */}
        <aside className="flex w-80 shrink-0 flex-col border-l border-white/10 bg-[#0b0f18]">
          <div className="grid grid-cols-2 border-b border-white/10 bg-[#0d121d] p-1.5 gap-1">
            <button
              type="button"
              onClick={() => setRightTab('entities')}
              className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                rightTab === 'entities'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Varlıklar ({objects3d.length})
            </button>
            <button
              type="button"
              data-testid="rules-tab-btn"
              onClick={() => setRightTab('rules')}
              className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                rightTab === 'rules'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              Olay Kuralları
            </button>
          </div>

          {rightTab === 'entities' ? (
            <>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {objects3d.map((obj) => {
                  const role = inferRole(obj);
                  const meta = ROLE_META[role];
                  const isSelected = selectedObj?.id === obj.id;
                  return (
                    <button
                      key={obj.id}
                      type="button"
                      onClick={() => setSelectedObject3DId(obj.id)}
                      className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left transition ${
                        isSelected
                          ? 'border-sky-400/50 bg-sky-500/15'
                          : 'border-transparent bg-white/[0.02] hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-slate-100">{obj.name}</div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className={`inline-block rounded border px-1.5 py-0.2 text-[10px] ${meta.badge}`}>
                            {meta.label}
                          </span>
                          <span className="text-[10px] text-slate-500">{obj.kind}</span>
                        </div>
                      </div>
                      <span
                        className="h-3 w-3 shrink-0 rounded-full border border-white/20"
                        style={{ backgroundColor: obj.color }}
                      />
                    </button>
                  );
                })}
              </div>

              {selectedObj && (
                <div className="border-t border-white/10 bg-[#0d121d] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">{selectedObj.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(inferRole(selectedObj))}
                        className="rounded p-1 text-sky-400 hover:bg-sky-500/15"
                        title="Benzer Varlık Ekle"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => delete3DObject(selectedObj.id)}
                        className="rounded p-1 text-rose-400 hover:bg-rose-500/15"
                        title="Varlığı Sil"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-slate-400">Oyun Rolü (Game Role)</span>
                    <select
                      value={inferRole(selectedObj)}
                      onChange={(e) =>
                        update3DObject(selectedObj.id, { gameRole: e.target.value as GameRole })
                      }
                      className="w-full rounded-lg border border-white/15 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
                    >
                      {Object.entries(ROLE_META).map(([key, info]) => (
                        <option key={key} value={key}>
                          {info.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid grid-cols-3 gap-1.5">
                    {(['x', 'y', 'z'] as const).map((axis) => (
                      <label key={axis} className="block space-y-0.5">
                        <span className="text-[10px] uppercase text-slate-400">Konum {axis}</span>
                        <input
                          type="number"
                          step="0.5"
                          value={Number(selectedObj.position[axis].toFixed(2))}
                          onChange={(e) =>
                            update3DObject(selectedObj.id, {
                              position: {
                                ...selectedObj.position,
                                [axis]: Number(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-full rounded border border-white/15 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                        />
                      </label>
                    ))}
                  </div>

                  {(inferRole(selectedObj) === 'player' ||
                    inferRole(selectedObj) === 'npc' ||
                    inferRole(selectedObj) === 'moving') && (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block space-y-0.5">
                        <span className="text-[10px] text-slate-400">Hareket Hızı</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="25"
                          value={selectedObj.moveSpeed ?? 5}
                          onChange={(e) =>
                            update3DObject(selectedObj.id, { moveSpeed: Number(e.target.value) || 5 })
                          }
                          className="w-full rounded border border-white/15 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                        />
                      </label>

                      {inferRole(selectedObj) === 'player' ? (
                        <label className="block space-y-0.5">
                          <span className="text-[10px] text-slate-400">Zıplama Gücü</span>
                          <input
                            type="number"
                            step="0.5"
                            min="2"
                            max="25"
                            value={selectedObj.jumpForce ?? 10.6}
                            onChange={(e) =>
                              update3DObject(selectedObj.id, { jumpForce: Number(e.target.value) || 10 })
                            }
                            className="w-full rounded border border-white/15 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                          />
                        </label>
                      ) : (
                        <label className="block space-y-0.5">
                          <span className="text-[10px] text-slate-400">Hareket Mesafesi</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            max="18"
                            value={selectedObj.patrolRange ?? 3}
                            onChange={(e) =>
                              update3DObject(selectedObj.id, { patrolRange: Number(e.target.value) || 3 })
                            }
                            className="w-full rounded border border-white/15 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                          />
                        </label>
                      )}
                    </div>
                  )}

                  {inferRole(selectedObj) === 'moving' && (
                    <label className="block space-y-0.5">
                      <span className="text-[10px] text-slate-400">Platform Ekseni</span>
                      <select
                        value={selectedObj.patrolAxis ?? 'x'}
                        onChange={(e) =>
                          update3DObject(selectedObj.id, {
                            patrolAxis: e.target.value as 'x' | 'y' | 'z',
                          })
                        }
                        className="w-full rounded border border-white/15 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                      >
                        <option value="x">Yatay (X Ekseni)</option>
                        <option value="y">Asansör (Y Ekseni)</option>
                        <option value="z">İleri/Geri (Z Ekseni)</option>
                      </select>
                    </label>
                  )}

                  {inferRole(selectedObj) === 'bounce' && (
                    <label className="block space-y-0.5">
                      <span className="text-[10px] text-slate-400">Trambolin İtme Gücü</span>
                      <input
                        type="number"
                        step="1"
                        min="8"
                        max="35"
                        value={selectedObj.bounceForce ?? 18}
                        onChange={(e) =>
                          update3DObject(selectedObj.id, { bounceForce: Number(e.target.value) || 18 })
                        }
                        className="w-full rounded border border-white/15 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                      />
                    </label>
                  )}

                  <label className="flex items-center justify-between text-[11px] text-slate-300">
                    <span>Renk</span>
                    <input
                      type="color"
                      value={selectedObj.color}
                      onChange={(e) => update3DObject(selectedObj.id, { color: e.target.value })}
                      className="h-6 w-12 cursor-pointer rounded border border-white/20 bg-transparent"
                    />
                  </label>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
              <div className="rounded-xl border border-purple-400/25 bg-purple-500/10 p-3">
                <div className="font-bold text-purple-200">Kodsuz Olay Kuralları (GDevelop Tarzı)</div>
                <p className="mt-1 text-[11px] text-slate-300">
                  EĞER → YAP kuralları hem canlı Playtest’te hem indirilen .HTML oyununda geçerlidir.
                </p>
              </div>

              {(
                [
                  [
                    'doubleJump',
                    'Havada Space → Çift Zıplama (2x)',
                    'Oyuncu havadayken bir kez daha zıplar + partikül saçar.',
                  ],
                  [
                    'dashEnabled',
                    'Shift Basılırsa → Hızlı Atılım (Dash)',
                    'Kısa süreliğine 2.4x hız patlaması + ses efekti.',
                  ],
                  [
                    'shooterEnabled',
                    'F / ATEŞ → Enerji Topu Fırlat',
                    'NPC düşmanları vurarak +150 skorla yok eder.',
                  ],
                  [
                    'requireAllCoins',
                    'Kilitli Portal Kuralı',
                    'Tüm altınlar toplanmadan Bitiş Portalı zafer vermez.',
                  ],
                ] as const
              ).map(([key, title, desc]) => (
                <label
                  key={key}
                  className="flex items-start justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 cursor-pointer hover:bg-white/[0.06]"
                >
                  <div>
                    <div className="font-semibold text-slate-100">{title}</div>
                    <div className="mt-0.5 text-[11px] text-slate-400">{desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={rules[key]}
                    onChange={(e) => setRules((prev) => ({ ...prev, [key]: e.target.checked }))}
                    className="mt-1 h-4 w-4 accent-sky-400"
                  />
                </label>
              ))}

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-100">Dünya Yerçekimi</span>
                  <span className="font-mono text-sky-300">{rules.gravity} m/s²</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="36"
                  step="1"
                  value={rules.gravity}
                  onChange={(e) => setRules((prev) => ({ ...prev, gravity: Number(e.target.value) }))}
                  className="w-full accent-sky-400"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <button type="button" onClick={() => setRules((p) => ({ ...p, gravity: 12 }))} className="hover:text-sky-300">
                    Ay (12)
                  </button>
                  <button type="button" onClick={() => setRules((p) => ({ ...p, gravity: 22 }))} className="hover:text-sky-300">
                    Normal (22)
                  </button>
                  <button type="button" onClick={() => setRules((p) => ({ ...p, gravity: 32 }))} className="hover:text-sky-300">
                    Ağır (32)
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
