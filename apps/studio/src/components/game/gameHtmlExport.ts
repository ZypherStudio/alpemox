import type { StageObject3D } from '@opencraft/shared';
import {
  inferRole,
  SKY_THEMES,
  type CameraViewMode,
  type GameRulesConfig,
  type SkyThemeId,
} from './gameTemplates';

export function buildStandaloneHtmlGame(
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
      npcBehavior: o.npcBehavior ?? 'patrol',
      powerupType: o.powerupType ?? 'shield',
    })),
  );
  const cfgJson = JSON.stringify({ cameraMode, sky, rules });

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>${projectName.replace(/</g, '&lt;')} — Alpemox Game Engine v3</title>
<style>
  html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:${sky.bg};font-family:system-ui,-apple-system,sans-serif;color:#f8fafc}
  #hud{position:fixed;top:16px;left:16px;display:flex;gap:14px;background:rgba(15,23,42,.82);backdrop-filter:blur(8px);padding:10px 18px;border-radius:12px;border:1px solid rgba(255,255,255,.14);font-size:14px;z-index:10;align-items:center}
  #radar{position:fixed;top:16px;right:16px;width:116px;height:116px;border-radius:14px;border:1px solid rgba(56,189,248,.35);background:rgba(9,13,22,.82);z-index:10}
  #toast{position:fixed;top:66px;left:16px;background:rgba(16,185,129,.2);border:1px solid rgba(16,185,129,.45);color:#a7f3d0;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;display:none;z-index:10}
  #banner{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(2,6,23,.78);z-index:20;flex-direction:column;gap:14px}
  #banner.show{display:flex}
  button{background:#38bdf8;color:#020617;border:0;padding:10px 20px;border-radius:10px;font-weight:700;cursor:pointer}
  #hint{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,.74);padding:8px 16px;border-radius:999px;font-size:12px;color:#cbd5e1;border:1px solid rgba(255,255,255,.12)}
</style>
</head>
<body>
<div id="hud"><span>Skor: <b id="score">0</b></span><span>Altın: <b id="coins">0</b></span><span>Can: <b id="hp">3</b></span><span id="shieldBadge" style="display:none;color:#818cf8;font-weight:700">KALKAN/MIKNATIS</span></div>
<div id="toast"></div>
<canvas id="radar" width="116" height="116"></canvas>
<div id="banner"><h1 id="statusText">Oyun Bitti</h1><button onclick="location.reload()">Tekrar Oyna</button></div>
<div id="hint">WASD/Ok: Yürü • Space: 2x Zıpla • Shift: Dash • F: Ateş • Alpemox Game Engine v3</div>
<script type="module">
import * as THREE from 'https://unpkg.com/three@0.171.0/build/three.module.js';
const LEVEL = ${payload};
const CFG = ${cfgJson};
const scene = new THREE.Scene();
scene.background = new THREE.Color(CFG.sky.bg);
scene.fog = new THREE.Fog(CFG.sky.fog, 22, 70);
const camera = new THREE.PerspectiveCamera(56, innerWidth / innerHeight, 0.1, 180);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
scene.add(new THREE.AmbientLight(CFG.sky.ambient, 0.72));
const dir = new THREE.DirectionalLight(CFG.sky.dir, 1.45);
dir.position.set(12, 22, 10);
dir.castShadow = true;
scene.add(dir);
const grid = new THREE.GridHelper(64, 64, CFG.sky.grid1, CFG.sky.grid2);
grid.position.y = -1;
scene.add(grid);

const solids = [], movings = [], bounces = [], coins = [], powerups = [], hazards = [], npcs = [], checkpoints = [], goals = [];
const particles = [], shots = [], enemyShots = [];
let playerMesh = null, playerRig = null, playerCfg = { moveSpeed: 7.8, jumpForce: 10.6 }, spawnPos = new THREE.Vector3(0, 2, 5);
let yaw = 0, walkPhase = 0;

function showToast(txt) {
  const el = document.getElementById('toast');
  el.textContent = txt; el.style.display = 'block';
  clearTimeout(window.__tTimer);
  window.__tTimer = setTimeout(() => { el.style.display = 'none'; }, 1600);
}

function buildPlayerRig(colorHex) {
  const root = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: colorHex || '#38bdf8', roughness: 0.4, metalness: 0.2 });
  const limbMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.5 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.68, 0.32), mat);
  torso.position.y = 0.88; torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.3 }));
  head.position.y = 1.48; head.castShadow = true;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.15), new THREE.MeshStandardMaterial({ color: '#0284c7', emissive: '#38bdf8', emissiveIntensity: 0.9 }));
  visor.position.set(0, 1.5, -0.18);
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.52, 0.16), mat); leftArm.position.set(-0.39, 0.86, 0);
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.52, 0.16), mat); rightArm.position.set(0.39, 0.86, 0);
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.52, 0.18), limbMat); leftLeg.position.set(-0.15, 0.28, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.52, 0.18), limbMat); rightLeg.position.set(0.15, 0.28, 0);
  const aura = new THREE.Mesh(new THREE.RingGeometry(0.68, 0.82, 28), new THREE.MeshBasicMaterial({ color: '#818cf8', side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
  aura.rotation.x = -Math.PI / 2; aura.position.y = 0.06; aura.visible = false;
  root.add(torso, head, visor, leftArm, rightArm, leftLeg, rightLeg, aura);
  return { root, leftArm, rightArm, leftLeg, rightLeg, aura };
}

function spawnBurst(pos, colorHex, count = 12) {
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), new THREE.MeshBasicMaterial({ color: colorHex }));
    m.position.copy(pos); scene.add(m);
    particles.push({ mesh: m, vel: new THREE.Vector3((Math.random() - 0.5) * 7, Math.random() * 6 + 2, (Math.random() - 0.5) * 7), life: 0.55 });
  }
}

