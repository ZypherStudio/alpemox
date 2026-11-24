export type ViewportMode = 'hybrid' | 'photo' | 'vector' | 'film' | '3d' | 'game' | 'moodboard' | 'pipeline';
export type GameRole =
  | 'player'
  | 'solid'
  | 'moving'
  | 'bounce'
  | 'collectible'
  | 'hazard'
  | 'checkpoint'
  | 'powerup'
  | 'goal'
  | 'npc'
  | 'decor';
export type StageRenderMode = 'lit' | 'depth' | 'normal' | 'wireframe';
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay';
export type PlanTier = 'free' | 'pro';
export type FilmTransitionType = 'cut' | 'fade' | 'slide' | 'zoom-whip' | 'wipe-left' | 'glitch-flash';
export type FilmFilterType =
  | 'none'
  | 'vignette'
  | 'noir'
  | 'cyber'
  | 'vhs-retro'
  | 'warm-sunset'
  | 'bloom'
  | 'camera-shake';
export type CraftWorkflow =
  | 'text-to-image'
  | 'stage-to-image'
  | 'inpaint'
  | 'image-to-video'
  | 'image-to-3d'
  | 'prompt-enhance';

export type ProviderId =
  | 'pollinations'
  | 'comfyui'
  | 'a1111'
  | 'huggingface'
  | 'ollama'
  | 'openai'
  | 'gemini'
  | 'fal'
  | 'procedural';

export interface SuiteAppSpec {
  id: string;
  name: string;
  tagline: string;
  category: 'Core Studio' | 'Raster & Photo' | 'Vector & Design' | 'Video & Motion' | '3D & AI' | 'Game Engine';
  mode: ViewportMode;
  badge: string;
  description: string;
  highlights: string[];
  platforms: Array<'macOS' | 'Windows' | 'Linux' | 'Web'>;
}

export interface DownloadablePackSpec {
  id: string;
  name: string;
  category: string;
  sizeHint: string;
  description: string;
  contents: string[];
}

export interface ModelSpec {
  id: string;
  name: string;
  provider: ProviderId;
  workflows: CraftWorkflow[];
  local: boolean;
  freeOpen?: boolean;
  description: string;
  defaultSteps?: number;
  supportsDepth?: boolean;
  supportsMask?: boolean;
}

export interface Vector3Tuple {
  x: number;
  y: number;
  z: number;
}

export interface MannequinPose {
  preset: string;
  spine: Vector3Tuple;
  head: Vector3Tuple;
  leftShoulder: Vector3Tuple;
  leftElbow: Vector3Tuple;
  rightShoulder: Vector3Tuple;
  rightElbow: Vector3Tuple;
  leftHip: Vector3Tuple;
  leftKnee: Vector3Tuple;
  rightHip: Vector3Tuple;
  rightKnee: Vector3Tuple;
}

export type Object3DKind =
  | 'mannequin'
  | 'box'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'torus'
  | 'backdrop'
  | 'billboard'
  | 'relief'
  | 'extrude'
  | 'glb';

export interface StageObject3D {
  id: string;
  name: string;
  kind: Object3DKind;
  visible: boolean;
  position: Vector3Tuple;
  rotation: Vector3Tuple;
  scale: Vector3Tuple;
  color: string;
  roughness?: number;
  metalness?: number;
  emissiveIntensity?: number;
  pose?: MannequinPose;
  textureDataUrl?: string;
  glbDataUrl?: string;
  svgString?: string;
  extrudeDepth?: number;
  gameRole?: GameRole;
  moveSpeed?: number;
  jumpForce?: number;
  patrolRange?: number;
  bounceForce?: number;
  patrolAxis?: 'x' | 'y' | 'z';
  npcBehavior?: 'patrol' | 'chase' | 'turret' | 'companion';
  powerupType?: 'shield' | 'magnet' | 'speed';
  aiPersona?: string;
}

export interface StageLightingState {
  preset: 'studio' | 'cyberpunk' | 'sunset' | 'moonlight';
  bgColor: string;
  ambientIntensity: number;
  keyIntensity: number;
  keyColor: string;
  rimColor: string;
  fogDensity: number;
}

export interface Camera3DState {
  position: Vector3Tuple;
  target: Vector3Tuple;
  fov: number;
}

export type LutPreset = 'none' | 'teal-orange' | 'noir' | 'cyber-neon' | 'warm-kodak';

export interface LayerFilters {
  brightness: number;
  contrast: number;
  saturate: number;
  blur: number;
  hueRotate: number;
  grayscale: number;
  temperature?: number;
  vignette?: number;
  shadowBlur?: number;
  shadowColor?: string;
  lutPreset?: LutPreset;
}

export interface Layer2D {
  id: string;
  name: string;
  kind: 'raster' | 'shape' | 'text' | 'snapshot';
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  flipX?: boolean;
  flipY?: boolean;
  filters?: LayerFilters;
  dataUrl?: string;
  shapeType?: 'rect' | 'circle';
  fillColor?: string;
  strokeColor?: string;
  textContent?: string;
  fontSize?: number;
}

export interface VectorPoint {
  x: number;
  y: number;
  cx1?: number;
  cy1?: number;
  cx2?: number;
  cy2?: number;
}

