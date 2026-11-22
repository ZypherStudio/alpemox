import { useRef, useState } from 'react';
import {
  MousePointer2,
  PenTool,
  Square,
  Circle,
  Type,
  Download,
  Layers,
  Trash2,
  Check,
  Grid3X3,
  Copy,
  AlignCenterHorizontal,
  AlignCenterVertical,
  Box,
  Upload,
  Star,
  Minus,
  Hexagon,
} from 'lucide-react';
import type { VectorElement, VectorPoint } from '@opencraft/shared';
import { useStudioStore } from '../store/useStudioStore';

type VecTool = 'select' | 'pen' | 'rect' | 'ellipse' | 'star' | 'polygon' | 'line' | 'text';

function polygonPointsString(cx: number, cy: number, rx: number, ry: number, sides = 6): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    pts.push(`${(cx + rx * Math.cos(angle)).toFixed(1)},${(cy + ry * Math.sin(angle)).toFixed(1)}`);
  }
  return pts.join(' ');
}

function starPointsString(cx: number, cy: number, outerR: number, innerR: number, spikes = 5): string {
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`);
  }
  return pts.join(' ');
}

function pointsToSmoothBezierPath(points: VectorPoint[], ox: number, oy: number, closed?: boolean): string {
  if (points.length < 2) return '';
  let d = `M ${ox + points[0].x} ${oy + points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = ox + p1.x + (p2.x - p0.x) / 6;
    const cp1y = oy + p1.y + (p2.y - p0.y) / 6;
    const cp2x = ox + p2.x - (p3.x - p1.x) / 6;
    const cp2y = oy + p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${ox + p2.x} ${oy + p2.y}`;
  }
  return closed ? `${d} Z` : d;
}

export function VectorEditor() {
  const project = useStudioStore((s) => s.project);
  const selectedVectorId = useStudioStore((s) => s.selectedVectorId);
  const setSelectedVectorId = useStudioStore((s) => s.setSelectedVectorId);
  const addVector = useStudioStore((s) => s.addVector);
  const updateVector = useStudioStore((s) => s.updateVector);
  const deleteVector = useStudioStore((s) => s.deleteVector);
  const bringVectorToFront = useStudioStore((s) => s.bringVectorToFront);
  const add2DLayer = useStudioStore((s) => s.add2DLayer);
  const projectVectorTo3DExtrude = useStudioStore((s) => s.projectVectorTo3DExtrude);
  const setViewportMode = useStudioStore((s) => s.setViewportMode);

  const [tool, setTool] = useState<VecTool>('select');
  const [fillColor, setFillColor] = useState('#38bdf8');
  const [strokeColor, setStrokeColor] = useState('#bae6fd');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [showGrid, setShowGrid] = useState(true);
  const [snapGrid, setSnapGrid] = useState(true);
  const [smoothCurve, setSmoothCurve] = useState(true);
  const [draftPoints, setDraftPoints] = useState<VectorPoint[]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const svgUploadRef = useRef<HTMLInputElement | null>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const anchorDragRef = useRef<{ vecId: string; pointIdx: number } | null>(null);

  const vectors = project.vectors || [];
  const selected = vectors.find((v) => v.id === selectedVectorId);

  const snap = (val: number) => (snapGrid ? Math.round(val / 16) * 16 : Math.round(val));

  const toSvgCoords = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: snap(((clientX - rect.left) / rect.width) * 1024),
      y: snap(((clientY - rect.top) / rect.height) * 1024),
    };
  };

  const commitDraftPath = (closed = false) => {
    if (draftPoints.length < 2) {
      setDraftPoints([]);
      return;
    }
    const xs = draftPoints.map((p) => p.x);
    const ys = draftPoints.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const relPoints = draftPoints.map((p) => ({ x: p.x - minX, y: p.y - minY }));
    addVector({
      name: `Bezier Path ${vectors.length + 1}`,
      kind: 'path',
      x: minX,
      y: minY,
      width: Math.max(20, Math.max(...xs) - minX),
      height: Math.max(20, Math.max(...ys) - minY),
      points: relPoints,
      closed,
      smoothBezier: smoothCurve,
      fillColor: closed ? fillColor : 'transparent',
      strokeColor,
      strokeWidth,
    });
    setDraftPoints([]);
    setTool('select');
  };

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const pt = toSvgCoords(e.clientX, e.clientY);
    if (tool === 'pen') {
      setDraftPoints((prev) => [...prev, pt]);
      return;
    }
    if (tool === 'rect' || tool === 'ellipse' || tool === 'star' || tool === 'polygon' || tool === 'line') {
      addVector({
        name:
          tool === 'rect'
            ? 'Vektör Kutu'
            : tool === 'ellipse'
              ? 'Vektör Elips'
              : tool === 'star'
                ? 'Vektör Yıldız'
                : tool === 'polygon'
                  ? 'Çokgen (Altıgen)'
                  : 'Çizgi',
        kind: tool,
        x: pt.x - 112,
        y: pt.y - 80,
        width: 224,
        height: tool === 'line' ? 4 : 160,
        cornerRadius: 16,
        fillColor,
        strokeColor,
        strokeWidth,
      });
      setTool('select');
      return;
    }
    if (tool === 'text') {
      addVector({
        name: 'Vektör Başlık',
        kind: 'text',
        x: pt.x,
        y: pt.y,
        width: 340,
        height: 60,
        fillColor: strokeColor,
        strokeColor: 'transparent',
        strokeWidth: 0,
        textContent: 'ALPEMOX VECTOR',
        fontSize: 40,
      });
      setTool('select');
    }
  };

  const buildSvgString = () => {
    const defs: string[] = [
      '<filter id="alp-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000000" flood-opacity="0.45"/></filter>',
    ];
    const body = vectors
      .filter((v) => v.visible)
      .map((v) => {
        let fillAttr = v.fillColor;
        if (v.gradientEndColor) {
          const gid = `grad-${v.id}`;
          defs.push(
            `<linearGradient id="${gid}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${v.fillColor}"/><stop offset="100%" stop-color="${v.gradientEndColor}"/></linearGradient>`,
          );
          fillAttr = `url(#${gid})`;
        }
        const filterAttr = v.dropShadow ? ' filter="url(#alp-shadow)"' : '';
        const dashAttr = v.dashed ? ' stroke-dasharray="14 10"' : '';
        const opAttr = v.opacity !== undefined && v.opacity < 1 ? ` opacity="${v.opacity}"` : '';
        const rotAttr = v.rotation
          ? ` transform="rotate(${v.rotation} ${v.x + v.width / 2} ${v.y + v.height / 2})"`
          : '';
        const clsAttr = v.motionPreset && v.motionPreset !== 'none' ? ` class="alp-anim-${v.motionPreset}"` : '';
        const common = `${dashAttr}${opAttr}${rotAttr}${clsAttr}${filterAttr}`;

        if (v.kind === 'rect') {
          return `<rect x="${v.x}" y="${v.y}" width="${v.width}" height="${v.height}" rx="${v.cornerRadius ?? 12}" fill="${fillAttr}" stroke="${v.strokeColor}" stroke-width="${v.strokeWidth}"${common} />`;
        }
        if (v.kind === 'ellipse') {
          return `<ellipse cx="${v.x + v.width / 2}" cy="${v.y + v.height / 2}" rx="${v.width / 2}" ry="${v.height / 2}" fill="${fillAttr}" stroke="${v.strokeColor}" stroke-width="${v.strokeWidth}"${common} />`;
        }
        if (v.kind === 'star') {
          const pts = starPointsString(v.x + v.width / 2, v.y + v.height / 2, Math.min(v.width, v.height) / 2, Math.min(v.width, v.height) / 4.2);
          return `<polygon points="${pts}" fill="${fillAttr}" stroke="${v.strokeColor}" stroke-width="${v.strokeWidth}"${common} />`;
        }
        if (v.kind === 'polygon') {
          const pts = polygonPointsString(v.x + v.width / 2, v.y + v.height / 2, v.width / 2, v.height / 2, 6);
          return `<polygon points="${pts}" fill="${fillAttr}" stroke="${v.strokeColor}" stroke-width="${v.strokeWidth}"${common} />`;
        }
        if (v.kind === 'line') {
          return `<line x1="${v.x}" y1="${v.y}" x2="${v.x + v.width}" y2="${v.y + v.height}" stroke="${v.strokeColor}" stroke-width="${Math.max(2, v.strokeWidth)}" stroke-linecap="round"${common} />`;
        }
        if (v.kind === 'text') {
          return `<text x="${v.x}" y="${v.y + (v.fontSize || 34)}" fill="${v.fillColor}" font-family="Inter, sans-serif" font-weight="700" font-size="${v.fontSize || 34}"${common}>${v.textContent || ''}</text>`;
        }
        if (v.kind === 'path' && v.points && v.points.length > 1) {
          const d = v.smoothBezier
            ? pointsToSmoothBezierPath(v.points, v.x, v.y, v.closed)
            : v.points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${v.x + p.x} ${v.y + p.y}`).join(' ') +
              (v.closed ? ' Z' : '');
          return `<path d="${d}" fill="${fillAttr}" stroke="${v.strokeColor}" stroke-width="${v.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${common} />`;
        }
        return '';
      })
      .join('\n  ');

    const animCss =
      '<style>@keyframes alp-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}@keyframes alp-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes alp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}.alp-anim-pulse{animation:alp-pulse 2.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center}.alp-anim-spin{animation:alp-spin 6s linear infinite;transform-box:fill-box;transform-origin:center}.alp-anim-float{animation:alp-float 2.6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}</style>';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">\n  <defs>${animCss}${defs.join('')}</defs>\n  ${body}\n</svg>`;
  };

  const handleImportSvg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const txt = String(reader.result || '');
      const paths = [...txt.matchAll(/d="([^"]+)"/g)].map((m) => m[1]);
      if (paths.length > 0) {
        addVector({
          name: file.name,
          kind: 'rect',
          x: 200,
          y: 200,
          width: 320,
          height: 320,
          fillColor: '#4e7bfb',
          strokeColor: '#bae6fd',
          strokeWidth: 4,
          rawSvgMarkup: txt,
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const exportSvg = () => {
    const svg = buildSvgString();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.id}-alpemox-vector.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendTo2DCanvas = () => {
    const svg = buildSvgString();
    const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    add2DLayer({
      name: 'Vektör Katmanı (SVG)',
      kind: 'raster',
      x: 0,
      y: 0,
      width: project.canvasWidth,
      height: project.canvasHeight,
      dataUrl,
    });
  };

  const extrudeTo3D = () => {
    const svg = buildSvgString();
    projectVectorTo3DExtrude(svg, 'Vektör 3D Extrude');
    setViewportMode('3d');
  };

  const duplicateSelected = (v: VectorElement) => {
    addVector({
      ...v,
      id: undefined,
      name: `${v.name} Kopya`,
      x: v.x + 32,
      y: v.y + 32,
    });
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#0b0d13]">
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800/80 bg-[#111521] px-2.5 py-1.5 text-xs">
        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              ['select', 'Seç', MousePointer2],
              ['pen', 'Bezier Kalem', PenTool],
              ['rect', 'Kutu', Square],
              ['ellipse', 'Elips', Circle],
              ['star', 'Yıldız', Star],
              ['polygon', 'Poligon', Hexagon],
              ['line', 'Çizgi', Minus],
              ['text', 'Metin', Type],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTool(id)}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition ${
                tool === id ? 'bg-indigo-500/25 text-indigo-300 ring-1 ring-indigo-500/50' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          ))}

          {tool === 'pen' && (
            <>
              <button
                onClick={() => setSmoothCurve((s) => !s)}
                className={`rounded px-2 py-1 text-[10px] ${smoothCurve ? 'bg-violet-500/25 text-violet-300' : 'bg-slate-800 text-slate-400'}`}
              >
                Smooth Bezier: {smoothCurve ? 'Açık' : 'Düz'}
              </button>
              {draftPoints.length > 0 && (
                <>
                  <button
                    onClick={() => commitDraftPath(false)}
                    className="flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-300"
                  >
                    <Check className="h-3 w-3" />
                    Açık Bitir ({draftPoints.length})
                  </button>
                  <button
                    onClick={() => commitDraftPath(true)}
                    className="rounded bg-sky-500/20 px-2 py-1 text-[11px] font-semibold text-sky-300"
                  >
                    Kapalı Şekil
                  </button>
                </>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setShowGrid((g) => !g)}
            title="Izgara Göster"
            className={`rounded p-1 ${showGrid ? 'bg-slate-700 text-sky-300' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Grid3X3 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setSnapGrid((s) => !s)}
            className={`rounded px-1.5 py-0.5 text-[10px] ${snapGrid ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-400'}`}
          >
            Snap
          </button>

          <label className="flex items-center gap-1 text-[10px] text-slate-400">
            Dolgu
            <input
              type="color"
              value={selected?.fillColor?.slice(0, 7) || fillColor.slice(0, 7)}
              onChange={(e) => {
                setFillColor(e.target.value);
                if (selected) updateVector(selected.id, { fillColor: e.target.value });
              }}
              className="h-5 w-6 cursor-pointer rounded border border-slate-700 bg-transparent"
            />
          </label>
          <label className="flex items-center gap-1 text-[10px] text-slate-400">
            Grad
            <input
              type="color"
              value={selected?.gradientEndColor || '#6366f1'}
              onChange={(e) => {
                if (selected) updateVector(selected.id, { gradientEndColor: e.target.value });
              }}
              className="h-5 w-6 cursor-pointer rounded border border-slate-700 bg-transparent"
            />
          </label>
          <label className="flex items-center gap-1 text-[10px] text-slate-400">
            Kontur
            <input
              type="color"
              value={selected?.strokeColor?.startsWith('#') ? selected.strokeColor : strokeColor}
              onChange={(e) => {
                setStrokeColor(e.target.value);
                if (selected) updateVector(selected.id, { strokeColor: e.target.value });
              }}
              className="h-5 w-6 cursor-pointer rounded border border-slate-700 bg-transparent"
            />
          </label>
          <input
            type="number"
            min={0}
            max={24}
            title="Kontur kalınlığı"
            value={selected ? selected.strokeWidth : strokeWidth}
            onChange={(e) => {
              const v = Number(e.target.value);
              setStrokeWidth(v);
              if (selected) updateVector(selected.id, { strokeWidth: v });
            }}
            className="w-10 rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-slate-200"
          />

          {selected && (
            <>
              <button
                onClick={() => updateVector(selected.id, { x: Math.round((1024 - selected.width) / 2) })}
                title="Yatay Ortala"
                className="rounded bg-slate-800 p-1 text-slate-300 hover:bg-slate-700"
              >
                <AlignCenterHorizontal className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => updateVector(selected.id, { y: Math.round((1024 - selected.height) / 2) })}
                title="Dikey Ortala"
                className="rounded bg-slate-800 p-1 text-slate-300 hover:bg-slate-700"
              >
                <AlignCenterVertical className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => updateVector(selected.id, { dropShadow: !selected.dropShadow })}
                className={`rounded px-1.5 py-0.5 text-[10px] ${selected.dropShadow ? 'bg-indigo-500/25 text-indigo-300' : 'bg-slate-800 text-slate-400'}`}
              >
                Gölge
              </button>
              <button
                onClick={() => updateVector(selected.id, { dashed: !selected.dashed })}
                className={`rounded px-1.5 py-0.5 text-[10px] ${selected.dashed ? 'bg-sky-500/25 text-sky-300' : 'bg-slate-800 text-slate-400'}`}
              >
                Kesikli
              </button>
              <select
                value={selected.motionPreset || 'none'}
                onChange={(e) =>
                  updateVector(selected.id, {
                    motionPreset: e.target.value as 'none' | 'pulse' | 'spin' | 'float',
                  })
                }
                title="SVG Animasyon"
                className="rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-[10px] text-slate-200"
              >
                <option value="none">Anim: Yok</option>
                <option value="pulse">Nabız</option>
                <option value="spin">Döndür</option>
                <option value="float">Yüzdür</option>
              </select>
              <label className="flex items-center gap-1 text-[10px] text-slate-400">
                Açı
                <input
                  type="range"
                  min={-180}
                  max={180}
                  value={selected.rotation || 0}
                  onChange={(e) => updateVector(selected.id, { rotation: Number(e.target.value) })}
                  className="w-12 accent-indigo-400"
                />
              </label>
              <label className="flex items-center gap-1 text-[10px] text-slate-400">
                Opak
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={selected.opacity ?? 1}
                  onChange={(e) => updateVector(selected.id, { opacity: Number(e.target.value) })}
                  className="w-10 accent-indigo-400"
                />
              </label>
              {selected.kind === 'rect' && (
                <label className="flex items-center gap-1 text-[10px] text-slate-400">
                  Köşe
                  <input
                    type="range"
                    min={0}
                    max={80}
                    value={selected.cornerRadius ?? 12}
                    onChange={(e) => updateVector(selected.id, { cornerRadius: Number(e.target.value) })}
                    className="w-10 accent-indigo-400"
                  />
                </label>
              )}
              <label className="flex items-center gap-0.5 text-[10px] text-slate-400">
                G
                <input
                  type="number"
                  min={8}
                  max={1024}
                  value={Math.round(selected.width)}
                  onChange={(e) => updateVector(selected.id, { width: Math.max(8, Number(e.target.value)) })}
                  className="w-12 rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-slate-200"
                />
              </label>
              <label className="flex items-center gap-0.5 text-[10px] text-slate-400">
                Y
                <input
                  type="number"
                  min={4}
                  max={1024}
                  value={Math.round(selected.height)}
                  onChange={(e) => updateVector(selected.id, { height: Math.max(4, Number(e.target.value)) })}
                  className="w-12 rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-slate-200"
                />
              </label>
              <button
                onClick={() => bringVectorToFront(selected.id)}
                title="Öne Al (En Üst Katman)"
                className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
              >
                Öne Al
              </button>
              <button
                onClick={() => duplicateSelected(selected)}
                title="Çoğalt"
                className="rounded bg-slate-800 p-1 text-slate-300 hover:bg-slate-700"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => deleteVector(selected.id)}
                className="rounded bg-rose-500/20 p-1 text-rose-300 hover:bg-rose-500/35"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          <button
            onClick={() => svgUploadRef.current?.click()}
            className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
          >
            <Upload className="h-3 w-3" />
            SVG Aç
          </button>
          <input ref={svgUploadRef} type="file" accept=".svg" onChange={handleImportSvg} className="hidden" />

          <button
            onClick={extrudeTo3D}
            title="Bu vektörü 3D sahneye kalınlaştırılmış 3D model olarak gönder"
            className="flex items-center gap-1 rounded bg-amber-500/20 px-2 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/35"
          >
            <Box className="h-3 w-3" />
            3D Extrude
          </button>

          <button
            onClick={sendTo2DCanvas}
            className="flex items-center gap-1 rounded bg-sky-600/20 px-2 py-1 text-[11px] font-medium text-sky-300 hover:bg-sky-600/35"
          >
            <Layers className="h-3 w-3" />
            2D’ye At
          </button>

          <button
            onClick={exportSvg}
            className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
          >
            <Download className="h-3 w-3" />
            SVG
          </button>
        </div>
      </div>

      <div className="checker-bg relative flex flex-1 items-center justify-center overflow-auto p-4">
        <svg
          ref={svgRef}
          viewBox="0 0 1024 1024"
          onPointerDown={handleSvgPointerDown}
          onPointerMove={(e) => {
            const pt = toSvgCoords(e.clientX, e.clientY);
            if (anchorDragRef.current) {
              const { vecId, pointIdx } = anchorDragRef.current;
              const target = vectors.find((v) => v.id === vecId);
              if (target?.points) {
                const nextPts = target.points.map((p, idx) =>
                  idx === pointIdx ? { x: pt.x - target.x, y: pt.y - target.y } : p,
                );
                updateVector(vecId, { points: nextPts });
              }
              return;
            }
            if (!dragRef.current) return;
            updateVector(dragRef.current.id, {
              x: snap(dragRef.current.origX + (pt.x - dragRef.current.startX)),
              y: snap(dragRef.current.origY + (pt.y - dragRef.current.startY)),
            });
          }}
          onPointerUp={() => {
            dragRef.current = null;
            anchorDragRef.current = null;
          }}
          className="h-[min(74vh,560px)] w-[min(74vh,560px)] rounded border border-slate-700 bg-[#10131c] shadow-2xl"
        >
          <defs>
            <style>{`
              @keyframes alp-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
              @keyframes alp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
              @keyframes alp-float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-14px); } }
              .alp-anim-pulse { animation: alp-pulse 2.2s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
              .alp-anim-spin { animation: alp-spin 6s linear infinite; transform-box: fill-box; transform-origin: center; }
              .alp-anim-float { animation: alp-float 2.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
            `}</style>
            <pattern id="vec-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="1" />
            </pattern>
            <filter id="alp-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000000" floodOpacity="0.45" />
            </filter>
            {vectors.map(
              (v) =>
                v.gradientEndColor && (
                  <linearGradient key={`g-${v.id}`} id={`grad-${v.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={v.fillColor} />
                    <stop offset="100%" stopColor={v.gradientEndColor} />
                  </linearGradient>
                ),
            )}
          </defs>

          {showGrid && <rect width="1024" height="1024" fill="url(#vec-grid)" />}

          {vectors
            .filter((v) => v.visible)
            .map((v) => {
              const isSel = v.id === selectedVectorId;
              const fillAttr = v.gradientEndColor ? `url(#grad-${v.id})` : v.fillColor;
              const startDrag = (e: React.PointerEvent) => {
                if (tool !== 'select') return;
                e.stopPropagation();
                setSelectedVectorId(v.id);
                const pt = toSvgCoords(e.clientX, e.clientY);
                dragRef.current = { id: v.id, startX: pt.x, startY: pt.y, origX: v.x, origY: v.y };
              };

              const cx = v.x + v.width / 2;
              const cy = v.y + v.height / 2;
              const animClass =
                v.motionPreset && v.motionPreset !== 'none' ? `alp-anim-${v.motionPreset}` : '';
              const dashAttr = v.dashed ? '14 10' : undefined;
              return (
                <g
                  key={v.id}
                  onPointerDown={startDrag}
                  opacity={v.opacity ?? 1}
                  transform={v.rotation ? `rotate(${v.rotation} ${cx} ${cy})` : undefined}
                  filter={v.dropShadow ? 'url(#alp-shadow)' : undefined}
                  className={`cursor-move ${animClass}`}
                >
                  {v.kind === 'rect' && (
                    <rect
                      x={v.x}
                      y={v.y}
                      width={v.width}
                      height={v.height}
                      rx={v.cornerRadius ?? 12}
                      fill={fillAttr}
                      stroke={v.strokeColor}
                      strokeWidth={v.strokeWidth}
                      strokeDasharray={dashAttr}
                    />
                  )}
                  {v.kind === 'ellipse' && (
                    <ellipse
                      cx={cx}
                      cy={cy}
                      rx={v.width / 2}
                      ry={v.height / 2}
                      fill={fillAttr}
                      stroke={v.strokeColor}
                      strokeWidth={v.strokeWidth}
                      strokeDasharray={dashAttr}
                    />
                  )}
                  {v.kind === 'star' && (
                    <polygon
                      points={starPointsString(cx, cy, Math.min(v.width, v.height) / 2, Math.min(v.width, v.height) / 4.2)}
                      fill={fillAttr}
                      stroke={v.strokeColor}
                      strokeWidth={v.strokeWidth}
                      strokeDasharray={dashAttr}
                    />
                  )}
                  {v.kind === 'polygon' && (
                    <polygon
                      points={polygonPointsString(cx, cy, v.width / 2, v.height / 2, 6)}
                      fill={fillAttr}
                      stroke={v.strokeColor}
                      strokeWidth={v.strokeWidth}
                      strokeDasharray={dashAttr}
                    />
                  )}
                  {v.kind === 'line' && (
                    <line
                      x1={v.x}
                      y1={v.y}
                      x2={v.x + v.width}
                      y2={v.y + v.height}
                      stroke={v.strokeColor}
                      strokeWidth={Math.max(2, v.strokeWidth)}
                      strokeDasharray={dashAttr}
                      strokeLinecap="round"
                    />
                  )}
                  {v.kind === 'text' && (
                    <text
                      x={v.x}
                      y={v.y + (v.fontSize || 34)}
                      fill={v.fillColor}
                      fontFamily="Inter, sans-serif"
                      fontWeight="700"
                      fontSize={v.fontSize || 34}
                    >
                      {v.textContent}
                    </text>
                  )}
                  {v.kind === 'path' && v.points && v.points.length > 1 && (
                    <path
                      d={
                        v.smoothBezier
                          ? pointsToSmoothBezierPath(v.points, v.x, v.y, v.closed)
                          : v.points
                              .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${v.x + p.x} ${v.y + p.y}`)
                              .join(' ') + (v.closed ? ' Z' : '')
                      }
                      fill={fillAttr}
                      stroke={v.strokeColor}
                      strokeWidth={v.strokeWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {isSel && (
                    <>
                      <rect
                        x={v.x - 6}
                        y={v.y - 6}
                        width={v.width + 12}
                        height={v.height + 12}
                        fill="none"
                        stroke="#38bdf8"
                        strokeDasharray="8 6"
                        strokeWidth={2}
                      />
                      {v.kind === 'path' &&
                        v.points?.map((p, idx) => (
                          <circle
                            key={idx}
                            cx={v.x + p.x}
                            cy={v.y + p.y}
                            r={8}
                            fill="#fbbf24"
                            stroke="#0f172a"
                            strokeWidth={2}
                            onPointerDown={(ev) => {
                              ev.stopPropagation();
                              anchorDragRef.current = { vecId: v.id, pointIdx: idx };
                            }}
                            className="cursor-pointer"
                          />
                        ))}
                    </>
                  )}
                </g>
              );
            })}

          {draftPoints.length > 0 && (
            <g>
              <path
                d={
                  smoothCurve && draftPoints.length >= 2
                    ? pointsToSmoothBezierPath(draftPoints, 0, 0, false)
                    : draftPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                }
                fill="none"
                stroke="#f59e0b"
                strokeWidth={4}
              />
              {draftPoints.map((p, idx) => (
                <circle key={idx} cx={p.x} cy={p.y} r={7} fill="#fbbf24" />
              ))}
            </g>
          )}
        </svg>

        {selected?.kind === 'text' && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-1.5 text-xs shadow-xl">
            <span className="text-slate-400">Metin:</span>
            <input
              type="text"
              value={selected.textContent || ''}
              onChange={(e) => updateVector(selected.id, { textContent: e.target.value })}
              className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-slate-100"
            />
          </div>
        )}
      </div>
    </div>
  );
}
