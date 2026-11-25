import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { clonePose, type GameRole, type StageObject3D } from '@opencraft/shared';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bot,
  Brain,
  Check,
  ChevronDown,
  Coins,
  Copy,
  Crosshair,
  Download,
  Focus,
  Gamepad2,
  Heart,
  Layers,
  Maximize2,
  MessageSquare,
  Move,
  Play,
  Plug,
  Plus,
  RotateCcw,
  RotateCw,
  Send,
  Settings2,
  Shield,
  Sliders,
  Sparkles,
  Square,
  Terminal,
  Trash2,
  Trophy,
  Undo2,
  Upload,
  Wand2,
  Zap,
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { callGameAi, compileCustomBotFn, type GameAiConfig, type GameAiProvider } from './game/gameAiClient';
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

function buildMeshForObject(obj: StageObject3D, showColliders = false): THREE.Group {
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
        role === 'powerup' ||
        obj.npcBehavior === 'companion'
        ? obj.color
        : '#000000',
    ),
    emissiveIntensity:
      role === 'goal' || role === 'powerup' || obj.npcBehavior === 'companion'
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
        color: obj.npcBehavior === 'companion' ? '#2dd4bf' : ROLE_META[role].ringColor,
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

  if (showColliders) {
    const wire = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.04, 1.04, 1.04)),
      new THREE.LineBasicMaterial({
        color: role === 'hazard' ? '#f43f5e' : role === 'bounce' ? '#84cc16' : '#38bdf8',
      }),
    );
    if (role === 'player') wire.position.y = 0.85;
    group.add(wire);
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
    providerStatus,
    ollamaReachable,
    ollamaModels,
    wsConnected,
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
  const [rightTab, setRightTab] = useState<'entities' | 'ai' | 'rules'>('entities');
  const [openMenu, setOpenMenu] = useState<'templates' | 'add' | 'settings' | null>(null);
  const [aiPrompt, setAiPrompt] = useState('4 altın, hareketli platform ve AI yoldaşlı uzay parkuru');
  const [aiBusy, setAiBusy] = useState(false);

  const [musicEnabled, setMusicEnabled] = useState(false);
  const [sfxMuted, setSfxMuted] = useState(false);
  const [showColliders, setShowColliders] = useState(false);
  const [timeScale, setTimeScale] = useState<number>(1);
  const [bestScore, setBestScore] = useState<number>(() => {
    try {
      return Number(window.localStorage.getItem('alpemox-game-best-score') || 0);
    } catch {
      return 0;
    }
  });
  const [undoCount, setUndoCount] = useState(0);
  const undoStackRef = useRef<StageObject3D[][]>([]);
  const [actionPopup, setActionPopup] = useState<string | null>(null);
  const popupTimerRef = useRef<number | null>(null);

  // In-game AI Chat overlay
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatReply, setChatReply] = useState<string | null>(null);
  const [chatBusy, setChatBusy] = useState(false);

  // Claude / Cursor / Antigravity MCP Config fetched dynamically from server
  const [mcpConfig, setMcpConfig] = useState<{
    claudeCliCommand: string;
    mcpJsonConfig: Record<string, unknown>;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // User's Custom / Open-Source Local AI Config
  const [aiConfig, setAiConfig] = useState<GameAiConfig>({
    provider: ollamaReachable ? 'ollama' : 'builtin',
    ollamaUrl: providerStatus?.ollamaUrl || 'http://127.0.0.1:11434',
    ollamaModel: ollamaModels[0] || providerStatus?.ollamaModel || 'llama3.2',
    customBaseUrl: 'http://127.0.0.1:1234/v1',
    customModel: 'local-model',
    customApiKey: '',
    systemPrompt:
      'Sen bu oyunun dost canlısı AI rehberisin. Oyuncuya kısa Türkçe ipuçları ve moral ver.',
    customBotRule: 'none',
    customBotJs: 'if (dist < 10) { vx = (dx / (dist + 0.1)) * speed; vz = (dz / (dist + 0.1)) * speed; }',
  });
  const [aiTestNote, setAiTestNote] = useState<string | null>(null);

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
  const showCollidersRef = useRef<boolean>(showColliders);
  showCollidersRef.current = showColliders;
  const timeScaleRef = useRef<number>(timeScale);
  timeScaleRef.current = timeScale;
  const aiConfigRef = useRef<GameAiConfig>(aiConfig);
  aiConfigRef.current = aiConfig;

  const customBotFn = useMemo(
    () => compileCustomBotFn(aiConfig.customBotRule, aiConfig.customBotJs),
    [aiConfig.customBotRule, aiConfig.customBotJs],
  );
  const customBotFnRef = useRef(customBotFn);
  customBotFnRef.current = customBotFn;

  const playStateRef = useRef({
    playing: false,
    score: 0,
    coins: 0,
    totalCoins: 0,
    hp: 3,
    elapsed: 0,
    fps: 60,
    combo: 0,
    comboTimer: 0,
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
    combo: 0,
    shieldActive: false,
    outcome: 'idle' as 'idle' | 'playing' | 'won' | 'lost',
  });
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const objects3d = project.objects3d;
  const objectsRef = useRef<StageObject3D[]>(objects3d);
  objectsRef.current = objects3d;

  const pushHistory = useCallback(() => {
    const snap = objectsRef.current.map((o) => ({
      ...o,
      position: { ...o.position },
      rotation: { ...o.rotation },
      scale: { ...o.scale },
    }));
    undoStackRef.current = [...undoStackRef.current.slice(-19), snap];
    setUndoCount(undoStackRef.current.length);
  }, []);

  const handleUndo = useCallback(() => {
    if (playStateRef.current.playing) return;
    const prev = undoStackRef.current.pop();
    setUndoCount(undoStackRef.current.length);
    if (prev) {
      replace3DObjects(prev);
      setStatusNotice('Son sahne değişikliği geri alındı (Undo).');
    }
  }, [replace3DObjects]);

  const selectedObj = useMemo(
    () => objects3d.find((o) => o.id === selectedObject3DId) ?? objects3d[0] ?? null,
    [objects3d, selectedObject3DId],
  );

  const triggerPopup = useCallback((msg: string) => {
    setActionPopup(msg);
    if (popupTimerRef.current !== null) window.clearTimeout(popupTimerRef.current);
    popupTimerRef.current = window.setTimeout(() => setActionPopup(null), 1600);
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
      const grp = buildMeshForObject(obj, showCollidersRef.current);
      scene.add(grp);
      meshMapRef.current.set(obj.id, grp);
    }
  }, []);

  useEffect(() => {
    if (!musicLoopRef.current) musicLoopRef.current = new SynthMusicLoop();
    if (isPlaying && musicEnabled && !sfxMuted) musicLoopRef.current.start();
    else musicLoopRef.current.stop();
    return () => musicLoopRef.current?.stop();
  }, [isPlaying, musicEnabled, sfxMuted]);

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

    // 3D Starfield for depth atmosphere
    const starPositions = new Float32Array(420 * 3);
    for (let i = 0; i < 420; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 140;
      starPositions[i * 3 + 1] = Math.random() * 60 + 2;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 140;
    }
    const starGeom = new THREE.BufferGeometry();
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starField = new THREE.Points(
      starGeom,
      new THREE.PointsMaterial({ color: '#bae6fd', size: 0.28, transparent: true, opacity: 0.72 }),
    );
    scene.add(starField);

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
        if (cur?.userData.objectId) setSelectedObject3DId(cur.userData.objectId as string);
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
      const rawDt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      const dt = rawDt * timeScaleRef.current;
      lastTime = now;

      starField.rotation.y += rawDt * 0.015;

      frameCount += 1;
      if (now - fpsClock >= 450) {
        playStateRef.current.fps = Math.round((frameCount * 1000) / Math.max(1, now - fpsClock));
        frameCount = 0;
        fpsClock = now;
      }

      const ps = playStateRef.current;
      const list = objectsRef.current;
      const curRules = rulesRef.current;

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

      for (const obj of list) {
        const grp = meshMapRef.current.get(obj.id);
        if (!grp) continue;
        const role = inferRole(obj);
        if (role === 'collectible' || role === 'powerup') grp.rotation.y += dt * 2.5;
        else if (role === 'goal' || role === 'checkpoint') grp.rotation.y += dt * 1.2;
      }

      if (ps.playing && ps.outcome === 'playing') {
        ps.elapsed += dt;
        if (ps.comboTimer > 0) {
          ps.comboTimer -= dt;
          if (ps.comboTimer <= 0) ps.combo = 0;
        }
        if (ps.dashTimer > 0) ps.dashTimer -= dt;
        if (ps.dashCd > 0) ps.dashCd -= dt;
        if (ps.shootCd > 0) ps.shootCd -= dt;
        if (ps.shieldTimer > 0) ps.shieldTimer -= dt;

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

        // NPC AI (Companion + Custom JS AI + Chase + Turret + Patrol)
        const customAiTick = customBotFnRef.current;
        for (const obj of list) {
          if (inferRole(obj) !== 'npc' || ps.defeatedNpcIds.has(obj.id)) continue;
          const grp = meshMapRef.current.get(obj.id);
          if (!grp) continue;
          const behavior = obj.npcBehavior ?? 'patrol';
          const speed = obj.moveSpeed ?? 2.6;
          const dxP = ps.playerPos.x - grp.position.x;
          const dzP = ps.playerPos.z - grp.position.z;
          const distToPlayer = Math.hypot(dxP, dzP);

          if (behavior === 'companion') {
            const target = new THREE.Vector3(
              ps.playerPos.x - 1.9,
              ps.playerPos.y + 0.85 + Math.sin(ps.elapsed * 3) * 0.25,
              ps.playerPos.z + 1.2,
            );
            grp.position.lerp(target, 0.045);
            grp.rotation.y += dt * 1.6;
          } else if (customAiTick) {
            const out = customAiTick({
              dist: distToPlayer,
              dx: dxP,
              dz: dzP,
              elapsed: ps.elapsed,
              baseSpeed: speed,
            });
            grp.position.x += out.vx * dt;
            grp.position.z += out.vz * dt;
          } else if (behavior === 'chase' && distToPlayer < 13) {
            if (distToPlayer > 0.35) {
              grp.position.x += (dxP / distToPlayer) * speed * 0.85 * dt;
              grp.position.z += (dzP / distToPlayer) * speed * 0.85 * dt;
              grp.rotation.y = Math.atan2(-dxP, -dzP);
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
              const shotDir = new THREE.Vector3(dxP, 0, dzP).normalize();
              enemyShotsRef.current.push({ mesh: orb, dir: shotDir, life: 2.2 });
            } else {
              ps.npcFireCd.set(obj.id, cd);
            }
          } else {
            const range = obj.patrolRange ?? 2.8;
            grp.position.x = obj.position.x + Math.sin(ps.elapsed * speed * 0.7) * range;
          }
        }

        // Player Projectiles vs Enemy NPCs
        for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
          const proj = projectilesRef.current[i];
          proj.life -= dt;
          proj.mesh.position.addScaledVector(proj.dir, 22 * dt);
          let hit = false;
          for (const obj of list) {
            if (inferRole(obj) !== 'npc' || obj.npcBehavior === 'companion' || ps.defeatedNpcIds.has(obj.id)) {
              continue;
            }
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

        for (let i = enemyShotsRef.current.length - 1; i >= 0; i--) {
          const es = enemyShotsRef.current[i];
          es.life -= dt;
          es.mesh.position.addScaledVector(es.dir, 10.5 * dt);
          if (ps.shieldTimer <= 0 && ps.invuln <= 0 && es.mesh.position.distanceTo(ps.playerPos) < 0.95) {
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

          if (ps.playerPos.y < -12) {
            ps.hp -= 1;
            ps.playerPos.copy(ps.spawnPos);
            ps.vy = 0;
            playGameSfx('hit', sfxMutedRef.current);
            triggerPopup('DÜŞTÜ! -1 CAN');
          }

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
              triggerPopup('KALKAN + MIKNATIS AKTİF!');
            }
          }

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
              ps.combo = ps.comboTimer > 0 ? Math.min(5, ps.combo + 1) : 1;
              ps.comboTimer = 3.2;
              const pts = 100 * ps.combo;
              ps.score += pts;
              spawnParticleBurst(grp.position, '#fbbf24', 12);
              playGameSfx('coin', sfxMutedRef.current);
              triggerPopup(ps.combo > 1 ? `COMBO x${ps.combo}! +${pts}` : '+100 ALTIN!');
            }
          }

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

          if (ps.invuln > 0) ps.invuln -= dt;
          if (ps.shieldTimer <= 0) {
            for (const obj of list) {
              if (!obj.visible) continue;
              const role = inferRole(obj);
              if (role === 'npc' && (obj.npcBehavior === 'companion' || ps.defeatedNpcIds.has(obj.id))) {
                continue;
              }
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

          for (const obj of list) {
            if (!obj.visible || inferRole(obj) !== 'goal') continue;
            const grp = meshMapRef.current.get(obj.id);
            if (!grp) continue;
            if (ps.playerPos.distanceTo(grp.position) < 1.65) {
              if (!curRules.requireAllCoins || ps.coins >= ps.totalCoins) {
                ps.outcome = 'won';
                ps.score += 500;
                setBestScore((prev) => {
                  const next = Math.max(prev, ps.score);
                  try {
                    window.localStorage.setItem('alpemox-game-best-score', String(next));
                  } catch {
                    // ignore storage quota
                  }
                  return next;
                });
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
                    ? obj.npcBehavior === 'companion'
                      ? '#2dd4bf'
                      : '#a855f7'
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
            combo: ps.combo,
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
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
      meshMapRef.current.clear();
      sceneRef.current = null;
      transformRef.current = null;
    };
  }, [rebuildSceneObjects, setSelectedObject3DId, skyTheme, spawnParticleBurst, triggerPopup, update3DObject]);

  useEffect(() => {
    if (!isPlaying) rebuildSceneObjects();
  }, [objects3d, isPlaying, showColliders, rebuildSceneObjects]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }
      if (!playStateRef.current.playing) {
        if ((e.metaKey || e.ctrlKey) && e.code === 'KeyZ') {
          e.preventDefault();
          handleUndo();
        } else if (e.code === 'KeyT') setGizmoMode('translate');
        else if (e.code === 'KeyR') setGizmoMode('rotate');
        else if (e.code === 'KeyS' && e.shiftKey) setGizmoMode('scale');
        return;
      }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'Space' && !keysRef.current['Space']) playStateRef.current.jumpQueued = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') triggerDash();
      if (e.code === 'KeyF') fireProjectile();
      if (e.code === 'KeyE') setChatOpen((prev) => !prev);
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
  }, [fireProjectile, handleUndo, triggerDash]);

  const stopPlaytest = useCallback(() => {
    playStateRef.current.playing = false;
    playStateRef.current.outcome = 'idle';
    keysRef.current = {};
    setIsPlaying(false);
    setChatOpen(false);
    setActionPopup(null);
    setHud((prev) => ({ ...prev, outcome: 'idle', shieldActive: false }));
    rebuildSceneObjects();
  }, [rebuildSceneObjects]);

  const startPlaytest = useCallback(() => {
    setOpenMenu(null);
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
      combo: 0,
      comboTimer: 0,
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
      combo: 0,
      shieldActive: false,
      outcome: 'playing',
    });
    setIsPlaying(true);
    setStatusNotice(null);
  }, [add3DObject, rebuildSceneObjects]);

  // Fetch local MCP connection snippet + listen for live MCP game-control WebSocket commands
  useEffect(() => {
    fetch('/api/mcp/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.claudeCliCommand) setMcpConfig(d);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const onControl = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as {
        command?: string;
        payload?: Record<string, unknown>;
      };
      if (!detail?.command) return;
      const cmd = detail.command;
      const p = detail.payload || {};
      if (cmd === 'start_playtest') {
        startPlaytest();
      } else if (cmd === 'stop_playtest') {
        stopPlaytest();
      } else if (cmd === 'reset_game') {
        if (playStateRef.current.playing) startPlaytest();
        else rebuildSceneObjects();
      } else if (cmd === 'companion_say' && typeof p.message === 'string') {
        setChatReply(`[Claude / MCP] ${p.message}`);
        setChatOpen(true);
        triggerPopup('Claude / MCP Mesajı!');
      } else if (cmd === 'set_settings') {
        if (typeof p.cameraMode === 'string') setCameraMode(p.cameraMode as CameraViewMode);
        if (typeof p.skyTheme === 'string') setSkyTheme(p.skyTheme as SkyThemeId);
        setRules((prev) => ({
          doubleJump: typeof p.doubleJump === 'boolean' ? p.doubleJump : prev.doubleJump,
          dashEnabled: typeof p.dashEnabled === 'boolean' ? p.dashEnabled : prev.dashEnabled,
          shooterEnabled: typeof p.shooterEnabled === 'boolean' ? p.shooterEnabled : prev.shooterEnabled,
          requireAllCoins: typeof p.requireAllCoins === 'boolean' ? p.requireAllCoins : prev.requireAllCoins,
          gravity: typeof p.gravity === 'number' ? p.gravity : prev.gravity,
        }));
      }
    };
    window.addEventListener('alpemox:game-control', onControl);
    return () => window.removeEventListener('alpemox:game-control', onControl);
  }, [rebuildSceneObjects, startPlaytest, stopPlaytest, triggerPopup]);

  const handleLoadTemplate = (kind: 'platformer' | 'arena' | 'tower' | 'space') => {
    setOpenMenu(null);
    if (isPlaying) stopPlaytest();
    pushHistory();
    const items = makeTemplate(kind);
    replace3DObjects(items);
    setSelectedObject3DId(items[0]?.id ?? null);
    if (kind === 'space') setSkyTheme('neon');
    setStatusNotice(`Şablon yüklendi (${items.length} varlık). Oynat ile hemen deneyin!`);
  };

  const handleAiGenerateLevel = async () => {
    if (isPlaying) stopPlaytest();
    pushHistory();
    setAiBusy(true);
    try {
      const aiRes = await callGameAi('level', aiPrompt, aiConfig);
      const result = generateLevelFromPrompt(aiPrompt, aiRes.levelSpec);
      replace3DObjects(result.objects);
      setSelectedObject3DId(result.objects[0]?.id ?? null);
      if (result.skyTheme) setSkyTheme(result.skyTheme);
      if (result.npcPersona) {
        setAiConfig((prev) => ({ ...prev, systemPrompt: result.npcPersona || prev.systemPrompt }));
      }
      if (aiRes.usedFallback && aiRes.fallbackReason) {
        setStatusNotice(`${result.summary} (${aiRes.fallbackReason})`);
      } else {
        setStatusNotice(`[${aiRes.model}] ${result.summary}`);
      }
    } catch {
      const result = generateLevelFromPrompt(aiPrompt);
      replace3DObjects(result.objects);
      setSelectedObject3DId(result.objects[0]?.id ?? null);
      if (result.skyTheme) setSkyTheme(result.skyTheme);
      setStatusNotice(result.summary);
    } finally {
      setAiBusy(false);
    }
  };

  const handleTestAiConnection = async () => {
    setAiBusy(true);
    setAiTestNote(null);
    try {
      const res = await callGameAi(
        'npc-chat',
        'Merhaba! Kendini 1 kısa cümleyle tanıt.',
        aiConfig,
        { score: 0, coins: 0, totalCoins: 3, hp: 3 },
      );
      setAiTestNote(
        res.usedFallback
          ? `⚠️ ${res.fallbackReason} — Yanıt: "${res.reply}"`
          : `✅ Bağlandı (${res.model}): "${res.reply}"`,
      );
    } catch (err) {
      setAiTestNote(`Hata: ${(err as Error).message}`);
    } finally {
      setAiBusy(false);
    }
  };

  const handleSendInGameChat = async () => {
    const question = chatInput.trim() || 'Bana bu bölüm için ipucu ver!';
    setChatBusy(true);
    try {
      const res = await callGameAi('npc-chat', question, aiConfigRef.current, {
        score: hud.score,
        coins: hud.coins,
        totalCoins: hud.totalCoins,
        hp: hud.hp,
      });
      setChatReply(`[${res.model}] ${res.reply}`);
      setChatInput('');
    } catch {
      setChatReply('AI rehber şu an yanıt veremedi.');
    } finally {
      setChatBusy(false);
    }
  };

  const handleDuplicateSelected = () => {
    if (!selectedObj || isPlaying) return;
    pushHistory();
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
      aiPersona: selectedObj.aiPersona,
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
    setOpenMenu(null);
    const data = JSON.stringify({ cameraMode, skyTheme, rules, objects3d }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(project.name || 'alpemox').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.alpemox-level.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusNotice('Seviye JSON (.alpemox-level.json) kaydedildi.');
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
          setStatusNotice(`${file.name} yüklendi (${parsed.objects3d.length} varlık).`);
        }
      } catch {
        setStatusNotice('Geçersiz seviye JSON dosyası.');
      }
    };
    reader.readAsText(file);
    ev.target.value = '';
  };

  const handleQuickAdd = (role: GameRole | 'companion') => {
    setOpenMenu(null);
    if (isPlaying) stopPlaytest();
    const offset = ((objects3d.length % 5) - 2) * 1.4;
    if (role === 'companion') {
      add3DObject('sphere', {
        name: 'Akıllı AI Yoldaş',
        gameRole: 'npc',
        position: { x: offset, y: 1.2, z: 4 },
        scale: { x: 0.85, y: 0.85, z: 0.85 },
        color: '#2dd4bf',
        moveSpeed: 3.2,
        patrolRange: 2.5,
        npcBehavior: 'companion',
        aiPersona: aiConfig.systemPrompt,
      });
      setStatusNotice('Sahneye Akıllı AI Yoldaş eklendi! Playtest’te E tuşuyla konuşabilirsiniz.');
      return;
    }
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
    setStatusNotice('Tek dosya oynanabilir 3D Web Oyunu (.HTML) indirildi!');
  };

  const setVirtualPadKey = (code: string, active: boolean) => {
    keysRef.current[code] = active;
  };

  const activeAiLabel =
    aiConfig.provider === 'ollama'
      ? `Ollama: ${aiConfig.ollamaModel}`
      : aiConfig.provider === 'openai-compat'
        ? `Özel AI: ${aiConfig.customModel}`
        : 'Yerleşik AI';

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-[#080b12] text-slate-100 select-none">
      {/* Clean Single Top Toolbar */}
      <div className="relative z-30 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#0d121d] px-3 py-2">
        {/* Left: Play, Reset, Gizmo */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
            <Gamepad2 className="h-4 w-4" />
            <span>Alpemox Game</span>
          </div>

          {!isPlaying ? (
            <button
              type="button"
              onClick={startPlaytest}
              data-testid="game-play-btn"
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Oynat
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
            data-testid="undo-btn"
            disabled={isPlaying || undoCount === 0}
            onClick={handleUndo}
            className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:bg-white/10 disabled:opacity-35"
            title={`Geri Al (Ctrl+Z) · ${undoCount}`}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => (isPlaying ? startPlaytest() : rebuildSceneObjects())}
            className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:bg-white/10"
            title="Sahneyi Sıfırla"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <div className="hidden sm:flex items-center rounded-lg border border-white/10 bg-slate-900/90 p-0.5">
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
        </div>

        {/* Center: Clean AI Architect Bar */}
        <div className="flex flex-1 min-w-[240px] max-w-lg items-center gap-1.5">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-purple-400/30 bg-slate-900/90 px-2.5 py-1">
            <Wand2 className="h-3.5 w-3.5 shrink-0 text-purple-400" />
            <input
              type="text"
              data-testid="ai-level-prompt-input"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAiGenerateLevel();
              }}
              placeholder="AI'a nasıl bir 3D oyun istediğini yaz..."
              className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            disabled={aiBusy}
            data-testid="ai-generate-level-btn"
            onClick={() => void handleAiGenerateLevel()}
            className="shrink-0 rounded-lg bg-purple-500/25 border border-purple-400/40 px-3 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-500/35 disabled:opacity-50"
          >
            {aiBusy ? 'Kuruluyor...' : 'AI ile Kur'}
          </button>
          <button
            type="button"
            data-testid="ai-status-pill"
            onClick={() => setRightTab('ai')}
            className="hidden lg:flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/20"
            title="Yerel Ollama veya kendi AI modelini bağla"
          >
            <Brain className="h-3.5 w-3.5" />
            <span className="max-w-[110px] truncate">{activeAiLabel}</span>
          </button>
        </div>

        {/* Right: Clean Dropdown Menus + Export */}
        <div className="flex items-center gap-1.5">
          {/* Templates Menu */}
          <div className="relative">
            <button
              type="button"
              data-testid="templates-menu-btn"
              onClick={() => setOpenMenu((m) => (m === 'templates' ? null : 'templates'))}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Şablonlar
              <ChevronDown className="h-3 w-3 opacity-70" />
            </button>
            {openMenu === 'templates' && (
              <div className="absolute right-0 mt-1.5 w-48 rounded-xl border border-white/15 bg-[#0f172a] p-1.5 shadow-2xl space-y-1">
                <button type="button" data-testid="template-platformer-btn" onClick={() => handleLoadTemplate('platformer')} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-white/10">
                  Obby Parkur
                </button>
                <button type="button" data-testid="template-arena-btn" onClick={() => handleLoadTemplate('arena')} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-white/10">
                  Savaş Arenası
                </button>
                <button type="button" data-testid="template-tower-btn" onClick={() => handleLoadTemplate('tower')} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-white/10">
                  Dikey Kule
                </button>
                <button type="button" data-testid="template-space-btn" onClick={() => handleLoadTemplate('space')} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-white/10">
                  Uzay İstasyonu
                </button>
              </div>
            )}
          </div>

          {/* Add Entity Menu */}
          <div className="relative">
            <button
              type="button"
              data-testid="add-entity-menu-btn"
              onClick={() => setOpenMenu((m) => (m === 'add' ? null : 'add'))}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10"
            >
              <Plus className="h-3.5 w-3.5 text-sky-400" />
              Ekle
              <ChevronDown className="h-3 w-3 opacity-70" />
            </button>
            {openMenu === 'add' && (
              <div className="absolute right-0 mt-1.5 w-52 rounded-xl border border-white/15 bg-[#0f172a] p-1.5 shadow-2xl space-y-0.5 text-xs">
                <button type="button" onClick={() => handleQuickAdd('companion')} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left font-semibold text-teal-300 hover:bg-teal-500/15">
                  🤖 Akıllı AI Yoldaş
                </button>
                <button type="button" onClick={() => handleQuickAdd('player')} className="flex w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-white/10">Oyuncu</button>
                <button type="button" onClick={() => handleQuickAdd('solid')} className="flex w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-white/10">Sabit Platform</button>
                <button type="button" onClick={() => handleQuickAdd('moving')} className="flex w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-white/10">Hareketli Platform</button>
                <button type="button" onClick={() => handleQuickAdd('bounce')} className="flex w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-white/10">Trambolin</button>
                <button type="button" onClick={() => handleQuickAdd('powerup')} className="flex w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-white/10">Power-Up (Kalkan/Mıknatıs)</button>
                <button type="button" onClick={() => handleQuickAdd('collectible')} className="flex w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-white/10">Altın / Ödül</button>
                <button type="button" onClick={() => handleQuickAdd('checkpoint')} className="flex w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-white/10">Checkpoint</button>
                <button type="button" onClick={() => handleQuickAdd('hazard')} className="flex w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-white/10">Engel / Tuzak</button>
                <button type="button" onClick={() => handleQuickAdd('npc')} className="flex w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-white/10">Düşman Bot (AI)</button>
                <button type="button" onClick={() => handleQuickAdd('goal')} className="flex w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-white/10">Bitiş Portalı</button>
              </div>
            )}
          </div>

          {/* Settings Menu */}
          <div className="relative">
            <button
              type="button"
              data-testid="settings-menu-btn"
              onClick={() => setOpenMenu((m) => (m === 'settings' ? null : 'settings'))}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10"
            >
              <Settings2 className="h-3.5 w-3.5 text-slate-300" />
              Ayarlar
            </button>
            {openMenu === 'settings' && (
              <div className="absolute right-0 mt-1.5 w-64 rounded-xl border border-white/15 bg-[#0f172a] p-3 shadow-2xl space-y-2.5 text-xs">
                <label className="block space-y-1">
                  <span className="text-[11px] text-slate-400">Kamera Açısı</span>
                  <select
                    data-testid="camera-mode-select"
                    value={cameraMode}
                    onChange={(e) => setCameraMode(e.target.value as CameraViewMode)}
                    className="w-full rounded-lg border border-white/15 bg-slate-900 px-2 py-1.5 text-xs"
                  >
                    <option value="tps">3. Şahıs (TPS)</option>
                    <option value="topdown">Kuşbakışı (Top-Down)</option>
                    <option value="fps">Birinci Şahıs (FPS)</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-[11px] text-slate-400">Atmosfer / Gökyüzü</span>
                  <select
                    data-testid="sky-theme-select"
                    value={skyTheme}
                    onChange={(e) => setSkyTheme(e.target.value as SkyThemeId)}
                    className="w-full rounded-lg border border-white/15 bg-slate-900 px-2 py-1.5 text-xs"
                  >
                    {Object.entries(SKY_THEMES).map(([id, cfg]) => (
                      <option key={id} value={id}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-300">Izgara Kilidi (Snap)</span>
                  <button
                    type="button"
                    data-testid="grid-snap-btn"
                    onClick={() => setSnapSize((s) => (s === 0 ? 0.5 : s === 0.5 ? 1 : 0))}
                    className="rounded border border-white/15 bg-white/5 px-2 py-0.5 text-[11px]"
                  >
                    {snapSize > 0 ? `${snapSize}m` : 'Kapalı'}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Oyun Hızı</span>
                  <div className="flex gap-1">
                    {[0.5, 1, 1.5].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => setTimeScale(spd)}
                        className={`rounded border px-1.5 py-0.5 text-[10px] ${
                          timeScale === spd
                            ? 'border-sky-400/50 bg-sky-500/20 text-sky-200'
                            : 'border-white/10 bg-white/5 text-slate-400'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300">Hitbox / Kolider Göster</span>
                  <input
                    type="checkbox"
                    data-testid="show-colliders-checkbox"
                    checked={showColliders}
                    onChange={(e) => setShowColliders(e.target.checked)}
                    className="accent-sky-400"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300">Chiptune Müzik</span>
                  <input
                    type="checkbox"
                    checked={musicEnabled}
                    onChange={(e) => setMusicEnabled(e.target.checked)}
                    className="accent-emerald-400"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300">Ses Efektlerini Sustur</span>
                  <input
                    type="checkbox"
                    checked={sfxMuted}
                    onChange={(e) => setSfxMuted(e.target.checked)}
                    className="accent-rose-400"
                  />
                </label>

                <div className="flex gap-1.5 border-t border-white/10 pt-2">
                  <button type="button" onClick={handleExportLevelJson} className="flex-1 rounded-lg border border-white/15 bg-white/5 py-1.5 hover:bg-white/10">
                    .JSON Kaydet
                  </button>
                  <button type="button" onClick={() => levelFileInputRef.current?.click()} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/15 bg-white/5 py-1.5 hover:bg-white/10">
                    <Upload className="h-3 w-3" /> Yükle
                  </button>
                  <button type="button" onClick={() => { setOpenMenu(null); setViewportMode('3d'); }} className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 hover:bg-white/10" title="3D Stage'e Git">
                    <Layers className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
            <input ref={levelFileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportLevelJson} />
          </div>

          <button
            type="button"
            onClick={handleExportHtml}
            data-testid="export-html-game-btn"
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow hover:brightness-110 transition"
          >
            <Download className="h-3.5 w-3.5" />
            İndir (.HTML)
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex flex-1 min-h-0">
        <div className="relative flex-1 min-w-0 bg-[#070a10]" onMouseDown={() => setOpenMenu(null)}>
          <div ref={canvasHostRef} className="h-full w-full" />

          {/* Clean Live HUD */}
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
            {bestScore > 0 && (
              <div className="text-[10px] font-mono text-amber-300" data-testid="hud-best-score">
                Rekor: {bestScore}
              </div>
            )}
            {hud.combo > 1 && (
              <span className="rounded-full bg-amber-500/25 border border-amber-400/50 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                COMBO x{hud.combo}
              </span>
            )}
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
              WASD: Yürü • Space: 2x Zıpla • Shift: Dash • F: Ateş • E: AI Rehberle Konuş
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

          {/* In-Game Live AI Companion Chat Overlay */}
          {isPlaying && chatOpen && (
            <div
              data-testid="ingame-ai-chat"
              className="absolute top-24 right-4 z-20 w-80 rounded-2xl border border-teal-400/40 bg-slate-950/92 p-3.5 shadow-2xl backdrop-blur-md space-y-2.5"
            >
              <div className="flex items-center justify-between text-xs font-bold text-teal-300">
                <span className="flex items-center gap-1.5">
                  <Brain className="h-4 w-4" /> AI Rehber ({activeAiLabel})
                </span>
                <button type="button" onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>
              {chatReply && (
                <div data-testid="ingame-ai-reply" className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-slate-100 leading-relaxed">
                  {chatReply}
                </div>
              )}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  data-testid="ingame-ai-input"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSendInGameChat();
                  }}
                  placeholder="AI karaktere bir şey sor..."
                  className="flex-1 rounded-lg border border-white/15 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:border-teal-400 focus:outline-none"
                />
                <button
                  type="button"
                  data-testid="ingame-ai-send"
                  disabled={chatBusy}
                  onClick={() => void handleSendInGameChat()}
                  className="rounded-lg bg-teal-500 px-2.5 py-1.5 text-slate-950 font-bold hover:bg-teal-400 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* On-Screen Playtest Controls */}
          {isPlaying && hud.outcome === 'playing' && (
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-2 pointer-events-none">
              <div className="pointer-events-auto grid grid-cols-3 gap-1 rounded-2xl border border-white/15 bg-slate-950/75 p-1.5 backdrop-blur">
                <div />
                <button type="button" data-testid="dpad-up" onMouseDown={() => setVirtualPadKey('PadUp', true)} onMouseUp={() => setVirtualPadKey('PadUp', false)} onMouseLeave={() => setVirtualPadKey('PadUp', false)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-sky-500/30">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <div />
                <button type="button" data-testid="dpad-left" onMouseDown={() => setVirtualPadKey('PadLeft', true)} onMouseUp={() => setVirtualPadKey('PadLeft', false)} onMouseLeave={() => setVirtualPadKey('PadLeft', false)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-sky-500/30">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button type="button" data-testid="dpad-down" onMouseDown={() => setVirtualPadKey('PadDown', true)} onMouseUp={() => setVirtualPadKey('PadDown', false)} onMouseLeave={() => setVirtualPadKey('PadDown', false)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-sky-500/30">
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button type="button" data-testid="dpad-right" onMouseDown={() => setVirtualPadKey('PadRight', true)} onMouseUp={() => setVirtualPadKey('PadRight', false)} onMouseLeave={() => setVirtualPadKey('PadRight', false)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-sky-500/30">
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="pointer-events-auto flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-testid="dpad-ai-talk"
                  onClick={() => setChatOpen((prev) => !prev)}
                  className="flex h-11 px-3 items-center justify-center rounded-xl border border-teal-400/40 bg-teal-500/20 text-[11px] font-bold text-teal-200 backdrop-blur hover:bg-teal-500/35"
                >
                  <MessageSquare className="mr-1 h-3.5 w-3.5" /> AI SOR (E)
                </button>

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
                <Trophy className={`h-11 w-11 ${hud.outcome === 'won' ? 'text-emerald-400' : 'text-rose-400'}`} />
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
                  <button type="button" onClick={startPlaytest} className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400">
                    Tekrar Oyna
                  </button>
                  <button type="button" onClick={stopPlaytest} className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-white/10">
                    Editöre Dön
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Clean 3-Tab Right Inspector: Varlıklar | Oyun AI | Kurallar */}
        <aside className="flex w-80 shrink-0 flex-col border-l border-white/10 bg-[#0b0f18]">
          <div className="grid grid-cols-3 border-b border-white/10 bg-[#0d121d] p-1.5 gap-1">
            <button
              type="button"
              onClick={() => setRightTab('entities')}
              className={`rounded-lg py-1.5 text-[11px] font-semibold transition ${
                rightTab === 'entities'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Varlıklar ({objects3d.length})
            </button>
            <button
              type="button"
              data-testid="ai-tab-btn"
              onClick={() => setRightTab('ai')}
              className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold transition ${
                rightTab === 'ai'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-400/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plug className="h-3.5 w-3.5" />
              MCP & AI
            </button>
            <button
              type="button"
              data-testid="rules-tab-btn"
              onClick={() => setRightTab('rules')}
              className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold transition ${
                rightTab === 'rules'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              Kurallar
            </button>
          </div>

          {rightTab === 'entities' && (
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
                            {obj.npcBehavior === 'companion' ? 'AI Yoldaş' : meta.label}
                          </span>
                        </div>
                      </div>
                      <span className="h-3 w-3 shrink-0 rounded-full border border-white/20" style={{ backgroundColor: obj.color }} />
                    </button>
                  );
                })}
              </div>

              {selectedObj && (
                <div className="border-t border-white/10 bg-[#0d121d] p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">{selectedObj.name}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={handleFocusSelected} className="rounded p-1 text-cyan-400 hover:bg-cyan-500/15" title="Odakla">
                        <Focus className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" data-testid="duplicate-entity-btn" onClick={handleDuplicateSelected} className="rounded p-1 text-amber-400 hover:bg-amber-500/15" title="Çoğalt">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => delete3DObject(selectedObj.id)} className="rounded p-1 text-rose-400 hover:bg-rose-500/15" title="Sil">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-[11px] text-slate-400">Oyun Rolü</span>
                    <select
                      value={inferRole(selectedObj)}
                      onChange={(e) => update3DObject(selectedObj.id, { gameRole: e.target.value as GameRole })}
                      className="w-full rounded-lg border border-white/15 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100"
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
                      <span className="text-[11px] text-slate-400">Bot Yapay Zekası (AI)</span>
                      <select
                        data-testid="npc-behavior-select"
                        value={selectedObj.npcBehavior ?? 'patrol'}
                        onChange={(e) =>
                          update3DObject(selectedObj.id, {
                            npcBehavior: e.target.value as 'patrol' | 'chase' | 'turret' | 'companion',
                          })
                        }
                        className="w-full rounded-lg border border-purple-400/30 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100"
                      >
                        <option value="companion">Dost AI Yoldaş (Konuşur)</option>
                        <option value="patrol">Devriye Gez (Patrol)</option>
                        <option value="chase">Takipçi Avcı (Chase AI)</option>
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
                              position: { ...selectedObj.position, [axis]: Number(e.target.value) || 0 },
                            })
                          }
                          className="w-full rounded border border-white/15 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                        />
                      </label>
                    ))}
                  </div>

                  <label className="flex items-center justify-between text-[11px] text-slate-300">
                    <span>Renk</span>
                    <input type="color" value={selectedObj.color} onChange={(e) => update3DObject(selectedObj.id, { color: e.target.value })} className="h-6 w-12 cursor-pointer rounded border border-white/20 bg-transparent" />
                  </label>
                </div>
              )}
            </>
          )}

          {rightTab === 'ai' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
              {/* Claude / Cursor / Antigravity MCP Direct Connect Card */}
              <div
                data-testid="mcp-connect-card"
                className="rounded-xl border border-amber-400/35 bg-gradient-to-br from-amber-500/12 to-sky-500/10 p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-200 flex items-center gap-1.5">
                    <Plug className="h-4 w-4" /> Claude / Cursor MCP Bağla
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      wsConnected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {wsConnected ? 'Canlı WS Hazır' : 'Bağlanıyor'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  <strong>Claude Code / Claude Desktop / Cursor</strong> üyeliğinle Alpemox MCP’yi bağla; Claude doğrudan sahneye 3D oyun kurup <strong>Oynat</strong> komutunu tetikler!
                </p>

                {mcpConfig && (
                  <div className="space-y-1.5 pt-1">
                    <button
                      type="button"
                      data-testid="copy-claude-cli-btn"
                      onClick={() => {
                        void navigator.clipboard?.writeText(mcpConfig.claudeCliCommand);
                        setCopiedId('cli');
                        window.setTimeout(() => setCopiedId(null), 1800);
                      }}
                      className="flex w-full items-center justify-between rounded-lg border border-white/15 bg-slate-950/90 px-2.5 py-1.5 text-[11px] text-sky-200 hover:bg-slate-900"
                    >
                      <span className="flex items-center gap-1.5 truncate font-mono">
                        <Terminal className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                        claude mcp add alpemox...
                      </span>
                      {copiedId === 'cli' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>

                    <button
                      type="button"
                      data-testid="copy-mcp-json-btn"
                      onClick={() => {
                        void navigator.clipboard?.writeText(JSON.stringify(mcpConfig.mcpJsonConfig, null, 2));
                        setCopiedId('json');
                        window.setTimeout(() => setCopiedId(null), 1800);
                      }}
                      className="flex w-full items-center justify-between rounded-lg border border-white/15 bg-slate-950/90 px-2.5 py-1.5 text-[11px] text-slate-200 hover:bg-slate-900"
                    >
                      <span className="truncate font-mono">claude_desktop_config.json Kopyala</span>
                      {copiedId === 'json' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>

                    <button
                      type="button"
                      data-testid="copy-claude-prompt-btn"
                      onClick={() => {
                        const ex =
                          'Alpemox MCP (game_build_level) kullanarak 5 altınlı, hareketli köprülü, trambolinli, ateş eden taretli ve AI yoldaşlı 3D parkur oyunu yap, sonra autoPlaytest:true ile başlat!';
                        void navigator.clipboard?.writeText(ex);
                        setCopiedId('prompt');
                        window.setTimeout(() => setCopiedId(null), 1800);
                      }}
                      className="flex w-full items-center justify-between rounded-lg border border-amber-400/25 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-100 hover:bg-amber-500/20"
                    >
                      <span className="truncate">Örnek Claude Oyun Komutu Kopyala</span>
                      {copiedId === 'prompt' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>

                    <div className="text-[10px] text-slate-400 font-mono truncate" title="MCP Tools">
                      Araçlar: game_build_level · game_spawn_entity · game_control
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-teal-400/30 bg-teal-500/10 p-2.5 space-y-1">
                <div className="font-bold text-teal-200 flex items-center gap-1.5">
                  <Brain className="h-4 w-4" /> Yerel Ollama / Özel AI Motoru
                </div>
                <p className="text-[11px] text-slate-300">
                  Oyun içi NPC sohbeti veya yerel seviye üretimi için <strong>Ollama / LM Studio</strong> da bağlayabilirsiniz.
                </p>
              </div>

              <label className="block space-y-1">
                <span className="text-[11px] text-slate-400">AI Motoru Seçimi</span>
                <select
                  data-testid="ai-provider-select"
                  value={aiConfig.provider}
                  onChange={(e) =>
                    setAiConfig((prev) => ({ ...prev, provider: e.target.value as GameAiProvider }))
                  }
                  className="w-full rounded-lg border border-white/15 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100"
                >
                  <option value="builtin">Yerleşik Alpemox AI (Kurulumsuz)</option>
                  <option value="ollama">Yerel Açık Kaynak Ollama (Llama/Qwen/Mistral)</option>
                  <option value="openai-compat">Özel AI Endpoint (LM Studio / OpenAI Uyumlu)</option>
                </select>
              </label>

              {aiConfig.provider === 'ollama' && (
                <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Ollama Durumu:</span>
                    <span className={ollamaReachable ? 'text-emerald-400 font-semibold' : 'text-amber-300'}>
                      {ollamaReachable ? `Bağlı (${ollamaModels.length} model)` : 'Yerel Port Bekleniyor'}
                    </span>
                  </div>
                  <label className="block space-y-0.5">
                    <span className="text-[10px] text-slate-400">Ollama URL</span>
                    <input
                      type="text"
                      value={aiConfig.ollamaUrl}
                      onChange={(e) => setAiConfig((p) => ({ ...p, ollamaUrl: e.target.value }))}
                      className="w-full rounded border border-white/15 bg-slate-900 px-2 py-1 text-xs"
                    />
                  </label>
                  <label className="block space-y-0.5">
                    <span className="text-[10px] text-slate-400">Açık Kaynak Model Adı</span>
                    <input
                      type="text"
                      data-testid="ollama-model-input"
                      value={aiConfig.ollamaModel}
                      onChange={(e) => setAiConfig((p) => ({ ...p, ollamaModel: e.target.value }))}
                      placeholder="llama3.2, qwen2.5, mistral..."
                      className="w-full rounded border border-white/15 bg-slate-900 px-2 py-1 text-xs"
                    />
                  </label>
                </div>
              )}

              {aiConfig.provider === 'openai-compat' && (
                <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                  <label className="block space-y-0.5">
                    <span className="text-[10px] text-slate-400">Endpoint URL (LM Studio / vLLM / API)</span>
                    <input
                      type="text"
                      data-testid="custom-ai-url-input"
                      value={aiConfig.customBaseUrl}
                      onChange={(e) => setAiConfig((p) => ({ ...p, customBaseUrl: e.target.value }))}
                      className="w-full rounded border border-white/15 bg-slate-900 px-2 py-1 text-xs"
                    />
                  </label>
                  <label className="block space-y-0.5">
                    <span className="text-[10px] text-slate-400">Model Adı</span>
                    <input
                      type="text"
                      value={aiConfig.customModel}
                      onChange={(e) => setAiConfig((p) => ({ ...p, customModel: e.target.value }))}
                      className="w-full rounded border border-white/15 bg-slate-900 px-2 py-1 text-xs"
                    />
                  </label>
                  <label className="block space-y-0.5">
                    <span className="text-[10px] text-slate-400">API Key (Yerelse Boş Bırak)</span>
                    <input
                      type="password"
                      value={aiConfig.customApiKey}
                      onChange={(e) => setAiConfig((p) => ({ ...p, customApiKey: e.target.value }))}
                      placeholder="Opsiyonel"
                      className="w-full rounded border border-white/15 bg-slate-900 px-2 py-1 text-xs"
                    />
                  </label>
                </div>
              )}

              <label className="block space-y-1">
                <span className="text-[11px] text-slate-400">Oyunun Kendi AI Karakter Kişiliği</span>
                <textarea
                  rows={3}
                  data-testid="ai-system-prompt-input"
                  value={aiConfig.systemPrompt}
                  onChange={(e) => setAiConfig((p) => ({ ...p, systemPrompt: e.target.value }))}
                  className="w-full rounded-lg border border-white/15 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100"
                />
              </label>

              <div className="flex gap-1.5">
                <button
                  type="button"
                  data-testid="test-ai-conn-btn"
                  disabled={aiBusy}
                  onClick={() => void handleTestAiConnection()}
                  className="flex-1 rounded-lg border border-teal-400/40 bg-teal-500/15 py-1.5 font-semibold text-teal-200 hover:bg-teal-500/25 disabled:opacity-50"
                >
                  AI Test Et
                </button>
                <button
                  type="button"
                  data-testid="add-companion-btn"
                  onClick={() => handleQuickAdd('companion')}
                  className="flex-1 rounded-lg bg-sky-500/20 border border-sky-400/40 py-1.5 font-semibold text-sky-200 hover:bg-sky-500/30"
                >
                  + AI Yoldaş Ekle
                </button>
              </div>

              {aiTestNote && (
                <div data-testid="ai-test-result" className="rounded-lg border border-white/10 bg-white/5 p-2 text-[11px] text-slate-200">
                  {aiTestNote}
                </div>
              )}

              <div className="border-t border-white/10 pt-2.5 space-y-2">
                <span className="block text-[11px] font-bold text-purple-300">
                  Kendi Özel Bot AI Mantığını Ekle
                </span>
                <select
                  data-testid="custom-bot-rule-select"
                  value={aiConfig.customBotRule}
                  onChange={(e) =>
                    setAiConfig((p) => ({
                      ...p,
                      customBotRule: e.target.value as GameAiConfig['customBotRule'],
                    }))
                  }
                  className="w-full rounded-lg border border-purple-400/30 bg-slate-900 px-2.5 py-1.5 text-xs"
                >
                  <option value="none">Varsayılan Bot AI (Devriye/Takip/Taret)</option>
                  <option value="flee-player">Korkak Botlar (Oyuncudan Kaçar)</option>
                  <option value="orbit-coins">Yörünge Devriyesi (Dairesel Hareket)</option>
                  <option value="custom-js">Özel JS Yapay Zeka Kodu Yaz</option>
                </select>

                {aiConfig.customBotRule === 'custom-js' && (
                  <textarea
                    rows={3}
                    data-testid="custom-bot-js-input"
                    value={aiConfig.customBotJs}
                    onChange={(e) => setAiConfig((p) => ({ ...p, customBotJs: e.target.value }))}
                    className="w-full rounded-lg border border-purple-400/30 bg-slate-950 p-2 font-mono text-[11px] text-emerald-300"
                  />
                )}
              </div>
            </div>
          )}

          {rightTab === 'rules' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
              {(
                [
                  ['doubleJump', 'Çift Zıplama (2x)', 'Havadayken Space ile ikinci kez zıplar.'],
                  ['dashEnabled', 'Shift Hızlı Atılım (Dash)', 'Kısa süreli 2.4x hız patlaması sağlar.'],
                  ['shooterEnabled', 'F / Enerji Silahı', 'Düşman botları vurarak +150 skor kazandırır.'],
                  ['requireAllCoins', 'Kilitli Bitiş Portalı', 'Tüm altınlar toplanmadan zafer açılmaz.'],
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
                  <span className="font-semibold text-slate-100">Yerçekimi</span>
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
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