export interface VectorElement {
  id: string;
  name: string;
  kind: 'path' | 'rect' | 'ellipse' | 'star' | 'polygon' | 'line' | 'text' | 'svg-raw';
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  points?: VectorPoint[];
  closed?: boolean;
  smoothBezier?: boolean;
  fillColor: string;
  gradientEndColor?: string;
  strokeColor: string;
  strokeWidth: number;
  cornerRadius?: number;
  dropShadow?: boolean;
  textContent?: string;
  fontSize?: number;
  rawSvgMarkup?: string;
  motionPreset?: 'none' | 'pulse' | 'spin' | 'float';
  dashed?: boolean;
}

export type PipelineNodeType =
  | 'prompt'
  | 'stage3d'
  | 'canvas2d'
  | 'model'
  | 'controlnet'
  | 'lora'
  | 'upscale'
  | 'audio'
  | 'output';

export interface PipelineNode {
  id: string;
  type: PipelineNodeType;
  label: string;
  x: number;
  y: number;
  config: Record<string, unknown>;
}

export interface PipelineEdge {
  id: string;
  from: string;
  fromPort: string;
  to: string;
  toPort: string;
}

export interface StoryboardShot {
  id: string;
  title: string;
  prompt: string;
  imageUrl?: string;
  durationSec: number;
  speed?: number;
  cameraNote?: string;
  transition?: FilmTransitionType;
  easing?: 'linear' | 'easeInOut' | 'easeOut';
  zoomStart?: number;
  zoomEnd?: number;
  panX?: number;
  panY?: number;
  rotateDeg?: number;
  brightness?: number;
  contrast?: number;
  saturate?: number;
  overlayText?: string;
  overlayPosition?: 'top' | 'center' | 'bottom';
  overlayColor?: string;
  filterPreset?: FilmFilterType;
  motionPreset?: 'ken-burns' | 'pan-right' | 'pan-left' | 'float' | 'bounce' | 'static';
  textAnimation?: 'none' | 'fade-up' | 'typewriter' | 'pop';
  createdAt: string;
}

export interface LicenseStatus {
  plan: PlanTier;
  cloudStatus?: 'coming-soon' | 'active';
  licenseKeyMasked?: string;
  maxVideoHeight: 720 | 2160;
  maxImageSide: 720 | 4096;
}

export const FILM_TRANSITIONS: Array<{ id: FilmTransitionType; label: string; proOnly: boolean }> = [
  { id: 'fade', label: 'Fade (Yumuşak Geçiş)', proOnly: false },
  { id: 'cut', label: 'Cut (Keskin Geçiş)', proOnly: false },
  { id: 'slide', label: 'Slide (Kaydırma)', proOnly: false },
  { id: 'zoom-whip', label: 'Zoom Whip (Hızlı Yakınlaşma)', proOnly: false },
  { id: 'wipe-left', label: 'Wipe Sweep (Süpürme)', proOnly: false },
  { id: 'glitch-flash', label: 'Glitch Flash (Dijital Patlama)', proOnly: false },
];

export const FILM_FILTERS: Array<{ id: FilmFilterType; label: string; proOnly: boolean }> = [
  { id: 'none', label: 'Normal', proOnly: false },
  { id: 'vignette', label: 'Vinyet', proOnly: false },
  { id: 'noir', label: 'Film Noir', proOnly: false },
  { id: 'cyber', label: 'Cyber Neon', proOnly: false },
  { id: 'vhs-retro', label: 'VHS Retro (Scanline + RGB)', proOnly: false },
  { id: 'warm-sunset', label: 'Warm Sunset', proOnly: false },
  { id: 'bloom', label: 'Sinematik Bloom', proOnly: false },
  { id: 'camera-shake', label: 'Aksiyon Sarsıntısı', proOnly: false },
];

export const PRICING_PLANS = [
  {
    id: 'free' as PlanTier,
    name: 'Alpemox Open Suite',
    price: '₺0',
    period: 'AGPL-3.0 · Tamamen Ücretsiz',
    description: 'Tüm 7 yaratıcı editör, yerel AI bağlantıları ve tam çözünürlüklü çıktı kendi cihazında ücretsiz.',
    features: [
      '8 Uygulama: Studio, Photo, Vector, Film, 3D Stage, Game Engine ★, Moodboard & Nodes',
      'Tüm Video Geçişleri (Glitch Flash, Zoom Whip, Wipe) & Efektler (VHS, Bloom)',
      '720p & 1080p yerel tarayıcı dışa aktarım + .GLB/.OBJ/.SVG/.WebM',
      'Yerel ComfyUI / A1111 / Ollama + Pollinations & 1x–4x Varyasyon',
      'MCP Sunucusu, CLI & İndirilebilir Varlık/LUT/Flow ZIP Paketleri',
    ],
  },
  {
    id: 'pro' as PlanTier,
    name: 'Alpemox Cloud',
    price: 'Yakında',
    altPrice: 'Erken Erişim Bekleme Listesi Açık',
    period: 'Yönetilen Bulut GPU & 4K Render',
    description: 'Kurulum ve güçlü ekran kartı gerektirmeyen tek tık bulut GPU render, bulut proje senkronizasyonu ve takım paylaşımı.',
    features: [
      'Tek Tık Bulut GPU: Flux Pro, Kling Video, Tripo3D & Hızlı Render Kuyruğu',
      'Sunucu Taraflı 4K MP4 (H.264) & Yüksek Bitrate Video Çıktısı',
      'Bulut Proje Senkronizasyonu, Sürüm Geçmişi & Takım Paylaşımı',
      'Otomatik Güncellenen Masaüstü Uygulaması + Özel Bulut Modelleri',
      'Kurumsal / Stüdyo Takım Alanları',
    ],
  },
];

