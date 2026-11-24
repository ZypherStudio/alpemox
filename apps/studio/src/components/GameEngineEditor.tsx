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
  Copy,
  Crosshair,
  Download,
  Flag,
  Focus,
  Gamepad2,
  Heart,
  Layers,
  Magnet,
  Maximize2,
  Move,
  Music,
  Play,
  Plus,
  Rocket,
  RotateCcw,
  RotateCw,
  Shield,
  Sliders,
  Sparkles,
  Square,
  Sun,
  Trash2,
  Trophy,
  Upload,
  User,
  Volume2,
  VolumeX,
  Wand2,
  Zap,
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { playGameSfx, SynthMusicLoop } from './game/gameAudio';
import { buildStandaloneHtmlGame } from './game/gameHtmlExport';
import {
  generateLevelFromPrompt,
  inferRole,
  makeTemplate,
  ROLE_META,
  SKY_THEMES,
  type CameraViewMode,
  type GameRulesConfig,
  type GizmoMode,
  type SkyThemeId,
} from './game/gameTemplates';

function buildMeshForObject(obj: StageObject3D): THREE.Group {
  const group = new THREE.Group();
  group.userData.objectId = obj.id;
  const role = inferRole(obj);

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(obj.color || ROLE_META[role].defaultColor),
    roughness: obj.roughness ?? 0.42,
    metalness: obj.metalness ?? 0.16,
    emissive: new THREE.Color(
      role === 'goal' ||
        role === 'hazard' ||
        role === 'bounce' ||
        role === 'checkpoint' ||
        role === 'powerup'
        ? obj.color
        : '#000000',
    ),
    emissiveIntensity:
      role === 'goal' || role === 'powerup'
        ? 0.42
        : role === 'bounce' || role === 'checkpoint'
          ? 0.35
          : role === 'hazard'
            ? 0.25
            : obj.emissiveIntensity ?? 0,
  });

  if (obj.kind === 'mannequin' || role === 'player') {
    const bodyGroup = new THREE.Group();
    const limbMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.5 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.66, 0.32), material);
    torso.position.y = 0.88;
    torso.castShadow = true;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 12),
      new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.3 }),
    );
    head.position.y = 1.48;
    head.castShadow = true;

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.1, 0.15),
      new THREE.MeshStandardMaterial({ color: '#0284c7', emissive: '#38bdf8', emissiveIntensity: 0.9 }),
    );
    visor.position.set(0, 1.5, -0.18);

    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), material);
    leftArm.position.set(-0.38, 0.86, 0);
    leftArm.name = 'leftArm';
    leftArm.castShadow = true;

    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), material);
    rightArm.position.set(0.38, 0.86, 0);
    rightArm.name = 'rightArm';
    rightArm.castShadow = true;

    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), limbMat);
    leftLeg.position.set(-0.15, 0.28, 0);
    leftLeg.name = 'leftLeg';
    leftLeg.castShadow = true;

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), limbMat);
    rightLeg.position.set(0.15, 0.28, 0);
    rightLeg.name = 'rightLeg';
    rightLeg.castShadow = true;

    const shieldAura = new THREE.Mesh(
      new THREE.RingGeometry(0.76, 0.9, 32),
      new THREE.MeshBasicMaterial({
        color: '#818cf8',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      }),
    );
    shieldAura.rotation.x = -Math.PI / 2;
    shieldAura.position.y = 0.06;
    shieldAura.name = 'shieldAura';
    shieldAura.visible = false;

    bodyGroup.add(torso, head, visor, leftArm, rightArm, leftLeg, rightLeg, shieldAura);
    group.add(bodyGroup);
  } else {
    let geom: THREE.BufferGeometry;
    if (role === 'powerup') {
      geom = new THREE.OctahedronGeometry(0.52, 0);
    } else {
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
        opacity: 0.76,
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
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const levelFileInputRef = useRef<HTMLInputElement | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const transformRef = useRef<TransformControls | null>(null);
  const boxHelperRef = useRef<THREE.BoxHelper | null>(null);
  const lightsRef = useRef<{
    ambient: THREE.AmbientLight;
    dir: THREE.DirectionalLight;
    grid: THREE.GridHelper;
  } | null>(null);
  const isGizmoDraggingRef = useRef(false);
  const musicLoopRef = useRef<SynthMusicLoop | null>(null);

  const meshMapRef = useRef<Map<string, THREE.Group>>(new Map());
  const keysRef = useRef<Record<string, boolean>>({});
  const particlesRef = useRef<Array<{ mesh: THREE.Mesh; vel: THREE.Vector3; life: number }>>([]);
  const projectilesRef = useRef<Array<{ mesh: THREE.Mesh; dir: THREE.Vector3; life: number }>>([]);
  const enemyShotsRef = useRef<Array<{ mesh: THREE.Mesh; dir: THREE.Vector3; life: number }>>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [gizmoMode, setGizmoMode] = useState<GizmoMode>('translate');
  const [snapSize, setSnapSize] = useState<number>(0);
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('tps');
  const [skyTheme, setSkyTheme] = useState<SkyThemeId>('cyber');
  const [rightTab, setRightTab] = useState<'entities' | 'rules'>('entities');
  const [aiPrompt, setAiPrompt] = useState(
    '5 altın, hareketli platform, trambolin ve 2 takipçi botlu neon parkur',
  );
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [sfxMuted, setSfxMuted] = useState(false);
  const [actionPopup, setActionPopup] = useState<string | null>(null);
  const popupTimerRef = useRef<number | null>(null);

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
  const sfxMutedRef = useRef<boolean>(sfxMuted);
  sfxMutedRef.current = sfxMuted;

  const playStateRef = useRef({
    playing: false,
    score: 0,
    coins: 0,
    totalCoins: 0,
    hp: 3,
    elapsed: 0,
    fps: 60,
    shieldTimer: 0,
    outcome: 'idle' as 'idle' | 'playing' | 'won' | 'lost',
    vy: 0,
    grounded: false,
    jumpsUsed: 0,
    jumpQueued: false,
    dashTimer: 0,
    dashCd: 0,
    shootCd: 0,
    yaw: 0,
    walkPhase: 0,
    invuln: 0,
    collectedIds: new Set<string>(),
    powerupIds: new Set<string>(),
    defeatedNpcIds: new Set<string>(),
    checkpointIds: new Set<string>(),
    npcFireCd: new Map<string, number>(),
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
    fps: 60,
    shieldActive: false,
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

  const triggerPopup = useCallback((msg: string) => {
    setActionPopup(msg);
    if (popupTimerRef.current !== null) window.clearTimeout(popupTimerRef.current);
    popupTimerRef.current = window.setTimeout(() => setActionPopup(null), 1500);
  }, []);

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
    ps.shootCd = 0.24;
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
    playGameSfx('shoot', sfxMutedRef.current);
  }, []);

  const triggerDash = useCallback(() => {
    const ps = playStateRef.current;
    if (!ps.playing || ps.outcome !== 'playing' || !rulesRef.current.dashEnabled || ps.dashCd > 0) {
      return;
    }
    ps.dashTimer = 0.18;
    ps.dashCd = 0.95;
    spawnParticleBurst(ps.playerPos, '#38bdf8', 9);
    playGameSfx('dash', sfxMutedRef.current);
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
    for (const e of enemyShotsRef.current) scene.remove(e.mesh);
    enemyShotsRef.current = [];

    meshMapRef.current.forEach((grp) => scene.remove(grp));
    meshMapRef.current.clear();

    for (const obj of objectsRef.current) {
      if (!obj.visible) continue;
      const grp = buildMeshForObject(obj);
      scene.add(grp);
      meshMapRef.current.set(obj.id, grp);
    }
  }, []);

  // Sync music loop with isPlaying + musicEnabled
  useEffect(() => {
    if (!musicLoopRef.current) {
      musicLoopRef.current = new SynthMusicLoop();
    }
    if (isPlaying && musicEnabled && !sfxMuted) {
      musicLoopRef.current.start();
    } else {
      musicLoopRef.current.stop();
    }
    return () => {
      musicLoopRef.current?.stop();
    };
  }, [isPlaying, musicEnabled, sfxMuted]);

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

  // Sync TransformControls gizmo + Grid Snap
  useEffect(() => {
    const scene = sceneRef.current;
    const tControls = transformRef.current;
    if (!scene || !tControls) return;

    if (boxHelperRef.current) {
      scene.remove(boxHelperRef.current);
      boxHelperRef.current = null;
    }

    tControls.setTranslationSnap(snapSize > 0 ? snapSize : null);
    tControls.setRotationSnap(snapSize > 0 ? THREE.MathUtils.degToRad(15) : null);

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
  }, [selectedObj, gizmoMode, snapSize, isPlaying, objects3d]);

  // Initialize Three.js viewport + Engine Loop
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
    let frameCount = 0;
    let fpsClock = performance.now();

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      frameCount += 1;
      if (now - fpsClock >= 450) {
        playStateRef.current.fps = Math.round((frameCount * 1000) / Math.max(1, now - fpsClock));
        frameCount = 0;
        fpsClock = now;
      }

      const ps = playStateRef.current;
      const list = objectsRef.current;
      const curRules = rulesRef.current;

      // Particles update
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

      // Spin collectibles, powerups, portals
      for (const obj of list) {
        const grp = meshMapRef.current.get(obj.id);
        if (!grp) continue;
        const role = inferRole(obj);
        if (role === 'collectible' || role === 'powerup') grp.rotation.y += dt * 2.5;
        else if (role === 'goal' || role === 'checkpoint') grp.rotation.y += dt * 1.2;
      }

      if (ps.playing && ps.outcome === 'playing') {
        ps.elapsed += dt;
        if (ps.dashTimer > 0) ps.dashTimer -= dt;
        if (ps.dashCd > 0) ps.dashCd -= dt;
        if (ps.shootCd > 0) ps.shootCd -= dt;
        if (ps.shieldTimer > 0) ps.shieldTimer -= dt;

        // Moving platforms
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

        // Smart NPC AI (patrol / chase / turret)
        for (const obj of list) {
          if (inferRole(obj) !== 'npc' || ps.defeatedNpcIds.has(obj.id)) continue;
          const grp = meshMapRef.current.get(obj.id);
          if (!grp) continue;
          const behavior = obj.npcBehavior ?? 'patrol';
          const speed = obj.moveSpeed ?? 2.6;
          const distToPlayer = grp.position.distanceTo(ps.playerPos);

          if (behavior === 'chase' && distToPlayer < 13) {
            const dirVec = new THREE.Vector3().subVectors(ps.playerPos, grp.position);
            dirVec.y = 0;
            if (dirVec.length() > 0.35) {
              dirVec.normalize();
              grp.position.addScaledVector(dirVec, speed * 0.85 * dt);
              grp.rotation.y = Math.atan2(-dirVec.x, -dirVec.z);
            }
          } else if (behavior === 'turret') {
            grp.rotation.y += dt * 1.4;
            const cd = (ps.npcFireCd.get(obj.id) ?? 1.2) - dt;
            if (cd <= 0 && distToPlayer < 17) {
              ps.npcFireCd.set(obj.id, 2.2);
              const orb = new THREE.Mesh(
                new THREE.SphereGeometry(0.22, 10, 10),
                new THREE.MeshBasicMaterial({ color: '#f43f5e' }),
              );
              orb.position.copy(grp.position);
              scene.add(orb);
              const shotDir = new THREE.Vector3().subVectors(ps.playerPos, grp.position);
              shotDir.y = 0;
              shotDir.normalize();
              enemyShotsRef.current.push({ mesh: orb, dir: shotDir, life: 2.2 });
            } else {
              ps.npcFireCd.set(obj.id, cd);
            }
          } else {
            const range = obj.patrolRange ?? 2.8;
            grp.position.x = obj.position.x + Math.sin(ps.elapsed * speed * 0.7) * range;
          }
        }

        // Player Projectiles vs NPCs
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
              playGameSfx('coin', sfxMutedRef.current);
              triggerPopup('BOT YOK EDİLDİ +150!');
              break;
            }
          }
          if (hit || proj.life <= 0) {
            scene.remove(proj.mesh);
            projectilesRef.current.splice(i, 1);
          }
        }

        // Turret Enemy Orbs vs Player
        for (let i = enemyShotsRef.current.length - 1; i >= 0; i--) {
          const es = enemyShotsRef.current[i];
          es.life -= dt;
          es.mesh.position.addScaledVector(es.dir, 10.5 * dt);
          if (
            ps.shieldTimer <= 0 &&
            ps.invuln <= 0 &&
            es.mesh.position.distanceTo(ps.playerPos) < 0.95
          ) {
            ps.hp -= 1;
            ps.invuln = 1.0;
            ps.vy = 5.2;
            es.life = 0;
            spawnParticleBurst(ps.playerPos, '#f43f5e', 10);
            playGameSfx('hit', sfxMutedRef.current);
            triggerPopup('-1 CAN!');
          }
          if (es.life <= 0) {
            scene.remove(es.mesh);
            enemyShotsRef.current.splice(i, 1);
          }
        }

        const playerCfg = list.find((o) => o.id === ps.playerId);
        const playerGrp = meshMapRef.current.get(ps.playerId);
        if (playerGrp) {
          playerGrp.visible = cameraModeRef.current !== 'fps';
          const shieldMesh = playerGrp.getObjectByName('shieldAura');
          if (shieldMesh) shieldMesh.visible = ps.shieldTimer > 0;

          const k = keysRef.current;
          const dx =
            (k['KeyD'] || k['ArrowRight'] || k['PadRight'] ? 1 : 0) -
            (k['KeyA'] || k['ArrowLeft'] || k['PadLeft'] ? 1 : 0);
          const dz =
            (k['KeyS'] || k['ArrowDown'] || k['PadDown'] ? 1 : 0) -
            (k['KeyW'] || k['ArrowUp'] || k['PadUp'] ? 1 : 0);

          const baseSpeed = playerCfg?.moveSpeed ?? 7.8;
          const moveSpeed = baseSpeed * (ps.dashTimer > 0 ? 2.4 : ps.shieldTimer > 0 ? 1.25 : 1);
          const jumpForce = playerCfg?.jumpForce ?? 10.6;
          const isMoving = dx !== 0 || dz !== 0;

          if (isMoving) {
            const len = Math.hypot(dx, dz);
            ps.playerPos.x += (dx / len) * moveSpeed * dt;
            ps.playerPos.z += (dz / len) * moveSpeed * dt;
            ps.yaw = Math.atan2(-dx, -dz);
            playerGrp.rotation.y = ps.yaw;
            ps.walkPhase += dt * 12;
          }

          // Animate articulated limbs (walk cycle / airborne tuck)
          const lArm = playerGrp.getObjectByName('leftArm');
          const rArm = playerGrp.getObjectByName('rightArm');
          const lLeg = playerGrp.getObjectByName('leftLeg');
          const rLeg = playerGrp.getObjectByName('rightLeg');
          if (lArm && rArm && lLeg && rLeg) {
            if (!ps.grounded) {
              lArm.rotation.x = -0.8;
              rArm.rotation.x = -0.8;
              lLeg.rotation.x = 0.4;
              rLeg.rotation.x = -0.35;
            } else if (isMoving) {
              lLeg.rotation.x = Math.sin(ps.walkPhase) * 0.65;
              rLeg.rotation.x = -Math.sin(ps.walkPhase) * 0.65;
              lArm.rotation.x = -Math.sin(ps.walkPhase) * 0.55;
              rArm.rotation.x = Math.sin(ps.walkPhase) * 0.55;
            } else {
              lArm.rotation.x = rArm.rotation.x = lLeg.rotation.x = rLeg.rotation.x = 0;
            }
          }

          if (ps.jumpQueued || k['PadJump']) {
            const maxJumps = curRules.doubleJump ? 2 : 1;
            if (ps.grounded || ps.jumpsUsed < maxJumps) {
              ps.vy = jumpForce;
              ps.grounded = false;
              ps.jumpsUsed += 1;
              spawnParticleBurst(ps.playerPos, '#38bdf8', 7);
              playGameSfx('jump', sfxMutedRef.current);
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
                  if (prev) ps.playerPos.add(new THREE.Vector3().subVectors(grp.position, prev));
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
              playGameSfx('bounce', sfxMutedRef.current);
            }
          }

          // Out of bounds respawn
          if (ps.playerPos.y < -12) {
            ps.hp -= 1;
            ps.playerPos.copy(ps.spawnPos);
            ps.vy = 0;
            playGameSfx('hit', sfxMutedRef.current);
            triggerPopup('DÜŞTÜ! -1 CAN');
          }

          // Power-Ups (Shield + Magnet + Speed)
          for (const obj of list) {
            if (!obj.visible || inferRole(obj) !== 'powerup') continue;
            if (ps.powerupIds.has(obj.id)) continue;
            const grp = meshMapRef.current.get(obj.id);
            if (!grp) continue;
            if (ps.playerPos.distanceTo(grp.position) < 1.45) {
              ps.powerupIds.add(obj.id);
              grp.visible = false;
              ps.shieldTimer = 7.0;
              ps.score += 75;
              spawnParticleBurst(grp.position, '#818cf8', 15);
              playGameSfx('powerup', sfxMutedRef.current);
              triggerPopup('KALKAN + MIKNATIS AKTİF (7s)!');
            }
          }

          // Collectibles (with magnet attraction while power-up active!)
          for (const obj of list) {
            if (!obj.visible || inferRole(obj) !== 'collectible') continue;
            if (ps.collectedIds.has(obj.id)) continue;
            const grp = meshMapRef.current.get(obj.id);
            if (!grp) continue;
            if (ps.shieldTimer > 0 && ps.playerPos.distanceTo(grp.position) < 6.5) {
              grp.position.lerp(ps.playerPos, 0.14);
            }
            if (ps.playerPos.distanceTo(grp.position) < 1.35) {
              ps.collectedIds.add(obj.id);
              grp.visible = false;
              ps.coins += 1;
              ps.score += 100;
              spawnParticleBurst(grp.position, '#fbbf24', 12);
              playGameSfx('coin', sfxMutedRef.current);
              triggerPopup('+100 ALTIN!');
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
              playGameSfx('checkpoint', sfxMutedRef.current);
              triggerPopup('CHECKPOINT KAYDEDİLDİ!');
            }
          }

          // Hazards & NPC contact damage (blocked if Shield active!)
          if (ps.invuln > 0) ps.invuln -= dt;
          if (ps.shieldTimer <= 0) {
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
                playGameSfx('hit', sfxMutedRef.current);
                triggerPopup('-1 CAN!');
              }
            }
          }

          // Goal portal check
          for (const obj of list) {
            if (!obj.visible || inferRole(obj) !== 'goal') continue;
            const grp = meshMapRef.current.get(obj.id);
            if (!grp) continue;
            if (ps.playerPos.distanceTo(grp.position) < 1.65) {
              if (!curRules.requireAllCoins || ps.coins >= ps.totalCoins) {
                ps.outcome = 'won';
                ps.score += 500;
                spawnParticleBurst(grp.position, '#10b981', 22);
                playGameSfx('win', sfxMutedRef.current);
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
            const desiredCam = new THREE.Vector3(
              ps.playerPos.x,
              ps.playerPos.y + 5.2,
              ps.playerPos.z + 8.8,
            );
            camera.position.lerp(desiredCam, 0.1);
            controls.target.lerp(new THREE.Vector3(ps.playerPos.x, ps.playerPos.y + 1, ps.playerPos.z), 0.14);
            controls.update();
          }

          // Render 2D Radar Mini-Map
          const radarCanvas = radarCanvasRef.current;
          const rCtx = radarCanvas?.getContext('2d');
          if (rCtx && radarCanvas) {
            const cx = radarCanvas.width / 2;
            const cy = radarCanvas.height / 2;
            rCtx.clearRect(0, 0, radarCanvas.width, radarCanvas.height);
            rCtx.strokeStyle = 'rgba(56,189,248,0.22)';
            rCtx.strokeRect(2, 2, radarCanvas.width - 4, radarCanvas.height - 4);
            for (const obj of list) {
              const role = inferRole(obj);
              if (role === 'collectible' && ps.collectedIds.has(obj.id)) continue;
              if (role === 'npc' && ps.defeatedNpcIds.has(obj.id)) continue;
              const grp = meshMapRef.current.get(obj.id);
              if (!grp) continue;
              if (role !== 'collectible' && role !== 'npc' && role !== 'goal' && role !== 'powerup') continue;
              const rx = cx + (grp.position.x - ps.playerPos.x) * 2.6;
              const ry = cy + (grp.position.z - ps.playerPos.z) * 2.6;
              if (rx < 4 || rx > radarCanvas.width - 4 || ry < 4 || ry > radarCanvas.height - 4) continue;
              rCtx.fillStyle =
                role === 'collectible'
                  ? '#fbbf24'
                  : role === 'npc'
                    ? '#a855f7'
                    : role === 'powerup'
                      ? '#818cf8'
                      : '#10b981';
              rCtx.beginPath();
              rCtx.arc(rx, ry, role === 'goal' ? 3.8 : 2.6, 0, Math.PI * 2);
              rCtx.fill();
            }
            rCtx.fillStyle = '#38bdf8';
            rCtx.beginPath();
            rCtx.arc(cx, cy, 3.8, 0, Math.PI * 2);
            rCtx.fill();
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
            fps: ps.fps,
            shieldActive: ps.shieldTimer > 0,
            outcome: ps.outcome,
          });
        }
      } else {
        if (now - lastHudSync > 250) {
          lastHudSync = now;
          setHud((prev) => ({ ...prev, fps: ps.fps }));
        }
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
  }, [rebuildSceneObjects, setSelectedObject3DId, skyTheme, spawnParticleBurst, triggerPopup, update3DObject]);

  useEffect(() => {
    if (!isPlaying) {
      rebuildSceneObjects();
    }
  }, [objects3d, isPlaying, rebuildSceneObjects]);

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
    setActionPopup(null);
    setHud((prev) => ({ ...prev, outcome: 'idle', shieldActive: false }));
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
      fps: playStateRef.current.fps,
      shieldTimer: 0,
      outcome: 'playing',
      vy: 0,
      grounded: false,
      jumpsUsed: 0,
      jumpQueued: false,
      dashTimer: 0,
      dashCd: 0,
      shootCd: 0,
      yaw: 0,
      walkPhase: 0,
      invuln: 0,
      collectedIds: new Set<string>(),
      powerupIds: new Set<string>(),
      defeatedNpcIds: new Set<string>(),
      checkpointIds: new Set<string>(),
      npcFireCd: new Map<string, number>(),
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
      fps: playStateRef.current.fps,
      shieldActive: false,
      outcome: 'playing',
    });
    setIsPlaying(true);
    setStatusNotice(null);
  }, [add3DObject, rebuildSceneObjects]);

  const handleLoadTemplate = (kind: 'platformer' | 'arena' | 'tower' | 'space') => {
    if (isPlaying) stopPlaytest();
    const items = makeTemplate(kind);
    replace3DObjects(items);
    setSelectedObject3DId(items[0]?.id ?? null);
    if (kind === 'space') setSkyTheme('neon');
    setStatusNotice(
      kind === 'platformer'
        ? 'Obby Parkur (Takipçi Bot + Power-Up + Checkpoint) yüklendi!'
        : kind === 'tower'
          ? 'Dikey Kule şablonu yüklendi. Taretlere dikkat edip zirveye tırmanın!'
          : kind === 'space'
            ? 'Uzay İstasyonu yüklendi! Mıknatıs + Taret + Hiper Trambolin hazır.'
            : 'Savaş Arenası yüklendi. F tuşu ile düşmanları vurun!',
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

  const handleDuplicateSelected = () => {
    if (!selectedObj || isPlaying) return;
    add3DObject(selectedObj.kind, {
      name: `${selectedObj.name} Kopya`,
      gameRole: inferRole(selectedObj),
      position: {
        x: selectedObj.position.x + 1.5,
        y: selectedObj.position.y,
        z: selectedObj.position.z,
      },
      rotation: { ...selectedObj.rotation },
      scale: { ...selectedObj.scale },
      color: selectedObj.color,
      moveSpeed: selectedObj.moveSpeed,
      jumpForce: selectedObj.jumpForce,
      patrolRange: selectedObj.patrolRange,
      patrolAxis: selectedObj.patrolAxis,
      bounceForce: selectedObj.bounceForce,
      npcBehavior: selectedObj.npcBehavior,
      powerupType: selectedObj.powerupType,
    });
    setStatusNotice(`"${selectedObj.name}" çoğaltıldı.`);
  };

  const handleFocusSelected = () => {
    if (!selectedObj || !controlsRef.current || !cameraRef.current || isPlaying) return;
    const p = selectedObj.position;
    controlsRef.current.target.set(p.x, p.y, p.z);
    cameraRef.current.position.set(p.x + 6, p.y + 4.5, p.z + 7);
    controlsRef.current.update();
  };

  const handleExportLevelJson = () => {
    const data = JSON.stringify({ cameraMode, skyTheme, rules, objects3d }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(project.name || 'alpemox').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.alpemox-level.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusNotice('Seviye JSON dosyası (.alpemox-level.json) kaydedildi.');
  };

  const handleImportLevelJson = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (Array.isArray(parsed.objects3d)) {
          if (isPlaying) stopPlaytest();
          replace3DObjects(parsed.objects3d as StageObject3D[]);
          if (parsed.cameraMode) setCameraMode(parsed.cameraMode as CameraViewMode);
          if (parsed.skyTheme) setSkyTheme(parsed.skyTheme as SkyThemeId);
          if (parsed.rules) setRules(parsed.rules as GameRulesConfig);
          setStatusNotice(`${file.name} başarıyla yüklendi (${parsed.objects3d.length} varlık).`);
        }
      } catch {
        setStatusNotice('Geçersiz seviye JSON dosyası.');
      }
    };
    reader.readAsText(file);
    ev.target.value = '';
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
    } else if (role === 'powerup') {
      add3DObject('sphere', {
        name: `Power-Up ${objects3d.length + 1}`,
        gameRole: 'powerup',
        position: { x: offset, y: 1.4, z: 2 },
        scale: { x: 0.85, y: 0.85, z: 0.85 },
        color: '#6366f1',
        powerupType: 'magnet',
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
        name: `Takipçi Bot ${objects3d.length + 1}`,
        gameRole: 'npc',
        position: { x: offset, y: 1, z: -3 },
        scale: { x: 0.95, y: 1.35, z: 0.95 },
        color: '#a855f7',
        moveSpeed: 2.8,
        patrolRange: 2.8,
        npcBehavior: 'chase',
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
    setStatusNotice('Tek dosya oynanabilir 3D Web Oyunu (.HTML v3) indirildi!');
  };

  const setVirtualPadKey = (code: string, active: boolean) => {
    keysRef.current[code] = active;
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-[#080b12] text-slate-100 select-none">
      {/* Row 1: Playtest, Gizmo + Grid Snap, Camera, Sky, Audio, Templates & Export */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#0d121d] px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
            <Gamepad2 className="h-4 w-4" />
            <span>Alpemox Game v3 ★</span>
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
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-200 hover:bg-white/10"
            title="Sıfırla"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          {/* Transform Gizmo Mode Switcher */}
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

          {/* Grid Snap Toggle */}
          <button
            type="button"
            data-testid="grid-snap-btn"
            onClick={() => setSnapSize((s) => (s === 0 ? 0.5 : s === 0.5 ? 1 : 0))}
            disabled={isPlaying}
            className={`rounded-lg border px-2 py-1 text-[11px] font-medium ${
              snapSize > 0
                ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
                : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
            }`}
            title="Gizmo Izgara Kilidi (Snap)"
          >
            Snap: {snapSize > 0 ? `${snapSize}m` : 'Kapalı'}
          </button>

          {/* Camera & Sky */}
          <label className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-300">
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
                Kuşbakışı
              </option>
              <option value="fps" className="bg-slate-900">
                FPS Kamera
              </option>
            </select>
          </label>

          <label className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-300">
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

          {/* Synth Music & Mute */}
          <button
            type="button"
            data-testid="music-toggle-btn"
            onClick={() => setMusicEnabled((v) => !v)}
            className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] ${
              musicEnabled
                ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
            }`}
            title="Playtest Synth Müzik"
          >
            <Music className="h-3 w-3" /> Müzik
          </button>

          <button
            type="button"
            onClick={() => setSfxMuted((v) => !v)}
            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:bg-white/10"
            title={sfxMuted ? 'Sesi Aç' : 'Sesi Kapat'}
          >
            {sfxMuted ? <VolumeX className="h-3.5 w-3.5 text-rose-400" /> : <Volume2 className="h-3.5 w-3.5 text-sky-300" />}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleLoadTemplate('platformer')}
            data-testid="template-platformer-btn"
            className="flex items-center gap-1 rounded-lg border border-sky-400/30 bg-sky-500/10 px-2 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-500/20"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Obby Parkur
          </button>
          <button
            type="button"
            onClick={() => handleLoadTemplate('arena')}
            data-testid="template-arena-btn"
            className="flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/20"
          >
            <Trophy className="h-3.5 w-3.5" />
            Savaş Arenası
          </button>
          <button
            type="button"
            onClick={() => handleLoadTemplate('tower')}
            data-testid="template-tower-btn"
            className="flex items-center gap-1 rounded-lg border border-lime-400/30 bg-lime-500/10 px-2 py-1.5 text-xs font-medium text-lime-200 hover:bg-lime-500/20"
          >
            <Zap className="h-3.5 w-3.5" />
            Dikey Kule
          </button>
          <button
            type="button"
            onClick={() => handleLoadTemplate('space')}
            data-testid="template-space-btn"
            className="flex items-center gap-1 rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-2 py-1.5 text-xs font-medium text-indigo-200 hover:bg-indigo-500/20"
          >
            <Rocket className="h-3.5 w-3.5" />
            Uzay İstasyonu
          </button>

          <button
            type="button"
            onClick={() => setViewportMode('3d')}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-300 hover:bg-white/10"
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

      {/* Row 2: Prompt-to-3D Generator + Quick Palette + Save/Load Level */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#0a0e17] px-3 py-2">
        <div className="flex flex-1 min-w-[260px] max-w-xl items-center gap-1.5">
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
              placeholder="Örn: 6 altın, trambolin, hareketli platform ve 2 takipçi botlu kule..."
              className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            data-testid="ai-generate-level-btn"
            onClick={handleAiGenerateLevel}
            className="shrink-0 rounded-lg bg-purple-500/20 border border-purple-400/40 px-2.5 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-500/30 transition"
          >
            Prompt’tan 3D Seviye Üret
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <button type="button" onClick={() => handleQuickAdd('player')} className="flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-1 text-[11px] hover:bg-white/10">
            <User className="h-3 w-3 text-sky-400" /> +Oyuncu
          </button>
          <button type="button" onClick={() => handleQuickAdd('solid')} className="flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-1 text-[11px] hover:bg-white/10">
            <Box className="h-3 w-3 text-slate-300" /> +Zemin
          </button>
          <button type="button" onClick={() => handleQuickAdd('moving')} className="flex items-center gap-1 rounded border border-cyan-400/30 bg-cyan-500/10 px-1.5 py-1 text-[11px] text-cyan-200 hover:bg-cyan-500/20">
            <Move className="h-3 w-3" /> +Hareketli
          </button>
          <button type="button" onClick={() => handleQuickAdd('bounce')} className="flex items-center gap-1 rounded border border-lime-400/30 bg-lime-500/10 px-1.5 py-1 text-[11px] text-lime-200 hover:bg-lime-500/20">
            <Zap className="h-3 w-3" /> +Trambolin
          </button>
          <button type="button" onClick={() => handleQuickAdd('powerup')} className="flex items-center gap-1 rounded border border-indigo-400/30 bg-indigo-500/10 px-1.5 py-1 text-[11px] text-indigo-200 hover:bg-indigo-500/20">
            <Magnet className="h-3 w-3" /> +Güç
          </button>
          <button type="button" onClick={() => handleQuickAdd('collectible')} className="flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-1 text-[11px] hover:bg-white/10">
            <Coins className="h-3 w-3 text-amber-400" /> +Altın
          </button>
          <button type="button" onClick={() => handleQuickAdd('checkpoint')} className="flex items-center gap-1 rounded border border-teal-400/30 bg-teal-500/10 px-1.5 py-1 text-[11px] text-teal-200 hover:bg-teal-500/20">
            <CheckCircle2 className="h-3 w-3" /> +Kayıt
          </button>
          <button type="button" onClick={() => handleQuickAdd('hazard')} className="flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-1 text-[11px] hover:bg-white/10">
            <AlertTriangle className="h-3 w-3 text-rose-400" /> +Engel
          </button>
          <button type="button" onClick={() => handleQuickAdd('npc')} className="flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-1 text-[11px] hover:bg-white/10">
            <Bot className="h-3 w-3 text-purple-400" /> +Bot
          </button>
          <button type="button" onClick={() => handleQuickAdd('goal')} className="flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-1 text-[11px] hover:bg-white/10">
            <Flag className="h-3 w-3 text-emerald-400" /> +Portal
          </button>

          <button
            type="button"
            onClick={handleExportLevelJson}
            className="rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10"
            title="Seviyeyi JSON Kaydet"
          >
            .JSON
          </button>
          <button
            type="button"
            onClick={() => levelFileInputRef.current?.click()}
            className="flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10"
            title="Seviye JSON Yükle"
          >
            <Upload className="h-3 w-3" />
          </button>
          <input
            ref={levelFileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportLevelJson}
          />
        </div>
      </div>

      {/* Main Split */}
      <div className="flex flex-1 min-h-0">
        <div className="relative flex-1 min-w-0 bg-[#070a10]">
          <div ref={canvasHostRef} className="h-full w-full" />

          {/* Live HUD + FPS Telemetry */}
          <div
            data-testid="game-hud"
            className="pointer-events-none absolute top-4 left-4 flex flex-wrap items-center gap-2.5 rounded-xl border border-white/15 bg-slate-950/82 px-3.5 py-2 text-xs backdrop-blur-md shadow-xl"
          >
            <div className="flex items-center gap-1 text-sky-300 font-semibold">
              <Trophy className="h-3.5 w-3.5" />
              <span className="font-mono text-sm text-white" data-testid="hud-score">
                {hud.score}
              </span>
            </div>
            <div className="h-3.5 w-px bg-white/15" />
            <div className="flex items-center gap-1 text-amber-300 font-semibold">
              <Coins className="h-3.5 w-3.5" />
              <span className="font-mono text-sm text-white" data-testid="hud-coins">
                {hud.coins}/{hud.totalCoins}
              </span>
            </div>
            <div className="h-3.5 w-px bg-white/15" />
            <div className="flex items-center gap-1 text-rose-300 font-semibold">
              <Heart className="h-3.5 w-3.5 fill-rose-400/50" />
              <span className="font-mono text-sm text-white" data-testid="hud-hp">
                {hud.hp}
              </span>
            </div>
            <div className="h-3.5 w-px bg-white/15" />
            <div className="text-slate-300 font-mono" data-testid="hud-time">
              {hud.elapsed.toFixed(1)}s
            </div>
            <div className="text-[10px] font-mono text-emerald-400" data-testid="hud-fps">
              {hud.fps} FPS
            </div>
            {hud.shieldActive && (
              <span className="flex items-center gap-1 rounded-full bg-indigo-500/25 border border-indigo-400/50 px-2 py-0.5 text-[10px] font-bold text-indigo-200">
                <Shield className="h-3 w-3" /> KALKAN + MIKNATIS
              </span>
            )}
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

          {/* 2D Live Radar Mini-Map during Playtest */}
          {isPlaying && (
            <canvas
              ref={radarCanvasRef}
              data-testid="game-radar"
              width={96}
              height={96}
              className="pointer-events-none absolute bottom-20 right-4 rounded-xl border border-sky-400/35 bg-slate-950/80 shadow-xl backdrop-blur"
            />
          )}

          {isPlaying && (
            <div className="pointer-events-none absolute top-14 left-4 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-1 text-[10px] text-slate-300 backdrop-blur">
              WASD/Ok: Yürü • Space: 2x Zıpla • Shift: Dash • F: Ateş Et
            </div>
          )}

          {actionPopup && (
            <div className="pointer-events-none absolute top-24 left-4 rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-200 shadow-lg backdrop-blur">
              {actionPopup}
            </div>
          )}

          {statusNotice && !isPlaying && (
            <div className="pointer-events-none absolute top-4 right-4 max-w-sm rounded-xl border border-sky-400/30 bg-slate-900/90 px-3.5 py-2 text-xs text-sky-200 shadow-lg backdrop-blur">
              {statusNotice}
            </div>
          )}

          {/* On-Screen Playtest Controls */}
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

        {/* Right Side: Entities & Visual Event Rules Inspector */}
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
                          {role === 'npc' && obj.npcBehavior && (
                            <span className="text-[10px] uppercase text-purple-300">
                              {obj.npcBehavior}
                            </span>
                          )}
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
                <div className="border-t border-white/10 bg-[#0d121d] p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">{selectedObj.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleFocusSelected}
                        className="rounded p-1 text-cyan-400 hover:bg-cyan-500/15"
                        title="Kamerayı Odakla"
                      >
                        <Focus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        data-testid="duplicate-entity-btn"
                        onClick={handleDuplicateSelected}
                        className="rounded p-1 text-amber-400 hover:bg-amber-500/15"
                        title="Varlığı Çoğalt"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
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

                  {inferRole(selectedObj) === 'npc' && (
                    <label className="block space-y-1">
                      <span className="text-[11px] text-slate-400">Bot Yapay Zeka Modu (AI)</span>
                      <select
                        data-testid="npc-behavior-select"
                        value={selectedObj.npcBehavior ?? 'patrol'}
                        onChange={(e) =>
                          update3DObject(selectedObj.id, {
                            npcBehavior: e.target.value as 'patrol' | 'chase' | 'turret',
                          })
                        }
                        className="w-full rounded-lg border border-purple-400/30 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100"
                      >
                        <option value="patrol">Devriye Gez (Patrol)</option>
                        <option value="chase">Oyuncuyu Takip Et (Chase AI)</option>
                        <option value="turret">Ateş Eden Taret (Turret)</option>
                      </select>
                    </label>
                  )}

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
                    'Takipçi ve Taret botları vurarak +150 skorla yok eder.',
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
