import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { clonePose, type GameRole, type StageObject3D } from '@opencraft/shared';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bot,
  Box,
  Coins,
  Download,
  Flag,
  Gamepad2,
  Heart,
  Layers,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Square,
  Trash2,
  Trophy,
  User,
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

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
    label: 'Platform / Zemin',
    badge: 'bg-slate-500/20 text-slate-200 border-slate-400/30',
    ringColor: '#94a3b8',
    defaultColor: '#334155',
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

function playSynthTone(type: 'jump' | 'coin' | 'hit' | 'win') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const triggerNote = (freqStart: number, freqEnd: number, duration: number, delay = 0, wave: OscillatorType = 'sine', gainPeak = 0.14) => {
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

    if (type === 'jump') {
      triggerNote(240, 520, 0.14, 0, 'triangle', 0.12);
    } else if (type === 'coin') {
      triggerNote(880, 1320, 0.1, 0, 'sine', 0.15);
      triggerNote(1320, 1760, 0.12, 0.07, 'sine', 0.12);
    } else if (type === 'hit') {
      triggerNote(180, 65, 0.22, 0, 'sawtooth', 0.15);
    } else if (type === 'win') {
      triggerNote(523.25, 523.25, 0.14, 0, 'triangle', 0.15);
      triggerNote(659.25, 659.25, 0.14, 0.11, 'triangle', 0.15);
      triggerNote(783.99, 1046.5, 0.28, 0.22, 'triangle', 0.16);
    }

    window.setTimeout(() => {
      void ctx.close();
    }, 900);
  } catch {
    // Ignore autoplay/WebAudio restrictions
  }
}