export interface RoadmapFeatureItem {
  id: string;
  category: string;
  eta: string;
  status: 'in-progress' | 'planned' | 'research';
  title: string;
  description: string;
  highlights: string[];
}

export const ROADMAP_UPCOMING_FEATURES: RoadmapFeatureItem[] = [
  {
    id: 'video-motion-engine',
    category: 'Video & Motion',
    eta: 'Faz 2 · Mart Sonu / Nisan',
    status: 'in-progress',
    title: 'Gelişmiş Video & Keyframe Hareket Motoru',
    description: 'Zaman çizelgesi üzerinde keyframe eğrileri, hareket takibi (motion tracking) ve AI görüntüden videoya doğrudan klip sentezi.',
    highlights: ['Bezier Hız Eğrileri (Speed Ramp)', 'Klip İçi Konum/Ölçek/Döndürme Keyframe', 'H.264 MP4 & FFmpeg WASM Render'],
  },
  {
    id: 'animation-rigging-suite',
    category: 'Animasyon & Rigging',
    eta: 'Faz 2 · Nisan',
    status: 'in-progress',
    title: '2D Kemik Rigging, Vektör Morph & Lottie',
    description: 'Karakter katmanlarına eklem iskeleti kurun, vektör şekilleri kareler arasında akıcı dönüştürün ve web/oyun için Lottie JSON alın.',
    highlights: ['2D İskelet & Kemik (Bone) Sistemi', 'Onion Skinning (Kare Üstü Çizim)', 'Lottie / Rive / Şeffaf WebM İhracı'],
  },
  {
    id: 'ai-audio-lipsync',
    category: 'Ses & AI Dublaj',
    eta: 'Faz 2 · Nisan–Mayıs',
    status: 'planned',
    title: 'AI Seslendirme, Dudak Senkronu & Beat-Sync',
    description: 'Çoklu ses kanalında diyalog dublajı, sahne geçişlerini müziğin ritmine kilitleme ve gürültü temizleme.',
    highlights: ['Metinden Çok Dilli Seslendirme', 'Video Karakter Dudak Senkronu (Lip-Sync)', 'Otomatik Beat-Sync Kesim'],
  },
  {
    id: 'stage3d-skeletal-anim',
    category: '3D Stage & Fizik',
    eta: 'Faz 3 · Mayıs',
    status: 'planned',
    title: '3D İskelet Animasyon, Kumaş & Otomatik PBR',
    description: 'Mixamo / GLTF animasyon kliplerini zaman çizelgesinde oynatma ve tek fotoğraftan Normal/Roughness/AO PBR haritaları üretme.',
    highlights: ['GLB/FBX İskelet Animasyon Oynatıcı', 'Tek Görselden PBR Materyal Üretici', 'Kamera Yolu (Spline Dolly) Kaydı'],
  },
  {
    id: 'plugin-marketplace',
    category: 'Eklenti & SDK',
    eta: 'Faz 3 · Yaz',
    status: 'planned',
    title: 'Alpemox Eklenti SDK & Topluluk Pazaryeri',
    description: 'Geliştiricilerin kendi düğümlerini, fırça paketlerini, LUT profillerini ve AI akışlarını paylaşabileceği açık eklenti altyapısı.',
    highlights: ['JavaScript/WebAssembly Eklenti API', 'Tek Tık ComfyUI Workflow İçe Aktarma', 'Topluluk LUT & Fırça Paketleri'],
  },
  {
    id: 'cloud-collab-gpu',
    category: 'Alpemox Cloud',
    eta: 'Cloud Açılışı · Nisan–Mayıs',
    status: 'research',
    title: 'Canlı Takım İşbirliği & Bulut GPU Kuyruğu',
    description: 'Aynı sahne ve video kurgusu üzerinde ekip arkadaşlarıyla eşzamanlı çalışma, zaman damgalı yorum ve tek tık bulut GPU.',
    highlights: ['Çok Kullanıcılı Canlı Proje Düzenleme', 'Bulut 4K Render & Sürüm Geçmişi', 'Kurumsal SSO & Özel Model Havuzu'],
  },
];

export const FEATURE_REQUEST_CATEGORIES = [
  'Video & Motion',
  'Animasyon & Rigging',
  'Photo & Retouch',
  'Vector & SVG',
  '3D Stage & PBR',
  'AI & Workflow',
  'Özel / Kurumsal İhtiyaç',
] as const;

export interface AudioClip {
  id: string;
  name: string;
  kind: 'synth' | 'upload';
  preset?: 'cyber-pulse' | 'ambient-drone' | 'cinematic-riser' | 'lofi-beat';
  durationSec: number;
  volume: number;
  dataUrl?: string;
}

export interface CraftOutputItem {
  id: string;
  workflow: CraftWorkflow;
  provider: ProviderId;
  modelId: string;
  prompt: string;
  seed: number;
  width: number;
  height: number;
  imageUrl?: string;
  variations?: Array<{ seed: number; imageUrl: string }>;
  videoUrl?: string;
  meshUrl?: string;
  enhancedPrompt?: string;
  createdAt: string;
  note?: string;
}

