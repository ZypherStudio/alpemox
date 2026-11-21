import { useEffect, useState } from 'react';
import {
  Download,
  ExternalLink,
  Check,
  Sun,
  Moon,
  ArrowUpRight,
  Terminal,
  Cpu,
  Layers,
  ShieldCheck,
  Globe,
  Code2,
  Sparkles,
  MessageSquarePlus,
  ThumbsUp,
  Mail,
} from 'lucide-react';
import {
  ALPEMOX_SUITE_APPS,
  DOWNLOADABLE_PACKS,
  PRICING_PLANS,
  ROADMAP_UPCOMING_FEATURES,
  FEATURE_REQUEST_CATEGORIES,
  type ViewportMode,
} from '@opencraft/shared';
import { useStudioStore } from '../store/useStudioStore';
import { AlpemoxBrandLogo, AlpemoxAppLogo } from './AlpemoxLogos';

type OSChoice = 'macos' | 'windows' | 'linux';

const PILLARS = [
  {
    num: '01',
    icon: Code2,
    title: 'Açık Kaynak & Modüler',
    desc: 'AGPL-3.0 lisansıyla tamamen açık kaynak. Kendi düğümlerini, AI sağlayıcılarını ve eklentilerini özgürce ekle.',
  },
  {
    num: '02',
    icon: Cpu,
    title: 'Yerel ComfyUI + Ollama',
    desc: 'Yerel GPU’n üzerinde çalışan ComfyUI checkpoint’lerini otomatik keşfeder; harici kredi veya abonelik dayatmaz.',
  },
  {
    num: '03',
    icon: Layers,
    title: '2D ↔ 3D Gerçek Köprü',
    desc: '3D manken sahnesinden RGB + Depth haritası al, 2D Photo’da maskele, sonucu tekrar 3D sahneye billboard olarak koy.',
  },
  {
    num: '04',
    icon: ShieldCheck,
    title: 'Sıfır Bulut Kilitlenmesi',
    desc: 'Projeler ve görseller doğrudan kendi diskinde saklanır. İstersen OpenAI, Gemini veya Fal.ai anahtarını bağla.',
  },
  {
    num: '05',
    icon: Terminal,
    title: 'Ajan & MCP Hazır',
    desc: 'Yerleşik stdio MCP sunucusu, CLI ve WebSocket kanalı ile AI ajanlar sahneyi ve editörleri canlı olarak kontrol eder.',
  },
  {
    num: '06',
    icon: Globe,
    title: 'Masaüstü & Tarayıcı',
    desc: 'Tek pakette indirilebilir başlatıcıların yanında tüm uygulamalar kurulum gerektirmeden tarayıcıda anında açılır.',
  },
];

