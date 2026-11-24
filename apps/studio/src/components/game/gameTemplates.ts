import { clonePose, type GameRole, type StageObject3D } from '@opencraft/shared';

export type CameraViewMode = 'tps' | 'topdown' | 'fps';
export type SkyThemeId = 'cyber' | 'sunset' | 'neon' | 'sky';
export type GizmoMode = 'translate' | 'rotate' | 'scale';

export interface GameRulesConfig {
  doubleJump: boolean;
  dashEnabled: boolean;
  shooterEnabled: boolean;
  requireAllCoins: boolean;
  gravity: number;
}

export const SKY_THEMES: Record<
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

export const ROLE_META: Record<
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
  powerup: {
    label: 'Power-Up (Kalkan/Mıknatıs)',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40',
    ringColor: '#818cf8',
    defaultColor: '#6366f1',
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
    label: 'Düşman Bot (AI)',
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

export function inferRole(obj: StageObject3D): GameRole {
  if (obj.gameRole) return obj.gameRole;
  if (obj.kind === 'mannequin') return 'player';
  if (obj.kind === 'torus') return 'collectible';
  return 'solid';
}

export function makeGameObject(
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
    metalness: gameRole === 'collectible' || gameRole === 'goal' || gameRole === 'powerup' ? 0.55 : 0.14,
    emissiveIntensity:
      gameRole === 'goal' ||
      gameRole === 'hazard' ||
      gameRole === 'bounce' ||
      gameRole === 'checkpoint' ||
      gameRole === 'powerup'
        ? 0.38
        : 0,
    gameRole,
    ...extra,
  };
}