export interface MoodboardItem {
  id: string;
  kind: 'image' | 'note' | 'palette';
  title: string;
  content?: string;
  imageUrl?: string;
  colors?: string[];
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProjectState {
  id: string;
  name: string;
  updatedAt: string;
  canvasWidth: number;
  canvasHeight: number;
  layers2d: Layer2D[];
  vectors: VectorElement[];
  objects3d: StageObject3D[];
  stageLighting: StageLightingState;
  camera3d: Camera3DState;
  pipelineNodes: PipelineNode[];
  pipelineEdges: PipelineEdge[];
  storyboard: StoryboardShot[];
  audioClips: AudioClip[];
  moodboard: MoodboardItem[];
  craftHistory: CraftOutputItem[];
}

export interface ProviderStatus {
  comfyuiUrl: string;
  a1111Url: string;
  ollamaUrl: string;
  ollamaModel: string;
  huggingfaceTokenConfigured: boolean;
  openaiApiKeyConfigured: boolean;
  geminiApiKeyConfigured: boolean;
  falApiKeyConfigured: boolean;
}

export interface CraftRequestPayload {
  projectId: string;
  workflow: CraftWorkflow;
  provider: ProviderId;
  modelId: string;
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  seed: number;
  denoise: number;
  batchCount?: number;
  loraName?: string;
  loraStrength?: number;
  stageRgbDataUrl?: string;
  stageDepthDataUrl?: string;
  canvasDataUrl?: string;
  maskDataUrl?: string;
}

export const DEFAULT_LAYER_FILTERS: LayerFilters = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  blur: 0,
  hueRotate: 0,
  grayscale: 0,
  temperature: 0,
  vignette: 0,
  shadowBlur: 0,
  shadowColor: '#000000',
  lutPreset: 'none',
};

export const DEFAULT_STAGE_LIGHTING: StageLightingState = {
  preset: 'studio',
  bgColor: '#0d1018',
  ambientIntensity: 0.6,
  keyIntensity: 1.85,
  keyColor: '#ffffff',
  rimColor: '#38bdf8',
  fogDensity: 0,
};

export const ALPEMOX_SUITE_APPS: SuiteAppSpec[] = [
  {
    id: 'alpemox-studio',
    name: 'Alpemox Studio',
    tagline: 'Hibrit 2D + 3D + AI Sahneleme IDE’si',
    category: 'Core Studio',
    mode: 'hybrid',
    badge: 'v0.3 · Ana Stüdyo',
    description:
      'Transform gizmo’lu 3D sahne, Depth/Normal haritası, çok katmanlı 2D editör ve açık kaynak AI modellerini (Flux, ComfyUI, A1111, Ollama) birleştirir.',
    highlights: ['2D ↔ 3D Çift Yönlü Köprü', 'Açık Kaynak Flux & ComfyUI', 'Batch 4x Varyasyon Üretimi'],
    platforms: ['macOS', 'Windows', 'Linux', 'Web'],
  },
  {
    id: 'alpemox-photo',
    name: 'Alpemox Photo',
    tagline: 'Katmanlı Fotoğraf, LUT & Rötuş Editörü',
    category: 'Raster & Photo',
    mode: 'photo',
    badge: 'v0.3 · Raster + LUT',
    description:
      'Köşe ölçekleme tutamaçları, Ctrl+Z geçmişi, LUT renk profilleri, yumuşak/damga fırça, toleranslı akıllı arka plan silme, kenar çıkarma ve PNG/JPEG/WebP export.',
    highlights: ['Sinematik LUT Profilleri', 'Toleranslı Akıllı BG Silme', 'Ctrl+Z Geçmiş & Boyutlandırma'],
    platforms: ['macOS', 'Windows', 'Linux', 'Web'],
  },
  {
    id: 'alpemox-vector',
    name: 'Alpemox Vector',
    tagline: 'Cubic Bezier, Gradient & SVG Stüdyosu',
    category: 'Vector & Design',
    mode: 'vector',
    badge: 'v0.3 · Bezier + 3D Extrude',
    description:
      'Pürüzsüz Bezier eğriler, ızgaraya yapıştırma (Snap), hizalama, lineer gradient, drop shadow, SVG içe aktarma ve tek tıkla 3D Extrude modelleme.',
    highlights: ['Smooth Cubic Bezier Path', 'SVG İçe/Dışa Aktarım & Hizalama', '2D SVG → 3D Extrude Modelleme'],
    platforms: ['macOS', 'Windows', 'Linux', 'Web'],
  },
  {
    id: 'alpemox-film',
    name: 'Alpemox Film',
    tagline: 'Çok Kanallı Video, Ses & Kurgu Editörü',
    category: 'Video & Motion',
    mode: 'film',
    badge: 'v0.3 · Video + Audio Synth',
    description:
      'Video + Ses kanalı, dahili Alpemox Sound müzik/efekt sentezleyici, klip bölme/hız kontrolü, hareketli altyazı ve sesli WebM video kaydı.',
    highlights: ['Video + Ses Kanalı & Waveform', 'Klip Bölme, Hız & Hareketli Yazı', 'Sesli WebM Video Dışa Aktarım'],
    platforms: ['macOS', 'Windows', 'Linux', 'Web'],
  },
  {
    id: 'alpemox-stage3d',
    name: 'Alpemox 3D Stage',
    tagline: 'Gizmo, Işık, HDRI & GLB/OBJ Modelleme',
    category: '3D & AI',
    mode: '3d',
    badge: 'v0.3 · Gizmo + GLB Export',
    description:
      'Sahne içi Transform Gizmo okları, tıklamalı obje seçimi, 2D SVG’den 3D Extrude, görselden 3D kabartma mesh ve .GLB/.OBJ ihracı.',
    highlights: ['3D Transform Gizmo (Taşı/Döndür/Ölçekle)', 'Görselden 3D Kabartma & Extrude', '.GLB / .OBJ Dışa Aktarım'],
    platforms: ['macOS', 'Windows', 'Linux', 'Web'],
  },
  {
    id: 'alpemox-game',
    name: 'Alpemox Game',
    tagline: '★ Yıldız Modül · 3D Oyun Motoru, AI Seviye & Web Export',
    category: 'Game Engine',
    mode: 'game',
    badge: '★ Star Engine v3 · Pro Indie Engine',
    description:
      'Animasyonlu 3D karakter, Takipçi/Taret düşman AI, Kalkan/Mıknatıs Power-Up, canlı 2D Radar Mini-Map, Grid Snap Gizmo, Prompt → 3D Seviye, kodsuz Olay Kuralları, Chiptune synth müzik ve tek dosya .HTML oyun ihracı.',
    highlights: [
      'Animasyonlu Karakter + Takipçi & Taret Düşman AI + Power-Up',
      'Canlı Radar Mini-Map, Grid Snap Gizmo & Prompt → 3D Oyun',
      'Chiptune Synth Müzik + Görsel Kurallar + Tek Dosya .HTML Export',
    ],
    platforms: ['macOS', 'Windows', 'Linux', 'Web'],
  },
  {
    id: 'alpemox-moodboard',
    name: 'Alpemox Moodboard',
    tagline: 'Sonsuz Referans, Renk Paleti & İlham Tahtası',
    category: 'Vector & Design',
    mode: 'moodboard',
    badge: 'v0.3 · Spatial Board',
    description:
      'Referans görselleri, renk paletlerini ve sahne notlarını sonsuz tuvalde toplayıp tek tıkla AI promptuna, 2D katmana veya 3D sahneye aktarın.',
    highlights: ['Sonsuz Pan/Zoom Referans Tahtası', 'Renk Paleti & Prompt Kartları', '2D/3D/Prompt Tek Tık Köprüsü'],
    platforms: ['macOS', 'Windows', 'Linux', 'Web'],
  },
  {
    id: 'alpemox-nodes',
    name: 'Alpemox Nodes & MCP',
    tagline: 'Dinamik Node Akışı, LoRA, Ses & Ajan',
    category: '3D & AI',
    mode: 'pipeline',
    badge: 'v0.3 · Flow + MCP',
    description:
      'Yeni düğüm ekleme/kablolama, .alpemox-flow.json kaydetme/yükleme, ComfyUI LoRA/ControlNet ve stdio MCP sunucusu ile tam otomasyon.',
    highlights: ['Dinamik Node Ekleme & Bağlama', '.alpemox-flow.json Paylaşımı', 'MCP + CLI + WebSocket'],
    platforms: ['macOS', 'Windows', 'Linux', 'Web'],
  },
];

