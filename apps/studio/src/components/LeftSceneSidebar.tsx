import { useRef, useState } from 'react';
import {
  Eye,
  EyeOff,
  Layers,
  Box,
  User,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ImagePlus,
  Send,
  Sun,
  Compass,
} from 'lucide-react';
import { MANNEQUIN_POSE_PRESETS, type BlendMode, type StageObject3D, type StageLightingState } from '@opencraft/shared';
import { useStudioStore } from '../store/useStudioStore';
import { OrbitSphere } from './OrbitSphere';

const LIGHTING_PRESETS: Record<StageLightingState['preset'], Partial<StageLightingState>> = {
  studio: { preset: 'studio', bgColor: '#0d1018', ambientIntensity: 0.6, keyIntensity: 1.85, keyColor: '#ffffff', rimColor: '#38bdf8', fogDensity: 0 },
  cyberpunk: { preset: 'cyberpunk', bgColor: '#090714', ambientIntensity: 0.35, keyIntensity: 1.6, keyColor: '#e879f9', rimColor: '#22d3ee', fogDensity: 0.08 },
  sunset: { preset: 'sunset', bgColor: '#1a0f12', ambientIntensity: 0.45, keyIntensity: 2.1, keyColor: '#fb923c', rimColor: '#f43f5e', fogDensity: 0.04 },
  moonlight: { preset: 'moonlight', bgColor: '#050811', ambientIntensity: 0.3, keyIntensity: 1.3, keyColor: '#93c5fd', rimColor: '#818cf8', fogDensity: 0.09 },
};