function makeTemplate(kind: 'platformer' | 'arena'): StageObject3D[] {
  const baseId = () => Math.random().toString(36).slice(2, 8);
  const makeObj = (
    name: string,
    objKind: StageObject3D['kind'],
    gameRole: GameRole,
    position: { x: number; y: number; z: number },
    scale: { x: number; y: number; z: number },
    color: string,
    extra: Partial<StageObject3D> = {},
  ): StageObject3D => ({
    id: `gm_${baseId()}`,
    name,
    kind: objKind,
    visible: true,
    position,
    rotation: { x: 0, y: 0, z: 0 },
    scale,
    color,
    roughness: 0.45,
    metalness: gameRole === 'collectible' || gameRole === 'goal' ? 0.45 : 0.12,
    emissiveIntensity: gameRole === 'goal' || gameRole === 'hazard' ? 0.35 : 0,
    gameRole,
    ...extra,
  });

  if (kind === 'platformer') {
    return [
      makeObj('Kahraman Oyuncu', 'mannequin', 'player', { x: 0, y: 1.6, z: 6 }, { x: 1, y: 1, z: 1 }, '#38bdf8', {
        pose: clonePose(),
        moveSpeed: 7.5,
        jumpForce: 10.5,
      }),
      makeObj('Başlangıç Zemini', 'box', 'solid', { x: 0, y: -0.5, z: 5.5 }, { x: 7, y: 1, z: 7 }, '#1e293b'),
      makeObj('Basamak 1', 'box', 'solid', { x: 0, y: 0.5, z: 0.2 }, { x: 4.5, y: 0.7, z: 3.2 }, '#334155'),
      makeObj('Basamak 2', 'box', 'solid', { x: 3.4, y: 1.6, z: -4.2 }, { x: 4.2, y: 0.7, z: 3.2 }, '#334155'),
      makeObj('Bitiş Platformu', 'box', 'solid', { x: 0, y: 2.6, z: -9.5 }, { x: 6.5, y: 0.8, z: 5.5 }, '#1e293b'),
      makeObj('Altın #1', 'torus', 'collectible', { x: 0, y: 1.6, z: 0.2 }, { x: 0.7, y: 0.7, z: 0.7 }, '#fbbf24'),
      makeObj('Altın #2', 'torus', 'collectible', { x: 3.4, y: 2.7, z: -4.2 }, { x: 0.7, y: 0.7, z: 0.7 }, '#fbbf24'),
      makeObj('Altın #3', 'torus', 'collectible', { x: 1.2, y: 3.8, z: -8.2 }, { x: 0.7, y: 0.7, z: 0.7 }, '#fbbf24'),
      makeObj('Lazer Engeli', 'box', 'hazard', { x: -1.4, y: 3.4, z: -8.6 }, { x: 1.4, y: 0.8, z: 1.2 }, '#f43f5e'),
      makeObj('Devriye Bot', 'cone', 'npc', { x: 0, y: 1.5, z: 0.2 }, { x: 0.9, y: 1.3, z: 0.9 }, '#a855f7', {
        moveSpeed: 2.6,
        patrolRange: 2.2,
      }),
      makeObj('Zafer Portalı', 'cylinder', 'goal', { x: 0, y: 4.1, z: -10.5 }, { x: 1.5, y: 2.2, z: 1.5 }, '#10b981'),
    ];
  }

  return [
    makeObj('Arena Oyuncusu', 'mannequin', 'player', { x: 0, y: 1.4, z: 7 }, { x: 1, y: 1, z: 1 }, '#38bdf8', {
      pose: clonePose(),
      moveSpeed: 8.5,
      jumpForce: 9.5,
    }),
    makeObj('Büyük Arena Zemin', 'box', 'solid', { x: 0, y: -0.5, z: 0 }, { x: 20, y: 1, z: 20 }, '#1e293b'),
    makeObj('Orta Sütun', 'box', 'solid', { x: 0, y: 1.2, z: 0 }, { x: 3, y: 2.4, z: 3 }, '#475569'),
    makeObj('Altın Kuzey', 'torus', 'collectible', { x: 0, y: 1.1, z: -6.5 }, { x: 0.75, y: 0.75, z: 0.75 }, '#fbbf24'),
    makeObj('Altın Doğu', 'torus', 'collectible', { x: 6.5, y: 1.1, z: 0 }, { x: 0.75, y: 0.75, z: 0.75 }, '#fbbf24'),
    makeObj('Altın Batı', 'torus', 'collectible', { x: -6.5, y: 1.1, z: 0 }, { x: 0.75, y: 0.75, z: 0.75 }, '#fbbf24'),
    makeObj('Üst Altın', 'torus', 'collectible', { x: 0, y: 3.3, z: 0 }, { x: 0.85, y: 0.85, z: 0.85 }, '#fbbf24'),
    makeObj('Kırmızı Tuzak', 'cone', 'hazard', { x: 3.5, y: 0.8, z: 3.5 }, { x: 1.1, y: 1.6, z: 1.1 }, '#f43f5e'),
    makeObj('Devriye Nöbetçi', 'sphere', 'npc', { x: -4.2, y: 0.9, z: -2.5 }, { x: 1.1, y: 1.1, z: 1.1 }, '#a855f7', {
      moveSpeed: 3.2,
      patrolRange: 4.5,
    }),
    makeObj('Çıkış Kapısı', 'cylinder', 'goal', { x: 0, y: 1.5, z: -8.5 }, { x: 1.6, y: 2.4, z: 1.6 }, '#10b981'),
  ];
}