export const DOWNLOADABLE_PACKS: DownloadablePackSpec[] = [
  {
    id: 'alpemox-3d-props',
    name: '3D Stüdyo Sahne & Prop Paketi',
    category: '3D Assets (.OBJ + Manifest)',
    sizeHint: '~45 KB ZIP',
    description: 'Alpemox 3D Stage içine doğrudan atılabilir kaide, sütun, kemer ve geometrik sahne blokları.',
    contents: ['pedestal.obj', 'pillar.obj', 'cyber-monolith.obj', 'README-props.txt'],
  },
  {
    id: 'alpemox-luts',
    name: 'Sinematik Renk & LUT Paketi',
    category: 'Color Grading (.CUBE)',
    sizeHint: '~30 KB ZIP',
    description: 'Film ve Fotoğraf projelerinde kullanılabilen 5 adet endüstri standardı .cube LUT renk profili.',
    contents: ['teal-orange.cube', 'cyber-neon.cube', 'film-noir.cube', 'warm-kodak.cube', 'nordic-cool.cube'],
  },
  {
    id: 'alpemox-vector-kit',
    name: 'Vektör HUD & İkon Kiti',
    category: 'SVG Design Kit',
    sizeHint: '~25 KB ZIP',
    description: 'Alpemox Vector içine doğrudan sürüklenebilir veya 3D Extrude ile kabartılabilir SVG şablonları.',
    contents: ['alpemox-emblem.svg', 'hud-frame.svg', 'cyber-badge.svg', 'arrow-pack.svg'],
  },
  {
    id: 'alpemox-workflows',
    name: 'ComfyUI & Alpemox Flow Şablonları',
    category: 'AI Pipelines (.json)',
    sizeHint: '~20 KB ZIP',
    description: 'Yerel ComfyUI + Flux Depth + Inpaint + Batch akışları için hazır .alpemox-flow.json dosyaları.',
    contents: ['flux-depth-stage.alpemox-flow.json', 'comfyui-controlnet-depth.json', 'batch-4x-concept.alpemox-flow.json'],
  },
];

