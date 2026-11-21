import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Film,
  Plus,
  Download,
  Trash2,
  Scissors,
  Music,
  Volume2,
  ArrowLeft,
  ArrowRight,
  Crown,
  Copy,
  Sparkles,
} from 'lucide-react';
import {
  FILM_TRANSITIONS,
  FILM_FILTERS,
  type AudioClip,
  type FilmTransitionType,
  type FilmFilterType,
} from '@opencraft/shared';
import { useStudioStore } from '../store/useStudioStore';

function applyEasing(t: number, easing: string = 'easeInOut') {
  if (easing === 'linear') return t;
  if (easing === 'easeOut') return 1 - Math.pow(1 - t, 3);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function playSynthTrack(
  preset: AudioClip['preset'] = 'cyber-pulse',
  durationSec = 6,
  volume = 0.5,
  extraDest?: MediaStreamAudioDestinationNode,
): () => void {
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return () => {};
  const ctx = new AudioCtx();
  const master = ctx.createGain();
  master.gain.value = volume * 0.35;
  master.connect(ctx.destination);
  if (extraDest) master.connect(extraDest);

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = preset === 'cyber-pulse' ? 950 : preset === 'cinematic-riser' ? 1400 : 480;

  osc1.type = preset === 'cyber-pulse' ? 'sawtooth' : preset === 'lofi-beat' ? 'triangle' : 'sine';
  osc2.type = 'sine';
  const baseFreq = preset === 'cyber-pulse' ? 110 : preset === 'lofi-beat' ? 146.8 : 73.4;
  osc1.frequency.setValueAtTime(baseFreq, ctx.currentTime);
  osc2.frequency.setValueAtTime(baseFreq * 1.5, ctx.currentTime);

  if (preset === 'cinematic-riser') {
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 4, ctx.currentTime + durationSec);
    filter.frequency.exponentialRampToValueAtTime(3200, ctx.currentTime + durationSec);
  }

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(master);
  osc1.start();
  osc2.start();
  osc1.stop(ctx.currentTime + durationSec);
  osc2.stop(ctx.currentTime + durationSec);

  return () => {
    try {
      osc1.stop();
      osc2.stop();
      void ctx.close();
    } catch {
      // ignore
    }
  };
}

