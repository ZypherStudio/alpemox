import { useEffect } from 'react';
import {
  Settings,
  Radio,
  Plus,
  Globe,
  PanelLeft,
  PanelRight,
  Cloud,
} from 'lucide-react';
import { ALPEMOX_SUITE_APPS } from '@opencraft/shared';
import { useStudioStore } from './store/useStudioStore';
import { t } from './i18n';
import { AlpemoxWebsite } from './components/AlpemoxWebsite';
import { AlpemoxLauncher } from './components/AlpemoxLauncher';
import { AlpemoxAppLogo } from './components/AlpemoxLogos';
import { LeftSceneSidebar } from './components/LeftSceneSidebar';
import { Canvas2DEditor } from './components/Canvas2DEditor';
import { Stage3DViewport } from './components/Stage3DViewport';
import { GameEngineEditor } from './components/GameEngineEditor';
import { VectorEditor } from './components/VectorEditor';
import { FilmEditor } from './components/FilmEditor';
import { MoodboardEditor } from './components/MoodboardEditor';
import { PipelineGraph } from './components/PipelineGraph';
import { CraftInspector } from './components/CraftInspector';
import { StoryboardDock } from './components/StoryboardDock';
import { ProviderSettingsModal } from './components/ProviderSettingsModal';
import { PricingModal } from './components/PricingModal';