export const MANNEQUIN_POSE_PRESETS: Record<string, MannequinPose> = {
  neutral: {
    preset: 'neutral',
    spine: { x: 0, y: 0, z: 0 },
    head: { x: 0, y: 0, z: 0 },
    leftShoulder: { x: 0.05, y: 0, z: -0.18 },
    leftElbow: { x: -0.15, y: 0, z: 0 },
    rightShoulder: { x: 0.05, y: 0, z: 0.18 },
    rightElbow: { x: -0.15, y: 0, z: 0 },
    leftHip: { x: 0, y: 0, z: -0.04 },
    leftKnee: { x: 0.05, y: 0, z: 0 },
    rightHip: { x: 0, y: 0, z: 0.04 },
    rightKnee: { x: 0.05, y: 0, z: 0 },
  },
  heroic: {
    preset: 'heroic',
    spine: { x: -0.08, y: 0.25, z: 0 },
    head: { x: 0.08, y: -0.2, z: 0 },
    leftShoulder: { x: -0.35, y: 0.15, z: -0.32 },
    leftElbow: { x: -0.85, y: 0, z: 0 },
    rightShoulder: { x: 0.2, y: -0.1, z: 0.28 },
    rightElbow: { x: -0.45, y: 0, z: 0 },
    leftHip: { x: -0.22, y: 0.1, z: -0.1 },
    leftKnee: { x: 0.35, y: 0, z: 0 },
    rightHip: { x: 0.18, y: -0.1, z: 0.1 },
    rightKnee: { x: 0.12, y: 0, z: 0 },
  },
  action: {
    preset: 'action',
    spine: { x: 0.28, y: -0.35, z: 0.08 },
    head: { x: -0.2, y: 0.35, z: 0 },
    leftShoulder: { x: -1.1, y: 0.25, z: -0.35 },
    leftElbow: { x: -0.85, y: 0, z: 0 },
    rightShoulder: { x: 0.65, y: -0.2, z: 0.45 },
    rightElbow: { x: -0.6, y: 0, z: 0 },
    leftHip: { x: -0.75, y: 0.05, z: -0.12 },
    leftKnee: { x: 1.05, y: 0, z: 0 },
    rightHip: { x: 0.55, y: -0.05, z: 0.1 },
    rightKnee: { x: 0.45, y: 0, z: 0 },
  },
  sitting: {
    preset: 'sitting',
    spine: { x: 0.1, y: 0, z: 0 },
    head: { x: 0.05, y: 0.1, z: 0 },
    leftShoulder: { x: -0.4, y: 0.15, z: -0.2 },
    leftElbow: { x: -0.8, y: 0, z: 0 },
    rightShoulder: { x: -0.4, y: -0.15, z: 0.2 },
    rightElbow: { x: -0.8, y: 0, z: 0 },
    leftHip: { x: -1.45, y: 0, z: -0.08 },
    leftKnee: { x: 1.45, y: 0, z: 0 },
    rightHip: { x: -1.45, y: 0, z: 0.08 },
    rightKnee: { x: 1.45, y: 0, z: 0 },
  },
  walking: {
    preset: 'walking',
    spine: { x: 0.08, y: 0.12, z: 0 },
    head: { x: -0.05, y: -0.1, z: 0 },
    leftShoulder: { x: 0.4, y: 0, z: -0.16 },
    leftElbow: { x: -0.35, y: 0, z: 0 },
    rightShoulder: { x: -0.45, y: 0, z: 0.16 },
    rightElbow: { x: -0.45, y: 0, z: 0 },
    leftHip: { x: -0.42, y: 0, z: -0.04 },
    leftKnee: { x: 0.35, y: 0, z: 0 },
    rightHip: { x: 0.38, y: 0, z: 0.04 },
    rightKnee: { x: 0.48, y: 0, z: 0 },
  },
};