function buildMeshForObject(obj: StageObject3D): THREE.Group {
  const group = new THREE.Group();
  group.userData.objectId = obj.id;
  const role = inferRole(obj);

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(obj.color || ROLE_META[role].defaultColor),
    roughness: obj.roughness ?? 0.45,
    metalness: obj.metalness ?? 0.15,
    emissive: new THREE.Color(role === 'goal' || role === 'hazard' ? obj.color : '#000000'),
    emissiveIntensity: role === 'goal' ? 0.35 : role === 'hazard' ? 0.25 : obj.emissiveIntensity ?? 0,
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
      new THREE.MeshStandardMaterial({ color: '#0284c7', emissive: '#38bdf8', emissiveIntensity: 0.7 }),
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

  // Visual role ring underneath non-solid objects in edit/game view
  if (role !== 'solid' && role !== 'decor') {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.76, 28),
      new THREE.MeshBasicMaterial({
        color: ROLE_META[role].ringColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
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

function buildStandaloneHtmlGame(projectName: string, objects: StageObject3D[]): string {
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
      moveSpeed: o.moveSpeed ?? 7.5,
      jumpForce: o.jumpForce ?? 10.5,
      patrolRange: o.patrolRange ?? 3,
    })),
  );

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>${projectName.replace(/</g, '&lt;')} — Alpemox Game Export</title>
<style>
  html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#070b14;font-family:system-ui,-apple-system,sans-serif;color:#f8fafc}
  #hud{position:fixed;top:16px;left:16px;display:flex;gap:12px;background:rgba(15,23,42,.78);backdrop-filter:blur(8px);padding:10px 16px;border-radius:12px;border:1px solid rgba(255,255,255,.12);font-size:14px;z-index:10}
  #banner{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(2,6,23,.72);z-index:20;flex-direction:column;gap:14px}
  #banner.show{display:flex}
  button{background:#38bdf8;color:#020617;border:0;padding:10px 20px;border-radius:10px;font-weight:700;cursor:pointer}
  #hint{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,.72);padding:8px 14px;border-radius:999px;font-size:12px;color:#cbd5e1;border:1px solid rgba(255,255,255,.1)}
</style>
</head>
<body>
<div id="hud"><span>Skor: <b id="score">0</b></span><span>Altın: <b id="coins">0</b></span><span>Can: <b id="hp">3</b></span></div>
<div id="banner"><h1 id="statusText">Oyun Bitti</h1><button onclick="location.reload()">Tekrar Oyna</button></div>
<div id="hint">WASD / Ok Tuşları: Hareket • Space: Zıpla • Exported by Alpemox Game Engine</div>
<script type="module">
import * as THREE from 'https://unpkg.com/three@0.171.0/build/three.module.js';
const LEVEL = ${payload};
const scene = new THREE.Scene();
scene.background = new THREE.Color('#090d16');
scene.fog = new THREE.Fog('#090d16', 18, 55);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 150);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
scene.add(new THREE.AmbientLight(0xffffff, 0.65));
const dir = new THREE.DirectionalLight(0xfff4e6, 1.4);
dir.position.set(12, 22, 10);
dir.castShadow = true;
scene.add(dir);
const grid = new THREE.GridHelper(60, 60, 0x334155, 0x1e293b);
grid.position.y = -1;
scene.add(grid);