export function makeTemplate(kind: 'platformer' | 'arena' | 'tower' | 'space'): StageObject3D[] {
  if (kind === 'platformer') {
    return [
      makeGameObject('Kahraman Oyuncu', 'mannequin', 'player', { x: 0, y: 1.6, z: 7 }, { x: 1, y: 1, z: 1 }, '#38bdf8', {
        pose: clonePose(),
        moveSpeed: 7.8,
        jumpForce: 10.6,
      }),
      makeGameObject('Başlangıç Zemini', 'box', 'solid', { x: 0, y: -0.5, z: 6.5 }, { x: 7, y: 1, z: 7 }, '#1e293b'),
      makeGameObject('Kalkan + Mıknatıs Paketi', 'sphere', 'powerup', { x: 1.8, y: 1.2, z: 4.5 }, { x: 0.85, y: 0.85, z: 0.85 }, '#6366f1', {
        powerupType: 'magnet',
      }),
      makeGameObject('Basamak 1', 'box', 'solid', { x: 0, y: 0.6, z: 1.2 }, { x: 4.5, y: 0.7, z: 3.2 }, '#334155'),
      makeGameObject('Trambolin Pad', 'cylinder', 'bounce', { x: 0, y: 1.1, z: 0.2 }, { x: 1.6, y: 0.35, z: 1.6 }, '#84cc16', {
        bounceForce: 17.5,
      }),
      makeGameObject('Hareketli Köprü', 'box', 'moving', { x: 0, y: 2.3, z: -4.2 }, { x: 4.2, y: 0.65, z: 3 }, '#06b6d4', {
        moveSpeed: 2.2,
        patrolRange: 3.4,
        patrolAxis: 'x',
      }),
      makeGameObject('Orta Ada & Checkpoint', 'box', 'solid', { x: 0, y: 2.5, z: -9.5 }, { x: 6, y: 0.8, z: 4.8 }, '#334155'),
      makeGameObject('Ara Kayıt Bayrağı', 'cylinder', 'checkpoint', { x: -1.8, y: 3.8, z: -9.5 }, { x: 0.9, y: 1.8, z: 0.9 }, '#2dd4bf'),
      makeGameObject('Bitiş Kalesi', 'box', 'solid', { x: 0, y: 3.4, z: -15.5 }, { x: 7, y: 0.9, z: 6 }, '#1e293b'),
      makeGameObject('Altın #1', 'torus', 'collectible', { x: 0, y: 1.8, z: 1.5 }, { x: 0.7, y: 0.7, z: 0.7 }, '#fbbf24'),
      makeGameObject('Altın #2 (Hava)', 'torus', 'collectible', { x: 0, y: 4.8, z: -2.2 }, { x: 0.75, y: 0.75, z: 0.75 }, '#fbbf24'),
      makeGameObject('Altın #3', 'torus', 'collectible', { x: 1.4, y: 4.6, z: -14.2 }, { x: 0.7, y: 0.7, z: 0.7 }, '#fbbf24'),
      makeGameObject('Lazer Engeli', 'box', 'hazard', { x: -1.4, y: 4.2, z: -14.5 }, { x: 1.4, y: 0.8, z: 1.2 }, '#f43f5e'),
      makeGameObject('Takipçi Muhafız', 'cone', 'npc', { x: 0, y: 3.6, z: -9.5 }, { x: 0.9, y: 1.3, z: 0.9 }, '#a855f7', {
        moveSpeed: 2.9,
        patrolRange: 2.3,
        npcBehavior: 'chase',
      }),
      makeGameObject('Zafer Portalı', 'cylinder', 'goal', { x: 0, y: 5, z: -16.8 }, { x: 1.6, y: 2.3, z: 1.6 }, '#10b981'),
    ];
  }

  if (kind === 'tower') {
    return [
      makeGameObject('Kule Tırmanıcısı', 'mannequin', 'player', { x: 0, y: 1.4, z: 5.5 }, { x: 1, y: 1, z: 1 }, '#38bdf8', {
        pose: clonePose(),
        moveSpeed: 8.0,
        jumpForce: 11.2,
      }),
      makeGameObject('Kule Tabanı', 'box', 'solid', { x: 0, y: -0.5, z: 0 }, { x: 14, y: 1, z: 14 }, '#1e293b'),
      makeGameObject('Hız & Kalkan Kristali', 'sphere', 'powerup', { x: -2.2, y: 0.9, z: 3.2 }, { x: 0.85, y: 0.85, z: 0.85 }, '#6366f1', {
        powerupType: 'shield',
      }),
      makeGameObject('Kat 1 Trambolin', 'cylinder', 'bounce', { x: 3.8, y: 0.25, z: 2.8 }, { x: 1.8, y: 0.4, z: 1.8 }, '#84cc16', {
        bounceForce: 19,
      }),
      makeGameObject('Kat 2 Balkonu', 'box', 'solid', { x: 3.8, y: 4.2, z: -2.2 }, { x: 4.6, y: 0.7, z: 4.6 }, '#334155'),
      makeGameObject('Kat 2 Checkpoint', 'cylinder', 'checkpoint', { x: 4.6, y: 5.4, z: -2.2 }, { x: 0.85, y: 1.7, z: 0.85 }, '#2dd4bf'),
      makeGameObject('Asansör Platform', 'box', 'moving', { x: -1.5, y: 5.8, z: -2.2 }, { x: 3.8, y: 0.6, z: 3.8 }, '#06b6d4', {
        moveSpeed: 2.0,
        patrolRange: 2.8,
        patrolAxis: 'y',
      }),
      makeGameObject('Zirve Terası', 'box', 'solid', { x: -5, y: 8.6, z: -2.2 }, { x: 5.5, y: 0.8, z: 5.5 }, '#475569'),
      makeGameObject('Kule Altını 1', 'torus', 'collectible', { x: 3.8, y: 5.4, z: -1.6 }, { x: 0.75, y: 0.75, z: 0.75 }, '#fbbf24'),
      makeGameObject('Kule Altını 2', 'torus', 'collectible', { x: -1.5, y: 8.4, z: -2.2 }, { x: 0.75, y: 0.75, z: 0.75 }, '#fbbf24'),
      makeGameObject('Zirve Nöbetçi Taret', 'cylinder', 'npc', { x: -5, y: 9.7, z: -1.4 }, { x: 0.95, y: 1.4, z: 0.95 }, '#f97316', {
        moveSpeed: 2.2,
        patrolRange: 1.8,
        npcBehavior: 'turret',
      }),
      makeGameObject('Zirve Portalı', 'cylinder', 'goal', { x: -5, y: 10.2, z: -3.8 }, { x: 1.6, y: 2.3, z: 1.6 }, '#10b981'),
    ];
  }

  if (kind === 'space') {
    return [
      makeGameObject('Uzay Kaptanı', 'mannequin', 'player', { x: 0, y: 1.4, z: 8 }, { x: 1, y: 1, z: 1 }, '#38bdf8', {
        pose: clonePose(),
        moveSpeed: 8.4,
        jumpForce: 11.4,
      }),
      makeGameObject('Uzay Hangarı', 'box', 'solid', { x: 0, y: -0.5, z: 7 }, { x: 8, y: 1, z: 6 }, '#0f172a'),
      makeGameObject('Çekim Mıknatısı', 'sphere', 'powerup', { x: 0, y: 1.1, z: 5.5 }, { x: 0.85, y: 0.85, z: 0.85 }, '#6366f1', {
        powerupType: 'magnet',
      }),
      makeGameObject('Plazma Köprü 1', 'box', 'moving', { x: 0, y: 0.5, z: 1 }, { x: 4, y: 0.6, z: 3.5 }, '#06b6d4', {
        moveSpeed: 2.5,
        patrolRange: 4,
        patrolAxis: 'x',
      }),
      makeGameObject('Yörünge Güvertesi', 'box', 'solid', { x: 0, y: 1.2, z: -5.5 }, { x: 9, y: 0.8, z: 7 }, '#1e1b4b'),
      makeGameObject('Hiper Trambolin', 'cylinder', 'bounce', { x: 2.8, y: 1.85, z: -5.5 }, { x: 1.6, y: 0.35, z: 1.6 }, '#84cc16', {
        bounceForce: 19,
      }),
      makeGameObject('Yörünge Checkpoint', 'cylinder', 'checkpoint', { x: -2.8, y: 2.5, z: -5.5 }, { x: 0.85, y: 1.7, z: 0.85 }, '#2dd4bf'),
      makeGameObject('Komuta Köprüsü', 'box', 'solid', { x: 0, y: 4.5, z: -12.5 }, { x: 8, y: 0.9, z: 6 }, '#312e81'),
      makeGameObject('Plazma Taret', 'cylinder', 'npc', { x: -1.8, y: 2.3, z: -6.8 }, { x: 1, y: 1.5, z: 1 }, '#f97316', {
        moveSpeed: 2,
        patrolRange: 2,
        npcBehavior: 'turret',
      }),
      makeGameObject('Takipçi Dron', 'sphere', 'npc', { x: 1.5, y: 5.7, z: -11.5 }, { x: 1.1, y: 1.1, z: 1.1 }, '#a855f7', {
        moveSpeed: 3.4,
        patrolRange: 3,
        npcBehavior: 'chase',
      }),
      makeGameObject('Enerji Hücresi #1', 'torus', 'collectible', { x: 0, y: 2.2, z: 1 }, { x: 0.75, y: 0.75, z: 0.75 }, '#fbbf24'),
      makeGameObject('Enerji Hücresi #2', 'torus', 'collectible', { x: 0, y: 2.6, z: -5.5 }, { x: 0.75, y: 0.75, z: 0.75 }, '#fbbf24'),
      makeGameObject('Enerji Hücresi #3', 'torus', 'collectible', { x: 0, y: 5.8, z: -11.5 }, { x: 0.75, y: 0.75, z: 0.75 }, '#fbbf24'),
      makeGameObject('Yıldız Geçidi', 'cylinder', 'goal', { x: 0, y: 6.1, z: -14.2 }, { x: 1.7, y: 2.4, z: 1.7 }, '#10b981'),
    ];
  }

  // Arena / Shooter
  return [
    makeGameObject('Arena Savaşçısı', 'mannequin', 'player', { x: 0, y: 1.4, z: 7.5 }, { x: 1, y: 1, z: 1 }, '#38bdf8', {
      pose: clonePose(),
      moveSpeed: 8.8,
      jumpForce: 10.0,
    }),
    makeGameObject('Savaş Arenası', 'box', 'solid', { x: 0, y: -0.5, z: 0 }, { x: 22, y: 1, z: 22 }, '#1e293b'),
    makeGameObject('Merkez Platform', 'box', 'solid', { x: 0, y: 1.4, z: 0 }, { x: 4, y: 2.8, z: 4 }, '#475569'),
    makeGameObject('Kalkan Gücü', 'sphere', 'powerup', { x: 5.2, y: 0.9, z: 4.5 }, { x: 0.85, y: 0.85, z: 0.85 }, '#6366f1', {
      powerupType: 'shield',
    }),
    makeGameObject('Arena Trambolin', 'cylinder', 'bounce', { x: -5.5, y: 0.25, z: 4.5 }, { x: 1.7, y: 0.35, z: 1.7 }, '#84cc16', {
      bounceForce: 18,
    }),
    makeGameObject('Altın Kuzey', 'torus', 'collectible', { x: 0, y: 1.1, z: -7 }, { x: 0.75, y: 0.75, z: 0.75 }, '#fbbf24'),
    makeGameObject('Altın Doğu', 'torus', 'collectible', { x: 7, y: 1.1, z: 0 }, { x: 0.75, y: 0.75, z: 0.75 }, '#fbbf24'),
    makeGameObject('Altın Batı', 'torus', 'collectible', { x: -7, y: 1.1, z: 0 }, { x: 0.75, y: 0.75, z: 0.75 }, '#fbbf24'),
    makeGameObject('Merkez Ödül', 'torus', 'collectible', { x: 0, y: 3.8, z: 0 }, { x: 0.85, y: 0.85, z: 0.85 }, '#fbbf24'),
    makeGameObject('Lazer Kapanı', 'cone', 'hazard', { x: 4.5, y: 0.8, z: -3.2 }, { x: 1.1, y: 1.6, z: 1.1 }, '#f43f5e'),
    makeGameObject('Takipçi Bot #1', 'cone', 'npc', { x: -4.2, y: 0.9, z: -2.8 }, { x: 1.1, y: 1.4, z: 1.1 }, '#a855f7', {
      moveSpeed: 3.1,
      patrolRange: 4.5,
      npcBehavior: 'chase',
    }),
    makeGameObject('Ateş Eden Taret #2', 'cylinder', 'npc', { x: 4.2, y: 0.9, z: -6.5 }, { x: 1.1, y: 1.4, z: 1.1 }, '#f97316', {
      moveSpeed: 2.2,
      patrolRange: 3.5,
      npcBehavior: 'turret',
    }),
    makeGameObject('Arena Çıkışı', 'cylinder', 'goal', { x: 0, y: 1.5, z: -9.2 }, { x: 1.6, y: 2.4, z: 1.6 }, '#10b981'),
  ];
}