export const MODEL_CATALOG: ModelSpec[] = [
  {
    id: 'pollinations-flux',
    name: 'Open Source FLUX / Sana (Ücretsiz Açık AI)',
    provider: 'pollinations',
    workflows: ['text-to-image', 'stage-to-image', 'inpaint'],
    local: false,
    freeOpen: true,
    description: 'API anahtarı gerektirmeden çalışan açık kaynak FLUX/Sana görsel üretim motoru.',
    defaultSteps: 24,
    supportsDepth: true,
  },
  {
    id: 'pollinations-turbo',
    name: 'Open Source SDXL Turbo (Hızlı Konsept)',
    provider: 'pollinations',
    workflows: ['text-to-image', 'stage-to-image', 'prompt-enhance'],
    local: false,
    freeOpen: true,
    description: 'Hızlı eskiz, konsept ve prompt genişletme için ücretsiz açık AI motoru.',
    defaultSteps: 12,
  },
  {
    id: 'comfyui-flux-depth',
    name: 'ComfyUI Local (Flux / SDXL + LoRA + Depth)',
    provider: 'comfyui',
    workflows: ['text-to-image', 'stage-to-image', 'inpaint'],
    local: true,
    freeOpen: true,
    description: 'Yerel ComfyUI sunucunuzda kurulu modelleri ve LoRA’ları otomatik kullanır.',
    defaultSteps: 20,
    supportsDepth: true,
    supportsMask: true,
  },
  {
    id: 'a1111-sdxl',
    name: 'Automatic1111 / Forge Local (SDXL / SD1.5)',
    provider: 'a1111',
    workflows: ['text-to-image', 'stage-to-image', 'inpaint'],
    local: true,
    freeOpen: true,
    description: 'Yerel WebUI (127.0.0.1:7860) txt2img & img2img entegrasyonu.',
    defaultSteps: 24,
    supportsMask: true,
  },
  {
    id: 'hf-flux-schnell',
    name: 'Hugging Face — black-forest-labs/FLUX.1-schnell',
    provider: 'huggingface',
    workflows: ['text-to-image'],
    local: false,
    freeOpen: true,
    description: 'Hugging Face açık kaynak FLUX.1-schnell çıkarım API’si (HF Token ile).',
    defaultSteps: 4,
  },
  {
    id: 'fal-flux-pro',
    name: 'Fal.ai — FLUX.1 [pro] / ControlNet Depth',
    provider: 'fal',
    workflows: ['text-to-image', 'stage-to-image', 'inpaint'],
    local: false,
    description: 'Yüksek çözünürlüklü görsel üretim, depth ve inpaint desteği.',
    defaultSteps: 28,
    supportsDepth: true,
    supportsMask: true,
  },
  {
    id: 'alpemox-local-motion',
    name: 'Alpemox Film Motion Synthesizer (Yerel / Ücretsiz)',
    provider: 'procedural',
    workflows: ['image-to-video'],
    local: true,
    freeOpen: true,
    description: 'Görsel veya 3D sahneyi doğrudan Alpemox Film timeline üzerinde hareketli klibe dönüştürür.',
  },
  {
    id: 'alpemox-local-relief',
    name: 'Alpemox 3D Relief Mesh Generator (Yerel / Ücretsiz)',
    provider: 'procedural',
    workflows: ['image-to-3d'],
    local: true,
    freeOpen: true,
    description: '2D görsel veya derinlik haritasından Three.js sahnede anında 3D kabartma mesh üretir.',
  },
  {
    id: 'fal-kling-video',
    name: 'Fal.ai — Kling Video (Image-to-Video)',
    provider: 'fal',
    workflows: ['image-to-video'],
    local: false,
    description: '2D/3D sahne çıktısından sinematik video üretir.',
    defaultSteps: 25,
  },
  {
    id: 'fal-tripo3d',
    name: 'Fal.ai — TripoSR / Tripo3D (Image-to-3D)',
    provider: 'fal',
    workflows: ['image-to-3d'],
    local: false,
    description: 'Tek görselden 3D sahneye yerleştirilebilir GLB mesh üretir.',
  },
  {
    id: 'openai-gpt-image-1',
    name: 'OpenAI — GPT Image 1',
    provider: 'openai',
    workflows: ['text-to-image', 'stage-to-image', 'inpaint', 'prompt-enhance'],
    local: false,
    description: 'Komut tabanlı görsel üretimi ve maskeli düzenleme.',
    supportsMask: true,
  },
  {
    id: 'gemini-imagen-3',
    name: 'Google Gemini — Imagen 3 / Prompt Architect',
    provider: 'gemini',
    workflows: ['text-to-image', 'prompt-enhance'],
    local: false,
    description: 'Google Imagen ile görsel üretimi ve sahne promptu geliştirme.',
  },
  {
    id: 'ollama-local-llm',
    name: 'Ollama Local — Prompt & Shot Director',
    provider: 'ollama',
    workflows: ['prompt-enhance'],
    local: true,
    freeOpen: true,
    description: 'Yerel LLM ile sahne betimlemesini sinematik prompta çevirir.',
  },
  {
    id: 'procedural-studio-preview',
    name: 'Alpemox Yerleşik Stüdyo Motoru (Çevrimdışı / Ücretsiz)',
    provider: 'procedural',
    workflows: ['text-to-image', 'stage-to-image', 'inpaint', 'image-to-video', 'image-to-3d', 'prompt-enhance'],
    local: true,
    freeOpen: true,
    description: 'İnternet veya harici API gerektirmeden sahne kompoziti, depth/mask haritası ve konsept görseli üretir.',
    defaultSteps: 8,
    supportsDepth: true,
    supportsMask: true,
  },
];

export function clonePose(presetName: keyof typeof MANNEQUIN_POSE_PRESETS = 'neutral'): MannequinPose {
  const src = MANNEQUIN_POSE_PRESETS[presetName] ?? MANNEQUIN_POSE_PRESETS.neutral;
  return JSON.parse(JSON.stringify(src)) as MannequinPose;
}