export default function App() {
  const init = useStudioStore((s) => s.init);
  const activePage = useStudioStore((s) => s.activePage);
  const setActivePage = useStudioStore((s) => s.setActivePage);
  const locale = useStudioStore((s) => s.locale);
  const setLocale = useStudioStore((s) => s.setLocale);
  const project = useStudioStore((s) => s.project);
  const projectsList = useStudioStore((s) => s.projectsList);
  const selectProject = useStudioStore((s) => s.selectProject);
  const createNewProject = useStudioStore((s) => s.createNewProject);
  const viewportMode = useStudioStore((s) => s.viewportMode);
  const setViewportMode = useStudioStore((s) => s.setViewportMode);
  const leftSidebarOpen = useStudioStore((s) => s.leftSidebarOpen);
  const rightSidebarOpen = useStudioStore((s) => s.rightSidebarOpen);
  const toggleLeftSidebar = useStudioStore((s) => s.toggleLeftSidebar);
  const toggleRightSidebar = useStudioStore((s) => s.toggleRightSidebar);
  const wsConnected = useStudioStore((s) => s.wsConnected);
  const lastSyncNotice = useStudioStore((s) => s.lastSyncNotice);
  const setSettingsOpen = useStudioStore((s) => s.setSettingsOpen);
  const setPricingOpen = useStudioStore((s) => s.setPricingOpen);

  useEffect(() => {
    void init();
  }, [init]);

  if (activePage === 'site') {
    return (
      <>
        <AlpemoxWebsite />
        <PricingModal />
      </>
    );
  }

  if (activePage === 'launcher') {
    return (
      <>
        <AlpemoxLauncher />
        <ProviderSettingsModal />
        <PricingModal />
      </>
    );
  }

  const activeApp = ALPEMOX_SUITE_APPS.find((a) => a.mode === viewportMode) || ALPEMOX_SUITE_APPS[0];

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0b0b0c] text-slate-100">
      {/* Top Studio Header */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-slate-800/80 bg-[#0d1018] px-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActivePage('site')}
            title="Alpemox Ana Site & İndirme Merkezi"
            className="flex items-center gap-2 rounded-md pr-1.5 transition hover:bg-slate-900"
          >
            <AlpemoxAppLogo appId={activeApp.id} size={28} />
            <div className="text-left">
              <div className="font-display text-xs font-extrabold tracking-tight text-white">
                {activeApp.name.toUpperCase()}
              </div>
              <div className="font-mono-hud text-[9px] uppercase tracking-wider text-[#4e7bfb]">
                {activeApp.category}
              </div>
            </div>
          </button>

          <button
            onClick={() => setActivePage('site')}
            className="hidden items-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 hover:border-[#4e7bfb] hover:text-white sm:flex"
          >
            <Globe className="h-3 w-3 text-[#4e7bfb]" />
            <span>{t(locale, 'site')}</span>
          </button>

          <button
            onClick={() => setActivePage('launcher')}
            className="hidden items-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 hover:border-[#4e7bfb] hover:text-white sm:flex"
          >
            <span>{t(locale, 'launcher')}</span>
          </button>

          <button
            onClick={toggleLeftSidebar}
            title="Sol Sahne/Katman Panelini Aç/Kapat"
            className={`rounded-md border p-1 transition ${
              leftSidebarOpen ? 'border-[#4e7bfb]/50 bg-[#4e7bfb]/15 text-sky-300' : 'border-slate-800 bg-slate-900 text-slate-400'
            }`}
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-center gap-1">
            <select
              value={project.id}
              onChange={(e) => void selectProject(e.target.value)}
              className="max-w-[120px] rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-200 focus:border-[#4e7bfb] focus:outline-none"
            >
              {projectsList.length > 0 ? (
                projectsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              ) : (
                <option value={project.id}>{project.name}</option>
              )}
            </select>
            <button
              onClick={() => {
                const name = window.prompt('Yeni proje adı:', `Sahne ${projectsList.length + 1}`);
                if (name) void createNewProject(name);
              }}
              title="Yeni Sahne Projesi"
              className="rounded-md border border-slate-800 bg-slate-900 p-1 text-slate-300 hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Center Branded App Switcher */}
        <div className="flex items-center gap-0.5 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/90 p-0.5">
          {ALPEMOX_SUITE_APPS.map((app) => (
            <button
              key={app.id}
              onClick={() => setViewportMode(app.mode)}
              title={app.tagline}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition ${
                viewportMode === app.mode
                  ? 'bg-[#4e7bfb] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <AlpemoxAppLogo appId={app.id} size={15} />
              <span className="hidden md:inline">{app.name.replace('Alpemox ', '')}</span>
            </button>
          ))}
        </div>

        {/* Right Connectivity + Settings */}
        <div className="flex items-center gap-1.5">
          {lastSyncNotice && (
            <span className="hidden rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300 2xl:inline">
              {lastSyncNotice}
            </span>
          )}
          <div
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
              wsConnected
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
            }`}
          >
            <Radio className="h-3 w-3" />
            <span className="hidden xl:inline">{wsConnected ? 'MCP / WS' : t(locale, 'connecting')}</span>
          </div>

          <button
            onClick={() => setLocale(locale === 'tr' ? 'en' : 'tr')}
            title="Dil Değiştir (TR / EN)"
            className="rounded-md border border-slate-800 bg-slate-900 px-2 py-1 font-mono text-[11px] font-bold text-slate-200 hover:border-[#4e7bfb]"
          >
            {locale.toUpperCase()}
          </button>

          <button
            onClick={() => setPricingOpen(true)}
            title="Alpemox Cloud"
            className="flex items-center gap-1 rounded-md border border-[#4e7bfb]/40 bg-[#4e7bfb]/15 px-2 py-1 text-[11px] font-bold text-sky-300 transition hover:bg-[#4e7bfb] hover:text-white"
          >
            <Cloud className="h-3 w-3" />
            <span>{t(locale, 'cloud')}</span>
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:border-[#4e7bfb]"
          >
            <Settings className="h-3.5 w-3.5 text-[#4e7bfb]" />
            <span className="hidden lg:inline">{t(locale, 'aiSettings')}</span>
          </button>

          <button
            onClick={toggleRightSidebar}
            title="Sağ AI Craft Panelini Aç/Kapat"
            className={`rounded-md border p-1 transition ${
              rightSidebarOpen ? 'border-[#4e7bfb]/50 bg-[#4e7bfb]/15 text-sky-300' : 'border-slate-800 bg-slate-900 text-slate-400'
            }`}
          >
            <PanelRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Main IDE Workspace */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {leftSidebarOpen && <LeftSceneSidebar />}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {viewportMode === 'hybrid' && (
              <div className="grid h-full w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)] divide-x divide-slate-800/80 overflow-hidden">
                <div className="min-w-0 min-h-0 overflow-hidden">
                  <Stage3DViewport />
                </div>
                <div className="min-w-0 min-h-0 overflow-hidden">
                  <Canvas2DEditor />
                </div>
              </div>
            )}
            {viewportMode === 'photo' && <Canvas2DEditor />}
            {viewportMode === 'vector' && <VectorEditor />}
            {viewportMode === 'film' && <FilmEditor />}
            {viewportMode === '3d' && <Stage3DViewport />}
            {viewportMode === 'game' && <GameEngineEditor />}
            {viewportMode === 'moodboard' && <MoodboardEditor />}
            {viewportMode === 'pipeline' && <PipelineGraph />}
          </div>

          {viewportMode !== 'film' && viewportMode !== 'moodboard' && viewportMode !== 'game' && <StoryboardDock />}
        </div>

        {rightSidebarOpen && <CraftInspector />}
      </div>

      <ProviderSettingsModal />
      <PricingModal />
    </div>
  );
}
