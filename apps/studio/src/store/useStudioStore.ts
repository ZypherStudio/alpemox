import { create } from 'zustand';
import {
  createDefaultProject,
  clonePose,
  MODEL_CATALOG,
  DEFAULT_STAGE_LIGHTING,
  type ProjectState,
  type ViewportMode,
  type StageRenderMode,
  type Layer2D,
  type VectorElement,
  type StoryboardShot,
  type AudioClip,
  type MoodboardItem,
  type StageObject3D,
  type StageLightingState,
  type CraftWorkflow,
  type ProviderId,
  type ProviderStatus,
  type CraftOutputItem,
  type PipelineNode,
  type PipelineEdge,
  type LicenseStatus,
} from '@opencraft/shared';

export type CanvasTool =
  | 'select'
  | 'brush'
  | 'mask'
  | 'eraser'
  | 'smudge'
  | 'eyedropper'
  | 'rect'
  | 'circle'
  | 'text';
export type AppPage = 'site' | 'launcher' | 'studio';

interface StageCaptureResult {
  rgbDataUrl: string;
  depthDataUrl: string;
}

interface StudioState {
  activePage: AppPage;
  project: ProjectState;
  projectsList: Array<{ id: string; name: string; updatedAt: string }>;
  viewportMode: ViewportMode;
  stageRenderMode: StageRenderMode;
  transformGizmoMode: 'translate' | 'rotate' | 'scale';
  activeTool: CanvasTool;
  brushColor: string;
  brushSize: number;
  brushOpacity: number;
  bgTolerance: number;
  selectedLayerId: string | null;
  selectedVectorId: string | null;
  selectedObject3DId: string | null;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;

  // Live captures passed to AI Craft & Pipeline
  stageRgbDataUrl: string | null;
  stageDepthDataUrl: string | null;
  canvasCompositeDataUrl: string | null;
  maskDataUrl: string | null;

  // AI Craft parameters
  craftWorkflow: CraftWorkflow;
  craftProvider: ProviderId;
  craftModelId: string;
  prompt: string;
  negativePrompt: string;
  steps: number;
  cfgScale: number;
  seed: number;
  denoise: number;
  batchCount: number;
  isCrafting: boolean;
  craftError: string | null;
  lastCraftOutput: CraftOutputItem | null;

  // Connectivity & Discovery
  wsConnected: boolean;
  lastSyncNotice: string | null;
  providerStatus: ProviderStatus | null;
  comfyReachable: boolean;
  comfyCheckpoints: string[];
  comfyLoras: string[];
  a1111Reachable: boolean;
  ollamaReachable: boolean;
  ollamaModels: string[];
  settingsOpen: boolean;
  license: LicenseStatus;
  pricingOpen: boolean;

  // Viewport callbacks
  captureStageFn: (() => StageCaptureResult | null) | null;
  exportStageGlbFn: (() => void) | null;
  exportStageObjFn: (() => void) | null;
  exportCanvasFn: (() => { compositeDataUrl: string; maskDataUrl: string | null }) | null;
  clearMaskFn: (() => void) | null;

  // Actions
  init: () => Promise<void>;
  connectWs: () => void;
  selectProject: (id: string) => Promise<void>;
  createNewProject: (name: string) => Promise<void>;
  setActivePage: (page: AppPage, mode?: ViewportMode) => void;
  setViewportMode: (mode: ViewportMode) => void;
  setStageRenderMode: (mode: StageRenderMode) => void;
  setTransformGizmoMode: (mode: 'translate' | 'rotate' | 'scale') => void;
  setActiveTool: (tool: CanvasTool) => void;
  setBrushColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setBrushOpacity: (op: number) => void;
  setBgTolerance: (tol: number) => void;
  setSelectedLayerId: (id: string | null) => void;
  setSelectedVectorId: (id: string | null) => void;
  setSelectedObject3DId: (id: string | null) => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setSettingsOpen: (open: boolean) => void;
  setPricingOpen: (open: boolean) => void;
  activateLicense: (key: string) => Promise<{ ok: boolean; error?: string }>;
  resetToFreePlan: () => Promise<void>;

