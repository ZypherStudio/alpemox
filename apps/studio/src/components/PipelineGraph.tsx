import { useRef, useState } from 'react';
import { Play, Workflow, Plus, Trash2, Download, Upload, Link2, LayoutGrid } from 'lucide-react';
import { MODEL_CATALOG, type PipelineNode, type PipelineEdge, type PipelineNodeType } from '@opencraft/shared';
import { useStudioStore } from '../store/useStudioStore';

const NODE_COLORS: Record<string, string> = {
  prompt: 'border-amber-500/40 bg-amber-950/20',
  stage3d: 'border-sky-500/40 bg-sky-950/20',
  canvas2d: 'border-emerald-500/40 bg-emerald-950/20',
  controlnet: 'border-violet-500/40 bg-violet-950/20',
  lora: 'border-fuchsia-500/40 bg-fuchsia-950/20',
  upscale: 'border-teal-500/40 bg-teal-950/20',
  audio: 'border-indigo-500/40 bg-indigo-950/20',
  model: 'border-pink-500/40 bg-pink-950/20',
  output: 'border-cyan-400/40 bg-cyan-950/20',
};

export function PipelineGraph() {
  const project = useStudioStore((s) => s.project);
  const addPipelineNode = useStudioStore((s) => s.addPipelineNode);
  const updatePipelineNode = useStudioStore((s) => s.updatePipelineNode);
  const deletePipelineNode = useStudioStore((s) => s.deletePipelineNode);
  const addPipelineEdge = useStudioStore((s) => s.addPipelineEdge);
  const deletePipelineEdge = useStudioStore((s) => s.deletePipelineEdge);
  const importPipelineFlow = useStudioStore((s) => s.importPipelineFlow);
  const comfyLoras = useStudioStore((s) => s.comfyLoras);
  const runPipeline = useStudioStore((s) => s.runPipeline);
  const isCrafting = useStudioStore((s) => s.isCrafting);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  const offsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const flowUploadRef = useRef<HTMLInputElement | null>(null);

  const nodeMap = new Map(project.pipelineNodes.map((n) => [n.id, n]));

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(12, Math.round(e.clientX - rect.left + containerRef.current.scrollLeft - offsetRef.current.dx));
    const y = Math.max(12, Math.round(e.clientY - rect.top + containerRef.current.scrollTop - offsetRef.current.dy));
    updatePipelineNode(draggingId, { x, y });
  };

  const exportFlow = () => {
    const payload = {
      name: `${project.name} Flow`,
      version: '0.3.0',
      nodes: project.pipelineNodes,
      edges: project.pipelineEdges,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.id}.alpemox-flow.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFlow = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || '{}'));
        if (Array.isArray(data.nodes) && Array.isArray(data.edges)) {
          importPipelineFlow(data.nodes, data.edges);
        }
      } catch {
        // ignore invalid json
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const addableNodes: Array<{ type: PipelineNodeType; label: string; cfg: Record<string, unknown> }> = [
    { type: 'lora', label: 'LoRA Yükleyici', cfg: { loraName: comfyLoras[0] || '', strength: 0.75 } },
    { type: 'upscale', label: 'Upscale (1.5x)', cfg: { factor: 1.5 } },
    { type: 'controlnet', label: 'ControlNet Canny', cfg: { weight: 0.7 } },
    { type: 'audio', label: 'Alpemox Sound Synth', cfg: { preset: 'cyber-pulse' } },
  ];

  const loadTemplateFlow = (tpl: 'depth3d' | 'batch4x' | 'inpaint2d') => {
    if (tpl === 'depth3d') {
      const nodes: PipelineNode[] = [
        { id: 'n-p', type: 'prompt', label: 'Prompt & Yönetmen', x: 36, y: 60, config: { prompt: 'Cyberpunk character portrait, cinematic neon rim light' } },
        { id: 'n-3d', type: 'stage3d', label: '3D Sahne (RGB + Depth)', x: 36, y: 260, config: { captureMode: 'rgb+depth' } },
        { id: 'n-cn', type: 'controlnet', label: 'Depth & Pose Rehberi', x: 340, y: 170, config: { weight: 0.8 } },
        { id: 'n-m', type: 'model', label: 'AI Motoru', x: 640, y: 150, config: { provider: 'pollinations', modelId: 'pollinations-flux', batchCount: 1 } },
        { id: 'n-out', type: 'output', label: '2D Katmana Aktar', x: 940, y: 170, config: { autoAddLayer: true } },
      ];
      const edges: PipelineEdge[] = [
        { id: 'te1', from: 'n-p', fromPort: 'prompt', to: 'n-m', toPort: 'prompt' },
        { id: 'te2', from: 'n-3d', fromPort: 'depth', to: 'n-cn', toPort: 'depth' },
        { id: 'te3', from: 'n-cn', fromPort: 'guide', to: 'n-m', toPort: 'control' },
        { id: 'te4', from: 'n-m', fromPort: 'result', to: 'n-out', toPort: 'input' },
      ];
      importPipelineFlow(nodes, edges);
    } else if (tpl === 'batch4x') {
      const nodes: PipelineNode[] = [
        { id: 'n-p', type: 'prompt', label: 'Konsept Prompt', x: 40, y: 120, config: { prompt: 'Minimalist futuristic studio product design, dark glass' } },
        { id: 'n-m', type: 'model', label: 'Batch 4x Üretim', x: 340, y: 120, config: { provider: 'pollinations', modelId: 'pollinations-flux', batchCount: 4 } },
        { id: 'n-up', type: 'upscale', label: 'Upscale (1.5x)', x: 640, y: 120, config: { factor: 1.5 } },
        { id: 'n-out', type: 'output', label: '2D Katmana Aktar', x: 940, y: 120, config: { autoAddLayer: true } },
      ];
      const edges: PipelineEdge[] = [
        { id: 'be1', from: 'n-p', fromPort: 'prompt', to: 'n-m', toPort: 'prompt' },
        { id: 'be2', from: 'n-m', fromPort: 'result', to: 'n-up', toPort: 'input' },
        { id: 'be3', from: 'n-up', fromPort: 'result', to: 'n-out', toPort: 'input' },
      ];
      importPipelineFlow(nodes, edges);
    } else {
      const nodes: PipelineNode[] = [
        { id: 'n-p', type: 'prompt', label: 'Inpaint Prompt', x: 40, y: 60, config: { prompt: 'Replace background with rainy Tokyo night street' } },
        { id: 'n-2d', type: 'canvas2d', label: '2D Kanvas + Maske', x: 40, y: 250, config: { useMask: true } },
        { id: 'n-lora', type: 'lora', label: 'LoRA Stili', x: 340, y: 250, config: { loraName: comfyLoras[0] || 'detail.safetensors', strength: 0.75 } },
        { id: 'n-m', type: 'model', label: 'AI Inpaint Motoru', x: 640, y: 150, config: { provider: 'pollinations', modelId: 'pollinations-flux', batchCount: 1 } },
        { id: 'n-out', type: 'output', label: '2D Katmana Aktar', x: 940, y: 170, config: { autoAddLayer: true } },
      ];
      const edges: PipelineEdge[] = [
        { id: 'ie1', from: 'n-p', fromPort: 'prompt', to: 'n-m', toPort: 'prompt' },
        { id: 'ie2', from: 'n-2d', fromPort: 'image', to: 'n-m', toPort: 'image' },
        { id: 'ie3', from: 'n-lora', fromPort: 'lora', to: 'n-m', toPort: 'lora' },
        { id: 'ie4', from: 'n-m', fromPort: 'result', to: 'n-out', toPort: 'input' },
      ];
      importPipelineFlow(nodes, edges);
    }
  };

  const autoArrangeNodes = () => {
    const arranged = project.pipelineNodes.map((n, idx) => ({
      ...n,
      x: 40 + (idx % 4) * 290,
      y: 50 + Math.floor(idx / 4) * 210,
    }));
    importPipelineFlow(arranged, project.pipelineEdges);
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#090b10]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-[#111521] px-3 py-1.5 text-xs">
        <div className="flex items-center gap-2">
          <Workflow className="h-4 w-4 text-violet-400" />
          <span className="font-semibold text-slate-100">Görsel Node Pipeline</span>
          <div className="flex flex-wrap items-center gap-1">
            {addableNodes.map((n) => (
              <button
                key={n.type + n.label}
                onClick={() => addPipelineNode(n.type, n.label, n.cfg)}
                className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-slate-700"
              >
                <Plus className="h-3 w-3 text-sky-400" />
                {n.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="hidden items-center gap-1 xl:flex">
            {(
              [
                ['depth3d', 'Şablon: 3D Depth'],
                ['batch4x', '4x Varyasyon'],
                ['inpaint2d', '2D Maske'],
              ] as const
            ).map(([tpl, label]) => (
              <button
                key={tpl}
                onClick={() => loadTemplateFlow(tpl)}
                className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300 hover:border-violet-400"
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={autoArrangeNodes}
            title="Düğümleri ızgaraya düzenli hizala"
            className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
          >
            <LayoutGrid className="h-3 w-3" />
            Oto Diz
          </button>
          {connectFromId && (
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300">
              Hedef düğümün Giriş (+) ikonuna tıkla
            </span>
          )}
          <button
            onClick={() => flowUploadRef.current?.click()}
            className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
          >
            <Upload className="h-3 w-3" />
            Flow Yükle
          </button>
          <input ref={flowUploadRef} type="file" accept=".json" onChange={handleImportFlow} className="hidden" />
          <button
            onClick={exportFlow}
            className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
          >
            <Download className="h-3 w-3" />
            .alpemox-flow
          </button>
          <button
            onClick={() => runPipeline()}
            disabled={isCrafting}
            className="flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            {isCrafting ? 'Çalıştırılıyor...' : 'Pipeline Çalıştır'}
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        onPointerMove={onPointerMove}
        onPointerUp={() => setDraggingId(null)}
        onPointerLeave={() => setDraggingId(null)}
        className="relative flex-1 overflow-auto bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]"
      >
        <svg className="absolute inset-0 h-full w-full min-h-[720px] min-w-[1300px]">
          {project.pipelineEdges.map((edge) => {
            const from = nodeMap.get(edge.from);
            const to = nodeMap.get(edge.to);
            if (!from || !to) return null;
            const x1 = from.x + 240;
            const y1 = from.y + 52;
            const x2 = to.x;
            const y2 = to.y + 52;
            const mx = (x1 + x2) / 2;
            return (
              <path
                key={edge.id}
                d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeDasharray={isCrafting ? '8 6' : undefined}
                strokeOpacity="0.72"
                onClick={() => deletePipelineEdge(edge.id)}
                className="cursor-pointer hover:stroke-rose-400"
              />
            );
          })}
        </svg>

        {project.pipelineNodes.map((node) => (
          <div
            key={node.id}
            style={{ left: node.x, top: node.y }}
            className={`absolute w-[240px] rounded-xl border p-3 shadow-xl backdrop-blur-md ${
              NODE_COLORS[node.type] || 'border-slate-700 bg-slate-900/90'
            }`}
          >
            <div
              onPointerDown={(e) => {
                if (!containerRef.current) return;
                const rect = containerRef.current.getBoundingClientRect();
                offsetRef.current = {
                  dx: e.clientX - rect.left + containerRef.current.scrollLeft - node.x,
                  dy: e.clientY - rect.top + containerRef.current.scrollTop - node.y,
                };
                setDraggingId(node.id);
              }}
              className="mb-2 flex cursor-grab items-center justify-between border-b border-white/10 pb-1.5 active:cursor-grabbing"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (connectFromId && connectFromId !== node.id) {
                    addPipelineEdge(connectFromId, node.id);
                    setConnectFromId(null);
                  }
                }}
                title="Giriş Portu"
                className={`h-3 w-3 rounded-full border border-white/50 ${
                  connectFromId && connectFromId !== node.id ? 'bg-amber-400 animate-pulse' : 'bg-slate-700'
                }`}
              />
              <span className="truncate px-1 text-[11px] font-bold uppercase tracking-wide text-slate-200">
                {node.label}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConnectFromId(connectFromId === node.id ? null : node.id);
                  }}
                  title="Kablo Bağla (Çıkış)"
                  className={`rounded p-0.5 ${
                    connectFromId === node.id ? 'bg-amber-500 text-black' : 'text-sky-400 hover:bg-white/10'
                  }`}
                >
                  <Link2 className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePipelineNode(node.id);
                  }}
                  className="rounded p-0.5 text-slate-400 hover:text-rose-400"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            {node.type === 'prompt' && (
              <textarea
                rows={3}
                value={String(node.config.prompt || '')}
                onChange={(e) =>
                  updatePipelineNode(node.id, { config: { ...node.config, prompt: e.target.value } })
                }
                className="w-full rounded border border-slate-700/80 bg-black/40 p-1.5 text-[11px] text-slate-200 focus:border-sky-500 focus:outline-none"
              />
            )}

            {node.type === 'model' && (
              <div className="space-y-1.5">
                <select
                  value={String(node.config.modelId || 'pollinations-flux')}
                  onChange={(e) => {
                    const m = MODEL_CATALOG.find((x) => x.id === e.target.value);
                    updatePipelineNode(node.id, {
                      config: {
                        ...node.config,
                        modelId: e.target.value,
                        provider: m?.provider || 'pollinations',
                      },
                    });
                  }}
                  className="w-full rounded border border-slate-700/80 bg-black/50 p-1.5 text-[11px] text-slate-200"
                >
                  {MODEL_CATALOG.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <label className="flex items-center justify-between text-[10px] text-slate-300">
                  <span>Batch Varyasyon</span>
                  <select
                    value={Number(node.config.batchCount || 1)}
                    onChange={(e) =>
                      updatePipelineNode(node.id, { config: { ...node.config, batchCount: Number(e.target.value) } })
                    }
                    className="rounded border border-slate-700 bg-black/50 px-1 py-0.5 text-slate-200"
                  >
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                    <option value={4}>4x</option>
                  </select>
                </label>
              </div>
            )}

            {node.type === 'lora' && (
              <div className="space-y-1 text-[11px] text-slate-300">
                <input
                  type="text"
                  placeholder="LoRA adı (örn. detail.safetensors)"
                  value={String(node.config.loraName || '')}
                  onChange={(e) =>
                    updatePipelineNode(node.id, { config: { ...node.config, loraName: e.target.value } })
                  }
                  className="w-full rounded border border-slate-700 bg-black/40 px-1.5 py-1 text-[10px]"
                />
                <label className="flex items-center justify-between text-[10px]">
                  <span>Güç ({Number(node.config.strength ?? 0.75)})</span>
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.05}
                    value={Number(node.config.strength ?? 0.75)}
                    onChange={(e) =>
                      updatePipelineNode(node.id, { config: { ...node.config, strength: Number(e.target.value) } })
                    }
                    className="w-24 accent-fuchsia-400"
                  />
                </label>
              </div>
            )}

            {node.type === 'upscale' && (
              <label className="flex items-center justify-between text-[11px] text-slate-300">
                <span>Çarpan</span>
                <select
                  value={Number(node.config.factor ?? 1.5)}
                  onChange={(e) =>
                    updatePipelineNode(node.id, { config: { ...node.config, factor: Number(e.target.value) } })
                  }
                  className="rounded border border-slate-700 bg-black/40 px-1.5 py-0.5"
                >
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                </select>
              </label>
            )}

            {node.type === 'controlnet' && (
              <label className="flex items-center justify-between text-[11px] text-slate-300">
                <span>Depth Ağırlığı</span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={Number(node.config.weight ?? 0.78)}
                  onChange={(e) =>
                    updatePipelineNode(node.id, { config: { ...node.config, weight: Number(e.target.value) } })
                  }
                  className="w-16 rounded border border-slate-700 bg-black/40 px-1.5 py-0.5 text-right text-slate-200"
                />
              </label>
            )}

            {node.type === 'output' && (
              <label className="flex items-center gap-2 text-[11px] text-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(node.config.autoAddLayer)}
                  onChange={(e) =>
                    updatePipelineNode(node.id, {
                      config: { ...node.config, autoAddLayer: e.target.checked },
                    })
                  }
                  className="accent-sky-400"
                />
                Çıktıyı 2D Katmana Ekle
              </label>
            )}

            {(node.type === 'stage3d' || node.type === 'canvas2d' || node.type === 'audio') && (
              <p className="text-[11px] text-slate-400">
                {node.type === 'audio'
                  ? 'Alpemox Sound Synth ses akışını hazırlar.'
                  : `Aktif viewport görüntüsünü (${node.type === 'stage3d' ? 'RGB + Depth' : 'Kompozit + Maske'}) bağlar.`}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