const solids = [], coins = [], hazards = [], npcs = [], goals = [];
let playerMesh = null, playerCfg = { moveSpeed: 7.5, jumpForce: 10.5 }, spawnPos = new THREE.Vector3(0, 2, 5);
for (const o of LEVEL) {
  const mat = new THREE.MeshStandardMaterial({ color: o.color || '#38bdf8', roughness: 0.45, metalness: 0.2 });
  let geom;
  if (o.kind === 'sphere') geom = new THREE.SphereGeometry(0.5, 18, 14);
  else if (o.kind === 'cylinder') geom = new THREE.CylinderGeometry(0.5, 0.5, 1, 18);
  else if (o.kind === 'cone') geom = new THREE.ConeGeometry(0.5, 1, 16);
  else if (o.kind === 'torus') geom = new THREE.TorusGeometry(0.42, 0.16, 12, 24);
  else if (o.kind === 'mannequin' || o.role === 'player') geom = new THREE.CapsuleGeometry(0.34, 0.85, 6, 12);
  else geom = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(o.position.x, o.position.y, o.position.z);
  mesh.scale.set(o.scale.x, o.scale.y, o.scale.z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);
  if (o.role === 'player' && !playerMesh) {
    playerMesh = mesh; playerCfg = o; spawnPos.copy(mesh.position);
  } else if (o.role === 'solid') solids.push({ mesh, scale: o.scale });
  else if (o.role === 'collectible') coins.push({ mesh, collected: false });
  else if (o.role === 'hazard') hazards.push({ mesh, radius: Math.max(o.scale.x, o.scale.z) * 0.55 });
  else if (o.role === 'npc') npcs.push({ mesh, baseX: o.position.x, speed: o.moveSpeed || 2.5, range: o.patrolRange || 3 });
  else if (o.role === 'goal') goals.push({ mesh });
}
if (!playerMesh) {
  playerMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.8, 6, 12), new THREE.MeshStandardMaterial({ color: '#38bdf8' }));
  playerMesh.position.copy(spawnPos);
  scene.add(playerMesh);
}
const keys = {};
addEventListener('keydown', (e) => { keys[e.code] = true; });
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
let vy = 0, grounded = false, score = 0, collectedCount = 0, hp = 3, over = false, invuln = 0;
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  for (const c of coins) if (!c.collected) c.mesh.rotation.y += dt * 2.6;
  for (const n of npcs) n.mesh.position.x = n.baseX + Math.sin(t * (n.speed * 0.7)) * n.range;
  if (!over) {
    let dx = (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) - (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);
    let dz = (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0) - (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0);
    if (dx || dz) {
      const len = Math.hypot(dx, dz);
      playerMesh.position.x += (dx / len) * (playerCfg.moveSpeed || 7.5) * dt;
      playerMesh.position.z += (dz / len) * (playerCfg.moveSpeed || 7.5) * dt;
    }
    if ((keys['Space']) && grounded) { vy = playerCfg.jumpForce || 10.5; grounded = false; }
    vy -= 22 * dt;
    playerMesh.position.y += vy * dt;
    grounded = false;
    for (const s of solids) {
      const hx = s.scale.x * 0.5 + 0.35, hz = s.scale.z * 0.5 + 0.35, top = s.mesh.position.y + s.scale.y * 0.5;
      if (Math.abs(playerMesh.position.x - s.mesh.position.x) < hx && Math.abs(playerMesh.position.z - s.mesh.position.z) < hz) {
        if (playerMesh.position.y <= top + 0.2 && playerMesh.position.y >= top - 1.1 && vy <= 0) {
          playerMesh.position.y = top; vy = 0; grounded = true;
        }
      }
    }
    if (playerMesh.position.y < -12) {
      hp--; playerMesh.position.copy(spawnPos); vy = 0;
    }
    for (const c of coins) {
      if (!c.collected && playerMesh.position.distanceTo(c.mesh.position) < 1.25) {
        c.collected = true; c.mesh.visible = false; collectedCount++; score += 100;
      }
    }
    if (invuln > 0) invuln -= dt;
    for (const h of hazards) {
      if (invuln <= 0 && playerMesh.position.distanceTo(h.mesh.position) < h.radius + 0.5) {
        hp--; invuln = 1.1; vy = 6;
      }
    }
    for (const n of npcs) {
      if (invuln <= 0 && playerMesh.position.distanceTo(n.mesh.position) < 1.05) {
        hp--; invuln = 1.1; vy = 6;
      }
    }
    for (const g of goals) {
      if (playerMesh.position.distanceTo(g.mesh.position) < 1.55) {
        over = true;
        document.getElementById('statusText').textContent = 'Bölüm Tamamlandı! Skor: ' + (score + 500);
        document.getElementById('banner').classList.add('show');
      }
    }
    if (hp <= 0 && !over) {
      over = true;
      document.getElementById('statusText').textContent = 'Oyun Bitti! Skor: ' + score;
      document.getElementById('banner').classList.add('show');
    }
    document.getElementById('score').textContent = String(score);
    document.getElementById('coins').textContent = String(collectedCount);
    document.getElementById('hp').textContent = String(Math.max(0, hp));
  }
  const camTarget = new THREE.Vector3(playerMesh.position.x, playerMesh.position.y + 5.2, playerMesh.position.z + 8.5);
  camera.position.lerp(camTarget, 0.08);
  camera.lookAt(playerMesh.position.x, playerMesh.position.y + 0.8, playerMesh.position.z);
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
  const meshMapRef = useRef<Map<string, THREE.Group>>(new Map());
  const keysRef = useRef<Record<string, boolean>>({});
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
    invuln: 0,
    collectedIds: new Set<string>(),
    playerId: '' as string,
    playerPos: new THREE.Vector3(0, 1.5, 5),
    spawnPos: new THREE.Vector3(0, 1.5, 5),
  });

  const [isPlaying, setIsPlaying] = useState(false);
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

  // Sync Three.js scene objects whenever project.objects3d changes (when not actively mid-playtest)
  const rebuildSceneObjects = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
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

  // Initialize Three.js viewport
  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090d16');
    scene.fog = new THREE.Fog('#090d16', 24, 68);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      52,
      Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight),
      0.1,
      200,
    );
    camera.position.set(10, 8, 14);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.shadowMap.enabled = true;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1, -1);
    controlsRef.current = controls;

    // Lights & Floor grid
    const ambient = new THREE.AmbientLight('#dbeafe', 0.72);
    const dirLight = new THREE.DirectionalLight('#fff7ed', 1.45);
    dirLight.position.set(12, 22, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(ambient, dirLight);

    const grid = new THREE.GridHelper(64, 64, 0x334155, 0x1e293b);
    grid.position.y = -1;
    scene.add(grid);

    // Raycast click-to-select in Edit Mode
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onPointerDown = (ev: PointerEvent) => {
      if (playStateRef.current.playing) return;
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

    // Build initial scene
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

      // Idle visual spin on collectibles & goals
      for (const obj of list) {
        const grp = meshMapRef.current.get(obj.id);
        if (!grp) continue;
        const role = inferRole(obj);
        if (role === 'collectible') {
          grp.rotation.y += dt * 2.4;
        } else if (role === 'goal') {
          grp.rotation.y += dt * 1.1;
        }
      }

      if (ps.playing && ps.outcome === 'playing') {
        ps.elapsed += dt;

        // NPC patrol movement
        for (const obj of list) {
          if (inferRole(obj) !== 'npc') continue;
          const grp = meshMapRef.current.get(obj.id);
          if (!grp) continue;
          const range = obj.patrolRange ?? 2.8;
          const speed = obj.moveSpeed ?? 2.6;
          grp.position.x = obj.position.x + Math.sin(ps.elapsed * speed * 0.7) * range;
        }

        // Player movement
        const playerCfg = list.find((o) => o.id === ps.playerId);
        const playerGrp = meshMapRef.current.get(ps.playerId);
        if (playerGrp) {
          const k = keysRef.current;
          const dx = (k['KeyD'] || k['ArrowRight'] || k['PadRight'] ? 1 : 0) - (k['KeyA'] || k['ArrowLeft'] || k['PadLeft'] ? 1 : 0);
          const dz = (k['KeyS'] || k['ArrowDown'] || k['PadDown'] ? 1 : 0) - (k['KeyW'] || k['ArrowUp'] || k['PadUp'] ? 1 : 0);
          const moveSpeed = playerCfg?.moveSpeed ?? 7.5;
          const jumpForce = playerCfg?.jumpForce ?? 10.5;

          if (dx !== 0 || dz !== 0) {
            const len = Math.hypot(dx, dz);
            ps.playerPos.x += (dx / len) * moveSpeed * dt;
            ps.playerPos.z += (dz / len) * moveSpeed * dt;
            playerGrp.rotation.y = Math.atan2(-dx, -dz);
          }

          if ((k['Space'] || k['PadJump']) && ps.grounded) {
            ps.vy = jumpForce;
            ps.grounded = false;
            playSynthTone('jump');
          }

          ps.vy -= 22 * dt;
          ps.playerPos.y += ps.vy * dt;
          ps.grounded = false;

          // Solid AABB platform landings
          for (const obj of list) {
            if (!obj.visible || inferRole(obj) !== 'solid') continue;
            const grp = meshMapRef.current.get(obj.id);
            const px = grp ? grp.position.x : obj.position.x;
            const py = grp ? grp.position.y : obj.position.y;
            const pz = grp ? grp.position.z : obj.position.z;
            const hx = Math.abs(obj.scale.x) * 0.5 + 0.36;
            const hz = Math.abs(obj.scale.z) * 0.5 + 0.36;
            const top = py + Math.abs(obj.scale.y) * 0.5;
            if (Math.abs(ps.playerPos.x - px) < hx && Math.abs(ps.playerPos.z - pz) < hz) {
              if (ps.playerPos.y <= top + 0.25 && ps.playerPos.y >= top - 1.2 && ps.vy <= 0) {
                ps.playerPos.y = top;
                ps.vy = 0;
                ps.grounded = true;
              }
            }
          }

          // Out-of-bounds respawn
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
              playSynthTone('coin');
            }
          }

          // Hazards & NPCs
          if (ps.invuln > 0) ps.invuln -= dt;
          for (const obj of list) {
            if (!obj.visible) continue;
            const role = inferRole(obj);
            if (role !== 'hazard' && role !== 'npc') continue;
            const grp = meshMapRef.current.get(obj.id);
            if (!grp) continue;
            const hitRadius = Math.max(Math.abs(obj.scale.x), Math.abs(obj.scale.z)) * 0.5 + 0.4;
            if (ps.invuln <= 0 && ps.playerPos.distanceTo(grp.position) < hitRadius) {
              ps.hp -= 1;
              ps.invuln = 1.1;
              ps.vy = 6.2;
              playSynthTone('hit');
            }
          }

          // Goal portal check
          for (const obj of list) {
            if (!obj.visible || inferRole(obj) !== 'goal') continue;
            const grp = meshMapRef.current.get(obj.id);
            if (!grp) continue;
            if (ps.playerPos.distanceTo(grp.position) < 1.65) {
              ps.outcome = 'won';
              ps.score += 500;
              playSynthTone('win');
            }
          }

          if (ps.hp <= 0 && ps.outcome === 'playing') {
            ps.hp = 0;
            ps.outcome = 'lost';
          }

          playerGrp.position.copy(ps.playerPos);

          // Third-person smooth follow camera
          const desiredCam = new THREE.Vector3(ps.playerPos.x, ps.playerPos.y + 5.2, ps.playerPos.z + 8.8);
          camera.position.lerp(desiredCam, 0.1);
          controls.target.lerp(new THREE.Vector3(ps.playerPos.x, ps.playerPos.y + 1, ps.playerPos.z), 0.14);
          controls.update();
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
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
      meshMapRef.current.clear();
      sceneRef.current = null;
    };
  }, [rebuildSceneObjects, setSelectedObject3DId]);

  // Rebuild meshes when store objects change in edit mode
  useEffect(() => {
    if (!isPlaying) {
      rebuildSceneObjects();
    }
  }, [objects3d, isPlaying, rebuildSceneObjects]);

  // Keyboard listeners during playtest
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!playStateRef.current.playing) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
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
  }, []);

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
    let playerObj = list.find((o) => inferRole(o) === 'player');
    if (!playerObj) {
      // Auto-spawn a player if user has none yet
      add3DObject('mannequin', {
        name: 'Oyuncu',
        gameRole: 'player',
        position: { x: 0, y: 1.5, z: 5 },
        color: '#38bdf8',
        pose: clonePose(),
        moveSpeed: 7.5,
        jumpForce: 10.5,
      });
      setStatusNotice('Sahnede oyuncu olmadığı için otomatik Oyuncu eklendi — tekrar Oynat’a basın.');
      return;
    }

    rebuildSceneObjects();
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
      invuln: 0,
      collectedIds: new Set<string>(),
      playerId: playerObj.id,
      playerPos: spawn.clone(),
      spawnPos: spawn,
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

  const handleLoadTemplate = (kind: 'platformer' | 'arena') => {
    if (isPlaying) stopPlaytest();
    const items = makeTemplate(kind);
    replace3DObjects(items);
    setSelectedObject3DId(items[0]?.id ?? null);
    setStatusNotice(
      kind === 'platformer'
        ? 'Platformer Parkur şablonu yüklendi. "Oynat (Playtest)" ile hemen deneyin!'
        : 'Coin Koleksiyon Arenası yüklendi. Altınları toplayıp çıkışa ulaşın!',
    );
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
        moveSpeed: 7.5,
        jumpForce: 10.5,
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
    const html = buildStandaloneHtmlGame(project.name || 'Alpemox Oyunum', objects3d);
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
    setStatusNotice('Tek dosya oynanabilir 3D Web Oyunu (.HTML) indirildi!');
  };

  const setVirtualPadKey = (code: string, active: boolean) => {
    keysRef.current[code] = active;
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-[#080b12] text-slate-100 select-none">
      {/* Top Game Studio Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#0d121d] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
            <Gamepad2 className="h-4 w-4" />
            <span>Alpemox Game Engine ★</span>
          </div>

          {!isPlaying ? (
            <button
              type="button"
              onClick={startPlaytest}
              data-testid="game-play-btn"
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Oynat (Playtest)
            </button>
          ) : (
            <button
              type="button"
              onClick={stopPlaytest}
              data-testid="game-stop-btn"
              className="flex items-center gap-1.5 rounded-lg bg-rose-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg shadow-rose-500/20 hover:bg-rose-400 transition"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              Durdur
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (isPlaying) startPlaytest();
              else rebuildSceneObjects();
            }}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Sıfırla
          </button>

          <div className="h-5 w-px bg-white/10 mx-1" />

          <button
            type="button"
            onClick={() => handleLoadTemplate('platformer')}
            data-testid="template-platformer-btn"
            className="flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-500/10 px-2.5 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-500/20 transition"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Şablon: Platformer Parkur
          </button>

          <button
            type="button"
            onClick={() => handleLoadTemplate('arena')}
            data-testid="template-arena-btn"
            className="flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/20 transition"
          >
            <Trophy className="h-3.5 w-3.5" />
            Şablon: Coin Arenası
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleQuickAdd('player')}
            className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] hover:bg-white/10"
            title="Oyuncu Ekle"
          >
            <User className="h-3 w-3 text-sky-400" /> +Oyuncu
          </button>
          <button
            type="button"
            onClick={() => handleQuickAdd('solid')}
            className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] hover:bg-white/10"
            title="Platform Ekle"
          >
            <Box className="h-3 w-3 text-slate-300" /> +Platform
          </button>
          <button
            type="button"
            onClick={() => handleQuickAdd('collectible')}
            className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] hover:bg-white/10"
            title="Altın / Ödül Ekle"
          >
            <Coins className="h-3 w-3 text-amber-400" /> +Altın
          </button>
          <button
            type="button"
            onClick={() => handleQuickAdd('hazard')}
            className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] hover:bg-white/10"
            title="Engel Ekle"
          >
            <AlertTriangle className="h-3 w-3 text-rose-400" /> +Engel
          </button>
          <button
            type="button"
            onClick={() => handleQuickAdd('npc')}
            className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] hover:bg-white/10"
            title="Devriye NPC Ekle"
          >
            <Bot className="h-3 w-3 text-purple-400" /> +NPC
          </button>
          <button
            type="button"
            onClick={() => handleQuickAdd('goal')}
            className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] hover:bg-white/10"
            title="Bitiş Portalı Ekle"
          >
            <Flag className="h-3 w-3 text-emerald-400" /> +Portal
          </button>

          <div className="h-5 w-px bg-white/10 mx-1" />

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

      {/* Main Split: 3D Engine Viewport + Right Game Inspector */}
      <div className="flex flex-1 min-h-0">
        {/* 3D Viewport */}
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
              {isPlaying ? 'PLAYTEST AKTİF' : 'EDİTÖR MODU'}
            </span>
          </div>

          {/* Notice toast */}
          {statusNotice && (
            <div className="pointer-events-none absolute top-4 right-4 max-w-sm rounded-xl border border-sky-400/30 bg-slate-900/90 px-3.5 py-2 text-xs text-sky-200 shadow-lg backdrop-blur">
              {statusNotice}
            </div>
          )}

          {/* On-Screen D-Pad & Jump for quick testing / touch */}
          {isPlaying && hud.outcome === 'playing' && (
            <div className="absolute bottom-5 left-5 flex items-end gap-4">
              <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/15 bg-slate-950/75 p-2 backdrop-blur">
                <div />
                <button
                  type="button"
                  data-testid="dpad-up"
                  onMouseDown={() => setVirtualPadKey('PadUp', true)}
                  onMouseUp={() => setVirtualPadKey('PadUp', false)}
                  onMouseLeave={() => setVirtualPadKey('PadUp', false)}
                  onTouchStart={() => setVirtualPadKey('PadUp', true)}
                  onTouchEnd={() => setVirtualPadKey('PadUp', false)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 hover:bg-sky-500/30 active:bg-sky-500/50"
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
                  onTouchStart={() => setVirtualPadKey('PadLeft', true)}
                  onTouchEnd={() => setVirtualPadKey('PadLeft', false)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 hover:bg-sky-500/30 active:bg-sky-500/50"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  data-testid="dpad-down"
                  onMouseDown={() => setVirtualPadKey('PadDown', true)}
                  onMouseUp={() => setVirtualPadKey('PadDown', false)}
                  onMouseLeave={() => setVirtualPadKey('PadDown', false)}
                  onTouchStart={() => setVirtualPadKey('PadDown', true)}
                  onTouchEnd={() => setVirtualPadKey('PadDown', false)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 hover:bg-sky-500/30 active:bg-sky-500/50"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  data-testid="dpad-right"
                  onMouseDown={() => setVirtualPadKey('PadRight', true)}
                  onMouseUp={() => setVirtualPadKey('PadRight', false)}
                  onMouseLeave={() => setVirtualPadKey('PadRight', false)}
                  onTouchStart={() => setVirtualPadKey('PadRight', true)}
                  onTouchEnd={() => setVirtualPadKey('PadRight', false)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 hover:bg-sky-500/30 active:bg-sky-500/50"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                data-testid="dpad-jump"
                onMouseDown={() => setVirtualPadKey('PadJump', true)}
                onMouseUp={() => setVirtualPadKey('PadJump', false)}
                onMouseLeave={() => setVirtualPadKey('PadJump', false)}
                onTouchStart={() => setVirtualPadKey('PadJump', true)}
                onTouchEnd={() => setVirtualPadKey('PadJump', false)}
                className="flex h-14 px-5 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-500/20 text-xs font-bold text-emerald-200 backdrop-blur hover:bg-emerald-500/35 active:bg-emerald-500/50"
              >
                ZIPLA (SPACE)
              </button>
            </div>
          )}

          {/* Controls hint */}
          <div className="pointer-events-none absolute bottom-4 right-4 rounded-lg border border-white/10 bg-slate-950/75 px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur">
            {isPlaying
              ? 'WASD / Ok Tuşları: Hareket • Space: Zıpla'
              : 'Sol Tık: Nesne Seç • Sürükle: Kamerayı Döndür • Tekerlek: Yakınlaş'}
          </div>

          {/* Victory / Game Over Modal Overlay */}
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

        {/* Right Side: Entity List & Game Behavior Inspector */}
        <aside className="flex w-80 shrink-0 flex-col border-l border-white/10 bg-[#0b0f18]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Oyun Varlıkları ({objects3d.length})
              </h2>
              <p className="text-[11px] text-slate-400">Rol, fizik ve hız ayarları</p>
            </div>
            <button
              type="button"
              onClick={() => handleQuickAdd('solid')}
              className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-200 hover:bg-white/10"
            >
              <Plus className="h-3 w-3" /> Ekle
            </button>
          </div>

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
            <div className="border-t border-white/10 bg-[#0d121d] p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white truncate">{selectedObj.name}</span>
                <button
                  type="button"
                  onClick={() => delete3DObject(selectedObj.id)}
                  className="rounded p-1 text-rose-400 hover:bg-rose-500/15"
                  title="Varlığı Sil"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
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

              {(inferRole(selectedObj) === 'player' || inferRole(selectedObj) === 'npc') && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-0.5">
                    <span className="text-[10px] text-slate-400">Hareket Hızı</span>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="25"
                      value={selectedObj.moveSpeed ?? (inferRole(selectedObj) === 'player' ? 7.5 : 2.6)}
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
                        value={selectedObj.jumpForce ?? 10.5}
                        onChange={(e) =>
                          update3DObject(selectedObj.id, { jumpForce: Number(e.target.value) || 10 })
                        }
                        className="w-full rounded border border-white/15 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                      />
                    </label>
                  ) : (
                    <label className="block space-y-0.5">
                      <span className="text-[10px] text-slate-400">Devriye Alanı</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="15"
                        value={selectedObj.patrolRange ?? 2.8}
                        onChange={(e) =>
                          update3DObject(selectedObj.id, { patrolRange: Number(e.target.value) || 2.5 })
                        }
                        className="w-full rounded border border-white/15 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                      />
                    </label>
                  )}
                </div>
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
        </aside>
      </div>
    </div>
  );
};