  registerStageCapture: (fn: (() => StageCaptureResult | null) | null) => void;
  registerStageExporters: (glbFn: (() => void) | null, objFn: (() => void) | null) => void;
  registerCanvasExport: (
    exportFn: (() => { compositeDataUrl: string; maskDataUrl: string | null }) | null,
    clearMaskFn: (() => void) | null,
  ) => void;

  captureStageToAI: () => StageCaptureResult | null;
  captureStageTo2DLayer: () => void;
  projectLayerTo3DBillboard: (layerId: string) => void;
  projectVectorTo3DExtrude: (svgString: string, name?: string) => void;
  projectImageTo3DRelief: (imageUrl: string, name?: string) => void;
  clearMask: () => void;

  addMoodboardItem: (item: Omit<MoodboardItem, 'id'>) => void;
  updateMoodboardItem: (id: string, patch: Partial<MoodboardItem>) => void;
  deleteMoodboardItem: (id: string) => void;

  // 2D Photo Layers
  add2DLayer: (partial: Partial<Layer2D>) => void;
  update2DLayer: (id: string, patch: Partial<Layer2D>) => void;
  delete2DLayer: (id: string) => void;
  move2DLayer: (id: string, dir: 'up' | 'down') => void;
  setCanvasSize: (w: number, h: number) => void;

  // 3D Stage
  add3DObject: (kind: StageObject3D['kind'], extra?: Partial<StageObject3D>) => void;
  update3DObject: (id: string, patch: Partial<StageObject3D>) => void;
  delete3DObject: (id: string) => void;
  setMannequinPosePreset: (id: string, preset: string) => void;
  updateMannequinJoint: (id: string, joint: string, axis: 'x' | 'y' | 'z', value: number) => void;
  updateStageLighting: (patch: Partial<StageLightingState>) => void;

  // Pipeline
  addPipelineNode: (type: PipelineNode['type'], label: string, config?: Record<string, unknown>) => void;
  updatePipelineNode: (id: string, patch: Partial<PipelineNode>) => void;
  deletePipelineNode: (id: string) => void;
  addPipelineEdge: (from: string, to: string) => void;
  deletePipelineEdge: (id: string) => void;
  importPipelineFlow: (nodes: PipelineNode[], edges: PipelineEdge[]) => void;

  // Vectors
  addVector: (partial: Partial<VectorElement>) => void;
  updateVector: (id: string, patch: Partial<VectorElement>) => void;
  deleteVector: (id: string) => void;

  // Film & Audio
  addStoryboardShot: (shot: { title: string; prompt: string; imageUrl?: string; cameraNote?: string }) => void;
  updateStoryboardShot: (id: string, patch: Partial<StoryboardShot>) => void;
  deleteStoryboardShot: (id: string) => void;
  splitStoryboardShot: (id: string) => void;
  moveStoryboardShot: (id: string, dir: 'left' | 'right') => void;
  addAudioClip: (clip: Omit<AudioClip, 'id'>) => void;
  updateAudioClip: (id: string, patch: Partial<AudioClip>) => void;
  deleteAudioClip: (id: string) => void;