for (const o of LEVEL) {
  if (o.role === 'player' && !playerMesh) {
    playerRig = buildPlayerRig(o.color);
    playerMesh = playerRig.root;
    playerMesh.position.set(o.position.x, o.position.y, o.position.z);
    scene.add(playerMesh);
    playerCfg = o; spawnPos.copy(playerMesh.position);
    if (CFG.cameraMode === 'fps') playerMesh.visible = false;
    continue;
  }
  const mat = new THREE.MeshStandardMaterial({
    color: o.color || '#38bdf8', roughness: 0.42, metalness: 0.2,
    emissive: (o.role === 'goal' || o.role === 'bounce' || o.role === 'checkpoint' || o.role === 'hazard' || o.role === 'powerup') ? o.color : '#000000',
    emissiveIntensity: o.role === 'goal' || o.role === 'bounce' || o.role === 'powerup' ? 0.4 : 0.15
  });
  let geom;
  if (o.role === 'powerup') geom = new THREE.OctahedronGeometry(0.5, 0);
  else if (o.kind === 'sphere') geom = new THREE.SphereGeometry(0.5, 18, 14);
  else if (o.kind === 'cylinder') geom = new THREE.CylinderGeometry(0.5, 0.5, 1, 18);
  else if (o.kind === 'cone') geom = new THREE.ConeGeometry(0.5, 1, 16);
  else if (o.kind === 'torus') geom = new THREE.TorusGeometry(0.42, 0.16, 12, 24);
  else geom = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(o.position.x, o.position.y, o.position.z);
  mesh.rotation.set(o.rotation.x * Math.PI / 180, o.rotation.y * Math.PI / 180, o.rotation.z * Math.PI / 180);
  mesh.scale.set(o.scale.x, o.scale.y, o.scale.z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);
  if (o.role === 'solid') solids.push({ mesh, scale: o.scale });
  else if (o.role === 'moving') movings.push({ mesh, scale: o.scale, base: { ...o.position }, prev: new THREE.Vector3(o.position.x, o.position.y, o.position.z), speed: o.moveSpeed || 2.2, range: o.patrolRange || 3, axis: o.patrolAxis || 'x' });
  else if (o.role === 'bounce') bounces.push({ mesh, force: o.bounceForce || 18, radius: Math.max(o.scale.x, o.scale.z) * 0.55 });
  else if (o.role === 'collectible') coins.push({ mesh, collected: false });
  else if (o.role === 'powerup') powerups.push({ mesh, collected: false, kind: o.powerupType || 'shield' });
  else if (o.role === 'hazard') hazards.push({ mesh, radius: Math.max(o.scale.x, o.scale.z) * 0.55 });
  else if (o.role === 'checkpoint') checkpoints.push({ mesh, active: false });
  else if (o.role === 'npc') npcs.push({ mesh, baseX: o.position.x, baseZ: o.position.z, speed: o.moveSpeed || 2.5, range: o.patrolRange || 3, behavior: o.npcBehavior || 'patrol', fireCd: 1.5, alive: true });
  else if (o.role === 'goal') goals.push({ mesh });
}
if (!playerMesh) {
  playerRig = buildPlayerRig('#38bdf8');
  playerMesh = playerRig.root;
  playerMesh.position.copy(spawnPos); scene.add(playerMesh);
}
const keys = {};
let jumpQueued = false, dashTimer = 0, dashCd = 0, shootCd = 0, shieldTimer = 0;
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

