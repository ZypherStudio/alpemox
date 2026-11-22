import { useRef, useState } from 'react';
import {
  ImagePlus,
  StickyNote,
  Palette,
  Trash2,
  Sparkles,
  Layers,
  Box,
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export function MoodboardEditor() {
  const project = useStudioStore((s) => s.project);
  const addMoodboardItem = useStudioStore((s) => s.addMoodboardItem);
  const updateMoodboardItem = useStudioStore((s) => s.updateMoodboardItem);
  const deleteMoodboardItem = useStudioStore((s) => s.deleteMoodboardItem);
  const setCraftField = useStudioStore((s) => s.setCraftField);
  const setBrushColor = useStudioStore((s) => s.setBrushColor);
  const add2DLayer = useStudioStore((s) => s.add2DLayer);
  const add3DObject = useStudioStore((s) => s.add3DObject);
  const lastCraftOutput = useStudioStore((s) => s.lastCraftOutput);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const offsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const items = project.moodboard || [];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      addMoodboardItem({
        kind: 'image',
        title: file.name,
        imageUrl: String(reader.result),
        x: 80 + (items.length % 4) * 60,
        y: 80 + (items.length % 3) * 60,
        width: 260,
        height: 220,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#090b10]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-[#111521] px-3 py-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-100">Alpemox Moodboard — İlham & Referans Tahtası</span>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
            {items.length} Kart
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {copiedHex && (
            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              {copiedHex} Fırçaya & Panoya Alındı
            </span>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 rounded bg-sky-600/20 px-2.5 py-1 text-[11px] font-medium text-sky-300 hover:bg-sky-600/35"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            Referans Görsel
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

          <button
            onClick={() =>
              addMoodboardItem({
                kind: 'note',
                title: 'Yönetmen Notu',
                content: 'Yeni sahne ışık, kamera veya karakter notu...',
                x: 40 + (items.length % 3) * 300,
                y: 40 + Math.floor(items.length / 3) * 210,
                width: 260,
                height: 150,
              })
            }
            className="flex items-center gap-1 rounded bg-amber-500/20 px-2.5 py-1 text-[11px] font-medium text-amber-300 hover:bg-amber-500/35"
          >
            <StickyNote className="h-3.5 w-3.5" />
            + Not Kartı
          </button>

          <button
            onClick={() =>
              addMoodboardItem({
                kind: 'palette',
                title: 'Renk Paleti',
                colors: ['#0f172a', '#4e7bfb', '#38bdf8', '#f43f5e', '#f59e0b'],
                x: 40 + (items.length % 3) * 300,
                y: 40 + Math.floor(items.length / 3) * 210,
                width: 270,
                height: 130,
              })
            }
            className="flex items-center gap-1 rounded bg-violet-500/20 px-2.5 py-1 text-[11px] font-medium text-violet-300 hover:bg-violet-500/35"
          >
            <Palette className="h-3.5 w-3.5" />
            + Palet
          </button>

          {lastCraftOutput?.imageUrl && (
            <button
              onClick={() =>
                addMoodboardItem({
                  kind: 'image',
                  title: `Craft #${lastCraftOutput.seed}`,
                  imageUrl: lastCraftOutput.imageUrl,
                  content: lastCraftOutput.prompt,
                  x: 140,
                  y: 140,
                  width: 260,
                  height: 250,
                })
              }
              className="flex items-center gap-1 rounded bg-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/35"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Son Üretimi Ekle
            </button>
          )}
        </div>
      </div>

      <div
        ref={boardRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer?.files?.[0];
          if (!file || !file.type.startsWith('image/')) return;
          const reader = new FileReader();
          reader.onload = () => {
            addMoodboardItem({
              kind: 'image',
              title: file.name,
              imageUrl: String(reader.result),
              x: 80 + (items.length % 4) * 60,
              y: 80 + (items.length % 3) * 60,
              width: 260,
              height: 220,
            });
          };
          reader.readAsDataURL(file);
        }}
        onPointerMove={(e) => {
          if (!draggingId || !boardRef.current) return;
          const rect = boardRef.current.getBoundingClientRect();
          const x = Math.max(12, Math.round(e.clientX - rect.left + boardRef.current.scrollLeft - offsetRef.current.dx));
          const y = Math.max(12, Math.round(e.clientY - rect.top + boardRef.current.scrollTop - offsetRef.current.dy));
          updateMoodboardItem(draggingId, { x, y });
        }}
        onPointerUp={() => setDraggingId(null)}
        onPointerLeave={() => setDraggingId(null)}
        className="relative flex-1 overflow-auto bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:22px_22px]"
      >
        {items.map((item) => (
          <div
            key={item.id}
            style={{ left: item.x, top: item.y, width: item.width }}
            className="absolute flex flex-col overflow-hidden rounded-xl border border-slate-700/80 bg-[#121622]/95 shadow-2xl backdrop-blur"
          >
            <div
              onPointerDown={(e) => {
                if (!boardRef.current) return;
                const rect = boardRef.current.getBoundingClientRect();
                offsetRef.current = {
                  dx: e.clientX - rect.left + boardRef.current.scrollLeft - item.x,
                  dy: e.clientY - rect.top + boardRef.current.scrollTop - item.y,
                };
                setDraggingId(item.id);
              }}
              className="flex cursor-grab items-center justify-between border-b border-slate-800 bg-[#0d1018] px-2.5 py-1.5 text-[11px] active:cursor-grabbing"
            >
              <span className="truncate font-semibold text-slate-200">{item.title}</span>
              <button
                onClick={() => deleteMoodboardItem(item.id)}
                className="text-slate-400 hover:text-rose-400"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>

            {item.kind === 'note' && (
              <div className="space-y-2 p-2.5">
                <textarea
                  rows={3}
                  value={item.content || ''}
                  onChange={(e) => updateMoodboardItem(item.id, { content: e.target.value })}
                  className="w-full rounded border border-slate-800 bg-black/40 p-1.5 text-[11px] text-slate-200 focus:border-sky-500 focus:outline-none"
                />
                <button
                  onClick={() => setCraftField({ prompt: item.content || '' })}
                  className="flex w-full items-center justify-center gap-1 rounded bg-sky-500/20 py-1 text-[10px] font-semibold text-sky-300 hover:bg-sky-500/35"
                >
                  <Sparkles className="h-3 w-3" />
                  Prompta Aktar
                </button>
              </div>
            )}

            {item.kind === 'palette' && (
              <div className="space-y-2 p-2.5">
                <div className="flex gap-1.5">
                  {(item.colors || []).map((c, idx) => (
                    <input
                      key={idx}
                      type="color"
                      value={c}
                      onChange={(e) => {
                        const nextColors = [...(item.colors || [])];
                        nextColors[idx] = e.target.value;
                        updateMoodboardItem(item.id, { colors: nextColors });
                      }}
                      className="h-10 w-full cursor-pointer rounded border border-slate-700 bg-transparent"
                    />
                  ))}
                </div>
                <div className="flex justify-between font-mono text-[9px] text-slate-400">
                  {(item.colors || []).map((c, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setBrushColor(c);
                        void navigator.clipboard?.writeText(c);
                        setCopiedHex(c);
                        setTimeout(() => setCopiedHex(null), 1600);
                      }}
                      title="Kopyala ve Fırça Rengi Yap"
                      className="rounded px-1 hover:bg-slate-800 hover:text-sky-300"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {item.kind === 'image' && item.imageUrl && (
              <div className="space-y-2 p-2">
                <img src={item.imageUrl} alt={item.title} className="max-h-48 w-full rounded object-cover" />
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() =>
                      add2DLayer({
                        name: item.title,
                        kind: 'raster',
                        x: 0,
                        y: 0,
                        width: project.canvasWidth,
                        height: project.canvasHeight,
                        dataUrl: item.imageUrl,
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
                        name: `Ref: ${item.title}`,
                        textureDataUrl: item.imageUrl,
                        position: { x: 1.4, y: 1.3, z: -0.4 },
                        scale: { x: 1.8, y: 1.8, z: 1 },
                      })
                    }
                    className="flex items-center justify-center gap-1 rounded bg-slate-800 py-1 text-[10px] text-slate-200 hover:bg-slate-700"
                  >
                    <Box className="h-3 w-3" />
                    3D’ye At
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