export function createDefaultProject(id = 'default', name = 'Alpemox Sahne 01'): ProjectState {
  const now = new Date().toISOString();
  return {
    id,
    name,
    updatedAt: now,
    canvasWidth: 1024,
    canvasHeight: 1024,
    layers2d: [
      {
        id: 'layer-bg',
        name: 'Arka Plan Atmosferi',
        kind: 'shape',
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'normal',
        x: 0,
        y: 0,
        width: 1024,
        height: 1024,
        rotation: 0,
        filters: { ...DEFAULT_LAYER_FILTERS },
        shapeType: 'rect',
        fillColor: '#131620',
        strokeColor: '#1e2436',
      },
      {
        id: 'layer-title',
        name: 'Sahne Başlık Notu',
        kind: 'text',
        visible: true,
        locked: false,
        opacity: 0.9,
        blendMode: 'normal',
        x: 64,
        y: 72,
        width: 520,
        height: 90,
        rotation: 0,
        filters: { ...DEFAULT_LAYER_FILTERS },
        textContent: 'ALPEMOX // SAHNE 01',
        fillColor: '#e2e8f0',
        fontSize: 34,
      },
    ],
    vectors: [
      {
        id: 'vec-badge',
        name: 'Vektör Çerçeve',
        kind: 'rect',
        visible: true,
        x: 160,
        y: 140,
        width: 480,
        height: 260,
        cornerRadius: 18,
        fillColor: '#0ea5e9',
        gradientEndColor: '#6366f1',
        strokeColor: '#bae6fd',
        strokeWidth: 4,
        dropShadow: true,
      },
      {
        id: 'vec-title',
        name: 'Alpemox Vektör Başlık',
        kind: 'text',
        visible: true,
        x: 225,
        y: 250,
        width: 380,
        height: 60,
        fillColor: '#ffffff',
        strokeColor: 'transparent',
        strokeWidth: 0,
        textContent: 'ALPEMOX VECTOR',
        fontSize: 38,
      },
    ],
    objects3d: [
      {
        id: 'mannequin-1',
        name: 'Ana Karakter (Manken)',
        kind: 'mannequin',
        visible: true,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0.25, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        color: '#60a5fa',
        pose: clonePose('heroic'),
      },
      {
        id: 'prop-box-1',
        name: 'Sahne Blok / Kaide',
        kind: 'box',
        visible: true,
        position: { x: -1.6, y: 0.45, z: -0.8 },
        rotation: { x: 0, y: 0.4, z: 0 },
        scale: { x: 0.9, y: 0.9, z: 0.9 },
        color: '#f59e0b',
      },
      {
        id: 'backdrop-1',
        name: 'Arka Duvar Paneli',
        kind: 'backdrop',
        visible: true,
        position: { x: 0, y: 2.2, z: -3.2 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 7, y: 4.5, z: 0.2 },
        color: '#1e293b',
      },
    ],
    stageLighting: { ...DEFAULT_STAGE_LIGHTING },
    camera3d: {
      position: { x: 2.6, y: 2.1, z: 4.4 },
      target: { x: 0, y: 1.0, z: 0 },
      fov: 42,
    },
    pipelineNodes: [
      {
        id: 'node-prompt',
        type: 'prompt',
        label: 'Prompt & Yönetmen',
        x: 40,
        y: 50,
        config: {
          prompt: 'Cinematic cyberpunk detective standing near neon alley crate, volumetric rim light, 35mm anamorphic',
        },
      },
      {
        id: 'node-stage3d',
        type: 'stage3d',
        label: '3D Sahne (RGB + Depth)',
        x: 40,
        y: 230,
        config: { captureMode: 'rgb+depth' },
      },
      {
        id: 'node-canvas2d',
        type: 'canvas2d',
        label: '2D Katman + Maske',
        x: 40,
        y: 410,
        config: { useMask: true },
      },
      {
        id: 'node-controlnet',
        type: 'controlnet',
        label: 'Depth & Pose Rehberi',
        x: 340,
        y: 220,
        config: { weight: 0.78 },
      },
      {
        id: 'node-model',
        type: 'model',
        label: 'AI Motoru (Open Source / Yerel)',
        x: 640,
        y: 160,
        config: { provider: 'pollinations', modelId: 'pollinations-flux' },
      },
      {
        id: 'node-output',
        type: 'output',
        label: '2D Katmana & Storyboarda Aktar',
        x: 940,
        y: 190,
        config: { autoAddLayer: true },
      },
    ],
    pipelineEdges: [
      { id: 'e1', from: 'node-prompt', fromPort: 'prompt', to: 'node-model', toPort: 'prompt' },
      { id: 'e2', from: 'node-stage3d', fromPort: 'depth', to: 'node-controlnet', toPort: 'depth' },
      { id: 'e3', from: 'node-canvas2d', fromPort: 'composite', to: 'node-model', toPort: 'image' },
      { id: 'e4', from: 'node-controlnet', fromPort: 'guide', to: 'node-model', toPort: 'control' },
      { id: 'e5', from: 'node-model', fromPort: 'result', to: 'node-output', toPort: 'input' },
    ],
    storyboard: [
      {
        id: 'shot-1',
        title: 'Shot 01 — Geniş Sahne Kurulumu',
        prompt: 'Wide establishing shot, hero pose on wet neon street',
        durationSec: 3,
        speed: 1,
        cameraNote: '35mm, low angle',
        transition: 'fade',
        easing: 'easeInOut',
        zoomStart: 1.0,
        zoomEnd: 1.12,
        panX: 0,
        overlayText: 'ALPEMOX FILM // SAHNE 01',
        overlayPosition: 'bottom',
        overlayColor: '#ffffff',
        filterPreset: 'none',
        createdAt: now,
      },
    ],
    audioClips: [],
    moodboard: [
      {
        id: 'mb-note-1',
        kind: 'note',
        title: 'Sanat Yönetimi Notu',
        content: 'Neon yağmurlu sokak atmosferi, soğuk cyan rim ışık + sıcak kehribar arka plan vurgusu.',
        x: 60,
        y: 60,
        width: 280,
        height: 150,
      },
      {
        id: 'mb-pal-1',
        kind: 'palette',
        title: 'Cyberpunk Palet 01',
        colors: ['#0b0d13', '#4e7bfb', '#22d3ee', '#f59e0b', '#ec4899'],
        x: 380,
        y: 60,
        width: 280,
        height: 140,
      },
    ],
    craftHistory: [],
  };
}