export function AlpemoxWebsite() {
  const [selectedOs, setSelectedOs] = useState<OSChoice>('macos');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeShowcaseId, setActiveShowcaseId] = useState<string>(ALPEMOX_SUITE_APPS[0].id);
  const [inlineEmail, setInlineEmail] = useState('');
  const [inlineNotice, setInlineNotice] = useState<string | null>(null);
  const [inlineBusy, setInlineBusy] = useState(false);

  const [requestsList, setRequestsList] = useState<
    Array<{ id: string; category: string; title: string; description: string; votes: number }>
  >([]);
  const [reqCategory, setReqCategory] = useState<string>(FEATURE_REQUEST_CATEGORIES[0]);
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqNotice, setReqNotice] = useState<string | null>(null);
  const [reqBusy, setReqBusy] = useState(false);

  const setActivePage = useStudioStore((s) => s.setActivePage);
  const setPricingOpen = useStudioStore((s) => s.setPricingOpen);

  useEffect(() => {
    void fetch('/api/requests')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.items)) setRequestsList(d.items);
      })
      .catch(() => {});
  }, []);

  const submitFeatureRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqBusy(true);
    setReqNotice(null);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: reqCategory,
          title: reqTitle,
          description: reqDesc,
          email: reqEmail,
        }),
      });
      const d = await res.json();
      if (res.ok && Array.isArray(d.items)) {
        setRequestsList(d.items);
        setReqTitle('');
        setReqDesc('');
        setReqEmail('');
        setReqNotice('Özellik isteğiniz alındı! Yol haritası ekibine ve topluluk listesine eklendi.');
      } else {
        setReqNotice(d.error || 'İstek gönderilemedi.');
      }
    } catch {
      setReqNotice('Sunucuya bağlanılamadı.');
    } finally {
      setReqBusy(false);
    }
  };

  const voteFeatureRequest = async (id: string) => {
    try {
      const res = await fetch(`/api/requests/${id}/vote`, { method: 'POST' });
      const d = await res.json();
      if (res.ok && Array.isArray(d.items)) setRequestsList(d.items);
    } catch {
      // ignore
    }
  };

  const submitInlineWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineBusy(true);
    setInlineNotice(null);
    try {
      const res = await fetch('/api/cloud/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inlineEmail, role: 'Website Ziyaretçisi' }),
      });
      const data = await res.json();
      if (res.ok) {
        setInlineNotice(
          data.alreadyJoined
            ? 'Bu e-posta zaten bildirim listesinde!'
            : `Kaydedildi! (${data.count} kişi sırada) — Açılınca haber vereceğiz.`,
        );
        setInlineEmail('');
      } else {
        setInlineNotice(data.error || 'Geçerli bir e-posta girin.');
      }
    } catch {
      setInlineNotice('Sunucuya bağlanılamadı.');
    } finally {
      setInlineBusy(false);
    }
  };

  const isDark = theme === 'dark';
  const featuredApp = ALPEMOX_SUITE_APPS.find((a) => a.id === activeShowcaseId) || ALPEMOX_SUITE_APPS[0];

  const launchInBrowser = (mode: ViewportMode) => {
    setActivePage('studio', mode);
  };

  const bgMain = isDark ? 'bg-[#0b0b0c] text-[#f2f1ee]' : 'bg-[#f2f1ee] text-[#111216]';
  const bgCard = isDark ? 'bg-[#111216] text-[#f2f1ee]' : 'bg-[#faf9f6] text-[#111216]';
  const borderLine = isDark ? 'border-zinc-800' : 'border-zinc-300';
  const mutedText = isDark ? 'text-zinc-400' : 'text-zinc-600';

  return (
    <div className={`h-screen w-screen overflow-y-auto transition-colors duration-200 ${bgMain}`}>
      {/* Architectural Top Bar */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md ${borderLine} ${isDark ? 'bg-[#0b0b0c]/88' : 'bg-[#f2f1ee]/88'}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <AlpemoxBrandLogo size={34} />
            <div className="flex items-baseline gap-2">
              <span className="font-display text-lg font-extrabold tracking-tight">Alpemox</span>
              <span className={`font-mono-hud text-[10px] uppercase tracking-widest ${mutedText}`}>Suite v0.3</span>
            </div>
          </div>

          <nav className={`hidden items-center gap-6 text-xs font-medium md:flex ${mutedText}`}>
            <a href="#explore" className="transition hover:text-[#4e7bfb]">
              Uygulamalar
            </a>
            <a href="#suite-grid" className="transition hover:text-[#4e7bfb]">
              Tüm Paket
            </a>
            <a href="#architecture" className="transition hover:text-[#4e7bfb]">
              Mimari & MCP
            </a>
            <a href="#pricing" className="transition hover:text-[#4e7bfb]">
              Suite & Cloud
            </a>
            <a href="#roadmap" className="transition hover:text-[#4e7bfb]">
              Yol Haritası & İstek
            </a>
            <a href="#download" className="transition hover:text-[#4e7bfb]">
              İndir
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              title="Açık / Koyu Tema Değiştir"
              className={`flex h-8 w-8 items-center justify-center border transition ${borderLine} ${bgCard} hover:border-[#4e7bfb]`}
            >
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => setActivePage('launcher')}
              className={`border px-3 py-2 text-xs font-semibold transition ${borderLine} ${bgCard} hover:border-[#4e7bfb]`}
            >
              Launcher
            </button>
            <button
              onClick={() => launchInBrowser('hybrid')}
              className="flex items-center gap-1.5 bg-[#4e7bfb] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#3b69ea]"
            >
              <span>Web’de Başlat</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Editorial Hero Section */}
      <section id="download" className={`border-b ${borderLine}`}>
        <div className="mx-auto max-w-6xl px-5 pb-14 pt-14">
          <div className="flex flex-col items-center text-center">
            <div className={`mb-5 inline-flex items-center gap-2 border px-3 py-1 font-mono-hud text-[11px] uppercase tracking-wider ${borderLine} ${bgCard}`}>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Açık Kaynak · Ücretsiz · Abonelik Yok
            </div>

            <h1 className="font-display max-w-4xl text-4xl font-extrabold tracking-[-0.03em] sm:text-6xl">
              Yaratıcı kontrolün{' '}
              <span className="font-serif-accent font-normal italic text-[#4e7bfb]">özgür</span>{' '}
              hali.
            </h1>

            <p className={`mt-5 max-w-2xl text-sm leading-relaxed sm:text-base ${mutedText}`}>
              Alpemox; 2D/3D hibrit AI sahne stüdyosunu, fotoğraf, vektör ve video editörlerini tek açık kaynaklı
              çatı altında birleştirir. Tüm paketi indir ya da dilediğin uygulamayı doğrudan tarayıcıda çalıştır.
            </p>

            {/* Suite Custom App Icon Dock */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {ALPEMOX_SUITE_APPS.map((app) => (
                <button
                  key={app.id}
                  onClick={() => {
                    setActiveShowcaseId(app.id);
                    document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  title={app.name}
                  className={`group flex flex-col items-center gap-1.5 border p-2 transition ${
                    activeShowcaseId === app.id
                      ? 'border-[#4e7bfb] bg-[#4e7bfb]/10'
                      : `${borderLine} ${bgCard} hover:border-[#4e7bfb]/60`
                  }`}
                >
                  <AlpemoxAppLogo appId={app.id} size={42} className="transition group-hover:scale-105" />
                  <span className="font-mono-hud text-[10px] font-medium">{app.name.replace('Alpemox ', '')}</span>
                </button>
              ))}
            </div>

            {/* OS Selector + Download Launcher */}
            <div className="mt-9 flex flex-col items-center gap-3">
              <div className={`inline-flex border p-1 font-mono-hud text-[11px] ${borderLine} ${bgCard}`}>
                {(
                  [
                    ['macos', 'macOS Universal'],
                    ['windows', 'Windows x64/ARM'],
                    ['linux', 'Linux AppImage/deb'],
                  ] as const
                ).map(([os, label]) => (
                  <button
                    key={os}
                    onClick={() => setSelectedOs(os)}
                    className={`px-3 py-1.5 transition ${
                      selectedOs === os ? 'bg-[#4e7bfb] font-semibold text-white' : mutedText
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href={`/api/download/alpemox-suite/${selectedOs}`}
                  className="flex items-center gap-2 bg-[#4e7bfb] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#3b69ea]"
                >
                  <Download className="h-4 w-4" />
                  Alpemox Launcher İndir ({selectedOs})
                </a>
                <button
                  onClick={() => setActivePage('launcher')}
                  className={`flex items-center gap-2 border px-6 py-3 text-xs font-bold uppercase tracking-wider transition ${borderLine} ${bgCard} hover:border-[#4e7bfb]`}
                >
                  <ExternalLink className="h-4 w-4 text-[#4e7bfb]" />
                  Launcher’ı Tarayıcıda Aç
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive "Pick an app to explore" Showcase (like getartcraft.com) */}
      <section id="explore" className={`border-b ${borderLine}`}>
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="font-mono-hud text-[11px] uppercase tracking-widest text-[#4e7bfb]">
                Uygulama Keşfi
              </div>
              <h2 className="font-display mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Keşfetmek için bir{' '}
                <span className="font-serif-accent font-normal italic text-[#4e7bfb]">uygulama</span> seç
              </h2>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {ALPEMOX_SUITE_APPS.map((app) => (
                <button
                  key={app.id}
                  onClick={() => setActiveShowcaseId(app.id)}
                  className={`border px-2.5 py-1 text-xs font-medium transition ${
                    activeShowcaseId === app.id
                      ? 'border-[#4e7bfb] bg-[#4e7bfb] text-white'
                      : `${borderLine} ${bgCard} ${mutedText} hover:border-[#4e7bfb]`
                  }`}
                >
                  {app.name.replace('Alpemox ', '')}
                </button>
              ))}
            </div>
          </div>

          <div className={`grid gap-px border md:grid-cols-[1.2fr_1fr] ${borderLine} ${isDark ? 'bg-white/10' : 'bg-black/12'}`}>
            <div className={`p-7 ${bgCard}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <AlpemoxAppLogo appId={featuredApp.id} size={64} />
                  <div>
                    <div className="font-mono-hud text-[10px] uppercase tracking-widest text-[#4e7bfb]">
                      {featuredApp.category}
                    </div>
                    <h3 className="font-display text-2xl font-extrabold">{featuredApp.name}</h3>
                    <p className={`text-xs ${mutedText}`}>{featuredApp.tagline}</p>
                  </div>
                </div>
                <span className={`border px-2 py-0.5 font-mono-hud text-[10px] ${borderLine}`}>
                  {featuredApp.badge}
                </span>
              </div>

              <p className={`mt-5 text-sm leading-relaxed ${mutedText}`}>{featuredApp.description}</p>

              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {featuredApp.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2 text-xs font-medium">
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-wrap gap-2.5">
                <button
                  onClick={() => launchInBrowser(featuredApp.mode)}
                  className="flex items-center gap-2 bg-[#4e7bfb] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#3b69ea]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {featuredApp.name} Uygulamasını Aç
                </button>
                <a
                  href={`/api/download/${featuredApp.id}/${selectedOs}`}
                  className={`flex items-center gap-2 border px-4 py-2.5 text-xs font-semibold transition ${borderLine} hover:border-[#4e7bfb]`}
                >
                  <Download className="h-3.5 w-3.5" />
                  {selectedOs.toUpperCase()} Başlatıcı İndir
                </a>
              </div>
            </div>

            <div className={`flex flex-col justify-between p-7 ${isDark ? 'bg-[#0d0e12]' : 'bg-[#ebe9e4]'}`}>
              <div className="font-mono-hud text-[10px] uppercase tracking-widest text-[#4e7bfb]">
                Platform & Entegrasyon
              </div>
              <div className="my-6 flex items-center justify-center">
                <div className="relative flex items-center justify-center p-6">
                  <AlpemoxAppLogo appId={featuredApp.id} size={116} className="shadow-2xl" />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-current/10 pt-4 font-mono-hud text-[11px]">
                <span>{featuredApp.platforms.join(' · ')}</span>
                <span className="text-emerald-500">Hazır / Çalışıyor</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Complete Suite Grid */}
      <section id="suite-grid" className={`border-b ${borderLine}`}>
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="mb-6">
            <div className="font-mono-hud text-[11px] uppercase tracking-widest text-[#4e7bfb]">
              Tüm Editör Paketi
            </div>
            <h2 className="font-display mt-1 text-2xl font-bold tracking-tight">
              Tek İndirme, Yedi Uzman Uygulama
            </h2>
          </div>

          <div className={`grid gap-px border md:grid-cols-2 lg:grid-cols-3 ${borderLine} ${isDark ? 'bg-white/10' : 'bg-black/12'}`}>
            {ALPEMOX_SUITE_APPS.map((app, idx) => (
              <div key={app.id} className={`flex flex-col justify-between p-6 ${bgCard}`}>
                <div>
                  <div className="flex items-center justify-between">
                    <AlpemoxAppLogo appId={app.id} size={46} />
                    <span className={`font-mono-hud text-xs ${mutedText}`}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="font-display mt-4 text-lg font-bold">{app.name}</h3>
                  <p className="text-xs font-medium text-[#4e7bfb]">{app.tagline}</p>
                  <p className={`mt-2 text-xs leading-relaxed ${mutedText}`}>{app.description}</p>
                </div>

                <div className={`mt-5 flex items-center gap-2 border-t pt-4 ${borderLine}`}>
                  <button
                    onClick={() => launchInBrowser(app.mode)}
                    className="flex flex-1 items-center justify-center gap-1.5 bg-[#4e7bfb]/15 py-2 text-xs font-bold text-[#4e7bfb] transition hover:bg-[#4e7bfb] hover:text-white"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Uygulamayı Aç
                  </button>
                  <a
                    href={`/api/download/${app.id}/${selectedOs}`}
                    className={`flex items-center gap-1.5 border px-3 py-2 text-xs font-medium transition ${borderLine} hover:border-[#4e7bfb]`}
                  >
                    <Download className="h-3.5 w-3.5" />
                    İndir
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Downloadable Asset, LUT, Vector & Workflow Packs */}
      <section id="packs" className={`border-b ${borderLine}`}>
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="font-mono-hud text-[11px] uppercase tracking-widest text-[#4e7bfb]">
                Eklenti & Varlık Paketleri (ZIP)
              </div>
              <h2 className="font-display mt-1 text-2xl font-bold tracking-tight">
                İndirilebilir 3D Modeller, LUT’lar, SVG Kitler & AI Akışları
              </h2>
            </div>
            <div className={`border px-3 py-1.5 font-mono-hud text-[11px] ${borderLine} ${bgCard}`}>
              CLI & MCP: <span className="text-[#4e7bfb]">npm run mcp</span> · Tauri Masaüstü: <span className="text-[#4e7bfb]">apps/desktop</span>
            </div>
          </div>

          <div className={`grid gap-px border md:grid-cols-2 lg:grid-cols-4 ${borderLine} ${isDark ? 'bg-white/10' : 'bg-black/12'}`}>
            {DOWNLOADABLE_PACKS.map((pack) => (
              <div key={pack.id} className={`flex flex-col justify-between p-5 ${bgCard}`}>
                <div>
                  <div className="flex items-center justify-between font-mono-hud text-[10px]">
                    <span className="text-[#4e7bfb]">{pack.category}</span>
                    <span className={mutedText}>{pack.sizeHint}</span>
                  </div>
                  <h3 className="font-display mt-2.5 text-base font-bold">{pack.name}</h3>
                  <p className={`mt-1.5 text-xs leading-relaxed ${mutedText}`}>{pack.description}</p>
                  <ul className={`mt-3 space-y-1 font-mono-hud text-[10px] ${mutedText}`}>
                    {pack.contents.map((c) => (
                      <li key={c}>• {c}</li>
                    ))}
                  </ul>
                </div>

                <a
                  href={`/api/packs/${pack.id}`}
                  className="mt-5 flex items-center justify-center gap-1.5 bg-[#4e7bfb] py-2 text-xs font-bold text-white transition hover:bg-[#3b69ea]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Paketi İndir (.ZIP)
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 01..06 Shared Architecture Grid (getartcraft.com style) */}
      <section id="architecture" className={`border-b ${borderLine}`}>
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="mb-6">
            <div className="font-mono-hud text-[11px] uppercase tracking-widest text-[#4e7bfb]">
              Her Uygulamada Ortak Çekirdek
            </div>
            <h2 className="font-display mt-1 text-2xl font-bold tracking-tight">
              Alpemox neden daha{' '}
              <span className="font-serif-accent font-normal italic text-[#4e7bfb]">gelişkin</span>?
            </h2>
          </div>

          <div className={`grid gap-px border md:grid-cols-2 lg:grid-cols-3 ${borderLine} ${isDark ? 'bg-white/10' : 'bg-black/12'}`}>
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.num} className={`p-6 ${bgCard}`}>
                  <div className="flex items-center justify-between">
                    <span className={`flex h-9 w-9 items-center justify-center border ${borderLine} text-[#4e7bfb]`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className={`font-mono-hud text-xs ${mutedText}`}>{p.num}</span>
                  </div>
                  <h3 className="font-display mt-5 text-lg font-bold">{p.title}</h3>
                  <p className={`mt-2 text-xs leading-relaxed ${mutedText}`}>{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Two-Pillar Ecosystem: Open Suite + Alpemox Cloud */}
      <section id="pricing" className="mx-auto max-w-6xl px-5 py-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-mono-hud text-[11px] uppercase tracking-widest text-[#4e7bfb]">
              İki Yapılı Ekosistem (AGPL-3.0 + Cloud)
            </div>
            <h2 className="font-display mt-1 text-2xl font-bold tracking-tight">
              Yerelde %100 Ücretsiz ·{' '}
              <span className="font-serif-accent font-normal italic text-[#4e7bfb]">Alpemox Cloud</span> Yakında
            </h2>
          </div>
          <button
            onClick={() => setPricingOpen(true)}
            className="border border-[#4e7bfb] bg-[#4e7bfb]/15 px-3.5 py-1.5 text-xs font-bold text-[#4e7bfb] transition hover:bg-[#4e7bfb] hover:text-white"
          >
            Cloud Erken Erişim Listesine Katıl
          </button>
        </div>

        <div className={`grid gap-px border md:grid-cols-2 ${borderLine} ${isDark ? 'bg-white/10' : 'bg-black/12'}`}>
          {PRICING_PLANS.map((plan) => (
            <div key={plan.id} className={`flex flex-col justify-between p-7 ${bgCard}`}>
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-display text-xl font-extrabold">{plan.name}</span>
                  <span className={`font-mono-hud text-xs ${plan.id === 'pro' ? 'text-[#4e7bfb]' : 'text-emerald-500'}`}>
                    {plan.period}
                  </span>
                </div>
                <div className="font-display mt-3 text-3xl font-black">{plan.price}</div>
                {'altPrice' in plan && plan.altPrice && (
                  <div className="mt-1 text-xs font-medium text-[#4e7bfb]">{plan.altPrice}</div>
                )}
                <p className={`mt-2 text-xs ${mutedText}`}>{plan.description}</p>

                <ul className="mt-5 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs">
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6">
                {plan.id === 'free' ? (
                  <button
                    onClick={() => setActivePage('launcher')}
                    className={`w-full border py-2.5 text-xs font-bold uppercase tracking-wider transition ${borderLine} hover:border-[#4e7bfb]`}
                  >
                    Tüm Araçları Ücretsiz Başlat
                  </button>
                ) : (
                  <form onSubmit={submitInlineWaitlist} className="space-y-2">
                    <div className="font-mono-hud text-[10px] uppercase tracking-wider text-[#4e7bfb]">
                      Cloud Yakında · Bildirim Almak İçin E-Posta Gir
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        required
                        placeholder="eposta@adresin.com"
                        value={inlineEmail}
                        onChange={(e) => setInlineEmail(e.target.value)}
                        className={`flex-1 border px-3 py-2 text-xs focus:border-[#4e7bfb] focus:outline-none ${borderLine} ${isDark ? 'bg-black/50 text-white' : 'bg-white text-black'}`}
                      />
                      <button
                        type="submit"
                        disabled={inlineBusy}
                        className="bg-[#4e7bfb] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#3b69ea] disabled:opacity-50"
                      >
                        {inlineBusy ? '...' : 'Haber Ver'}
                      </button>
                    </div>
                    {inlineNotice && <p className="text-[11px] font-medium text-emerald-500">{inlineNotice}</p>}
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming Roadmap (Video, Animation, 3D, SDK) + Custom Feature Requests & Contact */}
      <section id="roadmap" className={`border-t ${borderLine}`}>
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="font-mono-hud text-[11px] uppercase tracking-widest text-[#4e7bfb]">
                Neler Gelecek? · Video, Animasyon & Pro Yol Haritası
              </div>
              <h2 className="font-display mt-1 text-2xl font-bold tracking-tight">
                Gelecek Güncellemeler &{' '}
                <span className="font-serif-accent font-normal italic text-[#4e7bfb]">Özellik İste</span>
              </h2>
            </div>
            <a
              href="mailto:hello@alpemox.dev?subject=Alpemox%20Ozel%20Ozellik%20ve%20Kurumsal%20Iletisim"
              className={`flex items-center gap-1.5 border px-3.5 py-2 text-xs font-bold transition ${borderLine} ${bgCard} hover:border-[#4e7bfb] hover:text-[#4e7bfb]`}
            >
              <Mail className="h-3.5 w-3.5 text-[#4e7bfb]" />
              Özel İhtiyaç İçin İletişime Geç
            </a>
          </div>

          <div className={`grid gap-px border md:grid-cols-2 lg:grid-cols-3 ${borderLine} ${isDark ? 'bg-white/10' : 'bg-black/12'}`}>
            {ROADMAP_UPCOMING_FEATURES.map((item) => (
              <div key={item.id} className={`flex flex-col justify-between p-6 ${bgCard}`}>
                <div>
                  <div className="flex items-center justify-between gap-2 font-mono-hud text-[10px]">
                    <span className="text-[#4e7bfb]">{item.category}</span>
                    <span
                      className={`border px-2 py-0.5 uppercase ${
                        item.status === 'in-progress'
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
                          : item.status === 'planned'
                            ? 'border-sky-500/40 bg-sky-500/10 text-sky-400'
                            : `${borderLine} ${mutedText}`
                      }`}
                    >
                      {item.status === 'in-progress' ? 'Geliştiriliyor' : item.status === 'planned' ? 'Planlandı' : 'Araştırma'}
                    </span>
                  </div>
                  <h3 className="font-display mt-3 text-base font-bold">{item.title}</h3>
                  <p className={`mt-1.5 text-xs leading-relaxed ${mutedText}`}>{item.description}</p>
                  <ul className="mt-3 space-y-1 text-[11px]">
                    {item.highlights.map((h) => (
                      <li key={h} className="flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 shrink-0 text-[#4e7bfb]" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`mt-4 border-t pt-2.5 font-mono-hud text-[10px] ${borderLine} ${mutedText}`}>
                  Hedef: {item.eta}
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Feature Request & Direct Studio Contact Box */}
          <div className={`mt-8 grid gap-px border lg:grid-cols-12 ${borderLine} ${isDark ? 'bg-white/10' : 'bg-black/12'}`}>
            <form onSubmit={submitFeatureRequest} className={`space-y-3 p-6 lg:col-span-7 ${bgCard}`}>
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="h-4 w-4 text-[#4e7bfb]" />
                <h3 className="font-display text-lg font-bold">Ekstra Özellik İste veya İletişime Geç</h3>
              </div>
              <p className={`text-xs ${mutedText}`}>
                Video, animasyon, 3D rigging, AI düğümleri ya da ekibin için özel bir araç gerekiyorsa buradan talep oluştur.
              </p>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <select
                  value={reqCategory}
                  onChange={(e) => setReqCategory(e.target.value)}
                  aria-label="Özellik kategorisi"
                  className={`border px-3 py-2 text-xs focus:border-[#4e7bfb] focus:outline-none ${borderLine} ${isDark ? 'bg-black/50 text-white' : 'bg-white text-black'}`}
                >
                  {FEATURE_REQUEST_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <input
                  type="email"
                  placeholder="E-postan (geri dönüş için, opsiyonel)"
                  value={reqEmail}
                  onChange={(e) => setReqEmail(e.target.value)}
                  className={`border px-3 py-2 text-xs focus:border-[#4e7bfb] focus:outline-none ${borderLine} ${isDark ? 'bg-black/50 text-white' : 'bg-white text-black'}`}
                />
              </div>

              <input
                type="text"
                required
                placeholder="İstediğin özellik başlığı (ör. Video Arka Plan Kaldırma / Kemik Rigging)"
                value={reqTitle}
                onChange={(e) => setReqTitle(e.target.value)}
                className={`w-full border px-3 py-2 text-xs focus:border-[#4e7bfb] focus:outline-none ${borderLine} ${isDark ? 'bg-black/50 text-white' : 'bg-white text-black'}`}
              />

              <textarea
                rows={3}
                placeholder="Nasıl çalışmasını istersin? (kısa açıklama veya özel iş akışı)"
                value={reqDesc}
                onChange={(e) => setReqDesc(e.target.value)}
                className={`w-full border px-3 py-2 text-xs focus:border-[#4e7bfb] focus:outline-none ${borderLine} ${isDark ? 'bg-black/50 text-white' : 'bg-white text-black'}`}
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="submit"
                  disabled={reqBusy}
                  className="bg-[#4e7bfb] px-5 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#3b69ea] disabled:opacity-50"
                >
                  {reqBusy ? 'Gönderiliyor...' : 'Özellik İsteği Gönder'}
                </button>
                <a
                  href="mailto:hello@alpemox.dev?subject=Alpemox%20Ozel%20Ozellik%20Talebi"
                  className="font-mono-hud text-[11px] text-[#4e7bfb] hover:underline"
                >
                  Doğrudan Mail: hello@alpemox.dev
                </a>
              </div>
              {reqNotice && <p className="text-xs font-medium text-emerald-500">{reqNotice}</p>}
            </form>

            <div className={`flex flex-col justify-between p-6 lg:col-span-5 ${bgCard}`}>
              <div>
                <div className="font-mono-hud text-[10px] uppercase tracking-wider text-[#4e7bfb]">
                  Topluluk İstek Sırası ({requestsList.length})
                </div>
                <h4 className="font-display mt-1 text-base font-bold">En Çok İstenen Özellikler</h4>
                <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                  {requestsList.map((r) => (
                    <div key={r.id} className={`flex items-start justify-between gap-2 border p-3 ${borderLine}`}>
                      <div className="min-w-0">
                        <div className="font-mono-hud text-[9px] text-[#4e7bfb]">{r.category}</div>
                        <div className="text-xs font-bold">{r.title}</div>
                        <div className={`mt-0.5 line-clamp-2 text-[11px] ${mutedText}`}>{r.description}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void voteFeatureRequest(r.id)}
                        className={`flex shrink-0 items-center gap-1 border px-2 py-1 font-mono-hud text-[10px] transition ${borderLine} hover:border-[#4e7bfb] hover:text-[#4e7bfb]`}
                        title="Bu özelliğe oy ver"
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
        </div>
      </section>

      <footer className={`border-t py-6 text-center font-mono-hud text-[11px] ${borderLine} ${mutedText}`}>
        Alpemox Creative Suite · AGPL-3.0 Açık Kaynak + Alpemox Cloud · alpemox.com / alpemox.dev
      </footer>
    </div>
  );
}