export function LeftSceneSidebar() {
  const [tab, setTab] = useState<'2d' | '3d' | 'vector'>('3d');
  const [camRot, setCamRot] = useState(30);
  const [camTilt, setCamTilt] = useState(18);
  const [camDist, setCamDist] = useState(5.0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const glbInputRef = useRef<HTMLInputElement | null>(null);

  const viewportMode = useStudioStore((s) => s.viewportMode);
  const project = useStudioStore((s) => s.project);
  const selectedVectorId = useStudioStore((s) => s.selectedVectorId);
  const setSelectedVectorId = useStudioStore((s) => s.setSelectedVectorId);
  const addVector = useStudioStore((s) => s.addVector);
  const updateVector = useStudioStore((s) => s.updateVector);
  const deleteVector = useStudioStore((s) => s.deleteVector);
  const selectedLayerId = useStudioStore((s) => s.selectedLayerId);
  const setSelectedLayerId = useStudioStore((s) => s.setSelectedLayerId);
  const add2DLayer = useStudioStore((s) => s.add2DLayer);
  const update2DLayer = useStudioStore((s) => s.update2DLayer);
  const delete2DLayer = useStudioStore((s) => s.delete2DLayer);
  const move2DLayer = useStudioStore((s) => s.move2DLayer);
  const projectLayerTo3DBillboard = useStudioStore((s) => s.projectLayerTo3DBillboard);

  const selectedObject3DId = useStudioStore((s) => s.selectedObject3DId);
  const setSelectedObject3DId = useStudioStore((s) => s.setSelectedObject3DId);
  const add3DObject = useStudioStore((s) => s.add3DObject);
  const update3DObject = useStudioStore((s) => s.update3DObject);
  const delete3DObject = useStudioStore((s) => s.delete3DObject);
  const setMannequinPosePreset = useStudioStore((s) => s.setMannequinPosePreset);
  const updateMannequinJoint = useStudioStore((s) => s.updateMannequinJoint);
  const updateStageLighting = useStudioStore((s) => s.updateStageLighting);
  const setCamera3DOrbit = useStudioStore((s) => s.setCamera3DOrbit);

  const selectedLayer = project.layers2d.find((l) => l.id === selectedLayerId);
  const selectedObj = project.objects3d.find((o) => o.id === selectedObject3DId);
  const effectiveTab: '2d' | '3d' | 'vector' =
    viewportMode === 'photo' ? '2d' : viewportMode === 'vector' ? 'vector' : viewportMode === '3d' ? '3d' : tab;

  if (viewportMode === 'film' || viewportMode === 'moodboard' || viewportMode === 'game') {
    return null;
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      add2DLayer({
        name: file.name,
        kind: 'raster',
        x: 100,
        y: 100,
        width: 520,
        height: 520,
        dataUrl: String(reader.result),
      });
      setTab('2d');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleGlbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    add3DObject('glb', { name: file.name, glbDataUrl: url, position: { x: 0, y: 0, z: 0 } });
    e.target.value = '';
  };

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-slate-800/80 bg-[#10141f] xl:w-72">
      <div className="grid grid-cols-3 border-b border-slate-800/80 bg-[#0d1018] p-1">
        <button
          onClick={() => setTab('3d')}
          className={`flex items-center justify-center gap-1 rounded py-1.5 text-[11px] font-medium transition ${
            effectiveTab === '3d' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Box className="h-3.5 w-3.5" />
          3D ({project.objects3d.length})
        </button>
        <button
          onClick={() => setTab('2d')}
          className={`flex items-center justify-center gap-1 rounded py-1.5 text-[11px] font-medium transition ${
            effectiveTab === '2d' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          2D ({project.layers2d.length})
        </button>
        <button
          onClick={() => setTab('vector')}
          className={`flex items-center justify-center gap-1 rounded py-1.5 text-[11px] font-medium transition ${
            effectiveTab === 'vector' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          SVG ({(project.vectors || []).length})
        </button>
      </div>

      {effectiveTab === 'vector' ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="grid grid-cols-3 gap-1 border-b border-slate-800/80 p-2">
            <button
              onClick={() => addVector({ kind: 'rect', name: 'Vektör Kutu' })}
              className="rounded bg-indigo-500/20 py-1.5 text-[11px] font-medium text-indigo-300 hover:bg-indigo-500/35"
            >
              + Kutu
            </button>
            <button
              onClick={() => addVector({ kind: 'ellipse', name: 'Vektör Elips' })}
              className="rounded bg-slate-800 py-1.5 text-[11px] text-slate-200 hover:bg-slate-700"
            >
              + Elips
            </button>
            <button
              onClick={() => addVector({ kind: 'text', name: 'Başlık', textContent: 'ALPEMOX' })}
              className="rounded bg-slate-800 py-1.5 text-[11px] text-slate-200 hover:bg-slate-700"
            >
              + Metin
            </button>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {(project.vectors || []).map((v) => (
              <div
                key={v.id}
                onClick={() => setSelectedVectorId(v.id)}
                className={`flex cursor-pointer items-center justify-between rounded-lg border px-2 py-1.5 text-xs ${
                  v.id === selectedVectorId
                    ? 'border-indigo-500/50 bg-indigo-500/10 text-slate-100'
                    : 'border-transparent bg-slate-900/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateVector(v.id, { visible: !v.visible });
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    {v.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <span className="truncate font-medium">{v.name}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteVector(v.id);
                  }}
                  className="p-0.5 text-slate-400 hover:text-rose-400"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : effectiveTab === '2d' ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-wrap gap-1 border-b border-slate-800/80 p-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-1 rounded bg-sky-600/20 px-2 py-1.5 text-[11px] font-medium text-sky-300 hover:bg-sky-600/35"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              Görsel Yükle
            </button>
            <button
              onClick={() =>
                add2DLayer({ name: 'Yeni Kutu', kind: 'shape', shapeType: 'rect', fillColor: '#6366f1' })
              }
              className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1.5 text-[11px] text-slate-200 hover:bg-slate-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Şekil
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {[...project.layers2d].reverse().map((layer) => (
              <div
                key={layer.id}
                onClick={() => setSelectedLayerId(layer.id)}
                className={`flex cursor-pointer items-center justify-between rounded-lg border px-2 py-1.5 text-xs transition ${
                  layer.id === selectedLayerId
                    ? 'border-sky-500/50 bg-sky-500/10 text-slate-100'
                    : 'border-transparent bg-slate-900/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      update2DLayer(layer.id, { visible: !layer.visible });
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <span className="truncate font-medium">{layer.name}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      move2DLayer(layer.id, 'up');
                    }}
                    className="p-0.5 text-slate-400 hover:text-white"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      move2DLayer(layer.id, 'down');
                    }}
                    className="p-0.5 text-slate-400 hover:text-white"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      delete2DLayer(layer.id);
                    }}
                    className="p-0.5 text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {selectedLayer && (
            <div className="space-y-2 border-t border-slate-800/80 bg-[#0d1018] p-3 text-[11px]">
              <div className="font-semibold text-slate-300">Katman Özellikleri</div>
              <label className="flex items-center justify-between text-slate-400">
                <span>Opaklık ({Math.round(selectedLayer.opacity * 100)}%)</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={selectedLayer.opacity}
                  onChange={(e) => update2DLayer(selectedLayer.id, { opacity: Number(e.target.value) })}
                  className="w-28 accent-sky-400"
                />
              </label>
              <label className="flex items-center justify-between text-slate-400">
                <span>Karışım (Blend)</span>
                <select
                  value={selectedLayer.blendMode}
                  onChange={(e) => update2DLayer(selectedLayer.id, { blendMode: e.target.value as BlendMode })}
                  className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-slate-200"
                >
                  <option value="normal">Normal</option>
                  <option value="multiply">Multiply</option>
                  <option value="screen">Screen</option>
                  <option value="overlay">Overlay</option>
                </select>
              </label>
              {selectedLayer.kind === 'text' && (
                <input
                  type="text"
                  value={selectedLayer.textContent || ''}
                  onChange={(e) => update2DLayer(selectedLayer.id, { textContent: e.target.value })}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
                />
              )}
              {selectedLayer.dataUrl && (
                <button
                  onClick={() => projectLayerTo3DBillboard(selectedLayer.id)}
                  className="flex w-full items-center justify-center gap-1.5 rounded bg-indigo-600/25 py-1.5 font-medium text-indigo-300 hover:bg-indigo-600/40"
                >
                  <Send className="h-3 w-3" />
                  3D Sahneye Billboard Olarak Koy
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="grid grid-cols-3 gap-1 border-b border-slate-800/80 p-2">
            <button
              onClick={() => add3DObject('mannequin', { name: 'Yeni Manken' })}
              className="flex items-center justify-center gap-1 rounded bg-sky-600/20 px-1.5 py-1.5 text-[10px] font-medium text-sky-300 hover:bg-sky-600/35"
            >
              <User className="h-3 w-3" />
              Manken
            </button>
            <button
              onClick={() => add3DObject('box', { name: 'Küp Blok' })}
              className="rounded bg-slate-800 px-1.5 py-1.5 text-[10px] text-slate-200 hover:bg-slate-700"
            >
              + Küp
            </button>
            <button
              onClick={() => add3DObject('sphere', { name: 'Küre' })}
              className="rounded bg-slate-800 px-1.5 py-1.5 text-[10px] text-slate-200 hover:bg-slate-700"
            >
              + Küre
            </button>
            <button
              onClick={() => add3DObject('cone', { name: 'Koni' })}
              className="rounded bg-slate-800 px-1.5 py-1 text-[10px] text-slate-300 hover:bg-slate-700"
            >
              + Koni
            </button>
            <button
              onClick={() => add3DObject('torus', { name: 'Halka' })}
              className="rounded bg-slate-800 px-1.5 py-1 text-[10px] text-slate-300 hover:bg-slate-700"
            >
              + Halka
            </button>
            <button
              onClick={() => glbInputRef.current?.click()}
              className="rounded bg-violet-600/20 px-1.5 py-1 text-[10px] text-violet-300 hover:bg-violet-600/35"
            >
              + .GLB
            </button>
            <input ref={glbInputRef} type="file" accept=".glb,.gltf" onChange={handleGlbUpload} className="hidden" />
          </div>

          <div className="max-h-36 space-y-1 overflow-y-auto p-2">
            {project.objects3d.map((obj) => (
              <div
                key={obj.id}
                onClick={() => setSelectedObject3DId(obj.id)}
                className={`flex cursor-pointer items-center justify-between rounded-lg border px-2 py-1 text-xs ${
                  obj.id === selectedObject3DId
                    ? 'border-sky-500/50 bg-sky-500/10 text-slate-100'
                    : 'border-transparent bg-slate-900/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      update3DObject(obj.id, { visible: !obj.visible });
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    {obj.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <span className="truncate font-medium">{obj.name}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    delete3DObject(obj.id);
                  }}
                  className="p-0.5 text-slate-400 hover:text-rose-400"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto border-t border-slate-800/80 bg-[#0d1018] p-3 text-[11px]">
            {/* ArtCraft OrbitSphere Camera Angles Control */}
            <div className="space-y-1.5 border-b border-slate-800 pb-2.5">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-sky-400">
                <span className="flex items-center gap-1.5">
                  <Compass className="h-3 w-3" />
                  Kamera Küresi (Angles)
                </span>
                <span className="font-mono text-[9px] text-slate-400">
                  {camRot}° / {camTilt}°
                </span>
              </div>
              <div className="flex flex-col items-center rounded-lg border border-slate-800/80 bg-[#090b10] py-1">
                <OrbitSphere
                  rotation={camRot}
                  tilt={camTilt}
                  onDragEnd={(rot, tilt) => {
                    setCamRot(rot);
                    setCamTilt(tilt);
                    setCamera3DOrbit(rot, tilt, camDist);
                  }}
                />
                <div className="mt-1 flex flex-wrap justify-center gap-1 px-1 pb-1">
                  {(
                    [
                      ['Ön 0°', 0, 0],
                      ['45°', 45, 30],
                      ['Yan 90°', 90, 0],
                      ['Arka 180°', 180, 0],
                      ['Üst 60°', 0, 60],
                    ] as const
                  ).map(([lbl, r, t]) => (
                    <button
                      key={lbl}
                      onClick={() => {
                        setCamRot(r);
                        setCamTilt(t);
                        setCamera3DOrbit(r, t, camDist);
                      }}
                      className={`rounded px-1.5 py-0.5 text-[9px] ${
                        camRot === r && camTilt === t
                          ? 'bg-sky-500 font-semibold text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center justify-between text-slate-400">
                <span>Mesafe</span>
                <input
                  type="range"
                  min={2.5}
                  max={9}
                  step={0.5}
                  value={camDist}
                  onChange={(e) => {
                    const d = Number(e.target.value);
                    setCamDist(d);
                    setCamera3DOrbit(camRot, camTilt, d);
                  }}
                  className="w-28 accent-sky-400"
                />
              </label>
            </div>

            {/* Stage Lighting Presets */}
            <div className="space-y-1.5 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                <Sun className="h-3 w-3" />
                Işık & Atmosfer Ortamı
              </div>
              <div className="grid grid-cols-2 gap-1">
                {(['studio', 'cyberpunk', 'sunset', 'moonlight'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => updateStageLighting(LIGHTING_PRESETS[p])}
                    className={`rounded px-2 py-1 text-[10px] capitalize ${
                      project.stageLighting?.preset === p
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <label className="flex items-center justify-between text-slate-400">
                <span>Sis (Fog)</span>
                <input
                  type="range"
                  min={0}
                  max={0.14}
                  step={0.01}
                  value={project.stageLighting?.fogDensity ?? 0}
                  onChange={(e) => updateStageLighting({ fogDensity: Number(e.target.value) })}
                  className="w-28 accent-amber-400"
                />
              </label>
            </div>

            {selectedObj && (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{selectedObj.name}</span>
                  <input
                    type="color"
                    value={selectedObj.color}
                    onChange={(e) => update3DObject(selectedObj.id, { color: e.target.value })}
                    className="h-5 w-6 cursor-pointer rounded border border-slate-700 bg-transparent"
                  />
                </div>

                <div className="space-y-1">
                  {(['x', 'y', 'z'] as const).map((axis) => (
                    <label key={axis} className="flex items-center justify-between gap-2 text-slate-400">
                      <span className="uppercase">{axis}</span>
                      <input
                        type="range"
                        min={-5}
                        max={5}
                        step={0.1}
                        value={selectedObj.position[axis]}
                        onChange={(e) =>
                          update3DObject(selectedObj.id, {
                            position: { ...selectedObj.position, [axis]: Number(e.target.value) },
                          })
                        }
                        className="w-32 accent-sky-400"
                      />
                      <span className="w-7 text-right font-mono text-slate-300">
                        {selectedObj.position[axis].toFixed(1)}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="space-y-1 border-t border-slate-800 pt-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                    PBR Materyal
                  </div>
                  <label className="flex items-center justify-between text-slate-400">
                    <span>Pürüzlülük</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={selectedObj.roughness ?? 0.45}
                      onChange={(e) => update3DObject(selectedObj.id, { roughness: Number(e.target.value) })}
                      className="w-28 accent-amber-400"
                    />
                  </label>
                  <label className="flex items-center justify-between text-slate-400">
                    <span>Metalik</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={selectedObj.metalness ?? 0.2}
                      onChange={(e) => update3DObject(selectedObj.id, { metalness: Number(e.target.value) })}
                      className="w-28 accent-amber-400"
                    />
                  </label>
                  <label className="flex items-center justify-between text-slate-400">
                    <span>Parlama (Emissive)</span>
                    <input
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.05}
                      value={selectedObj.emissiveIntensity ?? 0}
                      onChange={(e) => update3DObject(selectedObj.id, { emissiveIntensity: Number(e.target.value) })}
                      className="w-28 accent-amber-400"
                    />
                  </label>
                </div>

                {selectedObj.kind === 'mannequin' && selectedObj.pose && (
                  <div className="space-y-2 border-t border-slate-800 pt-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-400">
                      Manken Poz Şablonları
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(MANNEQUIN_POSE_PRESETS).map((preset) => (
                        <button
                          key={preset}
                          onClick={() => setMannequinPosePreset(selectedObj.id, preset)}
                          className={`rounded px-2 py-0.5 text-[10px] font-medium capitalize transition ${
                            selectedObj.pose?.preset === preset
                              ? 'bg-sky-500 text-slate-950'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1 pt-1">
                      {(
                        [
                          ['leftShoulder', 'Sol Omuz'],
                          ['rightShoulder', 'Sağ Omuz'],
                          ['spine', 'Gövde'],
                          ['leftHip', 'Sol Kalça'],
                          ['rightHip', 'Sağ Kalça'],
                        ] as const
                      ).map(([joint, label]) => {
                        const jointVal =
                          (selectedObj.pose as unknown as Record<string, StageObject3D['position']>)[joint]?.x ?? 0;
                        return (
                          <label key={joint} className="flex items-center justify-between gap-2 text-slate-400">
                            <span>{label}</span>
                            <input
                              type="range"
                              min={-1.8}
                              max={1.8}
                              step={0.05}
                              value={jointVal}
                              onChange={(e) =>
                                updateMannequinJoint(selectedObj.id, joint, 'x', Number(e.target.value))
                              }
                              className="w-24 accent-sky-400"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