const radarCtx = document.getElementById('radar').getContext('2d');
let vy = 0, grounded = false, jumpsUsed = 0, score = 0, collectedCount = 0, hp = 3, over = false, invuln = 0, elapsed = 0;
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; elapsed += dt;
  for (const c of coins) if (!c.collected) c.mesh.rotation.y += dt * 2.6;
  for (const p of powerups) if (!p.collected) p.mesh.rotation.y += dt * 2.2;
  for (const g of goals) g.mesh.rotation.y += dt * 1.2;
  for (const m of movings) {
    m.prev.copy(m.mesh.position);
    const offset = Math.sin(elapsed * m.speed * 0.8) * m.range;
    m.mesh.position.x = m.base.x + (m.axis === 'x' ? offset : 0);
    m.mesh.position.y = m.base.y + (m.axis === 'y' ? offset : 0);
    m.mesh.position.z = m.base.z + (m.axis === 'z' ? offset : 0);
  }
  for (const n of npcs) {
    if (!n.alive) continue;
    const d = n.mesh.position.distanceTo(playerMesh.position);
    if (n.behavior === 'chase' && d < 14 && !over) {
      const toP = new THREE.Vector3().subVectors(playerMesh.position, n.mesh.position); toP.y = 0;
      if (toP.length() > 0.3) { toP.normalize(); n.mesh.position.addScaledVector(toP, (n.speed * 0.85) * dt); }
    } else if (n.behavior === 'turret') {
      n.mesh.rotation.y += dt * 1.5; n.fireCd -= dt;
      if (n.fireCd <= 0 && d < 18 && !over) {
        n.fireCd = 2.1;
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), new THREE.MeshBasicMaterial({ color: '#f43f5e' }));
        orb.position.copy(n.mesh.position); scene.add(orb);
        const dirV = new THREE.Vector3().subVectors(playerMesh.position, n.mesh.position); dirV.y = 0; dirV.normalize();
        enemyShots.push({ mesh: orb, dir: dirV, life: 2.2 });
      }
    } else {
      n.mesh.position.x = n.baseX + Math.sin(elapsed * n.speed * 0.7) * n.range;
    }
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.life -= dt; p.vel.y -= 14 * dt; p.mesh.position.addScaledVector(p.vel, dt); p.mesh.scale.setScalar(Math.max(0.01, p.life * 1.8));
    if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); }
  }
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i]; s.life -= dt; s.mesh.position.addScaledVector(s.dir, 22 * dt);
    let hit = false;
    for (const n of npcs) {
      if (n.alive && s.mesh.position.distanceTo(n.mesh.position) < 1.15) {
        n.alive = false; n.mesh.visible = false; hit = true; score += 150; spawnBurst(n.mesh.position, '#a855f7', 16); showToast('BOT YOK EDİLDİ +150!');
      }
    }
    if (hit || s.life <= 0) { scene.remove(s.mesh); shots.splice(i, 1); }
  }
  for (let i = enemyShots.length - 1; i >= 0; i--) {
    const e = enemyShots[i]; e.life -= dt; e.mesh.position.addScaledVector(e.dir, 11 * dt);
    if (!over && shieldTimer <= 0 && invuln <= 0 && e.mesh.position.distanceTo(playerMesh.position) < 0.95) {
      hp--; invuln = 1.0; vy = 5; e.life = 0; spawnBurst(playerMesh.position, '#f43f5e', 10);
    }
    if (e.life <= 0) { scene.remove(e.mesh); enemyShots.splice(i, 1); }
  }

  if (!over) {
    if (dashTimer > 0) dashTimer -= dt;
    if (dashCd > 0) dashCd -= dt;
    if (shootCd > 0) shootCd -= dt;
    if (shieldTimer > 0) shieldTimer -= dt;
    playerRig.aura.visible = shieldTimer > 0;
    document.getElementById('shieldBadge').style.display = shieldTimer > 0 ? 'inline' : 'none';

    let dx = (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) - (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);
    let dz = (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0) - (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0);
    const moving = dx !== 0 || dz !== 0;
    if (moving) {
      const len = Math.hypot(dx, dz);
      const spd = (playerCfg.moveSpeed || 7.8) * (dashTimer > 0 ? 2.4 : shieldTimer > 0 ? 1.25 : 1);
      playerMesh.position.x += (dx / len) * spd * dt;
      playerMesh.position.z += (dz / len) * spd * dt;
      yaw = Math.atan2(-dx, -dz);
      playerMesh.rotation.y = yaw;
      walkPhase += dt * 12;
      playerRig.leftLeg.rotation.x = Math.sin(walkPhase) * 0.65;
      playerRig.rightLeg.rotation.x = -Math.sin(walkPhase) * 0.65;
      playerRig.leftArm.rotation.x = -Math.sin(walkPhase) * 0.55;
      playerRig.rightArm.rotation.x = Math.sin(walkPhase) * 0.55;
    } else {
      playerRig.leftLeg.rotation.x = playerRig.rightLeg.rotation.x = 0;
      playerRig.leftArm.rotation.x = playerRig.rightArm.rotation.x = 0;
    }
    if (jumpQueued) {
      const maxJumps = CFG.rules.doubleJump ? 2 : 1;
      if (grounded || jumpsUsed < maxJumps) { vy = playerCfg.jumpForce || 10.6; grounded = false; jumpsUsed++; spawnBurst(playerMesh.position, '#38bdf8', 7); }
      jumpQueued = false;
    }
    vy -= (CFG.rules.gravity || 22) * dt;
    playerMesh.position.y += vy * dt; grounded = false;
    for (const s of [...solids, ...movings]) {
      const hx = s.scale.x * 0.5 + 0.35, hz = s.scale.z * 0.5 + 0.35, top = s.mesh.position.y + s.scale.y * 0.5;
      if (Math.abs(playerMesh.position.x - s.mesh.position.x) < hx && Math.abs(playerMesh.position.z - s.mesh.position.z) < hz) {
        if (playerMesh.position.y <= top + 0.28 && playerMesh.position.y >= top - 1.25 && vy <= 0) {
          playerMesh.position.y = top; vy = 0; grounded = true; jumpsUsed = 0;
          if (s.prev) playerMesh.position.add(new THREE.Vector3().subVectors(s.mesh.position, s.prev));
        }
      }
    }
    for (const b of bounces) {
      if (playerMesh.position.distanceTo(b.mesh.position) < b.radius + 0.5) { vy = b.force; grounded = false; jumpsUsed = 1; spawnBurst(b.mesh.position, '#84cc16', 10); }
    }
    if (playerMesh.position.y < -12) { hp--; playerMesh.position.copy(spawnPos); vy = 0; }
    for (const p of powerups) {
      if (!p.collected && playerMesh.position.distanceTo(p.mesh.position) < 1.45) {
        p.collected = true; p.mesh.visible = false; shieldTimer = 7; score += 75; spawnBurst(p.mesh.position, '#818cf8', 14); showToast('KALKAN + MIKNATIS AKTİF (7s)!');
      }
    }
    for (const c of coins) {
      if (c.collected) continue;
      if (shieldTimer > 0 && playerMesh.position.distanceTo(c.mesh.position) < 6.5) {
        c.mesh.position.lerp(playerMesh.position, 0.14);
      }
      if (playerMesh.position.distanceTo(c.mesh.position) < 1.35) {
        c.collected = true; c.mesh.visible = false; collectedCount++; score += 100; spawnBurst(c.mesh.position, '#fbbf24', 12);
      }
    }
    for (const cp of checkpoints) {
      if (!cp.active && playerMesh.position.distanceTo(cp.mesh.position) < 1.55) {
        cp.active = true; spawnPos.set(cp.mesh.position.x, cp.mesh.position.y + 0.8, cp.mesh.position.z);
        cp.mesh.material.color.set('#10b981'); spawnBurst(cp.mesh.position, '#10b981', 12); showToast('CHECKPOINT KAYDEDİLDİ!');
      }
    }
    if (invuln > 0) invuln -= dt;
    if (shieldTimer <= 0) {
      for (const h of hazards) if (invuln <= 0 && playerMesh.position.distanceTo(h.mesh.position) < h.radius + 0.45) { hp--; invuln = 1.1; vy = 6; spawnBurst(playerMesh.position, '#f43f5e', 10); }
      for (const n of npcs) if (n.alive && invuln <= 0 && playerMesh.position.distanceTo(n.mesh.position) < 1.05) { hp--; invuln = 1.1; vy = 6; spawnBurst(playerMesh.position, '#f43f5e', 10); }
    }
    for (const g of goals) {
      if (playerMesh.position.distanceTo(g.mesh.position) < 1.65) {
        if (!CFG.rules.requireAllCoins || collectedCount >= coins.length) {
          over = true; document.getElementById('statusText').textContent = 'Bölüm Tamamlandı! Skor: ' + (score + 500); document.getElementById('banner').classList.add('show');
        }
      }
    }
    if (hp <= 0 && !over) { over = true; document.getElementById('statusText').textContent = 'Oyun Bitti! Skor: ' + score; document.getElementById('banner').classList.add('show'); }
    document.getElementById('score').textContent = String(score);
    document.getElementById('coins').textContent = collectedCount + '/' + coins.length;
    document.getElementById('hp').textContent = String(Math.max(0, hp));
  }

  // Draw live Radar Mini-Map
  radarCtx.clearRect(0, 0, 116, 116);
  radarCtx.strokeStyle = 'rgba(56,189,248,0.22)'; radarCtx.strokeRect(2, 2, 112, 112);
  const drawBlip = (wp, color, r = 3) => {
    const rx = 58 + (wp.x - playerMesh.position.x) * 3;
    const ry = 58 + (wp.z - playerMesh.position.z) * 3;
    if (rx < 4 || rx > 112 || ry < 4 || ry > 112) return;
    radarCtx.fillStyle = color; radarCtx.beginPath(); radarCtx.arc(rx, ry, r, 0, Math.PI * 2); radarCtx.fill();
  };
  for (const c of coins) if (!c.collected) drawBlip(c.mesh.position, '#fbbf24', 2.6);
  for (const n of npcs) if (n.alive) drawBlip(n.mesh.position, '#a855f7', 3.2);
  for (const g of goals) drawBlip(g.mesh.position, '#10b981', 4);
  radarCtx.fillStyle = '#38bdf8'; radarCtx.beginPath(); radarCtx.arc(58, 58, 4, 0, Math.PI * 2); radarCtx.fill();

  if (CFG.cameraMode === 'fps') {
    camera.position.set(playerMesh.position.x, playerMesh.position.y + 1.38, playerMesh.position.z);
    camera.lookAt(playerMesh.position.x - Math.sin(yaw) * 8, playerMesh.position.y + 1.2, playerMesh.position.z - Math.cos(yaw) * 8);
  } else if (CFG.cameraMode === 'topdown') {
    camera.position.lerp(new THREE.Vector3(playerMesh.position.x, playerMesh.position.y + 15.5, playerMesh.position.z + 6), 0.12);
    camera.lookAt(playerMesh.position.x, playerMesh.position.y, playerMesh.position.z);
  } else {
    camera.position.lerp(new THREE.Vector3(playerMesh.position.x, playerMesh.position.y + 5.2, playerMesh.position.z + 8.8), 0.1);
    camera.lookAt(playerMesh.position.x, playerMesh.position.y + 0.9, playerMesh.position.z);
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);
</script>
</body>
</html>`;
}