export function FilmEditor() {
  const project = useStudioStore((s) => s.project);
  const addStoryboardShot = useStudioStore((s) => s.addStoryboardShot);
  const updateStoryboardShot = useStudioStore((s) => s.updateStoryboardShot);
  const deleteStoryboardShot = useStudioStore((s) => s.deleteStoryboardShot);
  const splitStoryboardShot = useStudioStore((s) => s.splitStoryboardShot);
  const moveStoryboardShot = useStudioStore((s) => s.moveStoryboardShot);
  const addAudioClip = useStudioStore((s) => s.addAudioClip);
  const deleteAudioClip = useStudioStore((s) => s.deleteAudioClip);
  const exportCanvasFn = useStudioStore((s) => s.exportCanvasFn);
  const add2DLayer = useStudioStore((s) => s.add2DLayer);
  const lastCraftOutput = useStudioStore((s) => s.lastCraftOutput);
  const prompt = useStudioStore((s) => s.prompt);
  const license = useStudioStore((s) => s.license);
  const setPricingOpen = useStudioStore((s) => s.setPricingOpen);

  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [autoFillBusy, setAutoFillBusy] = useState(false);
  const [exportRes, setExportRes] = useState<'720p' | '1080p' | '4k'>('1080p');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(project.storyboard[0]?.id || null);

  const playerSize =
    aspectRatio === '9:16'
      ? { w: 405, h: 720 }
      : aspectRatio === '1:1'
        ? { w: 640, h: 640 }
        : { w: 960, h: 540 };

  const playerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const stopAudioRef = useRef<(() => void) | null>(null);
  const audioUploadRef = useRef<HTMLInputElement | null>(null);
  const videoExtractInputRef = useRef<HTMLInputElement | null>(null);

  const shots = project.storyboard;
  const audioClips = project.audioClips || [];

  const totalDuration = useMemo(
    () => Math.max(1, shots.reduce((acc, s) => acc + (s.durationSec || 3) / (s.speed || 1), 0)),
    [shots],
  );

  const activeFrame = useMemo(() => {
    let cursor = 0;
    for (let i = 0; i < shots.length; i++) {
      const dur = (shots[i].durationSec || 3) / (shots[i].speed || 1);
      if (currentTime <= cursor + dur || i === shots.length - 1) {
        const localT = Math.min(1, Math.max(0, (currentTime - cursor) / dur));
        return { shot: shots[i], index: i, localT };
      }
      cursor += dur;
    }
    return null;
  }, [shots, currentTime]);

  useEffect(() => {
    if (!playing) {
      stopAudioRef.current?.();
      stopAudioRef.current = null;
      return;
    }
    if (audioClips.length > 0 && audioClips[0].kind === 'synth') {
      stopAudioRef.current = playSynthTrack(audioClips[0].preset, totalDuration, audioClips[0].volume);
    }
    let last = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setCurrentTime((t) => {
        const next = t + dt;
        if (next >= totalDuration) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      stopAudioRef.current?.();
      stopAudioRef.current = null;
    };
  }, [playing, totalDuration, audioClips]);

  // Draw preview canvas with easing, filterPreset & animated overlayText
  useEffect(() => {
    const canvas = playerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#090c14';
    ctx.fillRect(0, 0, w, h);

    if (!activeFrame) return;
    const { shot, localT } = activeFrame;
    const easedT = applyEasing(localT, shot.easing || 'easeInOut');
    const zoomStart = shot.zoomStart ?? 1.0;
    const zoomEnd = shot.zoomEnd ?? 1.12;
    const motion = shot.motionPreset || 'ken-burns';
    let zoom =
      motion === 'static'
        ? zoomStart
        : motion === 'bounce'
          ? 1.0 + Math.abs(Math.sin(localT * Math.PI * 2)) * 0.08
          : zoomStart + (zoomEnd - zoomStart) * easedT;
    let panX = (shot.panX ?? 0) * easedT;
    let panY = (shot.panY ?? 0) * easedT;
    if (motion === 'pan-right') panX += (easedT - 0.5) * 90;
    else if (motion === 'pan-left') panX -= (easedT - 0.5) * 90;
    else if (motion === 'float') {
      panX += Math.sin(localT * Math.PI * 2) * 18;
      panY += Math.cos(localT * Math.PI * 2) * 14;
    }

    // Transitions
    let slideOffset = 0;
    if (shot.transition === 'slide') {
      slideOffset = (1 - Math.min(1, localT * 4)) * w * 0.16;
    } else if (shot.transition === 'zoom-whip' && localT < 0.25) {
      zoom += (0.25 - localT) * 2.2;
    }

    const fadeAlpha =
      shot.transition === 'fade' ? Math.min(1, localT * 5, (1 - localT) * 5 + 0.25) : 1;

    // Camera shake effect
    if (shot.filterPreset === 'camera-shake') {
      panX += Math.sin(currentTime * 38) * 10;
      panY += Math.cos(currentTime * 44) * 7;
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0.15, Math.min(1, fadeAlpha));
    const bright = shot.brightness ?? 100;
    const cont = shot.contrast ?? 100;
    const sat = shot.saturate ?? 100;
    const baseFilter = `brightness(${bright}%) contrast(${cont}%) saturate(${sat}%)`;
    if (shot.filterPreset === 'noir') ctx.filter = `${baseFilter} grayscale(100%) contrast(135%)`;
    else if (shot.filterPreset === 'cyber') ctx.filter = `${baseFilter} contrast(125%) saturate(175%) hue-rotate(15deg)`;
    else if (shot.filterPreset === 'warm-sunset') ctx.filter = `${baseFilter} sepia(34%) saturate(145%) brightness(106%)`;
    else if (shot.filterPreset === 'bloom') ctx.filter = `${baseFilter} brightness(115%) contrast(108%) saturate(125%)`;
    else ctx.filter = baseFilter;

    ctx.translate(w / 2 + panX + slideOffset, h / 2 + panY);
    if (shot.rotateDeg) ctx.rotate((shot.rotateDeg * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    if (shot.imageUrl) {
      let img = imageCacheRef.current.get(shot.imageUrl);
      if (!img) {
        img = new Image();
        img.src = shot.imageUrl;
        imageCacheRef.current.set(shot.imageUrl, img);
      }
      if (img.complete && img.naturalWidth > 0) {
        const ratio = Math.max(w / img.naturalWidth, h / img.naturalHeight);
        const dw = img.naturalWidth * ratio;
        const dh = img.naturalHeight * ratio;
        ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      }
    } else {
      const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }
    ctx.restore();

    // Wipe Left transition curtain
    if (shot.transition === 'wipe-left' && localT < 0.28) {
      const cover = 1 - localT / 0.28;
      ctx.fillStyle = '#090c14';
      ctx.fillRect(0, 0, w * cover, h);
    }

    // Glitch Flash transition
    if (shot.transition === 'glitch-flash' && localT < 0.22) {
      ctx.save();
      ctx.fillStyle = `rgba(56, 189, 248, ${(0.22 - localT) * 2.4})`;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(236, 72, 153, 0.45)';
      ctx.fillRect(0, (localT * 900) % h, w, 18);
      ctx.restore();
    }

    // VHS Retro Scanlines + Chromatic bar
    if (shot.filterPreset === 'vhs-retro') {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      for (let y = 0; y < h; y += 6) {
        ctx.fillRect(0, y, w, 2);
      }
      ctx.fillStyle = 'rgba(34,211,238,0.12)';
      ctx.fillRect(0, ((currentTime * 160) % h), w, 10);
      ctx.restore();
    }

    // Bloom soft glow overlay
    if (shot.filterPreset === 'bloom') {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const bGrad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.55);
      bGrad.addColorStop(0, 'rgba(255,255,255,0.22)');
      bGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = bGrad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    if (shot.filterPreset === 'vignette') {
      const vGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.22, w / 2, h / 2, w * 0.65);
      vGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vGrad.addColorStop(1, 'rgba(0,0,0,0.72)');
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // Animated Motion Overlay Text
    const caption = shot.overlayText || shot.prompt;
    if (caption) {
      const textAnim = shot.textAnimation || 'fade-up';
      const baseY =
        shot.overlayPosition === 'top' ? 54 : shot.overlayPosition === 'center' ? h / 2 : h - 42;
      const animProgress = Math.min(1, localT * 3.2);
      const yOffset = textAnim === 'fade-up' ? (1 - animProgress) * 18 : 0;
      const textScale = textAnim === 'pop' ? 0.72 + Math.min(1, localT * 5) * 0.28 : 1;
      const visibleCaption =
        textAnim === 'typewriter'
          ? caption.slice(0, Math.max(1, Math.round(caption.slice(0, 72).length * Math.min(1, localT * 1.8))))
          : caption.slice(0, 72);

      ctx.save();
      ctx.globalAlpha = textAnim === 'fade-up' ? animProgress : 1;
      ctx.translate(w / 2, baseY + yOffset);
      ctx.scale(textScale, textScale);
      ctx.fillStyle = 'rgba(0,0,0,0.58)';
      ctx.fillRect(-w / 2 + 24, -34, w - 48, 52);
      ctx.fillStyle = shot.overlayColor || '#ffffff';
      ctx.font = '700 22px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(visibleCaption, 0, 0);
      ctx.restore();
    }
  }, [activeFrame, currentTime]);

  const exportWebmVideo = () => {
    const canvas = playerCanvasRef.current;
    if (!canvas || typeof MediaRecorder === 'undefined') return;
    const prevW = canvas.width;
    const prevH = canvas.height;
    const baseHeight = exportRes === '720p' ? 720 : exportRes === '1080p' ? 1080 : 2160;
    if (aspectRatio === '9:16') {
      canvas.width = Math.round((baseHeight * 9) / 16);
      canvas.height = baseHeight;
    } else if (aspectRatio === '1:1') {
      canvas.width = baseHeight;
      canvas.height = baseHeight;
    } else {
      canvas.width = Math.round((baseHeight * 16) / 9);
      canvas.height = baseHeight;
    }

    const videoStream = canvas.captureStream(30);
    let stopExportAudio: (() => void) | null = null;
    let combinedStream: MediaStream = videoStream;

    if (audioClips.length > 0 && audioClips[0].kind === 'synth') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const dest = ctx.createMediaStreamDestination();
        const stopSynth = playSynthTrack(audioClips[0].preset, totalDuration, audioClips[0].volume, dest);
        stopExportAudio = () => {
          stopSynth();
          void ctx.close().catch(() => {});
        };
        combinedStream = new MediaStream([...videoStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
      }
    }

    const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      stopExportAudio?.();
      canvas.width = prevW;
      canvas.height = prevH;
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.id}-alpemox-${exportRes}-${aspectRatio.replace(':', 'x')}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setRecording(false);
    };

    setCurrentTime(0);
    setRecording(true);
    setPlaying(true);
    recorder.start();
    setTimeout(() => {
      recorder.stop();
      setPlaying(false);
    }, Math.min(15000, totalDuration * 1000));
  };

  const autoCraftMissingShots = async () => {
    const missing = shots.filter((s) => !s.imageUrl);
    if (missing.length === 0) return;
    setAutoFillBusy(true);
    try {
      for (const s of missing.slice(0, 4)) {
        const res = await fetch('/api/craft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: project.id,
            workflow: 'text-to-image',
            provider: 'pollinations',
            modelId: 'pollinations-flux',
            prompt: s.prompt || s.title,
            width: playerSize.w >= playerSize.h ? 1024 : 576,
            height: playerSize.h > playerSize.w ? 1024 : 576,
            steps: 20,
            cfgScale: 7,
          }),
        });
        const d = await res.json();
        if (res.ok && d?.output?.imageUrl) {
          updateStoryboardShot(s.id, { imageUrl: d.output.imageUrl });
        }
      }
    } finally {
      setAutoFillBusy(false);
    }
  };

  const handleExtractVideoFrames = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const vid = document.createElement('video');
    vid.muted = true;
    vid.src = url;
    vid.onloadedmetadata = async () => {
      const dur = Math.max(0.5, vid.duration || 1);
      const timestamps = [0.1, dur * 0.5, Math.max(0.1, dur - 0.2)];
      const off = document.createElement('canvas');
      off.width = vid.videoWidth || 960;
      off.height = vid.videoHeight || 540;
      const ctx = off.getContext('2d');
      if (ctx) {
        for (let i = 0; i < timestamps.length; i++) {
          vid.currentTime = timestamps[i];
          await new Promise<void>((res) => {
            vid.onseeked = () => res();
          });
          ctx.drawImage(vid, 0, 0, off.width, off.height);
          const dataUrl = off.toDataURL('image/png');
          addStoryboardShot({
            title: `${file.name.slice(0, 12)} #${i + 1}`,
            prompt: `Extracted frame @ ${timestamps[i].toFixed(1)}s`,
            imageUrl: dataUrl,
          });
          if (i === 0) {
            add2DLayer({
              name: `${file.name} (Kare 1)`,
              kind: 'raster',
              x: 0,
              y: 0,
              width: project.canvasWidth,
              height: project.canvasHeight,
              dataUrl,
            });
          }
        }
      }
      URL.revokeObjectURL(url);
    };
    e.target.value = '';
  };

  const selectedShot = shots.find((s) => s.id === selectedShotId) || shots[0];

  return (
    <div className="flex h-full w-full flex-col bg-[#090b10]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-[#111521] px-3 py-1.5 text-xs">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold text-slate-100">Alpemox Film — Çok Kanallı Kurgu & Ses</span>
          <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300">
            {currentTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="flex items-center gap-1 rounded bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/35"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? 'Duraklat' : 'Oynat'}
          </button>

          <button
            onClick={() => {
              const canvasImg = exportCanvasFn?.()?.compositeDataUrl;
              addStoryboardShot({
                title: `Shot ${String(shots.length + 1).padStart(2, '0')}`,
                prompt,
                imageUrl: lastCraftOutput?.imageUrl || canvasImg,
              });
            }}
            className="flex items-center gap-1 rounded bg-sky-600/20 px-2.5 py-1 text-[11px] font-medium text-sky-300 hover:bg-sky-600/35"
          >
            <Plus className="h-3.5 w-3.5" />
            Kare Ekle
          </button>

          <button
            onClick={() =>
              addAudioClip({
                name: 'Cyber Pulse Synth',
                kind: 'synth',
                preset: 'cyber-pulse',
                durationSec: Math.round(totalDuration),
                volume: 0.65,
              })
            }
            className="flex items-center gap-1 rounded bg-violet-600/20 px-2.5 py-1 text-[11px] font-medium text-violet-300 hover:bg-violet-600/35"
          >
            <Music className="h-3.5 w-3.5" />
            + AI Synth Ses
          </button>

          <button
            onClick={() => audioUploadRef.current?.click()}
            className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
          >
            + Ses Yükle
          </button>
          <input
            ref={audioUploadRef}
            type="file"
            accept="audio/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const url = URL.createObjectURL(file);
              addAudioClip({ name: file.name, kind: 'upload', durationSec: 6, volume: 0.8, dataUrl: url });
            }}
            className="hidden"
          />

          <button
            onClick={() => videoExtractInputRef.current?.click()}
            className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
            title="MP4/WebM videodan otomatik 3 kare çıkarıp timeline ve 2D katmana aktar"
          >
            Videodan Kare Çıkar
          </button>
          <input
            ref={videoExtractInputRef}
            type="file"
            accept="video/*"
            onChange={handleExtractVideoFrames}
            className="hidden"
          />

          <button
            onClick={() => void autoCraftMissingShots()}
            disabled={autoFillBusy}
            title="Görselsiz storyboard karelerine ücretsiz AI görsel üret"
            className="flex items-center gap-1 rounded bg-amber-500/20 px-2.5 py-1 text-[11px] font-medium text-amber-300 hover:bg-amber-500/35 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {autoFillBusy ? 'Üretiliyor...' : 'AI Kare Doldur'}
          </button>

          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as '16:9' | '9:16' | '1:1')}
            title="Video Çerçeve Oranı"
            className="rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-[11px] text-slate-200"
          >
            <option value="16:9">16:9 Yatay</option>
            <option value="9:16">9:16 Reels</option>
            <option value="1:1">1:1 Kare</option>
          </select>

          <select
            value={exportRes}
            onChange={(e) => setExportRes(e.target.value as '720p' | '1080p' | '4k')}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
          >
            <option value="720p">720p HD</option>
            <option value="1080p">1080p Full HD</option>
            <option value="4k">4K UHD</option>
          </select>

          <button
            onClick={exportWebmVideo}
            disabled={recording}
            className="flex items-center gap-1 rounded bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {recording ? 'Kaydediliyor...' : `${exportRes.toUpperCase()} İndir`}
          </button>
        </div>
      </div>

      {/* Video Player Preview */}
      <div className="flex flex-1 items-center justify-center bg-[#06080d] p-3">
        <canvas
          ref={playerCanvasRef}
          width={playerSize.w}
          height={playerSize.h}
          className="max-h-full max-w-full rounded-lg border border-slate-800 shadow-2xl"
        />
      </div>

      {/* Multi-Track Timeline (Video + Audio) */}
      <div className="border-t border-slate-800/80 bg-[#0d1018] p-2.5 text-xs">
        <input
          type="range"
          min={0}
          max={totalDuration}
          step={0.05}
          value={currentTime}
          onChange={(e) => setCurrentTime(Number(e.target.value))}
          className="mb-2 w-full accent-emerald-400"
        />

        {/* Video Track */}
        <div className="mb-1.5 flex items-center gap-2">
          <span className="w-12 shrink-0 font-mono text-[10px] text-emerald-400">V1</span>
          <div className="flex flex-1 gap-1.5 overflow-x-auto pb-1">
            {shots.map((shot) => (
              <div
                key={shot.id}
                onClick={() => setSelectedShotId(shot.id)}
                style={{ minWidth: `${Math.max(140, (shot.durationSec || 3) * 48)}px` }}
                className={`cursor-pointer rounded-md border p-1.5 transition ${
                  selectedShot?.id === shot.id
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] font-semibold text-slate-200">{shot.title}</span>
                  <span className="font-mono text-[10px] text-slate-400">{shot.durationSec}s · {shot.speed || 1}x</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  {shot.imageUrl && <img src={shot.imageUrl} alt={shot.title} className="h-7 w-11 rounded object-cover" />}
                  <span className="truncate text-[10px] text-slate-400">
                    {shot.transition || 'fade'} · {shot.easing || 'easeInOut'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audio Track */}
        <div className="mb-2 flex items-center gap-2">
          <span className="flex w-12 shrink-0 items-center gap-1 font-mono text-[10px] text-violet-400">
            <Volume2 className="h-3 w-3" /> A1
          </span>
          <div className="flex flex-1 gap-1.5 overflow-x-auto">
            {audioClips.length === 0 ? (
              <div className="rounded border border-dashed border-slate-800 px-3 py-1.5 text-[10px] text-slate-500">
                Ses kanalı boş — yukarıdan "+ AI Synth Ses" veya "+ Ses Yükle" ekleyin.
              </div>
            ) : (
              audioClips.map((clip) => (
                <div
                  key={clip.id}
                  className="flex items-center gap-2 rounded border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-[10px] text-violet-200"
                >
                  <Music className="h-3 w-3" />
                  <span>{clip.name}</span>
                  <button
                    onClick={() => deleteAudioClip(clip.id)}
                    className="text-violet-300 hover:text-rose-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Selected Clip Inspector */}
        {selectedShot && (
          <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-slate-800 bg-[#111521] px-2.5 py-1.5 text-[11px]">
            <span className="font-semibold text-emerald-400">{selectedShot.title}</span>
            <label className="flex items-center gap-1 text-slate-400">
              Süre
              <input
                type="number"
                min={1}
                max={20}
                value={selectedShot.durationSec}
                onChange={(e) => updateStoryboardShot(selectedShot.id, { durationSec: Number(e.target.value) })}
                className="w-11 rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-slate-100"
              />
            </label>
            <label className="flex items-center gap-1 text-slate-400">
              Hız
              <select
                value={selectedShot.speed || 1}
                onChange={(e) => updateStoryboardShot(selectedShot.id, { speed: Number(e.target.value) })}
                className="rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-slate-100"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </label>
            <label className="flex items-center gap-1 text-slate-400">
              Geçiş
              <select
                value={selectedShot.transition || 'fade'}
                onChange={(e) =>
                  updateStoryboardShot(selectedShot.id, { transition: e.target.value as FilmTransitionType })
                }
                className="rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-slate-100"
              >
                {FILM_TRANSITIONS.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1 text-slate-400">
              Efekt
              <select
                value={selectedShot.filterPreset || 'none'}
                onChange={(e) =>
                  updateStoryboardShot(selectedShot.id, { filterPreset: e.target.value as FilmFilterType })
                }
                className="rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-slate-100"
              >
                {FILM_FILTERS.map((fl) => (
                  <option key={fl.id} value={fl.id}>
                    {fl.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1 text-slate-400">
              Hareket
              <select
                value={selectedShot.motionPreset || 'ken-burns'}
                onChange={(e) =>
                  updateStoryboardShot(selectedShot.id, {
                    motionPreset: e.target.value as 'ken-burns' | 'pan-right' | 'pan-left' | 'float' | 'bounce' | 'static',
                  })
                }
                className="rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-slate-100"
              >
                <option value="ken-burns">Ken Burns</option>
                <option value="pan-right">Pan Sağ</option>
                <option value="pan-left">Pan Sol</option>
                <option value="float">Süzül (Float)</option>
                <option value="bounce">Nabız Bounce</option>
                <option value="static">Sabit</option>
              </select>
            </label>
            <label className="flex items-center gap-1 text-slate-400">
              Yazı Anim.
              <select
                value={selectedShot.textAnimation || 'fade-up'}
                onChange={(e) =>
                  updateStoryboardShot(selectedShot.id, {
                    textAnimation: e.target.value as 'none' | 'fade-up' | 'typewriter' | 'pop',
                  })
                }
                className="rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-slate-100"
              >
                <option value="fade-up">Yukarı Süzül</option>
                <option value="typewriter">Daktilo</option>
                <option value="pop">Pop</option>
                <option value="none">Sabit</option>
              </select>
            </label>
            <button
              onClick={() => setPricingOpen(true)}
              className="flex items-center gap-1 rounded bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-300 hover:bg-sky-500/30"
            >
              <Crown className="h-3 w-3" />
              Cloud 4K (Yakında)
            </button>
            <label className="flex items-center gap-1 text-slate-400">
              Parlak
              <input
                type="range"
                min={50}
                max={160}
                value={selectedShot.brightness ?? 100}
                onChange={(e) => updateStoryboardShot(selectedShot.id, { brightness: Number(e.target.value) })}
                className="w-12 accent-emerald-400"
              />
            </label>
            <label className="flex items-center gap-1 text-slate-400">
              Kontrast
              <input
                type="range"
                min={50}
                max={160}
                value={selectedShot.contrast ?? 100}
                onChange={(e) => updateStoryboardShot(selectedShot.id, { contrast: Number(e.target.value) })}
                className="w-12 accent-emerald-400"
              />
            </label>
            <label className="flex items-center gap-1 text-slate-400">
              Doygun
              <input
                type="range"
                min={0}
                max={200}
                value={selectedShot.saturate ?? 100}
                onChange={(e) => updateStoryboardShot(selectedShot.id, { saturate: Number(e.target.value) })}
                className="w-12 accent-emerald-400"
              />
            </label>
            <label className="flex items-center gap-1 text-slate-400">
              Zoom
              <input
                type="number"
                step="0.05"
                min={0.8}
                max={2}
                value={selectedShot.zoomEnd ?? 1.12}
                onChange={(e) => updateStoryboardShot(selectedShot.id, { zoomEnd: Number(e.target.value) })}
                className="w-12 rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-slate-100"
              />
            </label>
            <select
              value={selectedShot.overlayPosition || 'bottom'}
              onChange={(e) =>
                updateStoryboardShot(selectedShot.id, {
                  overlayPosition: e.target.value as 'top' | 'center' | 'bottom',
                })
              }
              title="Altyazı Konumu"
              className="rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-slate-100"
            >
              <option value="bottom">Alt</option>
              <option value="center">Orta</option>
              <option value="top">Üst</option>
            </select>
            <input
              type="text"
              placeholder="Video altyazı / başlık..."
              value={selectedShot.overlayText || ''}
              onChange={(e) => updateStoryboardShot(selectedShot.id, { overlayText: e.target.value })}
              className="w-40 rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-slate-100"
            />
            <button
              onClick={() =>
                addStoryboardShot({
                  title: `${selectedShot.title} Kopya`,
                  prompt: selectedShot.prompt,
                  imageUrl: selectedShot.imageUrl,
                  cameraNote: selectedShot.cameraNote,
                })
              }
              className="rounded bg-slate-800 p-1 text-slate-200 hover:bg-slate-700"
              title="Klibi Çoğalt"
            >
              <Copy className="h-3 w-3" />
            </button>
            <button
              onClick={() => splitStoryboardShot(selectedShot.id)}
              className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-slate-200 hover:bg-slate-700"
              title="Klibi İkiye Böl"
            >
              <Scissors className="h-3 w-3" />
              Böl
            </button>
            <button
              onClick={() => moveStoryboardShot(selectedShot.id, 'left')}
              className="rounded bg-slate-800 p-1 text-slate-300 hover:bg-slate-700"
            >
              <ArrowLeft className="h-3 w-3" />
            </button>
            <button
              onClick={() => moveStoryboardShot(selectedShot.id, 'right')}
              className="rounded bg-slate-800 p-1 text-slate-300 hover:bg-slate-700"
            >
              <ArrowRight className="h-3 w-3" />
            </button>
            {shots.length > 1 && (
              <button
                onClick={() => deleteStoryboardShot(selectedShot.id)}
                className="ml-auto flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 text-rose-300 hover:bg-rose-500/35"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