export function generateLevelFromPrompt(prompt: string): {
  objects: StageObject3D[];
  skyTheme?: SkyThemeId;
  summary: string;
} {
  const lower = prompt.toLowerCase();
  const coinMatch = lower.match(/(\d+)\s*(altın|coin)/i);
  const botMatch = lower.match(/(\d+)\s*(bot|npc|düşman|taret)/i);
  const hazardMatch = lower.match(/(\d+)\s*(engel|tuzak|lazer|lav)/i);

  const coinsCount = Math.min(10, Math.max(2, Number(coinMatch?.[1] ?? 4)));
  const botsCount = Math.min(6, Math.max(1, Number(botMatch?.[1] ?? (lower.includes('bot') || lower.includes('npc') || lower.includes('taret') ? 2 : 1))));
  const hazardCount = Math.min(6, Math.max(1, Number(hazardMatch?.[1] ?? (lower.includes('lav') || lower.includes('tuzak') || lower.includes('engel') ? 2 : 1))));
  const hasBounce = /trambolin|zıpla|bounce|yay/.test(lower) || !lower.trim();
  const hasMoving = /hareketli|asansör|köprü|moving/.test(lower) || !lower.trim();
  const isTower = /kule|dikey|tower|yukarı/.test(lower);
  const wantsTurret = /taret|ateş|uzay|savaş/.test(lower);
  const wantsChase = /takip|kovala|zombi|bot/.test(lower);

  let skyTheme: SkyThemeId | undefined;
  if (/neon|siber|uzay/.test(lower)) skyTheme = 'neon';
  else if (/gün\s*batım|sunset|lav/.test(lower)) skyTheme = 'sunset';
  else if (/gökyüzü|bulut|mavi|sky/.test(lower)) skyTheme = 'sky';

  const objects: StageObject3D[] = [
    makeGameObject('AI Kahraman', 'mannequin', 'player', { x: 0, y: 1.6, z: 7 }, { x: 1, y: 1, z: 1 }, '#38bdf8', {
      pose: clonePose(),
      moveSpeed: 8.2,
      jumpForce: 10.8,
    }),
    makeGameObject('Başlangıç Alanı', 'box', 'solid', { x: 0, y: -0.5, z: 6.5 }, { x: 7.5, y: 1, z: 6.5 }, '#1e293b'),
    makeGameObject('AI Power-Up (Mıknatıs/Kalkan)', 'sphere', 'powerup', { x: 1.8, y: 1.1, z: 5.2 }, { x: 0.85, y: 0.85, z: 0.85 }, '#6366f1', {
      powerupType: 'magnet',
    }),
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
      makeGameObject(
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
        makeGameObject(
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
        makeGameObject(
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
        makeGameObject(
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

  const endZ = curZ - 5.2;
  const endY = curY + 0.6;
  objects.push(
    makeGameObject('Final Arenası', 'box', 'solid', { x: 0, y: endY, z: endZ }, { x: 9, y: 0.9, z: 7 }, '#1e293b'),
  );

  for (let b = 0; b < botsCount; b++) {
    const behavior: 'patrol' | 'chase' | 'turret' =
      b % 2 === 1 && wantsTurret ? 'turret' : wantsChase ? 'chase' : 'patrol';
    objects.push(
      makeGameObject(
        behavior === 'turret' ? `AI Taret #${b + 1}` : behavior === 'chase' ? `AI Takipçi #${b + 1}` : `AI Devriye #${b + 1}`,
        behavior === 'turret' ? 'cylinder' : 'cone',
        'npc',
        { x: (b % 2 === 0 ? -1 : 1) * 1.6, y: endY + 1.15, z: endZ + 1.4 - b * 1.3 },
        { x: 0.95, y: 1.4, z: 0.95 },
        behavior === 'turret' ? '#f97316' : '#a855f7',
        { moveSpeed: 2.6 + b * 0.35, patrolRange: 2.8, npcBehavior: behavior },
      ),
    );
  }

  for (let h = 0; h < hazardCount; h++) {
    objects.push(
      makeGameObject(
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
    makeGameObject('Zafer Portalı', 'cylinder', 'goal', { x: 0, y: endY + 1.6, z: endZ - 2 }, { x: 1.7, y: 2.4, z: 1.7 }, '#10b981'),
  );

  return {
    objects,
    skyTheme,
    summary: `Prompt üretildi: ${coinsCount} altın, ${botsCount} AI bot, ${hazardCount} engel, Power-Up${hasBounce ? ', trambolin' : ''}${hasMoving ? ', hareketli platform' : ''}.`,
  };
}
