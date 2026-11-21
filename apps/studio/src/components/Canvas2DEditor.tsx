import { useEffect, useRef, useState } from 'react';
import {
  MousePointer2,
  Paintbrush,
  Eraser,
  Sparkles,
  Square,
  Circle,
  Type,
  Download,
  Trash2,
  Wand2,
  FlipHorizontal2,
  FlipVertical2,
  ImagePlus,
  SlidersHorizontal,
  Undo2,
  Redo2,
  Pipette,
  Droplet,
  ScanLine,
  Copy,
  Layers,
  Crop,
  Check,
} from 'lucide-react';
import { DEFAULT_LAYER_FILTERS, type Layer2D, type LutPreset } from '@opencraft/shared';
import { useStudioStore, type CanvasTool } from '../store/useStudioStore';

const LUT_FILTERS: Record<LutPreset, string> = {
  none: '',
  'teal-orange': 'contrast(112%) saturate(125%) sepia(18%) hue-rotate(-10deg)',
  noir: 'grayscale(100%) contrast(145%) brightness(95%)',
  'cyber-neon': 'contrast(120%) saturate(165%) hue-rotate(18deg)',
  'warm-kodak': 'sepia(24%) saturate(118%) brightness(104%) contrast(106%)',
};

export function Canvas2DEditor() {
  const project = useStudioStore((s) => s.project);
  const viewportMode = useStudioStore((s) => s.viewportMode);
  const activeTool = useStudioStore((s) => s.activeTool);
  const setActiveTool = useStudioStore((s) => s.setActiveTool);
  const brushColor = useStudioStore((s) => s.brushColor);
  const setBrushColor = useStudioStore((s) => s.setBrushColor);
  const brushSize = useStudioStore((s) => s.brushSize);
  const setBrushSize = useStudioStore((s) => s.setBrushSize);
  const brushOpacity = useStudioStore((s) => s.brushOpacity);
  const setBrushOpacity = useStudioStore((s) => s.setBrushOpacity);
  const bgTolerance = useStudioStore((s) => s.bgTolerance);
  const setBgTolerance = useStudioStore((s) => s.setBgTolerance);
  const selectedLayerId = useStudioStore((s) => s.selectedLayerId);
  const setSelectedLayerId = useStudioStore((s) => s.setSelectedLayerId);
  const update2DLayer = useStudioStore((s) => s.update2DLayer);
  const add2DLayer = useStudioStore((s) => s.add2DLayer);
  const setCanvasSize = useStudioStore((s) => s.setCanvasSize);
  const registerCanvasExport = useStudioStore((s) => s.registerCanvasExport);
  const license = useStudioStore((s) => s.license);
  const setPricingOpen = useStudioStore((s) => s.setPricingOpen);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const paintCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportBoxRef = useRef<HTMLDivElement | null>(null);
  const imageUploadRef = useRef<HTMLInputElement | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Undo / Redo paint snapshots
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);

  const [zoom, setZoom] = useState(0.28);
  const [manualZoom, setManualZoom] = useState(false);
  const [showPhotoAdjust, setShowPhotoAdjust] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [drawTick, setDrawTick] = useState(0);
  const [histogram, setHistogram] = useState<number[]>(() => Array(16).fill(12));

  const loadLocalImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, project.canvasWidth / Math.max(1, img.width), project.canvasHeight / Math.max(1, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        add2DLayer({
          name: file.name.replace(/\.[^.]+$/, '').slice(0, 28) || 'İçe Aktarılan Görsel',
          kind: 'raster',
          x: Math.round((project.canvasWidth - w) / 2),
          y: Math.round((project.canvasHeight - h) / 2),
          width: w,
          height: h,
          dataUrl,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!(showPhotoAdjust || viewportMode === 'photo')) return;
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const timer = window.setTimeout(() => {
      try {
        const w = Math.min(96, c.width);
        const h = Math.min(96, c.height);
        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const octx = off.getContext('2d');
        if (!octx) return;
        octx.drawImage(c, 0, 0, w, h);
        const data = octx.getImageData(0, 0, w, h).data;
        const bins = Array(16).fill(0);
        for (let i = 0; i < data.length; i += 4) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          bins[Math.min(15, Math.floor((lum / 256) * 16))] += 1;
        }
        const maxBin = Math.max(1, ...bins);
        setHistogram(bins.map((b) => Math.max(6, Math.round((b / maxBin) * 100))));
      } catch {
        // ignore tainted canvas
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [showPhotoAdjust, viewportMode, project.layers2d, drawTick]);

  const pushPaintSnapshot = () => {
    const p = paintCanvasRef.current;
    if (!p) return;
    undoStackRef.current.push(p.toDataURL('image/png'));
    if (undoStackRef.current.length > 25) undoStackRef.current.shift();
    redoStackRef.current = [];
  };

  const restorePaintSnapshot = (dataUrl: string) => {
    const p = paintCanvasRef.current;
    const ctx = p?.getContext('2d');
    if (!p || !ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, p.width, p.height);
      ctx.drawImage(img, 0, 0);
      setDrawTick((t) => t + 1);
    };
    img.src = dataUrl;
  };

  const handleUndo = () => {
    const p = paintCanvasRef.current;
    if (!p || undoStackRef.current.length === 0) return;
    redoStackRef.current.push(p.toDataURL('image/png'));
    const prev = undoStackRef.current.pop()!;
    restorePaintSnapshot(prev);
  };

  const handleRedo = () => {
    const p = paintCanvasRef.current;
    if (!p || redoStackRef.current.length === 0) return;
    undoStackRef.current.push(p.toDataURL('image/png'));
    const next = redoStackRef.current.pop()!;
    restorePaintSnapshot(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const box = viewportBoxRef.current;
    if (!box || manualZoom) return;
    const fit = () => {
      const w = Math.max(120, box.clientWidth - 28);
      const h = Math.max(120, box.clientHeight - 28);
      const cw = project.canvasWidth || 1024;
      const ch = project.canvasHeight || 1024;
      const next = Math.min(0.65, Math.max(0.18, Math.min(w / cw, h / ch)));
      setZoom(+next.toFixed(2));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [project.canvasWidth, project.canvasHeight, manualZoom]);

  const dragStateRef = useRef<{
    mode: 'move-layer' | 'resize-layer' | 'paint' | 'mask' | 'erase' | 'smudge' | 'crop' | null;
    startX: number;
    startY: number;
    layerStartX: number;
    layerStartY: number;
    layerStartW: number;
    layerStartH: number;
    lastX: number;
    lastY: number;
  }>({
    mode: null,
    startX: 0,
    startY: 0,
    layerStartX: 0,
    layerStartY: 0,
    layerStartW: 0,
    layerStartH: 0,
    lastX: 0,
    lastY: 0,
  });

  useEffect(() => {
    const w = project.canvasWidth || 1024;
    const h = project.canvasHeight || 1024;

    if (!maskCanvasRef.current) {
      const m = document.createElement('canvas');
      m.width = w;
      m.height = h;
      maskCanvasRef.current = m;
    } else if (maskCanvasRef.current.width !== w || maskCanvasRef.current.height !== h) {
      maskCanvasRef.current.width = w;
      maskCanvasRef.current.height = h;
    }

    if (!paintCanvasRef.current) {
      const p = document.createElement('canvas');
      p.width = w;
      p.height = h;
      paintCanvasRef.current = p;
    } else if (paintCanvasRef.current.width !== w || paintCanvasRef.current.height !== h) {
      paintCanvasRef.current.width = w;
      paintCanvasRef.current.height = h;
    }

    registerCanvasExport(
      () => {
        const comp = canvasRef.current;
        const mask = maskCanvasRef.current;
        let hasMaskPixels = false;
        if (mask) {
          const ctx = mask.getContext('2d');
          if (ctx) {
            const data = ctx.getImageData(0, 0, mask.width, mask.height).data;
            for (let i = 3; i < data.length; i += 16) {
              if (data[i] > 10) {
                hasMaskPixels = true;
                break;
              }
            }
          }
        }
        return {
          compositeDataUrl: comp ? comp.toDataURL('image/png') : '',
          maskDataUrl: hasMaskPixels && mask ? mask.toDataURL('image/png') : null,
        };
      },
      () => {
        const mask = maskCanvasRef.current;
        const ctx = mask?.getContext('2d');
        if (mask && ctx) {
          ctx.clearRect(0, 0, mask.width, mask.height);
          setDrawTick((t) => t + 1);
        }
      },
    );

    return () => registerCanvasExport(null, null);
  }, [project.canvasWidth, project.canvasHeight, registerCanvasExport]);

  // Render composite canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = project.canvasWidth || 1024;
    const h = project.canvasHeight || 1024;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;

    ctx.clearRect(0, 0, w, h);

    for (const layer of project.layers2d) {
      if (!layer.visible) continue;
      ctx.save();
      ctx.globalAlpha = layer.opacity ?? 1;
      ctx.globalCompositeOperation = (layer.blendMode || 'normal') as GlobalCompositeOperation;

      const cx = layer.x + layer.width / 2;
      const cy = layer.y + layer.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate(((layer.rotation || 0) * Math.PI) / 180);
      ctx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
      ctx.translate(-layer.width / 2, -layer.height / 2);

      const f = layer.filters;
      if (f) {
        const lut = f.lutPreset ? LUT_FILTERS[f.lutPreset] : '';
        const tempSepia = f.temperature && f.temperature > 0 ? ` sepia(${Math.min(60, f.temperature)}%)` : '';
        const tempHue = f.temperature && f.temperature < 0 ? ` hue-rotate(${Math.max(-45, f.temperature)}deg)` : '';
        ctx.filter = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) blur(${f.blur}px) hue-rotate(${f.hueRotate}deg) grayscale(${f.grayscale}%) ${lut}${tempSepia}${tempHue}`.trim();
        if (f.shadowBlur && f.shadowBlur > 0) {
          ctx.shadowBlur = f.shadowBlur;
          ctx.shadowColor = f.shadowColor || '#000000';
          ctx.shadowOffsetY = Math.round(f.shadowBlur * 0.25);
        }
      }

      if (layer.kind === 'shape') {
        ctx.fillStyle = layer.fillColor || '#38bdf8';
        ctx.strokeStyle = layer.strokeColor || 'transparent';
        ctx.lineWidth = 3;
        if (layer.shapeType === 'circle') {
          ctx.beginPath();
          ctx.ellipse(layer.width / 2, layer.height / 2, layer.width / 2, layer.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(0, 0, layer.width, layer.height);
          if (layer.strokeColor) ctx.strokeRect(0, 0, layer.width, layer.height);
        }
      } else if (layer.kind === 'text') {
        ctx.fillStyle = layer.fillColor || '#f8fafc';
        ctx.font = `700 ${layer.fontSize || 34}px Inter, system-ui, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(layer.textContent || 'Metin', 0, 0);
      } else if (layer.dataUrl) {
        const cached = imageCacheRef.current.get(layer.dataUrl);
        if (cached && cached.complete) {
          ctx.drawImage(cached, 0, 0, layer.width, layer.height);
        } else if (!cached) {
          const img = new Image();
          img.onload = () => setDrawTick((t) => t + 1);
          img.src = layer.dataUrl;
          imageCacheRef.current.set(layer.dataUrl, img);
        }
      }

      if (f?.vignette && f.vignette > 0) {
        ctx.filter = 'none';
        const grad = ctx.createRadialGradient(
          layer.width / 2,
          layer.height / 2,
          layer.width * 0.25,
          layer.width / 2,
          layer.height / 2,
          Math.max(layer.width, layer.height) * 0.72,
        );
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, `rgba(0,0,0,${Math.min(0.85, f.vignette / 100)})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, layer.width, layer.height);
      }

      if (layer.id === selectedLayerId) {
        ctx.filter = 'none';
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(0, 0, layer.width, layer.height);
        ctx.setLineDash([]);
        // Bottom-right corner resize handle
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(layer.width - 14, layer.height - 14, 18, 18);
      }

      ctx.restore();
    }

    if (paintCanvasRef.current) {
      ctx.drawImage(paintCanvasRef.current, 0, 0);
    }

    if (maskCanvasRef.current) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.drawImage(maskCanvasRef.current, 0, 0);
      ctx.restore();
    }

    if (cropMode && cropRect && cropRect.w > 4 && cropRect.h > 4) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, w, h);
      ctx.clearRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
      ctx.restore();
    }
  }, [project.layers2d, project.canvasWidth, project.canvasHeight, selectedLayerId, drawTick, cropMode, cropRect]);

  const toCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = toCanvasCoords(e.clientX, e.clientY);

    if (cropMode) {
      setCropRect({ x: Math.round(pt.x), y: Math.round(pt.y), w: 0, h: 0 });
      dragStateRef.current = {
        mode: 'crop',
        startX: pt.x,
        startY: pt.y,
        layerStartX: 0,
        layerStartY: 0,
        layerStartW: 0,
        layerStartH: 0,
        lastX: pt.x,
        lastY: pt.y,
      };
      return;
    }

    if (activeTool === 'eyedropper' && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const px = ctx.getImageData(Math.floor(pt.x), Math.floor(pt.y), 1, 1).data;
        const hex = `#${[px[0], px[1], px[2]].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
        setBrushColor(hex);
        setActiveTool('brush');
      }
      return;
    }

    if (activeTool === 'rect' || activeTool === 'circle') {
      add2DLayer({
        name: activeTool === 'rect' ? 'Dikdörtgen' : 'Elips',
        kind: 'shape',
        shapeType: activeTool,
        x: Math.round(pt.x - 120),
        y: Math.round(pt.y - 120),
        width: 240,
        height: 240,
        fillColor: brushColor,
      });
      setActiveTool('select');
      return;
    }

    if (activeTool === 'text') {
      add2DLayer({
        name: 'Metin Notu',
        kind: 'text',
        x: Math.round(pt.x),
        y: Math.round(pt.y),
        width: 420,
        height: 80,
        textContent: 'YENİ SAHNE NOTU',
        fillColor: brushColor,
      });
      setActiveTool('select');
      return;
    }

    if (activeTool === 'brush' || activeTool === 'mask' || activeTool === 'eraser' || activeTool === 'smudge') {
      if (activeTool !== 'mask') pushPaintSnapshot();
      const mode =
        activeTool === 'mask'
          ? 'mask'
          : activeTool === 'eraser'
            ? 'erase'
            : activeTool === 'smudge'
              ? 'smudge'
              : 'paint';
      dragStateRef.current = {
        mode,
        startX: pt.x,
        startY: pt.y,
        layerStartX: 0,
        layerStartY: 0,
        layerStartW: 0,
        layerStartH: 0,
        lastX: pt.x,
        lastY: pt.y,
      };
      drawStroke(pt.x, pt.y, pt.x, pt.y, mode);
      return;
    }

    // Check resize handle on selected layer first
    const sel = project.layers2d.find((l) => l.id === selectedLayerId);
    if (sel && sel.visible && !sel.locked) {
      const hx = sel.x + sel.width;
      const hy = sel.y + sel.height;
      if (Math.abs(pt.x - hx) <= 28 && Math.abs(pt.y - hy) <= 28) {
        dragStateRef.current = {
          mode: 'resize-layer',
          startX: pt.x,
          startY: pt.y,
          layerStartX: sel.x,
          layerStartY: sel.y,
          layerStartW: sel.width,
          layerStartH: sel.height,
          lastX: pt.x,
          lastY: pt.y,
        };
        return;
      }
    }

    const hit = [...project.layers2d]
      .reverse()
      .find(
        (l) =>
          l.visible &&
          !l.locked &&
          pt.x >= l.x &&
          pt.x <= l.x + l.width &&
          pt.y >= l.y &&
          pt.y <= l.y + l.height,
      );
    if (hit) {
      setSelectedLayerId(hit.id);
      dragStateRef.current = {
        mode: 'move-layer',
        startX: pt.x,
        startY: pt.y,
        layerStartX: hit.x,
        layerStartY: hit.y,
        layerStartW: hit.width,
        layerStartH: hit.height,
        lastX: pt.x,
        lastY: pt.y,
      };
    }
  };

  const drawStroke = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    mode: 'paint' | 'mask' | 'erase' | 'smudge',
  ) => {
    const target = mode === 'mask' ? maskCanvasRef.current : paintCanvasRef.current;
    if (!target) return;
    const ctx = target.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize * 2;
    if (mode === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else if (mode === 'mask') {
      ctx.strokeStyle = '#ec4899';
    } else if (mode === 'smudge') {
      ctx.globalAlpha = 0.25;
      ctx.shadowBlur = brushSize;
      ctx.shadowColor = brushColor;
      ctx.strokeStyle = brushColor;
    } else {
      ctx.globalAlpha = brushOpacity;
      ctx.strokeStyle = brushColor;
    }
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
    setDrawTick((t) => t + 1);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const st = dragStateRef.current;
    if (!st.mode) return;
    const pt = toCanvasCoords(e.clientX, e.clientY);

    if (st.mode === 'crop') {
      const x = Math.round(Math.min(st.startX, pt.x));
      const y = Math.round(Math.min(st.startY, pt.y));
      const w = Math.round(Math.abs(pt.x - st.startX));
      const h = Math.round(Math.abs(pt.y - st.startY));
      setCropRect({ x, y, w, h });
    } else if (st.mode === 'move-layer' && selectedLayerId) {
      update2DLayer(selectedLayerId, {
        x: Math.round(st.layerStartX + (pt.x - st.startX)),
        y: Math.round(st.layerStartY + (pt.y - st.startY)),
      });
    } else if (st.mode === 'resize-layer' && selectedLayerId) {
      update2DLayer(selectedLayerId, {
        width: Math.max(40, Math.round(st.layerStartW + (pt.x - st.startX))),
        height: Math.max(40, Math.round(st.layerStartH + (pt.y - st.startY))),
      });
    } else if (st.mode === 'paint' || st.mode === 'mask' || st.mode === 'erase' || st.mode === 'smudge') {
      drawStroke(st.lastX, st.lastY, pt.x, pt.y, st.mode);
      st.lastX = pt.x;
      st.lastY = pt.y;
    }
  };

  const handlePointerUp = () => {
    dragStateRef.current.mode = null;
  };

  const removeBackgroundFromSelectedLayer = () => {
    const layer = project.layers2d.find((l) => l.id === selectedLayerId);
    if (!layer?.dataUrl) return;
    const img = new Image();
    img.onload = () => {
      const off = document.createElement('canvas');
      off.width = img.width;
      off.height = img.height;
      const ctx = off.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, off.width, off.height);
      const d = imgData.data;
      const r0 = d[0], g0 = d[1], b0 = d[2];
      const tol = bgTolerance;
      for (let i = 0; i < d.length; i += 4) {
        const dist = Math.abs(d[i] - r0) + Math.abs(d[i + 1] - g0) + Math.abs(d[i + 2] - b0);
        if (dist < tol) d[i + 3] = 0;
        else if (dist < tol + 22) d[i + 3] = Math.round(((dist - tol) / 22) * d[i + 3]);
      }
      ctx.putImageData(imgData, 0, 0);
      update2DLayer(layer.id, { dataUrl: off.toDataURL('image/png') });
    };
    img.src = layer.dataUrl;
  };

  const extractEdgesOnSelectedLayer = () => {
    const layer = project.layers2d.find((l) => l.id === selectedLayerId);
    if (!layer?.dataUrl) return;
    const img = new Image();
    img.onload = () => {
      const off = document.createElement('canvas');
      off.width = Math.min(512, img.width);
      off.height = Math.min(512, img.height);
      const ctx = off.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, off.width, off.height);
      const src = ctx.getImageData(0, 0, off.width, off.height);
      const out = ctx.createImageData(off.width, off.height);
      const w = off.width;
      const h = off.height;
      const lum = (x: number, y: number) => {
        const idx = (y * w + x) * 4;
        return 0.299 * src.data[idx] + 0.587 * src.data[idx + 1] + 0.114 * src.data[idx + 2];
      };
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const gx = -lum(x - 1, y) + lum(x + 1, y);
          const gy = -lum(x, y - 1) + lum(x, y + 1);
          const mag = Math.min(255, Math.hypot(gx, gy) * 2.2);
          const idx = (y * w + x) * 4;
          out.data[idx] = mag;
          out.data[idx + 1] = mag;
          out.data[idx + 2] = mag;
          out.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(out, 0, 0);
      add2DLayer({
        name: `${layer.name} (Kenar / Canny)`,
        kind: 'raster',
        x: layer.x,
        y: layer.y,
        width: layer.width,
        height: layer.height,
        dataUrl: off.toDataURL('image/png'),
      });
    };
    img.src = layer.dataUrl;
  };

  const duplicateSelectedLayer = () => {
    const sel = project.layers2d.find((l) => l.id === selectedLayerId);
    if (!sel) return;
    add2DLayer({
      ...sel,
      id: undefined,
      name: `${sel.name} Kopya`,
      x: sel.x + 28,
      y: sel.y + 28,
    });
  };

  const flattenVisibleLayers = () => {
    const comp = canvasRef.current;
    if (!comp) return;
    add2DLayer({
      name: 'Birleştirilmiş Kare (Merged)',
      kind: 'raster',
      x: 0,
      y: 0,
      width: project.canvasWidth,
      height: project.canvasHeight,
      dataUrl: comp.toDataURL('image/png'),
    });
  };

  const invertMask = () => {
    const m = maskCanvasRef.current;
    const ctx = m?.getContext('2d');
    if (!m || !ctx) return;
    const imgData = ctx.getImageData(0, 0, m.width, m.height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 20) {
        d[i + 3] = 0;
      } else {
        d[i] = 236;
        d[i + 1] = 72;
        d[i + 2] = 153;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    setDrawTick((t) => t + 1);
  };

  const applyCrop = () => {
    if (!cropRect || cropRect.w < 40 || cropRect.h < 40) {
      setCropMode(false);
      setCropRect(null);
      return;
    }
    for (const l of project.layers2d) {
      update2DLayer(l.id, { x: l.x - cropRect.x, y: l.y - cropRect.y });
    }
    setCanvasSize(cropRect.w, cropRect.h);
    setCropMode(false);
    setCropRect(null);
  };

  const downloadImage = (format: 'png' | 'jpeg' | 'webp', mode: '720p' | 'full' = 'full') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    let href = canvas.toDataURL(mime, 0.92);
    if (mode === '720p' && Math.max(canvas.width, canvas.height) > 720) {
      const scale = 720 / Math.max(canvas.width, canvas.height);
      const off = document.createElement('canvas');
      off.width = Math.round(canvas.width * scale);
      off.height = Math.round(canvas.height * scale);
      const octx = off.getContext('2d');
      if (octx) {
        octx.drawImage(canvas, 0, 0, off.width, off.height);
        href = off.toDataURL(mime, 0.9);
      }
    }
    const a = document.createElement('a');
    a.href = href;
    a.download = `${project.id}-alpemox-${mode}.${format}`;
    a.click();
  };

  const tools: Array<{ id: CanvasTool; label: string; icon: typeof MousePointer2 }> = [
    { id: 'select', label: 'Seç/Ölçek', icon: MousePointer2 },
    { id: 'brush', label: 'Fırça', icon: Paintbrush },
    { id: 'smudge', label: 'Yumuşat', icon: Droplet },
    { id: 'mask', label: 'Inpaint', icon: Sparkles },
    { id: 'eraser', label: 'Silgi', icon: Eraser },
    { id: 'eyedropper', label: 'Renk Al', icon: Pipette },
    { id: 'rect', label: 'Kutu', icon: Square },
    { id: 'circle', label: 'Daire', icon: Circle },
    { id: 'text', label: 'Metin', icon: Type },
  ];

  const selectedLayer: Layer2D | undefined = project.layers2d.find((l) => l.id === selectedLayerId);

  return (
    <div className="relative flex h-full w-full min-w-0 flex-col overflow-hidden bg-[#0b0d13]">
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800/80 bg-[#111521] px-2.5 py-1.5 text-xs">
        <div className="flex flex-wrap items-center gap-0.5">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id)}
                title={t.label}
                className={`flex items-center gap-1 rounded px-1.5 py-1 text-[11px] font-medium transition ${
                  activeTool === t.id
                    ? t.id === 'mask'
                      ? 'bg-pink-500/25 text-pink-300 ring-1 ring-pink-500/50'
                      : 'bg-sky-500/25 text-sky-300 ring-1 ring-sky-500/50'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden 2xl:inline">{t.label}</span>
              </button>
            );
          })}
          <button onClick={handleUndo} title="Geri Al (Ctrl+Z)" className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleRedo} title="İleri Al" className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="color"
            value={brushColor}
            onChange={(e) => setBrushColor(e.target.value)}
            title="Fırça / Şekil Rengi"
            className="h-6 w-6 cursor-pointer rounded border border-slate-700 bg-transparent"
          />
          <label className="flex items-center gap-1 text-[10px] text-slate-400">
            Boyut
            <input
              type="range"
              min={2}
              max={64}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-12 accent-sky-400"
            />
          </label>
          <label className="flex items-center gap-1 text-[10px] text-slate-400">
            Opak
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.1}
              value={brushOpacity}
              onChange={(e) => setBrushOpacity(Number(e.target.value))}
              className="w-10 accent-sky-400"
            />
          </label>

          {selectedLayer?.dataUrl && (
            <>
              <button
                onClick={removeBackgroundFromSelectedLayer}
                title={`Seçili katmanın arka planını temizle (Tolerans: ${bgTolerance})`}
                className="flex items-center gap-1 rounded bg-violet-500/20 px-2 py-1 text-[11px] text-violet-300 hover:bg-violet-500/35"
              >
                <Wand2 className="h-3 w-3" />
                BG Sil
              </button>
              <button
                onClick={extractEdgesOnSelectedLayer}
                title="Kenar (Sobel/Canny) haritası çıkar"
                className="flex items-center gap-1 rounded bg-cyan-500/20 px-2 py-1 text-[11px] text-cyan-300 hover:bg-cyan-500/35"
              >
                <ScanLine className="h-3 w-3" />
                Kenar
              </button>
            </>
          )}

          {selectedLayer && (
            <>
              <button
                onClick={duplicateSelectedLayer}
                title="Seçili katmanı çoğalt"
                className="rounded bg-slate-800 px-1.5 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
              >
                <Copy className="h-3 w-3" />
              </button>
              <button
                onClick={flattenVisibleLayers}
                title="Görünür katmanları yeni katmanda birleştir (Merge)"
                className="flex items-center gap-1 rounded bg-slate-800 px-1.5 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
              >
                <Layers className="h-3 w-3" />
                Birleştir
              </button>
              <button
                onClick={() => update2DLayer(selectedLayer.id, { flipX: !selectedLayer.flipX })}
                title="Yatay Çevir"
                className="rounded bg-slate-800 px-1.5 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
              >
                <FlipHorizontal2 className="h-3 w-3" />
              </button>
              <button
                onClick={() => update2DLayer(selectedLayer.id, { flipY: !selectedLayer.flipY })}
                title="Dikey Çevir"
                className="rounded bg-slate-800 px-1.5 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
              >
                <FlipVertical2 className="h-3 w-3" />
              </button>
              <button
                onClick={() => imageUploadRef.current?.click()}
                title="Bilgisayardan görsel aç (PNG/JPG/WebP)"
                className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
              >
                <ImagePlus className="h-3 w-3 text-emerald-400" />
                Aç
              </button>
              <input
                ref={imageUploadRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) loadLocalImageFile(f);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <button
                onClick={() => setShowPhotoAdjust((v) => !v)}
                className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] ${
                  showPhotoAdjust || viewportMode === 'photo'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <SlidersHorizontal className="h-3 w-3" />
                Ayarlar
              </button>
            </>
          )}

          <button
            onClick={() => {
              setCropMode((c) => !c);
              setCropRect(null);
            }}
            title="Kanvası Kırp (Crop)"
            className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] ${
              cropMode ? 'bg-amber-500 text-slate-950 font-semibold' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <Crop className="h-3 w-3" />
            Kırp
          </button>
          {cropMode && cropRect && cropRect.w >= 40 && (
            <button
              onClick={applyCrop}
              className="flex items-center gap-1 rounded bg-emerald-500 px-2 py-1 text-[11px] font-bold text-slate-950"
            >
              <Check className="h-3 w-3" />
              Uygula
            </button>
          )}

          <button
            onClick={invertMask}
            title="Inpaint maskesini ters çevir"
            className="rounded bg-slate-800 px-2 py-1 text-[11px] text-pink-300 hover:bg-slate-700"
          >
            Ters Maske
          </button>
          <button
            onClick={() => useStudioStore.getState().clearMask()}
            className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700"
          >
            <Trash2 className="h-3 w-3" />
            Maske
          </button>

          <select
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              const [fmt, mode] = e.target.value.split(':') as ['png' | 'jpeg' | 'webp', '720p' | 'full'];
              downloadImage(fmt, mode);
              e.target.value = '';
            }}
            className="rounded border border-slate-700 bg-slate-800 px-1.5 py-1 text-[11px] text-slate-200"
          >
            <option value="" disabled>
              İndir...
            </option>
            <option value="png:720p">PNG 720p</option>
            <option value="png:full">PNG Full (1080p/4K)</option>
            <option value="webp:full">WebP Full</option>
            <option value="jpeg:720p">JPEG 720p</option>
          </select>
        </div>
      </div>

      {(showPhotoAdjust || viewportMode === 'photo') && selectedLayer && (
        <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-800/80 bg-[#0e121c] px-3 py-1.5 text-[11px] text-slate-300">
          {(
            [
              ['brightness', 'Parlaklık', 30, 200],
              ['contrast', 'Kontrast', 30, 200],
              ['saturate', 'Doygunluk', 0, 250],
              ['temperature', 'Sıcaklık', -45, 45],
              ['hueRotate', 'Ton', -180, 180],
              ['blur', 'Blur', 0, 16],
              ['shadowBlur', 'Gölge', 0, 48],
              ['vignette', 'Vinyet', 0, 100],
            ] as const
          ).map(([key, label, min, max]) => {
            const filters = selectedLayer.filters || { ...DEFAULT_LAYER_FILTERS };
            return (
              <label key={key} className="flex items-center gap-1">
                <span className="text-slate-400">{label}</span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={Number(filters[key] ?? 0)}
                  onChange={(e) =>
                    update2DLayer(selectedLayer.id, {
                      filters: { ...filters, [key]: Number(e.target.value) },
                    })
                  }
                  className="w-12 accent-amber-400"
                />
              </label>
            );
          })}

          <label className="flex items-center gap-1">
            <span className="text-slate-400">Açı ({selectedLayer.rotation || 0}°)</span>
            <input
              type="range"
              min={-180}
              max={180}
              value={selectedLayer.rotation || 0}
              onChange={(e) => update2DLayer(selectedLayer.id, { rotation: Number(e.target.value) })}
              className="w-14 accent-sky-400"
            />
          </label>

          <label className="flex items-center gap-1">
            <span className="text-slate-400">LUT</span>
            <select
              value={selectedLayer.filters?.lutPreset || 'none'}
              onChange={(e) => {
                const filters = selectedLayer.filters || { ...DEFAULT_LAYER_FILTERS };
                update2DLayer(selectedLayer.id, {
                  filters: { ...filters, lutPreset: e.target.value as LutPreset },
                });
              }}
              className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-200"
            >
              <option value="none">Normal</option>
              <option value="teal-orange">Teal & Orange</option>
              <option value="cyber-neon">Cyber Neon</option>
              <option value="warm-kodak">Warm Kodak</option>
              <option value="noir">Film Noir</option>
            </select>
          </label>

          <label className="flex items-center gap-1">
            <span className="text-slate-400">BG Tol</span>
            <input
              type="range"
              min={12}
              max={120}
              value={bgTolerance}
              onChange={(e) => setBgTolerance(Number(e.target.value))}
              className="w-12 accent-violet-400"
            />
          </label>

          <select
            value={`${project.canvasWidth}x${project.canvasHeight}`}
            onChange={(e) => {
              const [w, h] = e.target.value.split('x').map(Number);
              setCanvasSize(w, h);
            }}
            className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-200"
          >
            <option value="1024x1024">1:1 (1024)</option>
            <option value="1280x720">16:9 (1280×720)</option>
            <option value="720x1280">9:16 (720×1280)</option>
          </select>

          <div className="flex items-center gap-1">
            {(
              [
                ['Sinematik', { brightness: 96, contrast: 122, saturate: 112, vignette: 35, lutPreset: 'teal-orange' as LutPreset }],
                ['Stüdyo', { brightness: 108, contrast: 114, saturate: 105, shadowBlur: 18, lutPreset: 'none' as LutPreset }],
                ['Vintage', { brightness: 102, contrast: 95, saturate: 88, temperature: 18, vignette: 28, lutPreset: 'warm-kodak' as LutPreset }],
              ] as const
            ).map(([label, preset]) => (
              <button
                key={label}
                onClick={() =>
                  update2DLayer(selectedLayer.id, {
                    filters: { ...DEFAULT_LAYER_FILTERS, ...preset },
                  })
                }
                className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-200 hover:border-amber-400"
              >
                {label}
              </button>
            ))}
          </div>

          <div
            title="Canlı Parlaklık Histogramı"
            className="flex h-5 items-end gap-[1px] rounded border border-slate-800 bg-slate-950 px-1 py-0.5"
          >
            {histogram.map((pct, idx) => (
              <span
                key={idx}
                style={{ height: `${pct}%` }}
                className="w-1 rounded-t-sm bg-sky-400/75"
              />
            ))}
          </div>

          <button
            onClick={() => update2DLayer(selectedLayer.id, { filters: { ...DEFAULT_LAYER_FILTERS }, rotation: 0 })}
            className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
          >
            Sıfırla
          </button>
        </div>
      )}

      <div
        ref={viewportBoxRef}
        className="checker-bg relative flex flex-1 items-center justify-center overflow-auto p-3"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer?.files?.[0];
          if (f) loadLocalImageFile(f);
        }}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setManualZoom(true);
            setZoom((z) => Math.min(1.8, Math.max(0.15, z - e.deltaY * 0.001)));
          }
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{
            width: `${Math.round((project.canvasWidth || 1024) * zoom)}px`,
            height: `${Math.round((project.canvasHeight || 1024) * zoom)}px`,
          }}
          className="shrink-0 cursor-crosshair rounded border border-slate-700/80 shadow-2xl"
        />

        <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5 rounded bg-black/75 px-2.5 py-1 text-[11px] text-slate-300 backdrop-blur">
          <button
            onClick={() => {
              setManualZoom(true);
              setZoom((z) => Math.max(0.15, +(z - 0.08).toFixed(2)));
            }}
            className="px-1 hover:text-white"
          >
            −
          </button>
          <button onClick={() => setManualZoom(false)} title="Ekrana sığdır" className="hover:text-sky-300">
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => {
              setManualZoom(true);
              setZoom((z) => Math.min(1.8, +(z + 0.08).toFixed(2)));
            }}
            className="px-1 hover:text-white"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
