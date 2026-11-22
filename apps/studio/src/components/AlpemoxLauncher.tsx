import { useEffect, useState } from 'react';
import {
  Play,
  Plus,
  RefreshCw,
  FolderOpen,
  Download,
  Terminal,
  Cpu,
  Globe,
  Settings,
  CheckCircle2,
  Copy,
  Check,
  Package,
  Sparkles,
  MessageSquarePlus,
  ThumbsUp,
  Mail,
} from 'lucide-react';
import {
  ALPEMOX_SUITE_APPS,
  DOWNLOADABLE_PACKS,
  ROADMAP_UPCOMING_FEATURES,
  FEATURE_REQUEST_CATEGORIES,
  type ViewportMode,
} from '@opencraft/shared';
import { useStudioStore } from '../store/useStudioStore';
import { AlpemoxBrandLogo, AlpemoxAppLogo } from './AlpemoxLogos';
import { t } from '../i18n';

export function AlpemoxLauncher() {
  const project = useStudioStore((s) => s.project);
  const projectsList = useStudioStore((s) => s.projectsList);
  const selectProject = useStudioStore((s) => s.selectProject);
  const createNewProject = useStudioStore((s) => s.createNewProject);
  const setActivePage = useStudioStore((s) => s.setActivePage);
  const setSettingsOpen = useStudioStore((s) => s.setSettingsOpen);
  const refreshHealth = useStudioStore((s) => s.refreshHealth);
  const comfyReachable = useStudioStore((s) => s.comfyReachable);
  const comfyCheckpoints = useStudioStore((s) => s.comfyCheckpoints);
  const a1111Reachable = useStudioStore((s) => s.a1111Reachable);
  const ollamaReachable = useStudioStore((s) => s.ollamaReachable);
  const ollamaModels = useStudioStore((s) => s.ollamaModels);
  const wsConnected = useStudioStore((s) => s.wsConnected);
  const locale = useStudioStore((s) => s.locale);
  const setLocale = useStudioStore((s) => s.setLocale);

  const [tab, setTab] = useState<'apps' | 'projects' | 'packs' | 'engines' | 'roadmap'>('apps');
  const [newProjName, setNewProjName] = useState('');
  const [copiedMcp, setCopiedMcp] = useState(false);
  const [cloudEmail, setCloudEmail] = useState('');
  const [cloudNotice, setCloudNotice] = useState<string | null>(null);
  const [requests, setRequests] = useState<
    Array<{ id: string; category: string; title: string; description: string; votes: number }>
  >([]);
  const [reqTitle, setReqTitle] = useState('');
  const [reqCategory, setReqCategory] = useState<string>(FEATURE_REQUEST_CATEGORIES[0]);
  const [reqDesc, setReqDesc] = useState('');
  const [reqNotice, setReqNotice] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/requests')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.items)) setRequests(d.items);
      })
      .catch(() => {});
  }, []);

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: reqCategory, title: reqTitle, description: reqDesc }),
    });
    const d = await res.json();
    if (res.ok && Array.isArray(d.items)) {
      setRequests(d.items);
      setReqTitle('');
      setReqDesc('');
      setReqNotice('Özellik isteğiniz kaydedildi!');
    } else {
      setReqNotice(d.error || 'İstek kaydedilemedi.');
    }
  };

  const voteRequest = async (id: string) => {
    const res = await fetch(`/api/requests/${id}/vote`, { method: 'POST' });
    const d = await res.json();
    if (res.ok && Array.isArray(d.items)) setRequests(d.items);
  };

  const submitCloudNotify = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/cloud/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cloudEmail, role: 'Launcher Kullanıcısı' }),
    });
    const d = await res.json();
    if (res.ok) {
      setCloudNotice(`Kaydedildi! (${d.count} kişi) — Cloud açılınca bildirim alacaksınız.`);
      setCloudEmail('');
    } else {
      setCloudNotice(d.error || 'Geçerli bir e-posta girin.');
    }
  };

  const launchApp = (mode: ViewportMode) => {
    setActivePage('studio', mode);
  };

  const mcpSnippet = JSON.stringify(
    {
      mcpServers: {
        alpemox: {
          command: 'node',
          args: ['<ALPEMOX_KLASORU>/packages/mcp/bin/opencraft-mcp.mjs'],
          env: { OPENCRAFT_SERVER_URL: 'http://127.0.0.1:4310' },
        },
      },
    },
    null,
    2,
  );

  const copyMcp = () => {
    void navigator.clipboard?.writeText(mcpSnippet);
    setCopiedMcp(true);
    setTimeout(() => setCopiedMcp(false), 1800);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0b0b0c] text-slate-100">
      {/* Launcher Left Rail */}
      <aside className="flex w-60 shrink-0 flex-col justify-between border-r border-zinc-800 bg-[#0f1117] p-4">
        <div>
          <div className="flex items-center gap-2.5 pb-5">
            <AlpemoxBrandLogo size={36} />
            <div>
              <div className="font-display text-sm font-extrabold tracking-tight text-white">ALPEMOX</div>
              <div className="font-mono-hud text-[10px] uppercase tracking-widest text-[#4e7bfb]">
                Launcher v0.3
              </div>
            </div>
          </div>

          <nav className="space-y-1 text-xs font-medium">
            {(
              [
                ['apps', t(locale, 'launcherNavApps'), Play],
                ['projects', `${locale === 'en' ? 'Projects' : 'Projeler'} (${projectsList.length || 1})`, FolderOpen],
                ['packs', t(locale, 'launcherNavPacks'), Package],
                ['engines', t(locale, 'launcherNavEngines'), Cpu],
                ['roadmap', t(locale, 'launcherNavRoadmap'), Sparkles],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition ${
                  tab === id
                    ? 'bg-[#4e7bfb] font-semibold text-white'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="space-y-2 border-t border-zinc-800 pt-3 text-xs">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-2.5">
            <div className="font-mono-hud text-[10px] text-zinc-400">AKTİF PROJE</div>
            <div className="mt-0.5 truncate font-semibold text-white">{project.name}</div>
            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-400">
              <span className={`h-1.5 w-1.5 rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {wsConnected ? 'Sunucu & MCP Bağlı' : 'Bağlanıyor...'}
            </div>
          </div>

          <button
            onClick={() => setLocale(locale === 'tr' ? 'en' : 'tr')}
            className="flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 hover:border-[#4e7bfb]"
          >
            <span>{locale === 'tr' ? 'Dil / Language' : 'Language / Dil'}</span>
            <span className="font-mono-hud font-bold text-[#4e7bfb]">{locale.toUpperCase()}</span>
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            className="flex w-full items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 hover:border-[#4e7bfb]"
          >
            <Settings className="h-3.5 w-3.5 text-[#4e7bfb]" />
            <span>{t(locale, 'aiSettings')}</span>
          </button>

          <button
            onClick={() => setActivePage('site')}
            className="flex w-full items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-300 hover:border-[#4e7bfb]"
          >
            <Globe className="h-3.5 w-3.5 text-zinc-400" />
            <span>{t(locale, 'launcherBackSite')}</span>
          </button>
        </div>
      </aside>

      {/* Launcher Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {tab === 'apps' && (
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div>
                <div className="font-mono-hud text-[11px] uppercase tracking-widest text-[#4e7bfb]">
                  Alpemox Suite Başlatıcı
                </div>
                <h1 className="font-display mt-1 text-2xl font-extrabold">
                  Tüm Yaratıcı Araçlar Tek Merkezde
                </h1>
              </div>

              <button
                onClick={() => launchApp('hybrid')}
                className="flex items-center gap-2 rounded-lg bg-[#4e7bfb] px-4 py-2 text-xs font-bold text-white hover:bg-[#3b69ea]"
              >
                <Play className="h-3.5 w-3.5" />
                Ana Stüdyoyu Başlat
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ALPEMOX_SUITE_APPS.map((app) => (
                <div
                  key={app.id}
                  className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-[#11131a] p-4 transition hover:border-[#4e7bfb]/60"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <AlpemoxAppLogo appId={app.id} size={48} />
                      <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono-hud text-[10px] text-emerald-300">
                        Hazır
                      </span>
                    </div>
                    <h2 className="font-display mt-3.5 text-base font-bold text-white">{app.name}</h2>
                    <p className="text-[11px] font-medium text-[#4e7bfb]">{app.tagline}</p>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-400">{app.description}</p>
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-zinc-800/80 pt-3">
                    <button
                      onClick={() => launchApp(app.mode)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#4e7bfb] py-2 text-xs font-bold text-white hover:bg-[#3b69ea]"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Başlat
                    </button>
                    <a
                      href={`/api/download/${app.id}/macos`}
                      className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-300 hover:border-[#4e7bfb]"
                      title="Başlatıcı script indir"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={submitCloudNotify}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#4e7bfb]/35 bg-[#11131a] p-4"
            >
              <div>
                <div className="font-display text-sm font-bold text-white">
                  Alpemox Cloud (Yakında) — Tek Tık Bulut GPU & 4K Render
                </div>
                <div className="text-xs text-zinc-400">
                  Açıldığında ilk bildirim ve erken erişim almak için e-posta bırakın.
                </div>
                {cloudNotice && <div className="mt-1 text-xs font-medium text-emerald-400">{cloudNotice}</div>}
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="eposta@adresin.com"
                  value={cloudEmail}
                  onChange={(e) => setCloudEmail(e.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-white focus:border-[#4e7bfb] focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-[#4e7bfb] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#3b69ea]"
                >
                  Bildirim Al
                </button>
              </div>
            </form>
          </div>
        )}

        {tab === 'projects' && (
          <div className="mx-auto max-w-4xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
              <div>
                <h1 className="font-display text-2xl font-extrabold">Projeleriniz</h1>
                <p className="text-xs text-zinc-400">Tüm Photo, Vector, Film, 3D ve Moodboard verileri ortak projede tutulur.</p>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newProjName.trim()) return;
                  void createNewProject(newProjName.trim()).then(() => {
                    setNewProjName('');
                    launchApp('hybrid');
                  });
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  placeholder="Yeni proje adı..."
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-[#4e7bfb] focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1 rounded-lg bg-[#4e7bfb] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#3b69ea]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Oluştur & Aç
                </button>
              </form>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {(projectsList.length > 0 ? projectsList : [{ id: project.id, name: project.name, updatedAt: project.updatedAt }]).map(
                (p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between rounded-xl border p-4 ${
                      p.id === project.id ? 'border-[#4e7bfb] bg-[#4e7bfb]/10' : 'border-zinc-800 bg-[#11131a]'
                    }`}
                  >
                    <div>
                      <div className="font-display text-sm font-bold text-white">{p.name}</div>
                      <div className="font-mono-hud text-[10px] text-zinc-400">
                        ID: {p.id} · {new Date(p.updatedAt).toLocaleString('tr-TR')}
                      </div>
                    </div>
                    <button
                      onClick={() => void selectProject(p.id).then(() => launchApp('hybrid'))}
                      className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4e7bfb]"
                    >
                      Aç
                    </button>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {tab === 'packs' && (
          <div className="mx-auto max-w-4xl space-y-5">
            <div className="border-b border-zinc-800 pb-4">
              <h1 className="font-display text-2xl font-extrabold">İndirilebilir Varlık & Eklenti Paketleri</h1>
              <p className="text-xs text-zinc-400">3D sahne objeleri, .cube LUT renk profilleri, SVG kitleri ve AI workflow şablonları.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {DOWNLOADABLE_PACKS.map((pack) => (
                <div key={pack.id} className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-[#11131a] p-4">
                  <div>
                    <div className="flex items-center justify-between font-mono-hud text-[10px]">
                      <span className="text-[#4e7bfb]">{pack.category}</span>
                      <span className="text-zinc-400">{pack.sizeHint}</span>
                    </div>
                    <h3 className="font-display mt-2 text-base font-bold">{pack.name}</h3>
                    <p className="mt-1 text-xs text-zinc-400">{pack.description}</p>
                    <div className="mt-2 font-mono-hud text-[10px] text-zinc-500">
                      {pack.contents.join(' · ')}
                    </div>
                  </div>
                  <a
                    href={`/api/packs/${pack.id}`}
                    className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-[#4e7bfb] py-2 text-xs font-bold text-white hover:bg-[#3b69ea]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Paketi İndir (.ZIP)
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'engines' && (
          <div className="mx-auto max-w-4xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h1 className="font-display text-2xl font-extrabold">AI Motorları & MCP Otomasyonu</h1>
                <p className="text-xs text-zinc-400">Yerel GPU motorlarınızı, ücretsiz açık AI uçlarını ve ajan köprüsünü kontrol edin.</p>
              </div>
              <button
                onClick={() => void refreshHealth()}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:border-[#4e7bfb]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Yeniden Tara
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  name: 'Open Source FLUX / Sana (Pollinations)',
                  ok: true,
                  detail: 'Anahtarsız ücretsiz bulut ucu · Hazır',
                },
                {
                  name: 'Yerel ComfyUI (127.0.0.1:8188)',
                  ok: comfyReachable,
                  detail: comfyReachable ? `${comfyCheckpoints.length} Checkpoint aktif` : 'Çalışmıyor (Opsiyonel)',
                },
                {
                  name: 'Yerel Automatic1111 / Forge (127.0.0.1:7860)',
                  ok: a1111Reachable,
                  detail: a1111Reachable ? 'Bağlı' : 'Çalışmıyor (Opsiyonel)',
                },
                {
                  name: 'Yerel Ollama LLM (127.0.0.1:11434)',
                  ok: ollamaReachable,
                  detail: ollamaReachable ? `${ollamaModels.length} LLM modeli hazır` : 'Çalışmıyor (Opsiyonel)',
                },
              ].map((eng) => (
                <div key={eng.name} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-[#11131a] p-4">
                  <div>
                    <div className="text-sm font-bold text-white">{eng.name}</div>
                    <div className="mt-0.5 text-xs text-zinc-400">{eng.detail}</div>
                  </div>
                  <CheckCircle2 className={`h-5 w-5 ${eng.ok ? 'text-emerald-400' : 'text-zinc-600'}`} />
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-[#11131a] p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Terminal className="h-4 w-4 text-[#4e7bfb]" />
                  MCP Sunucu Yapılandırması (AI Ajanlar İçin)
                </div>
                <button
                  onClick={copyMcp}
                  className="flex items-center gap-1 rounded bg-zinc-800 px-2.5 py-1 text-[11px] text-zinc-200 hover:bg-zinc-700"
                >
                  {copiedMcp ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copiedMcp ? 'Kopyalandı' : 'Kopyala'}
                </button>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-black/60 p-3 font-mono-hud text-[11px] text-sky-300">
                {mcpSnippet}
              </pre>
            </div>
          </div>
        )}

        {tab === 'roadmap' && (
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
              <div>
                <h1 className="font-display text-2xl font-extrabold">Neler Gelecek? & Özellik İsteği</h1>
                <p className="text-xs text-zinc-400">
                  Video, animasyon, rigging ve ses güncellemelerini inceleyin; ekstra özel özellikler için talep bırakın.
                </p>
              </div>
              <a
                href="mailto:hello@alpemox.dev?subject=Alpemox%20Ozel%20Ozellik%20Talebi"
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-100 hover:border-[#4e7bfb]"
              >
                <Mail className="h-3.5 w-3.5 text-[#4e7bfb]" />
                Özel İhtiyaç İçin İletişime Geç
              </a>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {ROADMAP_UPCOMING_FEATURES.map((item) => (
                <div key={item.id} className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-[#11131a] p-4">
                  <div>
                    <div className="flex items-center justify-between font-mono-hud text-[10px]">
                      <span className="text-[#4e7bfb]">{item.category}</span>
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">{item.eta}</span>
                    </div>
                    <h3 className="font-display mt-2 text-sm font-bold text-white">{item.title}</h3>
                    <p className="mt-1 text-xs text-zinc-400">{item.description}</p>
                    <ul className="mt-2.5 space-y-1 text-[11px] text-zinc-300">
                      {item.highlights.map((h) => (
                        <li key={h}>• {h}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <form onSubmit={submitRequest} className="space-y-3 rounded-xl border border-zinc-800 bg-[#11131a] p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <MessageSquarePlus className="h-4 w-4 text-[#4e7bfb]" />
                  Yeni Özellik İste
                </div>
                <select
                  value={reqCategory}
                  onChange={(e) => setReqCategory(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white"
                >
                  {FEATURE_REQUEST_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  placeholder="İstediğin özellik başlığı..."
                  value={reqTitle}
                  onChange={(e) => setReqTitle(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white"
                />
                <textarea
                  rows={2}
                  placeholder="Kısa açıklama veya özel senaryo..."
                  value={reqDesc}
                  onChange={(e) => setReqDesc(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-[#4e7bfb] px-4 py-2 text-xs font-bold text-white hover:bg-[#3b69ea]"
                >
                  Gönder
                </button>
                {reqNotice && <div className="text-xs text-emerald-400">{reqNotice}</div>}
              </form>

              <div className="space-y-2 rounded-xl border border-zinc-800 bg-[#11131a] p-4">
                <div className="font-mono-hud text-[10px] uppercase text-[#4e7bfb]">
                  Topluluk Talepleri ({requests.length})
                </div>
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {requests.map((r) => (
                    <div key={r.id} className="flex items-start justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/70 p-2.5">
                      <div>
                        <div className="font-mono-hud text-[9px] text-[#4e7bfb]">{r.category}</div>
                        <div className="text-xs font-bold text-white">{r.title}</div>
                        <div className="text-[11px] text-zinc-400">{r.description}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void voteRequest(r.id)}
                        className="flex shrink-0 items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-200 hover:border-[#4e7bfb]"
                      >
                        <ThumbsUp className="h-3 w-3" />
                        <span>{r.votes}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