  setCraftField: (patch: Partial<StudioState>) => void;
  runCraft: () => Promise<void>;
  runPipeline: () => Promise<void>;
  refreshHealth: () => Promise<void>;
  saveProviderConfig: (patch: Record<string, string>) => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let wsInstance: WebSocket | null = null;

function normalizeProject(raw: ProjectState): ProjectState {
  return {
    ...raw,
    vectors: Array.isArray(raw.vectors) ? raw.vectors : [],
    audioClips: Array.isArray(raw.audioClips) ? raw.audioClips : [],
    moodboard: Array.isArray(raw.moodboard) ? raw.moodboard : [],
    stageLighting: raw.stageLighting || { ...DEFAULT_STAGE_LIGHTING },
  };
}

function scheduleSave(project: ProjectState) {
  try {
    localStorage.setItem(`alpemox-proj-${project.id}`, JSON.stringify(project));
  } catch {
    // ignore quota
  }
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await fetch(`/api/projects/${encodeURIComponent(project.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, source: 'studio' }),
      });
    } catch {
      // Ignore offline errors
    }
  }, 350);
}

function getInitialRoute(): { activePage: AppPage; viewportMode: ViewportMode } {
  if (typeof window === 'undefined') return { activePage: 'site', viewportMode: 'hybrid' };
  const params = new URLSearchParams(window.location.search);
  const p = params.get('page');
  const page: AppPage = p === 'studio' ? 'studio' : p === 'launcher' ? 'launcher' : 'site';
  const modeParam = params.get('mode') as ViewportMode | null;
  const validModes: ViewportMode[] = ['hybrid', 'photo', 'vector', 'film', '3d', 'moodboard', 'pipeline'];
  const viewportMode = modeParam && validModes.includes(modeParam) ? modeParam : 'hybrid';
  return { activePage: page, viewportMode };
}

const initialRoute = getInitialRoute();

export const useStudioStore = create<StudioState>((set, get) => ({
  activePage: initialRoute.activePage,
  project: createDefaultProject(),
  projectsList: [],
  viewportMode: initialRoute.viewportMode,
  stageRenderMode: 'lit',
  transformGizmoMode: 'translate',
  activeTool: 'select',
  brushColor: '#38bdf8',
  brushSize: 14,
  brushOpacity: 1,
  bgTolerance: 48,
  selectedLayerId: 'layer-title',
  selectedVectorId: 'vec-badge',
  selectedObject3DId: 'mannequin-1',
  leftSidebarOpen: true,
  rightSidebarOpen: true,

  stageRgbDataUrl: null,
  stageDepthDataUrl: null,
  canvasCompositeDataUrl: null,
  maskDataUrl: null,

  craftWorkflow: 'text-to-image',
  craftProvider: 'pollinations',
  craftModelId: 'pollinations-flux',
  prompt: 'Cinematic cyberpunk detective standing near neon alley crate, volumetric rim light, 35mm anamorphic',
  negativePrompt: 'blurry, low quality, distorted anatomy, watermark',
  steps: 24,
  cfgScale: 7,
  seed: 0,
  denoise: 0.72,
  batchCount: 1,
  isCrafting: false,
  craftError: null,
  lastCraftOutput: null,

  wsConnected: false,
  lastSyncNotice: null,
  providerStatus: null,
  comfyReachable: false,
  comfyCheckpoints: [],
  comfyLoras: [],
  a1111Reachable: false,
  ollamaReachable: false,
  ollamaModels: [],
  settingsOpen: false,
  license: { plan: 'free', maxVideoHeight: 720, maxImageSide: 720 },
  pricingOpen: false,

  captureStageFn: null,
  exportStageGlbFn: null,
  exportStageObjFn: null,
  exportCanvasFn: null,
  clearMaskFn: null,

  init: async () => {
    await get().refreshHealth();
    try {
      const licRes = await fetch('/api/license/status');
      if (licRes.ok) {
        const lic = await licRes.json();
        set({ license: lic });
      }
      const listRes = await fetch('/api/projects');
      if (listRes.ok) {
        const listData = await listRes.json();
        set({ projectsList: listData.projects || [] });
      }
      const projRes = await fetch('/api/projects/default');
      if (projRes.ok) {
        const { project } = await projRes.json();
        const norm = normalizeProject(project);
        set({
          project: norm,
          selectedLayerId: norm.layers2d?.[norm.layers2d.length - 1]?.id || null,
          selectedVectorId: norm.vectors?.[0]?.id || null,
          selectedObject3DId: norm.objects3d?.[0]?.id || null,
          lastCraftOutput: norm.craftHistory?.[0] || null,
        });
      }
    } catch {
      const cached = localStorage.getItem('alpemox-proj-default');
      if (cached) {
        try {
          set({ project: normalizeProject(JSON.parse(cached)) });
        } catch {
          // ignore
        }
      }
    }
    get().connectWs();
  },

  connectWs: () => {
    if (wsInstance && wsInstance.readyState <= 1) return;
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${window.location.host}/ws`);
    wsInstance = ws;

    ws.onopen = () => set({ wsConnected: true });
    ws.onclose = () => {
      set({ wsConnected: false });
      setTimeout(() => get().connectWs(), 2500);
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'project:updated' && msg.project && msg.source !== 'studio') {
          const currentId = get().project.id;
          if (msg.project.id === currentId) {
            set({
              project: normalizeProject(msg.project),
              lastSyncNotice: `Ajan/CLI senkronizasyonu (${msg.action || msg.source})`,
            });
          }
        }
        if (msg.type === 'craft:completed' && msg.output) {
          set({
            lastCraftOutput: msg.output,
            project: msg.project ? normalizeProject(msg.project) : get().project,
          });
        }
        if (msg.type === 'providers:updated' && msg.status) {
          set({ providerStatus: msg.status });
        }
        if (msg.type === 'license:updated' && msg.license) {
          set({ license: msg.license });
        }
      } catch {
        // Ignore
      }
    };
  },

  refreshHealth: async () => {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) return;
      const data = await res.json();
      set({
        providerStatus: data.providers || null,
        comfyReachable: Boolean(data.comfyui?.reachable),
        comfyCheckpoints: data.comfyui?.checkpoints || [],
        comfyLoras: data.comfyui?.loras || [],
        a1111Reachable: Boolean(data.a1111?.reachable),
        ollamaReachable: Boolean(data.ollama?.reachable),
        ollamaModels: data.ollama?.models || [],
      });
    } catch {
      // Ignore
    }
  },

  selectProject: async (id) => {
    const res = await fetch(`/api/projects/${encodeURIComponent(id)}`);
    if (!res.ok) return;
    const { project } = await res.json();
    const norm = normalizeProject(project);
    set({
      project: norm,
      selectedLayerId: norm.layers2d?.[0]?.id || null,
      selectedVectorId: norm.vectors?.[0]?.id || null,
      selectedObject3DId: norm.objects3d?.[0]?.id || null,
      lastCraftOutput: norm.craftHistory?.[0] || null,
    });
  },

  createNewProject: async (name) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return;
    const { project } = await res.json();
    const listRes = await fetch('/api/projects');
    const listData = listRes.ok ? await listRes.json() : { projects: [] };
    const norm = normalizeProject(project);
    set({
      project: norm,
      projectsList: listData.projects || [],
      selectedLayerId: norm.layers2d?.[0]?.id || null,
      selectedVectorId: norm.vectors?.[0]?.id || null,
      selectedObject3DId: norm.objects3d?.[0]?.id || null,
    });
  },

  setActivePage: (activePage, mode) => {
    const nextMode = mode || get().viewportMode;
    set({ activePage, viewportMode: nextMode });
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('page', activePage);
      if (activePage === 'studio') url.searchParams.set('mode', nextMode);
      window.history.replaceState({}, '', url.toString());
    }
  },

  setViewportMode: (viewportMode) => {
    set({ viewportMode });
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', viewportMode);
      window.history.replaceState({}, '', url.toString());
    }
  },

  setStageRenderMode: (stageRenderMode) => set({ stageRenderMode }),
  setTransformGizmoMode: (transformGizmoMode) => set({ transformGizmoMode }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setBrushColor: (brushColor) => set({ brushColor }),
  setBrushSize: (brushSize) => set({ brushSize }),
  setBrushOpacity: (brushOpacity) => set({ brushOpacity }),
  setBgTolerance: (bgTolerance) => set({ bgTolerance }),
  setSelectedLayerId: (selectedLayerId) => set({ selectedLayerId }),
  setSelectedVectorId: (selectedVectorId) => set({ selectedVectorId }),
  setSelectedObject3DId: (selectedObject3DId) => set({ selectedObject3DId }),
  toggleLeftSidebar: () => set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
  toggleRightSidebar: () => set((s) => ({ rightSidebarOpen: !s.rightSidebarOpen })),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setPricingOpen: (pricingOpen) => set({ pricingOpen }),

  activateLicense: async (key) => {
    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Lisans doğrulanamadı.' };
      set({ license: data.license, pricingOpen: false });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Bağlantı hatası' };
    }
  },

  resetToFreePlan: async () => {
    const res = await fetch('/api/license/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'free' }),
    });
    if (res.ok) {
      const data = await res.json();
      set({ license: data.license });
    }
  },

  registerStageCapture: (captureStageFn) => set({ captureStageFn }),
  registerStageExporters: (exportStageGlbFn, exportStageObjFn) => set({ exportStageGlbFn, exportStageObjFn }),
  registerCanvasExport: (exportCanvasFn, clearMaskFn) => set({ exportCanvasFn, clearMaskFn }),

  captureStageToAI: () => {
    const fn = get().captureStageFn;
    if (!fn) return null;
    const res = fn();
    if (res) {
      set({
        stageRgbDataUrl: res.rgbDataUrl,
        stageDepthDataUrl: res.depthDataUrl,
      });
    }
    return res;
  },

  captureStageTo2DLayer: () => {
    const cap = get().captureStageToAI();
    if (!cap) return;
    get().add2DLayer({
      name: `3D Sahne Yakalama (${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })})`,
      kind: 'snapshot',
      x: 0,
      y: 0,
      width: get().project.canvasWidth,
      height: get().project.canvasHeight,
      dataUrl: cap.rgbDataUrl,
    });
  },

  projectLayerTo3DBillboard: (layerId) => {
    const layer = get().project.layers2d.find((l) => l.id === layerId);
    if (!layer || !layer.dataUrl) return;
    get().add3DObject('billboard', {
      name: `Billboard: ${layer.name}`,
      textureDataUrl: layer.dataUrl,
      position: { x: 1.4, y: 1.3, z: -0.6 },
      scale: { x: 1.8, y: 1.8 * (layer.height / Math.max(1, layer.width)), z: 1 },
    });
  },

  projectVectorTo3DExtrude: (svgString, name = '3D SVG Extrude') => {
    get().add3DObject('extrude', {
      name,
      svgString,
      extrudeDepth: 14,
      position: { x: 0, y: 1.4, z: 0.4 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#4e7bfb',
    });
  },

  projectImageTo3DRelief: (imageUrl, name = '3D Kabartma Mesh') => {
    get().add3DObject('relief', {
      name,
      textureDataUrl: imageUrl,
      position: { x: 0, y: 1.4, z: -0.2 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#ffffff',
    });
  },

  addMoodboardItem: (item) => {
    const next = {
      ...get().project,
      moodboard: [...(get().project.moodboard || []), { ...item, id: `mb-${Date.now().toString(36)}` }],
    };
    set({ project: next });
    scheduleSave(next);
  },

  updateMoodboardItem: (id, patch) => {
    const next = {
      ...get().project,
      moodboard: (get().project.moodboard || []).map((m) => (m.id === id ? { ...m, ...patch } : m)),
    };
    set({ project: next });
    scheduleSave(next);
  },

  deleteMoodboardItem: (id) => {
    const next = {
      ...get().project,
      moodboard: (get().project.moodboard || []).filter((m) => m.id !== id),
    };
    set({ project: next });
    scheduleSave(next);
  },

  clearMask: () => {
    get().clearMaskFn?.();
    set({ maskDataUrl: null });
  },

  add2DLayer: (partial) => {
    const id = partial.id || `layer-${Date.now().toString(36)}`;
    const newLayer: Layer2D = {
      id,
      name: partial.name || 'Yeni Katman',
      kind: partial.kind || 'shape',
      visible: partial.visible ?? true,
      locked: partial.locked ?? false,
      opacity: partial.opacity ?? 1,
      blendMode: partial.blendMode || 'normal',
      x: partial.x ?? 180,
      y: partial.y ?? 180,
      width: partial.width ?? 360,
      height: partial.height ?? 360,
      rotation: partial.rotation ?? 0,
      dataUrl: partial.dataUrl,
      shapeType: partial.shapeType || 'rect',
      fillColor: partial.fillColor || '#38bdf8',
      strokeColor: partial.strokeColor || '#0ea5e9',
      textContent: partial.textContent,
      fontSize: partial.fontSize || 34,
    };
    const next = { ...get().project, layers2d: [...get().project.layers2d, newLayer] };
    set({ project: next, selectedLayerId: id });
    scheduleSave(next);
  },

  update2DLayer: (id, patch) => {
    const next = {
      ...get().project,
      layers2d: get().project.layers2d.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    };
    set({ project: next });
    scheduleSave(next);
  },

  delete2DLayer: (id) => {
    const remaining = get().project.layers2d.filter((l) => l.id !== id);
    const next = { ...get().project, layers2d: remaining };
    set({
      project: next,
      selectedLayerId: get().selectedLayerId === id ? remaining[remaining.length - 1]?.id || null : get().selectedLayerId,
    });
    scheduleSave(next);
  },

  move2DLayer: (id, dir) => {
    const list = [...get().project.layers2d];
    const idx = list.findIndex((l) => l.id === id);
    if (idx === -1) return;
    const target = dir === 'up' ? idx + 1 : idx - 1;
    if (target < 0 || target >= list.length) return;
    [list[idx], list[target]] = [list[target], list[idx]];
    const next = { ...get().project, layers2d: list };
    set({ project: next });
    scheduleSave(next);
  },

  setCanvasSize: (canvasWidth, canvasHeight) => {
    const next = { ...get().project, canvasWidth, canvasHeight };
    set({ project: next });
    scheduleSave(next);
  },

  add3DObject: (kind, extra = {}) => {
    const id = `obj3d-${Date.now().toString(36)}`;
    const obj: StageObject3D = {
      id,
      name: extra.name || `3D ${kind.toUpperCase()}`,
      kind,
      visible: true,
      position: extra.position || { x: (Math.random() - 0.5) * 2.2, y: kind === 'mannequin' ? 0 : 0.7, z: 0 },
      rotation: extra.rotation || { x: 0, y: 0, z: 0 },
      scale: extra.scale || { x: 1, y: 1, z: 1 },
      color: extra.color || '#38bdf8',
      pose: kind === 'mannequin' ? clonePose('neutral') : undefined,
      textureDataUrl: extra.textureDataUrl,
      glbDataUrl: extra.glbDataUrl,
      svgString: extra.svgString,
      extrudeDepth: extra.extrudeDepth,
    };
    const next = { ...get().project, objects3d: [...get().project.objects3d, obj] };
    set({ project: next, selectedObject3DId: id });
    scheduleSave(next);
  },

  update3DObject: (id, patch) => {
    const next = {
      ...get().project,
      objects3d: get().project.objects3d.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    };
    set({ project: next });
    scheduleSave(next);
  },

  delete3DObject: (id) => {
    const remaining = get().project.objects3d.filter((o) => o.id !== id);
    const next = { ...get().project, objects3d: remaining };
    set({
      project: next,
      selectedObject3DId: get().selectedObject3DId === id ? remaining[0]?.id || null : get().selectedObject3DId,
    });
    scheduleSave(next);
  },

  setMannequinPosePreset: (id, preset) => {
    const pose = clonePose(preset);
    get().update3DObject(id, { pose });
  },

  updateMannequinJoint: (id, joint, axis, value) => {
    const obj = get().project.objects3d.find((o) => o.id === id);
    if (!obj || !obj.pose) return;
    const currentJoint = (obj.pose as unknown as Record<string, { x: number; y: number; z: number }>)[joint];
    if (!currentJoint) return;
    const updatedPose = {
      ...obj.pose,
      preset: 'custom',
      [joint]: { ...currentJoint, [axis]: value },
    };
    get().update3DObject(id, { pose: updatedPose });
  },

  updateStageLighting: (patch) => {
    const next = {
      ...get().project,
      stageLighting: { ...get().project.stageLighting, ...patch },
    };
    set({ project: next });
    scheduleSave(next);
  },

  addPipelineNode: (type, label, config = {}) => {
    const id = `node-${Date.now().toString(36)}`;
    const count = get().project.pipelineNodes.length;
    const node: PipelineNode = {
      id,
      type,
      label,
      x: 160 + (count % 4) * 180,
      y: 90 + (count % 3) * 130,
      config,
    };
    const next = {
      ...get().project,
      pipelineNodes: [...get().project.pipelineNodes, node],
    };
    set({ project: next });
    scheduleSave(next);
  },

  updatePipelineNode: (id, patch) => {
    const next = {
      ...get().project,
      pipelineNodes: get().project.pipelineNodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    };
    set({ project: next });
    scheduleSave(next);
  },

  deletePipelineNode: (id) => {
    const next = {
      ...get().project,
      pipelineNodes: get().project.pipelineNodes.filter((n) => n.id !== id),
      pipelineEdges: get().project.pipelineEdges.filter((e) => e.from !== id && e.to !== id),
    };
    set({ project: next });
    scheduleSave(next);
  },

  addPipelineEdge: (from, to) => {
    if (from === to) return;
    const exists = get().project.pipelineEdges.some((e) => e.from === from && e.to === to);
    if (exists) return;
    const edge: PipelineEdge = {
      id: `edge-${Date.now().toString(36)}`,
      from,
      fromPort: 'out',
      to,
      toPort: 'in',
    };
    const next = {
      ...get().project,
      pipelineEdges: [...get().project.pipelineEdges, edge],
    };
    set({ project: next });
    scheduleSave(next);
  },

  deletePipelineEdge: (id) => {
    const next = {
      ...get().project,
      pipelineEdges: get().project.pipelineEdges.filter((e) => e.id !== id),
    };
    set({ project: next });
    scheduleSave(next);
  },

  importPipelineFlow: (pipelineNodes, pipelineEdges) => {
    const next = { ...get().project, pipelineNodes, pipelineEdges };
    set({ project: next });
    scheduleSave(next);
  },

  addVector: (partial) => {
    const id = partial.id || `vec-${Date.now().toString(36)}`;
    const vec: VectorElement = {
      id,
      name: partial.name || 'Yeni Vektör',
      kind: partial.kind || 'rect',
      visible: partial.visible ?? true,
      x: partial.x ?? 180,
      y: partial.y ?? 180,
      width: partial.width ?? 220,
      height: partial.height ?? 160,
      points: partial.points,
      closed: partial.closed,
      smoothBezier: partial.smoothBezier,
      fillColor: partial.fillColor ?? '#38bdf8',
      gradientEndColor: partial.gradientEndColor,
      strokeColor: partial.strokeColor ?? '#bae6fd',
      strokeWidth: partial.strokeWidth ?? 3,
      cornerRadius: partial.cornerRadius ?? 12,
      dropShadow: partial.dropShadow ?? false,
      textContent: partial.textContent,
      fontSize: partial.fontSize ?? 34,
      rawSvgMarkup: partial.rawSvgMarkup,
    };
    const next = {
      ...get().project,
      vectors: [...(get().project.vectors || []), vec],
    };
    set({ project: next, selectedVectorId: id });
    scheduleSave(next);
  },

  updateVector: (id, patch) => {
    const next = {
      ...get().project,
      vectors: (get().project.vectors || []).map((v) => (v.id === id ? { ...v, ...patch } : v)),
    };
    set({ project: next });
    scheduleSave(next);
  },

  deleteVector: (id) => {
    const remaining = (get().project.vectors || []).filter((v) => v.id !== id);
    const next = { ...get().project, vectors: remaining };
    set({
      project: next,
      selectedVectorId: get().selectedVectorId === id ? remaining[0]?.id || null : get().selectedVectorId,
    });
    scheduleSave(next);
  },

  addStoryboardShot: (shot) => {
    const next = {
      ...get().project,
      storyboard: [
        ...get().project.storyboard,
        {
          id: `shot-${Date.now().toString(36)}`,
          title: shot.title,
          prompt: shot.prompt,
          imageUrl: shot.imageUrl,
          durationSec: 3,
          speed: 1,
          cameraNote: shot.cameraNote || '',
          transition: 'fade' as const,
          easing: 'easeInOut' as const,
          zoomStart: 1.0,
          zoomEnd: 1.12,
          panX: 0,
          overlayText: '',
          overlayPosition: 'bottom' as const,
          overlayColor: '#ffffff',
          filterPreset: 'none' as const,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    set({ project: next });
    scheduleSave(next);
  },

  updateStoryboardShot: (id, patch) => {
    const next = {
      ...get().project,
      storyboard: get().project.storyboard.map((sh) => (sh.id === id ? { ...sh, ...patch } : sh)),
    };
    set({ project: next });
    scheduleSave(next);
  },

  deleteStoryboardShot: (id) => {
    const next = {
      ...get().project,
      storyboard: get().project.storyboard.filter((sh) => sh.id !== id),
    };
    set({ project: next });
    scheduleSave(next);
  },

  splitStoryboardShot: (id) => {
    const idx = get().project.storyboard.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const orig = get().project.storyboard[idx];
    const halfDur = Math.max(1, +(orig.durationSec / 2).toFixed(1));
    const partA = { ...orig, durationSec: halfDur, title: `${orig.title} (A)` };
    const partB = {
      ...orig,
      id: `shot-${Date.now().toString(36)}`,
      durationSec: halfDur,
      title: `${orig.title} (B)`,
    };
    const nextList = [...get().project.storyboard];
    nextList.splice(idx, 1, partA, partB);
    const next = { ...get().project, storyboard: nextList };
    set({ project: next });
    scheduleSave(next);
  },

  moveStoryboardShot: (id, dir) => {
    const list = [...get().project.storyboard];
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const target = dir === 'left' ? idx - 1 : idx + 1;
    if (target < 0 || target >= list.length) return;
    [list[idx], list[target]] = [list[target], list[idx]];
    const next = { ...get().project, storyboard: list };
    set({ project: next });
    scheduleSave(next);
  },

  addAudioClip: (clip) => {
    const next = {
      ...get().project,
      audioClips: [...(get().project.audioClips || []), { ...clip, id: `aud-${Date.now().toString(36)}` }],
    };
    set({ project: next });
    scheduleSave(next);
  },

  updateAudioClip: (id, patch) => {
    const next = {
      ...get().project,
      audioClips: (get().project.audioClips || []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
    };
    set({ project: next });
    scheduleSave(next);
  },

  deleteAudioClip: (id) => {
    const next = {
      ...get().project,
      audioClips: (get().project.audioClips || []).filter((c) => c.id !== id),
    };
    set({ project: next });
    scheduleSave(next);
  },

  setCraftField: (patch) => set((state) => ({ ...state, ...patch })),

  runCraft: async () => {
    const s = get();
    set({ isCrafting: true, craftError: null });
    try {
      const stageCap = s.captureStageFn ? s.captureStageFn() : null;
      const canvasExp = s.exportCanvasFn ? s.exportCanvasFn() : null;
      if (stageCap) {
        set({ stageRgbDataUrl: stageCap.rgbDataUrl, stageDepthDataUrl: stageCap.depthDataUrl });
      }
      if (canvasExp) {
        set({ canvasCompositeDataUrl: canvasExp.compositeDataUrl, maskDataUrl: canvasExp.maskDataUrl });
      }

      const modelSpec = MODEL_CATALOG.find((m) => m.id === s.craftModelId);
      const res = await fetch('/api/craft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: s.project.id,
          workflow: s.craftWorkflow,
          provider: modelSpec?.provider || s.craftProvider,
          modelId: s.craftModelId,
          prompt: s.prompt,
          negativePrompt: s.negativePrompt,
          width: s.project.canvasWidth,
          height: s.project.canvasHeight,
          steps: s.steps,
          cfgScale: s.cfgScale,
          seed: s.seed,
          denoise: s.denoise,
          batchCount: s.batchCount,
          stageRgbDataUrl: stageCap?.rgbDataUrl || s.stageRgbDataUrl || undefined,
          stageDepthDataUrl: stageCap?.depthDataUrl || s.stageDepthDataUrl || undefined,
          canvasDataUrl: canvasExp?.compositeDataUrl || undefined,
          maskDataUrl: canvasExp?.maskDataUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Craft başarısız.');

      if (data.output?.enhancedPrompt) {
        set({ prompt: data.output.enhancedPrompt });
      }
      set({
        lastCraftOutput: data.output,
        project: data.project ? normalizeProject(data.project) : s.project,
        isCrafting: false,
      });
    } catch (err) {
      set({
        isCrafting: false,
        craftError: err instanceof Error ? err.message : String(err),
      });
    }
  },

  runPipeline: async () => {
    const s = get();
    set({ isCrafting: true, craftError: null });
    try {
      const stageCap = s.captureStageFn ? s.captureStageFn() : null;
      const canvasExp = s.exportCanvasFn ? s.exportCanvasFn() : null;
      const res = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: s.project.id,
          stageRgbDataUrl: stageCap?.rgbDataUrl || s.stageRgbDataUrl || undefined,
          stageDepthDataUrl: stageCap?.depthDataUrl || s.stageDepthDataUrl || undefined,
          canvasDataUrl: canvasExp?.compositeDataUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pipeline çalıştırılamadı.');
      set({
        lastCraftOutput: data.output,
        project: data.project ? normalizeProject(data.project) : s.project,
        isCrafting: false,
      });
    } catch (err) {
      set({
        isCrafting: false,
        craftError: err instanceof Error ? err.message : String(err),
      });
    }
  },

  saveProviderConfig: async (patch) => {
    const res = await fetch('/api/providers/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const status = await res.json();
      set({ providerStatus: status });
      await get().refreshHealth();
    }
  },
}));
