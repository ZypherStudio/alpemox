import { Sparkles, Wand2, Layers, Film, Box, AlertCircle } from 'lucide-react';
import { MODEL_CATALOG, type CraftWorkflow } from '@opencraft/shared';
import { useStudioStore } from '../store/useStudioStore';

const WORKFLOW_TABS: Array<{ id: CraftWorkflow; label: string }> = [
  { id: 'text-to-image', label: 'Metin → Görsel' },
  { id: 'stage-to-image', label: 'Sahne → Görsel' },
  { id: 'inpaint', label: 'Maske Inpaint' },
  { id: 'image-to-video', label: 'Görsel → Video' },
  { id: 'image-to-3d', label: 'Görsel → 3D' },
  { id: 'prompt-enhance', label: 'Prompt Geliştir' },
];

export function CraftInspector() {
  const craftWorkflow = useStudioStore((s) => s.craftWorkflow);
  const craftModelId = useStudioStore((s) => s.craftModelId);
  const prompt = useStudioStore((s) => s.prompt);
  const negativePrompt = useStudioStore((s) => s.negativePrompt);
  const steps = useStudioStore((s) => s.steps);
  const cfgScale = useStudioStore((s) => s.cfgScale);
  const seed = useStudioStore((s) => s.seed);
  const denoise = useStudioStore((s) => s.denoise);
  const batchCount = useStudioStore((s) => s.batchCount);
  const isCrafting = useStudioStore((s) => s.isCrafting);
  const craftError = useStudioStore((s) => s.craftError);
  const lastCraftOutput = useStudioStore((s) => s.lastCraftOutput);
  const stageRgbDataUrl = useStudioStore((s) => s.stageRgbDataUrl);
  const stageDepthDataUrl = useStudioStore((s) => s.stageDepthDataUrl);
  const comfyReachable = useStudioStore((s) => s.comfyReachable);
  const a1111Reachable = useStudioStore((s) => s.a1111Reachable);

  const setCraftField = useStudioStore((s) => s.setCraftField);
  const runCraft = useStudioStore((s) => s.runCraft);
  const add2DLayer = useStudioStore((s) => s.add2DLayer);
  const add3DObject = useStudioStore((s) => s.add3DObject);
  const projectImageTo3DRelief = useStudioStore((s) => s.projectImageTo3DRelief);
  const setViewportMode = useStudioStore((s) => s.setViewportMode);
  const addStoryboardShot = useStudioStore((s) => s.addStoryboardShot);
  const project = useStudioStore((s) => s.project);
  const license = useStudioStore((s) => s.license);
  const setPricingOpen = useStudioStore((s) => s.setPricingOpen);

  const compatibleModels = MODEL_CATALOG.filter((m) => m.workflows.includes(craftWorkflow));

  const selectWorkflow = (wf: CraftWorkflow) => {
    const firstModel = MODEL_CATALOG.find((m) => m.workflows.includes(wf));
    setCraftField({
      craftWorkflow: wf,
      craftModelId: firstModel?.id || craftModelId,
      craftProvider: firstModel?.provider || 'pollinations',
    });
  };

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-slate-800/80 bg-[#10141f] xl:w-80">
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#111521] px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-100">
          <Sparkles className="h-4 w-4 text-sky-400" />
          AI Craft Motoru
        </div>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
            comfyReachable || a1111Reachable
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'bg-sky-500/15 text-sky-300'
          }`}
        >
          {comfyReachable ? 'ComfyUI Bağlı' : a1111Reachable ? 'A1111 Bağlı' : 'Open AI Hazır'}
        </span>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto p-3 text-xs">
        <div className="grid grid-cols-2 gap-1">
          {WORKFLOW_TABS.map((wf) => (
            <button
              key={wf.id}
              onClick={() => selectWorkflow(wf.id)}
              className={`rounded-md px-2 py-1 text-left text-[11px] font-medium transition ${
                craftWorkflow === wf.id
                  ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/50'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {wf.label}
            </button>
          ))}
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-400">Açık Kaynak / Yerel / API Modeli</label>
          <select
            value={craftModelId}
            onChange={(e) => {
              const m = MODEL_CATALOG.find((x) => x.id === e.target.value);
              setCraftField({
                craftModelId: e.target.value,
                craftProvider: m?.provider || 'pollinations',
              });
            }}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
          >
            {compatibleModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.local ? '[Yerel] ' : m.freeOpen ? '[Ücretsiz Açık AI] ' : '[API] '}
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium text-slate-400">Sahne Promptu</label>
            <button
              onClick={() => {
                setCraftField({
                  craftWorkflow: 'prompt-enhance',
                  craftModelId: 'procedural-studio-preview',
                  craftProvider: 'procedural',
                });
                void runCraft();
              }}
              className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300"
            >
              <Wand2 className="h-3 w-3" />
              Zenginleştir
            </button>
          </div>
          <textarea
            rows={2}
            value={prompt}
            onChange={(e) => setCraftField({ prompt: e.target.value })}
            placeholder="Sahneyi, ışığı, kamera açısını ve materyalleri tarif edin..."
            className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-400">Negatif Prompt</label>
          <input
            type="text"
            value={negativePrompt}
            onChange={(e) => setCraftField({ negativePrompt: e.target.value })}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 focus:border-sky-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-2 text-[10px]">
          <label className="space-y-0.5">
            <span className="text-slate-400">Steps ({steps})</span>
            <input
              type="range"
              min={4}
              max={50}
              value={steps}
              onChange={(e) => setCraftField({ steps: Number(e.target.value) })}
              className="w-full accent-sky-400"
            />
          </label>
          <label className="space-y-0.5">
            <span className="text-slate-400">CFG ({cfgScale})</span>
            <input
              type="range"
              min={1}
              max={15}
              step={0.5}
              value={cfgScale}
              onChange={(e) => setCraftField({ cfgScale: Number(e.target.value) })}
              className="w-full accent-sky-400"
            />
          </label>
          <label className="space-y-0.5">
            <span className="text-slate-400">Denoise ({denoise})</span>
            <input
              type="range"
              min={0.15}
              max={1}
              step={0.05}
              value={denoise}
              onChange={(e) => setCraftField({ denoise: Number(e.target.value) })}
              className="w-full accent-sky-400"
            />
          </label>
          <label className="space-y-0.5">
            <span className="text-slate-400">Toplu Varyasyon</span>
            <div className="flex gap-1">
              {[1, 2, 4].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setCraftField({ batchCount: cnt })}
                  className={`flex-1 rounded py-0.5 font-semibold ${
                    batchCount === cnt ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {cnt}x
                </button>
              ))}
            </div>
          </label>
        </div>

        {(stageRgbDataUrl || stageDepthDataUrl) && (
          <div className="grid grid-cols-2 gap-2">
            {stageRgbDataUrl && (
              <div className="overflow-hidden rounded border border-slate-800 bg-black">
                <div className="px-1.5 py-0.5 text-[9px] text-slate-400">3D RGB Referans</div>
                <img src={stageRgbDataUrl} alt="3D RGB" className="h-16 w-full object-cover" />
              </div>
            )}
            {stageDepthDataUrl && (
              <div className="overflow-hidden rounded border border-slate-800 bg-black">
                <div className="px-1.5 py-0.5 text-[9px] text-slate-400">Depth Haritası</div>
                <img src={stageDepthDataUrl} alt="Depth" className="h-16 w-full object-cover" />
              </div>
            )}
          </div>
        )}

        {craftError && (
          <div className="flex items-start gap-2 rounded-md border border-rose-500/40 bg-rose-950/30 p-2 text-[11px] text-rose-200">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
            <span>{craftError}</span>
          </div>
        )}

        <button
          onClick={() => runCraft()}
          disabled={isCrafting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-500/20 transition hover:brightness-110 disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          {isCrafting ? 'Üretiliyor...' : batchCount > 1 ? `${batchCount}x Varyasyon Üret` : 'Sahneyi Üret (Craft)'}
        </button>

        {lastCraftOutput && (
          <div className="space-y-2 rounded-xl border border-slate-800 bg-[#0b0d13] p-2.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-semibold text-sky-400">{lastCraftOutput.provider.toUpperCase()}</span>
              <span className="font-mono">Seed {lastCraftOutput.seed}</span>
            </div>

            {lastCraftOutput.variations && lastCraftOutput.variations.length > 1 ? (
              <div className="grid grid-cols-2 gap-1.5">
                {lastCraftOutput.variations.map((v) => (
                  <img
                    key={v.seed}
                    src={v.imageUrl}
                    alt={`Seed ${v.seed}`}
                    onClick={() =>
                      setCraftField({
                        lastCraftOutput: { ...lastCraftOutput, seed: v.seed, imageUrl: v.imageUrl },
                      })
                    }
                    className={`cursor-pointer rounded border object-cover ${
                      lastCraftOutput.imageUrl === v.imageUrl ? 'border-sky-400' : 'border-slate-800'
                    }`}
                  />
                ))}
              </div>
            ) : (
              lastCraftOutput.imageUrl && (
                <img
                  src={lastCraftOutput.imageUrl}
                  alt="Craft output"
                  className="w-full rounded-lg border border-slate-800 object-cover"
                />
              )
            )}

            {lastCraftOutput.enhancedPrompt && (
              <div className="rounded bg-slate-900 p-2 text-[11px] text-emerald-300">
                {lastCraftOutput.enhancedPrompt}
              </div>
            )}

            {lastCraftOutput.note && <p className="text-[10px] text-slate-400">{lastCraftOutput.note}</p>}

            {lastCraftOutput.imageUrl && (
              <div className="grid grid-cols-2 gap-1 pt-1">
                <button
                  onClick={() =>
                    add2DLayer({
                      name: `Craft (${lastCraftOutput.seed})`,
                      kind: 'raster',
                      x: 0,
                      y: 0,
                      width: project.canvasWidth,
                      height: project.canvasHeight,
                      dataUrl: lastCraftOutput.imageUrl,
                    })
                  }
                  className="flex items-center justify-center gap-1 rounded bg-slate-800 py-1 text-[10px] text-slate-200 hover:bg-slate-700"
                >
                  <Layers className="h-3 w-3" />
                  2D’ye At
                </button>
                <button
                  onClick={() =>
                    add3DObject('billboard', {
                      name: `Craft Billboard`,
                      textureDataUrl: lastCraftOutput.imageUrl,
                      position: { x: 1.5, y: 1.4, z: -0.6 },
                      scale: { x: 1.8, y: 1.8, z: 1 },
                    })
                  }
                  className="flex items-center justify-center gap-1 rounded bg-slate-800 py-1 text-[10px] text-slate-200 hover:bg-slate-700"
                >
                  <Box className="h-3 w-3" />
                  3D Billboard
                </button>
                <button
                  onClick={() => {
                    if (lastCraftOutput.imageUrl) {
                      projectImageTo3DRelief(lastCraftOutput.imageUrl, `3D Kabartma #${lastCraftOutput.seed}`);
                      setViewportMode('3d');
                    }
                  }}
                  className="flex items-center justify-center gap-1 rounded bg-amber-500/20 py-1 text-[10px] text-amber-300 hover:bg-amber-500/35"
                >
                  <Box className="h-3 w-3" />
                  3D Kabartma
                </button>
                <button
                  onClick={() =>
                    addStoryboardShot({
                      title: `Shot ${String(project.storyboard.length + 1).padStart(2, '0')}`,
                      prompt: lastCraftOutput.prompt,
                      imageUrl: lastCraftOutput.imageUrl,
                    })
                  }
                  className="flex items-center justify-center gap-1 rounded bg-slate-800 py-1 text-[10px] text-slate-200 hover:bg-slate-700"
                >
                  <Film className="h-3 w-3" />
                  Shot Ekle
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
