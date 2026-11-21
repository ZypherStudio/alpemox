import { useState } from 'react';
import { Film, History, Plus } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export function StoryboardDock() {
  const [tab, setTab] = useState<'storyboard' | 'history'>('storyboard');
  const project = useStudioStore((s) => s.project);
  const addStoryboardShot = useStudioStore((s) => s.addStoryboardShot);
  const setCraftField = useStudioStore((s) => s.setCraftField);
  const prompt = useStudioStore((s) => s.prompt);
  const lastCraftOutput = useStudioStore((s) => s.lastCraftOutput);

  return (
    <div className="flex h-36 shrink-0 flex-col border-t border-slate-800/80 bg-[#0d1018]">
      <div className="flex items-center justify-between border-b border-slate-800/70 px-3 py-1 text-[11px]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('storyboard')}
            className={`flex items-center gap-1 rounded px-2 py-0.5 font-medium ${
              tab === 'storyboard' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="h-3 w-3" />
            Storyboard & Sekans ({project.storyboard.length})
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex items-center gap-1 rounded px-2 py-0.5 font-medium ${
              tab === 'history' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="h-3 w-3" />
            Üretim Geçmişi ({project.craftHistory.length})
          </button>
        </div>

        <button
          onClick={() =>
            addStoryboardShot({
              title: `Shot ${String(project.storyboard.length + 1).padStart(2, '0')}`,
              prompt,
              imageUrl: lastCraftOutput?.imageUrl,
            })
          }
          className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-slate-700"
        >
          <Plus className="h-3 w-3" />
          Aktif Kareyi Ekle
        </button>
      </div>

      <div className="flex flex-1 items-center gap-2.5 overflow-x-auto px-3 py-2">
        {tab === 'storyboard'
          ? project.storyboard.map((shot) => (
              <div
                key={shot.id}
                onClick={() => setCraftField({ prompt: shot.prompt })}
                className="flex h-24 w-48 shrink-0 cursor-pointer flex-col justify-between overflow-hidden rounded-lg border border-slate-800 bg-[#121622] p-2 hover:border-sky-500/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] font-semibold text-slate-200">{shot.title}</span>
                  <span className="rounded bg-slate-800 px-1 text-[9px] text-slate-400">{shot.durationSec}s</span>
                </div>
                <div className="flex items-center gap-2">
                  {shot.imageUrl && (
                    <img src={shot.imageUrl} alt={shot.title} className="h-12 w-16 rounded object-cover" />
                  )}
                  <p className="line-clamp-3 text-[10px] text-slate-400">{shot.prompt || 'Prompt yok'}</p>
                </div>
              </div>
            ))
          : project.craftHistory.map((item) => (
              <div
                key={item.id}
                onClick={() => setCraftField({ lastCraftOutput: item, prompt: item.prompt, seed: item.seed })}
                className="flex h-24 w-44 shrink-0 cursor-pointer items-center gap-2 overflow-hidden rounded-lg border border-slate-800 bg-[#121622] p-2 hover:border-sky-500/50"
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.prompt} className="h-20 w-20 shrink-0 rounded object-cover" />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded bg-slate-900 text-[10px] text-slate-500">
                    TEXT
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="text-[10px] font-semibold text-sky-400">{item.provider}</div>
                  <div className="line-clamp-2 text-[10px] text-slate-300">{item.prompt}</div>
                  <div className="font-mono text-[9px] text-slate-500">#{item.seed}</div>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
